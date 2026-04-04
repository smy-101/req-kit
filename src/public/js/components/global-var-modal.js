// 全局变量管理模态框
(function() {
  window.showGlobalVarModal = showGlobalVarModal;

  function showGlobalVarModal() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');

    let vars = [...(store.getState().globalVariables || [])];

    function renderModal() {
      modal.innerHTML = `
        <h3>管理全局变量</h3>
        <p style="color:var(--text-3);font-size:11px;margin:4px 0 12px">全局变量始终生效，优先级最低。当其他作用域存在同名变量时会被覆盖。</p>
        <div id="global-var-editor" class="kv-editor"></div>
        <div class="modal-actions" style="margin-top:16px">
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
        row.querySelector('.kv-enabled').addEventListener('change', (e) => { vars[idx].enabled = e.target.checked ? 1 : 0; });
        row.querySelector('.kv-key').addEventListener('input', (e) => { vars[idx].key = e.target.value; });
        row.querySelector('.kv-value').addEventListener('input', (e) => { vars[idx].value = e.target.value; });
        row.querySelector('.kv-delete').addEventListener('click', () => { vars.splice(idx, 1); renderModal(); });
        editor.appendChild(row);
      });

      const addBtn = document.createElement('button');
      addBtn.className = 'modal-btn modal-btn-secondary';
      addBtn.style.cssText = 'margin-top:4px;font-size:11px;padding:4px 12px;';
      addBtn.textContent = '+ 添加变量';
      addBtn.addEventListener('click', () => { vars.push({ key: '', value: '', enabled: 1 }); renderModal(); });
      editor.appendChild(addBtn);

      document.getElementById('close-global-var-modal').addEventListener('click', () => {
        overlay.classList.add('hidden');
      });

      document.getElementById('save-global-vars').addEventListener('click', async () => {
        const cleaned = vars
          .filter(v => v.key.trim())
          .map(v => ({ key: v.key.trim(), value: v.value || '', enabled: v.enabled ? true : false }));
        await api.updateGlobalVariables(cleaned);
        await window.refreshGlobalVars();
        Toast.success('全局变量已保存');
        overlay.classList.add('hidden');
      });
    }

    renderModal();
    overlay.classList.remove('hidden');
  }
})();
