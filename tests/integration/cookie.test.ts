import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { createProxyRoutes } from '../../src/routes/proxy';
import { createCookieRoutes } from '../../src/routes/cookies';
import { ProxyService } from '../../src/services/proxy';
import { HistoryService } from '../../src/services/history';
import { EnvService } from '../../src/services/environment';
import { VariableService } from '../../src/services/variable';
import { ScriptService } from '../../src/services/script';
import { CookieService } from '../../src/services/cookie';
import { Database } from '../../src/db/index';

describe('Cookie Routes Integration', () => {
  let app: Hono;
  let db: Database;

  beforeAll(() => {
    db = new Database(':memory:');
    db.migrate();
    const cookieService = new CookieService(db);
    app = new Hono();
    app.route('/', createCookieRoutes(cookieService));
  });

  test('GET /api/cookies returns empty list initially', async () => {
    const res = await app.request('/api/cookies');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cookies).toEqual([]);
  });

  test('DELETE /api/cookies/:id returns 404 for non-existent cookie', async () => {
    const res = await app.request('/api/cookies/999', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  test('DELETE /api/cookies clears all', async () => {
    const res = await app.request('/api/cookies', { method: 'DELETE' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(typeof data.deleted).toBe('number');
  });
});

describe('Cookie Proxy Pipeline Integration', () => {
  let app: Hono;
  let db: Database;
  let targetServer: any;
  let targetUrl: string;

  beforeAll(() => {
    db = new Database(':memory:');
    db.migrate();
    const proxyService = new ProxyService();
    const historyService = new HistoryService(db);
    const envService = new EnvService(db);
    const variableService = new VariableService(db, envService);
    const scriptService = new ScriptService();
    const cookieService = new CookieService(db);

    app = new Hono();
    app.route('/', createProxyRoutes(proxyService, historyService, variableService, scriptService, cookieService));
    app.route('/', createCookieRoutes(cookieService));

    // Target server that returns Set-Cookie and echoes back Cookie header
    const targetApp = new Hono();
    targetApp.get('/set-cookie', (c) => {
      c.header('Set-Cookie', 'sessionId=abc123; Path=/');
      return c.json({ set: true });
    });
    targetApp.get('/set-multiple-cookies', (c) => {
      c.header('Set-Cookie', 'a=1; Path=/');
      c.header('Set-Cookie', 'b=2; Path=/api', { append: true });
      return c.json({ set: true });
    });
    targetApp.get('/echo-cookie', (c) => {
      const cookie = c.req.header('Cookie') || '';
      return c.json({ cookie });
    });
    targetApp.get('/set-cookie-with-domain', (c) => {
      c.header('Set-Cookie', 'token=xyz; Domain=.test.local; Path=/');
      return c.json({ set: true });
    });
    targetServer = Bun.serve({ port: 0, fetch: targetApp.fetch });
    targetUrl = `http://localhost:${targetServer.port}`;
  });

  afterAll(() => {
    targetServer?.stop();
  });

  test('proxy extracts Set-Cookie and stores in jar', async () => {
    const res = await app.request('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `${targetUrl}/set-cookie`, method: 'GET' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.set_cookies).toBeDefined();
    expect(data.set_cookies).toHaveLength(1);
    expect(data.set_cookies[0].name).toBe('sessionId');
    expect(data.set_cookies[0].cookie_action).toBe('added');

    // Verify stored in jar
    const cookiesRes = await app.request('/api/cookies');
    const cookiesData = await cookiesRes.json();
    expect(cookiesData.cookies).toHaveLength(1);
    expect(cookiesData.cookies[0].name).toBe('sessionId');
  });

  test('proxy injects Cookie header for subsequent requests', async () => {
    // First: set a cookie
    await app.request('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `${targetUrl}/set-cookie`, method: 'GET' }),
    });

    // Second: echo back the cookie
    const res = await app.request('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `${targetUrl}/echo-cookie`, method: 'GET' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    const body = JSON.parse(data.body);
    expect(body.cookie).toContain('sessionId=abc123');
  });

  test('proxy does not override user-set Cookie header', async () => {
    // Set a cookie first
    await app.request('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `${targetUrl}/set-cookie`, method: 'GET' }),
    });

    // Send with custom Cookie header
    const res = await app.request('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `${targetUrl}/echo-cookie`,
        method: 'GET',
        headers: { Cookie: 'custom=value' },
      }),
    });
    const data = await res.json();
    const body = JSON.parse(data.body);
    expect(body.cookie).toBe('custom=value');
    expect(body.cookie).not.toContain('sessionId');
  });

  test('set_cookies marks updated on upsert', async () => {
    // First: add cookie
    await app.request('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `${targetUrl}/set-cookie`, method: 'GET' }),
    });

    // Second: update same cookie (server sends same name)
    const res = await app.request('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `${targetUrl}/set-cookie`, method: 'GET' }),
    });
    const data = await res.json();
    expect(data.set_cookies[0].cookie_action).toBe('updated');

    // Should still be 1 cookie
    const cookiesRes = await app.request('/api/cookies');
    const cookiesData = await cookiesRes.json();
    expect(cookiesData.cookies).toHaveLength(1);
  });

  test('handles multiple Set-Cookie headers', async () => {
    // Clear all cookies first
    await app.request('/api/cookies', { method: 'DELETE' });

    const res = await app.request('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `${targetUrl}/set-multiple-cookies`, method: 'GET' }),
    });
    const data = await res.json();
    expect(data.set_cookies).toHaveLength(2);
    expect(data.set_cookies[0].name).toBe('a');
    expect(data.set_cookies[1].name).toBe('b');
  });

  test('DELETE /api/cookies?domain= clears domain cookies', async () => {
    await app.request('/api/cookies', { method: 'DELETE' });

    // Set a cookie
    await app.request('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `${targetUrl}/set-cookie`, method: 'GET' }),
    });

    const res = await app.request(`/api/cookies?domain=localhost`, { method: 'DELETE' });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.deleted).toBeGreaterThanOrEqual(1);
  });
});
