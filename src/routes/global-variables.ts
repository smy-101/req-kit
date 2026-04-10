import { Hono } from 'hono';
import { VariableService } from '../services/variable';
import { parseBody, ReplaceVariablesSchema } from '../lib/validation';

export function createGlobalVariableRoutes(variableService: VariableService) {
  const router = new Hono();

  router.get('/api/global-variables', (c) => {
    const variables = variableService.getAllGlobal();
    return c.json(variables);
  });

  router.put('/api/global-variables', async (c) => {
    const body = await parseBody(c, ReplaceVariablesSchema);
    const variables = variableService.replaceGlobal(body);
    return c.json(variables);
  });

  return router;
}
