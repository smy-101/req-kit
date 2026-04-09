import { Hono } from 'hono';
import { ProxyService, ProxyTimeoutError, ProxyUnreachableError } from '../services/proxy';
import type { ProxyRequest } from '../services/proxy';
import { HistoryService } from '../services/history';
import { VariableService } from '../services/variable';
import { ScriptService } from '../services/script';
import { injectAuth } from '../services/auth';
import { CookieService } from '../services/cookie';

export interface PipelineInput {
  url: string;
  method: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: string | object | undefined;
  body_type?: string;
  auth_type?: string;
  auth_config?: any;
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
  setCookies?: any[];
  error?: string;
  /** 标记此错误是否可重试（网络超时、不可达等），脚本错误不设置此字段 */
  retryable?: boolean;
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
  let url = variableService.resolveVariables(input.url, resolveContext);
  let headers = { ...(input.headers || {}) };
  let params = { ...(input.params || {}) };
  let bodyStr: any = input.body;

  for (const key of Object.keys(headers)) {
    headers[key] = variableService.resolveVariables(headers[key], resolveContext);
  }
  for (const key of Object.keys(params)) {
    params[key] = variableService.resolveVariables(params[key], resolveContext);
  }
  if (bodyStr) {
    if (input.body_type === 'multipart' && typeof bodyStr === 'object' && (bodyStr as any).parts) {
      for (const part of (bodyStr as any).parts) {
        if (part.type === 'text' && part.value) {
          part.value = variableService.resolveVariables(part.value, resolveContext);
        }
      }
    } else if (input.body_type === 'graphql' && typeof bodyStr === 'string') {
      // GraphQL: 仅对 variables 字段做模板替换，query 不替换
      try {
        const parsed = JSON.parse(bodyStr);
        if (parsed.variables) {
          const varsStr = typeof parsed.variables === 'string' ? parsed.variables : JSON.stringify(parsed.variables);
          const resolved = variableService.resolveVariables(varsStr, resolveContext);
          try { parsed.variables = JSON.parse(resolved); } catch { parsed.variables = resolved; }
        }
        bodyStr = JSON.stringify(parsed);
      } catch {}
    } else if (input.body_type !== 'binary' && typeof bodyStr === 'string') {
      bodyStr = variableService.resolveVariables(bodyStr, resolveContext);
    }
  }

  return { url, headers, params, bodyStr };
}

/**
 * 构建实际请求体（FormData / Buffer / string）及历史记录用的原始 body
 */
