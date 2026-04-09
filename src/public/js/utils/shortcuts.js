/**
 * 键盘快捷键匹配逻辑（纯函数，便于测试）
 */

export function matchShortcut(e, targetTag, isContentEditable = false) {
  // Ctrl+S / Cmd+S
  if (e.key === 's' && (e.ctrlKey || e.metaKey)) return 'save';
  // Ctrl+Tab / Ctrl+Shift+Tab（跳过 input/textarea）
  if (e.key === 'Tab' && (e.ctrlKey || e.metaKey)) {
    if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT' || isContentEditable) return null;
    return e.shiftKey ? 'prev-tab' : 'next-tab';
  }
  // Ctrl+Shift+N
  if (e.key === 'N' && (e.ctrlKey || e.metaKey) && e.shiftKey) return 'new-request';
  // Ctrl+Enter
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) return 'send';
  // Escape
  if (e.key === 'Escape') return 'close-modal';
  // Ctrl+W / Cmd+W
  if (e.key === 'w' && (e.ctrlKey || e.metaKey)) return 'close-tab';
  // Ctrl+T
  if (e.key === 't' && (e.ctrlKey || e.metaKey)) return 'new-tab';
  return null;
}
