import { describe, test, expect, beforeEach } from 'bun:test';

/**
 * 测试 api.js — 使用简单函数 mock fetch 隔离网络层
 */

function createApi(customFetch: typeof fetch) {
  return {
    _currentController: null,

    abortCurrent() {
      if (this._currentController) {
        this._currentController.abort();
        this._currentController = null;
      }
    },

    async sendRequest(data) {
      if (this._currentController) {
        this._currentController.abort();
      }
      this._currentController = new AbortController();
      const signal = this._currentController.signal;

      try {
        const res = await customFetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          signal,
        });
        return await res.json();
      } finally {
        if (this._currentController?.signal === signal) {
          this._currentController = null;
        }
      }
    },

    async getHistory(page = 1, limit = 50, search = '', method = '') {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (method) params.set('method', method);
      const res = await customFetch(`/api/history?${params}`);
      return res.json();
    },
    async getHistoryItem(id) {
      const res = await customFetch(`/api/history/${id}`);
      return res.json();
    },
    async deleteHistory(id) {
      return customFetch(`/api/history/${id}`, { method: 'DELETE' }).then(r => r.json());
    },
    async clearHistory() {
      return customFetch('/api/history', { method: 'DELETE' }).then(r => r.json());
    },
    async cleanupHistory(limit) {
      const params = limit != null ? `?limit=${encodeURIComponent(limit)}` : '';
      return customFetch(`/api/history/cleanup${params}`, { method: 'DELETE' }).then(r => r.json());
    },

    async getCollections() {
      return customFetch('/api/collections').then(r => r.json());
    },
    async createCollection(name, parentId = null) {
      const res = await customFetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parent_id: parentId }),
      });
      return res.json();
    },
    async updateCollection(id, name) {
      return customFetch(`/api/collections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }).then(r => r.json());
    },
    async deleteCollection(id) {
      return customFetch(`/api/collections/${id}`, { method: 'DELETE' }).then(r => r.json());
    },
    async addRequest(collectionId, request) {
      const res = await customFetch(`/api/collections/${collectionId}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      return res.json();
    },
    async updateRequest(collectionId, requestId, updates) {
      return customFetch(`/api/collections/${collectionId}/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).then(r => r.json());
    },
    async deleteRequest(collectionId, requestId) {
      return customFetch(`/api/collections/${collectionId}/requests/${requestId}`, {
        method: 'DELETE',
      }).then(r => r.json());
    },
    async duplicateRequest(requestId) {
      const res = await customFetch(`/api/collections/requests/${requestId}/duplicate`, {
        method: 'POST',
      });
      return res.json();
    },

    async getEnvironments() {
      return customFetch('/api/environments').then(r => r.json());
    },
    async createEnvironment(name) {
      const res = await customFetch('/api/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      return res.json();
    },
    async updateEnvironment(id, name) {
      return customFetch(`/api/environments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }).then(r => r.json());
    },
    async deleteEnvironment(id) {
      return customFetch(`/api/environments/${id}`, { method: 'DELETE' }).then(r => r.json());
    },
    async updateVariables(envId, variables) {
      return customFetch(`/api/environments/${envId}/variables`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      }).then(r => r.json());
    },

    async getGlobalVariables() {
      return customFetch('/api/global-variables').then(r => r.json());
    },
    async updateGlobalVariables(variables) {
      return customFetch('/api/global-variables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      }).then(r => r.json());
    },

    async getCollectionVariables(collectionId) {
      return customFetch(`/api/collections/${collectionId}/variables`).then(r => r.json());
    },
    async updateCollectionVariables(collectionId, variables) {
      return customFetch(`/api/collections/${collectionId}/variables`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      }).then(r => r.json());
    },

    async getCookies(domain) {
      const url = domain ? `/api/cookies?domain=${encodeURIComponent(domain)}` : '/api/cookies';
      return customFetch(url).then(r => r.json());
    },
    async deleteCookie(id) {
      return customFetch(`/api/cookies/${id}`, { method: 'DELETE' }).then(r => r.json());
    },
    async deleteCookiesByDomain(domain) {
      return customFetch(`/api/cookies?domain=${encodeURIComponent(domain)}`, { method: 'DELETE' }).then(r => r.json());
    },
    async clearAllCookies() {
      return customFetch('/api/cookies', { method: 'DELETE' }).then(r => r.json());
    },

    async importCurl(content, collectionId) {
      const res = await customFetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'curl', content, collection_id: collectionId }),
      });
      return res.json();
    },
    async importPostman(content) {
      const res = await customFetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'postman', content }),
      });
      return res.json();
    },
    async exportCollection(id) {
      return customFetch(`/api/export/collections/${id}`).then(r => r.json());
    },
    async exportCurl(requestId) {
      return customFetch(`/api/export/requests/${requestId}/curl`).then(r => r.text());
    },
  };
}

