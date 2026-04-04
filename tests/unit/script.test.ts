import { describe, test, expect, beforeAll } from 'bun:test';
import { ScriptService } from '../../src/services/script';

describe('ScriptService', () => {
  let service: ScriptService;

  beforeAll(() => {
    service = new ScriptService(500); // Shorter timeout for tests
  });

  test('executes setHeader in script', () => {
    const result = service.execute("request.setHeader('X-Custom', 'value123')");
    expect(result.success).toBe(true);
    expect(result.headers['X-Custom']).toBe('value123');
  });

  test('executes setBody in script', () => {
    const result = service.execute("request.setBody('{\"key\":\"value\"}')");
    expect(result.success).toBe(true);
    expect(result.body).toBe('{"key":"value"}');
  });

  test('executes setParam in script', () => {
    const result = service.execute("request.setParam('page', '2')");
    expect(result.success).toBe(true);
    expect(result.params['page']).toBe('2');
  });

  test('reads environment variables', () => {
    const result = service.execute("request.setHeader('Auth', 'Bearer ' + environment.token)", {
      environment: { token: 'my-token' },
    });
    expect(result.success).toBe(true);
    expect(result.headers['Auth']).toBe('Bearer my-token');
  });

  test('collects console.log output', () => {
    const result = service.execute("console.log('hello', 'world')");
    expect(result.success).toBe(true);
    expect(result.logs).toContain('hello world');
  });

  test('timeout on infinite loop', () => {
    const result = service.execute('while(true) {}');
    expect(result.success).toBe(false);
    expect(result.error).toContain('超时');
  });

  test('blocks require access', () => {
    const result = service.execute("const fs = require('fs')");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('blocks eval access', () => {
    const result = service.execute("eval('1+1')");
    expect(result.success).toBe(false);
  });

  test('blocks Function constructor', () => {
    const result = service.execute("new Function('return 1')()");
    expect(result.success).toBe(false);
  });

  test('blocks fetch', () => {
    const result = service.execute("fetch('http://example.com')");
    expect(result.success).toBe(false);
  });

  test('uses JSON and Date', () => {
    const result = service.execute("request.setHeader('X-Data', JSON.stringify({ ts: Date.now() }))");
    expect(result.success).toBe(true);
    const parsed = JSON.parse(result.headers['X-Data']);
    expect(parsed.ts).toBeDefined();
  });

  test('variables.get reads from allVars context', () => {
    const allVars = new Map([['myKey', 'myValue']]);
    const result = service.execute("request.setHeader('X-Var', variables.get('myKey'))", {
      allVars,
    });
    expect(result.success).toBe(true);
    expect(result.headers['X-Var']).toBe('myValue');
  });

  test('variables.get returns undefined for unknown key', () => {
    const result = service.execute("request.setHeader('X-Var', String(variables.get('unknown')))", {
      allVars: new Map(),
    });
    expect(result.success).toBe(true);
    expect(result.headers['X-Var']).toBe('undefined');
  });

  test('variables.set stores runtime variable', () => {
    const result = service.execute("variables.set('token', 'abc123')");
    expect(result.success).toBe(true);
    expect(result.variables['token']).toBe('abc123');
  });

  test('variables.set collects multiple variables', () => {
    const result = service.execute("variables.set('a', '1'); variables.set('b', '2')");
    expect(result.success).toBe(true);
    expect(result.variables['a']).toBe('1');
    expect(result.variables['b']).toBe('2');
  });

  test('ScriptResult always has variables field', () => {
    const result = service.execute("request.setHeader('X', 'val')");
    expect(result.variables).toEqual({});
  });

  test('variables object is available even without allVars context', () => {
    const result = service.execute("variables.set('k', 'v')");
    expect(result.success).toBe(true);
    expect(result.variables['k']).toBe('v');
  });
});
