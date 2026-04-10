import { store } from '../store.js';
import { api } from '../api.js';
import { escapeHtml } from '../utils/template.js';
import { Toast } from '../utils/toast.js';
import { Dialogs } from '../utils/dialogs.js';
import { Modal } from '../utils/modal.js';

export function init() {
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
      </div>`;
  }

  function showCookieModal() {
    let cookies = [];

    async function loadCookies() {
      const result = await api.getCookies();
      cookies = result.cookies || [];
      renderModal();
    }

    function renderModal() {
      const groups = new Map();
      for (const c of cookies) {
        const domain = c.domain || '(unknown)';
        if (!groups.has(domain)) groups.set(domain, []);
        groups.get(domain).push(c);
      }

      const dialog = document.createElement('div');
      dialog.innerHTML = `
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
              <div class="cookie-domain-items">${items.map(c => renderCookieItem(c)).join('')}</div>
            </div>`).join('')}
        </div>
        <div class="modal-actions modal-actions-compact">
          <button id="close-cookie-modal" class="modal-btn modal-btn-secondary">关闭</button>
        </div>`;

      Modal.open(dialog);

      dialog.querySelector('#close-cookie-modal').addEventListener('click', () => Modal.close());
      dialog.querySelector('#clear-all-cookies').addEventListener('click', async () => {
        const yes = await Dialogs.confirmDanger('清空所有 Cookie', '确定要删除所有 Cookie 吗？');
        if (yes) { await api.clearAllCookies(); Toast.success('所有 Cookie 已清空'); await loadCookies(); refreshCookieCount(); }
      });

      dialog.querySelectorAll('.cookie-domain-header').forEach(header => {
        header.addEventListener('click', (e) => {
          if (e.target.closest('.cookie-domain-clear')) return;
          header.closest('.cookie-domain-group').classList.toggle('collapsed');
        });
      });

      dialog.querySelectorAll('.cookie-domain-clear').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await api.deleteCookiesByDomain(btn.dataset.domain);
          Toast.success(`${btn.dataset.domain} 下 Cookie 已清空`);
          await loadCookies(); refreshCookieCount();
        });
      });

      dialog.querySelectorAll('.cookie-item-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          await api.deleteCookie(Number(btn.dataset.id));
          Toast.success('Cookie 已删除');
          await loadCookies(); refreshCookieCount();
        });
      });
    }

    loadCookies();
  }

  async function refreshCookieCount() {
    try {
      const result = await api.getCookies();
      const count = (result.cookies || []).length;
      store.setState({ cookieCount: count });
      const countEl = document.getElementById('cookie-count');
      if (countEl) { countEl.textContent = count; countEl.classList.toggle('has-vars', count > 0); }
    } catch {}
  }

  const manageBtn = document.getElementById('btn-manage-cookies');
  if (manageBtn) manageBtn.addEventListener('click', () => showCookieModal());

  refreshCookieCount();
  store.on('cookies:updated', refreshCookieCount);

  return { showCookieModal, refreshCookieCount };
}
