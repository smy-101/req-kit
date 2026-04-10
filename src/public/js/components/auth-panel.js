import { store } from '../store.js';
import { InputDebounce, escapeHtml } from '../utils/template.js';

export function init() {
  const container = document.getElementById('tab-auth');

  function render() {
    const tab = store.getActiveTab();
    const authType = tab ? (tab.authType || 'none') : 'none';
    const config = tab ? (tab.authConfig || {}) : {};

    container.innerHTML = `
      <select class="auth-type-select" id="auth-type-select">
        <option value="none" ${authType === 'none' ? 'selected' : ''}>None</option>
        <option value="bearer" ${authType === 'bearer' ? 'selected' : ''}>Bearer Token</option>
        <option value="basic" ${authType === 'basic' ? 'selected' : ''}>Basic Auth</option>
        <option value="apikey" ${authType === 'apikey' ? 'selected' : ''}>API Key</option>
      </select>
      <div id="auth-fields" class="auth-fields"></div>
    `;

    document.getElementById('auth-type-select').addEventListener('change', (e) => {
      store.setState({ authType: e.target.value, authConfig: {} });
      render();
    });

    const fieldsEl = document.getElementById('auth-fields');

    function debouncedAuthUpdate(updates) {
      InputDebounce.schedule('auth', () => {
        const t = store.getActiveTab();
        store.setState({ authConfig: { ...(t ? t.authConfig : {}), ...updates } });
      });
    }

    switch (authType) {
      case 'bearer':
        fieldsEl.innerHTML = `<label>Token <input type="text" id="auth-token" value="${escapeHtml(config.token || '')}" placeholder="Enter token"></label>`;
        fieldsEl.querySelector('#auth-token').addEventListener('input', (e) => debouncedAuthUpdate({ token: e.target.value }));
        break;
      case 'basic':
        fieldsEl.innerHTML = `<label>Username <input type="text" id="auth-username" value="${escapeHtml(config.username || '')}" placeholder="Username"></label><label>Password <input type="password" id="auth-password" value="${escapeHtml(config.password || '')}" placeholder="Password"></label>`;
        fieldsEl.querySelector('#auth-username').addEventListener('input', (e) => debouncedAuthUpdate({ username: e.target.value }));
        fieldsEl.querySelector('#auth-password').addEventListener('input', (e) => debouncedAuthUpdate({ password: e.target.value }));
        break;
      case 'apikey':
        fieldsEl.innerHTML = `<label>Key <input type="text" id="auth-apikey-key" value="${escapeHtml(config.key || '')}" placeholder="Header or param name"></label><label>Value <input type="text" id="auth-apikey-value" value="${escapeHtml(config.value || '')}" placeholder="API key value"></label><label>Add to <select id="auth-apikey-in"><option value="header" ${config.in !== 'query' ? 'selected' : ''}>Header</option><option value="query" ${config.in === 'query' ? 'selected' : ''}>Query Params</option></select></label>`;
        fieldsEl.querySelector('#auth-apikey-key').addEventListener('input', (e) => debouncedAuthUpdate({ key: e.target.value }));
        fieldsEl.querySelector('#auth-apikey-value').addEventListener('input', (e) => debouncedAuthUpdate({ value: e.target.value }));
        fieldsEl.querySelector('#auth-apikey-in').addEventListener('change', (e) => debouncedAuthUpdate({ in: e.target.value }));
        break;
    }
  }

  store.on('tab:switch', render);
  render();
}
