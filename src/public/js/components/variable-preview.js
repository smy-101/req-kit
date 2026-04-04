// Variable preview panel - "eye" icon button and popup showing all scope variables
(function() {
  const urlBar = document.getElementById('url-bar');

  // Create the eye button
  const eyeBtn = document.createElement('button');
  eyeBtn.id = 'btn-var-preview';
  eyeBtn.title = 'Variable Preview';
  eyeBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  // Insert before the save button
  urlBar.insertBefore(eyeBtn, document.getElementById('save-btn'));

  // Create the popup panel
  const panel = document.createElement('div');
  panel.id = 'var-preview-panel';
  panel.className = 'var-preview-panel hidden';
  document.body.appendChild(panel);

  let panelVisible = false;

  eyeBtn.addEventListener('click', () => {
    panelVisible = !panelVisible;
    if (panelVisible) {
      renderPanel();
      positionPanel();
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  });

  // Close on click outside
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== eyeBtn) {
      panelVisible = false;
      panel.classList.add('hidden');
    }
  });

  function positionPanel() {
    const rect = eyeBtn.getBoundingClientRect();
    panel.style.top = `${rect.bottom + 6}px`;
    panel.style.right = `${window.innerWidth - rect.right}px`;
  }

  // 作用域优先级
  const SCOPE_ORDER = ['Runtime', 'Collection', 'Environment', 'Global'];
  const SCOPE_PRIORITY = { Runtime: 4, Collection: 3, Environment: 2, Global: 1 };
  const SCOPE_COLORS = {
    Runtime: 'var(--accent)',
    Collection: 'var(--yellow)',
    Environment: 'var(--green)',
    Global: 'var(--text-3)',
  };

  function collectAllVariables() {
    const state = store.getState();
    const tab = store.getActiveTab();
    const runtimeVars = state.runtimeVars || {};
    const globalVars = state.globalVariables || [];
    const envId = state.activeEnv;
    const environments = state.environments || [];
    const activeEnv = environments.find(e => e.id === envId);

    const collectionId = tab?.collectionId;
    let collectionName = '';
    let collectionVars = [];
    if (collectionId) {
      const collections = state.collections || [];
      const rootCol = CollectionTree.findRoot(collections, collectionId);
      if (rootCol) {
        collectionName = rootCol.name;
        collectionVars = rootCol.variables || [];
      }
    }

    // 收集所有作用域的变量，保留每个 key 在各作用域中的值
    // entries: key -> [{ scope, value, source }]
    const entries = new Map();

    // Global（最低优先级）
    for (const v of globalVars) {
      if (v.enabled) {
        entries.set(v.key, [{ scope: 'Global', value: v.value || '', source: 'Global' }]);
      }
    }

    // Environment
    if (activeEnv && activeEnv.variables) {
      for (const v of activeEnv.variables) {
        if (v.enabled !== false && v.enabled !== 0) {
          const list = entries.get(v.key) || [];
          list.push({ scope: 'Environment', value: v.value || '', source: activeEnv.name });
          entries.set(v.key, list);
        }
      }
    }

    // Collection
    for (const v of collectionVars) {
      if (v.enabled) {
        const list = entries.get(v.key) || [];
        list.push({ scope: 'Collection', value: v.value || '', source: collectionName || 'Collection' });
        entries.set(v.key, list);
      }
    }

    // Runtime（最高优先级）
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
        <span style="font-weight:600;font-size:13px">Variables</span>
        <input type="text" id="var-search" placeholder="搜索变量..." class="var-search-input">
      </div>
      <div class="var-preview-list" id="var-preview-list"></div>
      <div class="var-preview-footer">
        <button id="btn-manage-global-vars" class="modal-btn modal-btn-secondary" style="font-size:11px;padding:4px 12px">
          管理全局变量
        </button>
      </div>
    `;

    const listEl = document.getElementById('var-preview-list');

    if (entries.size === 0) {
      listEl.innerHTML = '<div style="color:var(--text-3);font-size:12px;padding:16px;text-align:center">暂无变量</div>';
    } else {
      renderVariableList(listEl, entries, '');
    }

    // 搜索
    document.getElementById('var-search').addEventListener('input', (e) => {
      renderVariableList(listEl, entries, e.target.value.toLowerCase());
    });

    // 管理全局变量按钮
    document.getElementById('btn-manage-global-vars').addEventListener('click', () => {
      panelVisible = false;
      panel.classList.add('hidden');
      showGlobalVarModal();
    });
  }

  function renderVariableList(listEl, entries, filter) {
    listEl.innerHTML = '';

    // 为每个 key 确定生效作用域
    const keyWinners = new Map(); // key -> winning scope
    for (const [key, scopes] of entries) {
      const winner = scopes.reduce((a, b) =>
        (SCOPE_PRIORITY[b.scope] || 0) > (SCOPE_PRIORITY[a.scope] || 0) ? b : a
      );
      keyWinners.set(key, winner.scope);
    }

    // 按作用域分组：收集每个作用域下要显示的变量
    // scope -> [{ key, value, source, overridden }]
    const grouped = new Map();
    for (const scope of SCOPE_ORDER) grouped.set(scope, []);

    for (const [key, scopes] of entries) {
      const winnerScope = keyWinners.get(key);
      for (const entry of scopes) {
        grouped.get(entry.scope).push({
          key,
          value: entry.value,
          source: entry.source,
          overridden: entry.scope !== winnerScope,
        });
      }
    }

    let hasContent = false;

    for (const scope of SCOPE_ORDER) {
      const items = grouped.get(scope);
      // 过滤
      const filtered = filter
        ? items.filter(item => item.key.toLowerCase().includes(filter))
        : items;

      if (filtered.length === 0) continue;

      hasContent = true;

      // 作用域分组标题
      const header = document.createElement('div');
      header.className = 'var-preview-scope-header';
      header.innerHTML = `<span style="color:${SCOPE_COLORS[scope] || 'var(--text-3)'}">${scope}</span>`;
      listEl.appendChild(header);

      // 变量行
      for (const item of filtered) {
        const row = document.createElement('div');
        row.className = 'var-preview-row';
        if (item.overridden) row.classList.add('var-overridden');
        row.innerHTML = `
          <span class="var-preview-key">${escapeHtml(item.key)}</span>
          <span class="var-preview-value">${escapeHtml(item.value)}</span>
          ${item.overridden ? '<span class="var-preview-tag">被覆盖</span>' : ''}
        `;
        listEl.appendChild(row);
      }
    }

    if (!hasContent) {
      listEl.innerHTML = '<div style="color:var(--text-3);font-size:12px;padding:8px;text-align:center">无匹配变量</div>';
    }
  }

  // Expose for use by other components
  window.refreshGlobalVars = async function() {
    const vars = await api.getGlobalVariables();
    store.setState({ globalVariables: vars });
    // Update sidebar count badge
    const countEl = document.getElementById('global-var-count');
    if (countEl) {
      const enabledCount = vars.filter(v => v.enabled).length;
      countEl.textContent = enabledCount;
      countEl.classList.toggle('has-vars', enabledCount > 0);
    }
  };

  // Load global variables on init
  window.refreshGlobalVars();

  // Sidebar "manage global vars" button
  const manageBtn = document.getElementById('btn-manage-global-vars');
  if (manageBtn) {
    manageBtn.addEventListener('click', () => showGlobalVarModal());
  }
})();
