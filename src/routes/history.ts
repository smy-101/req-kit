import { Hono } from 'hono';
import { z } from 'zod';
import { HistoryService } from '../services/history';
import { parseParam, parseQuery } from '../lib/validation';

const HistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(50),
  search: z.string().optional(),
  method: z.string().optional(),
});

const CleanupQuerySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
});

export function createHistoryRoutes(historyService: HistoryService) {
  const router = new Hono();

  router.get('/api/history', (c) => {
    const { page, limit, search, method } = parseQuery(c, HistoryQuerySchema);
    const result = historyService.list(page, limit, search, method);
    return c.json(result);
  });

  router.get('/api/history/:id', (c) => {
    const id = parseParam(c, 'id');
    const record = historyService.getById(id);
    if (!record) {
      return c.json({ error: '记录不存在' }, 404);
    }
    return c.json(record);
  });

  // Must be registered before /api/history/:id to avoid "cleanup" being captured as :id
  router.delete('/api/history/cleanup', (c) => {
    const { limit } = parseQuery(c, CleanupQuerySchema);
    const deleted = historyService.cleanup(limit);
    return c.json({ deleted });
  });

  router.delete('/api/history/:id', (c) => {
    const id = parseParam(c, 'id');
    const deleted = historyService.deleteById(id);
    if (!deleted) {
      return c.json({ error: '记录不存在' }, 404);
    }
    return c.json({ success: true });
  });

  router.delete('/api/history', (c) => {
    const deleted = historyService.deleteAll();
    return c.json({ deleted });
  });

  return router;
}
