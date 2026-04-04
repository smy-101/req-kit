import { describe, test, expect, beforeAll } from 'bun:test';
import { Hono } from 'hono';
import { createImportExportRoutes } from '../../src/routes/import-export';
import { createCollectionRoutes } from '../../src/routes/collections';
import { ImportExportService } from '../../src/services/import-export';
import { CollectionService } from '../../src/services/collection';
import { EnvService } from '../../src/services/environment';
import { VariableService } from '../../src/services/variable';
import { Database } from '../../src/db/index';

describe('Import-Export Routes Integration', () => {
  let app: Hono;
  let collectionService: CollectionService;

  beforeAll(() => {
    const db = new Database(':memory:');
    db.migrate();
    collectionService = new CollectionService(db);
    const envService = new EnvService(db);
    const variableService = new VariableService(db, envService);
    const importExportService = new ImportExportService(db, collectionService, variableService);
    app = new Hono();
    app.route('/', createImportExportRoutes(importExportService));
    app.route('/', createCollectionRoutes(collectionService, variableService));
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

  describe('Collection variables in import/export', () => {
    test('POST /api/import - imports Postman collection with variables', async () => {
      const res = await app.request('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'postman',
          content: JSON.stringify({
            info: {
              name: 'API with Vars',
              schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
            },
            item: [],
            variable: [
              { key: 'apiVersion', value: 'v2' },
              { key: 'timeout', value: '5000' },
            ],
          }),
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();

      // Verify variables were persisted
      const varsRes = await app.request(`/api/collections/${data.id}/variables`);
      const vars = await varsRes.json();
      expect(vars.length).toBe(2);
      expect(vars[0].key).toBe('apiVersion');
      expect(vars[1].key).toBe('timeout');
    });

    test('GET /api/export/collections/:id - includes collection variables', async () => {
      // Create collection with variables
      const col = collectionService.createCollection('ExportWithVars');
      await app.request(`/api/collections/${col.id}/variables`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { key: 'apiVersion', value: 'v2' },
          { key: 'retry', value: '3' },
        ]),
      });

      const res = await app.request(`/api/export/collections/${col.id}`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.variable).toBeDefined();
      expect(data.variable.length).toBe(2);
      expect(data.variable[0].key).toBe('apiVersion');
    });
  });
});
