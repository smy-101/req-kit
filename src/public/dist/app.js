// src/public/js/store.js
var _tabIdCounter = 0;
function _createEmptyTab() {
  return {
    id: ++_tabIdCounter,
    method: "GET",
    url: "",
    headers: [{ key: "", value: "", enabled: true }],
    params: [{ key: "", value: "", enabled: true }],
    body: "",
    bodyType: "json",
    authType: "none",
    authConfig: {},
    preRequestScript: "",
    postResponseScript: "",
    scriptTests: null,
    response: null,
    requestId: null,
    collectionId: null,
    historyId: null
  };
}
var store = {
  state: {
    tabs: [],
    activeTabId: null,
    activeTab: "headers",
    activeResponseTab: "body",
    activeEnv: null,
    collections: [],
    environments: [],
    runtimeVars: {},
    globalVariables: []
  },
  listeners: {},
  on(event, fn) {
    if (!this.listeners[event])
      this.listeners[event] = [];
    this.listeners[event].push(fn);
  },
  off(event, fn) {
    if (!this.listeners[event])
      return;
    this.listeners[event] = this.listeners[event].filter((f) => f !== fn);
  },
  emit(event, data) {
    if (!this.listeners[event])
      return;
    for (const fn of this.listeners[event]) {
      try {
        fn(data);
      } catch (e) {
        console.error(`Event handler error [${event}]:`, e);
      }
    }
  },
  getActiveTab() {
    return this.state.tabs.find((t) => t.id === this.state.activeTabId) || null;
  },
  createTab(data = {}) {
    const tab = _createEmptyTab();
    Object.assign(tab, data);
    this.state.tabs.push(tab);
    this.state.activeTabId = tab.id;
    this.emit("tab:created", tab);
    this.emit("tab:switch", tab);
    return tab;
  },
  switchTab(id) {
    const tab = this.state.tabs.find((t) => t.id === id);
    if (!tab || tab.id === this.state.activeTabId)
      return;
    this.state.activeTabId = tab.id;
    this.emit("tab:switch", tab);
  },
  closeTab(id) {
    const idx = this.state.tabs.findIndex((t) => t.id === id);
    if (idx === -1)
      return;
    this.state.tabs.splice(idx, 1);
    if (id === this.state.activeTabId) {
      if (this.state.tabs.length === 0) {
        this.createTab();
      } else {
        const nextIdx = Math.min(idx, this.state.tabs.length - 1);
        this.state.activeTabId = this.state.tabs[nextIdx].id;
        this.emit("tab:switch", this.state.tabs[nextIdx]);
      }
    }
    this.emit("tab:closed", id);
  },
  findTabByRequestId(requestId) {
    return this.state.tabs.find((t) => t.requestId === requestId) || null;
  },
  findTabByMethodUrl(method, url) {
    return this.state.tabs.find((t) => t.method === method && t.url === url) || null;
  },
  setState(updates) {
    const tabFields = new Set([
      "method",
      "url",
      "headers",
      "params",
      "body",
      "bodyType",
      "authType",
      "authConfig",
      "preRequestScript",
      "postResponseScript",
      "scriptTests",
      "response",
      "requestId",
      "collectionId",
      "historyId"
    ]);
    const tabUpdates = {};
    const globalUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (tabFields.has(key)) {
        tabUpdates[key] = value;
      } else {
        globalUpdates[key] = value;
      }
    }
    if (Object.keys(globalUpdates).length > 0) {
      Object.assign(this.state, globalUpdates);
    }
    if (Object.keys(tabUpdates).length > 0) {
      const tab = this.getActiveTab();
      if (tab) {
        Object.assign(tab, tabUpdates);
      }
    }
    this.emit("change", this.state);
    if (Object.keys(tabUpdates).length > 0) {
      this.emit("tab:update", this.getActiveTab());
      if ("method" in tabUpdates || "url" in tabUpdates) {
        this.emit("tab:title-change", this.getActiveTab());
      }
    }
  },
  getState() {
    return this.state;
  }
};

// src/public/js/utils/panel-resizer.js
function initPanelResizer() {
  const resizer = document.getElementById("panel-resizer");
  const requestPanel = document.getElementById("request-panel");
  const container = document.getElementById("request-response");
  if (!resizer || !requestPanel || !container)
    return;
  const MIN = 20;
  const MAX = 75;
  let cachedRect = null;
  let rafId = null;
  let pendingClientY = null;
  function onMove(clientY) {
    const rect = cachedRect;
    if (!rect)
      return;
    const pct = (clientY - rect.top) / rect.height * 100;
    const clamped = Math.min(MAX, Math.max(MIN, pct));
    requestPanel.style.flex = "0 0 " + clamped + "%";
  }
  function scheduleFrame(clientY) {
    pendingClientY = clientY;
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        onMove(pendingClientY);
        rafId = null;
      });
    }
  }
  function cleanup() {
    if (rafId)
      cancelAnimationFrame(rafId);
    rafId = null;
    cachedRect = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onTouchEnd);
  }
  function onMouseMove(e) {
    e.preventDefault();
    scheduleFrame(e.clientY);
  }
  function onMouseUp() {
    cleanup();
  }
  function onTouchMove(e) {
    e.preventDefault();
    scheduleFrame(e.touches[0].clientY);
  }
  function onTouchEnd() {
    cleanup();
  }
  function startDrag() {
    cachedRect = container.getBoundingClientRect();
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove, { passive: false });
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
  }
  resizer.addEventListener("mousedown", startDrag);
  resizer.addEventListener("touchstart", startDrag, { passive: true });
}

// src/public/js/components/tab-bar.js
var container = document.getElementById("tab-bar");
var tabElMap = new Map;
function getTabTitle(tab) {
  if (!tab.url)
    return "New Request";
  try {
    const url = new URL(tab.url);
    return `${tab.method} ${url.pathname}`;
  } catch {
    return `${tab.method} ${tab.url}`;
  }
}
function createTabElement(tab, isActive) {
  const tabEl = document.createElement("div");
  tabEl.className = "request-tab" + (isActive ? " active" : "");
  tabEl.dataset.tabId = tab.id;
  const title = document.createElement("span");
  title.className = "request-tab-title";
  title.textContent = getTabTitle(tab);
  const closeBtn = document.createElement("button");
  closeBtn.className = "request-tab-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.title = "Close tab";
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    store.closeTab(tab.id);
  });
  tabEl.appendChild(title);
  tabEl.appendChild(closeBtn);
  tabEl.addEventListener("click", () => {
    store.switchTab(tab.id);
  });
  tabEl.addEventListener("mousedown", (e) => {
    if (e.button === 1) {
      e.preventDefault();
      store.closeTab(tab.id);
    }
  });
  return tabEl;
}
function render() {
  const { tabs, activeTabId } = store.getState();
  container.innerHTML = "";
  tabElMap.clear();
  for (const tab of tabs) {
    const tabEl = createTabElement(tab, tab.id === activeTabId);
    tabElMap.set(tab.id, tabEl);
    container.appendChild(tabEl);
  }
  const addBtn = document.createElement("button");
  addBtn.className = "request-tab-add";
  addBtn.innerHTML = "+";
  addBtn.title = "New tab (Ctrl+T)";
  addBtn.addEventListener("click", () => {
    store.createTab();
  });
  container.appendChild(addBtn);
}
function updateTabTitle(tab) {
  const el = tabElMap.get(tab.id);
  if (!el)
    return;
  const titleSpan = el.querySelector(".request-tab-title");
  if (titleSpan)
    titleSpan.textContent = getTabTitle(tab);
}
function updateActiveTab(tab) {
  const { activeTabId } = store.getState();
  for (const [id, el] of tabElMap) {
    el.classList.toggle("active", id === activeTabId);
  }
}
store.on("tab:created", render);
store.on("tab:closed", render);
store.on("tab:switch", updateActiveTab);
store.on("tab:title-change", updateTabTitle);
render();

// src/public/js/api.js
var api = {
  _currentController: null,
  async sendRequest(data) {
    if (this._currentController) {
      this._currentController.abort();
    }
    this._currentController = new AbortController;
    const signal = this._currentController.signal;
    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal
      });
      return await res.json();
    } finally {
      if (this._currentController?.signal === signal) {
        this._currentController = null;
      }
    }
  },
  async sendRequestStream(data, callbacks) {
    const res = await fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, stream: true })
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder;
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done)
        break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(`
`);
      buffer = lines.pop() || "";
      let currentEvent = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const data2 = JSON.parse(line.slice(6));
          if (currentEvent === "headers")
            callbacks.onHeaders(data2);
          else if (currentEvent === "chunk")
            callbacks.onChunk(data2);
          else if (currentEvent === "done")
            callbacks.onDone(data2);
          else if (currentEvent === "error")
            callbacks.onError(data2);
        }
      }
    }
  },
  async getHistory(page = 1, limit = 50, search = "", method = "") {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search)
      params.set("search", search);
    if (method)
      params.set("method", method);
    const res = await fetch(`/api/history?${params}`);
    return res.json();
  },
  async getHistoryItem(id) {
    const res = await fetch(`/api/history/${id}`);
    return res.json();
  },
  async deleteHistory(id) {
    return fetch(`/api/history/${id}`, { method: "DELETE" }).then((r) => r.json());
  },
  async clearHistory() {
    return fetch("/api/history", { method: "DELETE" }).then((r) => r.json());
  },
  async getCollections() {
    return fetch("/api/collections").then((r) => r.json());
  },
  async createCollection(name, parentId = null) {
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parent_id: parentId })
    });
    return res.json();
  },
  async updateCollection(id, name) {
    return fetch(`/api/collections/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    }).then((r) => r.json());
  },
  async deleteCollection(id) {
    return fetch(`/api/collections/${id}`, { method: "DELETE" }).then((r) => r.json());
  },
  async addRequest(collectionId, request) {
    const res = await fetch(`/api/collections/${collectionId}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
    return res.json();
  },
  async updateRequest(collectionId, requestId, updates) {
    return fetch(`/api/collections/${collectionId}/requests/${requestId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    }).then((r) => r.json());
  },
  async deleteRequest(collectionId, requestId) {
    return fetch(`/api/collections/${collectionId}/requests/${requestId}`, {
      method: "DELETE"
    }).then((r) => r.json());
  },
  async getEnvironments() {
    return fetch("/api/environments").then((r) => r.json());
  },
  async createEnvironment(name) {
    const res = await fetch("/api/environments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    return res.json();
  },
  async updateEnvironment(id, name) {
    return fetch(`/api/environments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    }).then((r) => r.json());
  },
  async deleteEnvironment(id) {
    return fetch(`/api/environments/${id}`, { method: "DELETE" }).then((r) => r.json());
  },
  async updateVariables(envId, variables) {
    return fetch(`/api/environments/${envId}/variables`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(variables)
    }).then((r) => r.json());
  },
  async importCurl(content, collectionId) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "curl", content, collection_id: collectionId })
    });
    return res.json();
  },
  async importPostman(content) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "postman", content })
    });
    return res.json();
  },
  async exportCollection(id) {
    return fetch(`/api/export/collections/${id}`).then((r) => r.json());
  },
  async exportCurl(requestId) {
    return fetch(`/api/export/requests/${requestId}/curl`).then((r) => r.text());
  },
  async getGlobalVariables() {
    return fetch("/api/global-variables").then((r) => r.json());
  },
  async updateGlobalVariables(variables) {
    return fetch("/api/global-variables", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(variables)
    }).then((r) => r.json());
  },
  async getCollectionVariables(collectionId) {
    return fetch(`/api/collections/${collectionId}/variables`).then((r) => r.json());
  },
  async updateCollectionVariables(collectionId, variables) {
    return fetch(`/api/collections/${collectionId}/variables`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(variables)
    }).then((r) => r.json());
  }
};

