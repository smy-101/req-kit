import { store } from '../store.js';
import { api } from '../api.js';
import { escapeHtml } from '../utils/template.js';
import { Toast } from '../utils/toast.js';
import { Dialogs } from '../utils/dialogs.js';
import { HistoryPanel } from './history-panel.js';
import { openRunnerPanel } from './runner-panel.js';

// Sidebar component - collection tree
const treeEl = document.getElementById('collection-tree');
const newColBtn = document.getElementById('btn-new-collection');
const saveBtn = document.getElementById('save-btn');

// Load collections
export async function refreshCollections() {
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
    <span class="history-header-label">
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
      historyPanelEl.className = 'history-panel expanded';
      historySection.appendChild(historyPanelEl);
      HistoryPanel.mount(historyPanelEl);
    } else if (expanded && historyPanelEl) {
      historyPanelEl.classList.add('expanded');
      HistoryPanel.refresh();
    } else if (historyPanelEl) {
      historyPanelEl.classList.remove('expanded');
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
    empty.className = 'tree-empty-msg';
    empty.textContent = 'No collections yet';
    treeEl.appendChild(empty);
  }
}

function renderCollectionNode(node, depth = 0) {
  const wrapper = document.createElement('div');
  wrapper.dataset.collectionId = node.id;

  // 检查集合（含子集合）是否有请求
  const hasRequests = collectionHasRequests(node);

  const item = createTreeItem(node.name, node.id, 'collection', depth, hasRequests);

  // Add variables badge if collection has variables
  if (node.variables && node.variables.length > 0) {
    const varBadge = document.createElement('span');
    varBadge.className = 'coll-var-indicator';
    varBadge.textContent = `{${node.variables.length}}`;
    varBadge.title = `${node.variables.length} collection variables`;
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

function createTreeItem(name, id, type, depth = 0, hasRequests = false) {
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
    // 运行按钮（仅当集合含请求时显示）
    if (hasRequests) {
      const runBtn = document.createElement('button');
      runBtn.className = 'tree-run-btn';
      runBtn.title = 'Run collection';
      runBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      runBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openRunnerPanel(id, name);
      });
      item.appendChild(runBtn);
    }

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

/**
 * 递归检查集合（含子集合）是否有请求
 */
function collectionHasRequests(node) {
  if (node.requests && node.requests.length > 0) return true;
  if (node.children) {
    for (const child of node.children) {
      if (collectionHasRequests(child)) return true;
    }
  }
  return false;
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
    const action = await showContextMenu(e, [
      { label: '复制', value: 'duplicate' },
      { label: '删除', value: 'delete', danger: true },
    ]);

    if (action === 'duplicate') {
      const result = await api.duplicateRequest(req.id);
      if (result && !result.error) {
        Toast.success('请求已复制');
        refreshCollections();
      } else {
        Toast.error(result?.error || '复制失败');
      }
    } else if (action === 'delete') {
      const yes = await Dialogs.confirmDanger('Delete Request', `Delete request "${req.name}"?`);
      if (yes) {
        await api.deleteRequest(collectionId, req.id);
        Toast.info('Request deleted');
        refreshCollections();
      }
    }
  });

  return item;
}

