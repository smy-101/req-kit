import { store } from '../store.js';
import { api } from '../api.js';
import { Toast } from '../utils/toast.js';

// Tab Bar component — 增量更新，避免每次输入都重建 DOM
const container = document.getElementById('tab-bar');
const tabElMap = new Map(); // tabId -> DOM element

function getTabTitle(tab) {
  const prefix = tab.dirty ? '● ' : '';
  if (!tab.url) return prefix + 'New Request';
  try {
    const url = new URL(tab.url);
    return `${prefix}${tab.method} ${url.pathname}`;
  } catch {
    return `${prefix}${tab.method} ${tab.url}`;
  }
}

async function confirmCloseDirty(tab) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.addEventListener('click', e => e.stopPropagation());

    dialog.innerHTML = `
      <div class="confirm-dialog-title">未保存的变更</div>
      <div style="color:var(--text-2);font-size:13px;margin-bottom:16px;">此标签页有未保存的变更。</div>
      <div class="confirm-dialog-actions">
        <button class="modal-btn modal-btn-secondary" id="dirty-discard">不保存</button>
        <button class="modal-btn modal-btn-cancel" id="dirty-cancel">取消</button>
        <button class="modal-btn modal-btn-primary" id="dirty-save">保存</button>
      </div>
    `;

    modal.innerHTML = '';
    modal.appendChild(dialog);
    overlay.classList.remove('hidden');

    dialog.querySelector('#dirty-save').onclick = async () => {
      overlay.classList.add('hidden');
      // Trigger save
      document.getElementById('save-btn')?.click();
      resolve('save');
    };
    dialog.querySelector('#dirty-discard').onclick = () => {
      overlay.classList.add('hidden');
      resolve('discard');
    };
    dialog.querySelector('#dirty-cancel').onclick = () => {
      overlay.classList.add('hidden');
      resolve('cancel');
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) { overlay.classList.add('hidden'); resolve('cancel'); }
    };
  });
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

  closeBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (tab.dirty && tab.requestId) {
      const result = await confirmCloseDirty(tab);
      if (result === 'cancel') return;
      // 'discard' or 'save' — proceed to close
    }
    store.closeTab(tab.id);
  });

  tabEl.appendChild(title);
  tabEl.appendChild(closeBtn);

  tabEl.addEventListener('click', () => {
    store.switchTab(tab.id);
  });

  tabEl.addEventListener('mousedown', async (e) => {
    if (e.button === 1) {
      e.preventDefault();
      if (tab.dirty && tab.requestId) {
        const result = await confirmCloseDirty(tab);
        if (result === 'cancel') return;
      }
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
