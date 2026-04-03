import { describe, test, expect, beforeAll } from 'bun:test';
import { Hono } from 'hono';
import { createImportExportRoutes } from '../../src/routes/import-export';
import { ImportExportService } from '../../src/services/import-export';
import { CollectionService } from '../../src/services/collection';
import { Database } from '../../src/db/index';

describe('Import-Export Routes Integration', () => {
  let app: Hono;
  let collectionService: CollectionService;

  beforeAll(() => {
    const db = new Database(':memory:');
    db.migrate();
    collectionService = new CollectionService(db);
    const importExportService = new ImportExportService(db, collectionService);
    app = new Hono();
    app.route('/', createImportExportRoutes(importExportService));
  });

  test('POST /api/import - imports curl', async () => {
    const col = collectionService.createCollection('Test');
    const res = await app.request('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'curl',
        content: "curl https://api.example.com/users -H 'Auth: token'",
        collection_id: col.id,
      }),
    });
    expect(res.status).toBe(201);
  });

  test('POST /api/import - imports Postman', async () => {
    const res = await app.request('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'postman',
        content: JSON.stringify({
          info: {
            name: 'Test',
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
          },
          item: [],
        }),
      }),
    });
    expect(res.status).toBe(201);
  });

  test('POST /api/import - missing fields returns 400', async () => {
    const res = await app.request('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'curl' }),
    });
    expect(res.status).toBe(400);
  });

  test('GET /api/export/collections/:id - exports collection', async () => {
    const col = collectionService.createCollection('ExportTest');
    const res = await app.request(`/api/export/collections/${col.id}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.info.name).toBe('ExportTest');
  });

  test('GET /api/export/collections/:id - 404 for missing', async () => {
    const res = await app.request('/api/export/collections/999');
    expect(res.status).toBe(404);
  });

  test('GET /api/export/requests/:id/curl - exports curl', async () => {
    const col = collectionService.createCollection('CurlExport');
    const req = collectionService.addRequest(col.id!, {
      name: 'Get Users',
      method: 'GET',
      url: 'https://api.example.com/users',
    });
    const res = await app.request(`/api/export/requests/${req.id}/curl`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('https://api.example.com/users');
  });

  test('GET /api/export/requests/:id/curl - 404 for missing', async () => {
    const res = await app.request('/api/export/requests/999/curl');
    expect(res.status).toBe(404);
  });
});
