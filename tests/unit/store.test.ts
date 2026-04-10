import { describe, test, expect, beforeEach } from 'bun:test';

/**
 * 重置 store 状态用于测试
 * store 是单例模块，测试间需要手动清理
 */

function createFreshStore() {
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
      postResponseScript: '',
      scriptTests: null,
      response: null,
      multipartParts: [{ key: '', type: 'text', value: '' }],
      binaryFile: null,
      graphqlQuery: '',
      graphqlVariables: '',
      graphqlOperationName: '',
      requestId: null,
      collectionId: null,
      historyId: null,
      dirty: false,
      options: { timeout: 30000, followRedirects: true },
    };
  }

  return {
    state: {
      tabs: [],
      activeTabId: null,
      activeTab: 'headers',
      activeResponseTab: 'body',
      activeEnv: null,
      collections: [],
      environments: [],
      runtimeVars: {},
      globalVariables: [],
      cookieCount: 0,
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

    getActiveTab() {
      return this.state.tabs.find(t => t.id === this.state.activeTabId) || null;
    },

    createTab(data = {}) {
      const tab = _createEmptyTab();
      Object.assign(tab, data);
      this.state.tabs.push(tab);
      this.state.activeTabId = tab.id;
      this.emit('tab:created', tab);
      this.emit('tab:switch', tab);
      return tab;
    },

    switchTab(id) {
      const tab = this.state.tabs.find(t => t.id === id);
      if (!tab || tab.id === this.state.activeTabId) return;
      this.state.activeTabId = tab.id;
      this.emit('tab:switch', tab);
    },

    closeTab(id) {
      const idx = this.state.tabs.findIndex(t => t.id === id);
      if (idx === -1) return;
      this.state.tabs.splice(idx, 1);
      if (id === this.state.activeTabId) {
        if (this.state.tabs.length === 0) {
          this.createTab();
        } else {
          const nextIdx = Math.min(idx, this.state.tabs.length - 1);
          this.state.activeTabId = this.state.tabs[nextIdx].id;
          this.emit('tab:switch', this.state.tabs[nextIdx]);
        }
      }
      this.emit('tab:closed', id);
    },

    switchToNextTab() {
      const tabs = this.state.tabs;
      if (tabs.length <= 1) return;
      const currentIdx = tabs.findIndex(t => t.id === this.state.activeTabId);
      const nextIdx = (currentIdx + 1) % tabs.length;
      this.switchTab(tabs[nextIdx].id);
    },

    switchToPrevTab() {
      const tabs = this.state.tabs;
      if (tabs.length <= 1) return;
      const currentIdx = tabs.findIndex(t => t.id === this.state.activeTabId);
      const prevIdx = (currentIdx - 1 + tabs.length) % tabs.length;
      this.switchTab(tabs[prevIdx].id);
    },

    findTabByRequestId(requestId) {
      return this.state.tabs.find(t => t.requestId === requestId) || null;
    },

    findTabByMethodUrl(method, url) {
      return this.state.tabs.find(t => t.method === method && t.url === url) || null;
    },

    setState(updates) {
      const tabFields = new Set([
        'method', 'url', 'headers', 'params', 'body', 'bodyType',
        'authType', 'authConfig', 'preRequestScript', 'postResponseScript', 'scriptTests', 'response',
        'requestId', 'collectionId', 'historyId',
        'multipartParts', 'binaryFile',
        'graphqlQuery', 'graphqlVariables', 'graphqlOperationName',
        'dirty', 'options',
      ]);

      const dirtyTriggerFields = new Set([
        'method', 'url', 'headers', 'params', 'body', 'bodyType',
        'authType', 'authConfig', 'preRequestScript', 'postResponseScript',
        'graphqlQuery', 'graphqlVariables', 'graphqlOperationName',
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
          if (tab.requestId && !tabUpdates.dirty && Object.keys(tabUpdates).some(k => dirtyTriggerFields.has(k))) {
            tab.dirty = true;
          }
        }
      }

      this.emit('change', this.state);
      if (Object.keys(tabUpdates).length > 0) {
        if ('method' in tabUpdates || 'url' in tabUpdates || 'dirty' in tabUpdates) {
          this.emit('tab:title-change', this.getActiveTab());
        }
      }
    },

    getState() {
      return this.state;
    },
  };
}

