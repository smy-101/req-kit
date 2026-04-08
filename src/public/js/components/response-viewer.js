import { store } from '../store.js';
import { escapeHtml, emptyStateHTML } from '../utils/template.js';

// Response viewer component
const statusEl = document.getElementById('response-status');
const timeEl = document.getElementById('response-time');
const sizeEl = document.getElementById('response-size');
const bodyEl = document.getElementById('response-body');
const formatContentEl = document.getElementById('response-format-content');
const formatBar = document.getElementById('response-format-bar');
const headersEl = document.getElementById('response-headers');

// Virtual scroll state
let vscroller = null;
const LINE_HEIGHT = 21; // ceil(12px * 1.7)
const BUFFER_LINES = 30;
const LARGE_LINE_THRESHOLD = 500;

// Search state
let searchVisible = false;
let searchTerm = '';
let searchMatches = [];
let currentMatchIdx = -1;
let lastResponseText = '';
let lastContentType = '';
let lastResponseData = null;
let currentFormat = 'pretty';

// Search DOM elements
const searchBar = document.getElementById('response-search-bar');
const searchInput = document.getElementById('response-search-input');
const searchCountEl = document.getElementById('response-search-count');
const searchPrevBtn = document.getElementById('search-prev-btn');
const searchNextBtn = document.getElementById('search-next-btn');
const searchCloseBtn = document.getElementById('search-close-btn');
const searchToggleBtn = document.getElementById('search-toggle-btn');

function destroyVScroller() {
  if (vscroller) {
    vscroller.destroy();
    vscroller = null;
  }
  bodyEl.classList.remove('vs-active');
}

// VirtualScroller
class VirtualScroller {
  constructor(container, lines, highlightFn) {
    this.container = container;
    this.lines = lines;
    this.highlightFn = highlightFn;
    this._cache = new Array(lines.length).fill(null);
    this.totalHeight = lines.length * LINE_HEIGHT;
    this._start = -1;
    this._end = -1;
    this._raf = null;

    this.el = document.createElement('div');
    this.el.className = 'vscroll-viewport';

    this.spacer = document.createElement('div');
    this.spacer.className = 'vscroll-spacer';
    this.spacer.style.height = this.totalHeight + 'px';

    this.content = document.createElement('div');
    this.content.className = 'vscroll-content';

    this.spacer.appendChild(this.content);
    this.el.appendChild(this.spacer);
    this.container.appendChild(this.el);

    this._onScroll = () => {
      if (!this._raf) {
        this._raf = requestAnimationFrame(() => {
          this.render();
          this._raf = null;
        });
      }
    };
    this.el.addEventListener('scroll', this._onScroll, { passive: true });

    this._resizeObserver = new ResizeObserver(() => {
      this._start = -1;
      this.render();
    });
    this._resizeObserver.observe(this.el);

    this.render();
  }

  render() {
    const scrollTop = this.el.scrollTop;
    const viewHeight = this.el.clientHeight;
    if (viewHeight === 0) return;

    let start = Math.floor(scrollTop / LINE_HEIGHT) - BUFFER_LINES;
    start = Math.max(0, start);
    let end = Math.ceil((scrollTop + viewHeight) / LINE_HEIGHT) + BUFFER_LINES;
    end = Math.min(this.lines.length, end);

    if (start === this._start && end === this._end) return;
    this._start = start;
    this._end = end;

    this.content.style.transform = `translateY(${start * LINE_HEIGHT}px)`;

    let html = '';
    for (let i = start; i < end; i++) {
      if (!this._cache[i]) {
        this._cache[i] = this.highlightFn(this.lines[i]);
      }
      let lineContent = this._cache[i];
      if (searchTerm && lineContent) {
        lineContent = highlightSearchInHtml(lineContent, searchTerm);
      }
      const isCurrentMatch = searchTerm && currentMatchIdx >= 0 && searchMatches[currentMatchIdx]?.lineIdx === i;
      const cls = isCurrentMatch ? 'vline vline-search-current' : 'vline';
      html += `<div class="${cls}"><span class="vline-num">${i + 1}</span><span class="vline-code">${lineContent}</span></div>`;
    }
    this.content.innerHTML = html;
  }