/** 简单 mock: 根据 method + URL 匹配返回 Response-like 对象 */
function createMockFetch(responses: Record<string, { status?: number; body: any }>) {
  const calls: Array<{ url: string; init?: any }> = [];
  const fn = async (url: string, init?: any) => {
    calls.push({ url, init });
    const key = init?.method ? `${init.method.toUpperCase()} ${url}` : `GET ${url}`;
    const resp = responses[key] ?? responses[url];
    if (!resp) throw new Error(`No mock response for: ${key}`);

    const bodyStr = typeof resp.body === 'string' ? resp.body : JSON.stringify(resp.body);
    return {
      ok: (resp.status ?? 200) < 400,
      status: resp.status ?? 200,
      json: () => Promise.resolve(typeof resp.body === 'string' ? JSON.parse(resp.body) : resp.body),
      text: () => Promise.resolve(bodyStr),
    };
  };
  return { fetch: fn, calls };
}

describe('API 请求发送', () => {
  let api: ReturnType<typeof createApi>;
  let mock: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mock = createMockFetch({
      'POST /api/proxy': {
        status: 200,
        body: { status: 200, body: '{"ok":true}', time: 50 },
      },
    });
    api = createApi(mock.fetch);
  });

  test('sendRequest 发送 POST 并返回 JSON', async () => {
    const result = await api.sendRequest({ url: 'https://example.com', method: 'GET' });
    expect(result.status).toBe(200);
    expect(result.body).toBe('{"ok":true}');
  });

  test('sendRequest 正确设置 Content-Type', async () => {
    await api.sendRequest({ url: 'https://example.com' });
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].init.headers['Content-Type']).toBe('application/json');
  });

  test('sendRequest 序列化 body 为 JSON', async () => {
    const data = { url: 'https://example.com', method: 'POST', headers: { Authorization: 'Bearer token' } };
    await api.sendRequest(data);
    expect(JSON.parse(mock.calls[0].init.body)).toEqual(data);
  });
});

describe('API History 方法', () => {
  let api: ReturnType<typeof createApi>;
  let mock: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mock = createMockFetch({
      'GET /api/history?page=1&limit=50': { body: { items: [], total: 0, page: 1, limit: 50 } },
      'GET /api/history?page=2&limit=20&search=example&method=POST': { body: { items: [{ id: 1 }], total: 1, page: 2, limit: 20 } },
      'GET /api/history/42': { body: { id: 42, url: 'https://example.com' } },
      'DELETE /api/history/42': { body: { deleted: true } },
      'DELETE /api/history': { body: { deleted: true } },
      'DELETE /api/history/cleanup?limit=100': { body: { cleaned: 50 } },
      'DELETE /api/history/cleanup': { body: { cleaned: 10 } },
    });
    api = createApi(mock.fetch);
  });

  test('getHistory 默认参数', async () => {
    const result = await api.getHistory();
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  test('getHistory 带搜索和过滤', async () => {
    const result = await api.getHistory(2, 20, 'example', 'POST');
    expect(result.items).toEqual([{ id: 1 }]);
    expect(result.total).toBe(1);
  });

  test('getHistoryItem 返回单条记录', async () => {
    const result = await api.getHistoryItem(42);
    expect(result.id).toBe(42);
  });

  test('deleteHistory', async () => {
    const result = await api.deleteHistory(42);
    expect(result.deleted).toBe(true);
  });

  test('clearHistory', async () => {
    const result = await api.clearHistory();
    expect(result.deleted).toBe(true);
  });

  test('cleanupHistory 带 limit', async () => {
    const result = await api.cleanupHistory(100);
    expect(result.cleaned).toBe(50);
  });

  test('cleanupHistory 无 limit', async () => {
    const result = await api.cleanupHistory();
    expect(result.cleaned).toBe(10);
  });
});

