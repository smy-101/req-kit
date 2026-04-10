import { describe, test, expect, beforeAll } from 'bun:test';
import { Hono } from 'hono';
import { createHistoryRoutes } from '../../src/routes/history';
import { HistoryService } from '../../src/services/history';
import { Database } from '../../src/db/index';
import { errorHandler } from '../../src/lib/error-handler';

describe('History Routes Integration', () => {
  let app: Hono;
  let db: Database;

  beforeAll(() => {
    db = new Database(':memory:');
    db.migrate();
    const historyService = new HistoryService(db);
    app = new Hono();
    app.route('/', createHistoryRoutes(historyService));
    app.onError(errorHandler);
  });

  test('GET /api/history - returns empty list', async () => {
    const res = await app.request('/api/history');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toEqual([]);
    expect(data.total).toBe(0);
  });

  test('GET /api/history - returns paginated list', async () => {
    const historyService = new HistoryService(db);
    for (let i = 0; i < 5; i++) {
      historyService.create({
        method: 'GET',
        url: `https://api.example.com/${i}`,
        status: 200,
        response_time: 100,
        response_size: 50,
      });
    }

    const res = await app.request('/api/history?page=1&limit=3');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items.length).toBe(3);
    expect(data.total).toBe(5);
  });

  test('GET /api/history/:id - returns record', async () => {
    const historyService = new HistoryService(db);
    const id = historyService.create({
      method: 'POST',
      url: 'https://api.example.com/users',
      request_body: '{"name":"test"}',
      status: 201,
      response_time: 200,
      response_size: 50,
    });

    const res = await app.request(`/api/history/${id}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.method).toBe('POST');
    expect(data.request_body).toBe('{"name":"test"}');
  });

  test('GET /api/history/:id - 404 for missing', async () => {
    const res = await app.request('/api/history/99999');
    expect(res.status).toBe(404);
  });

  test('DELETE /api/history/:id - deletes record', async () => {
    const historyService = new HistoryService(db);
    const id = historyService.create({
      method: 'GET',
      url: 'https://api.example.com/temp',
      status: 200,
      response_time: 100,
      response_size: 50,
    });

    const res = await app.request(`/api/history/${id}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  test('DELETE /api/history - clears all', async () => {
    const res = await app.request('/api/history', { method: 'DELETE' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.deleted).toBeGreaterThanOrEqual(0);
  });
});
