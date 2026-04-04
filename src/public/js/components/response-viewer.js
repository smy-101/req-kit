// Response viewer component
(function() {
  const statusEl = document.getElementById('response-status');
  const timeEl = document.getElementById('response-time');
  const sizeEl = document.getElementById('response-size');
  const bodyEl = document.getElementById('response-body');
  const headersEl = document.getElementById('response-headers');

  // Virtual scroll state
  let vscroller = null;
  const LINE_HEIGHT = 21; // ceil(12px * 1.7)
  const BUFFER_LINES = 30;
  const LARGE_LINE_THRESHOLD = 500;

  function destroyVScroller() {
    if (vscroller) {
      vscroller.destroy();
      vscroller = null;
    }
    bodyEl.classList.remove('vs-active');
  }

  // VirtualScroller: 只渲染可视区域内的行，避免大量 DOM 节点导致卡顿
  class VirtualScroller {
    constructor(container, lines, needsHighlight = false) {
      this.container = container;
      this.lines = lines;
      this.needsHighlight = needsHighlight;
      this._cache = new Array(lines.length).fill(null);
      this.totalHeight = lines.length * LINE_HEIGHT;
      this._start = -1;
      this._end = -1;
      this._raf = null;

      // 创建 DOM 结构
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

      // 滚动事件 — 使用 rAF 节流
      this._onScroll = () => {
        if (!this._raf) {
          this._raf = requestAnimationFrame(() => {
            this.render();
            this._raf = null;
          });
        }
      };
      this.el.addEventListener('scroll', this._onScroll, { passive: true });

      // 面板大小变化时重新渲染
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

      // 范围未变则跳过
      if (start === this._start && end === this._end) return;
      this._start = start;
      this._end = end;

      this.content.style.transform = `translateY(${start * LINE_HEIGHT}px)`;

      let html = '';
      for (let i = start; i < end; i++) {
        if (!this._cache[i]) {
          this._cache[i] = this.needsHighlight ? syntaxHighlight(this.lines[i]) : this.lines[i];
        }
        html += `<div class="vline"><span class="vline-num">${i + 1}</span><span class="vline-code">${this._cache[i]}</span></div>`;
      }
      this.content.innerHTML = html;
    }

    destroy() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this.el.removeEventListener('scroll', this._onScroll);
      this._resizeObserver.disconnect();
      this.container.innerHTML = '';
    }
  }

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
      headersEl.innerHTML = '';
      return;
    }

    renderResponse(data);
  }

  function renderResponse(data) {
    destroyVScroller();

    // Status
    const statusClass = data.status >= 200 && data.status < 300 ? 'status-2xx'
      : data.status >= 300 && data.status < 400 ? 'status-3xx'
      : data.status >= 400 && data.status < 500 ? 'status-4xx'
      : 'status-5xx';
    statusEl.textContent = `${data.status}`;
    statusEl.className = statusClass;
    timeEl.textContent = `${data.time}ms`;
    sizeEl.textContent = formatSize(data.size);

    // Body
    let isJson = false;
    let text = data.body || '';
    try {
      const parsed = JSON.parse(text);
      text = JSON.stringify(parsed, null, 2);
      isJson = true;
    } catch {}

    const lines = text.split('\n');

    // 顶部提示信息（警告、脚本日志）
    let extrasHtml = '';
    if (data.truncated) {
      extrasHtml += '<div class="response-warning">⚠ Response truncated (exceeded 50MB)</div>';
    }
    if (data.script_logs && data.script_logs.length > 0) {
      extrasHtml += '<div class="response-logs"><strong>Script Logs</strong><div>' +
        data.script_logs.map(l => `<div>> ${escapeHtml(l)}</div>`).join('') +
        '</div></div>';
    }
    if (data.post_script_logs && data.post_script_logs.length > 0) {
      extrasHtml += '<div class="response-logs"><strong>Post-script Logs</strong><div>' +
        data.post_script_logs.map(l => `<div>> ${escapeHtml(l)}</div>`).join('') +
        '</div></div>';
    }

    if (lines.length < LARGE_LINE_THRESHOLD) {
      // 小响应：一次性渲染
      const highlighted = isJson ? syntaxHighlight(text) : escapeHtml(text);
      bodyEl.innerHTML = extrasHtml + `<pre>${highlighted}</pre>`;
    } else {
      // 大响应：虚拟滚动 + 懒加载高亮
      bodyEl.classList.add('vs-active');
      bodyEl.innerHTML = extrasHtml;

      const wrapper = document.createElement('div');
      wrapper.className = 'vscroll-wrapper';
      bodyEl.appendChild(wrapper);

      // 存储原始行，高亮延迟到 VirtualScroller.render() 时按需执行
      vscroller = new VirtualScroller(wrapper, lines, isJson);
    }

    // Headers
    if (data.headers) {
      let html = '<div class="kv-editor">';
      for (const [key, value] of Object.entries(data.headers)) {
        html += `<div class="kv-row"><input value="${escapeHtml(key)}" readonly><input value="${escapeHtml(value)}" readonly></div>`;
      }
      headersEl.innerHTML = html + '</div>';
    }
  }

  store.on('request:complete', (data) => {
    renderResponse(data);
  });

  store.on('request:error', (err) => {
    destroyVScroller();
    statusEl.textContent = 'Error';
    statusEl.className = 'status-5xx';
    timeEl.textContent = '-';
    sizeEl.textContent = '-';
    bodyEl.innerHTML = `<pre class="response-error">${escapeHtml(err.message || 'Request failed')}</pre>`;
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
    headersEl.innerHTML = '';
  });

  // Restore response on tab switch
  store.on('tab:switch', restoreFromTab);

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function syntaxHighlight(json) {
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-string';
      } else if (/true|false/.test(match)) {
        cls = 'json-bool';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    });
  }

  // Render initial state (tab:switch already fired before this script loads)
  restoreFromTab();
})();
