import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Hono } from 'hono';
import { Database } from '../../src/db/index';
import { ProxyService } from '../../src/services/proxy';
import { HistoryService } from '../../src/services/history';
import { EnvService } from '../../src/services/environment';
import { VariableService } from '../../src/services/variable';
import { CollectionService } from '../../src/services/collection';
import { ScriptService } from '../../src/services/script';
import { CookieService } from '../../src/services/cookie';
import {
  executeRequestPipeline,
  type PipelineInput,
  type PipelineServices,
} from '../../src/services/pipeline';

describe('executeRequestPipeline 集成测试', () => {
  let db: Database;
  let services: PipelineServices;
  let targetUrl: string;
  let envService: EnvService;
  let variableService: VariableService;
  let collectionService: CollectionService;
  let historyService: HistoryService;
  let server: any;

  beforeAll(() => {
    db = new Database(':memory:');
    db.migrate();

    const proxyService = new ProxyService();
    historyService = new HistoryService(db);
    envService = new EnvService(db);
    variableService = new VariableService(db, envService);
    collectionService = new CollectionService(db);
    const scriptService = new ScriptService();
    const cookieService = new CookieService(db);

    services = { proxyService, historyService, variableService, scriptService, cookieService };

    // Target server
    const targetApp = new Hono();
    targetApp.get('/echo', (c) => {
      return c.json({
        method: 'GET',
        url: c.req.url,
        headers: Object.fromEntries(c.req.raw.headers),
        query: c.req.query(),
      });
    });
    targetApp.post('/echo-body', async (c) => {
      const body = await c.req.text();
      return c.json({ method: 'POST', body });
    });
    targetApp.post('/echo-headers', (c) => {
      return c.json({ headers: Object.fromEntries(c.req.raw.headers) });
    });
    targetApp.get('/set-cookie', (c) => {
      c.header('Set-Cookie', 'sessionId=abc123; Path=/');
      return c.json({ set: true });
    });
    targetApp.get('/auth-required', (c) => {
      const auth = c.req.header('Authorization');
      if (auth === 'Bearer my-token') {
        return c.json({ auth: 'valid' });
      }
      return c.json({ auth: 'missing' }, 401);
    });
    targetApp.post('/graphql', async (c) => {
      const body = await c.req.json();
      return c.json({ data: body.variables || body });
    });
    targetApp.get('/slow', async (c) => {
      await Bun.sleep(5000);
      return c.json({ slow: true });
    });

    server = Bun.serve({ port: 0, fetch: targetApp.fetch });
    targetUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server?.stop();
    db?.close();
  });

  // --- Basic pipeline ---

  describe('基础管道执行', () => {
    test('成功 GET 请求返回 status、headers、body、time、size', async () => {
      const result = await executeRequestPipeline(
        { url: `${targetUrl}/echo`, method: 'GET' },
        services
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(200);
      expect(result.body).toBeDefined();
      expect(result.time).toBeGreaterThan(0);
      expect(result.size).toBeGreaterThan(0);
      expect(result.retryable).toBeUndefined();
    });

    test('成功 POST 请求发送并接收 body', async () => {
      const result = await executeRequestPipeline(
        { url: `${targetUrl}/echo-body`, method: 'POST', body: '{"key":"value"}' },
        services
      );
      expect(result.status).toBe(200);
      const parsed = JSON.parse(result.body!);
      expect(parsed.method).toBe('POST');
      expect(parsed.body).toBe('{"key":"value"}');
    });

    test('超时错误标记 retryable', async () => {
      const result = await executeRequestPipeline(
        { url: `${targetUrl}/slow`, method: 'GET', timeout: 100 },
        services
      );
      expect(result.error).toContain('超时');
      expect(result.retryable).toBe(true);
      expect(result.status).toBeUndefined();
    });

    test('不可达目标标记 retryable', async () => {
      const result = await executeRequestPipeline(
        { url: 'http://127.0.0.1:1/unreachable', method: 'GET' },
        services
      );
      expect(result.retryable).toBe(true);
      expect(result.error).toBeDefined();
    });
  });

  // --- Auth injection ---

  describe('认证注入', () => {
    test('bearer auth 注入 Authorization header', async () => {
      const result = await executeRequestPipeline(
        {
          url: `${targetUrl}/auth-required`,
          method: 'GET',
          auth_type: 'bearer',
          auth_config: { token: 'my-token' },
        },
        services
      );
      expect(result.status).toBe(200);
      const parsed = JSON.parse(result.body!);
      expect(parsed.auth).toBe('valid');
    });

    test('basic auth 注入 Authorization header', async () => {
      const result = await executeRequestPipeline(
        {
          url: `${targetUrl}/echo-headers`,
          method: 'POST',
          auth_type: 'basic',
          auth_config: { username: 'user', password: 'pass' },
        },
        services
      );
      const parsed = JSON.parse(result.body!);
      expect(parsed.headers['authorization']).toContain('Basic');
    });

    test('apikey in header 注入自定义 header', async () => {
      const result = await executeRequestPipeline(
        {
          url: `${targetUrl}/echo-headers`,
          method: 'POST',
          auth_type: 'apikey',
          auth_config: { key: 'X-API-Key', value: 'abc', in: 'header' },
        },
        services
      );
      const parsed = JSON.parse(result.body!);
      expect(parsed.headers['x-api-key']).toBe('abc');
    });

    test('apikey in query 注入查询参数', async () => {
      const result = await executeRequestPipeline(
        {
          url: `${targetUrl}/echo`,
          method: 'GET',
          auth_type: 'apikey',
          auth_config: { key: 'api_key', value: 'abc', in: 'query' },
        },
        services
      );
      const parsed = JSON.parse(result.body!);
      expect(parsed.query['api_key']).toBe('abc');
    });
  });

  // --- Pre-request script ---

  describe('前置脚本', () => {
    test('前置脚本修改 headers', async () => {
      const result = await executeRequestPipeline(
        {
          url: `${targetUrl}/echo-headers`,
          method: 'POST',
          pre_request_script: "request.setHeader('X-Custom', 'pipeline-value')",
        },
        services
      );
      expect(result.status).toBe(200);
      const parsed = JSON.parse(result.body!);
      expect(parsed.headers['x-custom']).toBe('pipeline-value');
    });

    test('前置脚本修改 body', async () => {
      const result = await executeRequestPipeline(
        {
          url: `${targetUrl}/echo-body`,
          method: 'POST',
          body: '{"original": true}',
          pre_request_script: "request.setBody('{\"modified\": true}')",
        },
        services
      );
      expect(result.status).toBe(200);
      const parsed = JSON.parse(result.body!);
      expect(parsed.body).toBe('{"modified": true}');
    });

    test('前置脚本失败不发送请求', async () => {
      const result = await executeRequestPipeline(
        {
          url: `${targetUrl}/echo`,
          method: 'GET',
          pre_request_script: "throw new Error('script boom')",
        },
        services
      );
      expect(result.error).toContain('script boom');
      expect(result.status).toBeUndefined();
      expect(result.retryable).toBeUndefined();
    });

    test('前置脚本变量注入管道', async () => {
      const result = await executeRequestPipeline(
        {
          url: `${targetUrl}/echo`,
          method: 'GET',
          pre_request_script: "variables.set('myVar', '123')",
        },
        services
      );
      expect(result.status).toBe(200);
      expect(result.scriptVariables['myVar']).toBe('123');
    });
  });

  // --- Post-response script ---

  describe('后置脚本', () => {
    test('后置脚本对响应执行断言', async () => {
      const result = await executeRequestPipeline(
        {
          url: `${targetUrl}/echo`,
          method: 'GET',
          post_response_script: 'tests["is200"] = response.status === 200',
        },
        services
      );
      expect(result.status).toBe(200);
      expect(result.scriptTests!['is200']).toBe(true);
    });

    test('后置脚本失败返回 error 和响应数据', async () => {
      const result = await executeRequestPipeline(
        {
          url: `${targetUrl}/echo`,
          method: 'GET',
          post_response_script: "throw new Error('assert failed')",
        },
        services
      );
      expect(result.error).toContain('assert failed');
      expect(result.status).toBe(200);
      expect(result.body).toBeDefined();
      expect(result.retryable).toBeUndefined();
    });

    test('后置脚本从响应中提取变量', async () => {
      // echo-body returns {"method":"POST","body":"<original body>"}
      // So we use JSON.parse on the body field
      const result = await executeRequestPipeline(
        {
          url: `${targetUrl}/echo-body`,
          method: 'POST',
          body: '{"token": "abc"}',
          post_response_script: "const resp = response.json(); variables.set('token', JSON.parse(resp.body).token)",
        },
        services
      );
      expect(result.status).toBe(200);
      expect(result.postScriptVariables['token']).toBe('abc');
    });
  });

  // --- Variable template resolution ---

  describe('变量模板替换', () => {
    let envId: number;

    beforeAll(() => {
      const env = envService.createEnvironment('PipelineTestEnv');
      envId = env.id!;
      envService.replaceVariables(envId, [
        { key: 'baseUrl', value: targetUrl, enabled: true },
        { key: 'token', value: 'env-token', enabled: true },
      ]);
    });

    test('解析 URL 中的环境变量', async () => {
      const result = await executeRequestPipeline(
        { url: '{{baseUrl}}/echo', method: 'GET', environment_id: envId },
        services
      );
      expect(result.status).toBe(200);
    });

    test('解析 headers 中的环境变量', async () => {
      const result = await executeRequestPipeline(
        {
          url: `${targetUrl}/echo-headers`,
          method: 'POST',
          headers: { 'X-Token': '{{token}}' },
          environment_id: envId,
        },
        services
      );
      const parsed = JSON.parse(result.body!);
      expect(parsed.headers['x-token']).toBe('env-token');
    });

    test('集合变量覆盖环境变量', async () => {
      const collection = collectionService.createCollection('TestCol');
      variableService.replaceForCollection(collection.id!, [{ key: 'token', value: 'col-token', enabled: true }]);

      const result = await executeRequestPipeline(
        {
          url: `${targetUrl}/echo-headers`,
          method: 'POST',
          headers: { 'X-Token': '{{token}}' },
          environment_id: envId,
          collection_id: collection.id!,
        },
        services
      );
      const parsed = JSON.parse(result.body!);
      expect(parsed.headers['x-token']).toBe('col-token');
    });

    test('runtime_vars 覆盖所有作用域', async () => {
      const result = await executeRequestPipeline(
        {
          url: `${targetUrl}/echo-headers`,
          method: 'POST',
          headers: { 'X-Token': '{{token}}' },
          environment_id: envId,
          runtime_vars: { token: 'runtime-val' },
        },
        services
      );
      const parsed = JSON.parse(result.body!);
      expect(parsed.headers['x-token']).toBe('runtime-val');
    });

    test('GraphQL body 变量解析', async () => {
      const result = await executeRequestPipeline(
        {
          url: `${targetUrl}/graphql`,
          method: 'POST',
          body: JSON.stringify({ query: 'query { user }', variables: { id: '{{token}}' } }),
          body_type: 'graphql',
          environment_id: envId,
        },
        services
      );
      expect(result.status).toBe(200);
      const parsed = JSON.parse(result.body!);
      expect(parsed.data.id).toBe('env-token');
    });
  });

  // --- Cookie pipeline ---

  describe('Cookie 管道', () => {
    test('管道提取响应中的 Set-Cookie', async () => {
      const result = await executeRequestPipeline(
        { url: `${targetUrl}/set-cookie`, method: 'GET' },
        services
      );
      expect(result.status).toBe(200);
      expect(result.setCookies).toBeDefined();
      expect(result.setCookies!.length).toBeGreaterThan(0);
      expect(result.setCookies!.some(c => c.name === 'sessionId')).toBe(true);
    });

    test('管道将已存 Cookie 注入后续请求', async () => {
      // First request to store cookie
      await executeRequestPipeline(
        { url: `${targetUrl}/set-cookie`, method: 'GET' },
        services
      );

      // Second request should have the cookie injected
      const result = await executeRequestPipeline(
        { url: `${targetUrl}/echo-headers`, method: 'POST' },
        services
      );
      expect(result.status).toBe(200);
      const parsed = JSON.parse(result.body!);
      expect(parsed.headers['cookie']).toContain('sessionId=abc123');
    });

    test('管道不覆盖用户设置的 Cookie header', async () => {
      // Store a cookie first
      await executeRequestPipeline(
        { url: `${targetUrl}/set-cookie`, method: 'GET' },
        services
      );

      // User provides their own Cookie header
      const result = await executeRequestPipeline(
        {
          url: `${targetUrl}/echo-headers`,
          method: 'POST',
          headers: { Cookie: 'custom=value' },
        },
        services
      );
      expect(result.status).toBe(200);
      const parsed = JSON.parse(result.body!);
      expect(parsed.headers['cookie']).toBe('custom=value');
    });
  });

  // --- History recording ---

  describe('历史记录', () => {
    test('成功请求后记录历史', async () => {
      await executeRequestPipeline(
        { url: `${targetUrl}/echo`, method: 'GET' },
        services
      );

      const list = historyService.list(1, 10);
      expect(list.items.length).toBeGreaterThan(0);
      const record = list.items.find(r => r.url.includes('/echo') && r.method === 'GET');
      expect(record).toBeDefined();
      expect(record!.status).toBe(200);
    });

    test('后置脚本失败也记录历史', async () => {
      await executeRequestPipeline(
        {
          url: `${targetUrl}/echo`,
          method: 'GET',
          post_response_script: "throw new Error('history test')",
        },
        services
      );

      const list = historyService.list(1, 10);
      expect(list.items.length).toBeGreaterThan(0);
    });
  });
});
