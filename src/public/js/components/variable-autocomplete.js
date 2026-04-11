import { store } from '../store.js';
import { escapeHtml, CollectionTree } from '../utils/template.js';

export function init() {
  const popup = document.createElement('div');
  popup.id = 'var-autocomplete-popup';
  popup.className = 'var-autocomplete-popup hidden';
  document.body.appendChild(popup);

  let currentInput = null;
  let currentTriggerStart = -1;
  let selectedIndex = 0;
  let filteredItems = [];

  const SCOPE_CSS_CLASS = {
    Runtime: 'var-scope-runtime',
    Collection: 'var-scope-collection',
    Environment: 'var-scope-environment',
    Global: 'var-scope-global',
  };

  function getAllVariables() {
    const state = store.getState();
    const vars = [];
    const scopePriority = { Global: 1, Environment: 2, Collection: 3, Runtime: 4 };

    for (const v of (state.globalVariables || [])) {
      if (v.enabled) vars.push({ key: v.key, scope: 'Global', scopePriority: 1 });
    }

    const envId = state.activeEnv;
    const envs = state.environments || [];
    const activeEnv = envs.find(e => e.id === envId);
    if (activeEnv && activeEnv.variables) {
      for (const v of activeEnv.variables) {
        if (v.enabled !== false && v.enabled !== 0) vars.push({ key: v.key, scope: 'Environment', scopePriority: 2 });
      }
    }

    const tab = store.getActiveTab();
    if (tab && tab.collectionId) {
      const collections = state.collections || [];
      const rootCol = CollectionTree.findRoot(collections, tab.collectionId);
      if (rootCol && rootCol.variables) {
        for (const v of rootCol.variables) {
          if (v.enabled) vars.push({ key: v.key, scope: 'Collection', scopePriority: 3 });
        }
      }
    }

    const runtimeVars = state.runtimeVars || {};
    for (const key of Object.keys(runtimeVars)) vars.push({ key, scope: 'Runtime', scopePriority: 4 });

    const deduped = new Map();
    for (const v of vars) {
      const existing = deduped.get(v.key);
      if (!existing || v.scopePriority > existing.scopePriority) deduped.set(v.key, v);
    }
    return [...deduped.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  function showPopup(input, startIdx, partial) {
    currentInput = input;
    currentTriggerStart = startIdx;
    selectedIndex = 0;
    const allVars = getAllVariables();
    const query = partial.toLowerCase();
    filteredItems = query ? allVars.filter(v => v.key.toLowerCase().includes(query)) : allVars;
    if (filteredItems.length === 0) { hidePopup(); return; }
    renderPopup();
    positionPopup(input);
    popup.classList.remove('hidden');
  }

  function renderPopup() {
    popup.innerHTML = '';
    filteredItems.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = `var-autocomplete-item${idx === selectedIndex ? ' selected' : ''}`;
      el.innerHTML = `<span class="var-autocomplete-key">${escapeHtml(item.key)}</span><span class="var-autocomplete-scope ${SCOPE_CSS_CLASS[item.scope] || 'var-scope-global'}">${item.scope}</span>`;
      el.addEventListener('mousedown', (e) => { e.preventDefault(); selectItem(idx); });
      popup.appendChild(el);
    });
  }

  function positionPopup(input) {
    const rect = input.getBoundingClientRect();
    popup.style.top = `${rect.bottom + 2}px`;
    popup.style.left = `${rect.left}px`;
  }

  function hidePopup() {
    popup.classList.add('hidden');
    currentInput = null;
    currentTriggerStart = -1;
    filteredItems = [];
  }

  function selectItem(idx) {
    if (!currentInput || idx >= filteredItems.length) return;
    const input = currentInput;
    const item = filteredItems[idx];
    const value = input.value;
    const start = currentTriggerStart;
    let end = start + 2;
    while (end < value.length && /[\w]/.test(value[end])) end++;
    input.value = value.substring(0, start) + `{{${item.key}}}` + value.substring(end);
    const cursorPos = start + item.key.length + 4;
    input.setSelectionRange(cursorPos, cursorPos);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    hidePopup();
  }

  function handleKeydown(e) {
    if (popup.classList.contains('hidden')) return;
    if (e.key === 'Escape') { hidePopup(); e.preventDefault(); e.stopPropagation(); }
    else if (e.key === 'ArrowDown') { selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1); renderPopup(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { selectedIndex = Math.max(selectedIndex - 1, 0); renderPopup(); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { selectItem(selectedIndex); e.preventDefault(); }
  }

  function handleInput(e) {
    const input = e.target;
    if (!input.matches('input[type="text"], textarea')) return;
    const value = input.value;
    const cursorPos = input.selectionStart;
    const beforeCursor = value.substring(0, cursorPos);
    const lastBraceIdx = beforeCursor.lastIndexOf('{{');
    if (lastBraceIdx === -1) { hidePopup(); return; }
    const partial = beforeCursor.substring(lastBraceIdx + 2);
    if (!/^[\w]*$/.test(partial) || partial.includes('}}')) { hidePopup(); return; }
    showPopup(input, lastBraceIdx, partial);
  }

  document.addEventListener('input', handleInput);
  document.addEventListener('keydown', handleKeydown, true);
  let scrollHideTimer = null;
  document.addEventListener('scroll', () => {
    if (currentInput && document.activeElement === currentInput) return;
    clearTimeout(scrollHideTimer);
    scrollHideTimer = setTimeout(() => {
      if (currentInput && document.activeElement === currentInput) return;
      hidePopup();
    }, 100);
  }, true);
  document.addEventListener('focusout', (e) => { if (!popup.contains(e.relatedTarget)) hidePopup(); });
}
