import { store } from '../store.js';

// Tab Bar component — 增量更新，避免每次输入都重建 DOM
const container = document.getElementById('tab-bar');
const tabElMap = new Map(); // tabId -> DOM element

function getTabTitle(tab) {
  if (!tab.url) return 'New Request';
  try {
    const url = new URL(tab.url);
    return `${tab.method} ${url.pathname}`;
  } catch {
    return `${tab.method} ${tab.url}`;
  }
}

function createTabElement(tab, isActive) {
  const tabEl = document.createElement('div');
  tabEl.className = 'request-tab' + (isActive ? ' active' : '');
  tabEl.dataset.tabId = tab.id;

  const title = document.createElement('span');
  title.className = 'request-tab-title';
  title.textContent = getTabTitle(tab);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'request-tab-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.title = 'Close tab';

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    store.closeTab(tab.id);
  });

  tabEl.appendChild(title);
  tabEl.appendChild(closeBtn);

  tabEl.addEventListener('click', () => {
    store.switchTab(tab.id);
  });

  tabEl.addEventListener('mousedown', (e) => {
    if (e.button === 1) {
      e.preventDefault();
      store.closeTab(tab.id);
    }
  });

  return tabEl;
}

function render() {
  const { tabs, activeTabId } = store.getState();
  container.innerHTML = '';
  tabElMap.clear();

  for (const tab of tabs) {
    const tabEl = createTabElement(tab, tab.id === activeTabId);
    tabElMap.set(tab.id, tabEl);
    container.appendChild(tabEl);
  }

  // "+" button
  const addBtn = document.createElement('button');
  addBtn.className = 'request-tab-add';
  addBtn.innerHTML = '+';
  addBtn.title = 'New tab (Ctrl+T)';
  addBtn.addEventListener('click', () => {
    store.createTab();
  });
  container.appendChild(addBtn);
}

// 只更新单个 tab 标题文本（O(1) DOM 操作）
function updateTabTitle(tab) {
  const el = tabElMap.get(tab.id);
  if (!el) return;
  const titleSpan = el.querySelector('.request-tab-title');
  if (titleSpan) titleSpan.textContent = getTabTitle(tab);
}

// 只切换 active class，不重建 DOM
function updateActiveTab(tab) {
  const { activeTabId } = store.getState();
  for (const [id, el] of tabElMap) {
    el.classList.toggle('active', id === activeTabId);
  }
}

// 结构性变更才全量重建
store.on('tab:created', render);
store.on('tab:closed', render);
store.on('tab:switch', updateActiveTab);

// 标题变更 — 增量更新
store.on('tab:title-change', updateTabTitle);

render();
