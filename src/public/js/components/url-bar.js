import { store } from '../store.js';
import { api } from '../api.js';
import { InputDebounce } from '../utils/template.js';
import { refreshCookieCount } from './cookie-manager.js';

// URL bar component
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
  // If request is in-flight, cancel it
  if (sendBtn.dataset.loading === 'true') {
    api.abortCurrent();
    return;
  }

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

  sendBtn.disabled = false;
  sendBtn.dataset.loading = 'true';
  sendBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Cancel';

  store.emit('request:start');

  try {
    // Build body based on type
    let reqBody = tab.body || undefined;
    if (tab.bodyType === 'multipart') {
      reqBody = { parts: tab.multipartParts || [] };
    } else if (tab.bodyType === 'binary') {
      reqBody = tab.binaryFile || undefined;
    } else if (tab.bodyType === 'graphql') {
      // 序列化 GraphQL body：仅对 variables 做模板替换，query 不替换
      const graphqlBody: Record<string, string> = { query: tab.graphqlQuery || '' };
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
      // 确保 Content-Type 为 application/json
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

    // 合并脚本返回的 runtime 变量
    if (data.script_variables) {
      const merged = { ...store.getState().runtimeVars, ...data.script_variables };
      store.setState({ runtimeVars: merged });
    }
    if (data.post_script_variables) {
      const merged = { ...store.getState().runtimeVars, ...data.post_script_variables };
      store.setState({ runtimeVars: merged });
    }
    if (data.script_tests) {
      store.setState({ scriptTests: data.script_tests });
    }

    store.setState({ response: data });
    store.emit('request:complete', data);

    // 请求完成后刷新 cookie 数量（可能有新的 Set-Cookie）
    if (data.set_cookies && data.set_cookies.length > 0) {
      refreshCookieCount();
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
