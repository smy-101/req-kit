// Environment manager component
(function() {
  const envSelect = document.getElementById('active-env');
  const manageBtn = document.getElementById('btn-manage-env');

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

    modal.innerHTML = `
      <h3>Manage Environments</h3>
      <div id="env-list-modal" class="env-list"></div>
      <div style="margin-top:12px">
        <input type="text" id="new-env-name" placeholder="New environment name"
          style="background:var(--bg-2);border:1px solid var(--border-0);color:var(--text-1);padding:6px 10px;border-radius:var(--radius);font-size:12px;width:60%">
        <button id="create-env-btn" class="modal-btn modal-btn-primary">Create</button>
      </div>
      <div id="env-vars-editor" style="margin-top:16px"></div>
      <div class="modal-actions">
        <button id="close-env-modal" class="modal-btn modal-btn-secondary">Close</button>
      </div>
    `;

    const listEl = document.getElementById('env-list-modal');
    for (const env of envs) {
      const item = document.createElement('div');
      item.className = 'env-item';
      item.innerHTML = `
        <span class="env-name">${escapeHtml(env.name)}</span>
        <button class="modal-btn modal-btn-secondary edit-env-btn" data-id="${env.id}">Edit</button>
        <button class="modal-btn modal-btn-secondary delete-env-btn" data-id="${env.id}" style="color:var(--red)">Delete</button>
      `;
      listEl.appendChild(item);
    }

    // Create environment
    document.getElementById('create-env-btn').addEventListener('click', async () => {
      const name = document.getElementById('new-env-name').value.trim();
      if (!name) return;
      await api.createEnvironment(name);
      await refreshEnvironments();
      showEnvModal(); // Re-render
    });

    // Edit environment vars
    listEl.querySelectorAll('.edit-env-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const envId = parseInt(btn.dataset.id);
        const env = store.getState().environments.find(e => e.id === envId);
        if (env) showVarEditor(env);
      });
    });

    // Delete environment
    listEl.querySelectorAll('.delete-env-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const yes = await Dialogs.confirmDanger('Delete Environment', 'Delete this environment and all its variables?');
        if (yes) {
          await api.deleteEnvironment(parseInt(btn.dataset.id));
          Toast.info('Environment deleted');
          await refreshEnvironments();
          showEnvModal();
        }
      });
    });

    document.getElementById('close-env-modal').addEventListener('click', () => {
      overlay.classList.add('hidden');
    });

    overlay.classList.remove('hidden');
  }

  function showVarEditor(env) {
    const varsEl = document.getElementById('env-vars-editor');
    let vars = env.variables ? [...env.variables] : [];

    function renderVars() {
      varsEl.innerHTML = `<h4 style="font-size:13px;margin-bottom:8px;color:var(--text-0);font-weight:600">Variables for ${escapeHtml(env.name)}</h4>`;

      const editor = document.createElement('div');
      editor.className = 'kv-editor';

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
        row.querySelector('.kv-delete').addEventListener('click', () => { vars.splice(idx, 1); renderVars(); });
        editor.appendChild(row);
      });

      const addBtn = document.createElement('button');
      addBtn.className = 'modal-btn modal-btn-secondary';
      addBtn.style.cssText = 'margin-top:4px;font-size:11px;padding:4px 12px;';
      addBtn.textContent = '+ Add Variable';
      addBtn.addEventListener('click', () => { vars.push({ key: '', value: '', enabled: true }); renderVars(); });
      editor.appendChild(addBtn);

      const saveBtn = document.createElement('button');
      saveBtn.className = 'modal-btn modal-btn-primary';
      saveBtn.style.cssText = 'margin-top:8px;';
      saveBtn.textContent = 'Save Variables';
      saveBtn.addEventListener('click', async () => {
        await api.updateVariables(env.id, vars.filter(v => v.key));
        await refreshEnvironments();
        showEnvModal();
      });
      editor.appendChild(saveBtn);

      varsEl.appendChild(editor);
    }

    renderVars();
  }

  // Initial load
  refreshEnvironments();
})();
