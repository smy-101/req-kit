import { escapeHtml } from './template.js';

/**
 * Create a reusable key-value editor.
 *
 * @param {HTMLElement} containerEl - DOM element to render into
 * @param {Object} options
 * @param {Array<{key:string, value:string, enabled:boolean}>} options.rows - initial row data
 * @param {Function} [options.onChange] - called with (rows) after user mutations (not setRows)
 * @param {boolean} [options.showDuplicate=false] - highlight duplicate keys
 * @param {{key:string, value:string}} [options.placeholder] - placeholder text
 * @param {string} [options.addLabel='+ Add Row'] - add button text
 * @returns {{ setRows: Function, getRows: Function, destroy: Function }}
 */
export function createKVEditor(containerEl, {
  rows = [],
  onChange = () => {},
  showDuplicate = false,
  placeholder = { key: 'Key', value: 'Value' },
  addLabel = '+ Add Row',
} = {}) {
  let _rows = rows.length > 0
    ? rows.map(r => ({ key: r.key || '', value: r.value || '', enabled: !!r.enabled }))
    : [{ key: '', value: '', enabled: true }];

  const _editor = document.createElement('div');
  _editor.className = 'kv-editor';
  containerEl.appendChild(_editor);

  function _notify() { onChange(_rows); }

  function _getKeyCounts() {
    const counts = {};
    for (const r of _rows) {
      if (r.key) counts[r.key] = (counts[r.key] || 0) + 1;
    }
    return counts;
  }

  function _updateDuplicateIndicators() {
    if (!showDuplicate) return;
    const keyCounts = _getKeyCounts();
    const rowEls = _editor.querySelectorAll('.kv-row');
    rowEls.forEach((rowEl, idx) => {
      const r = _rows[idx];
      const isDup = r && r.key && keyCounts[r.key] > 1;
      rowEl.classList.toggle('kv-duplicate', !!isDup);
      let warn = rowEl.querySelector('.kv-dup-warn');
      if (isDup && !warn) {
        warn = document.createElement('span');
        warn.className = 'kv-dup-warn';
        warn.textContent = '!';
        warn.title = 'Duplicate key';
        rowEl.appendChild(warn);
      } else if (!isDup && warn) {
        warn.remove();
      }
    });
  }

  function render() {
    _editor.innerHTML = '';

    _rows.forEach((row, idx) => {
      const keyCounts = showDuplicate ? _getKeyCounts() : {};
      const isDuplicate = showDuplicate && row.key && keyCounts[row.key] > 1;

      const rowEl = document.createElement('div');
      rowEl.className = 'kv-row' + (isDuplicate ? ' kv-duplicate' : '');
      rowEl.innerHTML = `
        <input type="checkbox" class="kv-enabled" ${row.enabled ? 'checked' : ''}>
        <input type="text" placeholder="${escapeHtml(placeholder.key)}" value="${escapeHtml(row.key)}" class="kv-key">
        <input type="text" placeholder="${escapeHtml(placeholder.value)}" value="${escapeHtml(row.value)}" class="kv-value">
        <button class="kv-delete" title="Remove">&times;</button>
      `;

      if (isDuplicate) {
        const warn = document.createElement('span');
        warn.className = 'kv-dup-warn';
        warn.textContent = '!';
        warn.title = 'Duplicate key';
        rowEl.appendChild(warn);
      }

      rowEl.querySelector('.kv-enabled').addEventListener('change', (e) => {
        _rows[idx].enabled = e.target.checked;
        _notify();
      });
      rowEl.querySelector('.kv-key').addEventListener('input', (e) => {
        _rows[idx].key = e.target.value;
        _notify();
        if (showDuplicate) _updateDuplicateIndicators();
      });
      rowEl.querySelector('.kv-value').addEventListener('input', (e) => {
        _rows[idx].value = e.target.value;
        _notify();
      });
      rowEl.querySelector('.kv-delete').addEventListener('click', () => {
        _rows.splice(idx, 1);
        render();
        _notify();
      });

      _editor.appendChild(rowEl);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'modal-btn modal-btn-secondary kv-add-btn';
    addBtn.textContent = addLabel;
    addBtn.addEventListener('click', () => {
      _rows.push({ key: '', value: '', enabled: true });
      render();
      _notify();
    });
    _editor.appendChild(addBtn);
  }

  function setRows(newRows) {
    _rows = newRows.length > 0
      ? newRows.map(r => ({ key: r.key || '', value: r.value || '', enabled: !!r.enabled }))
      : [{ key: '', value: '', enabled: true }];
    render();
    // Note: does NOT call onChange — setRows is programmatic, not a user mutation
  }

  function getRows() {
    return _rows.map(r => ({ ...r }));
  }

  function destroy() {
    _editor.remove();
    _rows = [];
  }

  render();

  return { setRows, getRows, destroy };
}
