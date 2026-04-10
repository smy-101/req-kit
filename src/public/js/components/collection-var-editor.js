import { api } from '../api.js';
import { escapeHtml } from '../utils/template.js';
import { Toast } from '../utils/toast.js';
import { refreshCollections } from './sidebar.js';
import { createKVEditor } from '../utils/kv-editor.js';

// Collection variable editor component - adds "Variables" tab to collection editing
async function showCollectionVarModal(collectionId, collectionName) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');

  const loaded = await api.getCollectionVariables(collectionId);
  const vars = loaded.map(v => ({ key: v.key, value: v.value || '', enabled: !!v.enabled }));

  modal.innerHTML = `
    <h3>集合变量: ${escapeHtml(collectionName)}</h3>
    <p class="modal-desc">这些变量对该集合下的所有请求生效，优先级高于环境变量和全局变量。</p>
    <div id="coll-var-editor"></div>
    <div class="modal-actions modal-actions-compact">
      <button id="close-coll-var-modal" class="modal-btn modal-btn-secondary">取消</button>
      <button id="save-coll-vars" class="modal-btn modal-btn-primary">保存</button>
    </div>
  `;

  const editor = createKVEditor(document.getElementById('coll-var-editor'), {
    rows: vars,
    addLabel: '+ 添加变量',
  });

  document.getElementById('close-coll-var-modal').addEventListener('click', () => {
    overlay.classList.add('hidden');
  });

  document.getElementById('save-coll-vars').addEventListener('click', async () => {
    const cleaned = editor.getRows()
      .filter(r => r.key.trim())
      .map(r => ({ key: r.key.trim(), value: r.value || '', enabled: r.enabled }));
    await api.updateCollectionVariables(collectionId, cleaned);
    Toast.success('集合变量已保存');
    overlay.classList.add('hidden');
    refreshCollections();
  });

  overlay.classList.remove('hidden');
}

// Watch for sidebar tree changes and patch in variable buttons
function setupSidebarPatch() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        patchSidebar();
      }
    }
  });
  const treeEl = document.getElementById('collection-tree');
  if (treeEl) {
    observer.observe(treeEl, { childList: true, subtree: true });
  }
}

function patchSidebar() {
  const treeEl = document.getElementById('collection-tree');
  if (!treeEl) return;

  treeEl.querySelectorAll('.tree-item').forEach(item => {
    if (item.querySelector('.coll-var-btn')) return;

    // 只给集合项添加，跳过请求项
    const methodBadge = item.querySelector('.method-badge');
    if (methodBadge) return;

    const nameSpan = item.querySelector('.name');
    if (!nameSpan) return;

    const wrapper = item.parentElement;
    const collectionId = wrapper?.dataset?.collectionId;
    if (!collectionId) return;

    const varBtn = document.createElement('button');
    varBtn.className = 'coll-var-btn';
    varBtn.title = 'Variables';
    varBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
    varBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = nameSpan.textContent;
      showCollectionVarModal(parseInt(collectionId), name);
    });
    item.appendChild(varBtn);
  });
}

// Initial patch attempt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupSidebarPatch();
    requestAnimationFrame(patchSidebar);
  });
} else {
  setupSidebarPatch();
  requestAnimationFrame(patchSidebar);
}
