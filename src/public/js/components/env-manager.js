import { api } from '../api.js';
import { store } from '../store.js';
import { escapeHtml } from '../utils/template.js';
import { Toast } from '../utils/toast.js';

// Environment manager component — 左右分栏布局
const envSelect = document.getElementById('active-env');
const manageBtn = document.getElementById('btn-manage-env');

// 当前状态
let selectedEnvId = null;  // 当前选中的环境 ID
let dirty = false;         // 变量是否有未保存修改
let pendingSwitchId = null; // 切换确认后要跳转的环境 ID

async function refreshEnvironments() {
  const envs = await api.getEnvironments();
  store.setState({ environments: envs });

  // Update select
  const currentVal = envSelect.value;
  envSelect.innerHTML = '<option value="">No Environment</option>';
  for (const env of envs) {
    const opt = document.createElement('option');
    opt.value = env.id;
    opt.textContent = env.name;
    envSelect.appendChild(opt);
  }
  envSelect.value = currentVal;
}

envSelect.addEventListener('change', () => {
  store.setState({ activeEnv: envSelect.value ? parseInt(envSelect.value) : null });
});

manageBtn.addEventListener('click', () => showEnvModal());

function showEnvModal() {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');
  const envs = store.getState().environments;

  // 重置状态
  selectedEnvId = null;
  dirty = false;

  modal.innerHTML = `
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
    </div>
  `;

  renderEnvList(envs);

  // Create environment
  document.getElementById('create-env-btn').addEventListener('click', async () => {
    const input = document.getElementById('new-env-name');
    const name = input.value.trim();
    if (!name) return;
    await api.createEnvironment(name);
    input.value = '';
    await refreshEnvironments();
    renderEnvList(store.getState().environments);
  });

  // Enter key to create
  document.getElementById('new-env-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('create-env-btn').click();
    }
  });

  document.getElementById('close-env-modal').addEventListener('click', () => {
    overlay.classList.add('hidden');
  });

  overlay.classList.remove('hidden');
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
    nameSpan.className = 'env-name';
    nameSpan.textContent = env.name;

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'env-item-actions';

    const renameBtn = document.createElement('button');
    renameBtn.className = 'modal-btn modal-btn-secondary env-action-btn';
    renameBtn.textContent = 'Rename';
    renameBtn.title = 'Rename';
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startRename(env.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'modal-btn modal-btn-secondary env-action-btn btn-danger-text';
    deleteBtn.textContent = 'Delete';
    deleteBtn.title = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startDelete(env.id);
    });

    actionsDiv.appendChild(renameBtn);
    actionsDiv.appendChild(deleteBtn);

    item.appendChild(nameSpan);
    item.appendChild(actionsDiv);

    // 点击环境名切换
    item.addEventListener('click', () => {
      switchToEnv(env.id);
    });

    listEl.appendChild(item);
  }
}

async function switchToEnv(envId) {
  if (envId === selectedEnvId) return;

  if (dirty) {
    // 有未保存修改，弹出确认
    pendingSwitchId = envId;
    showUnsavedConfirm();
    return;
  }

  selectedEnvId = envId;
  dirty = false;
  renderEnvList(store.getState().environments);
  renderVarEditor();
}

function showUnsavedConfirm() {
  // 使用 Dialogs.confirm 风格自定义三选一对话框
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');

  // 保存当前 modal 内容
  const savedContent = modal.innerHTML;

  modal.innerHTML = '';
  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';
  dialog.addEventListener('click', (e) => e.stopPropagation());

  const titleEl = document.createElement('div');
  titleEl.className = 'confirm-dialog-title';
  titleEl.textContent = 'Unsaved Changes';
  dialog.appendChild(titleEl);

  const msgEl = document.createElement('div');
  msgEl.className = 'confirm-dialog-message';
  msgEl.textContent = 'You have unsaved variable changes. What would you like to do?';
  dialog.appendChild(msgEl);

  const actions = document.createElement('div');
  actions.className = 'confirm-dialog-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'modal-btn modal-btn-secondary';
  cancelBtn.textContent = 'Cancel';

  const discardBtn = document.createElement('button');
  discardBtn.className = 'modal-btn modal-btn-danger';
  discardBtn.textContent = 'Discard';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'modal-btn modal-btn-primary';
  saveBtn.textContent = 'Save';

  actions.appendChild(cancelBtn);
  actions.appendChild(discardBtn);
  actions.appendChild(saveBtn);
  dialog.appendChild(actions);

  // 恢复之前的 modal 内容
  function restore() {
    modal.innerHTML = savedContent;
    rebindAfterRestore();
    overlay.classList.remove('hidden');
  }

  cancelBtn.addEventListener('click', () => {
    pendingSwitchId = null;
    restore();
  });

  discardBtn.addEventListener('click', () => {
    const targetId = pendingSwitchId;
    pendingSwitchId = null;
    dirty = false;
    selectedEnvId = targetId;
    restore();
    renderEnvList(store.getState().environments);
    renderVarEditor();
  });

  saveBtn.addEventListener('click', async () => {
    const targetId = pendingSwitchId;
    pendingSwitchId = null;
    // 保存当前变量
    await saveCurrentVars();
    dirty = false;
    selectedEnvId = targetId;
    restore();
    renderEnvList(store.getState().environments);
    renderVarEditor();
  });

  modal.innerHTML = '';
  modal.appendChild(dialog);
}

