import { api } from '../api.js';
import { store } from '../store.js';
import { escapeHtml } from '../utils/template.js';
import { Toast } from '../utils/toast.js';
import { Modal } from '../utils/modal.js';

export function init(refreshCollections) {
  const importBtn = document.getElementById('btn-import');

  importBtn.addEventListener('click', () => showImportModal());

  function showImportModal() {
    const dialog = document.createElement('div');
    dialog.innerHTML = `
      <h3>Import / Export</h3>
      <div class="tab-bar imex-tab-bar">
        <button class="tab active" data-imex-tab="import">Import</button>
        <button class="tab" data-imex-tab="export">Export</button>
      </div>
      <div id="imex-import">
        <select id="import-type" class="import-type-select">
          <option value="curl">curl Command</option>
          <option value="postman">Postman Collection v2.1</option>
        </select>
        <textarea id="import-content" class="import-textarea" placeholder="Paste curl command or Postman Collection JSON..."></textarea>
        <div class="modal-actions">
          <button id="import-action-btn" class="modal-btn modal-btn-primary">Import</button>
        </div>
      </div>
      <div id="imex-export" class="hidden">
        <p class="export-hint">Select a collection to export:</p>
        <div id="export-list"></div>
      </div>
      <div class="modal-actions modal-actions-compact">
        <button id="close-imex-modal" class="modal-btn modal-btn-secondary">Close</button>
      </div>
    `;

    Modal.open(dialog);

    dialog.querySelectorAll('[data-imex-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        dialog.querySelectorAll('[data-imex-tab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        dialog.querySelector('#imex-import').classList.toggle('hidden', tab.dataset.imexTab !== 'import');
        dialog.querySelector('#imex-export').classList.toggle('hidden', tab.dataset.imexTab !== 'export');
      });
    });

    dialog.querySelector('#import-action-btn').addEventListener('click', async () => {
      const type = dialog.querySelector('#import-type').value;
      const content = dialog.querySelector('#import-content').value.trim();
      if (!content) return;

      if (type === 'curl') {
        const collections = store.getState().collections;
        let colId;
        if (collections.length === 0) {
          const col = await api.createCollection('Imported');
          colId = col.id;
          await refreshCollections();
        } else {
          colId = collections[0].id;
        }
        const result = await api.importCurl(content, colId);
        if (result.error) Toast.error(result.error);
        else { Toast.success('Imported successfully'); await refreshCollections(); Modal.close(); }
      } else if (type === 'postman') {
        const result = await api.importPostman(content);
        if (result.error) Toast.error(result.error);
        else { Toast.success('Postman collection imported'); await refreshCollections(); Modal.close(); }
      }
    });

    const exportList = dialog.querySelector('#export-list');
    const collections = store.getState().collections;
    for (const col of collections) {
      const item = document.createElement('div');
      item.className = 'export-list-item';
      item.innerHTML = `<span class="export-list-item-name">${escapeHtml(col.name)}</span><button class="modal-btn modal-btn-secondary export-col-btn" data-id="${col.id}">Postman</button>`;
      exportList.appendChild(item);
    }

    exportList.querySelectorAll('.export-col-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id);
        const data = await api.exportCollection(id);
        await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Postman', 2000);
      });
    });

    dialog.querySelector('#close-imex-modal').addEventListener('click', () => Modal.close());
  }
}
