import { store } from '../store.js';
import { api } from '../api.js';
import { Toast } from '../utils/toast.js';
import { Dialogs } from '../utils/dialogs.js';
import { Modal } from '../utils/modal.js';
import { createKVEditor } from '../utils/kv-editor.js';

export function init() {
  const envSelect = document.getElementById('active-env');
  const manageBtn = document.getElementById('btn-manage-env');

  let selectedEnvId = null;
  let dirty = false;
  let pendingSwitchId = null;
  let _varEditor = null;

  async function refreshEnvironments() {
    const envs = await api.getEnvironments();
    store.setState({ environments: envs });
    const currentVal = envSelect.value;
    envSelect.innerHTML = '<option value="">No Environment</option>';
    for (const env of envs) {
      const opt = document.createElement('option');
      opt.value = env.id; opt.textContent = env.name;
      envSelect.appendChild(opt);
    }
    envSelect.value = currentVal;
  }

  envSelect.addEventListener('change', () => {
    store.setState({ activeEnv: envSelect.value ? parseInt(envSelect.value) : null });
  });

  manageBtn.addEventListener('click', () => showEnvModal());

  function showEnvModal() {
    const envs = store.getState().environments;
    selectedEnvId = null;
    dirty = false;

    const dialog = document.createElement('div');
    dialog.addEventListener('click', e => e.stopPropagation());
    dialog.innerHTML = `
      <h3>Manage Environments</h3>
      <div class="env-split-panel">
        <div class="env-panel-left">
          <div id="env-list-modal" class="env-list"></div>
          <div class="env-new-area">
            <input type="text" id="new-env-name" placeholder="New environment name" class="env-new-input">
            <button id="create-env-btn" class="modal-btn modal-btn-primary env-create-btn">Create</button>
          </div>
        </div>
        <div class="env-panel-right">
          <div id="env-vars-editor" class="env-editor-content">
            <div class="env-placeholder">请选择一个环境</div>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button id="close-env-modal" class="modal-btn modal-btn-secondary">Close</button>
      </div>`;

    Modal.open(dialog);
    renderEnvList(envs);

    dialog.querySelector('#create-env-btn').addEventListener('click', async () => {
      const input = dialog.querySelector('#new-env-name');
      const name = input.value.trim();
      if (!name) return;
      await api.createEnvironment(name);
      input.value = '';
      await refreshEnvironments();
      renderEnvList(store.getState().environments);
    });

    dialog.querySelector('#new-env-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') dialog.querySelector('#create-env-btn').click();
    });

    dialog.querySelector('#close-env-modal').addEventListener('click', () => Modal.close());
  }

  function renderEnvList(envs) {
    const listEl = document.getElementById('env-list-modal');
    if (!listEl) return;
    listEl.innerHTML = '';

    for (const env of envs) {
      const item = document.createElement('div');
      item.className = 'env-item' + (env.id === selectedEnvId ? ' active' : '');
      item.dataset.id = env.id;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'env-name'; nameSpan.textContent = env.name;

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'env-item-actions';

      const renameBtn = document.createElement('button');
      renameBtn.className = 'modal-btn modal-btn-secondary env-action-btn'; renameBtn.textContent = 'Rename'; renameBtn.title = 'Rename';
      renameBtn.addEventListener('click', (e) => { e.stopPropagation(); startRename(env.id); });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'modal-btn modal-btn-secondary env-action-btn btn-danger-text'; deleteBtn.textContent = 'Delete'; deleteBtn.title = 'Delete';
      deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); startDelete(env.id); });

      actionsDiv.appendChild(renameBtn);
      actionsDiv.appendChild(deleteBtn);
      item.appendChild(nameSpan);
      item.appendChild(actionsDiv);

      item.addEventListener('click', () => switchToEnv(env.id));
      listEl.appendChild(item);
    }
  }

  async function switchToEnv(envId) {
    if (envId === selectedEnvId) return;
    if (dirty) {
      pendingSwitchId = envId;
      const result = await Dialogs.confirm('Unsaved Changes', 'You have unsaved variable changes. Discard changes and switch?');
      if (!result) { pendingSwitchId = null; return; }
      dirty = false;
      selectedEnvId = envId;
      renderEnvList(store.getState().environments);
      renderVarEditor();
      return;
    }
    selectedEnvId = envId;
    dirty = false;
    renderEnvList(store.getState().environments);
    renderVarEditor();
  }

  function renderVarEditor() {
    const varsEl = document.getElementById('env-vars-editor');
    if (!varsEl) return;
    if (!selectedEnvId) { varsEl.innerHTML = '<div class="env-placeholder">请选择一个环境</div>'; return; }

    const env = store.getState().environments.find(e => e.id === selectedEnvId);
    if (!env) { varsEl.innerHTML = '<div class="env-placeholder">请选择一个环境</div>'; return; }

    varsEl.innerHTML = '';
    const heading = document.createElement('h4');
    heading.className = 'env-var-heading'; heading.textContent = 'Variables for ' + env.name;
    varsEl.appendChild(heading);

    dirty = false;
    _varEditor = createKVEditor(varsEl, {
      rows: env.variables ? env.variables.map(v => ({ ...v })) : [],
      onChange() { dirty = true; },
      showDuplicate: true,
      addLabel: '+ Add Variable',
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'modal-btn modal-btn-primary kv-save-btn'; saveBtn.textContent = 'Save Variables';
    saveBtn.addEventListener('click', async () => { await saveCurrentVars(); });
    varsEl.appendChild(saveBtn);
  }

  async function saveCurrentVars() {
    const envId = selectedEnvId;
    if (!envId || !_varEditor) return;
    const toSave = _varEditor.getRows().filter(v => v.key);
    await api.updateVariables(envId, toSave);
    await refreshEnvironments();
    const updatedEnv = store.getState().environments.find(e => e.id === envId);
    if (updatedEnv) _varEditor.setRows(updatedEnv.variables || []);
    dirty = false;
    Toast.info('Variables saved');
  }

  function startRename(envId) {
    const listEl = document.getElementById('env-list-modal');
    if (!listEl) return;
    const item = listEl.querySelector(`.env-item[data-id="${envId}"]`);
    if (!item) return;
    const env = store.getState().environments.find(e => e.id === envId);
    if (!env) return;

    const nameSpan = item.querySelector('.env-name');
    const actionsDiv = item.querySelector('.env-item-actions');
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'env-rename-input'; input.value = env.name;
    nameSpan.replaceWith(input);
    input.focus(); input.select();

    actionsDiv.innerHTML = '';
    const okBtn = document.createElement('button');
    okBtn.className = 'modal-btn modal-btn-primary env-action-btn'; okBtn.textContent = 'OK';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn modal-btn-secondary env-action-btn'; cancelBtn.textContent = 'Cancel';
    actionsDiv.appendChild(okBtn);
    actionsDiv.appendChild(cancelBtn);

    async function doRename() {
      const newName = input.value.trim();
      if (!newName || newName === env.name) { renderEnvList(store.getState().environments); return; }
      await api.updateEnvironment(envId, newName);
      Toast.info('Environment renamed');
      await refreshEnvironments();
      renderEnvList(store.getState().environments);
      if (envId === selectedEnvId) renderVarEditor();
    }
    function cancelRename() { renderEnvList(store.getState().environments); }

    okBtn.addEventListener('click', (e) => { e.stopPropagation(); doRename(); });
    cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); cancelRename(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doRename(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
    });
    input.addEventListener('click', (e) => e.stopPropagation());
  }

  function startDelete(envId) {
    const listEl = document.getElementById('env-list-modal');
    if (!listEl) return;
    const item = listEl.querySelector(`.env-item[data-id="${envId}"]`);
    if (!item) return;

    const actionsDiv = item.querySelector('.env-item-actions');
    actionsDiv.innerHTML = '';
    const msg = document.createElement('span');
    msg.className = 'env-delete-msg'; msg.textContent = 'Delete?';
    const yesBtn = document.createElement('button');
    yesBtn.className = 'modal-btn modal-btn-danger env-action-btn'; yesBtn.textContent = 'Yes';
    const noBtn = document.createElement('button');
    noBtn.className = 'modal-btn modal-btn-secondary env-action-btn'; noBtn.textContent = 'No';
    actionsDiv.appendChild(msg);
    actionsDiv.appendChild(yesBtn);
    actionsDiv.appendChild(noBtn);

    async function doDelete() {
      await api.deleteEnvironment(envId);
      Toast.info('Environment deleted');
      await refreshEnvironments();
      if (envId === selectedEnvId) { selectedEnvId = null; dirty = false; }
      renderEnvList(store.getState().environments);
      renderVarEditor();
    }
    function cancelDelete() { renderEnvList(store.getState().environments); }

    yesBtn.addEventListener('click', (e) => { e.stopPropagation(); doDelete(); });
    noBtn.addEventListener('click', (e) => { e.stopPropagation(); cancelDelete(); });
  }

  refreshEnvironments();
}
