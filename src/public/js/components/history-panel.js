import { api } from '../api.js';
import { store } from '../store.js';
import { escapeHtml, escapeAttr } from '../utils/template.js';
import { Toast } from '../utils/toast.js';
import { parseRequestRecord } from '../utils/request-data.js';

export function init() {
  const PAGE_SIZE = 20;
  const DEBOUNCE_MS = 300;
  const METHODS = ['ALL', 'GET', 'POST', 'PUT', 'DELETE'];

  let containerEl = null;
  let listWrap = null;
  let footerWrap = null;
  let searchInput = null;
  let chips = [];
  let state = { search: '', method: '', page: 1, items: [], total: 0, loading: false };
  let debounceTimer = null;
  let refreshDebounceTimer = null;

  function render(container) {
    containerEl = container;
    containerEl.innerHTML = '';

    const searchWrap = document.createElement('div');
    searchWrap.className = 'history-search';
    searchInput = document.createElement('input');
    searchInput.type = 'text'; searchInput.placeholder = '搜索 URL...'; searchInput.className = 'history-search-input';
    searchInput.value = state.search;
    searchInput.addEventListener('input', (e) => {
      state.search = e.target.value;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { state.page = 1; loadHistory(); }, DEBOUNCE_MS);
    });
    searchWrap.appendChild(searchInput);
    containerEl.appendChild(searchWrap);

    const chipsWrap = document.createElement('div');
    chipsWrap.className = 'history-chips';
    chips = [];
    for (const m of METHODS) {
      const chip = document.createElement('button');
      chip.className = 'history-chip' + ((m === 'ALL' && !state.method) || m === state.method ? ' active' : '');
      chip.textContent = m;
      chip.addEventListener('click', () => {
        state.method = m === 'ALL' ? '' : m; state.page = 1;
        for (const c of chips) { const chipMethod = c.textContent; c.classList.toggle('active', (chipMethod === 'ALL' && !state.method) || chipMethod === state.method); }
        loadHistory();
      });
      chips.push(chip);
      chipsWrap.appendChild(chip);
    }
    containerEl.appendChild(chipsWrap);

    listWrap = document.createElement('div');
    listWrap.className = 'history-list';
    containerEl.appendChild(listWrap);

    footerWrap = document.createElement('div');
    footerWrap.className = 'history-footer';
    containerEl.appendChild(footerWrap);

    renderList();
  }

  function renderList() {
    listWrap.innerHTML = '';
    if (state.loading) listWrap.innerHTML = '<div class="history-empty">加载中...</div>';
    else if (state.items.length === 0) listWrap.innerHTML = '<div class="history-empty">暂无历史记录</div>';
    else { for (const item of state.items) listWrap.appendChild(renderItem(item)); }

    footerWrap.innerHTML = '';
    const hasMore = state.items.length < state.total;
    if (hasMore) {
      const moreBtn = document.createElement('button');
      moreBtn.className = 'history-more-btn'; moreBtn.textContent = '加载更多';
      moreBtn.addEventListener('click', () => { state.page++; loadHistory(true); });
      footerWrap.appendChild(moreBtn);
    }

    const clearBtn = document.createElement('button');
    clearBtn.className = 'history-clear-btn'; clearBtn.textContent = '清空历史';
    clearBtn.addEventListener('click', async () => {
      const yes = await (await import('../utils/dialogs.js')).Dialogs.confirmDanger('清空历史', '确定要清空所有历史记录吗？此操作不可撤销。');
      if (yes) { await api.clearHistory(); state.items = []; state.total = 0; state.page = 1; renderList(); Toast.info('历史记录已清空'); }
    });
    footerWrap.appendChild(clearBtn);
  }

  function renderItem(item) {
    const el = document.createElement('div');
    el.className = 'history-item';
    const urlText = item.url || '';
    const displayUrl = urlText.length > 40 ? urlText.substring(0, 40) + '...' : urlText;
    const statusClass = item.status && item.status < 400 ? 'status-ok' : 'status-err';
    const timeAgo = relativeTime(item.created_at);
    const safeMethod = escapeHtml(item.method || '');
    const safeStatus = escapeHtml(String(item.status || '-'));
    el.innerHTML = `
      <span class="method-badge method-${safeMethod}">${safeMethod}</span>
      <div class="history-item-info">
        <div class="history-item-url" title="${escapeAttr(urlText)}">${escapeHtml(displayUrl)}</div>
        <div class="history-item-meta">
          <span class="history-status ${statusClass}">${safeStatus}</span>
          <span class="history-time">${item.response_time != null ? item.response_time + 'ms' : ''}</span>
          <span class="history-ago">${timeAgo}</span>
        </div>
      </div>`;
    el.addEventListener('click', () => loadHistoryItem(item.id));
    return el;
  }

  async function loadHistory(append = false) {
    state.loading = true;
    renderList();
    try {
      const result = await api.getHistory(state.page, PAGE_SIZE, state.search, state.method);
      if (append) state.items = [...state.items, ...result.items];
      else state.items = result.items;
      state.total = result.total;
    } catch (e) { console.error('Failed to load history:', e); }
    state.loading = false;
    renderList();
  }

  async function loadHistoryItem(id) {
    try {
      const record = await api.getHistoryItem(id);
      if (!record || record.error) return;

      const response = record.status ? {
        status: record.status,
        headers: record.response_headers ? JSON.parse(record.response_headers) : {},
        body: record.response_body || '',
        time: record.response_time,
        size: record.response_size,
      } : null;

      const tabData = parseRequestRecord({
        method: record.method, url: record.url,
        headers: record.request_headers, params: record.request_params,
        body: record.request_body, body_type: record.body_type,
        auth_type: record.auth_type, auth_config: record.auth_config,
        pre_request_script: record.pre_request_script, post_response_script: record.post_response_script,
        history_id: record.id,
      });
      tabData.response = response;

      const existing = store.findTabByMethodUrl(record.method || 'GET', record.url || '');
      if (existing) { store.switchTab(existing.id); return; }
      store.createTab(tabData);
    } catch (e) { console.error('Failed to load history item:', e); }
  }

  function relativeTime(dateStr) {
    if (!dateStr) return '';
    const now = Date.now();
    const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    const diff = Math.max(0, Math.floor((now - date.getTime()) / 1000));
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
    if (diff < 2592000) return Math.floor(diff / 86400) + '天前';
    return Math.floor(diff / 2592000) + '月前';
  }

  store.on('request:complete', (data) => {
    if (data?.cleaned > 0) Toast.info(`已自动清理 ${data.cleaned} 条旧记录`);
    if (containerEl) { clearTimeout(refreshDebounceTimer); refreshDebounceTimer = setTimeout(() => HistoryPanel.refresh(), 500); }
  });
  store.on('request:error', () => {
    if (containerEl) { clearTimeout(refreshDebounceTimer); refreshDebounceTimer = setTimeout(() => HistoryPanel.refresh(), 500); }
  });

  const HistoryPanel = {
    mount(container) { clearTimeout(refreshDebounceTimer); render(container); loadHistory(); },
    refresh() { clearTimeout(refreshDebounceTimer); state.page = 1; loadHistory(); },
  };

  return { HistoryPanel };
}
