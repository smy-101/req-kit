import { store } from '../store.js';
import { escapeHtml, emptyStateHTML, escapeAttr } from '../utils/template.js';
import { formatSize } from '../utils/format.js';
import { VirtualScroller } from '../utils/virtual-scroller.js';
import { highlightJson, highlightXml, formatXml } from '../utils/syntax-highlight.js';

export async function init() {
  const statusEl = document.getElementById('response-status');
  const timeEl = document.getElementById('response-time');
  const sizeEl = document.getElementById('response-size');
  const bodyEl = document.getElementById('response-body');
  const formatContentEl = document.getElementById('response-format-content');
  const formatBar = document.getElementById('response-format-bar');
  const headersEl = document.getElementById('response-headers');

  let vscroller = null;
  const LARGE_LINE_THRESHOLD = 500;
  let lastResponseText = '';
  let lastContentType = '';
  let lastResponseData = null;
  let currentFormat = 'pretty';

  // Initialize search early so responseSearch is available for all subsequent code
  const { init: initResponseSearch } = await import('./response-search.js');
  const responseSearch = initResponseSearch({
    getVScroller: () => vscroller,
    getFormatContentEl: () => formatContentEl,
    getLastResponseText: () => lastResponseText,
    getLastContentType: () => lastContentType,
    getCurrentFormat: () => currentFormat,
    getPrettyHighlighted,
    renderCurrentFormat,
  });

  function destroyVScroller() {
    if (vscroller) { vscroller.destroy(); vscroller = null; }
    bodyEl.classList.remove('vs-active');
  }

  function detectContentType(headers) {
    if (!headers) return 'text';
    const ct = (headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
    if (ct.includes('json')) return 'json';
    if (ct.includes('xml')) return 'xml';
    if (ct.includes('html')) return 'html';
    if (ct.startsWith('image/')) return 'image';
    return 'text';
  }

  function getDefaultFormat(contentType) {
    if (contentType === 'html' || contentType === 'image') return 'preview';
    if (contentType === 'json' || contentType === 'xml') return 'pretty';
    return 'raw';
  }

  function renderPrettyBody(text, contentType) {
    const lines = text.split('\n');
    if (lines.length < LARGE_LINE_THRESHOLD) {
      let highlighted;
      if (contentType === 'json') highlighted = highlightJson(text);
      else if (contentType === 'xml') highlighted = highlightXml(text);
      else highlighted = escapeHtml(text);
      return `<pre>${highlighted}</pre>`;
    }
    bodyEl.classList.add('vs-active');
    const wrapper = document.createElement('div');
    wrapper.className = 'vscroll-wrapper';
    formatContentEl.appendChild(wrapper);
    const highlightFn = contentType === 'json' ? (line) => highlightJson(line)
      : contentType === 'xml' ? (line) => highlightXml(line)
      : (line) => escapeHtml(line);
    vscroller = new VirtualScroller(wrapper, lines, highlightFn);
    return '';
  }

  function renderRawBody(text) { return `<pre>${escapeHtml(text)}</pre>`; }

  function renderPreviewBody(data, contentType) {
    if (contentType === 'html') return `<iframe sandbox="" srcdoc="${escapeAttr(data.body || '')}" class="html-preview-frame"></iframe>`;
    if (contentType === 'image') {
      const ct = data.headers?.['content-type'] || data.headers?.['Content-Type'] || 'image/png';
      const body = data.body || '';
      const b64 = btoa(unescape(encodeURIComponent(body)));
      const sizeStr = formatSize(data.size);
      return `<div class="image-preview"><img src="data:${ct};base64,${b64}" class="preview-img" onload="this.dataset.naturalWidth=this.naturalWidth;this.dataset.naturalHeight=this.naturalHeight;const info=this.nextElementSibling;info.textContent=this.naturalWidth+'×'+this.naturalHeight+' · '+info.dataset.size;"><div class="image-info" data-size="${sizeStr}">${sizeStr}</div></div>`;
    }
    return `<div class="preview-unavailable">Preview not available for this content type</div>`;
  }

  function getPrettyHighlighted() {
    const ct = lastContentType;
    if (ct === 'json') return highlightJson(lastResponseText);
    if (ct === 'xml') return highlightXml(lastResponseText);
    return escapeHtml(lastResponseText);
  }

  formatBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.format-tab');
    if (!btn) return;
    const format = btn.dataset.format;
    if (format === currentFormat) return;
    currentFormat = format;
    formatBar.querySelectorAll('.format-tab').forEach(b => b.classList.toggle('active', b === btn));
    destroyVScroller();
    renderCurrentFormat();
  });

  function renderCurrentFormat() {
    if (lastContentType === '') return;
    const ct = lastContentType;
    const text = lastResponseText;
    formatContentEl.innerHTML = '';
    if (currentFormat === 'raw') formatContentEl.innerHTML = renderRawBody(text);
    else if (currentFormat === 'preview') { if (lastResponseData) formatContentEl.innerHTML = renderPreviewBody(lastResponseData, ct); }
    else { const prettyResult = renderPrettyBody(text, ct); if (prettyResult) formatContentEl.innerHTML = prettyResult; }
  }

  function restoreFromTab() {
    const tab = store.getActiveTab();
    if (!tab) return;
    if (!tab.response) {
      destroyVScroller(); statusEl.textContent = ''; statusEl.className = ''; timeEl.textContent = ''; sizeEl.textContent = '';
      bodyEl.innerHTML = emptyStateHTML(); formatContentEl.innerHTML = ''; formatBar.style.display = 'none'; headersEl.innerHTML = '';
      return;
    }
    const data = tab.response;
    if (data.error) {
      destroyVScroller(); statusEl.textContent = 'Error'; statusEl.className = 'status-5xx'; timeEl.textContent = '-'; sizeEl.textContent = '-';
      bodyEl.innerHTML = `<pre class="response-error">${escapeHtml(data.error || 'Request failed')}</pre>`;
      formatContentEl.innerHTML = ''; formatBar.style.display = 'none'; headersEl.innerHTML = '';
      return;
    }
    renderResponse(data);
  }

  async function renderResponse(data) {
    destroyVScroller();
    responseSearch.resetSearch();

    const statusClass = data.status >= 200 && data.status < 300 ? 'status-2xx'
      : data.status >= 300 && data.status < 400 ? 'status-3xx'
      : data.status >= 400 && data.status < 500 ? 'status-4xx' : 'status-5xx';
    statusEl.textContent = `${data.status}`; statusEl.className = statusClass;
    timeEl.textContent = `${data.time}ms`; sizeEl.textContent = formatSize(data.size);

    const contentType = detectContentType(data.headers);
    lastContentType = contentType;

    let text = data.body || '';
    if (contentType === 'json') { try { text = JSON.stringify(JSON.parse(text), null, 2); } catch {} }
    else if (contentType === 'xml') { try { text = formatXml(text); } catch {} }
    lastResponseText = text;
    lastResponseData = data;

    formatBar.style.display = '';
    const autoFormat = getDefaultFormat(contentType);
    currentFormat = autoFormat;
    formatBar.querySelectorAll('.format-tab').forEach(b => b.classList.toggle('active', b.dataset.format === autoFormat));

    bodyEl.innerHTML = '';
    bodyEl.appendChild(formatBar);
    bodyEl.appendChild(formatContentEl);

    bodyEl.appendChild(responseSearch.getSearchBar());

    let extrasHtml = '';
    if (data.truncated) extrasHtml += '<div class="response-warning">⚠ Response truncated (exceeded 50MB)</div>';
    if (data.script_logs?.length > 0) extrasHtml += '<div class="response-logs"><strong>Script Logs</strong><div>' + data.script_logs.map(l => `<div>> ${escapeHtml(l)}</div>`).join('') + '</div></div>';
    if (data.post_script_logs?.length > 0) extrasHtml += '<div class="response-logs"><strong>Post-script Logs</strong><div>' + data.post_script_logs.map(l => `<div>> ${escapeHtml(l)}</div>`).join('') + '</div></div>';
    if (extrasHtml) {
      const extrasDiv = document.createElement('div');
      extrasDiv.innerHTML = extrasHtml;
      bodyEl.insertBefore(extrasDiv, formatContentEl);
    }

    formatContentEl.innerHTML = '';
    renderCurrentFormat();

    if (data.headers) {
      let html = '<div class="kv-editor">';
      for (const [key, value] of Object.entries(data.headers)) html += `<div class="kv-row"><input value="${escapeHtml(key)}" readonly><input value="${escapeHtml(value)}" readonly></div>`;
      headersEl.innerHTML = html + '</div>';
    }
  }

  store.on('request:complete', (data) => renderResponse(data));
  store.on('request:error', (err) => {
    destroyVScroller(); statusEl.textContent = 'Error'; statusEl.className = 'status-5xx'; timeEl.textContent = '-'; sizeEl.textContent = '-';
    bodyEl.innerHTML = `<pre class="response-error">${escapeHtml(err.message || 'Request failed')}</pre>`;
    formatContentEl.innerHTML = ''; formatBar.style.display = 'none';
  });
  store.on('request:cancel', () => {
    destroyVScroller(); statusEl.textContent = 'Cancelled'; statusEl.className = 'status-5xx'; timeEl.textContent = '-'; sizeEl.textContent = '-';
    bodyEl.innerHTML = `<pre class="response-error">请求已取消</pre>`;
    formatContentEl.innerHTML = ''; formatBar.style.display = 'none'; headersEl.innerHTML = '';
  });
  store.on('request:start', () => {
    destroyVScroller(); statusEl.textContent = ''; statusEl.className = ''; timeEl.textContent = ''; sizeEl.textContent = '';
    bodyEl.innerHTML = '<div class="empty-state response-loading"><div class="spinner"></div><div class="empty-state-title">Sending request...</div></div>';
    formatContentEl.innerHTML = ''; formatBar.style.display = 'none'; headersEl.innerHTML = '';
  });
  store.on('tab:switch', restoreFromTab);

  restoreFromTab();
}
