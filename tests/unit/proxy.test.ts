import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { ProxyService, ProxyTimeoutError, ProxyUnreachableError } from '../../src/services/proxy';
import { Hono } from 'hono';

describe('ProxyService', () => {
  let service: ProxyService;
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    service = new ProxyService();

    // Create a local test server
    const testApp = new Hono();
    testApp.get('/get', (c) => c.json({ url: '/get', args: c.req.query() }));
    testApp.post('/post', async (c) => {
      const body = await c.req.text();
      return c.json({ method: 'POST', data: body, headers: Object.fromEntries(c.req.raw.headers) });
    });
    testApp.put('/put', async (c) => {
      const body = await c.req.text();
      return c.json({ method: 'PUT', data: body });
    });
    testApp.delete('/delete', (c) => c.json({ method: 'DELETE' }));
    testApp.get('/status/:code', (c) => {
      const code = parseInt(c.req.param('code'));
      return c.json({ status: code }, code as any);
    });
    testApp.get('/large', (c) => {
      const body = 'x'.repeat(1024 * 100); // 100KB
      return c.text(body);
    });

    server = Bun.serve({ port: 0, fetch: testApp.fetch });
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server?.stop();
  });

  describe('non-stream proxy', () => {
    test('forwards GET request', async () => {
      const result = await service.sendRequest({
        url: `${baseUrl}/get`,
        method: 'GET',
      });
      expect(result.status).toBe(200);
      expect(result.size).toBeGreaterThan(0);
      const body = JSON.parse(result.body);
      expect(body.url).toBe('/get');
    });

    test('forwards POST request with JSON body', async () => {
      const result = await service.sendRequest({
        url: `${baseUrl}/post`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test' }),
      });
      expect(result.status).toBe(200);
      const body = JSON.parse(result.body);
      expect(JSON.parse(body.data)).toEqual({ name: 'test' });
    });

    test('forwards PUT request', async () => {
      const result = await service.sendRequest({
        url: `${baseUrl}/put`,
        method: 'PUT',
        body: JSON.stringify({ updated: true }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result.status).toBe(200);
    });

    test('forwards DELETE request', async () => {
      const result = await service.sendRequest({
        url: `${baseUrl}/delete`,
        method: 'DELETE',
      });
      expect(result.status).toBe(200);
    });

    test('forwards query params', async () => {
      const result = await service.sendRequest({
        url: `${baseUrl}/get`,
        method: 'GET',
        params: { page: '1', limit: '10' },
      });
      expect(result.status).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.args.page).toBe('1');
      expect(body.args.limit).toBe('10');
    });

    test('passes through target error status in response body', async () => {
      const result = await service.sendRequest({
        url: `${baseUrl}/status/500`,
        method: 'GET',
      });
      expect(result.status).toBe(500);
    });
  });

  describe('error handling', () => {
    test('throws ProxyUnreachableError for connection refused', async () => {
      await expect(
        service.sendRequest({
          url: 'http://127.0.0.1:59999/unreachable',
          method: 'GET',
        })
      ).rejects.toThrow(ProxyUnreachableError);
    });
  });

  describe('stream proxy', () => {
    test('emits headers, chunk, done events', async () => {
      const events: string[] = [];
      let receivedStatus = 0;

      await service.sendRequestStream(
        {
          url: `${baseUrl}/get`,
          method: 'GET',
        },
        {
          onHeaders(status) {
            events.push('headers');
            receivedStatus = status;
          },
          onChunk(_chunk, _size) {
            events.push('chunk');
          },
          onDone(_totalTime, _totalSize, _truncated) {
            events.push('done');
          },
          onError(error) {
            events.push('error:' + error);
          },
        }
      );

      expect(receivedStatus).toBe(200);
      expect(events[0]).toBe('headers');
      expect(events).toContain('chunk');
      expect(events[events.length - 1]).toBe('done');
    });
  });
});