// src/public/js/utils/template.js
function escapeHtml(str) {
  return (str == null ? "" : String(str)).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function emptyStateHTML() {
  return `<div class="empty-state">
    <div class="empty-state-icon">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
    </div>
    <div class="empty-state-title">Send a Request</div>
    <div class="empty-state-desc">Enter a URL and press Send, or use <span class="kbd">Ctrl</span> + <span class="kbd">Enter</span></div>
  </div>`;
}
var InputDebounce = {
  _timers: {},
  schedule(id, fn, ms = 150) {
    clearTimeout(this._timers[id]);
    this._timers[id] = setTimeout(() => {
      fn();
      delete this._timers[id];
    }, ms);
  },
  flush() {
    for (const id of Object.keys(this._timers)) {
      clearTimeout(this._timers[id]);
    }
    this._timers = {};
  }
};
var CollectionTree = {
  findById(collections, id) {
    for (const col of collections) {
      if (col.id === id)
        return col;
      if (col.children) {
        const found = this.findById(col.children, id);
        if (found)
          return found;
      }
    }
    return null;
  },
  findRoot(collections, id) {
    const col = this.findById(collections, id);
    if (!col)
      return null;
    let current = col;
    while (current.parent_id != null) {
      const parent = this.findById(collections, current.parent_id);
      if (!parent)
        break;
      current = parent;
    }
    return current;
  }
};

// src/public/js/components/url-bar.js
var methodSelect = document.getElementById("method-select");
var urlInput = document.getElementById("url-input");
var sendBtn = document.getElementById("send-btn");
function restoreFromTab() {
  const tab = store.getActiveTab();
  if (!tab)
    return;
  methodSelect.value = tab.method;
  urlInput.value = tab.url;
  updateMethodColor();
}
restoreFromTab();
methodSelect.addEventListener("change", () => {
  store.setState({ method: methodSelect.value });
  updateMethodColor();
});
urlInput.addEventListener("input", () => {
  InputDebounce.schedule("url", () => {
    store.setState({ url: urlInput.value });
  });
});
sendBtn.addEventListener("click", async () => {
  InputDebounce.flush();
  store.setState({ url: urlInput.value });
  const tab = store.getActiveTab();
  if (!tab || !tab.url)
    return;
  const headers = {};
  for (const h of tab.headers) {
    if (h.enabled && h.key)
      headers[h.key] = h.value;
  }
  const params = {};
  for (const p of tab.params) {
    if (p.enabled && p.key)
      params[p.key] = p.value;
  }
  sendBtn.disabled = true;
  sendBtn.dataset.loading = "true";
  sendBtn.innerHTML = '<svg class="send-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Sending';
  store.emit("request:start");
  try {
    const data = await api.sendRequest({
      url: tab.url,
      method: tab.method,
      headers,
      params,
      body: tab.body || undefined,
      body_type: tab.bodyType,
      auth_type: tab.authType,
      auth_config: tab.authConfig,
      pre_request_script: tab.preRequestScript,
      post_response_script: tab.postResponseScript,
      environment_id: store.getState().activeEnv,
      collection_id: tab.collectionId,
      runtime_vars: store.getState().runtimeVars
    });
    if (data.script_variables) {
      const merged = { ...store.getState().runtimeVars, ...data.script_variables };
      store.setState({ runtimeVars: merged });
    }
    if (data.post_script_variables) {
      const merged = { ...store.getState().runtimeVars, ...data.post_script_variables };
      store.setState({ runtimeVars: merged });
    }
    if (data.script_tests) {
      store.setState({ scriptTests: data.script_tests });
    }
    store.setState({ response: data });
    store.emit("request:complete", data);
  } catch (err) {
    if (err.name === "AbortError")
      return;
    store.setState({ response: { error: err.message } });
    store.emit("request:error", err);
  } finally {
    sendBtn.disabled = false;
    sendBtn.dataset.loading = "false";
    sendBtn.textContent = "Send";
  }
});
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    sendBtn.click();
  }
});
function updateMethodColor() {
  const colors = { GET: "var(--green)", POST: "var(--yellow)", PUT: "var(--accent)", PATCH: "var(--orange)", DELETE: "var(--red)" };
  methodSelect.style.color = colors[methodSelect.value] || "var(--text-1)";
}
updateMethodColor();
store.on("tab:switch", restoreFromTab);

// src/public/js/components/tab-panel.js
document.querySelectorAll("#request-panel .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const tabName = tab.dataset.tab;
    document.querySelectorAll("#request-panel .tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll("#request-panel .tab-content").forEach((c) => {
      c.classList.add("hidden");
      c.style.display = "none";
    });
    tab.classList.add("active");
    const selected = document.getElementById(`tab-${tabName}`);
    selected.classList.remove("hidden");
    selected.style.display = "";
    store.setState({ activeTab: tabName });
  });
});
document.querySelectorAll("#response-panel .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const tabName = tab.dataset.responseTab;
    document.querySelectorAll("#response-panel .tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll("#response-panel .tab-content").forEach((c) => {
      c.classList.add("hidden");
      c.style.display = "none";
    });
    tab.classList.add("active");
    const selected = document.getElementById(`response-${tabName}`);
    selected.classList.remove("hidden");
    selected.style.display = "";
    store.setState({ activeResponseTab: tabName });
  });
});

// src/public/js/components/headers-editor.js
function createKVEditor(containerId, storeKey) {
  const container2 = document.getElementById(containerId);
  let rows = [];
  function initRows() {
    const tab = store.getActiveTab();
    rows = tab && tab[storeKey] && tab[storeKey].length > 0 ? [...tab[storeKey]] : [{ key: "", value: "", enabled: true }];
  }
  function render2() {
    container2.innerHTML = "";
    const editor = document.createElement("div");
    editor.className = "kv-editor";
    rows.forEach((row, idx) => {
      const rowEl = document.createElement("div");
      rowEl.className = "kv-row";
      rowEl.innerHTML = `
        <input type="checkbox" class="kv-enabled" ${row.enabled ? "checked" : ""}>
        <input type="text" placeholder="Key" value="${escapeHtml(row.key)}" class="kv-key">
        <input type="text" placeholder="Value" value="${escapeHtml(row.value)}" class="kv-value">
        <button class="kv-delete" title="Remove">&times;</button>
      `;
      rowEl.querySelector(".kv-enabled").addEventListener("change", (e) => {
        rows[idx].enabled = e.target.checked;
        sync();
      });
      rowEl.querySelector(".kv-key").addEventListener("input", (e) => {
        rows[idx].key = e.target.value;
        sync();
      });
      rowEl.querySelector(".kv-value").addEventListener("input", (e) => {
        rows[idx].value = e.target.value;
        sync();
      });
      rowEl.querySelector(".kv-delete").addEventListener("click", () => {
        rows.splice(idx, 1);
        if (rows.length === 0)
          rows.push({ key: "", value: "", enabled: true });
        render2();
        sync();
      });
      editor.appendChild(rowEl);
    });
    const addBtn = document.createElement("button");
    addBtn.className = "modal-btn modal-btn-secondary kv-add-btn";
    addBtn.textContent = "+ Add Row";
    addBtn.addEventListener("click", () => {
      rows.push({ key: "", value: "", enabled: true });
      render2();
      sync();
    });
    editor.appendChild(addBtn);
    container2.appendChild(editor);
  }
  let _syncId = storeKey + "-sync";
  function sync() {
    InputDebounce.schedule(_syncId, () => {
      store.setState({ [storeKey]: [...rows] });
    });
  }
  function setRows(newRows) {
    rows = newRows.length > 0 ? [...newRows] : [{ key: "", value: "", enabled: true }];
    render2();
  }
  initRows();
  render2();
  store.on("tab:switch", () => {
    initRows();
    render2();
  });
  return { setRows, getRows: () => rows };
}
var headersEditor = createKVEditor("tab-headers", "headers");
var paramsEditor = createKVEditor("tab-params", "params");

