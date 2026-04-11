import { store } from '../store.js';
import { api } from '../api.js';
import { InputDebounce } from '../utils/template.js';

export function init() {
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

  restoreFromTab();

  methodSelect.addEventListener('change', () => {
    store.setState({ method: methodSelect.value });
    updateMethodColor();
  });

  urlInput.addEventListener('input', () => {
    InputDebounce.schedule('url', () => {
      store.setState({ url: urlInput.value });
    });
  });

  sendBtn.addEventListener('click', async () => {
    if (sendBtn.dataset.loading === 'true') {
      api.abortCurrent();
      return;
    }

    InputDebounce.flush();
    store.setState({ url: urlInput.value });

    const tab = store.getActiveTab();
    if (!tab || !tab.url) return;

    const headers = {};
    for (const h of tab.headers) {
      if (h.enabled && h.key) headers[h.key] = h.value;
    }

    const params = {};
    for (const p of tab.params) {
      if (p.enabled && p.key) params[p.key] = p.value;
    }

    sendBtn.disabled = false;
    sendBtn.dataset.loading = 'true';
    sendBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Cancel';

    store.emit('request:start');

    try {
      let reqBody = tab.body || undefined;
      if (tab.bodyType === 'multipart') {
        reqBody = { parts: tab.multipartParts || [] };
      } else if (tab.bodyType === 'binary') {
        reqBody = tab.binaryFile || undefined;
      } else if (tab.bodyType === 'graphql') {
        const graphqlBody = { query: tab.graphqlQuery || '' };
        if (tab.graphqlVariables?.trim()) {
          try {
            graphqlBody.variables = JSON.parse(tab.graphqlVariables.trim());
          } catch {
            graphqlBody.variables = tab.graphqlVariables.trim();
          }
        }
        if (tab.graphqlOperationName?.trim()) {
          graphqlBody.operationName = tab.graphqlOperationName.trim();
        }
        reqBody = JSON.stringify(graphqlBody);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      }

      const data = await api.sendRequest({
        url: tab.url,
        method: tab.method,
        headers,
        params,
        body: reqBody,
        body_type: tab.bodyType,
        auth_type: tab.authType,
        auth_config: tab.authConfig,
        pre_request_script: tab.preRequestScript,
        post_response_script: tab.postResponseScript,
        environment_id: store.getState().activeEnv,
        collection_id: tab.collectionId,
        runtime_vars: store.getState().runtimeVars,
        timeout: tab.options?.timeout,
        follow_redirects: tab.options?.followRedirects,
      });

      const updates = { response: data };
      if (data.script_tests) {
        updates.scriptTests = data.script_tests;
      }
      let mergedVars = { ...store.getState().runtimeVars };
      if (data.script_variables) Object.assign(mergedVars, data.script_variables);
      if (data.post_script_variables) Object.assign(mergedVars, data.post_script_variables);
      if (Object.keys(mergedVars).length > 0) {
        updates.runtimeVars = mergedVars;
      }
      store.setState(updates);
      store.emit('request:complete', data);

      if (data.set_cookies && data.set_cookies.length > 0) {
        store.emit('cookies:updated');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        store.setState({ response: { error: '请求已取消', cancelled: true } });
        store.emit('request:cancel');
        return;
      }
      store.setState({ response: { error: err.message } });
      store.emit('request:error', err);
    } finally {
      sendBtn.disabled = false;
      sendBtn.dataset.loading = 'false';
      sendBtn.textContent = 'Send';
    }
  });

  function updateMethodColor() {
    const colors = { GET: 'var(--green)', POST: 'var(--yellow)', PUT: 'var(--accent)', PATCH: 'var(--orange)', DELETE: 'var(--red)' };
    methodSelect.style.color = colors[methodSelect.value] || 'var(--text-1)';
  }
  updateMethodColor();

  store.on('tab:switch', restoreFromTab);
}
