import { describe, test, expect, beforeAll } from 'bun:test';
import { Hono } from 'hono';
import { createGlobalVariableRoutes } from '../../src/routes/global-variables';
import { createCollectionRoutes } from '../../src/routes/collections';
import { VariableService } from '../../src/services/variable';
import { EnvService } from '../../src/services/environment';
import { CollectionService } from '../../src/services/collection';
import { Database } from '../../src/db/index';
import { errorHandler } from '../../src/lib/error-handler';

describe('Variable Routes Integration', () => {
  let app: Hono;
  let db: Database;

  beforeAll(() => {
    db = new Database(':memory:');
    db.migrate();
    const collectionService = new CollectionService(db);
    const envService = new EnvService(db);
    const variableService = new VariableService(db, envService);
    app = new Hono();
    app.route('/', createGlobalVariableRoutes(variableService));
    app.route('/', createCollectionRoutes(collectionService, variableService));
    app.onError(errorHandler);
    app.route('/', createGlobalVariableRoutes(variableService));
    app.route('/', createCollectionRoutes(collectionService, variableService));
  });

  describe('Global Variables', () => {
    test('GET /api/global-variables returns empty array', async () => {
      const res = await app.request('/api/global-variables');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([]);
    });

    test('PUT /api/global-variables replaces all variables', async () => {
      const res = await app.request('/api/global-variables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { key: 'baseUrl', value: 'https://api.example.com' },
          { key: 'timeout', value: '5000', enabled: false },
        ]),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(2);
      expect(data[0].key).toBe('baseUrl');
      expect(data[0].enabled).toBe(1);
      expect(data[1].enabled).toBe(0);
    });

    test('PUT /api/global-variables rejects non-array body', async () => {
      const res = await app.request('/api/global-variables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'bad' }),
      });
      expect(res.status).toBe(400);
    });

    test('GET /api/global-variables returns saved variables', async () => {
      // Clear and set
      await app.request('/api/global-variables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ key: 'host', value: 'https://test.com' }]),
      });
      const res = await app.request('/api/global-variables');
      const data = await res.json();
      expect(data.length).toBe(1);
      expect(data[0].key).toBe('host');
    });
  });

  describe('Collection Variables', () => {
    let collectionId: number;

    test('create a collection first', async () => {
      const res = await app.request('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test API' }),
      });
      expect(res.status).toBe(201);
      const col = await res.json();
      collectionId = col.id;
    });

    test('GET /api/collections/:id/variables returns empty initially', async () => {
      const res = await app.request(`/api/collections/${collectionId}/variables`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([]);
    });

    test('PUT /api/collections/:id/variables sets collection variables', async () => {
      const res = await app.request(`/api/collections/${collectionId}/variables`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { key: 'apiVersion', value: 'v2' },
          { key: 'userId', value: '42' },
        ]),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(2);
    });

    test('GET /api/collections/:id/variables returns saved variables', async () => {
      const res = await app.request(`/api/collections/${collectionId}/variables`);
      const data = await res.json();
      expect(data.length).toBe(2);
      expect(data[0].key).toBe('apiVersion');
      expect(data[1].key).toBe('userId');
    });

    test('PUT replaces all collection variables', async () => {
      const res = await app.request(`/api/collections/${collectionId}/variables`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ key: 'newKey', value: 'newVal' }]),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(1);
      expect(data[0].key).toBe('newKey');
    });

    test('PUT rejects non-array body', async () => {
      const res = await app.request(`/api/collections/${collectionId}/variables`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('not-array'),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Collection variable cascade delete', () => {
    let collectionId: number;

    test('create collection with variables', async () => {
      const colRes = await app.request('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'CascadeTest' }),
      });
      collectionId = (await colRes.json()).id;

      await app.request(`/api/collections/${collectionId}/variables`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { key: 'v1', value: 'a' },
          { key: 'v2', value: 'b' },
          { key: 'v3', value: 'c' },
        ]),
      });
      const varsRes = await app.request(`/api/collections/${collectionId}/variables`);
      expect((await varsRes.json()).length).toBe(3);
    });

    test('deleting collection cascade-deletes its variables', async () => {
      const delRes = await app.request(`/api/collections/${collectionId}`, { method: 'DELETE' });
      expect(delRes.status).toBe(200);

      // Variables should be gone — collection no longer exists
      const varsRes = await app.request(`/api/collections/${collectionId}/variables`);
      // Route still works but returns empty (collection deleted, so no variables)
      const vars = await varsRes.json();
      expect(vars.length).toBe(0);
    });
  });
});
