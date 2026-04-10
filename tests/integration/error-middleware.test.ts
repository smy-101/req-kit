import { describe, test, expect, beforeAll } from 'bun:test';
import { Hono } from 'hono';
import { createCollectionRoutes } from '../../src/routes/collections';
import { CollectionService } from '../../src/services/collection';
import { Database } from '../../src/db/index';
import { errorHandler } from '../../src/lib/error-handler';

describe('Global Error Middleware', () => {
  let app: Hono;

  beforeAll(() => {
    const db = new Database(':memory:');
    db.migrate();
    const collectionService = new CollectionService(db);
    app = new Hono();
    app.route('/', createCollectionRoutes(collectionService));

    // 注册全局错误处理（与 src/index.ts 一致）
    app.onError(errorHandler);
  });

  test('ValidationError returns 400 with error and details', async () => {
    const res = await app.request('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),  // 缺少 name
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('请求参数无效');
    expect(Array.isArray(data.details)).toBe(true);
    expect(data.details.length).toBeGreaterThan(0);
  });

  test('malformed JSON returns 400 with error and details', async () => {
    const res = await app.request('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json at all',
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('请求参数无效');
    expect(Array.isArray(data.details)).toBe(true);
  });

  test('non-numeric URL param returns 400 with error and details', async () => {
    const res = await app.request('/api/collections/abc', {
      method: 'DELETE',
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('请求参数无效');
    expect(data.details[0]).toContain('id');
  });

  test('valid request returns expected status', async () => {
    const res = await app.request('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '测试集合' }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('测试集合');
  });

  test('unexpected exception returns 500', async () => {
    // 抑制 error handler 的 console.error 输出，避免 Bun test runner 显示 [Unhandled] 噪音
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
      const testApp = new Hono();
      testApp.get('/api/error', async (c) => {
        return errorHandler(new Error('unexpected'), c);
      });

      const res = await testApp.request('/api/error');
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('服务器内部错误');
      expect(data.details).toBeUndefined();
    } finally {
      console.error = originalConsoleError;
    }
  });
});