function buildProxyBody(
  body: any,
  bodyType: string | undefined,
  headers: Record<string, string>,
  bodyStr: any
) {
  let proxyBody: string | FormData | Buffer | undefined;
  let originalBodyForHistory: any = body;

  if (bodyType === 'multipart' && typeof body === 'object' && (body as any).parts) {
    const formData = new FormData();
    for (const part of (body as any).parts) {
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
  } else if (bodyType === 'binary' && typeof body === 'object' && (body as any).data) {
    proxyBody = Buffer.from((body as any).data, 'base64');
    if ((body as any).contentType && !headers['Content-Type']) {
      headers['Content-Type'] = (body as any).contentType;
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
 * 共享管道函数：变量替换 → 前置脚本 → 认证注入 → Cookie 注入 → 代理转发 → Cookie 提取 → 后置脚本 → 历史记录
 */
export async function executeRequestPipeline(
  input: PipelineInput,
  services: PipelineServices
): Promise<PipelineResult> {
  const { proxyService, historyService, variableService, scriptService, cookieService } = services;

  const resolveContext = {
    runtimeVars: input.runtime_vars,
    collectionId: input.collection_id,
    environmentId: input.environment_id,
  };

  // Step 1: Variable template replacement
  let { url, headers, params, bodyStr } = resolveTemplateVariables(input, variableService, resolveContext);

  // Step 1.5: Build actual body for proxy
  const { proxyBody, originalBodyForHistory } = buildProxyBody(input.body, input.body_type, headers, bodyStr);
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
      // 记录历史（请求未发出，用最小数据）
      const failReq: ProxyRequest = { url, method: input.method || 'GET', headers, params, body: proxyBody };
      const failBody = (bodyType === 'multipart' || bodyType === 'binary')
        ? JSON.stringify(originalBodyForHistory)
        : (proxyBody as string | undefined) || null;
      recordHistory(historyService, failReq, { status: 0, headers: {}, body: '', time: 0, size: 0 }, scriptLogs, input.auth_type, input.auth_config, bodyType, input.pre_request_script, input.post_response_script, failBody);
      return {
        scriptLogs: scriptResult.logs,
        scriptVariables: scriptResult.variables,
        error: scriptResult.error,
      };
    }

    headers = { ...headers, ...scriptResult.headers };
    params = { ...params, ...scriptResult.params };
    if (scriptResult.body !== undefined) bodyStr = scriptResult.body;
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

  // Step 4: Proxy send
  let result;
  try {
    result = await proxyService.sendRequest(proxyReq);
  } catch (err: any) {
    if (err instanceof ProxyTimeoutError) {
      return { error: '请求超时', scriptLogs, scriptVariables, retryable: true };
    }
    if (err instanceof ProxyUnreachableError) {
      return { error: '目标服务器不可达', scriptLogs, scriptVariables, retryable: true };
    }
    return { error: err.message, scriptLogs, scriptVariables, retryable: true };
  }

  // Step 5: Extract Set-Cookie
  let setCookies: any[] = [];
  const setCookieHeaders = extractSetCookieHeaders(result.headers);
  if (setCookieHeaders.length > 0) {
    const requestHost = new URL(url).hostname;
    setCookies = cookieService.storeCookies(setCookieHeaders, requestHost);
  }

  // Step 6: Post-response script
  let scriptTests: Record<string, boolean> | undefined;
  let postScriptLogs: string[] = [];
  let postScriptVariables: Record<string, string> = {};

  if (input.post_response_script) {
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
      // Record history even on script failure
      recordHistory(historyService, proxyReq, result, scriptLogs, input.auth_type, input.auth_config, bodyType, input.pre_request_script, input.post_response_script, historyBody);
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
        error: postResult.error,
      };
    }
  }

  // Step 7: History recording
  recordHistory(historyService, proxyReq, result, scriptLogs, input.auth_type, input.auth_config, bodyType, input.pre_request_script, input.post_response_script, historyBody);

  const response: PipelineResult = {
    status: result.status,
    headers: result.headers,
    body: result.body,
    time: result.time,
    size: result.size,
    scriptLogs,
    scriptVariables,
    setCookies,
  };
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
    const body = await c.req.json<Partial<PipelineInput> & { stream?: boolean }>();

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
      const response: any = { error: result.error };
      if (result.scriptLogs?.length) response.script_logs = result.scriptLogs;
      if (result.scriptVariables && Object.keys(result.scriptVariables).length > 0) response.script_variables = result.scriptVariables;
      if (result.postScriptLogs?.length) response.post_script_logs = result.postScriptLogs;
      if (result.postScriptVariables) response.post_script_variables = result.postScriptVariables;
      return c.json(response, status);
    }

    // Convert camelCase PipelineResult to snake_case for backward compatibility
    const response: any = {
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
  authConfig?: any,
  bodyType?: string,
  preRequestScript?: string,
  postResponseScript?: string,
  historyBody?: string | null
) {
  try {
    historyService.create({
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
  } catch {
    // History recording should not block proxy responses
  }
}

function streamProxyResponse(
  c: any,
  services: PipelineServices,
  body: Partial<PipelineInput>
) {
  const { proxyService, historyService, variableService, scriptService, cookieService } = services;

  const resolveContext = {
    runtimeVars: body.runtime_vars,
    collectionId: body.collection_id,
    environmentId: body.environment_id,
  };

  // Variable template replacement
  let { url, headers, params, bodyStr } = resolveTemplateVariables(body as PipelineInput, variableService, resolveContext);

  // Build body
  const { proxyBody, originalBodyForHistory } = buildProxyBody(body.body, body.body_type, headers, bodyStr);
  const bodyType = body.body_type;

  // Pre-request script
  let scriptLogs: string[] = [];
  let scriptVariables: Record<string, string> = {};
  if (body.pre_request_script) {
    const allVars = variableService.resolveAllVars(resolveContext);
    const scriptResult = scriptService.execute(body.pre_request_script, {
      environment: Object.fromEntries(allVars),
      allVars,
    });
    if (!scriptResult.success) {
      return c.json({ error: scriptResult.error, script_logs: scriptResult.logs }, 400);
    }
    headers = { ...headers, ...scriptResult.headers };
    params = { ...params, ...scriptResult.params };
    if (scriptResult.body !== undefined) bodyStr = scriptResult.body;
    scriptLogs = scriptResult.logs;
    scriptVariables = scriptResult.variables;
  }

  // Auth injection
  if (body.auth_type && body.auth_type !== 'none') {
    const authResult = injectAuth(body.auth_type, body.auth_config, headers, params);
    headers = authResult.headers;
    params = authResult.params;
  }

  // Cookie injection
  const hasUserCookie = Object.keys(headers).some(k => k.toLowerCase() === 'cookie');
  if (!hasUserCookie) {
    const cookieHeader = cookieService.buildCookieHeader(url);
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
  }

  const proxyReq: ProxyRequest = {
    url,
    method: body.method || 'GET',
    headers,
    params,
    body: proxyBody,
    timeout: body.timeout,
    follow_redirects: body.follow_redirects,
  };

  const historyBody = (bodyType === 'multipart' || bodyType === 'binary')
    ? JSON.stringify(originalBodyForHistory)
    : (proxyBody as string | undefined) || null;

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let capturedStatus = 0;
        let capturedHeaders: Record<string, string> = {};
        let capturedSize = 0;
        let capturedTime = 0;

        const send = (event: string, data: any) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          await proxyService.sendRequestStream(proxyReq, {
            onHeaders(status, headers) {
              capturedStatus = status;
              capturedHeaders = headers;

              let setCookies: any[] = [];
              const setCookieHeaders = extractSetCookieHeaders(headers);
              if (setCookieHeaders.length > 0) {
                try {
                  const requestHost = new URL(proxyReq.url).hostname;
                  setCookies = cookieService.storeCookies(setCookieHeaders, requestHost);
                } catch {}
              }

              const data: any = { status, headers };
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
                  body_type: bodyType || 'json',
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
              } catch {}
            },
            onError(error) {
              send('error', { error });
              controller.close();
            },
          });
        } catch (err: any) {
          if (err instanceof ProxyTimeoutError) {
            send('error', { error: '请求超时' });
          } else if (err instanceof ProxyUnreachableError) {
            send('error', { error: '目标服务器不可达', detail: err.detail });
          } else {
            send('error', { error: err.message });
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