// src/public/js/utils/toast.js
var Toast = {
  show(message, type = "info", duration = 3000) {
    const container2 = document.getElementById("toast-container");
    if (!container2)
      return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
      <button class="toast-close">&times;</button>
    `;
    toast.querySelector(".toast-close").addEventListener("click", () => dismiss(toast));
    container2.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("toast-visible"));
    const timer = setTimeout(() => dismiss(toast), duration);
    toast._timer = timer;
  },
  success(message, duration) {
    this.show(message, "success", duration);
  },
  error(message, duration) {
    this.show(message, "error", duration);
  },
  info(message, duration) {
    this.show(message, "info", duration);
  }
};
function dismiss(toast) {
  if (!toast || !toast.parentNode)
    return;
  clearTimeout(toast._timer);
  toast.classList.remove("toast-visible");
  toast.classList.add("toast-exit");
  toast.addEventListener("animationend", () => toast.remove(), { once: true });
}

// src/public/js/components/body-editor.js
var container2 = document.getElementById("tab-body");
container2.innerHTML = `
  <div class="body-actions">
    <button id="body-format-btn">Format JSON</button>
    <select id="body-type-select">
      <option value="json">JSON</option>
      <option value="text">Text</option>
      <option value="xml">XML</option>
      <option value="form">Form URL Encoded</option>
      <option value="none">None</option>
    </select>
  </div>
  <textarea id="body-textarea" placeholder="Request body..."></textarea>
`;
var textarea = document.getElementById("body-textarea");
var formatBtn = document.getElementById("body-format-btn");
var typeSelect = document.getElementById("body-type-select");
function restoreFromTab2() {
  const tab = store.getActiveTab();
  if (!tab)
    return;
  textarea.value = tab.body || "";
  typeSelect.value = tab.bodyType || "json";
}
restoreFromTab2();
textarea.addEventListener("input", () => {
  InputDebounce.schedule("body", () => {
    store.setState({ body: textarea.value });
  });
});
typeSelect.addEventListener("change", () => {
  store.setState({ bodyType: typeSelect.value });
});
formatBtn.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(textarea.value);
    textarea.value = JSON.stringify(parsed, null, 2);
    store.setState({ body: textarea.value });
    Toast.success("JSON formatted");
  } catch (e) {
    Toast.error("Invalid JSON: " + e.message);
  }
});
store.on("tab:switch", restoreFromTab2);

// src/public/js/components/response-viewer.js
var statusEl = document.getElementById("response-status");
var timeEl = document.getElementById("response-time");
var sizeEl = document.getElementById("response-size");
var bodyEl = document.getElementById("response-body");
var headersEl = document.getElementById("response-headers");
var vscroller = null;
var LINE_HEIGHT = 21;
var BUFFER_LINES = 30;
var LARGE_LINE_THRESHOLD = 500;
function destroyVScroller() {
  if (vscroller) {
    vscroller.destroy();
    vscroller = null;
  }
  bodyEl.classList.remove("vs-active");
}

class VirtualScroller {
  constructor(container3, lines, needsHighlight = false) {
    this.container = container3;
    this.lines = lines;
    this.needsHighlight = needsHighlight;
    this._cache = new Array(lines.length).fill(null);
    this.totalHeight = lines.length * LINE_HEIGHT;
    this._start = -1;
    this._end = -1;
    this._raf = null;
    this.el = document.createElement("div");
    this.el.className = "vscroll-viewport";
    this.spacer = document.createElement("div");
    this.spacer.className = "vscroll-spacer";
    this.spacer.style.height = this.totalHeight + "px";
    this.content = document.createElement("div");
    this.content.className = "vscroll-content";
    this.spacer.appendChild(this.content);
    this.el.appendChild(this.spacer);
    this.container.appendChild(this.el);
    this._onScroll = () => {
      if (!this._raf) {
        this._raf = requestAnimationFrame(() => {
          this.render();
          this._raf = null;
        });
      }
    };
    this.el.addEventListener("scroll", this._onScroll, { passive: true });
    this._resizeObserver = new ResizeObserver(() => {
      this._start = -1;
      this.render();
    });
    this._resizeObserver.observe(this.el);
    this.render();
  }
  render() {
    const scrollTop = this.el.scrollTop;
    const viewHeight = this.el.clientHeight;
    if (viewHeight === 0)
      return;
    let start = Math.floor(scrollTop / LINE_HEIGHT) - BUFFER_LINES;
    start = Math.max(0, start);
    let end = Math.ceil((scrollTop + viewHeight) / LINE_HEIGHT) + BUFFER_LINES;
    end = Math.min(this.lines.length, end);
    if (start === this._start && end === this._end)
      return;
    this._start = start;
    this._end = end;
    this.content.style.transform = `translateY(${start * LINE_HEIGHT}px)`;
    let html = "";
    for (let i = start;i < end; i++) {
      if (!this._cache[i]) {
        this._cache[i] = this.needsHighlight ? syntaxHighlight(this.lines[i]) : this.lines[i];
      }
      html += `<div class="vline"><span class="vline-num">${i + 1}</span><span class="vline-code">${this._cache[i]}</span></div>`;
    }
    this.content.innerHTML = html;
  }
  destroy() {
    if (this._raf)
      cancelAnimationFrame(this._raf);
    this.el.removeEventListener("scroll", this._onScroll);
    this._resizeObserver.disconnect();
    this.container.innerHTML = "";
  }
}
function restoreFromTab3() {
  const tab = store.getActiveTab();
  if (!tab)
    return;
  if (!tab.response) {
    destroyVScroller();
    statusEl.textContent = "";
    statusEl.className = "";
    timeEl.textContent = "";
    sizeEl.textContent = "";
    bodyEl.innerHTML = emptyStateHTML();
    headersEl.innerHTML = "";
    return;
  }
  const data = tab.response;
  if (data.error) {
    destroyVScroller();
    statusEl.textContent = "Error";
    statusEl.className = "status-5xx";
    timeEl.textContent = "-";
    sizeEl.textContent = "-";
    bodyEl.innerHTML = `<pre class="response-error">${escapeHtml(data.error || "Request failed")}</pre>`;
    headersEl.innerHTML = "";
    return;
  }
  renderResponse(data);
}
function renderResponse(data) {
  destroyVScroller();
  const statusClass = data.status >= 200 && data.status < 300 ? "status-2xx" : data.status >= 300 && data.status < 400 ? "status-3xx" : data.status >= 400 && data.status < 500 ? "status-4xx" : "status-5xx";
  statusEl.textContent = `${data.status}`;
  statusEl.className = statusClass;
  timeEl.textContent = `${data.time}ms`;
  sizeEl.textContent = formatSize(data.size);
  let isJson = false;
  let text = data.body || "";
  try {
    const parsed = JSON.parse(text);
    text = JSON.stringify(parsed, null, 2);
    isJson = true;
  } catch {}
  const lines = text.split(`
`);
  let extrasHtml = "";
  if (data.truncated) {
    extrasHtml += '<div class="response-warning">⚠ Response truncated (exceeded 50MB)</div>';
  }
  if (data.script_logs && data.script_logs.length > 0) {
    extrasHtml += '<div class="response-logs"><strong>Script Logs</strong><div>' + data.script_logs.map((l) => `<div>> ${escapeHtml(l)}</div>`).join("") + "</div></div>";
  }
  if (data.post_script_logs && data.post_script_logs.length > 0) {
    extrasHtml += '<div class="response-logs"><strong>Post-script Logs</strong><div>' + data.post_script_logs.map((l) => `<div>> ${escapeHtml(l)}</div>`).join("") + "</div></div>";
  }
  if (lines.length < LARGE_LINE_THRESHOLD) {
    const highlighted = isJson ? syntaxHighlight(text) : escapeHtml(text);
    bodyEl.innerHTML = extrasHtml + `<pre>${highlighted}</pre>`;
  } else {
    bodyEl.classList.add("vs-active");
    bodyEl.innerHTML = extrasHtml;
    const wrapper = document.createElement("div");
    wrapper.className = "vscroll-wrapper";
    bodyEl.appendChild(wrapper);
    vscroller = new VirtualScroller(wrapper, lines, isJson);
  }
  if (data.headers) {
    let html = '<div class="kv-editor">';
    for (const [key, value] of Object.entries(data.headers)) {
      html += `<div class="kv-row"><input value="${escapeHtml(key)}" readonly><input value="${escapeHtml(value)}" readonly></div>`;
    }
    headersEl.innerHTML = html + "</div>";
  }
}
store.on("request:complete", (data) => {
  renderResponse(data);
});
store.on("request:error", (err) => {
  destroyVScroller();
  statusEl.textContent = "Error";
  statusEl.className = "status-5xx";
  timeEl.textContent = "-";
  sizeEl.textContent = "-";
  bodyEl.innerHTML = `<pre class="response-error">${escapeHtml(err.message || "Request failed")}</pre>`;
});
store.on("request:start", () => {
  destroyVScroller();
  statusEl.textContent = "";
  statusEl.className = "";
  timeEl.textContent = "";
  sizeEl.textContent = "";
  bodyEl.innerHTML = `
    <div class="empty-state response-loading">
      <div class="spinner"></div>
      <div class="empty-state-title">Sending request...</div>
    </div>`;
  headersEl.innerHTML = "";
});
store.on("tab:switch", restoreFromTab3);
function formatSize(bytes) {
  if (bytes < 1024)
    return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function syntaxHighlight(json) {
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = "json-number";
    if (/^"/.test(match)) {
      cls = /:$/.test(match) ? "json-key" : "json-string";
    } else if (/true|false/.test(match)) {
      cls = "json-bool";
    } else if (/null/.test(match)) {
      cls = "json-null";
    }
    return `<span class="${cls}">${match}</span>`;
  });
}
restoreFromTab3();

// src/public/js/utils/dialogs.js
var overlay = document.getElementById("modal-overlay");
var modal = document.getElementById("modal");
var activeKeyHandler = null;
function show() {
  overlay.classList.remove("hidden");
}
var hide = function() {
  overlay.classList.add("hidden");
  modal.innerHTML = "";
  if (activeKeyHandler) {
    document.removeEventListener("keydown", activeKeyHandler);
    activeKeyHandler = null;
  }
};
function buildDialog() {
  const dialog = document.createElement("div");
  dialog.className = "confirm-dialog";
  dialog.addEventListener("click", function(e) {
    e.stopPropagation();
  });
  modal.innerHTML = "";
  modal.appendChild(dialog);
  return dialog;
}
var Dialogs = {};
Dialogs.prompt = function(title, placeholder, defaultValue) {
  return new Promise(function(resolve) {
    var dialog = buildDialog();
    var titleEl = document.createElement("div");
    titleEl.className = "confirm-dialog-title";
    titleEl.textContent = title;
    dialog.appendChild(titleEl);
    var input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder || "";
    input.value = defaultValue != null ? defaultValue : "";
    input.className = "dialog-input";
    dialog.appendChild(input);
    var actions = document.createElement("div");
    actions.className = "confirm-dialog-actions dialog-actions-gap";
    var cancelBtn = document.createElement("button");
    cancelBtn.className = "modal-btn modal-btn-secondary";
    cancelBtn.textContent = "Cancel";
    var okBtn = document.createElement("button");
    okBtn.className = "modal-btn modal-btn-primary";
    okBtn.textContent = "OK";
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    dialog.appendChild(actions);
    function submit() {
      var val = input.value;
      hide();
      resolve(val);
    }
    function cancel() {
      hide();
      resolve(null);
    }
    cancelBtn.addEventListener("click", cancel);
    okBtn.addEventListener("click", submit);
    activeKeyHandler = function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    };
    document.addEventListener("keydown", activeKeyHandler);
    var overlayClickCatcher = function(e) {
      if (e.target === overlay) {
        e.stopImmediatePropagation();
        cancel();
      }
    };
    overlay.addEventListener("click", overlayClickCatcher, true);
    var origHide = hide;
    hide = function() {
      overlay.removeEventListener("click", overlayClickCatcher, true);
      origHide();
      hide = origHide;
    };
    show();
    setTimeout(function() {
      input.focus();
      input.select();
    }, 50);
  });
};
Dialogs.confirm = function(title, message) {
  return new Promise(function(resolve) {
    var dialog = buildDialog();
    var titleEl = document.createElement("div");
    titleEl.className = "confirm-dialog-title";
    titleEl.textContent = title;
    dialog.appendChild(titleEl);
    var msgEl = document.createElement("div");
    msgEl.className = "confirm-dialog-message";
    msgEl.textContent = message;
    dialog.appendChild(msgEl);
    var actions = document.createElement("div");
    actions.className = "confirm-dialog-actions";
    var cancelBtn = document.createElement("button");
    cancelBtn.className = "modal-btn modal-btn-secondary";
    cancelBtn.textContent = "Cancel";
    var confirmBtn = document.createElement("button");
    confirmBtn.className = "modal-btn modal-btn-primary";
    confirmBtn.textContent = "Confirm";
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    dialog.appendChild(actions);
    function confirmAction() {
      hide();
      resolve(true);
    }
    function cancelAction() {
      hide();
      resolve(false);
    }
    cancelBtn.addEventListener("click", cancelAction);
    confirmBtn.addEventListener("click", confirmAction);
    activeKeyHandler = function(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelAction();
      } else if (e.key === "Enter") {
        e.preventDefault();
        confirmAction();
      }
    };
    document.addEventListener("keydown", activeKeyHandler);
    var overlayClickCatcher = function(e) {
      if (e.target === overlay) {
        e.stopImmediatePropagation();
        cancelAction();
      }
    };
    overlay.addEventListener("click", overlayClickCatcher, true);
    var origHide = hide;
    hide = function() {
      overlay.removeEventListener("click", overlayClickCatcher, true);
      origHide();
      hide = origHide;
    };
    show();
    setTimeout(function() {
      confirmBtn.focus();
    }, 50);
  });
};
Dialogs.confirmDanger = function(title, message) {
  return new Promise(function(resolve) {
    var dialog = buildDialog();
    var titleEl = document.createElement("div");
    titleEl.className = "confirm-dialog-title";
    titleEl.textContent = title;
    dialog.appendChild(titleEl);
    var msgEl = document.createElement("div");
    msgEl.className = "confirm-dialog-message";
    msgEl.textContent = message;
    dialog.appendChild(msgEl);
    var actions = document.createElement("div");
    actions.className = "confirm-dialog-actions";
    var cancelBtn = document.createElement("button");
    cancelBtn.className = "modal-btn modal-btn-secondary";
    cancelBtn.textContent = "Cancel";
    var dangerBtn = document.createElement("button");
    dangerBtn.className = "modal-btn modal-btn-danger";
    dangerBtn.textContent = "Delete";
    actions.appendChild(cancelBtn);
    actions.appendChild(dangerBtn);
    dialog.appendChild(actions);
    function confirmAction() {
      hide();
      resolve(true);
    }
    function cancelAction() {
      hide();
      resolve(false);
    }
    cancelBtn.addEventListener("click", cancelAction);
    dangerBtn.addEventListener("click", confirmAction);
    activeKeyHandler = function(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelAction();
      } else if (e.key === "Enter") {
        e.preventDefault();
        confirmAction();
      }
    };
    document.addEventListener("keydown", activeKeyHandler);
    var overlayClickCatcher = function(e) {
      if (e.target === overlay) {
        e.stopImmediatePropagation();
        cancelAction();
      }
    };
    overlay.addEventListener("click", overlayClickCatcher, true);
    var origHide = hide;
    hide = function() {
      overlay.removeEventListener("click", overlayClickCatcher, true);
      origHide();
      hide = origHide;
    };
    show();
    setTimeout(function() {
      cancelBtn.focus();
    }, 50);
  });
};

// src/public/js/components/history-panel.js
var PAGE_SIZE = 20;
var DEBOUNCE_MS = 300;
var METHODS = ["ALL", "GET", "POST", "PUT", "DELETE"];
var containerEl = null;
var listWrap = null;
var footerWrap = null;
var searchInput = null;
var chips = [];
var state = {
  search: "",
  method: "",
  page: 1,
  items: [],
  total: 0,
  loading: false
};
var debounceTimer = null;
function render2(container3) {
  containerEl = container3;
  containerEl.innerHTML = "";
  const searchWrap = document.createElement("div");
  searchWrap.className = "history-search";
  searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "搜索 URL...";
  searchInput.className = "history-search-input";
  searchInput.value = state.search;
  searchInput.addEventListener("input", (e) => {
    state.search = e.target.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.page = 1;
      loadHistory();
    }, DEBOUNCE_MS);
  });
  searchWrap.appendChild(searchInput);
  containerEl.appendChild(searchWrap);
  const chipsWrap = document.createElement("div");
  chipsWrap.className = "history-chips";
  chips = [];
  for (const m of METHODS) {
    const chip = document.createElement("button");
    chip.className = "history-chip" + (m === "ALL" && !state.method || m === state.method ? " active" : "");
    chip.textContent = m;
    chip.addEventListener("click", () => {
      state.method = m === "ALL" ? "" : m;
      state.page = 1;
      for (const c of chips) {
        const chipMethod = c.textContent;
        c.classList.toggle("active", chipMethod === "ALL" && !state.method || chipMethod === state.method);
      }
      loadHistory();
    });
    chips.push(chip);
    chipsWrap.appendChild(chip);
  }
  containerEl.appendChild(chipsWrap);
  listWrap = document.createElement("div");
  listWrap.className = "history-list";
  containerEl.appendChild(listWrap);
  footerWrap = document.createElement("div");
  footerWrap.className = "history-footer";
  containerEl.appendChild(footerWrap);
  renderList();
}
function renderList() {
  listWrap.innerHTML = "";
  if (state.loading) {
    listWrap.innerHTML = '<div class="history-empty">加载中...</div>';
  } else if (state.items.length === 0) {
    listWrap.innerHTML = '<div class="history-empty">暂无历史记录</div>';
  } else {
    for (const item of state.items) {
      listWrap.appendChild(renderItem(item));
    }
  }
  footerWrap.innerHTML = "";
  const hasMore = state.items.length < state.total;
  if (hasMore) {
    const moreBtn = document.createElement("button");
    moreBtn.className = "history-more-btn";
    moreBtn.textContent = "加载更多";
    moreBtn.addEventListener("click", () => {
      state.page++;
      loadHistory(true);
    });
    footerWrap.appendChild(moreBtn);
  }
  const clearBtn = document.createElement("button");
  clearBtn.className = "history-clear-btn";
  clearBtn.textContent = "清空历史";
  clearBtn.addEventListener("click", async () => {
    const yes = await Dialogs.confirmDanger("清空历史", "确定要清空所有历史记录吗？此操作不可撤销。");
    if (yes) {
      await api.clearHistory();
      state.items = [];
      state.total = 0;
      state.page = 1;
      renderList();
      Toast.info("历史记录已清空");
    }
  });
  footerWrap.appendChild(clearBtn);
}
function renderItem(item) {
  const el = document.createElement("div");
  el.className = "history-item";
  const urlText = item.url || "";
  const displayUrl = urlText.length > 40 ? urlText.substring(0, 40) + "..." : urlText;
  const statusClass = item.status && item.status < 400 ? "status-ok" : "status-err";
  const timeAgo = relativeTime(item.created_at);
  const safeMethod = escapeHtml(item.method || "");
  const safeStatus = escapeHtml(String(item.status || "-"));
  el.innerHTML = `
    <span class="method-badge method-${safeMethod}">${safeMethod}</span>
    <div class="history-item-info">
      <div class="history-item-url" title="${escapeAttr(urlText)}">${escapeHtml(displayUrl)}</div>
      <div class="history-item-meta">
        <span class="history-status ${statusClass}">${safeStatus}</span>
        <span class="history-time">${item.response_time != null ? item.response_time + "ms" : ""}</span>
        <span class="history-ago">${timeAgo}</span>
      </div>
    </div>
  `;
  el.addEventListener("click", () => loadHistoryItem(item.id));
  return el;
}
async function loadHistory(append = false) {
  state.loading = true;
  renderList();
  try {
    const result = await api.getHistory(state.page, PAGE_SIZE, state.search, state.method);
    if (append) {
      state.items = [...state.items, ...result.items];
    } else {
      state.items = result.items;
    }
    state.total = result.total;
  } catch (e) {
    console.error("Failed to load history:", e);
  }
  state.loading = false;
  renderList();
}
async function loadHistoryItem(id) {
  try {
    const record = await api.getHistoryItem(id);
    if (!record || record.error)
      return;
    const headers = record.request_headers ? JSON.parse(record.request_headers) : {};
    const params = record.request_params ? JSON.parse(record.request_params) : {};
    const authConfig = record.auth_config ? typeof record.auth_config === "string" ? JSON.parse(record.auth_config) : record.auth_config : {};
    const headerRows = Object.entries(headers).map(([key, value]) => ({ key, value, enabled: true }));
    const paramRows = Object.entries(params).map(([key, value]) => ({ key, value, enabled: true }));
    if (headerRows.length === 0)
      headerRows.push({ key: "", value: "", enabled: true });
    if (paramRows.length === 0)
      paramRows.push({ key: "", value: "", enabled: true });
    const response = record.status ? {
      status: record.status,
      headers: record.response_headers ? JSON.parse(record.response_headers) : {},
      body: record.response_body || "",
      time: record.response_time,
      size: record.response_size
    } : null;
    const existing = store.findTabByMethodUrl(record.method || "GET", record.url || "");
    if (existing) {
      store.switchTab(existing.id);
      return;
    }
    store.createTab({
      method: record.method || "GET",
      url: record.url || "",
      headers: headerRows,
      params: paramRows,
      body: record.request_body || "",
      bodyType: record.body_type || "json",
      authType: record.auth_type || "none",
      authConfig,
      preRequestScript: record.pre_request_script || "",
      postResponseScript: record.post_response_script || "",
      response,
      historyId: record.id
    });
  } catch (e) {
    console.error("Failed to load history item:", e);
  }
}
function relativeTime(dateStr) {
  if (!dateStr)
    return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, Math.floor((now - then) / 1000));
  if (diff < 60)
    return "刚刚";
  if (diff < 3600)
    return Math.floor(diff / 60) + "分钟前";
  if (diff < 86400)
    return Math.floor(diff / 3600) + "小时前";
  if (diff < 2592000)
    return Math.floor(diff / 86400) + "天前";
  return Math.floor(diff / 2592000) + "月前";
}
function escapeAttr(str) {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
store.on("request:complete", () => {
  if (containerEl)
    HistoryPanel.refresh();
});
store.on("request:error", () => {
  if (containerEl)
    HistoryPanel.refresh();
});
var HistoryPanel = {
  mount(container3) {
    render2(container3);
    loadHistory();
  },
  refresh() {
    state.page = 1;
    loadHistory();
  }
};

// src/public/js/components/sidebar.js
var treeEl = document.getElementById("collection-tree");
var newColBtn = document.getElementById("btn-new-collection");
var saveBtn = document.getElementById("save-btn");
async function refreshCollections() {
  const collections = await api.getCollections();
  store.setState({ collections });
  renderTree(collections);
}
function renderTree(collections) {
  treeEl.innerHTML = "";
  const historySection = document.createElement("div");
  historySection.className = "history-section";
  const historyHeader = document.createElement("div");
  historyHeader.className = "history-header";
  historyHeader.innerHTML = `
    <span class="history-header-label">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span>History</span>
    </span>
    <svg class="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  `;
  let historyPanelEl = null;
  let expanded = false;
  historyHeader.addEventListener("click", () => {
    expanded = !expanded;
    historyHeader.classList.toggle("expanded", expanded);
    if (expanded && !historyPanelEl) {
      historyPanelEl = document.createElement("div");
      historyPanelEl.className = "history-panel expanded";
      historySection.appendChild(historyPanelEl);
      HistoryPanel.mount(historyPanelEl);
    } else if (expanded && historyPanelEl) {
      historyPanelEl.classList.add("expanded");
      HistoryPanel.refresh();
    } else if (historyPanelEl) {
      historyPanelEl.classList.remove("expanded");
    }
  });
  historySection.appendChild(historyHeader);
  treeEl.appendChild(historySection);
  for (const col of collections) {
    treeEl.appendChild(renderCollectionNode(col));
  }
  if (collections.length === 0) {
    const empty = document.createElement("div");
    empty.className = "tree-empty-msg";
    empty.textContent = "No collections yet";
    treeEl.appendChild(empty);
  }
}
function renderCollectionNode(node, depth = 0) {
  const wrapper = document.createElement("div");
  wrapper.dataset.collectionId = node.id;
  const item = createTreeItem(node.name, node.id, "collection", depth);
  if (node.variables && node.variables.length > 0) {
    const varBadge = document.createElement("span");
    varBadge.className = "coll-var-indicator";
    varBadge.textContent = `{${node.variables.length}}`;
    varBadge.title = `${node.variables.length} collection variables`;
    item.querySelector(".name")?.after(varBadge);
  }
  if (node.children && node.children.length > 0) {
    const children = document.createElement("div");
    children.className = "tree-children";
    for (const child of node.children) {
      children.appendChild(renderCollectionNode(child, depth + 1));
    }
    wrapper.appendChild(children);
  }
  if (node.requests && node.requests.length > 0) {
    const reqs = document.createElement("div");
    reqs.className = "tree-children";
    for (const req of node.requests) {
      const reqItem = createRequestItem(req, node.id, depth + 1);
      reqs.appendChild(reqItem);
    }
    wrapper.appendChild(reqs);
  }
  wrapper.insertBefore(item, wrapper.firstChild);
  return wrapper;
}
function createTreeItem(name, id, type, depth = 0) {
  const item = document.createElement("div");
  item.className = "tree-item";
  item.style.paddingLeft = `${8 + depth * 16}px`;
  const icons = {
    history: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    folder: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'
  };
  const icon = type === "history" ? icons.history : icons.folder;
  item.innerHTML = `<span class="icon">${icon}</span><span class="name">${escapeHtml(name)}</span>`;
  if (type === "collection") {
    item.addEventListener("contextmenu", async (e) => {
      e.preventDefault();
      const yes = await Dialogs.confirmDanger("Delete Collection", `Delete collection "${name}" and all its requests?`);
      if (yes) {
        await api.deleteCollection(id);
        Toast.info("Collection deleted");
        refreshCollections();
      }
    });
  }
  return item;
}
function createRequestItem(req, collectionId, depth = 0) {
  const item = document.createElement("div");
  item.className = "tree-item";
  item.style.paddingLeft = `${8 + depth * 16}px`;
  item.innerHTML = `
    <span class="method-badge method-${req.method}">${req.method}</span>
    <span class="name">${escapeHtml(req.name)}</span>
  `;
  item.addEventListener("click", () => {
    loadRequest(req, collectionId);
  });
  item.addEventListener("contextmenu", async (e) => {
    e.preventDefault();
    const yes = await Dialogs.confirmDanger("Delete Request", `Delete request "${req.name}"?`);
    if (yes) {
      await api.deleteRequest(collectionId, req.id);
      Toast.info("Request deleted");
      refreshCollections();
    }
  });
  return item;
}
function loadRequest(req, collectionId) {
  const existing = store.findTabByMethodUrl(req.method, req.url);
  if (existing) {
    store.switchTab(existing.id);
    return;
  }
  const headers = req.headers ? JSON.parse(req.headers) : {};
  const params = req.params ? JSON.parse(req.params) : {};
  const authConfig = req.auth_config ? typeof req.auth_config === "string" ? JSON.parse(req.auth_config) : req.auth_config : {};
  const headerRows = Object.entries(headers).map(([key, value]) => ({ key, value, enabled: true }));
  const paramRows = Object.entries(params).map(([key, value]) => ({ key, value, enabled: true }));
  if (headerRows.length === 0)
    headerRows.push({ key: "", value: "", enabled: true });
  if (paramRows.length === 0)
    paramRows.push({ key: "", value: "", enabled: true });
  store.createTab({
    method: req.method || "GET",
    url: req.url || "",
    headers: headerRows,
    params: paramRows,
    body: req.body || "",
    bodyType: req.body_type || "json",
    authType: req.auth_type || "none",
    authConfig,
    preRequestScript: req.pre_request_script || "",
    postResponseScript: req.post_response_script || "",
    requestId: req.id,
    collectionId
  });
}
newColBtn.addEventListener("click", async () => {
  const name = await Dialogs.prompt("New Collection", "Collection name");
  if (name) {
    await api.createCollection(name);
    Toast.success("Collection created");
    refreshCollections();
  }
});
saveBtn.addEventListener("click", async () => {
  const tab = store.getActiveTab();
  if (!tab)
    return;
  if (tab.requestId && tab.collectionId) {
    await api.updateRequest(tab.collectionId, tab.requestId, {
      name: `${tab.method} ${tab.url}`,
      method: tab.method,
      url: tab.url,
      headers: JSON.stringify(kvToArray(tab.headers)),
      params: JSON.stringify(kvToArray(tab.params)),
      body: tab.body,
      body_type: tab.bodyType,
      auth_type: tab.authType,
      auth_config: JSON.stringify(tab.authConfig),
      pre_request_script: tab.preRequestScript,
      post_response_script: tab.postResponseScript
    });
    Toast.success("Request updated");
  } else {
    const state2 = store.getState();
    const collections = state2.collections;
    if (collections.length === 0) {
      const name = await Dialogs.prompt("Create a Collection", "Collection name");
      if (!name)
        return;
      await api.createCollection(name);
      await refreshCollections();
    }
    const cols = store.getState().collections;
    const items = cols.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
    const choice = await new Promise((resolve) => {
      const overlay2 = document.getElementById("modal-overlay");
      const modal2 = document.getElementById("modal");
      const dialog = document.createElement("div");
      dialog.className = "confirm-dialog";
      dialog.addEventListener("click", (e) => e.stopPropagation());
      dialog.innerHTML = `
        <div class="confirm-dialog-title">Save Request</div>
        <input type="text" id="save-req-name" class="save-modal-name-input"
          value="${escapeHtml(tab.method + " " + tab.url)}" placeholder="Request name">
        <select id="save-col-select" class="save-modal-select">
          ${items}
        </select>
        <div class="confirm-dialog-actions save-modal-actions">
          <button class="modal-btn modal-btn-secondary" id="save-cancel">Cancel</button>
          <button class="modal-btn modal-btn-primary" id="save-confirm">Save</button>
        </div>
      `;
      modal2.innerHTML = "";
      modal2.appendChild(dialog);
      overlay2.classList.remove("hidden");
      dialog.querySelector("#save-confirm").onclick = () => {
        overlay2.classList.add("hidden");
        resolve({
          collectionId: dialog.querySelector("#save-col-select").value,
          name: dialog.querySelector("#save-req-name").value.trim()
        });
      };
      dialog.querySelector("#save-cancel").onclick = () => {
        overlay2.classList.add("hidden");
        resolve(null);
      };
      overlay2.onclick = (e) => {
        if (e.target === overlay2) {
          overlay2.classList.add("hidden");
          resolve(null);
        }
      };
    });
    if (!choice)
      return;
    const col = cols.find((c) => c.id == choice.collectionId);
    if (!col)
      return;
    const reqName = choice.name || `${tab.method} ${tab.url}`;
    const savedReq = await api.addRequest(col.id, {
      name: reqName,
      method: tab.method,
      url: tab.url,
      headers: JSON.stringify(kvToArray(tab.headers)),
      params: JSON.stringify(kvToArray(tab.params)),
      body: tab.body,
      body_type: tab.bodyType,
      auth_type: tab.authType,
      auth_config: JSON.stringify(tab.authConfig),
      pre_request_script: tab.preRequestScript,
      post_response_script: tab.postResponseScript
    });
    Toast.success("Request saved");
    if (savedReq && savedReq.id) {
      store.setState({ requestId: savedReq.id, collectionId: col.id });
    }
  }
  refreshCollections();
});
function kvToArray(rows) {
  const obj = {};
  for (const r of rows) {
    if (r.enabled && r.key)
      obj[r.key] = r.value;
  }
  return obj;
}
refreshCollections();

// src/public/js/components/env-manager.js
var envSelect = document.getElementById("active-env");
var manageBtn = document.getElementById("btn-manage-env");
var selectedEnvId = null;
var dirty = false;
var pendingSwitchId = null;
async function refreshEnvironments() {
  const envs = await api.getEnvironments();
  store.setState({ environments: envs });
  const currentVal = envSelect.value;
  envSelect.innerHTML = '<option value="">No Environment</option>';
  for (const env of envs) {
    const opt = document.createElement("option");
    opt.value = env.id;
    opt.textContent = env.name;
    envSelect.appendChild(opt);
  }
  envSelect.value = currentVal;
}
envSelect.addEventListener("change", () => {
  store.setState({ activeEnv: envSelect.value ? parseInt(envSelect.value) : null });
});
manageBtn.addEventListener("click", () => showEnvModal());
function showEnvModal() {
  const overlay2 = document.getElementById("modal-overlay");
  const modal2 = document.getElementById("modal");
  const envs = store.getState().environments;
  selectedEnvId = null;
  dirty = false;
  modal2.innerHTML = `
    <h3>Manage Environments</h3>
    <div class="env-split-panel">
      <div class="env-panel-left">
        <div id="env-list-modal" class="env-list"></div>
        <div class="env-new-area">
          <input type="text" id="new-env-name" placeholder="New environment name" class="env-new-input">
          <button id="create-env-btn" class="modal-btn modal-btn-primary env-create-btn">Create</button>
        </div>
      </div>
      <div class="env-panel-right">
        <div id="env-vars-editor" class="env-editor-content">
          <div class="env-placeholder">请选择一个环境</div>
        </div>
      </div>
    </div>
    <div class="modal-actions">
      <button id="close-env-modal" class="modal-btn modal-btn-secondary">Close</button>
    </div>
  `;
  renderEnvList(envs);
  document.getElementById("create-env-btn").addEventListener("click", async () => {
    const input = document.getElementById("new-env-name");
    const name = input.value.trim();
    if (!name)
      return;
    await api.createEnvironment(name);
    input.value = "";
    await refreshEnvironments();
    renderEnvList(store.getState().environments);
  });
  document.getElementById("new-env-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      document.getElementById("create-env-btn").click();
    }
  });
  document.getElementById("close-env-modal").addEventListener("click", () => {
    overlay2.classList.add("hidden");
  });
  overlay2.classList.remove("hidden");
}
function renderEnvList(envs) {
  const listEl = document.getElementById("env-list-modal");
  if (!listEl)
    return;
  listEl.innerHTML = "";
  for (const env of envs) {
    const item = document.createElement("div");
    item.className = "env-item" + (env.id === selectedEnvId ? " active" : "");
    item.dataset.id = env.id;
    const nameSpan = document.createElement("span");
    nameSpan.className = "env-name";
    nameSpan.textContent = env.name;
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "env-item-actions";
    const renameBtn = document.createElement("button");
    renameBtn.className = "modal-btn modal-btn-secondary env-action-btn";
    renameBtn.textContent = "Rename";
    renameBtn.title = "Rename";
    renameBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      startRename(env.id);
    });
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "modal-btn modal-btn-secondary env-action-btn btn-danger-text";
    deleteBtn.textContent = "Delete";
    deleteBtn.title = "Delete";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      startDelete(env.id);
    });
    actionsDiv.appendChild(renameBtn);
    actionsDiv.appendChild(deleteBtn);
    item.appendChild(nameSpan);
    item.appendChild(actionsDiv);
    item.addEventListener("click", () => {
      switchToEnv(env.id);
    });
    listEl.appendChild(item);
  }
}
async function switchToEnv(envId) {
  if (envId === selectedEnvId)
    return;
  if (dirty) {
    pendingSwitchId = envId;
    showUnsavedConfirm();
    return;
  }
  selectedEnvId = envId;
  dirty = false;
  renderEnvList(store.getState().environments);
  renderVarEditor();
}
function showUnsavedConfirm() {
  const overlay2 = document.getElementById("modal-overlay");
  const modal2 = document.getElementById("modal");
  const savedContent = modal2.innerHTML;
  modal2.innerHTML = "";
  const dialog = document.createElement("div");
  dialog.className = "confirm-dialog";
  dialog.addEventListener("click", (e) => e.stopPropagation());
  const titleEl = document.createElement("div");
  titleEl.className = "confirm-dialog-title";
  titleEl.textContent = "Unsaved Changes";
  dialog.appendChild(titleEl);
  const msgEl = document.createElement("div");
  msgEl.className = "confirm-dialog-message";
  msgEl.textContent = "You have unsaved variable changes. What would you like to do?";
  dialog.appendChild(msgEl);
  const actions = document.createElement("div");
  actions.className = "confirm-dialog-actions";
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "modal-btn modal-btn-secondary";
  cancelBtn.textContent = "Cancel";
  const discardBtn = document.createElement("button");
  discardBtn.className = "modal-btn modal-btn-danger";
  discardBtn.textContent = "Discard";
  const saveBtn2 = document.createElement("button");
  saveBtn2.className = "modal-btn modal-btn-primary";
  saveBtn2.textContent = "Save";
  actions.appendChild(cancelBtn);
  actions.appendChild(discardBtn);
  actions.appendChild(saveBtn2);
  dialog.appendChild(actions);
  function restore() {
    modal2.innerHTML = savedContent;
    rebindAfterRestore();
    overlay2.classList.remove("hidden");
  }
  cancelBtn.addEventListener("click", () => {
    pendingSwitchId = null;
    restore();
  });
  discardBtn.addEventListener("click", () => {
    const targetId = pendingSwitchId;
    pendingSwitchId = null;
    dirty = false;
    selectedEnvId = targetId;
    restore();
    renderEnvList(store.getState().environments);
    renderVarEditor();
  });
  saveBtn2.addEventListener("click", async () => {
    const targetId = pendingSwitchId;
    pendingSwitchId = null;
    await saveCurrentVars();
    dirty = false;
    selectedEnvId = targetId;
    restore();
    renderEnvList(store.getState().environments);
    renderVarEditor();
  });
  modal2.innerHTML = "";
  modal2.appendChild(dialog);
}
function rebindAfterRestore() {
  const createBtn = document.getElementById("create-env-btn");
  const newEnvInput = document.getElementById("new-env-name");
  const closeBtn = document.getElementById("close-env-modal");
  if (createBtn) {
    createBtn.onclick = async () => {
      const name = newEnvInput.value.trim();
      if (!name)
        return;
      await api.createEnvironment(name);
      newEnvInput.value = "";
      await refreshEnvironments();
      renderEnvList(store.getState().environments);
    };
  }
  if (newEnvInput) {
    newEnvInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        document.getElementById("create-env-btn")?.click();
      }
    };
  }
  if (closeBtn) {
    closeBtn.onclick = () => {
      document.getElementById("modal-overlay").classList.add("hidden");
    };
  }
}
function renderVarEditor() {
  const varsEl = document.getElementById("env-vars-editor");
  if (!varsEl)
    return;
  if (!selectedEnvId) {
    varsEl.innerHTML = '<div class="env-placeholder">请选择一个环境</div>';
    return;
  }
  const env = store.getState().environments.find((e) => e.id === selectedEnvId);
  if (!env) {
    varsEl.innerHTML = '<div class="env-placeholder">请选择一个环境</div>';
    return;
  }
  varsEl.innerHTML = "";
  const heading = document.createElement("h4");
  heading.className = "env-var-heading";
  heading.textContent = "Variables for " + env.name;
  varsEl.appendChild(heading);
  let vars = env.variables ? env.variables.map((v) => ({ ...v })) : [];
  dirty = false;
  const editor = document.createElement("div");
  editor.className = "kv-editor";
  function renderVars() {
    const keyCount = {};
    for (const v of vars) {
      if (v.key) {
        keyCount[v.key] = (keyCount[v.key] || 0) + 1;
      }
    }
    editor.innerHTML = "";
    vars.forEach((v, idx) => {
      const row = document.createElement("div");
      const isDuplicate = v.key && keyCount[v.key] > 1;
      row.className = "kv-row" + (isDuplicate ? " kv-duplicate" : "");
      row.innerHTML = `
        <input type="checkbox" class="kv-enabled" ${v.enabled ? "checked" : ""}>
        <input type="text" placeholder="Key" value="${escapeHtml(v.key)}" class="kv-key">
        <input type="text" placeholder="Value" value="${escapeHtml(v.value || "")}" class="kv-value">
        <button class="kv-delete" title="Remove">&times;</button>
      `;
      if (isDuplicate) {
        const warn = document.createElement("span");
        warn.className = "kv-dup-warn";
        warn.textContent = "!";
        warn.title = "Duplicate key";
        row.appendChild(warn);
      }
      row.querySelector(".kv-enabled").addEventListener("change", (e) => {
        vars[idx].enabled = e.target.checked;
        dirty = true;
      });
      row.querySelector(".kv-key").addEventListener("input", (e) => {
        vars[idx].key = e.target.value;
        dirty = true;
        updateDuplicateIndicators();
      });
      row.querySelector(".kv-value").addEventListener("input", (e) => {
        vars[idx].value = e.target.value;
        dirty = true;
      });
      row.querySelector(".kv-delete").addEventListener("click", () => {
        vars.splice(idx, 1);
        dirty = true;
        renderVars();
      });
      editor.appendChild(row);
    });
    const addBtn = document.createElement("button");
    addBtn.className = "modal-btn modal-btn-secondary kv-add-btn";
    addBtn.textContent = "+ Add Variable";
    addBtn.addEventListener("click", () => {
      vars.push({ key: "", value: "", enabled: true });
      dirty = true;
      renderVars();
    });
    editor.appendChild(addBtn);
    const saveBtn2 = document.createElement("button");
    saveBtn2.className = "modal-btn modal-btn-primary kv-save-btn";
    saveBtn2.textContent = "Save Variables";
    saveBtn2.addEventListener("click", async () => {
      await saveCurrentVars2();
    });
    editor.appendChild(saveBtn2);
  }
  function updateDuplicateIndicators() {
    const keyCount = {};
    for (const v of vars) {
      if (v.key)
        keyCount[v.key] = (keyCount[v.key] || 0) + 1;
    }
    const rows = editor.querySelectorAll(".kv-row");
    rows.forEach((row, idx) => {
      const v = vars[idx];
      const isDup = v && v.key && keyCount[v.key] > 1;
      row.classList.toggle("kv-duplicate", !!isDup);
      let warn = row.querySelector(".kv-dup-warn");
      if (isDup && !warn) {
        warn = document.createElement("span");
        warn.className = "kv-dup-warn";
        warn.textContent = "!";
        warn.title = "Duplicate key";
        row.appendChild(warn);
      } else if (!isDup && warn) {
        warn.remove();
      }
    });
  }
  async function saveCurrentVars2() {
    const envId = selectedEnvId;
    if (!envId)
      return;
    const toSave = vars.filter((v) => v.key);
    await api.updateVariables(envId, toSave);
    await refreshEnvironments();
    const updatedEnv = store.getState().environments.find((e) => e.id === envId);
    if (updatedEnv) {
      vars = updatedEnv.variables ? updatedEnv.variables.map((v) => ({ ...v })) : [];
    }
    dirty = false;
    renderVars();
    Toast.info("Variables saved");
  }
  varsEl.appendChild(editor);
  renderVars();
}
function startRename(envId) {
  const listEl = document.getElementById("env-list-modal");
  if (!listEl)
    return;
  const item = listEl.querySelector(`.env-item[data-id="${envId}"]`);
  if (!item)
    return;
  const env = store.getState().environments.find((e) => e.id === envId);
  if (!env)
    return;
  const nameSpan = item.querySelector(".env-name");
  const actionsDiv = item.querySelector(".env-item-actions");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "env-rename-input";
  input.value = env.name;
  nameSpan.replaceWith(input);
  input.focus();
  input.select();
  actionsDiv.innerHTML = "";
  const okBtn = document.createElement("button");
  okBtn.className = "modal-btn modal-btn-primary env-action-btn";
  okBtn.textContent = "OK";
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "modal-btn modal-btn-secondary env-action-btn";
  cancelBtn.textContent = "Cancel";
  actionsDiv.appendChild(okBtn);
  actionsDiv.appendChild(cancelBtn);
  async function doRename() {
    const newName = input.value.trim();
    if (!newName || newName === env.name) {
      renderEnvList(store.getState().environments);
      return;
    }
    await api.updateEnvironment(envId, newName);
    Toast.info("Environment renamed");
    await refreshEnvironments();
    renderEnvList(store.getState().environments);
    if (envId === selectedEnvId)
      renderVarEditor();
  }
  function cancelRename() {
    renderEnvList(store.getState().environments);
  }
  okBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    doRename();
  });
  cancelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    cancelRename();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelRename();
    }
  });
  input.addEventListener("click", (e) => e.stopPropagation());
}
function startDelete(envId) {
  const listEl = document.getElementById("env-list-modal");
  if (!listEl)
    return;
  const item = listEl.querySelector(`.env-item[data-id="${envId}"]`);
  if (!item)
    return;
  const env = store.getState().environments.find((e) => e.id === envId);
  if (!env)
    return;
  const actionsDiv = item.querySelector(".env-item-actions");
  actionsDiv.innerHTML = "";
  const msg = document.createElement("span");
  msg.className = "env-delete-msg";
  msg.textContent = "Delete?";
  const yesBtn = document.createElement("button");
  yesBtn.className = "modal-btn modal-btn-danger env-action-btn";
  yesBtn.textContent = "Yes";
  const noBtn = document.createElement("button");
  noBtn.className = "modal-btn modal-btn-secondary env-action-btn";
  noBtn.textContent = "No";
  actionsDiv.appendChild(msg);
  actionsDiv.appendChild(yesBtn);
  actionsDiv.appendChild(noBtn);
  async function doDelete() {
    await api.deleteEnvironment(envId);
    Toast.info("Environment deleted");
    await refreshEnvironments();
    if (envId === selectedEnvId) {
      selectedEnvId = null;
      dirty = false;
    }
    renderEnvList(store.getState().environments);
    renderVarEditor();
  }
  function cancelDelete() {
    renderEnvList(store.getState().environments);
  }
  yesBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    doDelete();
  });
  noBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    cancelDelete();
  });
}
refreshEnvironments();