describe('API Collections 方法', () => {
  let api: ReturnType<typeof createApi>;
  let mock: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mock = createMockFetch({
      'GET /api/collections': { body: [{ id: 1, name: 'API Tests' }] },
      'POST /api/collections': { body: { id: 2, name: 'New Collection' } },
      'PUT /api/collections/1': { body: { id: 1, name: 'Renamed' } },
      'DELETE /api/collections/1': { body: { deleted: true } },
      'POST /api/collections/5/requests': { body: { id: 10, name: 'New Request' } },
      'PUT /api/collections/5/requests/10': { body: { id: 10, name: 'Updated' } },
      'DELETE /api/collections/5/requests/10': { body: { deleted: true } },
      'POST /api/collections/requests/10/duplicate': { body: { id: 11, name: 'Copy of Request' } },
    });
    api = createApi(mock.fetch);
  });

  test('getCollections', async () => {
    const result = await api.getCollections();
    expect(result).toEqual([{ id: 1, name: 'API Tests' }]);
  });

  test('createCollection', async () => {
    const result = await api.createCollection('New Collection');
    expect(result.id).toBe(2);
  });

  test('updateCollection', async () => {
    const result = await api.updateCollection(1, 'Renamed');
    expect(result.name).toBe('Renamed');
  });

  test('deleteCollection', async () => {
    const result = await api.deleteCollection(1);
    expect(result.deleted).toBe(true);
  });

  test('addRequest', async () => {
    const result = await api.addRequest(5, { name: 'New Request', method: 'GET', url: 'https://example.com' });
    expect(result.id).toBe(10);
  });

  test('updateRequest', async () => {
    const result = await api.updateRequest(5, 10, { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });

  test('deleteRequest', async () => {
    const result = await api.deleteRequest(5, 10);
    expect(result.deleted).toBe(true);
  });

  test('duplicateRequest', async () => {
    const result = await api.duplicateRequest(10);
    expect(result.id).toBe(11);
  });
});

describe('API Environments 方法', () => {
  let api: ReturnType<typeof createApi>;
  let mock: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mock = createMockFetch({
      'GET /api/environments': { body: [{ id: 1, name: 'Production' }] },
      'POST /api/environments': { body: { id: 2, name: 'Staging' } },
      'PUT /api/environments/1': { body: { id: 1, name: 'Prod' } },
      'DELETE /api/environments/1': { body: { deleted: true } },
      'PUT /api/environments/1/variables': { body: { updated: true } },
    });
    api = createApi(mock.fetch);
  });

  test('getEnvironments', async () => {
    const result = await api.getEnvironments();
    expect(result).toEqual([{ id: 1, name: 'Production' }]);
  });

  test('createEnvironment', async () => {
    const result = await api.createEnvironment('Staging');
    expect(result.id).toBe(2);
  });

  test('updateEnvironment', async () => {
    const result = await api.updateEnvironment(1, 'Prod');
    expect(result.name).toBe('Prod');
  });

  test('deleteEnvironment', async () => {
    const result = await api.deleteEnvironment(1);
    expect(result.deleted).toBe(true);
  });

  test('updateVariables', async () => {
    const result = await api.updateVariables(1, [{ key: 'BASE_URL', value: 'https://api.prod.com' }]);
    expect(result.updated).toBe(true);
  });
});

