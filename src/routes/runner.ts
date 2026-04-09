import { Hono } from 'hono';
import { RunnerService } from '../services/runner';

export function createRunnerRoutes(runnerService: RunnerService) {
  const router = new Hono();

  router.post('/api/runners/run', async (c) => {
    const body = await c.req.json<{ collection_id: number; environment_id?: number; retry_count?: number; retry_delay_ms?: number }>();

    if (!body.collection_id) {
      return c.json({ error: '缺少必填字段: collection_id' }, 400);
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: string, data: any) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        // 使用 AbortSignal 检测客户端断开
        const ac = new AbortController();
        const cleanup = () => c.req.raw.signal.removeEventListener('abort', onAbort);
        const onAbort = () => { cleanup(); ac.abort(); };
        c.req.raw.signal.addEventListener('abort', onAbort);

        try {
          await runnerService.run(
            body.collection_id,
            body.environment_id,
            {
              onStart(totalRequests) {
                send('runner:start', { totalRequests });
              },
              onRequestStart(index, name, method, url) {
                send('request:start', { index, name, method, url });
              },
              onRequestRetry(data) {
                send('request:retry', data);
              },
              onRequestComplete(data) {
                // 计算测试通过/失败数
                let testsPassed = 0;
                let testsFailed = 0;
                if (data.tests) {
                  for (const [key, value] of Object.entries(data.tests)) {
                    if (value) testsPassed++;
                    else testsFailed++;
                  }
                }
                send('request:complete', {
                  ...data,
                  passed: testsPassed,
                  failed: data.error ? (testsFailed || 1) : testsFailed,
                });
              },
              onDone(data) {
                send('runner:done', data);
                cleanup();
                controller.close();
              },
            },
            ac.signal,
            body.retry_count ?? 0,
            body.retry_delay_ms ?? 1000
          );
        } catch (err: any) {
          send('runner:done', { passed: 0, failed: 0, total: 0, totalTime: 0, error: err.message });
          cleanup();
          if (!controller.closed) controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  });

  return router;
}