function showContextMenu(e, items) {
  return new Promise((resolve) => {
    const menu = document.createElement('div');
    menu.className = 'context-menu';

    for (const item of items) {
      const btn = document.createElement('button');
      btn.className = 'context-menu-item' + (item.danger ? ' danger' : '');
      btn.textContent = item.label;
      btn.addEventListener('click', () => {
        menu.remove();
        resolve(item.value);
      });
      menu.appendChild(btn);
    }

    // Position
    const x = Math.min(e.clientX, window.innerWidth - 160);
    const y = Math.min(e.clientY, window.innerHeight - items.length * 36 - 10);
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    document.body.appendChild(menu);

    // Close on outside click
    const close = (ev) => {
      if (!menu.contains(ev.target)) {
        menu.remove();
        resolve(null);
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  });
}

function loadRequest(req, collectionId) {
  // Switch to existing tab if one has the same method + URL
  const existing = store.findTabByMethodUrl(req.method, req.url);
  if (existing) {
    store.switchTab(existing.id);
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

  // Parse body for multipart/binary
  const tabData = {
    method: req.method || 'GET',
    url: req.url || '',
    headers: headerRows,
    params: paramRows,
    body: req.body || '',
    bodyType: req.body_type || 'json',
    authType: req.auth_type || 'none',
    authConfig,
    preRequestScript: req.pre_request_script || '',
    postResponseScript: req.post_response_script || '',
    requestId: req.id,
    collectionId,
  };

  if (req.body_type === 'multipart' && req.body) {
    try {
      const parsed = JSON.parse(req.body);
      tabData.multipartParts = parsed.parts || [{ key: '', type: 'text', value: '' }];
      tabData.body = '';
    } catch (e) { console.warn('Failed to parse multipart body:', e); }
  } else if (req.body_type === 'binary' && req.body) {
    try {
      const parsed = JSON.parse(req.body);
      tabData.binaryFile = { data: parsed.data, filename: parsed.filename, contentType: parsed.contentType };
      tabData.body = '';
    } catch (e) { console.warn('Failed to parse binary body:', e); }
  } else if (req.body_type === 'graphql' && req.body) {
    try {
      const parsed = JSON.parse(req.body);
      tabData.graphqlQuery = parsed.query || '';
      tabData.graphqlVariables = parsed.variables || '';
      tabData.graphqlOperationName = parsed.operationName || '';
      tabData.body = '';
    } catch (e) { console.warn('Failed to parse graphql body:', e); }
  }

  // Create a new tab with the request data
  store.createTab(tabData);
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

// Save request as new (always opens collection selector, regardless of existing requestId)
export async function saveAsNewRequest() {
  const tab = store.getActiveTab();
  if (!tab) return;

  let cols = store.getState().collections;
  if (cols.length === 0) {
    const name = await Dialogs.prompt('Create a Collection', 'Collection name');
    if (!name) return;
    await api.createCollection(name);
    await refreshCollections();
  }
  cols = store.getState().collections;
  const items = cols.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

  const choice = await new Promise((resolve) => {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.addEventListener('click', e => e.stopPropagation());

    dialog.innerHTML = `
      <div class="confirm-dialog-title">Save Request</div>
      <input type="text" id="save-req-name" class="save-modal-name-input"
        value="${escapeHtml(tab.method + ' ' + tab.url)}" placeholder="Request name">
      <select id="save-col-select" class="save-modal-select">
        ${items}
      </select>
      <div class="confirm-dialog-actions save-modal-actions">
        <button class="modal-btn modal-btn-secondary" id="save-cancel">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="save-confirm">Save</button>
      </div>
    `;

    modal.innerHTML = '';
    modal.appendChild(dialog);
    overlay.classList.remove('hidden');

    dialog.querySelector('#save-confirm').onclick = () => {
      overlay.classList.add('hidden');
      resolve({
        collectionId: dialog.querySelector('#save-col-select').value,
        name: dialog.querySelector('#save-req-name').value.trim(),
      });
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
  const col = cols.find(c => c.id == choice.collectionId);
  if (!col) return;

  const reqName = choice.name || `${tab.method} ${tab.url}`;

  const savedReq = await api.addRequest(col.id, {
    name: reqName,
    method: tab.method,
    url: tab.url,
    headers: JSON.stringify(kvToArray(tab.headers)),
    params: JSON.stringify(kvToArray(tab.params)),
    body: serializeBody(tab),
    body_type: tab.bodyType,
    auth_type: tab.authType,
    auth_config: JSON.stringify(tab.authConfig),
    pre_request_script: tab.preRequestScript,
    post_response_script: tab.postResponseScript,
  });
  Toast.success('Request saved');

  if (savedReq && savedReq.id) {
    store.setState({ requestId: savedReq.id, collectionId: col.id, dirty: false });
  }
  refreshCollections();
}

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
      body: serializeBody(tab),
      body_type: tab.bodyType,
      auth_type: tab.authType,
      auth_config: JSON.stringify(tab.authConfig),
      pre_request_script: tab.preRequestScript,
      post_response_script: tab.postResponseScript,
    });
    Toast.success('Request updated');
    store.setState({ dirty: false });
    refreshCollections();
  } else {
    // Save new - need to pick a collection
    await saveAsNewRequest();
  }
});

function kvToArray(rows) {
  const obj = {};
  for (const r of rows) {
    if (r.enabled && r.key) obj[r.key] = r.value;
  }
  return obj;
}

// Serialize body for saving (multipart/binary/graphql stored as JSON)
function serializeBody(tab) {
  if (tab.bodyType === 'multipart') {
    return JSON.stringify({ parts: tab.multipartParts || [] });
  }
  if (tab.bodyType === 'binary' && tab.binaryFile) {
    return JSON.stringify(tab.binaryFile);
  }
  if (tab.bodyType === 'graphql') {
    const obj = { query: tab.graphqlQuery || '' };
    if (tab.graphqlVariables?.trim()) obj.variables = tab.graphqlVariables.trim();
    if (tab.graphqlOperationName?.trim()) obj.operationName = tab.graphqlOperationName.trim();
    return JSON.stringify(obj);
  }
  return tab.body;
}

// Initial load
refreshCollections();
