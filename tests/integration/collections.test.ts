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

  test('POST /api/collections/requests/:id/duplicate - duplicates request', async () => {
    // Create collection + request
    const colRes = await app.request('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'DupTest' }),
    });
    const col = await colRes.json();

    const reqRes = await app.request(`/api/collections/${col.id}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Original',
        method: 'POST',
        url: 'https://api.example.com/test',
        headers: '{"Content-Type":"application/json"}',
        body: '{"key":"value"}',
        body_type: 'json',
        auth_type: 'bearer',
        auth_config: '{"token":"test"}',
      }),
    });
    const req = await reqRes.json();

    // Duplicate
    const dupRes = await app.request(`/api/collections/requests/${req.id}/duplicate`, {
      method: 'POST',
    });
    expect(dupRes.status).toBe(201);
    const dup = await dupRes.json();
    expect(dup.name).toBe('Original (副本)');
    expect(dup.method).toBe('POST');
    expect(dup.url).toBe('https://api.example.com/test');
    expect(dup.headers).toBe('{"Content-Type":"application/json"}');
    expect(dup.body).toBe('{"key":"value"}');
    expect(dup.auth_type).toBe('bearer');
    expect(dup.auth_config).toBe('{"token":"test"}');
    expect(dup.body_type).toBe('json');
    expect(dup.id).not.toBe(req.id);
  });

  test('POST /api/collections/requests/:id/duplicate - 404 for non-existent', async () => {
    const res = await app.request('/api/collections/requests/99999/duplicate', { method: 'POST' });
    expect(res.status).toBe(404);
  });
});