// src/public/js/components/auth-panel.js
var container3 = document.getElementById("tab-auth");
function render3() {
  const tab = store.getActiveTab();
  const authType = tab ? tab.authType || "none" : "none";
  const config = tab ? tab.authConfig || {} : {};
  container3.innerHTML = `
    <select class="auth-type-select" id="auth-type-select">
      <option value="none" ${authType === "none" ? "selected" : ""}>None</option>
      <option value="bearer" ${authType === "bearer" ? "selected" : ""}>Bearer Token</option>
      <option value="basic" ${authType === "basic" ? "selected" : ""}>Basic Auth</option>
      <option value="apikey" ${authType === "apikey" ? "selected" : ""}>API Key</option>
    </select>
    <div id="auth-fields" class="auth-fields"></div>
  `;
  document.getElementById("auth-type-select").addEventListener("change", (e) => {
    store.setState({ authType: e.target.value, authConfig: {} });
    render3();
  });
  const fieldsEl = document.getElementById("auth-fields");
  function debouncedAuthUpdate(updates) {
    InputDebounce.schedule("auth", () => {
      const t = store.getActiveTab();
      store.setState({ authConfig: { ...t ? t.authConfig : {}, ...updates } });
    });
  }
  switch (authType) {
    case "bearer":
      fieldsEl.innerHTML = `
        <label>Token
          <input type="text" id="auth-token" value="${escapeHtml(config.token || "")}" placeholder="Enter token">
        </label>
      `;
      fieldsEl.querySelector("#auth-token").addEventListener("input", (e) => {
        debouncedAuthUpdate({ token: e.target.value });
      });
      break;
    case "basic":
      fieldsEl.innerHTML = `
        <label>Username
          <input type="text" id="auth-username" value="${escapeHtml(config.username || "")}" placeholder="Username">
        </label>
        <label>Password
          <input type="password" id="auth-password" value="${escapeHtml(config.password || "")}" placeholder="Password">
        </label>
      `;
      fieldsEl.querySelector("#auth-username").addEventListener("input", (e) => {
        debouncedAuthUpdate({ username: e.target.value });
      });
      fieldsEl.querySelector("#auth-password").addEventListener("input", (e) => {
        debouncedAuthUpdate({ password: e.target.value });
      });
      break;
    case "apikey":
      fieldsEl.innerHTML = `
        <label>Key
          <input type="text" id="auth-apikey-key" value="${escapeHtml(config.key || "")}" placeholder="Header or param name">
        </label>
        <label>Value
          <input type="text" id="auth-apikey-value" value="${escapeHtml(config.value || "")}" placeholder="API key value">
        </label>
        <label>Add to
          <select id="auth-apikey-in">
            <option value="header" ${config.in !== "query" ? "selected" : ""}>Header</option>
            <option value="query" ${config.in === "query" ? "selected" : ""}>Query Params</option>
          </select>
        </label>
      `;
      fieldsEl.querySelector("#auth-apikey-key").addEventListener("input", (e) => {
        debouncedAuthUpdate({ key: e.target.value });
      });
      fieldsEl.querySelector("#auth-apikey-value").addEventListener("input", (e) => {
        debouncedAuthUpdate({ value: e.target.value });
      });
      fieldsEl.querySelector("#auth-apikey-in").addEventListener("change", (e) => {
        debouncedAuthUpdate({ in: e.target.value });
      });
      break;
  }
}
store.on("tab:switch", render3);
render3();

