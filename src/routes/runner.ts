import { Hono } from 'hono';
import { z } from 'zod';
import { RunnerService } from '../services/runner';
import { parseBody } from '../lib/validation';
import { getErrorMessage } from '../lib/validation';

const RunSchema = z.object({
  collection_id: z.number().int().positive(),
  environment_id: z.number().int().optional(),
  retry_count: z.number().int().min(0).optional(),
  retry_delay_ms: z.number().int().min(0).optional(),
});

export function createRunnerRoutes(runnerService: RunnerService) {
  const router = new Hono();

  router.post('/api/runners/run', async (c) => {
    const body = await parseBody(c, RunSchema);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: string, data: Record<string, unknown>) => {
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
        } catch (err: unknown) {
          send('runner:done', { passed: 0, failed: 0, total: 0, totalTime: 0, error: getErrorMessage(err) });
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
