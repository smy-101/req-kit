// Test Results component — renders assertion results and logs
(function() {
  const container = document.getElementById('response-test-results');

  function render() {
    const tab = store.getActiveTab();
    if (!tab || !tab.response) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-title">暂无测试结果</div></div>';
      return;
    }

    const tests = tab.scriptTests;
    const logs = tab.response.post_script_logs;

    if (!tests || Object.keys(tests).length === 0) {
      let html = '<div class="empty-state"><div class="empty-state-title">暂无测试结果</div></div>';
      if (logs && logs.length > 0) {
        html += renderLogs(logs);
      }
      container.innerHTML = html;
      return;
    }

    let passed = 0;
    let failed = 0;
    let html = '<div class="test-results-list">';

    for (const [name, result] of Object.entries(tests)) {
      if (result) {
        passed++;
        html += `<div class="test-item test-passed"><span class="test-icon">✓</span><span class="test-name">${escapeHtml(name)}</span></div>`;
      } else {
        failed++;
        html += `<div class="test-item test-failed"><span class="test-icon">✗</span><span class="test-name">${escapeHtml(name)}</span></div>`;
      }
    }

    html += '</div>';
    html += `<div class="test-summary">${passed} passed, ${failed} failed</div>`;

    if (logs && logs.length > 0) {
      html += renderLogs(logs);
    }

    container.innerHTML = html;
  }

  function renderLogs(logs) {
    let html = '<div class="test-logs"><div class="test-logs-title">Console Output</div>';
    for (const log of logs) {
      html += `<div class="test-log-line">> ${escapeHtml(log)}</div>`;
    }
    html += '</div>';
    return html;
  }

  // Re-render on response complete and tab switch
  store.on('request:complete', render);
  store.on('tab:switch', render);

  // Initial render
  render();
})();
