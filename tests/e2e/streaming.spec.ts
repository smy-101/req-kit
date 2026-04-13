import { test, expect } from './fixtures';
import { MOCK_BASE_URL } from './helpers/mock';

/**
 * SSE 流式代理测试
 *
 * 测试 POST /api/proxy 的 stream:true 路径。
 * 前端目前没有 UI 触发流式请求，但后端管线已完整实现。
 * 这些测试通过浏览器内 fetch 直接调用流式代理端点，
 * 验证 SSE 事件（headers, chunk, done, error）的正确性。
 */
test.describe('SSE 流式代理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('流式代理返回 headers 事件包含正确的状态码和响应头', async ({ page }) => {
    const result = await page.evaluate(async (mockUrl) => {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${mockUrl}/stream?count=3`,
          method: 'GET',
          stream: true,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const events: { event: string; data: any }[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) currentEvent = line.slice(7).trim();
          else if (line.startsWith('data: ')) {
            events.push({ event: currentEvent, data: JSON.parse(line.slice(6)) });
          }
        }
      }

      return { status: res.status, contentType: res.headers.get('content-type'), events };
    }, MOCK_BASE_URL);

    expect(result.status).toBe(200);
    expect(result.contentType).toContain('text/event-stream');

    // 第一个事件应为 headers
    const headersEvent = result.events.find(e => e.event === 'headers');
    expect(headersEvent).toBeDefined();
    expect(headersEvent!.data.status).toBe(200);
    expect(typeof headersEvent!.data.headers).toBe('object');
  });

  test('流式代理返回 chunk 事件包含 base64 编码数据', async ({ page }) => {
    const result = await page.evaluate(async (mockUrl) => {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${mockUrl}/stream?count=3`,
          method: 'GET',
          stream: true,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const chunks: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) currentEvent = line.slice(7).trim();
          else if (line.startsWith('data: ')) {
            if (currentEvent === 'chunk') {
              chunks.push(JSON.parse(line.slice(6)));
            }
          }
        }
      }

      return chunks;
    }, MOCK_BASE_URL);

    // 应收到 chunk 事件，每个包含 base64 编码的数据和大小
    expect(result.length).toBeGreaterThan(0);
    for (const chunk of result) {
      expect(typeof chunk.chunk).toBe('string');
      expect(typeof chunk.size).toBe('number');
      expect(chunk.size).toBeGreaterThan(0);
      // 验证是有效的 base64
      expect(() => atob(chunk.chunk)).not.toThrow();
    }
  });

  test('流式代理返回 done 事件包含时间和大小信息', async ({ page }) => {
    const result = await page.evaluate(async (mockUrl) => {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${mockUrl}/stream?count=5`,
          method: 'GET',
          stream: true,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let doneEvent: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) currentEvent = line.slice(7).trim();
          else if (line.startsWith('data: ')) {
            if (currentEvent === 'done') {
              doneEvent = JSON.parse(line.slice(6));
            }
          }
        }
      }

      return doneEvent;
    }, MOCK_BASE_URL);

    expect(result).not.toBeNull();
    expect(typeof result.totalTime).toBe('number');
    expect(result.totalTime).toBeGreaterThanOrEqual(0);
    expect(typeof result.totalSize).toBe('number');
    expect(result.totalSize).toBeGreaterThan(0);
    expect(typeof result.truncated).toBe('boolean');
    expect(result.truncated).toBe(false);
  });

  test('流式代理对不可达目标返回 error 事件', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'http://192.0.2.1/unreachable',
          method: 'GET',
          stream: true,
          timeout: 3000,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const events: { event: string; data: any }[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) currentEvent = line.slice(7).trim();
          else if (line.startsWith('data: ')) {
            events.push({ event: currentEvent, data: JSON.parse(line.slice(6)) });
          }
        }
      }

      return { status: res.status, events };
    });

    expect(result.status).toBe(200);
    const errorEvent = result.events.find(e => e.event === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.data.error).toBeDefined();
    expect(typeof errorEvent!.data.error).toBe('string');
  });

  test('流式代理完成时记录历史条目', async ({ page }) => {
    // 先清空历史
    await page.evaluate(async () => {
      await fetch('/api/history', { method: 'DELETE' });
    });

    // 通过流式代理发送请求
    await page.evaluate(async (mockUrl) => {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `${mockUrl}/stream?count=2`,
          method: 'GET',
          stream: true,
        }),
      });
      const reader = res.body!.getReader();
      // 消费完整个流
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
      }
    }, MOCK_BASE_URL);

    // 验证历史中存在该请求
    const history = await page.evaluate(async () => {
      const res = await fetch('/api/history');
      return res.json();
    });

    expect(history.items.length).toBeGreaterThan(0);
    const item = history.items.find((h: any) => h.url.includes('/stream'));
    expect(item).toBeDefined();
    expect(item.method).toBe('GET');
    expect(item.status).toBe(200);
    // 流式请求的 response_body 应为 null 或 undefined（未存储）
    expect(item.response_body == null).toBe(true);
  });

  test('流式代理支持变量模板替换', async ({ page }) => {
    // 创建环境并添加变量
    const envResult = await page.evaluate(async () => {
      const envRes = await fetch('/api/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'stream-test-env' }),
      });
      return envRes.json();
    });
    const envId = envResult.id;

    await page.evaluate(async ({ envId }) => {
      await fetch(`/api/environments/${envId}/variables`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ key: 'STREAM_HOST', value: 'localhost:4000' }]),
      });
    }, { envId });

    // 使用变量发送流式请求
    const result = await page.evaluate(async ({ envId, mockUrl }) => {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `http://{{STREAM_HOST}}/stream?count=1`,
          method: 'GET',
          stream: true,
          environment_id: envId,
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let doneEvent: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) currentEvent = line.slice(7).trim();
          else if (line.startsWith('data: ')) {
            if (currentEvent === 'done') {
              doneEvent = JSON.parse(line.slice(6));
            }
          }
        }
      }

      return doneEvent;
    }, { envId, mockUrl: MOCK_BASE_URL });

    // 变量应被正确替换，请求成功完成
    expect(result).not.toBeNull();
    expect(result.totalSize).toBeGreaterThan(0);

    // 清理环境
    await page.evaluate(async ({ envId }) => {
      await fetch(`/api/environments/${envId}`, { method: 'DELETE' });
    }, { envId });
  });
});