  scrollToLine(lineIdx) {
    this.el.scrollTo({ top: Math.max(0, lineIdx * LINE_HEIGHT - this.el.clientHeight / 2), behavior: 'smooth' });
  }

  invalidateCache() {
    this._cache = new Array(this.lines.length).fill(null);
    this._start = -1;
    this._end = -1;
    this.render();
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this.el.removeEventListener('scroll', this._onScroll);
    this._resizeObserver.disconnect();
    this.container.innerHTML = '';
  }
}

// ── Format helpers ────────────────────────

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

function xmlSyntaxHighlight(xml) {
  return escapeHtml(xml).replace(
    /(&lt;\/?)([\w:-]+)/g,
    '$1<span class="xml-tag">$2</span>'
  ).replace(
    /([\w:-]+)(=)(&quot;[^&]*&quot;)/g,
    '<span class="xml-attr">$1</span>$2<span class="xml-value">$3</span>'
  );
}

function prettyPrintXml(xml) {
  // Simple regex-based XML indentation
  const lines = xml.replace(/>\s*</g, '>\n<').split('\n');
  let indent = 0;
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('</')) {
      indent = Math.max(0, indent - 1);
    }
    result.push('  '.repeat(indent) + trimmed);
    if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<?') &&
        !trimmed.endsWith('/>') && !trimmed.includes('</')) {
      indent++;
    }
  }
  return result.join('\n');
}

function renderPrettyBody(text, contentType) {
  const lines = text.split('\n');

  if (lines.length < LARGE_LINE_THRESHOLD) {
    let highlighted;
    if (contentType === 'json') {
      highlighted = syntaxHighlight(text);
    } else if (contentType === 'xml') {
      highlighted = xmlSyntaxHighlight(text);
    } else {
      highlighted = escapeHtml(text);
    }
    return `<pre>${highlighted}</pre>`;
  }

  // Large response — virtual scroll
  bodyEl.classList.add('vs-active');
  const wrapper = document.createElement('div');
  wrapper.className = 'vscroll-wrapper';
  formatContentEl.appendChild(wrapper);

  const highlightFn = contentType === 'json'
    ? (line) => syntaxHighlight(line)
    : contentType === 'xml'
      ? (line) => xmlSyntaxHighlight(line)
      : (line) => escapeHtml(line);

  vscroller = new VirtualScroller(wrapper, lines, highlightFn);
  return '';
}

function renderRawBody(text) {
  return `<pre>${escapeHtml(text)}</pre>`;
}

function renderPreviewBody(data, contentType) {
  if (contentType === 'html') {
    return `<iframe sandbox="" srcdoc="${escapeAttr(data.body || '')}" class="html-preview-frame"></iframe>`;
  }
  if (contentType === 'image') {
    const ct = data.headers?.['content-type'] || data.headers?.['Content-Type'] || 'image/png';
    // Check if body looks like base64 or binary data
    const body = data.body || '';
    const b64 = btoa(unescape(encodeURIComponent(body)));
    const sizeStr = formatSize(data.size);
    return `<div class="image-preview">
      <img src="data:${ct};base64,${b64}" class="preview-img" onload="this.dataset.naturalWidth=this.naturalWidth;this.dataset.naturalHeight=this.naturalHeight;const info=this.nextElementSibling;info.textContent=this.naturalWidth+'×'+this.naturalHeight+' · '+info.dataset.size;">
      <div class="image-info" data-size="${sizeStr}">${sizeStr}</div>
    </div>`;
  }
  return `<div class="preview-unavailable">Preview not available for this content type</div>`;
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Search helpers ────────────────────────

function highlightSearchInHtml(html, term) {
  // For VirtualScroller lines (already escaped/highlighted HTML strings),
  // use string-based approach that skips <...> tags.
  const termLower = term.toLowerCase();
  let result = '';
  let i = 0;
  while (i < html.length) {
    if (html[i] === '<') {
      const end = html.indexOf('>', i);
      if (end === -1) break;
      result += html.slice(i, end + 1);
      i = end + 1;
    } else {
      const remaining = html.slice(i);
      const matchIdx = remaining.toLowerCase().indexOf(termLower);
      if (matchIdx === -1) {
        result += remaining;
        break;
      }
      result += html.slice(i, i + matchIdx);
      const matchText = html.slice(i + matchIdx, i + matchIdx + term.length);
      result += `<mark class="search-highlight">${matchText}</mark>`;
      i = i + matchIdx + term.length;
    }
  }
  return result;
}

/**
 * Walk DOM text nodes inside `root`, wrapping ALL occurrences of `term` with <mark>.
 * Processes all matches in each text node in a single pass — no recursion needed.
 */
function highlightSearchInDOM(root, term) {
  const termLower = term.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodesToReplace = [];

  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent;
    const firstIdx = text.toLowerCase().indexOf(termLower);
    if (firstIdx === -1) continue;

    // Process ALL matches in this text node at once
    const frag = document.createDocumentFragment();
    let pos = 0;
    while (pos < text.length) {
      const idx = text.toLowerCase().indexOf(termLower, pos);
      if (idx === -1) {
        if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
        break;
      }
      if (idx > pos) frag.appendChild(document.createTextNode(text.slice(pos, idx)));
      const mark = document.createElement('mark');
      mark.className = 'search-highlight';
      mark.textContent = text.slice(idx, idx + term.length);
      frag.appendChild(mark);
      pos = idx + term.length;
    }
    nodesToReplace.push({ oldNode: node, frag });
  }

  for (const { oldNode, frag } of nodesToReplace) {
    oldNode.parentNode.replaceChild(frag, oldNode);
  }
}

