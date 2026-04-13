export interface ProxyRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: string | FormData | Buffer;
  stream?: boolean;
  timeout?: number;
  follow_redirects?: boolean;
}

import { getErrorMessage } from '../lib/validation';

export interface ProxyResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
  truncated?: boolean;
}

export interface ProxyStreamCallbacks {
  onHeaders: (status: number, headers: Record<string, string>) => void;
  onChunk: (chunk: string, size: number) => void;
  onDone: (totalTime: number, totalSize: number, truncated: boolean) => void;
  onError: (error: string, detail?: string) => void;
}

const MAX_RESPONSE_SIZE = parseInt(process.env.MAX_RESPONSE_SIZE || String(50 * 1024 * 1024), 10);
const REQUEST_TIMEOUT = 30_000; // 30 seconds

export class ProxyService {
  async sendRequest(req: ProxyRequest): Promise<ProxyResponse> {
    const url = this.buildUrl(req.url, req.params);
    const startTime = Date.now();
    const { controller, timeout, fetchOptions } = this.prepareFetch(req);

    try {
      const response = await fetch(url, fetchOptions);

      clearTimeout(timeout);

      // Bun returns synthetic 502 for connection failures
      if (this.isBunConnectionError(response)) {
        throw new ProxyUnreachableError('连接被拒绝');
      }

      const headers = this.extractHeaders(response.headers);
      const arrayBuf = await response.arrayBuffer();
      const body = new TextDecoder().decode(arrayBuf);
      const time = Date.now() - startTime;

      let truncated = false;
      let finalBody = body;
      if (body.length > MAX_RESPONSE_SIZE) {
        finalBody = body.slice(0, MAX_RESPONSE_SIZE);
        truncated = true;
      }

      return {
        status: response.status,
        headers,
        body: finalBody,
        time,
        size: new TextEncoder().encode(finalBody).length,
        truncated,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ProxyTimeoutError();
      }
      throw new ProxyUnreachableError(getErrorMessage(err));
    }
  }

  async sendRequestStream(req: ProxyRequest, callbacks: ProxyStreamCallbacks): Promise<void> {
    const url = this.buildUrl(req.url, req.params);
    const startTime = Date.now();
    const { controller, timeout, fetchOptions } = this.prepareFetch(req);

    try {
      const response = await fetch(url, fetchOptions);

      clearTimeout(timeout);

      // Bun returns synthetic 502 for connection failures
      if (this.isBunConnectionError(response)) {
        throw new ProxyUnreachableError('连接被拒绝');
      }

      const headers = this.extractHeaders(response.headers);
      callbacks.onHeaders(response.status, headers);

      if (!response.body) {
        callbacks.onDone(Date.now() - startTime, 0, false);
        return;
      }

      const reader = response.body.getReader();
      let totalSize = 0;
      let truncated = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalSize += value.length;
        const chunk = Buffer.from(value).toString('base64');

        if (totalSize > MAX_RESPONSE_SIZE) {
          truncated = true;
          callbacks.onChunk(chunk, value.length);
          break;
        }

        callbacks.onChunk(chunk, value.length);
      }

      callbacks.onDone(Date.now() - startTime, totalSize, truncated);
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ProxyTimeoutError();
      }
      throw new ProxyUnreachableError(getErrorMessage(err));
    }
  }

  private prepareFetch(req: ProxyRequest): { controller: AbortController; timeout: ReturnType<typeof setTimeout>; fetchOptions: RequestInit } {
    const controller = new AbortController();
    const timeoutMs = req.timeout ?? REQUEST_TIMEOUT;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const fetchOptions: RequestInit = {
      method: req.method,
      headers: req.headers || {},
      body: this.hasBody(req.method) ? req.body : undefined,
      signal: controller.signal,
    };
    if (req.follow_redirects === false) {
      fetchOptions.redirect = 'manual';
    }

    return { controller, timeout, fetchOptions };
  }

  private buildUrl(baseUrl: string, params?: Record<string, string>): string {
    if (!params || Object.keys(params).length === 0) return baseUrl;
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private extractHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === 'set-cookie') {
        // 多个 Set-Cookie 用换行拼接，后续可按 \n 拆分
        result[key] = result[key] ? result[key] + '\n' + value : value;
      } else {
        result[key] = value;
      }
    });
    return result;
  }

  private hasBody(method: string): boolean {
    return !['GET', 'HEAD'].includes(method.toUpperCase());
  }

  private isBunConnectionError(response: Response): boolean {
    return (
      response.status === 502 &&
      response.headers.get('proxy-connection') !== null &&
      response.headers.get('content-length') === '0'
    );
  }
}

export class ProxyTimeoutError extends Error {
  constructor() {
    super('请求超时');
    this.name = 'ProxyTimeoutError';
  }
}

export class ProxyUnreachableError extends Error {
  detail: string;
  constructor(detail: string) {
    super('目标服务器不可达');
    this.name = 'ProxyUnreachableError';
    this.detail = detail;
  }
}
