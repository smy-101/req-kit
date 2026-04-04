import { Hono } from 'hono';
import { VariableService } from '../services/variable';

export function createGlobalVariableRoutes(variableService: VariableService) {
  const router = new Hono();

  router.get('/api/global-variables', (c) => {
    const variables = variableService.getAllGlobal();
    return c.json(variables);
  });

  router.put('/api/global-variables', async (c) => {
    const body = await c.req.json<{ key: string; value?: string; enabled?: boolean }[]>();
    if (!Array.isArray(body)) {
      return c.json({ error: '请求体必须是数组' }, 400);
    }
    const variables = variableService.replaceGlobal(body);
    return c.json(variables);
  });

  return router;
}
