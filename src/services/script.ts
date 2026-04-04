import { runInNewContext } from 'node:vm';

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

  execute(script: string, context?: ScriptContext): ScriptResult {
    const logs: string[] = [];
    const requestHeaders: Record<string, string> = {};
    const requestParams: Record<string, string> = {};
    let requestBody: string | undefined;
    const scriptVars: Record<string, string> = {};

    const sandbox = {
      environment: Object.freeze({ ...(context?.environment || {}) }),
      variables: {
        get(key: string): string | undefined {
          return context?.allVars?.get(key);
        },
        set(key: string, value: string) {
          scriptVars[key] = value;
        },
      },
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
      console: {
        log: (...args: any[]) => {
          logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
        },
      },
      JSON,
      Date,
      Math,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      // Explicitly block dangerous APIs
      require: undefined,
      import: undefined,
      process: undefined,
      globalThis: undefined,
      eval: undefined,
      Function: undefined,
      fetch: undefined,
      XMLHttpRequest: undefined,
    };

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
    } catch (err: any) {
      const errorMessage = err.message || String(err);
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

    const sandbox = {
      environment: Object.freeze({ ...(context.environment || {}) }),
      variables: {
        get(key: string): string | undefined {
          return context.allVars?.get(key);
        },
        set(key: string, value: string) {
          scriptVars[key] = value;
        },
      },
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
      console: {
        log: (...args: any[]) => {
          logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
        },
      },
      JSON,
      Date,
      Math,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      require: undefined,
      import: undefined,
      process: undefined,
      globalThis: undefined,
      eval: undefined,
      Function: undefined,
      fetch: undefined,
      XMLHttpRequest: undefined,
    };

    try {
      runInNewContext(script, sandbox, { timeout: this.timeout });
      return {
        success: true,
        tests,
        logs,
        variables: scriptVars,
      };
    } catch (err: any) {
      const errorMessage = err.message || String(err);
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