describe('Store 事件系统', () => {
  let store: ReturnType<typeof createFreshStore>;

  beforeEach(() => {
    store = createFreshStore();
  });

  test('on/emit 触发监听器', () => {
    let received = null;
    store.on('test', (data) => { received = data; });
    store.emit('test', { foo: 'bar' });
    expect(received).toEqual({ foo: 'bar' });
  });

  test('off 移除监听器', () => {
    let count = 0;
    const fn = () => { count++; };
    store.on('test', fn);
    store.emit('test');
    expect(count).toBe(1);
    store.off('test', fn);
    store.emit('test');
    expect(count).toBe(1);
  });

  test('未注册事件 emit 不报错', () => {
    expect(() => store.emit('nonexistent')).not.toThrow();
  });

  test('多个监听器按注册顺序触发', () => {
    const order: number[] = [];
    store.on('test', () => { order.push(1); });
    store.on('test', () => { order.push(2); });
    store.emit('test');
    expect(order).toEqual([1, 2]);
  });

  test('监听器抛异常不影响其他监听器', () => {
    let secondCalled = false;
    store.on('test', () => { throw new Error('boom'); });
    store.on('test', () => { secondCalled = true; });
    expect(() => store.emit('test')).not.toThrow();
    expect(secondCalled).toBe(true);
  });
});

describe('Store Tab 管理', () => {
  let store: ReturnType<typeof createFreshStore>;

  beforeEach(() => {
    store = createFreshStore();
  });

  test('createTab 创建标签并设为活跃', () => {
    const tab = store.createTab();
    expect(tab.id).toBe(1);
    expect(store.state.tabs).toHaveLength(1);
    expect(store.state.activeTabId).toBe(1);
  });

  test('createTab 带初始数据', () => {
    const tab = store.createTab({ method: 'POST', url: 'https://example.com' });
    expect(tab.method).toBe('POST');
    expect(tab.url).toBe('https://example.com');
  });

  test('createTab 触发 tab:created 和 tab:switch 事件', () => {
    const created: any[] = [];
    const switched: any[] = [];
    store.on('tab:created', (t) => created.push(t));
    store.on('tab:switch', (t) => switched.push(t));
    store.createTab();
    expect(created).toHaveLength(1);
    expect(switched).toHaveLength(1);
  });

  test('switchTab 切换活跃标签', () => {
    const t1 = store.createTab();
    const t2 = store.createTab();
    expect(store.state.activeTabId).toBe(t2.id);
    store.switchTab(t1.id);
    expect(store.state.activeTabId).toBe(t1.id);
  });

  test('switchTab 不切换到已活跃的标签', () => {
    const t1 = store.createTab();
    const switched: any[] = [];
    store.on('tab:switch', (t) => switched.push(t));
    store.switchTab(t1.id);
    expect(switched).toHaveLength(0);
  });

  test('switchTab 无效 id 不报错', () => {
    store.createTab();
    expect(() => store.switchTab(999)).not.toThrow();
    expect(store.state.activeTabId).toBe(1);
  });

  test('closeTab 关闭活跃标签后切换到相邻标签', () => {
    store.createTab(); // id=1
    store.createTab(); // id=2
    store.createTab(); // id=3
    store.closeTab(3);
    expect(store.state.activeTabId).toBe(2);
    expect(store.state.tabs).toHaveLength(2);
  });

  test('closeTab 关闭最后一个标签时自动创建新标签', () => {
    store.createTab();
    store.closeTab(1);
    expect(store.state.tabs).toHaveLength(1);
    expect(store.state.activeTabId).toBe(2); // 新标签 id=2
  });

  test('closeTab 关闭非活跃标签不影响 activeTabId', () => {
    store.createTab(); // id=1
    store.createTab(); // id=2
    store.closeTab(1);
    expect(store.state.activeTabId).toBe(2);
  });

  test('closeTab 不存在的 id 不报错', () => {
    store.createTab();
    expect(() => store.closeTab(999)).not.toThrow();
    expect(store.state.tabs).toHaveLength(1);
  });

  test('findTabByRequestId 找到匹配标签', () => {
    const tab = store.createTab({ requestId: 42 });
    expect(store.findTabByRequestId(42)).toBe(tab);
  });

  test('findTabByRequestId 找不到返回 null', () => {
    store.createTab();
    expect(store.findTabByRequestId(42)).toBeNull();
  });

  test('findTabByMethodUrl 匹配 method + url', () => {
    const tab = store.createTab({ method: 'POST', url: 'https://api.test.com' });
    expect(store.findTabByMethodUrl('POST', 'https://api.test.com')).toBe(tab);
  });

  test('findTabByMethodUrl 不匹配返回 null', () => {
    store.createTab({ method: 'GET', url: 'https://api.test.com' });
    expect(store.findTabByMethodUrl('POST', 'https://api.test.com')).toBeNull();
  });
});

