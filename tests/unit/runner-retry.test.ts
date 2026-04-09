import { describe, test, expect, beforeEach, afterAll } from 'bun:test';
import { Database } from '../../src/db/index';
import { CollectionService } from '../../src/services/collection';
import { VariableService } from '../../src/services/variable';
import { HistoryService } from '../../src/services/history';
import { ScriptService } from '../../src/services/script';
import { ProxyService } from '../../src/services/proxy';
import { CookieService } from '../../src/services/cookie';
import { EnvService } from '../../src/services/environment';
import { RunnerService } from '../../src/services/runner';
import { Hono } from 'hono';

describe('RunnerService 重试逻辑', () => {
  let db: Database;
  let runnerService: RunnerService;
  let collectionService: CollectionService;
  let server: any;
  let baseUrl: string;

  beforeEach(async () => {
    db = new Database(':memory:');
    db.migrate();

    const collectionService_ = new CollectionService(db);
    const envService = new EnvService(db);
    const variableService = new VariableService(db, envService);
    const historyService = new HistoryService(db);
    const scriptService = new ScriptService();
    const proxyService = new ProxyService();
    const cookieService = new CookieService(db);

    collectionService = collectionService_;
    runnerService = new RunnerService(
      collectionService, variableService, historyService, scriptService, proxyService, cookieService
    );

    // 创建测试 HTTP 服务器
    const testApp = new Hono();
    let callCount = 0;

    testApp.get('/flaky', (c) => {
      callCount++;
      // 前两次返回 500，第三次成功
      if (callCount <= 2) return c.json({ error: 'server error' }, 500);
      return c.json({ ok: true });
    });

    testApp.get('/always-5xx', (c) => c.json({ error: 'bad' }, 500));
    testApp.get('/always-4xx', (c) => c.json({ error: 'not found' }, 404));
    testApp.get('/ok', (c) => c.json({ ok: true }));

    server = Bun.serve({ port: 0, fetch: testApp.fetch });
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server?.stop();
    db?.close();
  });

  test('HTTP 5xx 触发重试，最终成功', async () => {
    const col = collectionService.createCollection('Test');
    collectionService.addRequest(col.id!, {
      name: 'Flaky',
      method: 'GET',
      url: `${baseUrl}/flaky`,
    });

    const events: any[] = [];
    await runnerService.run(col.id!, undefined, {
      onStart: (n) => events.push({ type: 'start', total: n }),
      onRequestStart: (i, name, method, url) => events.push({ type: 'request:start', i, name }),
      onRequestRetry: (data) => events.push({ type: 'request:retry', ...data }),
      onRequestComplete: (data) => events.push({ type: 'request:complete', ...data }),
      onDone: (data) => events.push({ type: 'done', ...data }),
    }, undefined, 2, 100);

    // 应该有 2 次重试事件
    const retries = events.filter(e => e.type === 'request:retry');
    expect(retries.length).toBe(2);
    expect(retries[0].attempt).toBe(1);
    expect(retries[0].maxRetries).toBe(2);

    // 最终应该成功
    const completes = events.filter(e => e.type === 'request:complete');
    expect(completes.length).toBe(1);
    expect(completes[0].retryCount).toBe(2);
    expect(completes[0].error).toBeUndefined();

    const done = events.find(e => e.type === 'done');
    expect(done.passed).toBe(1);
    expect(done.failed).toBe(0);
  });

  test('HTTP 4xx 不触发重试', async () => {
    const col = collectionService.createCollection('Test');
    collectionService.addRequest(col.id!, {
      name: 'NotFound',
      method: 'GET',
      url: `${baseUrl}/always-4xx`,
    });

    const events: any[] = [];
    await runnerService.run(col.id!, undefined, {
      onStart: () => {},
      onRequestStart: () => {},
      onRequestRetry: (data) => events.push(data),
      onRequestComplete: (data) => events.push(data),
      onDone: () => {},
    }, undefined, 3, 100);

    // 不应该有重试
    expect(events.length).toBe(1); // 只有 complete
    expect(events[0].retryCount).toBe(0);
  });

  test('所有重试失败后标记为失败', async () => {
    const col = collectionService.createCollection('Test');
    // 使用始终返回 500 的端点
    collectionService.addRequest(col.id!, {
      name: 'Always5xx',
      method: 'GET',
      url: `${baseUrl}/always-5xx`,
    });

    const events: any[] = [];
    await runnerService.run(col.id!, undefined, {
      onStart: () => {},
      onRequestStart: () => {},
      onRequestRetry: (data) => events.push({ type: 'retry', ...data }),
      onRequestComplete: (data) => events.push({ type: 'complete', ...data }),
      onDone: (data) => events.push({ type: 'done', ...data }),
    }, undefined, 2, 50);

    // 应该有 2 次重试
    const retries = events.filter(e => e.type === 'retry');
    expect(retries.length).toBe(2);
    expect(retries[0].attempt).toBe(1);
    expect(retries[0].maxRetries).toBe(2);

    // 最终应包含重试计数
    const complete = events.find(e => e.type === 'complete');
    expect(complete.retryCount).toBe(2);
    expect(complete.status).toBe(500);
  });

  test('默认 retryCount=0 不重试', async () => {
    const col = collectionService.createCollection('Test');
    collectionService.addRequest(col.id!, {
      name: 'Always5xx',
      method: 'GET',
      url: `${baseUrl}/always-5xx`,
    });

    const events: any[] = [];
    await runnerService.run(col.id!, undefined, {
      onStart: () => {},
      onRequestStart: () => {},
      onRequestRetry: (data) => events.push(data),
      onRequestComplete: (data) => events.push(data),
      onDone: () => {},
    });

    // 不应该有重试
    expect(events.length).toBe(1);
    expect(events[0].retryCount).toBe(0);
  });

  test('重试间隔被正确执行', async () => {
    const col = collectionService.createCollection('Test');
    collectionService.addRequest(col.id!, {
      name: 'Always5xx',
      method: 'GET',
      url: `${baseUrl}/always-5xx`,
    });

    const retryDelayMs = 150;
    const retryCount = 2;
    const events: any[] = [];
    const start = Date.now();

    await runnerService.run(col.id!, undefined, {
      onStart: () => {},
      onRequestStart: () => {},
      onRequestRetry: (data) => events.push({ type: 'retry', ...data, ts: Date.now() }),
      onRequestComplete: (data) => events.push(data),
      onDone: () => {},
    }, undefined, retryCount, retryDelayMs);

    const elapsed = Date.now() - start;

    // 2 次重试，每次等待 150ms → 总耗时应 ≥ 300ms
    expect(elapsed).toBeGreaterThanOrEqual(retryDelayMs * retryCount - 20); // 20ms 容差

    // 每次重试之间的间隔也应 ≥ 150ms
    const retry0Ts = events.find(e => e.attempt === 1)!.ts;
    const retry1Ts = events.find(e => e.attempt === 2)!.ts;
    expect(retry1Ts - retry0Ts).toBeGreaterThanOrEqual(retryDelayMs - 20);
  });
});

