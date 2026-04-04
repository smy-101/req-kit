// HTML 转义 — 字符串替换，避免每次 createElement 的开销
function escapeHtml(str) {
  return (str == null ? '' : String(str))
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 输入防抖工具 — 统一管理所有防抖定时器，支持发送前 flush
const InputDebounce = {
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
const CollectionTree = {
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

// Template variable highlighter
const TemplateHighlighter = {
  // Find all {{variable}} patterns in text
  findVariables(text) {
    const regex = /\{\{([\w-]+)\}\}/g;
    const vars = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      vars.push({ name: match[1], start: match.index, end: match.index + match[0].length });
    }
    return vars;
  },

  // Highlight variables in an input element
  highlightInput(inputEl) {
    const vars = this.findVariables(inputEl.value);
    if (vars.length === 0) return;

    // Just set a CSS indicator that there are template variables
    inputEl.title = `Variables: ${vars.map(v => v.name).join(', ')}`;
    inputEl.style.borderColor = 'var(--accent)';
    setTimeout(() => { inputEl.style.borderColor = ''; }, 2000);
  },

  // Get all unique variable names from the current request state
  getUsedVariables() {
    const state = store.getState();
    const vars = new Set();
    const texts = [
      state.url,
      state.body,
      ...state.headers.map(h => h.key + h.value),
      ...state.params.map(p => p.key + p.value),
    ];

    for (const text of texts) {
      for (const v of this.findVariables(text || '')) {
        vars.add(v.name);
      }
    }

    return vars;
  },

  // Check if all variables are resolved in the current environment
  validateVariables() {
    const used = this.getUsedVariables();
    const state = store.getState();
    const env = state.environments.find(e => e.id === state.activeEnv);

    if (!env) return { valid: used.size === 0, unresolved: [...used] };

    const defined = new Set((env.variables || []).filter(v => v.enabled).map(v => v.key));
    const unresolved = [...used].filter(v => !defined.has(v));

    return { valid: unresolved.length === 0, unresolved };
  }
};
