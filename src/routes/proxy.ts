import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { ProxyTimeoutError, ProxyUnreachableError } from '../services/proxy';
import { parseBody } from '../lib/validation';
import { getErrorMessage } from '../lib/validation';
import type { SetCookieInfo } from '../services/cookie';
import {
  type PipelineInput,
  type PipelineServices,
  executeRequestPipeline,
  preparePipelineRequest,
  extractSetCookieHeaders,
} from '../services/pipeline';

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

export function createProxyRoutes(
  proxyService: import('../services/proxy').ProxyService,
  historyService: import('../services/history').HistoryService,
  variableService: import('../services/variable').VariableService,
  scriptService: import('../services/script').ScriptService,
  cookieService: import('../services/cookie').CookieService
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
