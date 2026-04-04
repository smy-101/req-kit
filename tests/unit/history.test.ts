import { describe, test, expect, beforeEach, afterAll } from 'bun:test';
import { Database } from '../../src/db/index';
import { HistoryService } from '../../src/services/history';

describe('HistoryService', () => {
  let db: Database;
  let service: HistoryService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.migrate();
    service = new HistoryService(db);
  });

  afterAll(() => {
    db.close();
  });

  test('creates a history record', () => {
    const id = service.create({
      method: 'GET',
      url: 'https://api.example.com/users',
      status: 200,
      response_time: 150,
      response_size: 1234,
    });
    expect(id).toBeGreaterThan(0);
  });

  test('lists history with pagination', () => {
    for (let i = 0; i < 5; i++) {
      service.create({
        method: 'GET',
        url: `https://api.example.com/users?page=${i}`,
        status: 200,
        response_time: 100 + i,
        response_size: 1000 + i,
      });
    }

    const result = service.list(1, 3);
    expect(result.items.length).toBe(3);
    expect(result.total).toBe(5);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(3);
  });

  test('lists second page correctly', () => {
    for (let i = 0; i < 5; i++) {
      service.create({
        method: 'GET',
        url: `https://api.example.com/item/${i}`,
        status: 200,
        response_time: 100,
        response_size: 100,
      });
    }

    const result = service.list(2, 3);
    expect(result.items.length).toBe(2);
    expect(result.total).toBe(5);
  });

  test('returns empty list for no records', () => {
    const result = service.list();
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
  });

  test('gets history by id with full details', () => {
    const id = service.create({
      method: 'POST',
      url: 'https://api.example.com/users',
      request_headers: JSON.stringify({ 'Content-Type': 'application/json' }),
      request_body: JSON.stringify({ name: 'test' }),
      body_type: 'form-data',
      pre_request_script: 'console.log("test")',
      status: 201,
      response_headers: JSON.stringify({ 'Content-Type': 'application/json' }),
      response_body: JSON.stringify({ id: 1 }),
      response_time: 200,
      response_size: 50,
    });

    const record = service.getById(id);
    expect(record).toBeDefined();
    expect(record!.method).toBe('POST');
    expect(record!.request_body).toBe(JSON.stringify({ name: 'test' }));
    expect(record!.response_body).toBe(JSON.stringify({ id: 1 }));
    expect(record!.body_type).toBe('form-data');
    expect(record!.pre_request_script).toBe('console.log("test")');
  });

  test('returns undefined for non-existent id', () => {
    const record = service.getById(999);
    expect(record).toBeUndefined();
  });

  test('deletes a history record', () => {
    const id = service.create({
      method: 'GET',
      url: 'https://api.example.com/users',
      status: 200,
      response_time: 100,
      response_size: 50,
    });

    const deleted = service.deleteById(id);
    expect(deleted).toBe(true);
    expect(service.getById(id)).toBeUndefined();
  });

  test('returns false when deleting non-existent record', () => {
    const deleted = service.deleteById(999);
    expect(deleted).toBe(false);
  });

  test('deletes all history records', () => {
    for (let i = 0; i < 3; i++) {
      service.create({
        method: 'GET',
        url: `https://api.example.com/${i}`,
        status: 200,
        response_time: 100,
        response_size: 50,
      });
    }

    const deleted = service.deleteAll();
    expect(deleted).toBe(3);
    expect(service.list().total).toBe(0);
  });

  describe('search and method filtering', () => {
    beforeEach(() => {
      service.create({ method: 'GET', url: 'https://api.example.com/users', status: 200, response_time: 100, response_size: 50 });
      service.create({ method: 'POST', url: 'https://api.example.com/users', status: 201, response_time: 150, response_size: 80 });
      service.create({ method: 'GET', url: 'https://api.example.com/posts', status: 200, response_time: 120, response_size: 200 });
      service.create({ method: 'DELETE', url: 'https://api.example.com/users/1', status: 204, response_time: 80, response_size: 0 });
      service.create({ method: 'PUT', url: 'https://api.other.com/data', status: 200, response_time: 200, response_size: 300 });
    });

    test('filters by search keyword', () => {
      const result = service.list(1, 50, 'users');
      expect(result.total).toBe(3);
      expect(result.items.every(i => i.url!.includes('users'))).toBe(true);
    });

    test('filters by method', () => {
      const result = service.list(1, 50, undefined, 'GET');
      expect(result.total).toBe(2);
      expect(result.items.every(i => i.method === 'GET')).toBe(true);
    });

    test('combines search and method filter', () => {
      const result = service.list(1, 50, 'users', 'POST');
      expect(result.total).toBe(1);
      expect(result.items[0].method).toBe('POST');
      expect(result.items[0].url).toContain('users');
    });

    test('returns empty when no match', () => {
      const result = service.list(1, 50, 'nonexistent');
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });
  });
});
