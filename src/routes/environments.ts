import { Hono } from 'hono';
import { z } from 'zod';
import { EnvService } from '../services/environment';
import { parseBody, parseParam } from '../lib/validation';

const CreateEnvironmentSchema = z.object({
  name: z.string().min(1, 'name 不能为空').transform(s => s.trim()),
});

const UpdateEnvironmentSchema = z.object({
  name: z.string().min(1, 'name 不能为空').transform(s => s.trim()),
});

const ReplaceVariablesSchema = z.array(z.object({
  key: z.string().min(1),
  value: z.string().optional(),
  enabled: z.boolean().optional(),
}));

export function createEnvironmentRoutes(envService: EnvService) {
  const router = new Hono();

  router.get('/api/environments', (c) => {
    const envs = envService.getAllEnvironments();
    return c.json(envs);
  });

  router.post('/api/environments', async (c) => {
    const body = await parseBody(c, CreateEnvironmentSchema);
    const env = envService.createEnvironment(body.name);
    return c.json(env, 201);
  });

  router.put('/api/environments/:id', async (c) => {
    const id = parseParam(c, 'id');
    const body = await parseBody(c, UpdateEnvironmentSchema);
    const updated = envService.updateEnvironment(id, body.name);
    if (!updated) return c.json({ error: '环境不存在' }, 404);
    return c.json({ success: true });
  });

  router.delete('/api/environments/:id', (c) => {
    const id = parseParam(c, 'id');
    const deleted = envService.deleteEnvironment(id);
    if (!deleted) return c.json({ error: '环境不存在' }, 404);
    return c.json({ success: true });
  });

  router.put('/api/environments/:id/variables', async (c) => {
    const id = parseParam(c, 'id');
    const body = await parseBody(c, ReplaceVariablesSchema);
    const vars = envService.replaceVariables(id, body);
    return c.json(vars);
  });

  return router;
}
