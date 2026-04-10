import { Hono } from 'hono';
import { z } from 'zod';
import { CollectionService } from '../services/collection';
import { VariableService } from '../services/variable';
import { parseBody, parseParam, ReplaceVariablesSchema } from '../lib/validation';

const CreateCollectionSchema = z.object({
  name: z.string().min(1, 'name 不能为空'),
  parent_id: z.number().nullable().optional(),
});

const UpdateCollectionSchema = z.object({
  name: z.string().min(1, 'name 不能为空'),
});

const MoveCollectionSchema = z.object({
  parent_id: z.number().nullable().optional(),
  sort_order: z.number().optional(),
});

const AddRequestSchema = z.object({
  name: z.string().min(1, 'name 不能为空'),
}).passthrough();

const UpdateRequestSchema = z.object({}).passthrough();

export function createCollectionRoutes(collectionService: CollectionService, variableService?: VariableService) {
  const router = new Hono();

  router.get('/api/collections', (c) => {
    const tree = collectionService.getTree();
    return c.json(tree);
  });

  router.post('/api/collections', async (c) => {
    const body = await parseBody(c, CreateCollectionSchema);
    const col = collectionService.createCollection(body.name, body.parent_id);
    return c.json(col, 201);
  });

  router.put('/api/collections/:id', async (c) => {
    const id = parseParam(c, 'id');
    const body = await parseBody(c, UpdateCollectionSchema);
    const updated = collectionService.updateCollection(id, body.name);
    if (!updated) return c.json({ error: '集合不存在' }, 404);
    return c.json({ success: true });
  });

  router.delete('/api/collections/:id', (c) => {
    const id = parseParam(c, 'id');
    const deleted = collectionService.deleteCollection(id);
    if (!deleted) return c.json({ error: '集合不存在' }, 404);
    return c.json({ success: true });
  });

  router.patch('/api/collections/:id/move', async (c) => {
    const id = parseParam(c, 'id');
    const body = await parseBody(c, MoveCollectionSchema);
    const moved = collectionService.moveCollection(id, body.parent_id ?? null, body.sort_order);
    if (!moved) return c.json({ error: '集合不存在' }, 404);
    return c.json({ success: true });
  });

  router.post('/api/collections/:id/requests', async (c) => {
    const collectionId = parseParam(c, 'id');
    const body = await parseBody(c, AddRequestSchema);
    const req = collectionService.addRequest(collectionId, body);
    return c.json(req, 201);
  });

  router.put('/api/collections/:id/requests/:rid', async (c) => {
    const collectionId = parseParam(c, 'id');
    const requestId = parseParam(c, 'rid');
    const body = await parseBody(c, UpdateRequestSchema);
    const updated = collectionService.updateRequest(collectionId, requestId, body);
    if (!updated) return c.json({ error: '请求不存在' }, 404);
    return c.json({ success: true });
  });

  router.delete('/api/collections/:id/requests/:rid', (c) => {
    const collectionId = parseParam(c, 'id');
    const requestId = parseParam(c, 'rid');
    const deleted = collectionService.deleteRequest(collectionId, requestId);
    if (!deleted) return c.json({ error: '请求不存在' }, 404);
    return c.json({ success: true });
  });

  router.post('/api/collections/requests/:id/duplicate', (c) => {
    const requestId = parseParam(c, 'id');
    const duplicated = collectionService.duplicateRequest(requestId);
    if (!duplicated) return c.json({ error: '请求不存在' }, 404);
    return c.json(duplicated, 201);
  });

  // 集合变量端点
  if (variableService) {
    router.get('/api/collections/:id/variables', (c) => {
      const id = parseParam(c, 'id');
      const variables = variableService.getByCollection(id);
      return c.json(variables);
    });

    router.put('/api/collections/:id/variables', async (c) => {
      const id = parseParam(c, 'id');
      const body = await parseBody(c, ReplaceVariablesSchema);
      const variables = variableService.replaceForCollection(id, body);
      return c.json(variables);
    });
  }

  return router;
}