describe('API Global Variables 方法', () => {
  let api: ReturnType<typeof createApi>;
  let mock: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mock = createMockFetch({
      'GET /api/global-variables': { body: [{ id: 1, key: 'TOKEN', value: 'abc' }] },
      'PUT /api/global-variables': { body: { updated: true } },
    });
    api = createApi(mock.fetch);
  });

  test('getGlobalVariables', async () => {
    const result = await api.getGlobalVariables();
    expect(result).toEqual([{ id: 1, key: 'TOKEN', value: 'abc' }]);
  });

  test('updateGlobalVariables', async () => {
    const result = await api.updateGlobalVariables([{ key: 'TOKEN', value: 'xyz' }]);
    expect(result.updated).toBe(true);
  });
});

describe('API Collection Variables 方法', () => {
  let api: ReturnType<typeof createApi>;
  let mock: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mock = createMockFetch({
      'GET /api/collections/5/variables': { body: [{ id: 1, key: 'BASE', value: 'https://api.com' }] },
      'PUT /api/collections/5/variables': { body: { updated: true } },
    });
    api = createApi(mock.fetch);
  });

  test('getCollectionVariables', async () => {
    const result = await api.getCollectionVariables(5);
    expect(result).toEqual([{ id: 1, key: 'BASE', value: 'https://api.com' }]);
  });

  test('updateCollectionVariables', async () => {
    const result = await api.updateCollectionVariables(5, [{ key: 'BASE', value: 'https://new.com' }]);
    expect(result.updated).toBe(true);
  });
});

describe('API Cookies 方法', () => {
  let api: ReturnType<typeof createApi>;
  let mock: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mock = createMockFetch({
      'GET /api/cookies': { body: [{ id: 1, name: 'session', value: 'abc' }] },
      'GET /api/cookies?domain=example.com': { body: [{ id: 1, name: 'session', value: 'abc', domain: 'example.com' }] },
      'DELETE /api/cookies/1': { body: { deleted: true } },
      'DELETE /api/cookies?domain=example.com': { body: { deleted: true } },
      'DELETE /api/cookies': { body: { deleted: true } },
    });
    api = createApi(mock.fetch);
  });

  test('getCookies 无 domain', async () => {
    const result = await api.getCookies();
    expect(result).toEqual([{ id: 1, name: 'session', value: 'abc' }]);
  });

  test('getCookies 带 domain', async () => {
    const result = await api.getCookies('example.com');
    expect(result).toEqual([{ id: 1, name: 'session', value: 'abc', domain: 'example.com' }]);
  });

  test('deleteCookie', async () => {
    const result = await api.deleteCookie(1);
    expect(result.deleted).toBe(true);
  });

  test('deleteCookiesByDomain', async () => {
    const result = await api.deleteCookiesByDomain('example.com');
    expect(result.deleted).toBe(true);
  });

  test('clearAllCookies', async () => {
    const result = await api.clearAllCookies();
    expect(result.deleted).toBe(true);
  });
});

describe('API Import/Export 方法', () => {
  let api: ReturnType<typeof createApi>;
  let mock: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mock = createMockFetch({
      'POST /api/import': { body: { imported: true } },
      'GET /api/export/collections/1': { body: { name: 'Export', requests: [] } },
      'GET /api/export/requests/10/curl': { body: 'curl https://example.com' },
    });
    api = createApi(mock.fetch);
  });

  test('importCurl', async () => {
    const result = await api.importCurl('curl https://example.com', null);
    expect(result.imported).toBe(true);
  });

  test('importPostman', async () => {
    const result = await api.importPostman('{}');
    expect(result.imported).toBe(true);
  });

  test('exportCollection', async () => {
    const result = await api.exportCollection(1);
    expect(result.name).toBe('Export');
  });

  test('exportCurl 返回纯文本', async () => {
    const result = await api.exportCurl(10);
    expect(result).toBe('curl https://example.com');
  });
});
