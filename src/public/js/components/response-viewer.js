// Response viewer component
(function() {
  const statusEl = document.getElementById('response-status');
  const timeEl = document.getElementById('response-time');
  const sizeEl = document.getElementById('response-size');
  const bodyEl = document.getElementById('response-body');
  const headersEl = document.getElementById('response-headers');

  store.on('request:complete', (data) => {
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
    try {
      const parsed = JSON.parse(data.body);
      bodyEl.innerHTML = `<pre>${syntaxHighlight(JSON.stringify(parsed, null, 2))}</pre>`;
    } catch {
      bodyEl.innerHTML = `<pre>${escapeHtml(data.body || '')}</pre>`;
    }

    // Headers
    if (data.headers) {
      let html = '<div class="kv-editor">';
      for (const [key, value] of Object.entries(data.headers)) {
        html += `<div class="kv-row"><input value="${escapeHtml(key)}" readonly><input value="${escapeHtml(value)}" readonly></div>`;
      }
      headersEl.innerHTML = html + '</div>';
    }

    // Truncated warning
    if (data.truncated) {
      bodyEl.innerHTML = '<div style="color:var(--yellow);margin-bottom:8px;font-size:11px;font-family:var(--font-mono);padding:6px 10px;background:var(--yellow-bg);border-radius:var(--radius)">⚠ Response truncated (exceeded 50MB)</div>' + bodyEl.innerHTML;
    }

    if (data.script_logs && data.script_logs.length > 0) {
      const logsHtml = data.script_logs.map(l => `<div style="color:var(--text-2);font-size:11px;font-family:var(--font-mono);line-height:1.6">> ${escapeHtml(l)}</div>`).join('');
      bodyEl.innerHTML = '<div style="margin-bottom:10px;padding:10px 12px;background:var(--bg-2);border:1px solid var(--border-0);border-radius:var(--radius)"><strong style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.5px">Script Logs</strong><div style="margin-top:6px">' + logsHtml + '</div></div>' + bodyEl.innerHTML;
    }
  });

  store.on('request:error', (err) => {
    statusEl.textContent = 'Error';
    statusEl.className = 'status-5xx';
    timeEl.textContent = '-';
    sizeEl.textContent = '-';
    bodyEl.innerHTML = `<pre style="color:var(--red)">${escapeHtml(err.message || 'Request failed')}</pre>`;
  });

  store.on('request:start', () => {
    statusEl.textContent = '';
    statusEl.className = '';
    timeEl.textContent = '';
    sizeEl.textContent = '';
    bodyEl.innerHTML = `
      <div class="empty-state" style="padding:40px 20px">
        <div class="spinner" style="margin-bottom:12px"></div>
        <div class="empty-state-title" style="font-size:12px">Sending request...</div>
      </div>`;
    headersEl.innerHTML = '';
  });

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
})();
