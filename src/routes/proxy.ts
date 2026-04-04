import { Hono } from 'hono';
import { ProxyService, ProxyTimeoutError, ProxyUnreachableError } from '../services/proxy';
import type { ProxyRequest } from '../services/proxy';
import { HistoryService } from '../services/history';
import { EnvService } from '../services/environment';
import { ScriptService } from '../services/script';
import { injectAuth } from '../services/auth';

export function createProxyRoutes(
  proxyService: ProxyService,
  historyService: HistoryService,
  envService: EnvService,
  scriptService: ScriptService
) {
  const router = new Hono();

  router.post('/api/proxy', async (c) => {
    const body = await c.req.json<Partial<ProxyRequest> & { stream?: boolean }>();

    if (!body.url) {
      return c.json({ error: '缺少必填字段: url' }, 400);
    }

    // Step 1: Template replacement
    let url = body.url;
    let headers = { ...body.headers } || {};
    let params = { ...body.params } || {};
    let bodyStr = body.body;

    if (body.environment_id) {
      url = envService.replaceTemplateValues(url, body.environment_id);
      for (const key of Object.keys(headers)) {
        headers[key] = envService.replaceTemplateValues(headers[key], body.environment_id);
      }
      for (const key of Object.keys(params)) {
        params[key] = envService.replaceTemplateValues(params[key], body.environment_id);
      }
      if (bodyStr) {
        bodyStr = envService.replaceTemplateValues(bodyStr, body.environment_id);
      }
    }

    // Step 2: Script execution
    let scriptLogs: string[] = [];
    if (body.pre_request_script) {
      const envVars: Record<string, string> = {};
      if (body.environment_id) {
        const vars = envService.getVariables(body.environment_id);
        for (const v of vars) {
          if (v.enabled !== false && v.enabled !== 0) {
            envVars[v.key] = v.value || '';
          }
        }
      }

      const scriptResult = scriptService.execute(body.pre_request_script, { environment: envVars });
      if (!scriptResult.success) {
        return c.json({ error: scriptResult.error, script_logs: scriptResult.logs }, 400);
      }

      // Merge script results
      headers = { ...headers, ...scriptResult.headers };
      params = { ...params, ...scriptResult.params };
      if (scriptResult.body !== undefined) bodyStr = scriptResult.body;
      scriptLogs = scriptResult.logs;
    }

    // Step 3: Auth injection
    if (body.auth_type && body.auth_type !== 'none') {
      const authResult = injectAuth(body.auth_type, body.auth_config, headers, params);
      headers = authResult.headers;
      params = authResult.params;
    }

    const proxyReq: ProxyRequest = {
      url,
      method: body.method || 'GET',
      headers,
      params,
      body: bodyStr,
      stream: body.stream,
    };

    if (body.stream) {
      return streamProxyResponse(c, proxyService, historyService, proxyReq, scriptLogs, body.auth_type, body.auth_config, body.body_type, body.pre_request_script);
    }

    try {
      const result = await proxyService.sendRequest(proxyReq);

      // Step 4: History recording
      recordHistory(historyService, proxyReq, result, scriptLogs, body.auth_type, body.auth_config, body.body_type, body.pre_request_script);

      const response: any = result;
      if (scriptLogs.length > 0) response.script_logs = scriptLogs;
      return c.json(response);
    } catch (err: any) {
      if (err instanceof ProxyTimeoutError) {
        return c.json({ error: '请求超时' }, 504);
      }
      if (err instanceof ProxyUnreachableError) {
        return c.json({ error: '目标服务器不可达', detail: err.detail }, 502);
      }
      return c.json({ error: err.message }, 500);
    }
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
  preRequestScript?: string
) {
  try {
    historyService.create({
      method: req.method,
      url: req.url,
      request_headers: JSON.stringify(req.headers),
      request_params: req.params ? JSON.stringify(req.params) : null,
      request_body: req.body || null,
      body_type: bodyType || 'json',
      pre_request_script: preRequestScript || null,
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
  proxyService: ProxyService,
  historyService: HistoryService,
  proxyReq: ProxyRequest,
  scriptLogs: string[],
  authType?: string,
  authConfig?: any,
  bodyType?: string,
  preRequestScript?: string
) {
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
              const data: any = { status, headers };
              if (scriptLogs.length > 0) data.script_logs = scriptLogs;
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

              // Record history after stream completes
              try {
                historyService.create({
                  method: proxyReq.method,
                  url: proxyReq.url,
                  request_headers: JSON.stringify(proxyReq.headers),
                  request_params: proxyReq.params ? JSON.stringify(proxyReq.params) : null,
                  request_body: proxyReq.body || null,
                  body_type: bodyType || 'json',
                  pre_request_script: preRequestScript || null,
                  auth_type: authType || 'none',
                  auth_config: authConfig ? JSON.stringify(authConfig) : null,
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
