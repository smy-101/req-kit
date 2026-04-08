import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { createProxyRoutes } from '../../src/routes/proxy';
import { ProxyService } from '../../src/services/proxy';
import { HistoryService } from '../../src/services/history';
import { EnvService } from '../../src/services/environment';
import { VariableService } from '../../src/services/variable';
import { CollectionService } from '../../src/services/collection';
import { ScriptService } from '../../src/services/script';
import { CookieService } from '../../src/services/cookie';
import { Database } from '../../src/db/index';

describe('Proxy Routes Integration', () => {
  let app: Hono;
  let server: any;
  let targetUrl: string;
  let db: Database;
  let envService: EnvService;
  let variableService: VariableService;
  let collectionService: CollectionService;

  beforeAll(() => {
    db = new Database(':memory:');
    db.migrate();
    const proxyService = new ProxyService();
    const historyService = new HistoryService(db);
    envService = new EnvService(db);
    variableService = new VariableService(db, envService);
    collectionService = new CollectionService(db);
    const scriptService = new ScriptService();
    const cookieService = new CookieService(db);
    app = new Hono();
    app.route('/', createProxyRoutes(proxyService, historyService, variableService, scriptService, cookieService));

    // Create target server for integration testing
    const targetApp = new Hono();
    targetApp.get('/get', (c) => c.json({ url: '/get', args: c.req.query() }));
    targetApp.post('/post', async (c) => {
      const body = await c.req.text();
      return c.json({ method: 'POST', data: body });
    });
    targetApp.get('/slow', async (c) => {
      await Bun.sleep(5000);
      return c.json({ slow: true });
    });
    targetApp.get('/redirect', (c) => {
      return c.redirect(`${c.req.query('to') || '/get'}`, 301);
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

  test('POST /api/proxy - runtime_vars template replacement', async () => {
    const res = await app.request('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `${targetUrl}/get`,
        method: 'GET',
        runtime_vars: { q: 'hello' },
      }),
    });
    // The URL doesn't contain {{q}}, so runtime_vars shouldn't affect it
    expect(res.status).toBe(200);
  });

  test('POST /api/proxy - pre-request script returns variables', async () => {
    const res = await app.request('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `${targetUrl}/get`,
        method: 'GET',
        pre_request_script: "variables.set('token', 'abc')",
      }),
    });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.script_variables).toBeDefined();
    expect(data.script_variables.token).toBe('abc');
  });

  describe('Variable template replacement in proxy pipeline', () => {
    let envId: number;
    let collectionId: number;

    beforeAll(() => {
      // Set up environment with variables
      const env = envService.createEnvironment('TestEnv');
      envId = env.id!;
      envService.replaceVariables(envId, [
        { key: 'token', value: 'env-token-val', enabled: true },
        { key: 'shared', value: 'env-shared', enabled: true },
      ]);

      // Set up collection with variables
      const col = collectionService.createCollection('TestCol');
      collectionId = col.id!;
      variableService.replaceForCollection(collectionId, [
        { key: 'colKey', value: 'col-val', enabled: true },
        { key: 'shared', value: 'col-shared', enabled: true },
      ]);

      // Set up global variables
      variableService.replaceGlobal([
        { key: 'gKey', value: 'global-val', enabled: true },
        { key: 'shared', value: 'global-shared', enabled: true },
      ]);
    });

    test('replaces params with global variable', async () => {
      const res = await app.request('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${targetUrl}/get`,
          method: 'GET',
          params: { q: '{{gKey}}' },
        }),
      });
      expect(res.status).toBe(200);
      const data: any = await res.json();
      const target: any = JSON.parse(data.body);
      expect(target.args.q).toBe('global-val');
    });

    test('environment variable overrides global', async () => {
      const res = await app.request('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${targetUrl}/get`,
          method: 'GET',
          params: { q: '{{token}}' },
          environment_id: envId,
        }),
      });
      expect(res.status).toBe(200);
      const data: any = await res.json();
      const target: any = JSON.parse(data.body);
      expect(target.args.q).toBe('env-token-val');
    });

    test('collection variable overrides environment', async () => {
      const res = await app.request('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${targetUrl}/get`,
          method: 'GET',
          params: { q: '{{shared}}' },
          environment_id: envId,
          collection_id: collectionId,
        }),
      });
      expect(res.status).toBe(200);
      const data: any = await res.json();
      const target: any = JSON.parse(data.body);
      expect(target.args.q).toBe('col-shared');
    });

    test('runtime_vars override all scopes', async () => {
      const res = await app.request('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${targetUrl}/get`,
          method: 'GET',
          params: { q: '{{shared}}' },
          environment_id: envId,
          collection_id: collectionId,
          runtime_vars: { shared: 'runtime-val' },
        }),
      });
      expect(res.status).toBe(200);
      const data: any = await res.json();
      const target: any = JSON.parse(data.body);
      expect(target.args.q).toBe('runtime-val');
    });

    test('unmatched variable stays as-is in URL', async () => {
      const res = await app.request('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${targetUrl}/get`,
          method: 'GET',
          params: { q: '{{unknownVar}}' },
          environment_id: envId,
        }),
      });
      expect(res.status).toBe(200);
      const data: any = await res.json();
      const target: any = JSON.parse(data.body);
      expect(target.args.q).toBe('{{unknownVar}}');
    });
  });

  describe('Post-response script', () => {
    test('executes post-response script and returns script_tests', async () => {
      const res = await app.request('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${targetUrl}/get`,
          method: 'GET',
          post_response_script: "tests['状态码200'] = response.status === 200",
        }),
      });
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.script_tests).toBeDefined();
      expect(data.script_tests['状态码200']).toBe(true);
    });

    test('returns post_script_variables', async () => {
      const res = await app.request('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${targetUrl}/get`,
          method: 'GET',
          post_response_script: "variables.set('extracted', 'value1')",
        }),
      });
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.post_script_variables).toBeDefined();
      expect(data.post_script_variables.extracted).toBe('value1');
    });

    test('returns post_script_logs', async () => {
      const res = await app.request('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${targetUrl}/get`,
          method: 'GET',
          post_response_script: "console.log('got status', response.status)",
        }),
      });
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.post_script_logs).toBeDefined();
      expect(data.post_script_logs).toContain('got status 200');
    });

    test('post-response script timeout returns 400', async () => {
      const res = await app.request('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${targetUrl}/get`,
          method: 'GET',
          post_response_script: 'while(true) {}',
        }),
      });
      expect(res.status).toBe(400);
      const data: any = await res.json();
      expect(data.error).toContain('超时');
      expect(data.post_script_logs).toBeDefined();
      expect(data.post_script_variables).toBeDefined();
    });

    test('post-response script error returns 400 with logs and variables', async () => {
      const res = await app.request('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${targetUrl}/get`,
          method: 'GET',
          post_response_script: "variables.set('k', 'v'); console.log('before error'); throw new Error('boom')",
        }),
      });
      expect(res.status).toBe(400);
      const data: any = await res.json();
      expect(data.error).toContain('boom');
      expect(data.post_script_logs).toContain('before error');
      expect(data.post_script_variables).toEqual({ k: 'v' });
    });

    test('SSE stream ignores post-response script', async () => {
      const res = await app.request('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${targetUrl}/get`,
          method: 'GET',
          stream: true,
          post_response_script: "tests['should not run'] = true",
        }),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/event-stream');
      // No script_tests in SSE mode — just verify it doesn't crash
    });
  });

  describe('Custom timeout', () => {
    test('short timeout on slow endpoint returns 504', async () => {
      const res = await app.request('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${targetUrl}/slow`,
          method: 'GET',
	          timeout: 1000,
        }),
      });
      expect(res.status).toBe(504);
      const data = await res.json();
      expect(data.error).toBe('请求超时');
    });
  });

  describe('Redirect control', () => {
    test('follow_redirects: true follows redirect (default)', async () => {
      const res = await app.request('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${targetUrl}/redirect`,
          method: 'GET',
        }),
      });
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.status).toBe(200);
    });

    test('follow_redirects: false returns redirect response', async () => {
      const res = await app.request('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${targetUrl}/redirect`,
          method: 'GET',
          follow_redirects: false,
        }),
      });
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.status).toBe(301);
    });
  });
});
