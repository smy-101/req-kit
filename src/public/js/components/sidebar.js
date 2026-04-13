import { store } from '../store.js';
import { api } from '../api.js';
import { escapeHtml, InputDebounce } from '../utils/template.js';
import { showContextMenu } from '../utils/context-menu.js';
import { parseRequestRecord } from '../utils/request-data.js';
import { init as initSaveDialog } from './save-dialog.js';

export function init(openRunnerPanel, HistoryPanel) {
  const treeEl = document.getElementById('collection-tree');
  const newColBtn = document.getElementById('btn-new-collection');

  async function refreshCollections() {
    const collections = await api.getCollections();
    store.setState({ collections });
    renderTree(collections);
  }

  function renderTree(collections) {
    treeEl.innerHTML = '';

    const historySection = document.createElement('div');
    historySection.className = 'history-section';
    const historyHeader = document.createElement('div');
    historyHeader.className = 'history-header';
    historyHeader.innerHTML = `
      <span class="history-header-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>History</span>
      </span>
      <svg class="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

    let historyPanelEl = null;
    let expanded = false;

    historyHeader.addEventListener('click', async () => {
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

    for (const col of collections) treeEl.appendChild(renderCollectionNode(col));
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
    const hasRequests = collectionHasRequests(node);
    const item = createTreeItem(node.name, node.id, 'collection', depth, hasRequests);

    if (node.variables && node.variables.length > 0) {
      const varBadge = document.createElement('span');
      varBadge.className = 'coll-var-indicator';
      varBadge.textContent = `{${node.variables.length}}`;
      varBadge.title = `${node.variables.length} collection variables`;
      item.querySelector('.name')?.after(varBadge);
    }

    if (node.children && node.children.length > 0) {
      const children = document.createElement('div');
      children.className = 'tree-children';
      for (const child of node.children) children.appendChild(renderCollectionNode(child, depth + 1));
      wrapper.appendChild(children);
    }

    if (node.requests && node.requests.length > 0) {
      const reqs = document.createElement('div');
      reqs.className = 'tree-children';
      for (const req of node.requests) reqs.appendChild(createRequestItem(req, node.id, depth + 1));
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
    item.innerHTML = `<span class="icon">${type === 'history' ? icons.history : icons.folder}</span><span class="name">${escapeHtml(name)}</span>`;

    if (type === 'collection') {
      if (hasRequests) {
        const runBtn = document.createElement('button');
        runBtn.className = 'tree-run-btn'; runBtn.title = 'Run collection';
        runBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
        runBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openRunnerPanel(id, name);
        });
        item.appendChild(runBtn);
      }
      item.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        const { Dialogs } = await import('../utils/dialogs.js');
        const { Toast } = await import('../utils/toast.js');
        const yes = await Dialogs.confirmDanger('Delete Collection', `Delete collection "${name}" and all its requests?`);
        if (yes) { await api.deleteCollection(id); Toast.info('Collection deleted'); refreshCollections(); }
      });
    }
    return item;
  }

  function collectionHasRequests(node) {
    if (node.requests && node.requests.length > 0) return true;
    if (node.children) { for (const child of node.children) { if (collectionHasRequests(child)) return true; } }
    return false;
  }

  function createRequestItem(req, collectionId, depth = 0) {
    const item = document.createElement('div');
    item.className = 'tree-item';
    item.style.paddingLeft = `${8 + depth * 16}px`;
    item.innerHTML = `<span class="method-badge method-${req.method}">${req.method}</span><span class="name">${escapeHtml(req.name)}</span>`;

    item.addEventListener('click', () => loadRequest(req, collectionId));
    item.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      const { Toast } = await import('../utils/toast.js');
      const { Dialogs } = await import('../utils/dialogs.js');
      const action = await showContextMenu(e, [
        { label: '复制', value: 'duplicate' },
        { label: '删除', value: 'delete', danger: true },
      ]);
      if (action === 'duplicate') {
        const result = await api.duplicateRequest(req.id);
        if (result && !result.error) { Toast.success('请求已复制'); refreshCollections(); }
        else { Toast.error(result?.error || '复制失败'); }
      } else if (action === 'delete') {
        const yes = await Dialogs.confirmDanger('Delete Request', `Delete request "${req.name}"?`);
        if (yes) { await api.deleteRequest(collectionId, req.id); Toast.info('Request deleted'); refreshCollections(); }
      }
    });
    return item;
  }

  function loadRequest(req, collectionId) {
    InputDebounce.flush();
    const existing = store.findTabByMethodUrl(req.method, req.url);
    if (existing) { store.switchTab(existing.id); return; }
    store.createTab(parseRequestRecord({
      method: req.method, url: req.url, headers: req.headers, params: req.params,
      body: req.body, body_type: req.body_type, auth_type: req.auth_type, auth_config: req.auth_config,
      pre_request_script: req.pre_request_script, post_response_script: req.post_response_script,
      id: req.id, collection_id: collectionId,
    }));
  }

  newColBtn.addEventListener('click', async () => {
    const { Dialogs } = await import('../utils/dialogs.js');
    const { Toast } = await import('../utils/toast.js');
    const collections = store.getState().collections || [];
    const result = await Dialogs.promptWithParent('New Collection', collections);
    if (result) {
      await api.createCollection(result.name, result.parentId);
      Toast.success('Collection created');
      refreshCollections();
    }
  });

  refreshCollections();

  const { saveAsNewRequest, updateExistingRequest } = initSaveDialog(refreshCollections);
  return { refreshCollections, saveAsNewRequest, updateExistingRequest };
}