describe('Pipeline retryable 标记', () => {
  let db: Database;
  let services: any;
  let server: any;
  let baseUrl: string;

  beforeEach(async () => {
    db = new Database(':memory:');
    db.migrate();

    const collectionService = new CollectionService(db);
    const envService = new EnvService(db);
    const variableService = new VariableService(db, envService);
    const historyService = new HistoryService(db);
    const scriptService = new ScriptService();
    const proxyService = new ProxyService();
    const cookieService = new CookieService(db);

    services = { proxyService, historyService, variableService, scriptService, cookieService };

    // 创建一个永不响应的服务器（用于测试超时）
    const slowApp = new Hono();
    slowApp.get('/slow', async () => {
      await new Promise(resolve => setTimeout(resolve, 60_000));
      return new Response('');
    });
    slowApp.get('/ok', (c) => c.json({ ok: true }));

    server = Bun.serve({ port: 0, fetch: slowApp.fetch });
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server?.stop();
    db?.close();
  });

  test('超时错误标记为 retryable', async () => {
    const { executeRequestPipeline } = await import('../../src/routes/proxy');
    const result = await executeRequestPipeline({
      url: `${baseUrl}/slow`,
      method: 'GET',
      timeout: 100, // 100ms 超时，快速触发
    }, services);

    expect(result.error).toBe('请求超时');
    expect(result.retryable).toBe(true);
    expect(result.status).toBeUndefined();
  });

  test('不可达错误标记为 retryable', async () => {
    const { executeRequestPipeline } = await import('../../src/routes/proxy');
    // 使用不存在的端口触发网络错误（可能是连接拒绝或超时，取决于系统）
    const result = await executeRequestPipeline({
      url: 'http://127.0.0.1:1/unreachable',
      method: 'GET',
      timeout: 2000, // 2s 超时，避免测试过久
    }, services);

    expect(result.retryable).toBe(true);
    expect(result.status).toBeUndefined();
    // 错误应该是超时或不可达（取决于系统网络栈）
    expect(result.error).toMatch(/请求超时|目标服务器不可达/);
  });

  test('HTTP 4xx 不标记为 retryable', async () => {
    const { executeRequestPipeline } = await import('../../src/routes/proxy');
    // 使用一个返回 404 的服务器
    const notFoundApp = new Hono();
    notFoundApp.get('/not-found', (c) => c.json({ error: 'not found' }, 404));
    const notFoundServer = Bun.serve({ port: 0, fetch: notFoundApp.fetch });

    try {
      const result = await executeRequestPipeline({
        url: `http://localhost:${notFoundServer.port}/not-found`,
        method: 'GET',
      }, services);

      expect(result.status).toBe(404);
      expect(result.retryable).toBeUndefined();
      expect(result.error).toBeUndefined();
    } finally {
      notFoundServer.stop();
    }
  });

  test('前置脚本失败不标记为 retryable', async () => {
    const { executeRequestPipeline } = await import('../../src/routes/proxy');
    const result = await executeRequestPipeline({
      url: `${baseUrl}/ok`,
      method: 'GET',
      pre_request_script: 'throw new Error("脚本错误")',
    }, services);

    expect(result.error).toBeTruthy();
    expect(result.retryable).toBeUndefined();
    expect(result.status).toBeUndefined();
  });

  test('后置脚本断言失败不触发重试（即使 HTTP 5xx）', async () => {
    const { executeRequestPipeline } = await import('../../src/routes/proxy');
    // 创建一个返回 500 的服务器
    const errApp = new Hono();
    errApp.get('/err', (c) => c.json({ error: 'server error' }, 500));
    const errServer = Bun.serve({ port: 0, fetch: errApp.fetch });

    try {
      const result = await executeRequestPipeline({
        url: `http://localhost:${errServer.port}/err`,
        method: 'GET',
        post_response_script: 'pm.test("should pass", () => { throw new Error("assertion failed") });',
      }, services);

      // 后置脚本失败设置了 error，即使状态码 500 也不应标记为 retryable
      expect(result.status).toBe(500);
      expect(result.error).toBeTruthy();
      expect(result.retryable).toBeUndefined();
    } finally {
      errServer.stop();
    }
  });
});
