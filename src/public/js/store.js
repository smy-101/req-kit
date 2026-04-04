// Event-driven state manager with multi-tab support
let _tabIdCounter = 0;

function _createEmptyTab() {
  return {
    id: ++_tabIdCounter,
    method: 'GET',
    url: '',
    headers: [{ key: '', value: '', enabled: true }],
    params: [{ key: '', value: '', enabled: true }],
    body: '',
    bodyType: 'json',
    authType: 'none',
    authConfig: {},
    preRequestScript: '',
    response: null,
    requestId: null,
    collectionId: null,
    historyId: null,
  };
}

const store = {
  state: {
    tabs: [],
    activeTabId: null,
    // Global UI state (not per-tab)
    activeTab: 'headers',
    activeResponseTab: 'body',
    activeEnv: null,
    collections: [],
    environments: [],
    runtimeVars: {},
    globalVariables: [],
  },
  listeners: {},

  on(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  },

  off(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(f => f !== fn);
  },

  emit(event, data) {
    if (!this.listeners[event]) return;
    for (const fn of this.listeners[event]) {
      try { fn(data); } catch (e) { console.error(`Event handler error [${event}]:`, e); }
    }
  },

  // Get currently active tab object
  getActiveTab() {
    return this.state.tabs.find(t => t.id === this.state.activeTabId) || null;
  },

  // Create a new tab, optionally with initial data
  createTab(data = {}) {
    const tab = _createEmptyTab();
    Object.assign(tab, data);
    this.state.tabs.push(tab);
    this.state.activeTabId = tab.id;
    this.emit('tab:created', tab);
    this.emit('tab:switch', tab);
    return tab;
  },

  // Switch to an existing tab by id
  switchTab(id) {
    const tab = this.state.tabs.find(t => t.id === id);
    if (!tab || tab.id === this.state.activeTabId) return;
    this.state.activeTabId = tab.id;
    this.emit('tab:switch', tab);
  },

  // Close a tab by id
  closeTab(id) {
    const idx = this.state.tabs.findIndex(t => t.id === id);
    if (idx === -1) return;

    this.state.tabs.splice(idx, 1);

    // If closed the active tab, activate adjacent
    if (id === this.state.activeTabId) {
      if (this.state.tabs.length === 0) {
        // Last tab — auto-create new empty tab
        this.createTab();
      } else {
        // Prefer right, then left
        const nextIdx = Math.min(idx, this.state.tabs.length - 1);
        this.state.activeTabId = this.state.tabs[nextIdx].id;
        this.emit('tab:switch', this.state.tabs[nextIdx]);
      }
    }

    this.emit('tab:closed', id);
  },

  // Find a tab associated with a saved request
  findTabByRequestId(requestId) {
    return this.state.tabs.find(t => t.requestId === requestId) || null;
  },

  // Update state — request fields go to active tab, global fields go to state
  setState(updates) {
    const tabFields = new Set([
      'method', 'url', 'headers', 'params', 'body', 'bodyType',
      'authType', 'authConfig', 'preRequestScript', 'response',
      'requestId', 'collectionId', 'historyId',
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

    this.emit('change', this.state);
    if (Object.keys(tabUpdates).length > 0) {
      this.emit('tab:update', this.getActiveTab());
      // Tab bar only needs to re-render when title (method/url) changes
      if ('method' in tabUpdates || 'url' in tabUpdates) {
        this.emit('tab:title-change', this.getActiveTab());
      }
    }
  },

  getState() {
    return this.state;
  },
};

// Auto-create initial empty tab
store.createTab();
