// URL bar component
(function() {
  const methodSelect = document.getElementById('method-select');
  const urlInput = document.getElementById('url-input');
  const sendBtn = document.getElementById('send-btn');

  // Initialize from store
  const state = store.getState();
  methodSelect.value = state.method;
  urlInput.value = state.url;

  // Method change
  methodSelect.addEventListener('change', () => {
    store.setState({ method: methodSelect.value });
    updateMethodColor();
  });

  // URL change
  urlInput.addEventListener('input', () => {
    store.setState({ url: urlInput.value });
  });

  // Send button
  sendBtn.addEventListener('click', async () => {
    const state = store.getState();
    if (!state.url) return;

    // Build headers object from key-value pairs
    const headers = {};
    for (const h of state.headers) {
      if (h.enabled && h.key) headers[h.key] = h.value;
    }

    // Build params
    const params = {};
    for (const p of state.params) {
      if (p.enabled && p.key) params[p.key] = p.value;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    store.emit('request:start');

    try {
      const data = await api.sendRequest({
        url: state.url,
        method: state.method,
        headers,
        params,
        body: state.body || undefined,
        body_type: state.bodyType,
        auth_type: state.authType,
        auth_config: state.authConfig,
        pre_request_script: state.preRequestScript,
        environment_id: state.activeEnv,
      });
      store.setState({ response: data });
      store.emit('request:complete', data);
    } catch (err) {
      store.setState({ response: { error: err.message } });
      store.emit('request:error', err);
    } finally {
      sendBtn.disabled = false;
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
    methodSelect.style.color = colors[methodSelect.value] || 'var(--text)';
  }
  updateMethodColor();

  // Listen for external state changes
  store.on('request:load', (data) => {
    methodSelect.value = data.method || 'GET';
    urlInput.value = data.url || '';
    store.setState({ method: methodSelect.value, url: urlInput.value });
    updateMethodColor();
  });
})();
