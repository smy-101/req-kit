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

  // --- Post-script tests ---

  test('executePostScript - basic assertion', () => {
    const result = service.executePostScript('tests["状态码是 200"] = response.status === 200', {
      response: { status: 200, headers: {}, body: '', time: 100, size: 0 },
    });
    expect(result.success).toBe(true);
    expect(result.tests['状态码是 200']).toBe(true);
  });

  test('executePostScript - assertion failure', () => {
    const result = service.executePostScript('tests["is 404"] = response.status === 404', {
      response: { status: 200, headers: {}, body: '', time: 100, size: 0 },
    });
    expect(result.success).toBe(true);
    expect(result.tests['is 404']).toBe(false);
  });

  test('executePostScript - multiple assertions', () => {
    const result = service.executePostScript(
      'tests["a"] = true; tests["b"] = false; tests["c"] = 1 === 1',
      { response: { status: 200, headers: {}, body: '', time: 100, size: 0 } }
    );
    expect(result.success).toBe(true);
    expect(Object.keys(result.tests).length).toBe(3);
    expect(result.tests['a']).toBe(true);
    expect(result.tests['b']).toBe(false);
    expect(result.tests['c']).toBe(true);
  });

  test('executePostScript - response.json() parses body', () => {
    const result = service.executePostScript(
      'tests["有ID"] = response.json().id !== undefined',
      { response: { status: 200, headers: {}, body: '{"id":42}', time: 100, size: 5 } }
    );
    expect(result.success).toBe(true);
    expect(result.tests['有ID']).toBe(true);
  });

  test('executePostScript - response fields accessible', () => {
    const result = service.executePostScript(
      'tests["time"] = response.time === 150; tests["size"] = response.size === 100',
      { response: { status: 200, headers: { 'x-test': 'val' }, body: 'ok', time: 150, size: 100 } }
    );
    expect(result.success).toBe(true);
    expect(result.tests['time']).toBe(true);
    expect(result.tests['size']).toBe(true);
  });

  test('executePostScript - variables.set extracts variables', () => {
    const result = service.executePostScript(
      'variables.set("token", response.json().access_token)',
      { response: { status: 200, headers: {}, body: '{"access_token":"abc123"}', time: 100, size: 0 } }
    );
    expect(result.success).toBe(true);
    expect(result.variables['token']).toBe('abc123');
  });

  test('executePostScript - console.log output', () => {
    const result = service.executePostScript(
      'console.log("Status:", response.status)',
      { response: { status: 200, headers: {}, body: '', time: 100, size: 0 } }
    );
    expect(result.success).toBe(true);
    expect(result.logs).toContain('Status: 200');
  });

  test('executePostScript - timeout on infinite loop', () => {
    const result = service.executePostScript('while(true) {}', {
      response: { status: 200, headers: {}, body: '', time: 100, size: 0 },
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('超时');
  });

  test('executePostScript - blocks require', () => {
    const result = service.executePostScript("const fs = require('fs')", {
      response: { status: 200, headers: {}, body: '', time: 100, size: 0 },
    });
    expect(result.success).toBe(false);
  });

  test('executePostScript - environment read-only access', () => {
    const result = service.executePostScript(
      'tests["has token"] = environment.token === "my-token"',
      {
        environment: { token: 'my-token' },
        response: { status: 200, headers: {}, body: '', time: 100, size: 0 },
      }
    );
    expect(result.success).toBe(true);
    expect(result.tests['has token']).toBe(true);
  });

  test('executePostScript - response.headers accessible', () => {
    const result = service.executePostScript(
      'tests["has header"] = response.headers["content-type"] === "application/json"',
      {
        response: { status: 200, headers: { 'content-type': 'application/json' }, body: '{}', time: 100, size: 2 },
      }
    );
    expect(result.success).toBe(true);
    expect(result.tests['has header']).toBe(true);
  });

  test('executePostScript - response.json() on non-JSON body fails', () => {
    const result = service.executePostScript(
      'response.json()',
      { response: { status: 200, headers: {}, body: 'not-json', time: 100, size: 8 } }
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
