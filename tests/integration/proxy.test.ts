import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { createProxyRoutes } from '../../src/routes/proxy';
import { ProxyService } from '../../src/services/proxy';

describe('Proxy Routes Integration', () => {
  let app: Hono;
  let server: any;
  let targetUrl: string;

  beforeAll(() => {
    app = new Hono();
    const proxyService = new ProxyService();
    app.route('/', createProxyRoutes(proxyService));

    // Create target server for integration testing
    const targetApp = new Hono();
    targetApp.get('/get', (c) => c.json({ url: '/get', args: c.req.query() }));
    targetApp.post('/post', async (c) => {
      const body = await c.req.text();
      return c.json({ method: 'POST', data: body });
    });
    server = Bun.serve({ port: 0, fetch: targetApp.fetch });
    targetUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server?.stop();
  });

  test('POST /api/proxy - missing url returns 400', async () => {
    const res = await app.request('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'GET' }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('url');
  });

  test('POST /api/proxy - forwards GET request', async () => {
    const res = await app.request('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `${targetUrl}/get`, method: 'GET' }),
    });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.status).toBe(200);
    expect(data.body).toBeDefined();
  });

  test('POST /api/proxy - forwards POST with body', async () => {
    const res = await app.request('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `${targetUrl}/post`,
        method: 'POST',
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.status).toBe(200);
  });

  test('POST /api/proxy - unreachable returns 502', async () => {
    const res = await app.request('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'http://127.0.0.1:59999/api',
        method: 'GET',
      }),
    });
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toBe('目标服务器不可达');
  });

  test('POST /api/proxy - stream returns SSE', async () => {
    const res = await app.request('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `${targetUrl}/get`,
        method: 'GET',
        stream: true,
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });
});
