import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { ProxyService, ProxyTimeoutError, ProxyUnreachableError } from '../services/proxy';
import type { ProxyRequest } from '../services/proxy';
import { HistoryService } from '../services/history';
import { VariableService } from '../services/variable';
import { ScriptService } from '../services/script';
import { injectAuth, type AuthConfig } from '../services/auth';
import { CookieService, type SetCookieInfo } from '../services/cookie';
import { parseBody } from '../lib/validation';
import { getErrorMessage } from '../lib/validation';
import type { MultipartBody, BinaryBody } from '../types/request';

function isMultipartBody(body: unknown): body is MultipartBody {
  return typeof body === 'object' && body !== null && 'parts' in body && Array.isArray((body as MultipartBody).parts);
}

function isBinaryBody(body: unknown): body is BinaryBody {
  return typeof body === 'object' && body !== null && 'data' in body && typeof (body as BinaryBody).data === 'string';
}

type BodyInput = string | MultipartBody | BinaryBody | undefined;

interface ProxyApiErrorResponse {
  error: string;
  script_logs?: string[];
  script_variables?: Record<string, string>;
  post_script_logs?: string[];
  post_script_variables?: Record<string, string>;
  cleaned?: number;
}

interface ProxyApiSuccessResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: string;
  time?: number;
  size?: number;
  script_logs?: string[];
  script_variables?: Record<string, string>;
  script_tests?: Record<string, boolean>;
  post_script_logs?: string[];
  post_script_variables?: Record<string, string>;
  set_cookies?: SetCookieInfo[];
  cleaned?: number;
  truncated?: boolean;
  error?: string;
}

export interface PipelineInput {
  url: string;
  method: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: BodyInput;
  body_type?: string;
  auth_type?: string;
  auth_config?: AuthConfig | string;
  pre_request_script?: string;
  post_response_script?: string;
  runtime_vars?: Record<string, string>;
  collection_id?: number;
  environment_id?: number;
  timeout?: number;
  follow_redirects?: boolean;
}

export interface PipelineResult {
  status?: number;
  headers?: Record<string, string>;
  body?: string;
  time?: number;
  size?: number;
  scriptTests?: Record<string, boolean>;
  scriptLogs?: string[];
  postScriptLogs?: string[];
  scriptVariables?: Record<string, string>;
  postScriptVariables?: Record<string, string>;
  setCookies?: SetCookieInfo[];
  cleaned?: number;
  error?: string;
  /** 标记此错误是否可重试（网络超时、不可达等），脚本错误不设置此字段 */
  retryable?: boolean;
  truncated?: boolean;
}

export interface PipelineServices {
  proxyService: ProxyService;
  historyService: HistoryService;
  variableService: VariableService;
  scriptService: ScriptService;
  cookieService: CookieService;
}

/**
 * 变量模板替换：对 url、headers、params、body 中的模板变量进行解析
 */
function resolveTemplateVariables(
  input: PipelineInput,
  variableService: VariableService,
  resolveContext: { runtimeVars?: Record<string, string>; collectionId?: number; environmentId?: number }
) {
  // 预加载所有变量到 Map，避免每个字段重复查 DB
  const allVars = variableService.resolveAllVars(resolveContext);
  const resolve = (text: string) => variableService.resolveVariablesCached(allVars, text);

  let url = resolve(input.url);
  let headers = { ...(input.headers || {}) };
  let params = { ...(input.params || {}) };
  let bodyStr: BodyInput = input.body;

  for (const key of Object.keys(headers)) {
    headers[key] = resolve(headers[key]);
  }
  for (const key of Object.keys(params)) {
    params[key] = resolve(params[key]);
  }
  if (bodyStr) {
    if (input.body_type === 'multipart' && isMultipartBody(bodyStr)) {
      for (const part of bodyStr.parts) {
        if (part.type === 'text' && part.value) {
          part.value = resolve(part.value);
        }
      }
    } else if (input.body_type === 'graphql' && typeof bodyStr === 'string') {
      // GraphQL: 仅对 variables 字段做模板替换，query 不替换
      try {
        const parsed = JSON.parse(bodyStr);
        if (parsed.variables) {
          const varsStr = typeof parsed.variables === 'string' ? parsed.variables : JSON.stringify(parsed.variables);
          const resolved = resolve(varsStr);
          try { parsed.variables = JSON.parse(resolved); } catch { parsed.variables = resolved; }
        }
        bodyStr = JSON.stringify(parsed);
      } catch {}
    } else if (input.body_type !== 'binary' && typeof bodyStr === 'string') {
      bodyStr = resolve(bodyStr);
    }
  }

  return { url, headers, params, bodyStr };
}

