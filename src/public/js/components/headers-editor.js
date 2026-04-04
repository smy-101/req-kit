// Key-Value headers editor
function createKVEditor(containerId, storeKey) {
  const container = document.getElementById(containerId);
  let rows = [];

  function initRows() {
    const tab = store.getActiveTab();
    rows = tab && tab[storeKey] && tab[storeKey].length > 0
      ? [...tab[storeKey]]
      : [{ key: '', value: '', enabled: true }];
  }

  function render() {
    container.innerHTML = '';
    const editor = document.createElement('div');
    editor.className = 'kv-editor';

    rows.forEach((row, idx) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'kv-row';
      rowEl.innerHTML = `
        <input type="checkbox" class="kv-enabled" ${row.enabled ? 'checked' : ''}>
        <input type="text" placeholder="Key" value="${escapeHtml(row.key)}" class="kv-key">
        <input type="text" placeholder="Value" value="${escapeHtml(row.value)}" class="kv-value">
        <button class="kv-delete" title="Remove">&times;</button>
      `;

      rowEl.querySelector('.kv-enabled').addEventListener('change', (e) => {
        rows[idx].enabled = e.target.checked;
        sync();
      });
      rowEl.querySelector('.kv-key').addEventListener('input', (e) => {
        rows[idx].key = e.target.value;
        sync();
      });
      rowEl.querySelector('.kv-value').addEventListener('input', (e) => {
        rows[idx].value = e.target.value;
        sync();
      });
      rowEl.querySelector('.kv-delete').addEventListener('click', () => {
        rows.splice(idx, 1);
        if (rows.length === 0) rows.push({ key: '', value: '', enabled: true });
        render();
        sync();
      });

      editor.appendChild(rowEl);
    });

    // Add row button
    const addBtn = document.createElement('button');
    addBtn.className = 'modal-btn modal-btn-secondary kv-add-btn';
    addBtn.textContent = '+ Add Row';
    addBtn.addEventListener('click', () => {
      rows.push({ key: '', value: '', enabled: true });
      render();
      sync();
    });
    editor.appendChild(addBtn);

    container.appendChild(editor);
  }

  let _syncId = storeKey + '-sync';
  function sync() {
    InputDebounce.schedule(_syncId, () => {
      store.setState({ [storeKey]: [...rows] });
    });
  }

  function setRows(newRows) {
    rows = newRows.length > 0 ? [...newRows] : [{ key: '', value: '', enabled: true }];
    render();
  }

  initRows();
  render();

  // Re-render on tab switch
  store.on('tab:switch', () => {
    initRows();
    render();
  });

  return { setRows, getRows: () => rows };
}

// Initialize headers and params editors
const headersEditor = createKVEditor('tab-headers', 'headers');
const paramsEditor = createKVEditor('tab-params', 'params');
