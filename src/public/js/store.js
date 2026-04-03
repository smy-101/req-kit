// Event-driven state manager
const store = {
  state: {
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    body: '',
    bodyType: 'json',
    authType: 'none',
    authConfig: {},
    preRequestScript: '',
    // Response
    response: null,
    // UI state
    activeTab: 'headers',
    activeResponseTab: 'body',
    activeEnv: null,
    collections: [],
    environments: [],
    // Current saved request reference
    currentRequestId: null,
    currentCollectionId: null,
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

  setState(updates) {
    Object.assign(this.state, updates);
    this.emit('change', this.state);
  },

  getState() {
    return this.state;
  },
};
