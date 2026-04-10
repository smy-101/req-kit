import { store } from '../store.js';
import { api } from '../api.js';
import { escapeHtml } from '../utils/template.js';
import { Toast } from '../utils/toast.js';
import { Modal } from '../utils/modal.js';
import { kvToArray, serializeRequestBody } from '../utils/request-data.js';

export function init(refreshCollections) {
  async function saveAsNewRequest() {
    const tab = store.getActiveTab();
    if (!tab) return;

    let cols = store.getState().collections;
    if (cols.length === 0) {
      const { Dialogs } = await import('../utils/dialogs.js');
      const name = await Dialogs.prompt('Create a Collection', 'Collection name');
      if (!name) return;
      await api.createCollection(name);
      await refreshCollections();
    }
    cols = store.getState().collections;
    const items = cols.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

    const choice = await new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog';
      dialog.addEventListener('click', e => e.stopPropagation());
      dialog.innerHTML = `
        <div class="confirm-dialog-title">Save Request</div>
        <input type="text" id="save-req-name" class="save-modal-name-input" value="${escapeHtml(tab.method + ' ' + tab.url)}" placeholder="Request name">
        <select id="save-col-select" class="save-modal-select">${items}</select>
        <div class="confirm-dialog-actions save-modal-actions">
          <button class="modal-btn modal-btn-secondary" id="save-cancel">Cancel</button>
          <button class="modal-btn modal-btn-primary" id="save-confirm">Save</button>
        </div>`;

      Modal.open(dialog);

      dialog.querySelector('#save-confirm').onclick = () => {
        Modal.close();
        resolve({ collectionId: dialog.querySelector('#save-col-select').value, name: dialog.querySelector('#save-req-name').value.trim() });
      };
      dialog.querySelector('#save-cancel').onclick = () => { Modal.close(); resolve(null); };
    });

    if (!choice) return;
    const col = cols.find(c => c.id == choice.collectionId);
    if (!col) return;

    const reqName = choice.name || `${tab.method} ${tab.url}`;
    const savedReq = await api.addRequest(col.id, {
      name: reqName, method: tab.method, url: tab.url,
      headers: JSON.stringify(kvToArray(tab.headers)), params: JSON.stringify(kvToArray(tab.params)),
      body: serializeRequestBody(tab), body_type: tab.bodyType,
      auth_type: tab.authType, auth_config: JSON.stringify(tab.authConfig),
      pre_request_script: tab.preRequestScript, post_response_script: tab.postResponseScript,
    });
    Toast.success('Request saved');
    if (savedReq && savedReq.id) store.setState({ requestId: savedReq.id, collectionId: col.id, dirty: false });
    refreshCollections();
  }

  async function updateExistingRequest(tab) {
    await api.updateRequest(tab.collectionId, tab.requestId, {
      name: `${tab.method} ${tab.url}`, method: tab.method, url: tab.url,
      headers: JSON.stringify(kvToArray(tab.headers)), params: JSON.stringify(kvToArray(tab.params)),
      body: serializeRequestBody(tab), body_type: tab.bodyType,
      auth_type: tab.authType, auth_config: JSON.stringify(tab.authConfig),
      pre_request_script: tab.preRequestScript, post_response_script: tab.postResponseScript,
    });
    Toast.success('Request updated');
    store.setState({ dirty: false });
    refreshCollections();
  }

  return { saveAsNewRequest, updateExistingRequest };
}