function rebindAfterRestore() {
  // innerHTML 替换后 DOM 元素是全新的，用 onclick 赋值避免重复绑定
  const createBtn = document.getElementById('create-env-btn');
  const newEnvInput = document.getElementById('new-env-name');
  const closeBtn = document.getElementById('close-env-modal');

  if (createBtn) {
    createBtn.onclick = async () => {
      const name = newEnvInput.value.trim();
      if (!name) return;
      await api.createEnvironment(name);
      newEnvInput.value = '';
      await refreshEnvironments();
      renderEnvList(store.getState().environments);
    };
  }
  if (newEnvInput) {
    newEnvInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        document.getElementById('create-env-btn')?.click();
      }
    };
  }
  if (closeBtn) {
    closeBtn.onclick = () => {
      document.getElementById('modal-overlay').classList.add('hidden');
    };
  }
}

function renderVarEditor() {
  const varsEl = document.getElementById('env-vars-editor');
  if (!varsEl) return;

  if (!selectedEnvId) {
    varsEl.innerHTML = '<div class="env-placeholder">请选择一个环境</div>';
    return;
  }

  const env = store.getState().environments.find(e => e.id === selectedEnvId);
  if (!env) {
    varsEl.innerHTML = '<div class="env-placeholder">请选择一个环境</div>';
    return;
  }

  varsEl.innerHTML = '';
  const heading = document.createElement('h4');
  heading.className = 'env-var-heading';
  heading.textContent = 'Variables for ' + env.name;
  varsEl.appendChild(heading);

  // 用闭包持有当前变量副本
  let vars = env.variables ? env.variables.map(v => ({ ...v })) : [];
  dirty = false;

  const editor = document.createElement('div');
  editor.className = 'kv-editor';

  function renderVars() {
    // 检测重复 key
    const keyCount = {};
    for (const v of vars) {
      if (v.key) {
        keyCount[v.key] = (keyCount[v.key] || 0) + 1;
      }
    }

    editor.innerHTML = '';

    vars.forEach((v, idx) => {
      const row = document.createElement('div');
      const isDuplicate = v.key && keyCount[v.key] > 1;
      row.className = 'kv-row' + (isDuplicate ? ' kv-duplicate' : '');
      row.innerHTML = `
        <input type="checkbox" class="kv-enabled" ${v.enabled ? 'checked' : ''}>
        <input type="text" placeholder="Key" value="${escapeHtml(v.key)}" class="kv-key">
        <input type="text" placeholder="Value" value="${escapeHtml(v.value || '')}" class="kv-value">
        <button class="kv-delete" title="Remove">&times;</button>
      `;

      if (isDuplicate) {
        const warn = document.createElement('span');
        warn.className = 'kv-dup-warn';
        warn.textContent = '!';
        warn.title = 'Duplicate key';
        row.appendChild(warn);
      }

      row.querySelector('.kv-enabled').addEventListener('change', (e) => {
        vars[idx].enabled = e.target.checked;
        dirty = true;
      });
      row.querySelector('.kv-key').addEventListener('input', (e) => {
        vars[idx].key = e.target.value;
        dirty = true;
        updateDuplicateIndicators();
      });
      row.querySelector('.kv-value').addEventListener('input', (e) => {
        vars[idx].value = e.target.value;
        dirty = true;
      });
      row.querySelector('.kv-delete').addEventListener('click', () => {
        vars.splice(idx, 1);
        dirty = true;
        renderVars();
      });
      editor.appendChild(row);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'modal-btn modal-btn-secondary kv-add-btn';
    addBtn.textContent = '+ Add Variable';
    addBtn.addEventListener('click', () => {
      vars.push({ key: '', value: '', enabled: true });
      dirty = true;
      renderVars();
    });
    editor.appendChild(addBtn);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'modal-btn modal-btn-primary kv-save-btn';
    saveBtn.textContent = 'Save Variables';
    saveBtn.addEventListener('click', async () => {
      await saveCurrentVars();
    });
    editor.appendChild(saveBtn);
  }

  function updateDuplicateIndicators() {
    // 重新计算重复 key 并更新样式
    const keyCount = {};
    for (const v of vars) {
      if (v.key) keyCount[v.key] = (keyCount[v.key] || 0) + 1;
    }
    const rows = editor.querySelectorAll('.kv-row');
    rows.forEach((row, idx) => {
      const v = vars[idx];
      const isDup = v && v.key && keyCount[v.key] > 1;
      row.classList.toggle('kv-duplicate', !!isDup);
      // 更新或移除警告图标
      let warn = row.querySelector('.kv-dup-warn');
      if (isDup && !warn) {
        warn = document.createElement('span');
        warn.className = 'kv-dup-warn';
        warn.textContent = '!';
        warn.title = 'Duplicate key';
        row.appendChild(warn);
      } else if (!isDup && warn) {
        warn.remove();
      }
    });
  }

  // 保存变量（不重建 Modal）
  async function saveCurrentVars() {
    const envId = selectedEnvId;
    if (!envId) return;
    const toSave = vars.filter(v => v.key);
    await api.updateVariables(envId, toSave);
    await refreshEnvironments();
    // 刷新变量数据但不重建 Modal
    const updatedEnv = store.getState().environments.find(e => e.id === envId);
    if (updatedEnv) {
      vars = updatedEnv.variables ? updatedEnv.variables.map(v => ({ ...v })) : [];
    }
    dirty = false;
    renderVars();
    Toast.info('Variables saved');
  }

  varsEl.appendChild(editor);
  renderVars();
}

// 重命名环境 — 内联编辑
function startRename(envId) {
  const listEl = document.getElementById('env-list-modal');
  if (!listEl) return;
  const item = listEl.querySelector(`.env-item[data-id="${envId}"]`);
  if (!item) return;

  const env = store.getState().environments.find(e => e.id === envId);
  if (!env) return;

  const nameSpan = item.querySelector('.env-name');
  const actionsDiv = item.querySelector('.env-item-actions');

  // 替换名字为输入框
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'env-rename-input';
  input.value = env.name;
  nameSpan.replaceWith(input);
  input.focus();
  input.select();

  // 替换操作按钮为 确定/取消
  actionsDiv.innerHTML = '';
  const okBtn = document.createElement('button');
  okBtn.className = 'modal-btn modal-btn-primary env-action-btn';
  okBtn.textContent = 'OK';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'modal-btn modal-btn-secondary env-action-btn';
  cancelBtn.textContent = 'Cancel';
  actionsDiv.appendChild(okBtn);
  actionsDiv.appendChild(cancelBtn);

  async function doRename() {
    const newName = input.value.trim();
    if (!newName || newName === env.name) {
      renderEnvList(store.getState().environments);
      return;
    }
    await api.updateEnvironment(envId, newName);
    Toast.info('Environment renamed');
    await refreshEnvironments();
    renderEnvList(store.getState().environments);
    if (envId === selectedEnvId) renderVarEditor();
  }

  function cancelRename() {
    renderEnvList(store.getState().environments);
  }

  okBtn.addEventListener('click', (e) => { e.stopPropagation(); doRename(); });
  cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); cancelRename(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); doRename(); }
    else if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
  });
  // 阻止输入框点击冒泡到 env-item 的切换逻辑
  input.addEventListener('click', (e) => e.stopPropagation());
}

