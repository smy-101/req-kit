import { runInNewContext } from 'node:vm';
import { getErrorMessage } from '../lib/validation';

export interface ScriptContext {
  environment?: Record<string, string>;
  allVars?: Map<string, string>;
}

export interface ScriptResult {
  success: boolean;
  headers: Record<string, string>;
  params: Record<string, string>;
  body?: string;
  logs: string[];
  error?: string;
  variables: Record<string, string>;
}

export interface PostScriptContext {
  environment?: Record<string, string>;
  allVars?: Map<string, string>;
  response: {
    status: number;
    headers: Record<string, string>;
    body: string;
    time: number;
    size: number;
  };
}

export interface PostScriptResult {
  success: boolean;
  tests: Record<string, boolean>;
  logs: string[];
  variables: Record<string, string>;
  error?: string;
}

function isTimeoutError(message: string): boolean {
  return message.includes('timed out') || message.includes('timeout');
}

const SCRIPT_TIMEOUT = 5000; // 5 seconds

export class ScriptService {
  private timeout: number;

  constructor(timeout: number = SCRIPT_TIMEOUT) {
    this.timeout = timeout;
  }

  private createBaseSandbox(
    logs: string[],
    scriptVars: Record<string, string>,
    context?: ScriptContext | PostScriptContext
  ) {
    return {
      environment: Object.freeze({ ...(context?.environment || {}) }),
      variables: {
        get(key: string): string | undefined {
          return context?.allVars?.get(key);
        },
        set(key: string, value: string) {
          scriptVars[key] = value;
        },
      },
      console: {
        log: (...args: any[]) => {
          logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
        },
      },
      // Safe globals
      JSON,
      Date,
      Math,
      String,
      Number,
      Boolean,
      Array,
      Object,
      RegExp,
      Map,
      Set,
      Symbol,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      undefined,
      NaN,
      Infinity,
      // Explicitly block dangerous APIs
      require: undefined,
      import: undefined,
      process: undefined,
      globalThis: undefined,
      eval: undefined,
      Function: undefined,
      fetch: undefined,
      XMLHttpRequest: undefined,
      // Block sandbox escape vectors
      Proxy: undefined,
      Reflect: undefined,
      WeakRef: undefined,
      FinalizationRegistry: undefined,
      SharedArrayBuffer: undefined,
      Atomics: undefined,
      WebAssembly: undefined,
      queueMicrotask: undefined,
      structuredClone: undefined,
      setTimeout: undefined,
      setInterval: undefined,
      clearTimeout: undefined,
      clearInterval: undefined,
    };
  }

  /**
   * 创建安全沙箱：用 Proxy 包装白名单，阻止原型链逃逸和未授权属性访问
   */
  private createSecureSandbox(
    logs: string[],
    scriptVars: Record<string, string>,
    context?: ScriptContext | PostScriptContext,
    extraBindings?: Record<string, unknown>
  ): Record<string, unknown> {
    const baseSandbox = this.createBaseSandbox(logs, scriptVars, context);
    const merged: Record<string, unknown> = { ...baseSandbox, ...extraBindings };

    // 从 sandbox 对象的 keys 动态构建白名单
    const allowed = new Set(Object.keys(merged));

    return new Proxy(merged, {
      has(_target, prop) {
        if (typeof prop === 'symbol') return false;
        return allowed.has(prop);
      },
      get(target, prop) {
        if (typeof prop === 'symbol') return undefined;
        // 阻止原型链逃逸
        if (prop === 'constructor' || prop === '__proto__' || prop === 'prototype') return undefined;
        if (!allowed.has(prop)) return undefined;
        return (target as Record<string, unknown>)[prop];
      },
      set(_target, prop) {
        // 允许通过 tests["name"] = value、variables.set() 等操作写入
        return true;
      },
    });
  }

  execute(script: string, context?: ScriptContext): ScriptResult {
    const logs: string[] = [];
    const requestHeaders: Record<string, string> = {};
    const requestParams: Record<string, string> = {};
    let requestBody: string | undefined;
    const scriptVars: Record<string, string> = {};

    const sandbox = this.createSecureSandbox(logs, scriptVars, context, {
      request: {
        setHeader(key: string, value: string) {
          requestHeaders[key] = value;
        },
        setBody(data: string) {
          requestBody = data;
        },
        setParam(key: string, value: string) {
          requestParams[key] = value;
        },
      },
    });

    try {
      runInNewContext(script, sandbox, { timeout: this.timeout });
      return {
        success: true,
        headers: requestHeaders,
        params: requestParams,
        body: requestBody,
        logs,
        variables: scriptVars,
      };
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      if (isTimeoutError(errorMessage)) {
        return {
          success: false,
          headers: requestHeaders,
          params: requestParams,
          logs,
          error: '预请求脚本执行超时',
          variables: scriptVars,
        };
      }
      return {
        success: false,
        headers: requestHeaders,
        params: requestParams,
        logs,
        error: errorMessage,
        variables: scriptVars,
      };
    }
  }

  executePostScript(script: string, context: PostScriptContext): PostScriptResult {
    const logs: string[] = [];
    const scriptVars: Record<string, string> = {};
    const tests: Record<string, boolean> = {};

    const testsProxy = new Proxy(tests, {
      set(target, prop: string, value: boolean) {
        target[prop] = !!value;
        return true;
      },
    });

    const sandbox = this.createSecureSandbox(logs, scriptVars, context, {
      response: {
        status: context.response.status,
        headers: Object.freeze({ ...context.response.headers }),
        body: context.response.body,
        json() {
          return JSON.parse(context.response.body);
        },
        time: context.response.time,
        size: context.response.size,
      },
      tests: testsProxy,
    });

    try {
      runInNewContext(script, sandbox, { timeout: this.timeout });
      return {
        success: true,
        tests,
        logs,
        variables: scriptVars,
      };
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      if (isTimeoutError(errorMessage)) {
        return {
          success: false,
          tests,
          logs,
          error: '后置脚本执行超时',
          variables: scriptVars,
        };
      }
      return {
        success: false,
        tests,
        logs,
        error: errorMessage,
        variables: scriptVars,
      };
    }
  }
}
