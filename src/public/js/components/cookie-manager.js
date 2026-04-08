import { store } from '../store.js';
import { api } from '../api.js';
import { escapeHtml } from '../utils/template.js';
import { Toast } from '../utils/toast.js';
import { Dialogs } from '../utils/dialogs.js';

// Cookie 管理 modal 组件
export function showCookieModal() {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');

  let cookies = [];

  async function loadCookies() {
    const result = await api.getCookies();
    cookies = result.cookies || [];
    renderModal();
  }

  function renderModal() {
    // 按域名分组
    const groups = new Map();
    for (const c of cookies) {
      const domain = c.domain || '(unknown)';
      if (!groups.has(domain)) groups.set(domain, []);
      groups.get(domain).push(c);
    }

    modal.innerHTML = `
      <h3>管理 Cookies</h3>
      <div class="cookie-modal-toolbar">
        <span class="cookie-modal-total">${cookies.length} 条 Cookie</span>
        <button id="clear-all-cookies" class="modal-btn modal-btn-danger modal-btn-sm">清空全部</button>
      </div>
      <div class="cookie-modal-list">
        ${groups.size === 0 ? '<div class="cookie-empty-msg">暂无 Cookie</div>' : ''}
        ${[...groups.entries()].map(([domain, items]) => `
          <div class="cookie-domain-group">
            <div class="cookie-domain-header">
              <svg class="cookie-domain-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              <span class="cookie-domain-name">${escapeHtml(domain)}</span>
              <span class="cookie-domain-count">${items.length}</span>
              <button class="cookie-domain-clear modal-btn modal-btn-secondary modal-btn-sm" data-domain="${escapeHtml(domain)}">清空</button>
            </div>
            <div class="cookie-domain-items">
              ${items.map(c => renderCookieItem(c)).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      <div class="modal-actions modal-actions-compact">
        <button id="close-cookie-modal" class="modal-btn modal-btn-secondary">关闭</button>
      </div>
    `;

    // 绑定事件
    document.getElementById('close-cookie-modal').addEventListener('click', () => {
      overlay.classList.add('hidden');
    });

    document.getElementById('clear-all-cookies').addEventListener('click', async () => {
      const yes = await Dialogs.confirmDanger('清空所有 Cookie', '确定要删除所有 Cookie 吗？');
      if (yes) {
        await api.clearAllCookies();
        Toast.success('所有 Cookie 已清空');
        await loadCookies();
        refreshCookieCount();
      }
    });

    // 域名组折叠
    modal.querySelectorAll('.cookie-domain-header').forEach(header => {
      header.addEventListener('click', (e) => {
        // 不要在点击清空按钮时折叠
        if (e.target.closest('.cookie-domain-clear')) return;
        const group = header.closest('.cookie-domain-group');
        group.classList.toggle('collapsed');
      });
    });

    // 域名清空
    modal.querySelectorAll('.cookie-domain-clear').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const domain = btn.dataset.domain;
        await api.deleteCookiesByDomain(domain);
        Toast.success(`${domain} 下 Cookie 已清空`);
        await loadCookies();
        refreshCookieCount();
      });
    });

    // 单条删除
    modal.querySelectorAll('.cookie-item-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        await api.deleteCookie(id);
        Toast.success('Cookie 已删除');
        await loadCookies();
        refreshCookieCount();
      });
    });
  }

  loadCookies();
  overlay.classList.remove('hidden');
}

function renderCookieItem(c) {
  const flags = [];
  if (c.http_only) flags.push('HttpOnly');
  if (c.secure) flags.push('Secure');
  if (c.same_site) flags.push(c.same_site);

  const valueDisplay = c.value.length > 40 ? c.value.slice(0, 40) + '...' : c.value;
  const expiresDisplay = c.expires_at ? new Date(c.expires_at).toLocaleString() : 'Session';

  return `
    <div class="cookie-item">
      <div class="cookie-item-main">
        <span class="cookie-item-name">${escapeHtml(c.name)}</span>
        <span class="cookie-item-value">${escapeHtml(valueDisplay)}</span>
      </div>
      <div class="cookie-item-meta">
        <span class="cookie-item-path">Path: ${escapeHtml(c.path)}</span>
        ${expiresDisplay !== 'Session' ? `<span class="cookie-item-expires">Expires: ${escapeHtml(expiresDisplay)}</span>` : '<span class="cookie-item-session">Session</span>'}
        ${flags.length > 0 ? `<span class="cookie-item-flags">${flags.map(f => `<span class="cookie-flag">${f}</span>`).join('')}</span>` : ''}
      </div>
      <button class="cookie-item-delete" data-id="${c.id}" title="删除">&times;</button>
    </div>
  `;
}

export async function refreshCookieCount() {
  try {
    const result = await api.getCookies();
    const count = (result.cookies || []).length;
    store.setState({ cookieCount: count });
    const countEl = document.getElementById('cookie-count');
    if (countEl) {
      countEl.textContent = count;
      countEl.classList.toggle('has-vars', count > 0);
    }
  } catch {}
}

// Sidebar "manage cookies" button
const manageBtn = document.getElementById('btn-manage-cookies');
if (manageBtn) {
  manageBtn.addEventListener('click', () => showCookieModal());
}

// Load cookie count on init
refreshCookieCount();
