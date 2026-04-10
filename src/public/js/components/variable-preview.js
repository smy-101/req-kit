import { store } from '../store.js';
import { api } from '../api.js';
import { escapeHtml, CollectionTree } from '../utils/template.js';

export function init(showGlobalVarModal) {
  const urlBar = document.getElementById('url-bar');

  const eyeBtn = document.createElement('button');
  eyeBtn.id = 'btn-var-preview';
  eyeBtn.title = 'Variable Preview';
  eyeBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  urlBar.insertBefore(eyeBtn, document.getElementById('save-btn'));

  const panel = document.createElement('div');
  panel.id = 'var-preview-panel';
  panel.className = 'var-preview-panel hidden';
  document.body.appendChild(panel);

  let panelVisible = false;

  eyeBtn.addEventListener('click', () => {
    panelVisible = !panelVisible;
    if (panelVisible) { renderPanel(); positionPanel(); panel.classList.remove('hidden'); }
    else { panel.classList.add('hidden'); }
  });

  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && !eyeBtn.contains(e.target)) { panelVisible = false; panel.classList.add('hidden'); }
  });

  function positionPanel() {
    const rect = eyeBtn.getBoundingClientRect();
    panel.style.top = `${rect.bottom + 6}px`;
    panel.style.right = `${window.innerWidth - rect.right}px`;
  }

  const SCOPE_ORDER = ['Runtime', 'Collection', 'Environment', 'Global'];
  const SCOPE_PRIORITY = { Runtime: 4, Collection: 3, Environment: 2, Global: 1 };
  const SCOPE_CSS_CLASS = { Runtime: 'var-scope-runtime', Collection: 'var-scope-collection', Environment: 'var-scope-environment', Global: 'var-scope-global' };

  function collectAllVariables() {
    const state = store.getState();
    const tab = store.getActiveTab();
    const runtimeVars = state.runtimeVars || {};
    const globalVars = state.globalVariables || [];
    const envId = state.activeEnv;
    const environments = state.environments || [];
    const activeEnv = environments.find(e => e.id === envId);
    const collectionId = tab?.collectionId;
    let collectionName = '', collectionVars = [];
    if (collectionId) {
      const collections = state.collections || [];
      const rootCol = CollectionTree.findRoot(collections, collectionId);
      if (rootCol) { collectionName = rootCol.name; collectionVars = rootCol.variables || []; }
    }
    const entries = new Map();
    for (const v of globalVars) { if (v.enabled) entries.set(v.key, [{ scope: 'Global', value: v.value || '', source: 'Global' }]); }
    if (activeEnv && activeEnv.variables) {
      for (const v of activeEnv.variables) {
        if (v.enabled !== false && v.enabled !== 0) {
          const list = entries.get(v.key) || [];
          list.push({ scope: 'Environment', value: v.value || '', source: activeEnv.name });
          entries.set(v.key, list);
        }
      }
    }
    for (const v of collectionVars) {
      if (v.enabled) {
        const list = entries.get(v.key) || [];
        list.push({ scope: 'Collection', value: v.value || '', source: collectionName || 'Collection' });
        entries.set(v.key, list);
      }
    }
    for (const [key, value] of Object.entries(runtimeVars)) {
      const list = entries.get(key) || [];
      list.push({ scope: 'Runtime', value, source: 'Runtime' });
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
        <button id="btn-manage-global-vars-panel" class="modal-btn modal-btn-secondary var-preview-manage-btn">管理全局变量</button>
      </div>`;

    const listEl = document.getElementById('var-preview-list');
    if (entries.size === 0) listEl.innerHTML = '<div class="var-empty-msg">暂无变量</div>';
    else renderVariableList(listEl, entries, '');

    document.getElementById('var-search').addEventListener('input', (e) => renderVariableList(listEl, entries, e.target.value.toLowerCase()));
    document.getElementById('btn-manage-global-vars-panel').addEventListener('click', () => {
      panelVisible = false; panel.classList.add('hidden'); showGlobalVarModal();
    });
  }

  function renderVariableList(listEl, entries, filter) {
    listEl.innerHTML = '';
    const keyWinners = new Map();
    for (const [key, scopes] of entries) {
      const winner = scopes.reduce((a, b) => (SCOPE_PRIORITY[b.scope] || 0) > (SCOPE_PRIORITY[a.scope] || 0) ? b : a);
      keyWinners.set(key, winner.scope);
    }
    const grouped = new Map();
    for (const scope of SCOPE_ORDER) grouped.set(scope, []);
    for (const [key, scopes] of entries) {
      const winnerScope = keyWinners.get(key);
      for (const entry of scopes) grouped.get(entry.scope).push({ key, value: entry.value, source: entry.source, overridden: entry.scope !== winnerScope });
    }
    let hasContent = false;
    for (const scope of SCOPE_ORDER) {
      const items = grouped.get(scope);
      const filtered = filter ? items.filter(item => item.key.toLowerCase().includes(filter)) : items;
      if (filtered.length === 0) continue;
      hasContent = true;
      const header = document.createElement('div');
      header.className = 'var-preview-scope-header';
      header.innerHTML = `<span class="${SCOPE_CSS_CLASS[scope] || 'var-scope-global'}">${scope}</span>`;
      listEl.appendChild(header);
      for (const item of filtered) {
        const row = document.createElement('div');
        row.className = 'var-preview-row';
        if (item.overridden) row.classList.add('var-overridden');
        row.innerHTML = `<span class="var-preview-key">${escapeHtml(item.key)}</span><span class="var-preview-value">${escapeHtml(item.value)}</span>${item.overridden ? '<span class="var-preview-tag">被覆盖</span>' : ''}`;
        listEl.appendChild(row);
      }
    }
    if (!hasContent) listEl.innerHTML = '<div class="var-empty-msg-compact">无匹配变量</div>';
  }

  async function refreshGlobalVars() {
    const vars = await api.getGlobalVariables();
    store.setState({ globalVariables: vars });
    const countEl = document.getElementById('global-var-count');
    if (countEl) { const enabledCount = vars.filter(v => v.enabled).length; countEl.textContent = enabledCount; countEl.classList.toggle('has-vars', enabledCount > 0); }
  }

  refreshGlobalVars();

  const manageBtn = document.getElementById('btn-manage-global-vars');
  if (manageBtn) manageBtn.addEventListener('click', () => showGlobalVarModal());

  return { refreshGlobalVars };
}