function showSearch() {
  searchVisible = true;
  searchBar.classList.remove('hidden');
  searchInput.focus();
  searchInput.select();
}

function hideSearch() {
  searchVisible = false;
  searchBar.classList.add('hidden');
  clearSearch();
}

function clearSearch() {
  searchTerm = '';
  searchMatches = [];
  currentMatchIdx = -1;
  searchInput.value = '';
  searchCountEl.textContent = '';
  if (vscroller) {
    vscroller.invalidateCache();
  } else {
    renderCurrentFormat();
  }
}

function performSearch(term) {
  searchTerm = term;
  searchMatches = [];
  currentMatchIdx = -1;

  if (!term || !lastResponseText) {
    searchCountEl.textContent = '';
    return;
  }

  const termLower = term.toLowerCase();
  if (vscroller) {
    // Virtual scroll mode: track matching line indices
    const lines = lastResponseText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(termLower)) {
        searchMatches.push({ lineIdx: i });
      }
    }
  } else {
    // Small response mode: count exact occurrences for precise navigation
    const text = lastResponseText.toLowerCase();
    let pos = 0;
    while ((pos = text.indexOf(termLower, pos)) !== -1) {
      searchMatches.push({});
      pos += termLower.length;
    }
  }
  if (searchMatches.length > 0) currentMatchIdx = 0;
  updateSearchCount();
  applySearchHighlights();
}

function updateSearchCount() {
  if (searchMatches.length === 0) {
    searchCountEl.textContent = searchTerm ? '0/0' : '';
  } else {
    searchCountEl.textContent = `${currentMatchIdx + 1}/${searchMatches.length}`;
  }
}

