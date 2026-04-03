// Template variable highlighter
const TemplateHighlighter = {
  // Find all {{variable}} patterns in text
  findVariables(text) {
    const regex = /\{\{(\w+)\}\}/g;
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
