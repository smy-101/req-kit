import { CollectionService, type SavedRequest, type Collection } from './collection';
import { VariableService } from './variable';
import { HistoryService } from './history';
import { ScriptService } from './script';
import { ProxyService } from './proxy';
import { CookieService } from './cookie';
import { executeRequestPipeline, type PipelineInput, type PipelineResult, type PipelineServices } from '../routes/proxy';

export interface RunnerRequestItem {
  id: number;
  name: string;
  method: string;
  url: string;
  headers?: string;
  params?: string;
  body?: string;
  body_type?: string;
  auth_type?: string;
  auth_config?: string;
  pre_request_script?: string;
  post_response_script?: string;
  collection_id?: number;
}

export interface RetryEvent {
  index: number;
  attempt: number;
  maxRetries: number;
  reason: string;
}

export interface RunnerCallbacks {
  onStart: (totalRequests: number) => void;
  onRequestStart: (index: number, name: string, method: string, url: string) => void;
  onRequestRetry: (data: RetryEvent) => void;
  onRequestComplete: (data: {
    index: number;
    name: string;
    method: string;
    url: string;
    status?: number;
    time?: number;
    size?: number;
    tests?: Record<string, boolean>;
    scriptLogs?: string[];
    postScriptLogs?: string[];
    error?: string;
    retryCount: number;
  }) => void;
  onDone: (data: { passed: number; failed: number; total: number; totalTime: number; stopped?: boolean }) => void;
}

export class RunnerService {
  private collectionService: CollectionService;
  private services: PipelineServices;

  constructor(
    collectionService: CollectionService,
    variableService: VariableService,
    historyService: HistoryService,
    scriptService: ScriptService,
    proxyService: ProxyService,
    cookieService: CookieService
  ) {
    this.collectionService = collectionService;
    this.services = { proxyService, historyService, variableService, scriptService, cookieService };
  }

  /**
   * 递归收集集合树中所有请求（DFS 顺序，依赖 getTree() 已按 sort_order 排序）
   */
  collectRequests(tree: Collection[]): RunnerRequestItem[] {
    const result: RunnerRequestItem[] = [];

    function dfs(node: Collection) {
      // 先深度遍历子集合
      if (node.children) {
        for (const child of node.children) {
          dfs(child);
        }
      }
      // 再收集当前集合的请求
      if (node.requests) {
        for (const req of node.requests) {
          result.push({
            id: req.id!,
            name: req.name,
            method: req.method || 'GET',
            url: req.url || '',
            headers: req.headers || undefined,
            params: req.params || undefined,
            body: req.body || undefined,
            body_type: req.body_type || 'json',
            auth_type: req.auth_type || 'none',
            auth_config: req.auth_config || undefined,
            pre_request_script: req.pre_request_script || undefined,
            post_response_script: req.post_response_script || undefined,
            collection_id: req.collection_id,
          });
        }
      }
    }

    for (const node of tree) {
      dfs(node);
    }

    return result;
  }

  /**
   * 运行集合，按顺序执行每个请求，通过回调推送事件
   */
  async run(
    collectionId: number,
    environmentId: number | undefined,
    callbacks: RunnerCallbacks,
    signal?: AbortSignal,
    retryCount: number = 0,
    retryDelayMs: number = 1000
  ): Promise<void> {
    // 获取完整集合树，找到目标集合
    const tree = this.collectionService.getTree();
    const targetCollection = this.findCollection(tree, collectionId);
    if (!targetCollection) {
      callbacks.onStart(0);
      callbacks.onDone({ passed: 0, failed: 0, total: 0, totalTime: 0 });
      return;
    }

    // 收集请求
    const requests = this.collectRequests([targetCollection]);

    callbacks.onStart(requests.length);

    if (requests.length === 0) {
      callbacks.onDone({ passed: 0, failed: 0, total: 0, totalTime: 0 });
      return;
    }

    let passed = 0;
    let failed = 0;
    const totalStart = Date.now();
    let runtimeVars: Record<string, string> = {};

    for (let i = 0; i < requests.length; i++) {
      // 检查是否已中止
      if (signal?.aborted) {
        callbacks.onDone({ passed, failed, total: requests.length, totalTime: Date.now() - totalStart, stopped: true });
        return;
      }

      const req = requests[i];

      // 解析请求参数
      let headers: Record<string, string> = {};
      if (req.headers) {
        try { headers = JSON.parse(req.headers); } catch {}
      }
      let params: Record<string, string> = {};
      if (req.params) {
        try { params = JSON.parse(req.params); } catch {}
      }

      let authConfig: any;
      if (req.auth_config) {
        try { authConfig = JSON.parse(req.auth_config); } catch {}
      }

      callbacks.onRequestStart(i, req.name, req.method, req.url);

      const input: PipelineInput = {
        url: req.url,
        method: req.method,
        headers,
        params,
        body: req.body || undefined,
        body_type: req.body_type,
        auth_type: req.auth_type,
        auth_config: authConfig,
        pre_request_script: req.pre_request_script,
        post_response_script: req.post_response_script,
        runtime_vars: runtimeVars,
        collection_id: req.collection_id,
        environment_id: environmentId,
      };

      // 执行请求（含重试逻辑）
      let result = await executeRequestPipeline(input, this.services);
      let actualRetryCount = 0;

      // 判断是否应该重试：网络错误（retryable 标记）或 HTTP 5xx
      // 脚本错误（前置/后置脚本异常）和 HTTP 4xx 不重试
      const shouldRetry = (r: PipelineResult): boolean => {
        if (r.retryable) return true;
        // !r.error 确保仅对纯 HTTP 5xx 响应重试；
        // 如果 error 已设置（如后置脚本断言失败），即使状态码为 5xx 也不重试，
        // 避免在脚本层错误上无意义地重复请求。
        if (!r.error && r.status && r.status >= 500) return true;
        return false;
      };

      while (actualRetryCount < retryCount && shouldRetry(result)) {
        actualRetryCount++;
        callbacks.onRequestRetry({
          index: i,
          attempt: actualRetryCount,
          maxRetries: retryCount,
          reason: result.error || `HTTP ${result.status}`,
        });
        // 等待重试间隔
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        // 检查是否已中止
        if (signal?.aborted) break;
        result = await executeRequestPipeline(input, this.services);
      }

      // 累积运行时变量
      if (result.scriptVariables) {
        runtimeVars = { ...runtimeVars, ...result.scriptVariables };
      }
      if (result.postScriptVariables) {
        runtimeVars = { ...runtimeVars, ...result.postScriptVariables };
      }

      // 统计通过/失败
      if (result.error) {
        failed++;
      } else {
        // 检查测试结果
        const tests = result.scriptTests;
        const hasFailedTest = tests && Object.values(tests).some(v => !v);
        if (hasFailedTest) {
          failed++;
        } else {
          passed++;
        }
      }

      callbacks.onRequestComplete({
        index: i,
        name: req.name,
        method: req.method,
        url: req.url,
        status: result.status,
        time: result.time,
        size: result.size,
        tests: result.scriptTests,
        scriptLogs: result.scriptLogs,
        postScriptLogs: result.postScriptLogs,
        error: result.error,
        retryCount: actualRetryCount,
      });
    }

    callbacks.onDone({ passed, failed, total: requests.length, totalTime: Date.now() - totalStart });
  }

  /**
   * 在集合树中查找指定 ID 的集合
   */
  private findCollection(tree: Collection[], id: number): Collection | null {
    for (const node of tree) {
      if (node.id === id) return node;
      if (node.children) {
        const found = this.findCollection(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }
}
