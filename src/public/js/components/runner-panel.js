import { store } from '../store.js';
import { api } from '../api.js';
import { escapeHtml } from '../utils/template.js';

let currentRun = null; // { abort: () => void }

/**
 * 打开运行器面板
 */
export function openRunnerPanel(collectionId, collectionName) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');
  const state = store.getState();
  const environmentId = state.activeEnv || undefined;

  // 构建 UI
  const panel = document.createElement('div');
  panel.className = 'runner-panel';

  panel.innerHTML = `
    <div class="runner-header">
      <div class="runner-title">
        <svg class="runner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>${escapeHtml(collectionName)}</span>
      </div>
      <button class="runner-stop-btn" id="runner-stop-btn">停止</button>
    </div>
    <div class="runner-config">
      <label class="runner-config-label">重试次数
        <input type="number" id="runner-retry-count" min="0" max="5" value="0" class="runner-config-input">
      </label>
      <label class="runner-config-label">重试间隔 (ms)
        <input type="number" id="runner-retry-delay" min="500" max="10000" step="500" value="1000" class="runner-config-input">
      </label>
    </div>
    <div class="runner-progress-bar">
      <div class="runner-progress-fill" id="runner-progress-fill"></div>
    </div>
    <div class="runner-progress-text" id="runner-progress-text">加载中...</div>
    <div class="runner-results" id="runner-results"></div>
    <div class="runner-summary hidden" id="runner-summary"></div>
  `;

  modal.innerHTML = '';
  modal.appendChild(panel);
  modal.style.maxWidth = '680px';
  modal.style.width = '680px';
  overlay.classList.remove('hidden');

  // 状态
  let totalRequests = 0;
  let completedRequests = 0;
  let requestItems = []; // { el, detailEl }

  const progressFill = panel.querySelector('#runner-progress-fill');
  const progressText = panel.querySelector('#runner-progress-text');
  const resultsEl = panel.querySelector('#runner-results');
  const summaryEl = panel.querySelector('#runner-summary');
  const stopBtn = panel.querySelector('#runner-stop-btn');
  const retryCountInput = panel.querySelector('#runner-retry-count');
  const retryDelayInput = panel.querySelector('#runner-retry-delay');

  // 禁用重试配置（运行时不可更改）
  function disableConfig() {
    retryCountInput.disabled = true;
    retryDelayInput.disabled = true;
  }

  // 停止按钮
  stopBtn.addEventListener('click', () => {
    if (currentRun) {
      currentRun.abort();
      currentRun = null;
    }
    stopBtn.textContent = '关闭中...';
    stopBtn.disabled = true;
  });

  // 关闭按钮（运行完成后）
  function switchToClose() {
    stopBtn.textContent = '关闭';
    stopBtn.className = 'runner-close-btn';
    stopBtn.disabled = false;
    stopBtn.onclick = () => {
      overlay.classList.add('hidden');
      modal.style.maxWidth = '';
      modal.style.width = '';
      if (currentRun) {
        currentRun.abort();
        currentRun = null;
      }
    };
  }

  // 更新进度
  function updateProgress() {
    const pct = totalRequests > 0 ? (completedRequests / totalRequests * 100) : 0;
    progressFill.style.width = pct + '%';
    progressText.textContent = `${completedRequests} / ${totalRequests} 个请求`;
  }

  // 添加请求项
  function addRequestItem(index, name, method, url) {
    const el = document.createElement('div');
    el.className = 'runner-result-item pending';
    let shortUrl = url;
    try { shortUrl = new URL(url).pathname; } catch {}

    el.innerHTML = `
      <div class="runner-result-summary">
        <span class="runner-result-icon">○</span>
        <span class="runner-result-method method-${method}">${escapeHtml(method)}</span>
        <span class="runner-result-name">${escapeHtml(name)}</span>
        <span class="runner-result-url">${escapeHtml(shortUrl)}</span>
        <span class="runner-result-status"></span>
        <span class="runner-result-time"></span>
        <span class="runner-result-tests"></span>
      </div>
      <div class="runner-result-detail hidden"></div>
    `;

    el.querySelector('.runner-result-summary').addEventListener('click', () => {
      const detail = el.querySelector('.runner-result-detail');
      detail.classList.toggle('hidden');
      el.classList.toggle('expanded');
    });

    resultsEl.appendChild(el);
    return { el, detailEl: el.querySelector('.runner-result-detail') };
  }

  // 更新请求项
  function updateRequestItem(item, data) {
    const el = item.el;
    const icon = el.querySelector('.runner-result-icon');
    const statusEl = el.querySelector('.runner-result-status');
    const timeEl = el.querySelector('.runner-result-time');
    const testsEl = el.querySelector('.runner-result-tests');

    el.classList.remove('pending', 'running');
    if (data.error) {
      el.classList.add('failed');
      icon.textContent = '❌';
      statusEl.textContent = data.error.includes('超时') ? 'Timeout' : '错误';
      statusEl.className = 'runner-result-status error';
    } else {
      const hasFailedTest = data.tests && Object.values(data.tests).some(v => !v);
      if (hasFailedTest) {
        el.classList.add('failed');
        icon.textContent = '❌';
      } else {
        el.classList.add('passed');
        icon.textContent = '✅';
      }
      statusEl.textContent = data.status != null ? String(data.status) : '';
      statusEl.className = 'runner-result-status ' + (data.status >= 400 ? 'error' : 'success');
    }

    timeEl.textContent = data.time != null ? `${data.time}ms` : '';

    // 重试标记
    const retryCount = data.retryCount || 0;
    if (retryCount > 0) {
      const retryBadge = document.createElement('span');
      retryBadge.className = 'runner-retry-badge';
      retryBadge.textContent = `\u21BB${retryCount}`;
      retryBadge.title = `\u91CD\u8BD5\u4E86 ${retryCount} \u6B21`;
      // 移除旧的重试标记
      const oldBadge = el.querySelector('.runner-retry-badge');
      if (oldBadge) oldBadge.remove();
      timeEl.after(retryBadge);
    }

    const testPass = data.passed || 0;
    const testFail = data.failed || 0;
    if (testPass + testFail > 0) {
      const parts = [];
      if (testPass > 0) parts.push(`<span class="test-pass">${testPass} 通过</span>`);
      if (testFail > 0) parts.push(`<span class="test-fail">${testFail} 失败</span>`);
      testsEl.innerHTML = parts.join(' / ');
    }

    // 详情：测试断言列表 + 脚本日志
    const detailEl = item.detailEl;
    let detailHtml = '';

    if (data.tests && Object.keys(data.tests).length > 0) {
      detailHtml += '<div class="runner-detail-section"><div class="runner-detail-label">断言</div>';
      for (const [name, passed] of Object.entries(data.tests)) {
        detailHtml += `<div class="runner-assertion ${passed ? 'pass' : 'fail'}">${passed ? '✓' : '✗'} ${escapeHtml(name)}</div>`;
      }
      detailHtml += '</div>';
    }

    const allLogs = [];
    if (data.scriptLogs) allLogs.push(...data.scriptLogs);
    if (data.postScriptLogs) allLogs.push(...data.postScriptLogs);
    if (allLogs.length > 0) {
      detailHtml += '<div class="runner-detail-section"><div class="runner-detail-label">控制台</div>';
      for (const log of allLogs) {
        detailHtml += `<div class="runner-log-line">${escapeHtml(log)}</div>`;
      }
      detailHtml += '</div>';
    }

    if (data.error) {
      detailHtml += `<div class="runner-detail-section"><div class="runner-detail-label">错误</div><div class="runner-error-msg">${escapeHtml(data.error)}</div></div>`;
    }

    if (detailHtml) {
      detailEl.innerHTML = detailHtml;
    }
  }

  // 发起运行
  const retryCount = Math.max(0, Math.min(5, parseInt(retryCountInput.value) || 0));
  const retryDelayMs = Math.max(500, Math.min(10000, parseInt(retryDelayInput.value) || 1000));
  disableConfig();

  currentRun = api.runCollection(collectionId, environmentId, {
    onStart(data) {
      totalRequests = data.totalRequests;
      updateProgress();
      if (totalRequests === 0) {
        progressText.textContent = '集合中没有请求';
        switchToClose();
      }
    },
    onRequestStart(data) {
      const item = addRequestItem(data.index, data.name, data.method, data.url);
      requestItems[data.index] = item;
      // 标记为运行中
      item.el.classList.add('running');
      item.el.querySelector('.runner-result-icon').textContent = '⏳';
    },
    onRequestRetry(data) {
      const item = requestItems[data.index];
      if (!item) return;
      const icon = item.el.querySelector('.runner-result-icon');
      icon.textContent = '\u{1F504}';
      item.el.querySelector('.runner-result-status').textContent = `\u91CD\u8BD5 ${data.attempt}/${data.maxRetries}`;
      item.el.querySelector('.runner-result-status').className = 'runner-result-status retry';
    },
    onRequestComplete(data) {
      completedRequests++;
      updateProgress();
      if (requestItems[data.index]) {
        updateRequestItem(requestItems[data.index], data);
      }
    },
    onDone(data) {
      progressFill.style.width = '100%';
      progressText.textContent = `完成 — ${completedRequests} / ${totalRequests} 个请求`;

      // 显示汇总
      summaryEl.classList.remove('hidden');
      const stoppedLabel = data.stopped ? '<span class="summary-stopped">已停止</span>' : '';
      summaryEl.innerHTML = `
        ${stoppedLabel}
        <span class="summary-pass">${data.passed} 通过</span>
        ${data.failed > 0 ? `<span class="summary-fail">${data.failed} 失败</span>` : ''}
        <span class="summary-total">共 ${data.total} 个</span>
        <span class="summary-time">${data.totalTime}ms</span>
      `;

      switchToClose();
      currentRun = null;
    },
    onError(data) {
      progressText.textContent = '连接错误';
      switchToClose();
      currentRun = null;
    },
  }, { retryCount, retryDelayMs });
}