// 删除环境 — 内联确认
function startDelete(envId) {
  const listEl = document.getElementById('env-list-modal');
  if (!listEl) return;
  const item = listEl.querySelector(`.env-item[data-id="${envId}"]`);
  if (!item) return;

  const env = store.getState().environments.find(e => e.id === envId);
  if (!env) return;

  const actionsDiv = item.querySelector('.env-item-actions');

  // 替换操作按钮为确认提示
  actionsDiv.innerHTML = '';
  const msg = document.createElement('span');
  msg.className = 'env-delete-msg';
  msg.textContent = 'Delete?';
  const yesBtn = document.createElement('button');
  yesBtn.className = 'modal-btn modal-btn-danger env-action-btn';
  yesBtn.textContent = 'Yes';
  const noBtn = document.createElement('button');
  noBtn.className = 'modal-btn modal-btn-secondary env-action-btn';
  noBtn.textContent = 'No';
  actionsDiv.appendChild(msg);
  actionsDiv.appendChild(yesBtn);
  actionsDiv.appendChild(noBtn);

  async function doDelete() {
    await api.deleteEnvironment(envId);
    Toast.info('Environment deleted');
    await refreshEnvironments();
    if (envId === selectedEnvId) {
      selectedEnvId = null;
      dirty = false;
    }
    renderEnvList(store.getState().environments);
    renderVarEditor();
  }

  function cancelDelete() {
    renderEnvList(store.getState().environments);
  }

  yesBtn.addEventListener('click', (e) => { e.stopPropagation(); doDelete(); });
  noBtn.addEventListener('click', (e) => { e.stopPropagation(); cancelDelete(); });
}

// Initial load
refreshEnvironments();