function applySearchHighlights() {
  if (vscroller) {
    vscroller.invalidateCache();
    if (currentMatchIdx >= 0) vscroller.scrollToLine(searchMatches[currentMatchIdx].lineIdx);
  } else {
    const pre = formatContentEl.querySelector('pre');
    if (pre && lastResponseText) {
      // Re-render base content for current format (removes old marks)
      if (currentFormat === 'raw') {
        pre.innerHTML = escapeHtml(lastResponseText);
      } else {
        pre.innerHTML = getPrettyHighlighted();
      }
      // Apply search highlights via DOM text node walking
      if (searchTerm) {
        highlightSearchInDOM(pre, searchTerm);
      }
      if (currentMatchIdx >= 0) {
        const marks = pre.querySelectorAll('.search-highlight');
        if (marks.length > 0) {
          // Navigate to the N-th individual match
          const target = marks[currentMatchIdx] || marks[0];
          marks.forEach(m => m.classList.remove('search-highlight-current'));
          target.classList.add('search-highlight-current');
          target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    }
  }
}

function navigateMatch(direction) {
  if (searchMatches.length === 0) return;
  currentMatchIdx += direction;
  if (currentMatchIdx < 0) currentMatchIdx = searchMatches.length - 1;
  if (currentMatchIdx >= searchMatches.length) currentMatchIdx = 0;
  updateSearchCount();
  applySearchHighlights();
}

function getPrettyHighlighted() {
  const ct = lastContentType;
  if (ct === 'json') return syntaxHighlight(lastResponseText);
  if (ct === 'xml') return xmlSyntaxHighlight(lastResponseText);
  return escapeHtml(lastResponseText);
}

// ── Search event handlers ─────────────────

searchInput.addEventListener('input', () => performSearch(searchInput.value));
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); navigateMatch(e.shiftKey ? -1 : 1); }
  else if (e.key === 'Escape') hideSearch();
});
searchPrevBtn.addEventListener('click', () => navigateMatch(-1));
searchNextBtn.addEventListener('click', () => navigateMatch(1));
searchCloseBtn.addEventListener('click', () => hideSearch());
searchToggleBtn.addEventListener('click', () => {
  if (searchVisible) {
    searchInput.focus();
    searchInput.select();
  } else {
    showSearch();
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    const panel = document.getElementById('response-panel');
    const bodyTab = document.querySelector('[data-response-tab="body"]');
    if (panel && bodyTab?.classList.contains('active') && panel.offsetWidth > 0) {
      e.preventDefault();
      showSearch();
    }
  }
});

// ── Format tab handlers ───────────────────

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
  // lastContentType is '' before any response is received;
  // detectContentType always returns a non-empty string ('text' at minimum).
  if (lastContentType === '') return;

  const ct = lastContentType;
  const text = lastResponseText;

  // Clear format content (but keep format bar + search bar in bodyEl)
  formatContentEl.innerHTML = '';

  if (currentFormat === 'raw') {
    formatContentEl.innerHTML = renderRawBody(text);
  } else if (currentFormat === 'preview') {
    if (lastResponseData) formatContentEl.innerHTML = renderPreviewBody(lastResponseData, ct);
  } else {
    // pretty
    const prettyResult = renderPrettyBody(text, ct);
    if (prettyResult) formatContentEl.innerHTML = prettyResult;
  }
}

// ── Response rendering ────────────────────

function restoreFromTab() {
  const tab = store.getActiveTab();
  if (!tab) return;

  if (!tab.response) {
    destroyVScroller();
    statusEl.textContent = '';
    statusEl.className = '';
    timeEl.textContent = '';
    sizeEl.textContent = '';
    bodyEl.innerHTML = emptyStateHTML();
    formatContentEl.innerHTML = '';
    formatBar.style.display = 'none';
    headersEl.innerHTML = '';
    return;
  }

  const data = tab.response;
  if (data.error) {
    destroyVScroller();
    statusEl.textContent = 'Error';
    statusEl.className = 'status-5xx';
    timeEl.textContent = '-';
    sizeEl.textContent = '-';
    bodyEl.innerHTML = `<pre class="response-error">${escapeHtml(data.error || 'Request failed')}</pre>`;
    formatContentEl.innerHTML = '';
    formatBar.style.display = 'none';
    headersEl.innerHTML = '';
    return;
  }

  renderResponse(data);
}

