import { Hono } from 'hono';
import { EnvService } from '../services/environment';

export function createEnvironmentRoutes(envService: EnvService) {
  const router = new Hono();

  router.get('/api/environments', (c) => {
    const envs = envService.getAllEnvironments();
    return c.json(envs);
  });

  router.post('/api/environments', async (c) => {
    const body = await c.req.json<{ name: string }>();
    if (!body.name?.trim()) {
      return c.json({ error: '缺少必填字段: name' }, 400);
    }
    const env = envService.createEnvironment(body.name.trim());
    return c.json(env, 201);
  });

  router.put('/api/environments/:id', async (c) => {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json<{ name: string }>();
    if (!body.name?.trim()) {
      return c.json({ error: '缺少必填字段: name' }, 400);
    }
    const updated = envService.updateEnvironment(id, body.name.trim());
    if (!updated) return c.json({ error: '环境不存在' }, 404);
    return c.json({ success: true });
  });

  router.delete('/api/environments/:id', (c) => {
    const id = parseInt(c.req.param('id'));
    const deleted = envService.deleteEnvironment(id);
    if (!deleted) return c.json({ error: '环境不存在' }, 404);
    return c.json({ success: true });
  });

  router.put('/api/environments/:id/variables', async (c) => {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json<{ key: string; value?: string; enabled?: boolean }[]>();
    if (!Array.isArray(body)) {
      return c.json({ error: '请求体必须为变量数组' }, 400);
    }
    const vars = envService.replaceVariables(id, body);
    return c.json(vars);
  });

  return router;
}
