import { api } from '../api.js';
import { store } from '../store.js';
import { Toast } from '../utils/toast.js';
import { createKVEditor } from '../utils/kv-editor.js';
import { Modal } from '../utils/modal.js';

export function init(refreshGlobalVars) {
  function showGlobalVarModal() {
    const dialog = document.createElement('div');
    dialog.innerHTML = `
      <h3>管理全局变量</h3>
      <p class="modal-desc">全局变量始终生效，优先级最低。当其他作用域存在同名变量时会被覆盖。</p>
      <div id="global-var-editor"></div>
      <div class="modal-actions modal-actions-compact">
        <button id="close-global-var-modal" class="modal-btn modal-btn-secondary">取消</button>
        <button id="save-global-vars" class="modal-btn modal-btn-primary">保存</button>
      </div>`;

    Modal.open(dialog);

    const editor = createKVEditor(dialog.querySelector('#global-var-editor'), {
      rows: [...(store.getState().globalVariables || [])],
      addLabel: '+ 添加变量',
    });

    dialog.querySelector('#close-global-var-modal').addEventListener('click', () => Modal.close());
    dialog.querySelector('#save-global-vars').addEventListener('click', async () => {
      const cleaned = editor.getRows().filter(r => r.key.trim()).map(r => ({ key: r.key.trim(), value: r.value || '', enabled: r.enabled }));
      await api.updateGlobalVariables(cleaned);
      await refreshGlobalVars();
      Toast.success('全局变量已保存');
      Modal.close();
    });
  }

  return { showGlobalVarModal };
}