// src/public/js/components/import-export.js
var importBtn = document.getElementById("btn-import");
importBtn.addEventListener("click", () => showImportModal());
function showImportModal() {
  const overlay2 = document.getElementById("modal-overlay");
  const modal2 = document.getElementById("modal");
  modal2.innerHTML = `
    <h3>Import / Export</h3>
    <div class="tab-bar imex-tab-bar">
      <button class="tab active" data-imex-tab="import">Import</button>
      <button class="tab" data-imex-tab="export">Export</button>
    </div>
    <div id="imex-import">
      <select id="import-type" class="import-type-select">
        <option value="curl">curl Command</option>
        <option value="postman">Postman Collection v2.1</option>
      </select>
      <textarea id="import-content" class="import-textarea" placeholder="Paste curl command or Postman Collection JSON..."></textarea>
      <div class="modal-actions">
        <button id="import-action-btn" class="modal-btn modal-btn-primary">Import</button>
      </div>
    </div>
    <div id="imex-export" class="hidden">
      <p class="export-hint">Select a collection to export:</p>
      <div id="export-list"></div>
    </div>
    <div class="modal-actions modal-actions-compact">
      <button id="close-imex-modal" class="modal-btn modal-btn-secondary">Close</button>
    </div>
  `;
  modal2.querySelectorAll("[data-imex-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      modal2.querySelectorAll("[data-imex-tab]").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("imex-import").classList.toggle("hidden", tab.dataset.imexTab !== "import");
      document.getElementById("imex-export").classList.toggle("hidden", tab.dataset.imexTab !== "export");
    });
  });
  document.getElementById("import-action-btn").addEventListener("click", async () => {
    const type = document.getElementById("import-type").value;
    const content = document.getElementById("import-content").value.trim();
    if (!content)
      return;
    if (type === "curl") {
      const collections2 = store.getState().collections;
      let colId;
      if (collections2.length === 0) {
        const col = await api.createCollection("Imported");
        colId = col.id;
        await refreshCollections();
      } else {
        colId = collections2[0].id;
      }
      const result = await api.importCurl(content, colId);
      if (result.error) {
        Toast.error(result.error);
      } else {
        Toast.success("Imported successfully");
        await refreshCollections();
        overlay2.classList.add("hidden");
      }
    } else if (type === "postman") {
      const result = await api.importPostman(content);
      if (result.error) {
        Toast.error(result.error);
      } else {
        Toast.success("Postman collection imported");
        await refreshCollections();
        overlay2.classList.add("hidden");
      }
    }
  });
  const exportList = document.getElementById("export-list");
  const collections = store.getState().collections;
  for (const col of collections) {
    const item = document.createElement("div");
    item.className = "export-list-item";
    item.innerHTML = `
      <span class="export-list-item-name">${escapeHtml(col.name)}</span>
      <button class="modal-btn modal-btn-secondary export-col-btn" data-id="${col.id}">Postman</button>
    `;
    exportList.appendChild(item);
  }
  exportList.querySelectorAll(".export-col-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = parseInt(btn.dataset.id);
      const data = await api.exportCollection(id);
      const json = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(json);
      btn.textContent = "Copied!";
      setTimeout(() => btn.textContent = "Postman", 2000);
    });
  });
  document.getElementById("close-imex-modal").addEventListener("click", () => {
    overlay2.classList.add("hidden");
  });
  overlay2.classList.remove("hidden");
}

