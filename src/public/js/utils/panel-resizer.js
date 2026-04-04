(function () {
  const resizer = document.getElementById('panel-resizer');
  const requestPanel = document.getElementById('request-panel');
  const container = document.getElementById('request-response');

  if (!resizer || !requestPanel || !container) return;

  const MIN = 20;
  const MAX = 75;

  let cachedRect = null;
  let rafId = null;
  let pendingClientY = null;

  function onMove(clientY) {
    const rect = cachedRect;
    if (!rect) return;
    const pct = ((clientY - rect.top) / rect.height) * 100;
    const clamped = Math.min(MAX, Math.max(MIN, pct));
    requestPanel.style.flex = '0 0 ' + clamped + '%';
  }

  function scheduleFrame(clientY) {
    pendingClientY = clientY;
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        onMove(pendingClientY);
        rafId = null;
      });
    }
  }

  function cleanup() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    cachedRect = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  }

  function onMouseMove(e) {
    e.preventDefault();
    scheduleFrame(e.clientY);
  }

  function onMouseUp() {
    cleanup();
  }

  function onTouchMove(e) {
    e.preventDefault();
    scheduleFrame(e.touches[0].clientY);
  }

  function onTouchEnd() {
    cleanup();
  }

  function startDrag() {
    // 拖拽开始时缓存容器尺寸，避免每帧 getBoundingClientRect 强制布局
    cachedRect = container.getBoundingClientRect();
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove, { passive: false });
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }

  resizer.addEventListener('mousedown', startDrag);
  resizer.addEventListener('touchstart', startDrag, { passive: true });
})();
