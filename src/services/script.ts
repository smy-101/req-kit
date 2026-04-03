import { runInNewContext } from 'node:vm';

export interface ScriptContext {
  environment?: Record<string, string>;
}

export interface ScriptResult {
  success: boolean;
  headers: Record<string, string>;
  params: Record<string, string>;
  body?: string;
  logs: string[];
  error?: string;
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

    const sandbox = {
      environment: Object.freeze({ ...(context?.environment || {}) }),
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
      };
    } catch (err: any) {
      const errorMessage = err.message || String(err);
      if (errorMessage.includes('timed out') || errorMessage.includes('timeout') || errorMessage.includes('Script execution timed out')) {
        return {
          success: false,
          headers: requestHeaders,
          params: requestParams,
          logs,
          error: '预请求脚本执行超时',
        };
      }
      return {
        success: false,
        headers: requestHeaders,
        params: requestParams,
        logs,
        error: errorMessage,
      };
    }
  }
}
