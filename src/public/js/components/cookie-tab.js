import { store } from '../store.js';
import { escapeHtml } from '../utils/template.js';

// Response Cookies tab 组件
const cookiesEl = document.getElementById('response-cookies');

function render(setCookies) {
  if (!setCookies || setCookies.length === 0) {
    cookiesEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="8" cy="10" r="1" fill="currentColor"/><circle cx="14" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="14" r="1" fill="currentColor"/></svg>
        </div>
        <div class="empty-state-title">此响应没有设置 Cookie</div>
      </div>`;
    return;
  }

  let html = '<div class="cookie-tab-list">';
  for (const c of setCookies) {
    const actionClass = c.cookie_action === 'added' ? 'cookie-action-added' : 'cookie-action-updated';
    const actionLabel = c.cookie_action === 'added' ? '新增' : '更新';

    const flags = [];
    if (c.http_only) flags.push('HttpOnly');
    if (c.secure) flags.push('Secure');
    if (c.same_site) flags.push(c.same_site);

    html += `
      <div class="cookie-tab-item ${actionClass}">
        <div class="cookie-tab-header">
          <span class="cookie-tab-name">${escapeHtml(c.name)}</span>
          <span class="cookie-tab-action ${actionClass}">${actionLabel}</span>
        </div>
        <div class="cookie-tab-details">
          <div class="cookie-tab-row">
            <span class="cookie-tab-label">Value</span>
            <span class="cookie-tab-value">${escapeHtml(c.value)}</span>
          </div>
          <div class="cookie-tab-row">
            <span class="cookie-tab-label">Domain</span>
            <span class="cookie-tab-value">${escapeHtml(c.domain)}</span>
          </div>
          <div class="cookie-tab-row">
            <span class="cookie-tab-label">Path</span>
            <span class="cookie-tab-value">${escapeHtml(c.path)}</span>
          </div>
          ${c.expires_at ? `
          <div class="cookie-tab-row">
            <span class="cookie-tab-label">Expires</span>
            <span class="cookie-tab-value">${escapeHtml(new Date(c.expires_at).toLocaleString())}</span>
          </div>
          ` : ''}
          ${flags.length > 0 ? `
          <div class="cookie-tab-row">
            <span class="cookie-tab-label">Flags</span>
            <span class="cookie-tab-value">${flags.map(f => `<span class="cookie-flag">${f}</span>`).join(' ')}</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  html += '</div>';
  cookiesEl.innerHTML = html;
}

// 监听请求完成事件，更新 Cookies tab
store.on('request:complete', (data) => {
  render(data?.set_cookies);
});

store.on('request:error', () => {
  cookiesEl.innerHTML = '';
});

store.on('request:start', () => {
  cookiesEl.innerHTML = '';
});

// 切换 tab 时恢复
store.on('tab:switch', () => {
  const tab = store.getActiveTab();
  if (tab?.response?.set_cookies) {
    render(tab.response.set_cookies);
  } else {
    cookiesEl.innerHTML = '';
  }
});

// 初始状态
cookiesEl.innerHTML = '';