// src/public/js/components/script-editor.js
var container4 = document.getElementById("tab-script");
container4.innerHTML = `
  <div class="script-desc">
    Pre-request script runs before the request is sent. Available: <code>environment</code>, <code>request.setHeader()</code>, <code>request.setBody()</code>, <code>request.setParam()</code>
  </div>
  <textarea id="script-textarea" placeholder="// Example:&#10;// request.setHeader('X-Timestamp', Date.now().toString())&#10;// request.setHeader('Authorization', 'Bearer ' + environment.token)"></textarea>
`;
var textarea2 = document.getElementById("script-textarea");
function restoreFromTab4() {
  const tab = store.getActiveTab();
  if (!tab)
    return;
  textarea2.value = tab.preRequestScript || "";
}
restoreFromTab4();
textarea2.addEventListener("input", () => {
  InputDebounce.schedule("script", () => {
    store.setState({ preRequestScript: textarea2.value });
  });
});
store.on("tab:switch", restoreFromTab4);

// src/public/js/components/post-script-editor.js
var container5 = document.getElementById("tab-tests");
container5.innerHTML = `
  <div class="script-desc">
    Post-response script runs after the response is received. Available: <code>response</code> (status/headers/body/json()/time/size), <code>tests</code>, <code>variables</code>, <code>environment</code>
  </div>
  <textarea id="post-script-textarea" placeholder="// Example:&#10;// tests["Status is 200"] = response.status === 200&#10;// tests["Has body"] = response.body.length > 0&#10;// variables.set("token", response.json().access_token)"></textarea>
`;
var textarea3 = document.getElementById("post-script-textarea");
function restoreFromTab5() {
  const tab = store.getActiveTab();
  if (!tab)
    return;
  textarea3.value = tab.postResponseScript || "";
}
restoreFromTab5();
textarea3.addEventListener("input", () => {
  InputDebounce.schedule("post-script", () => {
    store.setState({ postResponseScript: textarea3.value });
  });
});
store.on("tab:switch", restoreFromTab5);

