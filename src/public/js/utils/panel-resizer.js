(function () {
  const resizer = document.getElementById('panel-resizer');
  const requestPanel = document.getElementById('request-panel');
  const container = document.getElementById('request-response');

  if (!resizer || !requestPanel || !container) return;

  const MIN = 20;
  const MAX = 75;

  function onMove(clientY) {
    const rect = container.getBoundingClientRect();
    const pct = ((clientY - rect.top) / rect.height) * 100;
    const clamped = Math.min(MAX, Math.max(MIN, pct));
    requestPanel.style.flex = '0 0 ' + clamped + '%';
  }

  function cleanup() {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  }

  function onMouseMove(e) {
    e.preventDefault();
    onMove(e.clientY);
  }

  function onMouseUp() {
    cleanup();
  }

  function onTouchMove(e) {
    e.preventDefault();
    onMove(e.touches[0].clientY);
  }

  function onTouchEnd() {
    cleanup();
  }

  function startDrag() {
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
