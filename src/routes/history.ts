import { Hono } from 'hono';
import { HistoryService } from '../services/history';

export function createHistoryRoutes(historyService: HistoryService) {
  const router = new Hono();

  router.get('/api/history', (c) => {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const search = c.req.query('search') || undefined;
    const method = c.req.query('method') || undefined;
    const result = historyService.list(page, limit, search, method);
    return c.json(result);
  });

  router.get('/api/history/:id', (c) => {
    const id = parseInt(c.req.param('id'));
    const record = historyService.getById(id);
    if (!record) {
      return c.json({ error: '记录不存在' }, 404);
    }
    return c.json(record);
  });

  router.delete('/api/history/:id', (c) => {
    const id = parseInt(c.req.param('id'));
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