// src/public/js/components/test-results.js
var container6 = document.getElementById("response-test-results");
function render4() {
  const tab = store.getActiveTab();
  if (!tab || !tab.response) {
    container6.innerHTML = '<div class="empty-state"><div class="empty-state-title">暂无测试结果</div></div>';
    return;
  }
  const tests = tab.scriptTests;
  const logs = tab.response.post_script_logs;
  if (!tests || Object.keys(tests).length === 0) {
    let html2 = '<div class="empty-state"><div class="empty-state-title">暂无测试结果</div></div>';
    if (logs && logs.length > 0) {
      html2 += renderLogs(logs);
    }
    container6.innerHTML = html2;
    return;
  }
  let passed = 0;
  let failed = 0;
  let html = '<div class="test-results-list">';
  for (const [name, result] of Object.entries(tests)) {
    if (result) {
      passed++;
      html += `<div class="test-item test-passed"><span class="test-icon">✓</span><span class="test-name">${escapeHtml(name)}</span></div>`;
    } else {
      failed++;
      html += `<div class="test-item test-failed"><span class="test-icon">✗</span><span class="test-name">${escapeHtml(name)}</span></div>`;
    }
  }
  html += "</div>";
  html += `<div class="test-summary">${passed} passed, ${failed} failed</div>`;
  if (logs && logs.length > 0) {
    html += renderLogs(logs);
  }
  container6.innerHTML = html;
}
function renderLogs(logs) {
  let html = '<div class="test-logs"><div class="test-logs-title">Console Output</div>';
  for (const log of logs) {
    html += `<div class="test-log-line">> ${escapeHtml(log)}</div>`;
  }
  html += "</div>";
  return html;
}
store.on("request:complete", render4);
store.on("tab:switch", render4);
render4();

// src/public/js/components/global-var-modal.js
function showGlobalVarModal() {
  const overlay2 = document.getElementById("modal-overlay");
  const modal2 = document.getElementById("modal");
  let vars = [...store.getState().globalVariables || []];
  function renderModal() {
    modal2.innerHTML = `
      <h3>管理全局变量</h3>
      <p class="modal-desc">全局变量始终生效，优先级最低。当其他作用域存在同名变量时会被覆盖。</p>
      <div id="global-var-editor" class="kv-editor"></div>
      <div class="modal-actions modal-actions-compact">
        <button id="close-global-var-modal" class="modal-btn modal-btn-secondary">取消</button>
        <button id="save-global-vars" class="modal-btn modal-btn-primary">保存</button>
      </div>
    `;
    const editor = document.getElementById("global-var-editor");
    vars.forEach((v, idx) => {
      const row = document.createElement("div");
      row.className = "kv-row";
      row.innerHTML = `
        <input type="checkbox" class="kv-enabled" ${v.enabled ? "checked" : ""}>
        <input type="text" placeholder="Key" value="${escapeHtml(v.key)}" class="kv-key">
        <input type="text" placeholder="Value" value="${escapeHtml(v.value || "")}" class="kv-value">
        <button class="kv-delete" title="Remove">&times;</button>
      `;
      row.querySelector(".kv-enabled").addEventListener("change", (e) => {
        vars[idx].enabled = e.target.checked;
      });
      row.querySelector(".kv-key").addEventListener("input", (e) => {
        vars[idx].key = e.target.value;
      });
      row.querySelector(".kv-value").addEventListener("input", (e) => {
        vars[idx].value = e.target.value;
      });
      row.querySelector(".kv-delete").addEventListener("click", () => {
        vars.splice(idx, 1);
        renderModal();
      });
      editor.appendChild(row);
    });
    const addBtn = document.createElement("button");
    addBtn.className = "modal-btn modal-btn-secondary kv-add-btn";
    addBtn.textContent = "+ 添加变量";
    addBtn.addEventListener("click", () => {
      vars.push({ key: "", value: "", enabled: true });
      renderModal();
    });
    editor.appendChild(addBtn);
    document.getElementById("close-global-var-modal").addEventListener("click", () => {
      overlay2.classList.add("hidden");
    });
    document.getElementById("save-global-vars").addEventListener("click", async () => {
      const cleaned = vars.filter((v) => v.key.trim()).map((v) => ({ key: v.key.trim(), value: v.value || "", enabled: !!v.enabled }));
      await api.updateGlobalVariables(cleaned);
      await refreshGlobalVars();
      Toast.success("全局变量已保存");
      overlay2.classList.add("hidden");
    });
  }
  renderModal();
  overlay2.classList.remove("hidden");
}

// src/public/js/components/variable-preview.js
var urlBar = document.getElementById("url-bar");
var eyeBtn = document.createElement("button");
eyeBtn.id = "btn-var-preview";
eyeBtn.title = "Variable Preview";
eyeBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
urlBar.insertBefore(eyeBtn, document.getElementById("save-btn"));
var panel = document.createElement("div");
panel.id = "var-preview-panel";
panel.className = "var-preview-panel hidden";
document.body.appendChild(panel);
var panelVisible = false;
eyeBtn.addEventListener("click", () => {
  panelVisible = !panelVisible;
  if (panelVisible) {
    renderPanel();
    positionPanel();
    panel.classList.remove("hidden");
  } else {
    panel.classList.add("hidden");
  }
});
document.addEventListener("click", (e) => {
  if (!panel.contains(e.target) && !eyeBtn.contains(e.target)) {
    panelVisible = false;
    panel.classList.add("hidden");
  }
});
function positionPanel() {
  const rect = eyeBtn.getBoundingClientRect();
  panel.style.top = `${rect.bottom + 6}px`;
  panel.style.right = `${window.innerWidth - rect.right}px`;
}
var SCOPE_ORDER = ["Runtime", "Collection", "Environment", "Global"];
var SCOPE_PRIORITY = { Runtime: 4, Collection: 3, Environment: 2, Global: 1 };
var SCOPE_CSS_CLASS = {
  Runtime: "var-scope-runtime",
  Collection: "var-scope-collection",
  Environment: "var-scope-environment",
  Global: "var-scope-global"
};
function collectAllVariables() {
  const state2 = store.getState();
  const tab = store.getActiveTab();
  const runtimeVars = state2.runtimeVars || {};
  const globalVars = state2.globalVariables || [];
  const envId = state2.activeEnv;
  const environments = state2.environments || [];
  const activeEnv = environments.find((e) => e.id === envId);
  const collectionId = tab?.collectionId;
  let collectionName = "";
  let collectionVars = [];
  if (collectionId) {
    const collections = state2.collections || [];
    const rootCol = CollectionTree.findRoot(collections, collectionId);
    if (rootCol) {
      collectionName = rootCol.name;
      collectionVars = rootCol.variables || [];
    }
  }
  const entries = new Map;
  for (const v of globalVars) {
    if (v.enabled) {
      entries.set(v.key, [{ scope: "Global", value: v.value || "", source: "Global" }]);
    }
  }
  if (activeEnv && activeEnv.variables) {
    for (const v of activeEnv.variables) {
      if (v.enabled !== false && v.enabled !== 0) {
        const list = entries.get(v.key) || [];
        list.push({ scope: "Environment", value: v.value || "", source: activeEnv.name });
        entries.set(v.key, list);
      }
    }
  }
  for (const v of collectionVars) {
    if (v.enabled) {
      const list = entries.get(v.key) || [];
      list.push({ scope: "Collection", value: v.value || "", source: collectionName || "Collection" });
      entries.set(v.key, list);
    }
  }
  for (const [key, value] of Object.entries(runtimeVars)) {
    const list = entries.get(key) || [];
    list.push({ scope: "Runtime", value, source: "Runtime" });
    entries.set(key, list);
  }
  return { entries, collectionName, activeEnv };
}
function renderPanel() {
  const { entries } = collectAllVariables();
  panel.innerHTML = `
    <div class="var-preview-header">
      <span class="var-preview-title">Variables</span>
      <input type="text" id="var-search" placeholder="搜索变量..." class="var-search-input">
    </div>
    <div class="var-preview-list" id="var-preview-list"></div>
    <div class="var-preview-footer">
      <button id="btn-manage-global-vars-panel" class="modal-btn modal-btn-secondary var-preview-manage-btn">
        管理全局变量
      </button>
    </div>
  `;
  const listEl = document.getElementById("var-preview-list");
  if (entries.size === 0) {
    listEl.innerHTML = '<div class="var-empty-msg">暂无变量</div>';
  } else {
    renderVariableList(listEl, entries, "");
  }
  document.getElementById("var-search").addEventListener("input", (e) => {
    renderVariableList(listEl, entries, e.target.value.toLowerCase());
  });
  document.getElementById("btn-manage-global-vars-panel").addEventListener("click", () => {
    panelVisible = false;
    panel.classList.add("hidden");
    showGlobalVarModal();
  });
}
function renderVariableList(listEl, entries, filter) {
  listEl.innerHTML = "";
  const keyWinners = new Map;
  for (const [key, scopes] of entries) {
    const winner = scopes.reduce((a, b) => (SCOPE_PRIORITY[b.scope] || 0) > (SCOPE_PRIORITY[a.scope] || 0) ? b : a);
    keyWinners.set(key, winner.scope);
  }
  const grouped = new Map;
  for (const scope of SCOPE_ORDER)
    grouped.set(scope, []);
  for (const [key, scopes] of entries) {
    const winnerScope = keyWinners.get(key);
    for (const entry of scopes) {
      grouped.get(entry.scope).push({
        key,
        value: entry.value,
        source: entry.source,
        overridden: entry.scope !== winnerScope
      });
    }
  }
  let hasContent = false;
  for (const scope of SCOPE_ORDER) {
    const items = grouped.get(scope);
    const filtered = filter ? items.filter((item) => item.key.toLowerCase().includes(filter)) : items;
    if (filtered.length === 0)
      continue;
    hasContent = true;
    const header = document.createElement("div");
    header.className = "var-preview-scope-header";
    header.innerHTML = `<span class="${SCOPE_CSS_CLASS[scope] || "var-scope-global"}">${scope}</span>`;
    listEl.appendChild(header);
    for (const item of filtered) {
      const row = document.createElement("div");
      row.className = "var-preview-row";
      if (item.overridden)
        row.classList.add("var-overridden");
      row.innerHTML = `
        <span class="var-preview-key">${escapeHtml(item.key)}</span>
        <span class="var-preview-value">${escapeHtml(item.value)}</span>
        ${item.overridden ? '<span class="var-preview-tag">被覆盖</span>' : ""}
      `;
      listEl.appendChild(row);
    }
  }
  if (!hasContent) {
    listEl.innerHTML = '<div class="var-empty-msg-compact">无匹配变量</div>';
  }
}
async function refreshGlobalVars() {
  const vars = await api.getGlobalVariables();
  store.setState({ globalVariables: vars });
  const countEl = document.getElementById("global-var-count");
  if (countEl) {
    const enabledCount = vars.filter((v) => v.enabled).length;
    countEl.textContent = enabledCount;
    countEl.classList.toggle("has-vars", enabledCount > 0);
  }
}
refreshGlobalVars();
var manageBtn2 = document.getElementById("btn-manage-global-vars");
if (manageBtn2) {
  manageBtn2.addEventListener("click", () => showGlobalVarModal());
}