function renderResponse(data) {
  destroyVScroller();

  // Reset search
  searchTerm = '';
  searchMatches = [];
  currentMatchIdx = -1;
  searchInput.value = '';
  searchCountEl.textContent = '';
  if (searchVisible) hideSearch();

  // Status
  const statusClass = data.status >= 200 && data.status < 300 ? 'status-2xx'
    : data.status >= 300 && data.status < 400 ? 'status-3xx'
    : data.status >= 400 && data.status < 500 ? 'status-4xx'
    : 'status-5xx';
  statusEl.textContent = `${data.status}`;
  statusEl.className = statusClass;
  timeEl.textContent = `${data.time}ms`;
  sizeEl.textContent = formatSize(data.size);

  // Detect content type
  const contentType = detectContentType(data.headers);
  lastContentType = contentType;

  // Format body
  let text = data.body || '';
  if (contentType === 'json') {
    try { text = JSON.stringify(JSON.parse(text), null, 2); } catch {}
  } else if (contentType === 'xml') {
    try { text = prettyPrintXml(text); } catch {}
  }
  lastResponseText = text;
  lastResponseData = data;

  // Show format bar
  formatBar.style.display = '';

  // Auto-select format tab
  const autoFormat = getDefaultFormat(contentType);
  currentFormat = autoFormat;
  formatBar.querySelectorAll('.format-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.format === autoFormat)
  );

  // Reset body content
  bodyEl.innerHTML = '';
  bodyEl.appendChild(formatBar);
  bodyEl.appendChild(formatContentEl);
  bodyEl.appendChild(searchBar);

  // Extras (warnings, script logs) above format content
  let extrasHtml = '';
  if (data.truncated) extrasHtml += '<div class="response-warning">⚠ Response truncated (exceeded 50MB)</div>';
  if (data.script_logs?.length > 0) {
    extrasHtml += '<div class="response-logs"><strong>Script Logs</strong><div>' +
      data.script_logs.map(l => `<div>> ${escapeHtml(l)}</div>`).join('') + '</div></div>';
  }
  if (data.post_script_logs?.length > 0) {
    extrasHtml += '<div class="response-logs"><strong>Post-script Logs</strong><div>' +
      data.post_script_logs.map(l => `<div>> ${escapeHtml(l)}</div>`).join('') + '</div></div>';
  }

  // Insert extras before formatContent
  if (extrasHtml) {
    const extrasDiv = document.createElement('div');
    extrasDiv.innerHTML = extrasHtml;
    bodyEl.insertBefore(extrasDiv, formatContentEl);
  }

  // Render current format
  formatContentEl.innerHTML = '';
  renderCurrentFormat();

  // Headers
  if (data.headers) {
    let html = '<div class="kv-editor">';
    for (const [key, value] of Object.entries(data.headers)) {
      html += `<div class="kv-row"><input value="${escapeHtml(key)}" readonly><input value="${escapeHtml(value)}" readonly></div>`;
    }
    headersEl.innerHTML = html + '</div>';
  }
}

store.on('request:complete', (data) => renderResponse(data));

store.on('request:error', (err) => {
  destroyVScroller();
  statusEl.textContent = 'Error';
  statusEl.className = 'status-5xx';
  timeEl.textContent = '-';
  sizeEl.textContent = '-';
  bodyEl.innerHTML = `<pre class="response-error">${escapeHtml(err.message || 'Request failed')}</pre>`;
  formatContentEl.innerHTML = '';
  formatBar.style.display = 'none';
});

store.on('request:cancel', () => {
  destroyVScroller();
  statusEl.textContent = 'Cancelled';
  statusEl.className = 'status-5xx';
  timeEl.textContent = '-';
  sizeEl.textContent = '-';
  bodyEl.innerHTML = `<pre class="response-error">请求已取消</pre>`;
  formatContentEl.innerHTML = '';
  formatBar.style.display = 'none';
  headersEl.innerHTML = '';
});

store.on('request:start', () => {
  destroyVScroller();
  statusEl.textContent = '';
  statusEl.className = '';
  timeEl.textContent = '';
  sizeEl.textContent = '';
  bodyEl.innerHTML = `
    <div class="empty-state response-loading">
      <div class="spinner"></div>
      <div class="empty-state-title">Sending request...</div>
    </div>`;
  formatContentEl.innerHTML = '';
  formatBar.style.display = 'none';
  headersEl.innerHTML = '';
});

store.on('tab:switch', restoreFromTab);

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function syntaxHighlight(json) {
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = 'json-number';
    if (/^"/.test(match)) cls = /:$/.test(match) ? 'json-key' : 'json-string';
    else if (/true|false/.test(match)) cls = 'json-bool';
    else if (/null/.test(match)) cls = 'json-null';
    return `<span class="${cls}">${match}</span>`;
  });
}

restoreFromTab();
