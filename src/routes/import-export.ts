import { Hono } from 'hono';
import { ImportExportService } from '../services/import-export';

export function createImportExportRoutes(importExportService: ImportExportService) {
  const router = new Hono();

  router.post('/api/import', async (c) => {
    const body = await c.req.json<{ type: string; content: string; collection_id?: number }>();

    if (!body.type || !body.content) {
      return c.json({ error: '缺少必填字段: type, content' }, 400);
    }

    if (body.type === 'curl') {
      if (!body.collection_id) {
        return c.json({ error: 'curl 导入需要 collection_id' }, 400);
      }
      const req = importExportService.importCurl(body.content, body.collection_id);
      if (!req) {
        return c.json({ error: '无法解析 curl 命令' }, 400);
      }
      return c.json(req, 201);
    }

    if (body.type === 'postman') {
      let json: any;
      try {
        json = typeof body.content === 'string' ? JSON.parse(body.content) : body.content;
      } catch {
        return c.json({ error: '无效的 JSON 格式' }, 400);
      }
      const id = importExportService.importPostmanCollection(json);
      if (!id) {
        return c.json({ error: '不支持的 Postman Collection 格式，仅支持 v2.1' }, 400);
      }
      return c.json({ id }, 201);
    }

    return c.json({ error: '不支持的导入类型' }, 400);
  });

  router.get('/api/export/collections/:id', (c) => {
    const id = parseInt(c.req.param('id'));
    const result = importExportService.exportPostmanCollection(id);
    if (!result) {
      return c.json({ error: '集合不存在' }, 404);
    }
    return c.json(result);
  });

  router.get('/api/export/requests/:id/curl', (c) => {
    const id = parseInt(c.req.param('id'));
    const result = importExportService.exportCurl(id);
    if (!result) {
      return c.json({ error: '请求不存在' }, 404);
    }
    return c.text(result);
  });

  return router;
}