// src/public/js/components/collection-var-editor.js
async function showCollectionVarModal(collectionId, collectionName) {
  const overlay2 = document.getElementById("modal-overlay");
  const modal2 = document.getElementById("modal");
  const loaded = await api.getCollectionVariables(collectionId);
  let vars = loaded.map((v) => ({ key: v.key, value: v.value || "", enabled: v.enabled }));
  function renderModal() {
    modal2.innerHTML = `
      <h3>集合变量: ${escapeHtml(collectionName)}</h3>
      <p class="modal-desc">这些变量对该集合下的所有请求生效，优先级高于环境变量和全局变量。</p>
      <div id="coll-var-editor" class="kv-editor"></div>
      <div class="modal-actions modal-actions-compact">
        <button id="close-coll-var-modal" class="modal-btn modal-btn-secondary">取消</button>
        <button id="save-coll-vars" class="modal-btn modal-btn-primary">保存</button>
      </div>
    `;
    const editor = document.getElementById("coll-var-editor");
    vars.forEach((v, idx) => {
      const row = document.createElement("div");
      row.className = "kv-row";
      row.innerHTML = `
        <input type="checkbox" class="kv-enabled" ${v.enabled ? "checked" : ""}>
        <input type="text" placeholder="Key" value="${escapeHtml(v.key)}" class="kv-key">
        <input type="text" placeholder="Value" value="${escapeHtml(v.value)}" class="kv-value">
        <button class="kv-delete" title="Remove">&times;</button>
      `;
      row.querySelector(".kv-enabled").addEventListener("change", (e) => {
        vars[idx].enabled = e.target.checked ? 1 : 0;
      });
      row.querySelector(".kv-key").addEventListener("input", (e) => {
        vars[idx].key = e.target.value;
      });
      row.querySelector(".kv-value").addEventListener("input", (e) => {
        vars[idx].value = e.target.value;
      });
      row.querySelector(".kv-delete").addEventListener("click", () => {
        vars.splice(idx, 1);
        renderModal();
      });
      editor.appendChild(row);
    });
    const addBtn = document.createElement("button");
    addBtn.className = "modal-btn modal-btn-secondary kv-add-btn";
    addBtn.textContent = "+ 添加变量";
    addBtn.addEventListener("click", () => {
      vars.push({ key: "", value: "", enabled: 1 });
      renderModal();
    });
    editor.appendChild(addBtn);
    document.getElementById("close-coll-var-modal").addEventListener("click", () => {
      overlay2.classList.add("hidden");
    });
    document.getElementById("save-coll-vars").addEventListener("click", async () => {
      const cleaned = vars.filter((v) => v.key.trim()).map((v) => ({ key: v.key.trim(), value: v.value || "", enabled: v.enabled ? true : false }));
      await api.updateCollectionVariables(collectionId, cleaned);
      Toast.success("集合变量已保存");
      overlay2.classList.add("hidden");
      refreshCollections();
    });
  }
  renderModal();
  overlay2.classList.remove("hidden");
}
function setupSidebarPatch() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        patchSidebar();
      }
    }
  });
  const treeEl2 = document.getElementById("collection-tree");
  if (treeEl2) {
    observer.observe(treeEl2, { childList: true, subtree: true });
  }
}
function patchSidebar() {
  const treeEl2 = document.getElementById("collection-tree");
  if (!treeEl2)
    return;
  treeEl2.querySelectorAll(".tree-item").forEach((item) => {
    if (item.querySelector(".coll-var-btn"))
      return;
    const methodBadge = item.querySelector(".method-badge");
    if (methodBadge)
      return;
    const nameSpan = item.querySelector(".name");
    if (!nameSpan)
      return;
    const wrapper = item.parentElement;
    const collectionId = wrapper?.dataset?.collectionId;
    if (!collectionId)
      return;
    const varBtn = document.createElement("button");
    varBtn.className = "coll-var-btn";
    varBtn.title = "Variables";
    varBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
    varBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const name = nameSpan.textContent;
      showCollectionVarModal(parseInt(collectionId), name);
    });
    item.appendChild(varBtn);
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setupSidebarPatch();
    requestAnimationFrame(patchSidebar);
  });
} else {
  setupSidebarPatch();
  requestAnimationFrame(patchSidebar);
}

// src/public/js/components/variable-autocomplete.js
var popup = document.createElement("div");
popup.id = "var-autocomplete-popup";
popup.className = "var-autocomplete-popup hidden";
document.body.appendChild(popup);
var currentInput = null;
var currentTriggerStart = -1;
var selectedIndex = 0;
var filteredItems = [];
function getAllVariables() {
  const state2 = store.getState();
  const vars = [];
  const scopePriority = { Global: 1, Environment: 2, Collection: 3, Runtime: 4 };
  for (const v of state2.globalVariables || []) {
    if (v.enabled)
      vars.push({ key: v.key, scope: "Global", scopePriority: 1 });
  }
  const envId = state2.activeEnv;
  const envs = state2.environments || [];
  const activeEnv = envs.find((e) => e.id === envId);
  if (activeEnv && activeEnv.variables) {
    for (const v of activeEnv.variables) {
      if (v.enabled !== false && v.enabled !== 0) {
        vars.push({ key: v.key, scope: "Environment", scopePriority: 2 });
      }
    }
  }
  const tab = store.getActiveTab();
  if (tab && tab.collectionId) {
    const collections = state2.collections || [];
    const rootCol = CollectionTree.findRoot(collections, tab.collectionId);
    if (rootCol && rootCol.variables) {
      for (const v of rootCol.variables) {
        if (v.enabled)
          vars.push({ key: v.key, scope: "Collection", scopePriority: 3 });
      }
    }
  }
  const runtimeVars = state2.runtimeVars || {};
  for (const key of Object.keys(runtimeVars)) {
    vars.push({ key, scope: "Runtime", scopePriority: 4 });
  }
  const deduped = new Map;
  for (const v of vars) {
    const existing = deduped.get(v.key);
    if (!existing || v.scopePriority > existing.scopePriority) {
      deduped.set(v.key, v);
    }
  }
  return [...deduped.values()].sort((a, b) => a.key.localeCompare(b.key));
}
function showPopup(input, startIdx, partial) {
  currentInput = input;
  currentTriggerStart = startIdx;
  selectedIndex = 0;
  const allVars = getAllVariables();
  const query = partial.toLowerCase();
  filteredItems = query ? allVars.filter((v) => v.key.toLowerCase().includes(query)) : allVars;
  if (filteredItems.length === 0) {
    hidePopup();
    return;
  }
  renderPopup();
  positionPopup(input);
  popup.classList.remove("hidden");
}
var SCOPE_CSS_CLASS2 = {
  Runtime: "var-scope-runtime",
  Collection: "var-scope-collection",
  Environment: "var-scope-environment",
  Global: "var-scope-global"
};
function renderPopup() {
  popup.innerHTML = "";
  filteredItems.forEach((item, idx) => {
    const el = document.createElement("div");
    el.className = `var-autocomplete-item${idx === selectedIndex ? " selected" : ""}`;
    el.innerHTML = `
      <span class="var-autocomplete-key">${escapeHtml(item.key)}</span>
      <span class="var-autocomplete-scope ${SCOPE_CSS_CLASS2[item.scope] || "var-scope-global"}">${item.scope}</span>
    `;
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      selectItem(idx);
    });
    popup.appendChild(el);
  });
}
function positionPopup(input) {
  const rect = input.getBoundingClientRect();
  popup.style.top = `${rect.bottom + 2}px`;
  popup.style.left = `${rect.left}px`;
}
function hidePopup() {
  popup.classList.add("hidden");
  currentInput = null;
  currentTriggerStart = -1;
  filteredItems = [];
}
function selectItem(idx) {
  if (!currentInput || idx >= filteredItems.length)
    return;
  const input = currentInput;
  const item = filteredItems[idx];
  const value = input.value;
  const start = currentTriggerStart;
  let end = start + 2;
  while (end < value.length && /[\w]/.test(value[end]))
    end++;
  const before = value.substring(0, start);
  const after = value.substring(end);
  input.value = before + `{{${item.key}}}` + after;
  const cursorPos = start + item.key.length + 4;
  input.setSelectionRange(cursorPos, cursorPos);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  hidePopup();
}
function handleKeydown(e) {
  if (popup.classList.contains("hidden"))
    return;
  if (e.key === "Escape") {
    hidePopup();
    e.preventDefault();
    e.stopPropagation();
  } else if (e.key === "ArrowDown") {
    selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
    renderPopup();
    e.preventDefault();
  } else if (e.key === "ArrowUp") {
    selectedIndex = Math.max(selectedIndex - 1, 0);
    renderPopup();
    e.preventDefault();
  } else if (e.key === "Enter" || e.key === "Tab") {
    selectItem(selectedIndex);
    e.preventDefault();
  }
}
function handleInput(e) {
  const input = e.target;
  if (!input.matches('input[type="text"], textarea'))
    return;
  const value = input.value;
  const cursorPos = input.selectionStart;
  const beforeCursor = value.substring(0, cursorPos);
  const lastBraceIdx = beforeCursor.lastIndexOf("{{");
  if (lastBraceIdx === -1) {
    hidePopup();
    return;
  }
  const partial = beforeCursor.substring(lastBraceIdx + 2);
  if (!/^[\w]*$/.test(partial)) {
    hidePopup();
    return;
  }
  if (partial.includes("}}")) {
    hidePopup();
    return;
  }
  showPopup(input, lastBraceIdx, partial);
}
document.addEventListener("input", handleInput);
document.addEventListener("keydown", handleKeydown, true);
document.addEventListener("scroll", () => hidePopup(), true);
document.addEventListener("focusout", (e) => {
  if (!popup.contains(e.relatedTarget))
    hidePopup();
});

// src/public/js/app.js
document.getElementById("modal-overlay").addEventListener("click", (e) => {
  if (e.target.id === "modal-overlay") {
    e.target.classList.add("hidden");
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    document.getElementById("send-btn").click();
  }
  if (e.key === "Escape") {
    document.getElementById("modal-overlay").classList.add("hidden");
  }
  if (e.key === "w" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    const tab = store.getActiveTab();
    if (tab)
      store.closeTab(tab.id);
  }
  if (e.key === "t" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    store.createTab();
  }
});
initPanelResizer();
store.on("change", (state2) => {});
store.createTab();
console.log("req-kit initialized");
