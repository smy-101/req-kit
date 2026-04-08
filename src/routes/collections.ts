import { Hono } from 'hono';
import { CollectionService } from '../services/collection';
import { VariableService } from '../services/variable';

export function createCollectionRoutes(collectionService: CollectionService, variableService?: VariableService) {
  const router = new Hono();

  router.get('/api/collections', (c) => {
    const tree = collectionService.getTree();
    return c.json(tree);
  });

  router.post('/api/collections', async (c) => {
    const body = await c.req.json<{ name: string; parent_id?: number | null }>();
    if (!body.name) {
      return c.json({ error: '缺少必填字段: name' }, 400);
    }
    const col = collectionService.createCollection(body.name, body.parent_id);
    return c.json(col, 201);
  });

  router.put('/api/collections/:id', async (c) => {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json<{ name: string }>();
    if (!body.name) {
      return c.json({ error: '缺少必填字段: name' }, 400);
    }
    const updated = collectionService.updateCollection(id, body.name);
    if (!updated) return c.json({ error: '集合不存在' }, 404);
    return c.json({ success: true });
  });

  router.delete('/api/collections/:id', (c) => {
    const id = parseInt(c.req.param('id'));
    const deleted = collectionService.deleteCollection(id);
    if (!deleted) return c.json({ error: '集合不存在' }, 404);
    return c.json({ success: true });
  });

  router.patch('/api/collections/:id/move', async (c) => {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json<{ parent_id?: number | null; sort_order?: number }>();
    const moved = collectionService.moveCollection(id, body.parent_id ?? null, body.sort_order);
    if (!moved) return c.json({ error: '集合不存在' }, 404);
    return c.json({ success: true });
  });

  router.post('/api/collections/:id/requests', async (c) => {
    const collectionId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    if (!body.name) {
      return c.json({ error: '缺少必填字段: name' }, 400);
    }
    const req = collectionService.addRequest(collectionId, body);
    return c.json(req, 201);
  });

  router.put('/api/collections/:id/requests/:rid', async (c) => {
    const collectionId = parseInt(c.req.param('id'));
    const requestId = parseInt(c.req.param('rid'));
    const body = await c.req.json();
    const updated = collectionService.updateRequest(collectionId, requestId, body);
    if (!updated) return c.json({ error: '请求不存在' }, 404);
    return c.json({ success: true });
  });

  router.delete('/api/collections/:id/requests/:rid', (c) => {
    const collectionId = parseInt(c.req.param('id'));
    const requestId = parseInt(c.req.param('rid'));
    const deleted = collectionService.deleteRequest(collectionId, requestId);
    if (!deleted) return c.json({ error: '请求不存在' }, 404);
    return c.json({ success: true });
  });

  router.post('/api/collections/requests/:id/duplicate', (c) => {
    const requestId = parseInt(c.req.param('id'));
    const duplicated = collectionService.duplicateRequest(requestId);
    if (!duplicated) return c.json({ error: '请求不存在' }, 404);
    return c.json(duplicated, 201);
  });

  // 集合变量端点
  if (variableService) {
    router.get('/api/collections/:id/variables', (c) => {
      const id = parseInt(c.req.param('id'));
      const variables = variableService.getByCollection(id);
      return c.json(variables);
    });

    router.put('/api/collections/:id/variables', async (c) => {
      const id = parseInt(c.req.param('id'));
      const body = await c.req.json<{ key: string; value?: string; enabled?: boolean }[]>();
      if (!Array.isArray(body)) {
        return c.json({ error: '请求体必须是数组' }, 400);
      }
      const variables = variableService.replaceForCollection(id, body);
      return c.json(variables);
    });
  }

  return router;
}
