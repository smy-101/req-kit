// Key-Value headers editor
function createKVEditor(containerId, storeKey) {
  const container = document.getElementById(containerId);
  let rows = store.getState()[storeKey] || [{ key: '', value: '', enabled: true }];

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
    addBtn.className = 'modal-btn modal-btn-secondary';
    addBtn.style.cssText = 'margin-top:4px;font-size:11px;padding:4px 12px;';
    addBtn.textContent = '+ Add Row';
    addBtn.addEventListener('click', () => {
      rows.push({ key: '', value: '', enabled: true });
      render();
      sync();
    });
    editor.appendChild(addBtn);

    container.appendChild(editor);
  }

  function sync() {
    store.setState({ [storeKey]: [...rows] });
  }

  function setRows(newRows) {
    rows = newRows.length > 0 ? [...newRows] : [{ key: '', value: '', enabled: true }];
    render();
  }

  function escapeHtml(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  render();
  return { setRows, getRows: () => rows };
}

// Initialize headers and params editors
const headersEditor = createKVEditor('tab-headers', 'headers');
const paramsEditor = createKVEditor('tab-params', 'params');
