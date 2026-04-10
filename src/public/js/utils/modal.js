// Modal 栈管理器 — 统一管理 #modal-overlay / #modal 的 open/close/replace
// 天然支持嵌套对话框，close 时自动恢复上一层内容

const _stack = []; // { html, styles }
let _overlay, _modal;
let _savedStyles = null;

function _getOverlay() {
  if (!_overlay) _overlay = document.getElementById('modal-overlay');
  return _overlay;
}

function _getModal() {
  if (!_modal) _modal = document.getElementById('modal');
  return _modal;
}

function _saveStyles() {
  if (_savedStyles) return;
  const modal = _getModal();
  _savedStyles = {
    maxWidth: modal.style.maxWidth,
    width: modal.style.width,
  };
}

function _restoreStyles() {
  if (!_savedStyles) return;
  const modal = _getModal();
  modal.style.maxWidth = _savedStyles.maxWidth;
  modal.style.width = _savedStyles.width;
  _savedStyles = null;
}

function _hideOverlay() {
  _getOverlay().classList.add('hidden');
}

function _showOverlay() {
  _getOverlay().classList.remove('hidden');
}

export const Modal = {
  open(html, styles) {
    const modal = _getModal();
    // 保存当前内容到栈
    if (modal.innerHTML || !_getOverlay().classList.contains('hidden')) {
      _stack.push({ html: modal.innerHTML, styles: {
        maxWidth: modal.style.maxWidth,
        width: modal.style.width,
      }});
    }
    // 仅在第一次 open 时保存原始样式
    _saveStyles();
    // 设置新内容
    modal.innerHTML = html;
    if (styles) {
      if (styles.maxWidth != null) modal.style.maxWidth = styles.maxWidth;
      if (styles.width != null) modal.style.width = styles.width;
    }
    _showOverlay();
  },

  close() {
    const modal = _getModal();
    if (_stack.length > 0) {
      const prev = _stack.pop();
      modal.innerHTML = prev.html;
      modal.style.maxWidth = prev.styles.maxWidth;
      modal.style.width = prev.styles.width;
    } else {
      modal.innerHTML = '';
      _restoreStyles();
      _hideOverlay();
    }
  },

  replace(html, styles) {
    const modal = _getModal();
    modal.innerHTML = html;
    if (styles) {
      if (styles.maxWidth != null) modal.style.maxWidth = styles.maxWidth;
      if (styles.width != null) modal.style.width = styles.width;
    }
  },
};