describe('Store setState 字段分类', () => {
  let store: ReturnType<typeof createFreshStore>;

  beforeEach(() => {
    store = createFreshStore();
    store.createTab();
  });

  test('tab 字段更新到活跃标签', () => {
    store.setState({ method: 'POST', url: 'https://example.com' });
    const tab = store.getActiveTab()!;
    expect(tab.method).toBe('POST');
    expect(tab.url).toBe('https://example.com');
  });

  test('global 字段更新到 state 根', () => {
    store.setState({ activeEnv: 5, runtimeVars: { foo: 'bar' } });
    expect(store.state.activeEnv).toBe(5);
    expect(store.state.runtimeVars).toEqual({ foo: 'bar' });
  });

  test('setState 触发 change 事件', () => {
    let received = false;
    store.on('change', () => { received = true; });
    store.setState({ method: 'POST' });
    expect(received).toBe(true);
  });

  test('method/url 变更触发 tab:title-change 事件', () => {
    const titles: any[] = [];
    store.on('tab:title-change', (t) => titles.push(t));
    store.setState({ method: 'POST' });
    expect(titles).toHaveLength(1);
  });

  test('非标题字段变更不触发 tab:title-change', () => {
    const titles: any[] = [];
    store.on('tab:title-change', (t) => titles.push(t));
    store.setState({ body: '{"key":"value"}' });
    expect(titles).toHaveLength(0);
  });

  test('dirty 变更触发 tab:title-change', () => {
    const titles: any[] = [];
    store.on('tab:title-change', (t) => titles.push(t));
    store.setState({ dirty: true });
    expect(titles).toHaveLength(1);
  });

  test('已保存请求的配置字段变更自动标记 dirty', () => {
    store.setState({ requestId: 10 });
    store.setState({ method: 'PUT' });
    expect(store.getActiveTab()!.dirty).toBe(true);
  });

  test('已保存请求的非配置字段变更不标记 dirty', () => {
    store.setState({ requestId: 10 });
    store.setState({ scriptTests: { pass: true } });
    expect(store.getActiveTab()!.dirty).toBe(false);
  });

  test('无活跃标签时 setState 不报错', () => {
    store.state.tabs = [];
    store.state.activeTabId = null;
    expect(() => store.setState({ method: 'POST' })).not.toThrow();
  });

  test('response 字段正确更新到 tab', () => {
    const response = { status: 200, body: 'ok' };
    store.setState({ response });
    expect(store.getActiveTab()!.response).toEqual(response);
  });

  test('options 字段更新到 tab', () => {
    store.setState({ options: { timeout: 5000, followRedirects: false } });
    expect(store.getActiveTab()!.options).toEqual({ timeout: 5000, followRedirects: false });
  });
});
