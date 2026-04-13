import { store } from '../store.js';
import { api } from '../api.js';
import { escapeHtml } from '../utils/template.js';
import { Modal } from '../utils/modal.js';

export function init() {
  async function openRunnerPanel(collectionId, collectionName) {
  const state = store.getState();
  const environmentId = state.activeEnv || undefined;

  const panel = document.createElement('div');
  panel.className = 'runner-panel';
  panel.innerHTML = `
    <div class="runner-header">
      <div class="runner-title">
        <svg class="runner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>${escapeHtml(collectionName)}</span>
      </div>
      <div class="runner-header-actions">
        <button class="runner-run-btn" id="runner-run-btn">运行</button>
        <button class="runner-stop-btn hidden" id="runner-stop-btn">停止</button>
        <button class="runner-close-btn hidden" id="runner-close-btn">关闭</button>
      </div>
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
    <div class="runner-progress-text" id="runner-progress-text">就绪</div>
    <div class="runner-results" id="runner-results"></div>
    <div class="runner-summary hidden" id="runner-summary"></div>`;

  Modal.open(panel, { maxWidth: '680px', width: '680px' });

  let currentRun = null;
  let totalRequests = 0;
  let completedRequests = 0;
  let requestItems = [];

  const progressFill = panel.querySelector('#runner-progress-fill');
  const progressText = panel.querySelector('#runner-progress-text');
  const resultsEl = panel.querySelector('#runner-results');
  const summaryEl = panel.querySelector('#runner-summary');
  const runBtn = panel.querySelector('#runner-run-btn');
  const stopBtn = panel.querySelector('#runner-stop-btn');
  const closeBtn = panel.querySelector('#runner-close-btn');
  const retryCountInput = panel.querySelector('#runner-retry-count');
  const retryDelayInput = panel.querySelector('#runner-retry-delay');

  function disableConfig() {
    retryCountInput.disabled = true;
    retryDelayInput.disabled = true;
  }

  function enableConfig() {
    retryCountInput.disabled = false;
    retryDelayInput.disabled = false;
  }

  function showRunView() {
    runBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    closeBtn.classList.add('hidden');
    enableConfig();
  }

  function showRunningView() {
    runBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    closeBtn.classList.add('hidden');
    disableConfig();
  }

  function showDoneView() {
    runBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    closeBtn.classList.remove('hidden');
    enableConfig();
  }

  stopBtn.addEventListener('click', () => {
    if (currentRun) { currentRun.abort(); currentRun = null; }
    stopBtn.textContent = '关闭中...'; stopBtn.disabled = true;
  });

  closeBtn.addEventListener('click', () => {
    Modal.close();
    if (currentRun) { currentRun.abort(); currentRun = null; }
  });

  runBtn.addEventListener('click', () => startRun());

  function updateProgress() {
    const pct = totalRequests > 0 ? (completedRequests / totalRequests * 100) : 0;
    progressFill.style.width = pct + '%';
    progressText.textContent = `${completedRequests} / ${totalRequests} 个请求`;
  }

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
      <div class="runner-result-detail hidden"></div>`;
    el.querySelector('.runner-result-summary').addEventListener('click', () => {
      el.querySelector('.runner-result-detail').classList.toggle('hidden');
      el.classList.toggle('expanded');
    });
    resultsEl.appendChild(el);
    return { el, detailEl: el.querySelector('.runner-result-detail') };
  }

  function updateRequestItem(item, data) {
    const el = item.el;
    const icon = el.querySelector('.runner-result-icon');
    const statusEl = el.querySelector('.runner-result-status');
    const timeEl = el.querySelector('.runner-result-time');
    const testsEl = el.querySelector('.runner-result-tests');
    el.classList.remove('pending', 'running');
    if (data.error) {
      el.classList.add('failed'); icon.textContent = '❌';
      statusEl.textContent = data.error.includes('超时') ? 'Timeout' : '错误';
      statusEl.className = 'runner-result-status error';
    } else {
      const hasFailedTest = data.tests && Object.values(data.tests).some(v => !v);
      if (hasFailedTest) { el.classList.add('failed'); icon.textContent = '❌'; }
      else { el.classList.add('passed'); icon.textContent = '✅'; }
      statusEl.textContent = data.status != null ? String(data.status) : '';
      statusEl.className = 'runner-result-status ' + (data.status >= 400 ? 'error' : 'success');
    }
    timeEl.textContent = data.time != null ? `${data.time}ms` : '';
    const retryCount = data.retryCount || 0;
    if (retryCount > 0) {
      const retryBadge = document.createElement('span');
      retryBadge.className = 'runner-retry-badge';
      retryBadge.textContent = `\u21BB${retryCount}`;
      retryBadge.title = `\u91CD\u8BD5\u4E86 ${retryCount} \u6B21`;
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
    const detailEl = item.detailEl;
    let detailHtml = '';
    if (data.tests && Object.keys(data.tests).length > 0) {
      detailHtml += '<div class="runner-detail-section"><div class="runner-detail-label">断言</div>';
      for (const [name, passed] of Object.entries(data.tests))
        detailHtml += `<div class="runner-assertion ${passed ? 'pass' : 'fail'}">${passed ? '✓' : '✗'} ${escapeHtml(name)}</div>`;
      detailHtml += '</div>';
    }
    const allLogs = [];
    if (data.scriptLogs) allLogs.push(...data.scriptLogs);
    if (data.postScriptLogs) allLogs.push(...data.postScriptLogs);
    if (allLogs.length > 0) {
      detailHtml += '<div class="runner-detail-section"><div class="runner-detail-label">控制台</div>';
      for (const log of allLogs) detailHtml += `<div class="runner-log-line">${escapeHtml(log)}</div>`;
      detailHtml += '</div>';
    }
    if (data.error) detailHtml += `<div class="runner-detail-section"><div class="runner-detail-label">错误</div><div class="runner-error-msg">${escapeHtml(data.error)}</div></div>`;
    if (detailHtml) detailEl.innerHTML = detailHtml;
  }

  function startRun() {
    // 重置状态
    completedRequests = 0;
    totalRequests = 0;
    requestItems = [];
    resultsEl.innerHTML = '';
    summaryEl.classList.add('hidden');
    summaryEl.innerHTML = '';
    progressFill.style.width = '0%';
    progressText.textContent = '运行中...';
    stopBtn.textContent = '停止';
    stopBtn.disabled = false;

    showRunningView();

    const retryCount = Math.max(0, Math.min(5, parseInt(retryCountInput.value) || 0));
    const retryDelayMs = Math.max(500, Math.min(10000, parseInt(retryDelayInput.value) || 1000));

    currentRun = api.runCollection(collectionId, environmentId, {
      onStart(data) { totalRequests = data.totalRequests; updateProgress(); if (totalRequests === 0) { progressText.textContent = '集合中没有请求'; showDoneView(); } },
      onRequestStart(data) { const item = addRequestItem(data.index, data.name, data.method, data.url); requestItems[data.index] = item; item.el.classList.add('running'); item.el.querySelector('.runner-result-icon').textContent = '⏳'; },
      onRequestRetry(data) { const item = requestItems[data.index]; if (!item) return; item.el.querySelector('.runner-result-icon').textContent = '\u{1F504}'; item.el.querySelector('.runner-result-status').textContent = `\u91CD\u8BD5 ${data.attempt}/${data.maxRetries}`; item.el.querySelector('.runner-result-status').className = 'runner-result-status retry'; },
      onRequestComplete(data) { completedRequests++; updateProgress(); if (requestItems[data.index]) updateRequestItem(requestItems[data.index], data); },
      onDone(data) { progressFill.style.width = '100%'; progressText.textContent = `完成 — ${completedRequests} / ${totalRequests} 个请求`; summaryEl.classList.remove('hidden'); summaryEl.innerHTML = `${data.stopped ? '<span class="summary-stopped">已停止</span>' : ''}<span class="summary-pass">${data.passed} 通过</span>${data.failed > 0 ? `<span class="summary-fail">${data.failed} 失败</span>` : ''}<span class="summary-total">共 ${data.total} 个</span><span class="summary-time">${data.totalTime}ms</span>`; showDoneView(); currentRun = null; },
      onError(data) { progressText.textContent = '连接错误'; summaryEl.classList.remove('hidden'); summaryEl.innerHTML = `<span class="summary-fail">连接错误</span><span class="summary-total">已完成 ${completedRequests} / ${totalRequests} 个</span>`; showDoneView(); currentRun = null; },
    }, { retryCount, retryDelayMs });
  }

  // 初始状态：显示运行按钮
  showRunView();
  }

  return { openRunnerPanel };
}
