// HTML 转义 — 字符串替换，避免每次 createElement 的开销
export function escapeHtml(str) {
  return (str == null ? '' : String(str))
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 空状态 HTML — 响应面板初始/空状态
export function emptyStateHTML() {
  return `<div class="empty-state">
    <div class="empty-state-icon">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
    </div>
    <div class="empty-state-title">Send a Request</div>
    <div class="empty-state-desc">Enter a URL and press Send, or use <span class="kbd">Ctrl</span> + <span class="kbd">Enter</span></div>
  </div>`;
}

// 输入防抖工具 — 统一管理所有防抖定时器，支持发送前 flush
export const InputDebounce = {
  _timers: {},
  schedule(id, fn, ms = 150) {
    clearTimeout(this._timers[id]);
    this._timers[id] = setTimeout(() => { fn(); delete this._timers[id]; }, ms);
  },
  flush() {
    for (const id of Object.keys(this._timers)) {
      clearTimeout(this._timers[id]);
    }
    this._timers = {};
  },
};

// 集合树遍历工具
export const CollectionTree = {
  // 在集合树中按 id 查找集合
  findById(collections, id) {
    for (const col of collections) {
      if (col.id === id) return col;
      if (col.children) {
        const found = this.findById(col.children, id);
        if (found) return found;
      }
    }
    return null;
  },

  // 向上追溯 parent_id 到根集合
  findRoot(collections, id) {
    const col = this.findById(collections, id);
    if (!col) return null;
    let current = col;
    while (current.parent_id != null) {
      const parent = this.findById(collections, current.parent_id);
      if (!parent) break;
      current = parent;
    }
    return current;
  },
};
