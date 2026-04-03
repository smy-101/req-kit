// API client for backend communication
const api = {
  async sendRequest(data) {
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async sendRequestStream(data, callbacks) {
    const res = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, stream: true }),
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
  },

  // History
  async getHistory(page = 1, limit = 50) {
    const res = await fetch(`/api/history?page=${page}&limit=${limit}`);
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
};
