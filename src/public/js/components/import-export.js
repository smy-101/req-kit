// Import/Export component
(function() {
  const importBtn = document.getElementById('btn-import');

  importBtn.addEventListener('click', () => showImportModal());

  function showImportModal() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');

    modal.innerHTML = `
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

    // Tab switching
    modal.querySelectorAll('[data-imex-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        modal.querySelectorAll('[data-imex-tab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('imex-import').classList.toggle('hidden', tab.dataset.imexTab !== 'import');
        document.getElementById('imex-export').classList.toggle('hidden', tab.dataset.imexTab !== 'export');
      });
    });

    // Import action
    document.getElementById('import-action-btn').addEventListener('click', async () => {
      const type = document.getElementById('import-type').value;
      const content = document.getElementById('import-content').value.trim();
      if (!content) return;

      if (type === 'curl') {
        const collections = store.getState().collections;
        let colId;
        if (collections.length === 0) {
          const col = await api.createCollection('Imported');
          colId = col.id;
          await window.refreshCollections();
        } else {
          colId = collections[0].id;
        }
        const result = await api.importCurl(content, colId);
        if (result.error) {
          Toast.error(result.error);
        } else {
          Toast.success('Imported successfully');
          await window.refreshCollections();
          overlay.classList.add('hidden');
        }
      } else if (type === 'postman') {
        const result = await api.importPostman(content);
        if (result.error) {
          Toast.error(result.error);
        } else {
          Toast.success('Postman collection imported');
          await window.refreshCollections();
          overlay.classList.add('hidden');
        }
      }
    });

    // Export list
    const exportList = document.getElementById('export-list');
    const collections = store.getState().collections;

    for (const col of collections) {
      const item = document.createElement('div');
      item.className = 'export-list-item';
      item.innerHTML = `
        <span class="export-list-item-name">${escapeHtml(col.name)}</span>
        <button class="modal-btn modal-btn-secondary export-col-btn" data-id="${col.id}">Postman</button>
      `;
      exportList.appendChild(item);
    }

    exportList.querySelectorAll('.export-col-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id);
        const data = await api.exportCollection(id);
        const json = JSON.stringify(data, null, 2);
        // Copy to clipboard
        await navigator.clipboard.writeText(json);
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Postman', 2000);
      });
    });

    document.getElementById('close-imex-modal').addEventListener('click', () => {
      overlay.classList.add('hidden');
    });

    overlay.classList.remove('hidden');
  }

})();
