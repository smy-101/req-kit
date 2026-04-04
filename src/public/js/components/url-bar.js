// URL bar component
(function() {
  const methodSelect = document.getElementById('method-select');
  const urlInput = document.getElementById('url-input');
  const sendBtn = document.getElementById('send-btn');

  function restoreFromTab() {
    const tab = store.getActiveTab();
    if (!tab) return;
    methodSelect.value = tab.method;
    urlInput.value = tab.url;
    updateMethodColor();
  }

  // Initialize from active tab
  restoreFromTab();

  // Method change
  methodSelect.addEventListener('change', () => {
    store.setState({ method: methodSelect.value });
    updateMethodColor();
  });

  // URL change（防抖）
  urlInput.addEventListener('input', () => {
    InputDebounce.schedule('url', () => {
      store.setState({ url: urlInput.value });
    });
  });

  // Send button
  sendBtn.addEventListener('click', async () => {
    // Flush all pending input debounce to ensure store is up-to-date
    InputDebounce.flush();
    store.setState({ url: urlInput.value });

    const tab = store.getActiveTab();
    if (!tab || !tab.url) return;

    // Build headers object from key-value pairs
    const headers = {};
    for (const h of tab.headers) {
      if (h.enabled && h.key) headers[h.key] = h.value;
    }

    // Build params
    const params = {};
    for (const p of tab.params) {
      if (p.enabled && p.key) params[p.key] = p.value;
    }

    sendBtn.disabled = true;
    sendBtn.dataset.loading = 'true';
    sendBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="animation:spin .6s linear infinite;display:inline-block;vertical-align:middle;margin-right:6px"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Sending';

    store.emit('request:start');

    try {
      const data = await api.sendRequest({
        url: tab.url,
        method: tab.method,
        headers,
        params,
        body: tab.body || undefined,
        body_type: tab.bodyType,
        auth_type: tab.authType,
        auth_config: tab.authConfig,
        pre_request_script: tab.preRequestScript,
        environment_id: store.getState().activeEnv,
        collection_id: tab.collectionId,
        runtime_vars: store.getState().runtimeVars,
      });

      // 合并脚本返回的 runtime 变量
      if (data.script_variables) {
        const merged = { ...store.getState().runtimeVars, ...data.script_variables };
        store.setState({ runtimeVars: merged });
      }

      store.setState({ response: data });
      store.emit('request:complete', data);
    } catch (err) {
      if (err.name === 'AbortError') return; // 被取消的请求，静默忽略
      store.setState({ response: { error: err.message } });
      store.emit('request:error', err);
    } finally {
      sendBtn.disabled = false;
      sendBtn.dataset.loading = 'false';
      sendBtn.textContent = 'Send';
    }
  });

  // Handle Ctrl+Enter to send
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      sendBtn.click();
    }
  });

  function updateMethodColor() {
    const colors = { GET: 'var(--green)', POST: 'var(--yellow)', PUT: 'var(--accent)', PATCH: 'var(--orange)', DELETE: 'var(--red)' };
    methodSelect.style.color = colors[methodSelect.value] || 'var(--text-1)';
  }
  updateMethodColor();

  // Restore on tab switch
  store.on('tab:switch', restoreFromTab);
})();
