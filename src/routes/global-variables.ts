import { Hono } from 'hono';
import { z } from 'zod';
import { VariableService } from '../services/variable';
import { parseBody } from '../lib/validation';

const ReplaceVariablesSchema = z.array(z.object({
  key: z.string().min(1),
  value: z.string().optional(),
  enabled: z.boolean().optional(),
}));

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