/**
 * 构建实际请求体（FormData / Buffer / string）及历史记录用的原始 body
 */
function buildProxyBody(
  body: BodyInput,
  bodyType: string | undefined,
  headers: Record<string, string>,
  bodyStr: BodyInput
) {
  let proxyBody: string | FormData | Buffer | undefined;
  let originalBodyForHistory: BodyInput = body;

  if (bodyType === 'multipart' && isMultipartBody(body)) {
    const formData = new FormData();
    for (const part of body.parts) {
      if (part.type === 'file' && part.value) {
        const binary = Buffer.from(part.value, 'base64');
        const blob = new Blob([binary], { type: part.contentType || 'application/octet-stream' });
        formData.append(part.key, blob, part.filename || 'file');
      } else {
        formData.append(part.key, part.value || '');
      }
    }
    proxyBody = formData;
    originalBodyForHistory = body;
  } else if (bodyType === 'binary' && isBinaryBody(body)) {
    proxyBody = Buffer.from(body.data, 'base64');
    if (body.contentType && !headers['Content-Type']) {
      headers['Content-Type'] = body.contentType;
    }
    originalBodyForHistory = body;
  } else {
    proxyBody = bodyStr as string | undefined;
    originalBodyForHistory = bodyStr;
    if (bodyType === 'graphql' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  return { proxyBody, originalBodyForHistory };
}

/**
 * 管道前置准备结果
 */
interface PreparedPipeline {
  proxyReq: ProxyRequest;
  historyBody: string | null;
  scriptLogs: string[];
  scriptVariables: Record<string, string>;
}

/**
 * 共享前置管道：变量替换 → 构建请求体 → 前置脚本 → 认证注入 → Cookie 注入 → 构建 ProxyRequest
 * 失败时返回 { error, ... }，成功时返回 PreparedPipeline
 */
function preparePipelineRequest(
  input: PipelineInput,
  services: PipelineServices
): PreparedPipeline | { error: string; scriptLogs: string[]; scriptVariables: Record<string, string>; cleaned?: number } {
  const { historyService, variableService, scriptService, cookieService } = services;

  const resolveContext = {
    runtimeVars: input.runtime_vars,
    collectionId: input.collection_id,
    environmentId: input.environment_id,
  };

  // Step 1: Variable template replacement
  let { url, headers, params, bodyStr } = resolveTemplateVariables(input, variableService, resolveContext);

  // Step 1.5: Build actual body for proxy
  let { proxyBody, originalBodyForHistory } = buildProxyBody(input.body, input.body_type, headers, bodyStr);
  const bodyType = input.body_type;

  // Step 2: Pre-request script
  let scriptLogs: string[] = [];
  let scriptVariables: Record<string, string> = {};
  if (input.pre_request_script) {
    const allVars = variableService.resolveAllVars(resolveContext);
    const scriptResult = scriptService.execute(input.pre_request_script, {
      environment: Object.fromEntries(allVars),
      allVars,
    });
    if (!scriptResult.success) {
      const failReq: ProxyRequest = { url, method: input.method || 'GET', headers, params, body: proxyBody };
      const failBody = (bodyType === 'multipart' || bodyType === 'binary')
        ? JSON.stringify(originalBodyForHistory)
        : (proxyBody as string | undefined) || null;
      const cleaned = recordHistory(historyService, failReq, { status: 0, headers: {}, body: '', time: 0, size: 0 }, scriptLogs, input.auth_type, input.auth_config, bodyType, input.pre_request_script, input.post_response_script, failBody);
      return {
        scriptLogs: scriptResult.logs,
        scriptVariables: scriptResult.variables,
        cleaned,
        error: scriptResult.error,
      };
    }

    headers = { ...headers, ...scriptResult.headers };
    params = { ...params, ...scriptResult.params };
    if (scriptResult.body !== undefined) {
      bodyStr = scriptResult.body;
      // 重建 proxyBody 以反映脚本对 body 的修改（仅非 multipart/binary 类型）
      if (bodyType !== 'multipart' && bodyType !== 'binary') {
        proxyBody = bodyStr;
      }
    }
    scriptLogs = scriptResult.logs;
    scriptVariables = scriptResult.variables;
  }

  // Step 3: Auth injection
  if (input.auth_type && input.auth_type !== 'none') {
    const authResult = injectAuth(input.auth_type, input.auth_config, headers, params);
    headers = authResult.headers;
    params = authResult.params;
  }

  // Step 3.5: Cookie injection
  const hasUserCookie = Object.keys(headers).some(k => k.toLowerCase() === 'cookie');
  if (!hasUserCookie) {
    const cookieHeader = cookieService.buildCookieHeader(url);
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
  }

  const proxyReq: ProxyRequest = {
    url,
    method: input.method || 'GET',
    headers,
    params,
    body: proxyBody,
    timeout: input.timeout,
    follow_redirects: input.follow_redirects,
  };

  // Serialize body for history
  const historyBody = (bodyType === 'multipart' || bodyType === 'binary')
    ? JSON.stringify(originalBodyForHistory)
    : (proxyBody as string | undefined) || null;

  return { proxyReq, historyBody, scriptLogs, scriptVariables };
}

/**
 * 缓冲管道：准备 → 代理转发 → Cookie 提取 → 后置脚本 → 历史记录
 */
export async function executeRequestPipeline(
  input: PipelineInput,
  services: PipelineServices
): Promise<PipelineResult> {
  const { proxyService, historyService, variableService, scriptService, cookieService } = services;

  const prepared = preparePipelineRequest(input, services);
  if ('error' in prepared) return prepared;

  const { proxyReq, historyBody, scriptLogs, scriptVariables } = prepared;
  const bodyType = input.body_type;

  // Step 4: Proxy send
  let result;
  try {
    result = await proxyService.sendRequest(proxyReq);
  } catch (err: unknown) {
    if (err instanceof ProxyTimeoutError) {
      return { error: '请求超时', scriptLogs, scriptVariables, retryable: true };
    }
    if (err instanceof ProxyUnreachableError) {
      return { error: '目标服务器不可达', scriptLogs, scriptVariables, retryable: true };
    }
    return { error: getErrorMessage(err), scriptLogs, scriptVariables, retryable: true };
  }

  // Step 5: Extract Set-Cookie
  let setCookies: SetCookieInfo[] = [];
  const setCookieHeaders = extractSetCookieHeaders(result.headers);
  if (setCookieHeaders.length > 0) {
    const requestHost = new URL(proxyReq.url).hostname;
    setCookies = cookieService.storeCookies(setCookieHeaders, requestHost);
  }

  // Step 6: Post-response script
  let scriptTests: Record<string, boolean> | undefined;
  let postScriptLogs: string[] = [];
  let postScriptVariables: Record<string, string> = {};

  if (input.post_response_script) {
    const resolveContext = {
      runtimeVars: input.runtime_vars,
      collectionId: input.collection_id,
      environmentId: input.environment_id,
    };
    const allVars = variableService.resolveAllVars(resolveContext);
    const postResult = scriptService.executePostScript(input.post_response_script, {
      environment: Object.fromEntries(allVars),
      allVars,
      response: {
        status: result.status,
        headers: result.headers,
        body: result.body,
        time: result.time,
        size: result.size,
      },
    });
    scriptTests = postResult.tests;
    postScriptLogs = postResult.logs;
    postScriptVariables = postResult.variables;

    if (!postResult.success) {
      const cleaned = recordHistory(historyService, proxyReq, result, scriptLogs, input.auth_type, input.auth_config, bodyType, input.pre_request_script, input.post_response_script, historyBody);
      return {
        status: result.status,
        headers: result.headers,
        body: result.body,
        time: result.time,
        size: result.size,
        scriptTests,
        scriptLogs,
        postScriptLogs,
        scriptVariables,
        postScriptVariables,
        setCookies,
        cleaned,
        error: postResult.error,
        ...(result.truncated ? { truncated: result.truncated } : {}),
      };
    }
  }

  // Step 7: History recording
  const cleaned = recordHistory(historyService, proxyReq, result, scriptLogs, input.auth_type, input.auth_config, bodyType, input.pre_request_script, input.post_response_script, historyBody);

  const response: PipelineResult = {
    status: result.status,
    headers: result.headers,
    body: result.body,
    time: result.time,
    size: result.size,
    scriptLogs,
    scriptVariables,
    setCookies,
    cleaned,
  };
  if (result.truncated) response.truncated = result.truncated;
  if (input.post_response_script) {
    response.scriptTests = scriptTests ?? {};
    response.postScriptLogs = postScriptLogs;
    response.postScriptVariables = postScriptVariables;
  }
  return response;
}

export function createProxyRoutes(
  proxyService: ProxyService,
  historyService: HistoryService,
  variableService: VariableService,
  scriptService: ScriptService,
  cookieService: CookieService
) {
  const router = new Hono();
  const services: PipelineServices = { proxyService, historyService, variableService, scriptService, cookieService };

  router.post('/api/proxy', async (c) => {
    const body = await parseBody(c, z.object({ url: z.string().optional() }).passthrough());

    if (!body.url) {
      return c.json({ error: '缺少必填字段: url' }, 400);
    }

    if (body.stream) {
      return streamProxyResponse(c, services, body);
    }

    const result = await executeRequestPipeline(body, services);

    if (result.error && result.status === undefined) {
      // Pipeline error without HTTP response (pre-script failure, timeout, unreachable)
      const status = result.error === '请求超时' ? 504
        : result.error === '目标服务器不可达' ? 502
        : 400;
      const response: ProxyApiErrorResponse = { error: result.error };
      if (result.scriptLogs?.length) response.script_logs = result.scriptLogs;
      if (result.scriptVariables && Object.keys(result.scriptVariables).length > 0) response.script_variables = result.scriptVariables;
      if (result.postScriptLogs?.length) response.post_script_logs = result.postScriptLogs;
      if (result.postScriptVariables) response.post_script_variables = result.postScriptVariables;
      if (result.cleaned) response.cleaned = result.cleaned;
      return c.json(response, status);
    }

    // Convert camelCase PipelineResult to snake_case for backward compatibility
    const response: ProxyApiSuccessResponse = {
      status: result.status,
      headers: result.headers,
      body: result.body,
      time: result.time,
      size: result.size,
    };
    if (result.scriptLogs?.length) response.script_logs = result.scriptLogs;
    if (result.scriptVariables && Object.keys(result.scriptVariables).length > 0) response.script_variables = result.scriptVariables;
    if (result.scriptTests) response.script_tests = result.scriptTests;
    if (result.postScriptLogs) response.post_script_logs = result.postScriptLogs;
    if (result.postScriptVariables) response.post_script_variables = result.postScriptVariables;
    if (result.setCookies?.length) response.set_cookies = result.setCookies;
    if (result.cleaned) response.cleaned = result.cleaned;
    if (result.truncated) response.truncated = result.truncated;

    if (result.error) {
      // Post-response script error — HTTP 400 with full response data
      response.error = result.error;
      return c.json(response, 400);
    }

    return c.json(response);
  });

  return router;
}

function recordHistory(
  historyService: HistoryService,
  req: ProxyRequest,
  result: { status: number; headers: Record<string, string>; body: string; time: number; size: number },
  scriptLogs: string[],
  authType?: string,
  authConfig?: AuthConfig | string | null,
  bodyType?: string,
  preRequestScript?: string,
  postResponseScript?: string,
  historyBody?: string | null
): number {
  try {
    const { cleaned } = historyService.create({
      method: req.method,
      url: req.url,
      request_headers: JSON.stringify(req.headers),
      request_params: req.params ? JSON.stringify(req.params) : null,
      request_body: historyBody ?? (typeof req.body === 'string' ? req.body : req.body ? JSON.stringify(req.body) : null),
      body_type: bodyType || 'json',
      pre_request_script: preRequestScript || null,
      post_response_script: postResponseScript || null,
      auth_type: authType || 'none',
      auth_config: authConfig ? JSON.stringify(authConfig) : null,
      status: result.status,
      response_headers: JSON.stringify(result.headers),
      response_body: result.body,
      response_time: result.time,
      response_size: result.size,
    });
    return cleaned;
  } catch (err) {
    // History recording should not block proxy responses
    console.error('[recordHistory]', err);
    return 0;
  }
}

function streamProxyResponse(
  c: Context,
  services: PipelineServices,
  body: Partial<PipelineInput>
) {
  const { proxyService, historyService, cookieService } = services;

  const prepared = preparePipelineRequest(body as PipelineInput, services);
  if ('error' in prepared) {
    return c.json({ error: prepared.error, script_logs: prepared.scriptLogs }, 400);
  }

  const { proxyReq, historyBody, scriptLogs, scriptVariables } = prepared;

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let capturedStatus = 0;
        let capturedHeaders: Record<string, string> = {};
        let capturedSize = 0;
        let capturedTime = 0;

        const send = (event: string, data: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          await proxyService.sendRequestStream(proxyReq, {
            onHeaders(status, headers) {
              capturedStatus = status;
              capturedHeaders = headers;

              let setCookies: SetCookieInfo[] = [];
              const setCookieHeaders = extractSetCookieHeaders(headers);
              if (setCookieHeaders.length > 0) {
                try {
                  const requestHost = new URL(proxyReq.url).hostname;
                  setCookies = cookieService.storeCookies(setCookieHeaders, requestHost);
                } catch {}
              }

              const data: Record<string, unknown> = { status, headers };
              if (scriptLogs.length > 0) data.script_logs = scriptLogs;
              if (Object.keys(scriptVariables).length > 0) data.script_variables = scriptVariables;
              if (setCookies.length > 0) data.set_cookies = setCookies;
              send('headers', data);
            },
            onChunk(chunk, size) {
              capturedSize += size;
              send('chunk', { chunk, size });
            },
            onDone(totalTime, totalSize, truncated) {
              capturedTime = totalTime;
              capturedSize = totalSize;
              send('done', { totalTime, totalSize, truncated });
              controller.close();

              try {
                historyService.create({
                  method: proxyReq.method,
                  url: proxyReq.url,
                  request_headers: JSON.stringify(proxyReq.headers),
                  request_params: proxyReq.params ? JSON.stringify(proxyReq.params) : null,
                  request_body: historyBody ?? (typeof proxyReq.body === 'string' ? proxyReq.body : proxyReq.body ? JSON.stringify(proxyReq.body) : null),
                  body_type: body.body_type || 'json',
                  pre_request_script: body.pre_request_script || null,
                  post_response_script: null,
                  auth_type: body.auth_type || 'none',
                  auth_config: body.auth_config ? JSON.stringify(body.auth_config) : null,
                  status: capturedStatus,
                  response_headers: JSON.stringify(capturedHeaders),
                  response_body: null,
                  response_time: capturedTime,
                  response_size: capturedSize,
                });
              } catch (err) {
                console.error('[streamProxyResponse] recordHistory failed', err);
              }
            },
            onError(error) {
              send('error', { error });
              controller.close();
            },
          });
        } catch (err: unknown) {
          if (err instanceof ProxyTimeoutError) {
            send('error', { error: '请求超时' });
          } else if (err instanceof ProxyUnreachableError) {
            send('error', { error: '目标服务器不可达', detail: (err as ProxyUnreachableError).detail });
          } else {
            send('error', { error: getErrorMessage(err) });
          }
          controller.close();
        }
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    }
  );
}

/**
 * 从响应 headers 中提取所有 Set-Cookie 值
 */
export function extractSetCookieHeaders(headers: Record<string, string>): string[] {
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'set-cookie') {
      return value.split('\n').filter(v => v.trim());
    }
  }
  return [];
}
