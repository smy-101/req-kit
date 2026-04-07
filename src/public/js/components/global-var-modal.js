import { api } from '../api.js';
import { store } from '../store.js';
import { escapeHtml } from '../utils/template.js';
import { Toast } from '../utils/toast.js';
import { refreshGlobalVars } from './variable-preview.js';

// 全局变量管理模态框
export function showGlobalVarModal() {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');

  let vars = [...(store.getState().globalVariables || [])];

  function renderModal() {
    modal.innerHTML = `
      <h3>管理全局变量</h3>
      <p class="modal-desc">全局变量始终生效，优先级最低。当其他作用域存在同名变量时会被覆盖。</p>
      <div id="global-var-editor" class="kv-editor"></div>
      <div class="modal-actions modal-actions-compact">
        <button id="close-global-var-modal" class="modal-btn modal-btn-secondary">取消</button>
        <button id="save-global-vars" class="modal-btn modal-btn-primary">保存</button>
      </div>
    `;

    const editor = document.getElementById('global-var-editor');

    vars.forEach((v, idx) => {
      const row = document.createElement('div');
      row.className = 'kv-row';
      row.innerHTML = `
        <input type="checkbox" class="kv-enabled" ${v.enabled ? 'checked' : ''}>
        <input type="text" placeholder="Key" value="${escapeHtml(v.key)}" class="kv-key">
        <input type="text" placeholder="Value" value="${escapeHtml(v.value || '')}" class="kv-value">
        <button class="kv-delete" title="Remove">&times;</button>
      `;
      row.querySelector('.kv-enabled').addEventListener('change', (e) => { vars[idx].enabled = e.target.checked; });
      row.querySelector('.kv-key').addEventListener('input', (e) => { vars[idx].key = e.target.value; });
      row.querySelector('.kv-value').addEventListener('input', (e) => { vars[idx].value = e.target.value; });
      row.querySelector('.kv-delete').addEventListener('click', () => { vars.splice(idx, 1); renderModal(); });
      editor.appendChild(row);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'modal-btn modal-btn-secondary kv-add-btn';
    addBtn.textContent = '+ 添加变量';
    addBtn.addEventListener('click', () => { vars.push({ key: '', value: '', enabled: true }); renderModal(); });
    editor.appendChild(addBtn);

    document.getElementById('close-global-var-modal').addEventListener('click', () => {
      overlay.classList.add('hidden');
    });

    document.getElementById('save-global-vars').addEventListener('click', async () => {
      const cleaned = vars
        .filter(v => v.key.trim())
        .map(v => ({ key: v.key.trim(), value: v.value || '', enabled: !!v.enabled }));
      await api.updateGlobalVariables(cleaned);
      await refreshGlobalVars();
      Toast.success('全局变量已保存');
      overlay.classList.add('hidden');
    });
  }

  renderModal();
  overlay.classList.remove('hidden');
}
