import { api } from '../api.js';
import { escapeHtml } from '../utils/template.js';
import { Toast } from '../utils/toast.js';
import { Modal } from '../utils/modal.js';
import { createKVEditor } from '../utils/kv-editor.js';

export function init(refreshCollections) {
  const _refreshCollections = refreshCollections || (() => {});
  async function showCollectionVarModal(collectionId, collectionName) {
    const loaded = await api.getCollectionVariables(collectionId);
    const vars = loaded.map(v => ({ key: v.key, value: v.value || '', enabled: !!v.enabled }));

    const dialog = document.createElement('div');
    dialog.innerHTML = `
      <h3>集合变量: ${escapeHtml(collectionName)}</h3>
      <p class="modal-desc">这些变量对该集合下的所有请求生效，优先级高于环境变量和全局变量。</p>
      <div id="coll-var-editor"></div>
      <div class="modal-actions modal-actions-compact">
        <button id="close-coll-var-modal" class="modal-btn modal-btn-secondary">取消</button>
        <button id="save-coll-vars" class="modal-btn modal-btn-primary">保存</button>
      </div>
    `;

    Modal.open(dialog);

    const editor = createKVEditor(dialog.querySelector('#coll-var-editor'), { rows: vars, addLabel: '+ 添加变量' });

    dialog.querySelector('#close-coll-var-modal').addEventListener('click', () => Modal.close());
    dialog.querySelector('#save-coll-vars').addEventListener('click', async () => {
      const cleaned = editor.getRows().filter(r => r.key.trim()).map(r => ({ key: r.key.trim(), value: r.value || '', enabled: r.enabled }));
      await api.updateCollectionVariables(collectionId, cleaned);
      Toast.success('集合变量已保存');
      Modal.close();
      refreshCollections();
    });
  }

  function setupSidebarPatch() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') patchSidebar();
      }
    });
    const treeEl = document.getElementById('collection-tree');
    if (treeEl) observer.observe(treeEl, { childList: true, subtree: true });
  }

  function patchSidebar() {
    const treeEl = document.getElementById('collection-tree');
    if (!treeEl) return;
    treeEl.querySelectorAll('.tree-item').forEach(item => {
      if (item.querySelector('.coll-var-btn')) return;
      if (item.querySelector('.method-badge')) return;
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
        showCollectionVarModal(parseInt(collectionId), nameSpan.textContent);
      });
      item.appendChild(varBtn);
    });
  }

  setupSidebarPatch();
  requestAnimationFrame(patchSidebar);
}
