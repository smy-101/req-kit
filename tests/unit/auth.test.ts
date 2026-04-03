import { describe, test, expect } from 'bun:test';
import { injectAuth } from '../../src/services/auth';

describe('Auth injection', () => {
  test('injects Bearer Token', () => {
    const result = injectAuth('bearer', { token: 'my-secret-token' }, {}, {});
    expect(result.headers['Authorization']).toBe('Bearer my-secret-token');
    expect(Object.keys(result.params).length).toBe(0);
  });

  test('injects Basic Auth', () => {
    const result = injectAuth('basic', { username: 'admin', password: 'pass123' }, {}, {});
    expect(result.headers['Authorization']).toBe(`Basic ${btoa('admin:pass123')}`);
  });

  test('injects API Key in header', () => {
    const result = injectAuth('apikey', { key: 'X-API-Key', value: 'abc123', in: 'header' }, {}, {});
    expect(result.headers['X-API-Key']).toBe('abc123');
  });

  test('injects API Key in query', () => {
    const result = injectAuth('apikey', { key: 'api_key', value: 'abc123', in: 'query' }, {}, {});
    expect(result.params['api_key']).toBe('abc123');
    expect(Object.keys(result.headers).length).toBe(0);
  });

  test('none auth type does nothing', () => {
    const result = injectAuth('none', {}, { 'Content-Type': 'application/json' }, {});
    expect(Object.keys(result.headers).length).toBe(1);
    expect(result.headers['Content-Type']).toBe('application/json');
  });

  test('null auth config does nothing', () => {
    const result = injectAuth('none', null, {}, {});
    expect(Object.keys(result.headers).length).toBe(0);
  });

  test('parses JSON string auth config', () => {
    const result = injectAuth('bearer', JSON.stringify({ token: 'tok123' }), {}, {});
    expect(result.headers['Authorization']).toBe('Bearer tok123');
  });
});
