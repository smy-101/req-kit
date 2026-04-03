import { describe, test, expect, beforeAll } from 'bun:test';
import { Hono } from 'hono';
import { createCollectionRoutes } from '../../src/routes/collections';
import { CollectionService } from '../../src/services/collection';
import { Database } from '../../src/db/index';

describe('Collections Routes Integration', () => {
  let app: Hono;

  beforeAll(() => {
    const db = new Database(':memory:');
    db.migrate();
    const collectionService = new CollectionService(db);
    app = new Hono();
    app.route('/', createCollectionRoutes(collectionService));
  });

  test('POST /api/collections - creates collection', async () => {
    const res = await app.request('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '用户接口' }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('用户接口');
    expect(data.parent_id).toBeNull();
  });

  test('POST /api/collections - missing name returns 400', async () => {
    const res = await app.request('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  test('POST /api/collections - creates subfolder', async () => {
    const parentRes = await app.request('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Parent' }),
    });
    const parent = await parentRes.json();

    const childRes = await app.request('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Child', parent_id: parent.id }),
    });
    expect(childRes.status).toBe(201);
    const child = await childRes.json();
    expect(child.parent_id).toBe(parent.id);
  });

  test('GET /api/collections - returns tree', async () => {
    const res = await app.request('/api/collections');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('POST /api/collections/:id/requests - adds request', async () => {
    const colRes = await app.request('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'TestCol' }),
    });
    const col = await colRes.json();

    const reqRes = await app.request(`/api/collections/${col.id}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Get Users',
        method: 'GET',
        url: 'https://api.example.com/users',
      }),
    });
    expect(reqRes.status).toBe(201);
    const req = await reqRes.json();
    expect(req.name).toBe('Get Users');
  });

  test('DELETE /api/collections/:id - deletes collection', async () => {
    const colRes = await app.request('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ToDelete' }),
    });
    const col = await colRes.json();

    const delRes = await app.request(`/api/collections/${col.id}`, { method: 'DELETE' });
    expect(delRes.status).toBe(200);
  });
});
