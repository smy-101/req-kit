// Sidebar component - collection tree
(function() {
  const treeEl = document.getElementById('collection-tree');
  const newColBtn = document.getElementById('btn-new-collection');
  const saveBtn = document.getElementById('save-btn');

  // Load collections
  async function refreshCollections() {
    const collections = await api.getCollections();
    store.setState({ collections });
    renderTree(collections);
  }

  function renderTree(collections) {
    treeEl.innerHTML = '';

    // History section — expandable panel
    const historySection = document.createElement('div');
    historySection.className = 'history-section';

    const historyHeader = document.createElement('div');
    historyHeader.className = 'history-header';
    historyHeader.innerHTML = `
      <span style="display:flex;align-items:center;gap:8px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>History</span>
      </span>
      <svg class="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    `;

    let historyPanelEl = null;
    let expanded = false;

    historyHeader.addEventListener('click', () => {
      expanded = !expanded;
      historyHeader.classList.toggle('expanded', expanded);

      if (expanded && !historyPanelEl) {
        historyPanelEl = document.createElement('div');
        historyPanelEl.className = 'history-panel';
        historySection.appendChild(historyPanelEl);
        HistoryPanel.mount(historyPanelEl);
      } else if (expanded && historyPanelEl) {
        historyPanelEl.style.display = '';
        HistoryPanel.refresh();
      } else if (historyPanelEl) {
        historyPanelEl.style.display = 'none';
      }
    });

    historySection.appendChild(historyHeader);
    treeEl.appendChild(historySection);

    // Collections
    for (const col of collections) {
      treeEl.appendChild(renderCollectionNode(col));
    }

    if (collections.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:var(--text-3);font-size:12px;padding:16px;text-align:center';
      empty.textContent = 'No collections yet';
      treeEl.appendChild(empty);
    }
  }

  function renderCollectionNode(node, depth = 0) {
    const wrapper = document.createElement('div');
    wrapper.dataset.collectionId = node.id;

    const item = createTreeItem(node.name, node.id, 'collection', depth);

    // Add variables badge if collection has variables
    if (node.variables && node.variables.length > 0) {
      const varBadge = document.createElement('span');
      varBadge.className = 'coll-var-indicator';
      varBadge.textContent = `{${node.variables.length}}`;
      varBadge.title = `${node.variables.length} collection variables`;
      varBadge.style.cssText = 'font-size:9px;color:var(--text-3);margin-left:4px;font-family:var(--font-mono)';
      item.querySelector('.name')?.after(varBadge);
    }

    // Children
    if (node.children && node.children.length > 0) {
      const children = document.createElement('div');
      children.className = 'tree-children';
      for (const child of node.children) {
        children.appendChild(renderCollectionNode(child, depth + 1));
      }
      wrapper.appendChild(children);
    }

    // Requests
    if (node.requests && node.requests.length > 0) {
      const reqs = document.createElement('div');
      reqs.className = 'tree-children';
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
    const item = document.createElement('div');
    item.className = 'tree-item';
    item.style.paddingLeft = `${8 + depth * 16}px`;

    const icons = {
      history: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      folder: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    };
    const icon = type === 'history' ? icons.history : icons.folder;
    item.innerHTML = `<span class="icon">${icon}</span><span class="name">${escapeHtml(name)}</span>`;

    if (type === 'collection') {
      item.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        const yes = await Dialogs.confirmDanger('Delete Collection', `Delete collection "${name}" and all its requests?`);
        if (yes) {
          await api.deleteCollection(id);
          Toast.info('Collection deleted');
          refreshCollections();
        }
      });
    }

    return item;
  }

  function createRequestItem(req, collectionId, depth = 0) {
    const item = document.createElement('div');
    item.className = 'tree-item';
    item.style.paddingLeft = `${8 + depth * 16}px`;

    item.innerHTML = `
      <span class="method-badge method-${req.method}">${req.method}</span>
      <span class="name">${escapeHtml(req.name)}</span>
    `;

    item.addEventListener('click', () => {
      loadRequest(req, collectionId);
    });

    item.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      const yes = await Dialogs.confirmDanger('Delete Request', `Delete request "${req.name}"?`);
      if (yes) {
        await api.deleteRequest(collectionId, req.id);
        Toast.info('Request deleted');
        refreshCollections();
      }
    });

    return item;
  }

  function loadRequest(req, collectionId) {
    // Check if this request already has an open tab
    const existingTab = store.findTabByRequestId(req.id);
    if (existingTab) {
      store.switchTab(existingTab.id);
      return;
    }

    // Parse request data
    const headers = req.headers ? JSON.parse(req.headers) : {};
    const params = req.params ? JSON.parse(req.params) : {};
    const authConfig = req.auth_config ? (typeof req.auth_config === 'string' ? JSON.parse(req.auth_config) : req.auth_config) : {};

    // Convert headers/params objects to key-value arrays
    const headerRows = Object.entries(headers).map(([key, value]) => ({ key, value, enabled: true }));
    const paramRows = Object.entries(params).map(([key, value]) => ({ key, value, enabled: true }));

    if (headerRows.length === 0) headerRows.push({ key: '', value: '', enabled: true });
    if (paramRows.length === 0) paramRows.push({ key: '', value: '', enabled: true });

    // Create a new tab with the request data
    store.createTab({
      method: req.method || 'GET',
      url: req.url || '',
      headers: headerRows,
      params: paramRows,
      body: req.body || '',
      bodyType: req.body_type || 'json',
      authType: req.auth_type || 'none',
      authConfig,
      preRequestScript: req.pre_request_script || '',
      requestId: req.id,
      collectionId,
    });
  }

  // New collection button
  newColBtn.addEventListener('click', async () => {
    const name = await Dialogs.prompt('New Collection', 'Collection name');
    if (name) {
      await api.createCollection(name);
      Toast.success('Collection created');
      refreshCollections();
    }
  });

  // Save request button
  saveBtn.addEventListener('click', async () => {
    const tab = store.getActiveTab();
    if (!tab) return;

    if (tab.requestId && tab.collectionId) {
      // Update existing request
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
      });
      Toast.success('Request updated');
    } else {
      // Save new - need to pick a collection
      const state = store.getState();
      const collections = state.collections;
      if (collections.length === 0) {
        const name = await Dialogs.prompt('Create a Collection', 'Collection name');
        if (!name) return;
        await api.createCollection(name);
        await refreshCollections();
      }
      const cols = store.getState().collections;
      const items = cols.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

      const choice = await new Promise((resolve) => {
        const overlay = document.getElementById('modal-overlay');
        const modal = document.getElementById('modal');
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.addEventListener('click', e => e.stopPropagation());

        dialog.innerHTML = `
          <div class="confirm-dialog-title">Save Request</div>
          <select id="save-col-select" style="width:100%;margin-top:14px;padding:9px 12px;border-radius:7px;
            border:1px solid var(--border-0);background:var(--bg-2);color:var(--text-0);
            font-family:var(--font-ui);font-size:13px;outline:none;cursor:pointer">
            ${items}
          </select>
          <div class="confirm-dialog-actions" style="margin-top:20px">
            <button class="modal-btn modal-btn-secondary" id="save-cancel">Cancel</button>
            <button class="modal-btn modal-btn-primary" id="save-confirm">Save</button>
          </div>
        `;

        modal.innerHTML = '';
        modal.appendChild(dialog);
        overlay.classList.remove('hidden');

        dialog.querySelector('#save-confirm').onclick = () => {
          overlay.classList.add('hidden');
          resolve(dialog.querySelector('#save-col-select').value);
        };
        dialog.querySelector('#save-cancel').onclick = () => {
          overlay.classList.add('hidden');
          resolve(null);
        };
        overlay.onclick = (e) => {
          if (e.target === overlay) { overlay.classList.add('hidden'); resolve(null); }
        };
      });

      if (!choice) return;
      const col = cols.find(c => c.id == choice);
      if (!col) return;

      const savedReq = await api.addRequest(col.id, {
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
      });
      Toast.success('Request saved');

      // Associate the new tab with the saved request
      if (savedReq && savedReq.id) {
        store.setState({ requestId: savedReq.id, collectionId: col.id });
      }
    }
    refreshCollections();
  });

  function kvToArray(rows) {
    const obj = {};
    for (const r of rows) {
      if (r.enabled && r.key) obj[r.key] = r.value;
    }
    return obj;
  }

  // Initial load
  refreshCollections();

  // Expose for other components
  window.refreshCollections = refreshCollections;
})();
