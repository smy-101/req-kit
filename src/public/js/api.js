// API client for backend communication
export const api = {
  _currentController: null,

  // Abort the in-flight request (called by cancel button)
  abortCurrent() {
    if (this._currentController) {
      this._currentController.abort();
      this._currentController = null;
    }
  },

  async sendRequest(data) {
    // 取消上一个未完成的请求，避免旧响应覆盖当前 tab
    if (this._currentController) {
      this._currentController.abort();
    }
    this._currentController = new AbortController();
    const signal = this._currentController.signal;

    try {
      const res = await fetch('/api/proxy', {
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

  async sendRequestStream(data, callbacks) {
    // 取消上一个未完成的请求，避免旧响应覆盖当前 tab
    if (this._currentController) {
      this._currentController.abort();
    }
    this._currentController = new AbortController();
    const signal = this._currentController.signal;

    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, stream: true }),
        signal,
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (currentEvent === 'headers') callbacks.onHeaders(data);
            else if (currentEvent === 'chunk') callbacks.onChunk(data);
            else if (currentEvent === 'done') callbacks.onDone(data);
            else if (currentEvent === 'error') callbacks.onError(data);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        callbacks.onError({ error: '请求已取消', cancelled: true });
        return;
      }
      throw err;
    } finally {
      if (this._currentController?.signal === signal) {
        this._currentController = null;
      }
    }
  },

  // History
  async getHistory(page = 1, limit = 50, search = '', method = '') {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (method) params.set('method', method);
    const res = await fetch(`/api/history?${params}`);
    return res.json();
  },
  async getHistoryItem(id) {
    const res = await fetch(`/api/history/${id}`);
    return res.json();
  },
  async deleteHistory(id) {
    return fetch(`/api/history/${id}`, { method: 'DELETE' }).then(r => r.json());
  },
  async clearHistory() {
    return fetch('/api/history', { method: 'DELETE' }).then(r => r.json());
  },

  // Collections
  async getCollections() {
    return fetch('/api/collections').then(r => r.json());
  },
  async createCollection(name, parentId = null) {
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parent_id: parentId }),
    });
    return res.json();
  },
  async updateCollection(id, name) {
    return fetch(`/api/collections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(r => r.json());
  },
  async deleteCollection(id) {
    return fetch(`/api/collections/${id}`, { method: 'DELETE' }).then(r => r.json());
  },
  async addRequest(collectionId, request) {
    const res = await fetch(`/api/collections/${collectionId}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return res.json();
  },
  async updateRequest(collectionId, requestId, updates) {
    return fetch(`/api/collections/${collectionId}/requests/${requestId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).then(r => r.json());
  },
  async deleteRequest(collectionId, requestId) {
    return fetch(`/api/collections/${collectionId}/requests/${requestId}`, {
      method: 'DELETE',
    }).then(r => r.json());
  },
  async duplicateRequest(requestId) {
    const res = await fetch(`/api/collections/requests/${requestId}/duplicate`, {
      method: 'POST',
    });
    return res.json();
  },

  // Environments
  async getEnvironments() {
    return fetch('/api/environments').then(r => r.json());
  },
  async createEnvironment(name) {
    const res = await fetch('/api/environments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return res.json();
  },
  async updateEnvironment(id, name) {
    return fetch(`/api/environments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(r => r.json());
  },
  async deleteEnvironment(id) {
    return fetch(`/api/environments/${id}`, { method: 'DELETE' }).then(r => r.json());
  },
  async updateVariables(envId, variables) {
    return fetch(`/api/environments/${envId}/variables`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(variables),
    }).then(r => r.json());
  },

  // Import/Export
  async importCurl(content, collectionId) {
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'curl', content, collection_id: collectionId }),
    });
    return res.json();
  },
  async importPostman(content) {
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'postman', content }),
    });
    return res.json();
  },
  async exportCollection(id) {
    return fetch(`/api/export/collections/${id}`).then(r => r.json());
  },
  async exportCurl(requestId) {
    return fetch(`/api/export/requests/${requestId}/curl`).then(r => r.text());
  },

  // Global Variables
  async getGlobalVariables() {
    return fetch('/api/global-variables').then(r => r.json());
  },
  async updateGlobalVariables(variables) {
    return fetch('/api/global-variables', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(variables),
    }).then(r => r.json());
  },

  // Collection Variables
  async getCollectionVariables(collectionId) {
    return fetch(`/api/collections/${collectionId}/variables`).then(r => r.json());
  },
  async updateCollectionVariables(collectionId, variables) {
    return fetch(`/api/collections/${collectionId}/variables`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(variables),
    }).then(r => r.json());
  },

  // Cookies
  async getCookies(domain) {
    const url = domain ? `/api/cookies?domain=${encodeURIComponent(domain)}` : '/api/cookies';
    return fetch(url).then(r => r.json());
  },
  async deleteCookie(id) {
    return fetch(`/api/cookies/${id}`, { method: 'DELETE' }).then(r => r.json());
  },
  async deleteCookiesByDomain(domain) {
    return fetch(`/api/cookies?domain=${encodeURIComponent(domain)}`, { method: 'DELETE' }).then(r => r.json());
  },
  async clearAllCookies() {
    return fetch('/api/cookies', { method: 'DELETE' }).then(r => r.json());
  },

  // Collection Runner
  runCollection(collectionId, environmentId, callbacks) {
    const controller = new AbortController();
    const signal = controller.signal;

    (async () => {
      try {
        const res = await fetch('/api/runners/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collection_id: collectionId, environment_id: environmentId }),
          signal,
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === 'runner:start') callbacks.onStart?.(data);
              else if (currentEvent === 'request:start') callbacks.onRequestStart?.(data);
              else if (currentEvent === 'request:complete') callbacks.onRequestComplete?.(data);
              else if (currentEvent === 'runner:done') callbacks.onDone?.(data);
            }
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        callbacks.onError?.({ error: err.message });
      }
    })();

    return { abort: () => controller.abort() };
  },
};
