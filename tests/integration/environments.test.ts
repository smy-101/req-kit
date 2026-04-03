import { describe, test, expect, beforeAll } from 'bun:test';
import { Hono } from 'hono';
import { createEnvironmentRoutes } from '../../src/routes/environments';
import { EnvService } from '../../src/services/environment';
import { Database } from '../../src/db/index';

describe('Environments Routes Integration', () => {
  let app: Hono;

  beforeAll(() => {
    const db = new Database(':memory:');
    db.migrate();
    const envService = new EnvService(db);
    app = new Hono();
    app.route('/', createEnvironmentRoutes(envService));
  });

  test('POST /api/environments - creates environment', async () => {
    const res = await app.request('/api/environments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'dev' }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('dev');
  });

  test('GET /api/environments - lists environments', async () => {
    const res = await app.request('/api/environments');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('PUT /api/environments/:id/variables - replaces variables', async () => {
    const envRes = await app.request('/api/environments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });
    const env = await envRes.json();

    const varRes = await app.request(`/api/environments/${env.id}/variables`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { key: 'base_url', value: 'http://localhost:3000' },
        { key: 'token', value: 'abc123' },
      ]),
    });
    expect(varRes.status).toBe(200);
    const vars = await varRes.json();
    expect(vars.length).toBe(2);
  });

  test('DELETE /api/environments/:id - deletes environment', async () => {
    const envRes = await app.request('/api/environments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'todelete' }),
    });
    const env = await envRes.json();

    const delRes = await app.request(`/api/environments/${env.id}`, { method: 'DELETE' });
    expect(delRes.status).toBe(200);
  });
});
