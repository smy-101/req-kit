// Frontend curl parser for preview/validation
const CurlParser = {
  parse(cmd) {
    try {
      let method = 'GET';
      let url = '';
      const headers = {};
      let body;

      const tokens = this.tokenize(cmd.trim());
      if (tokens.length === 0) return null;

      let i = 0;
      if (tokens[0]?.toLowerCase() === 'curl') i++;

      while (i < tokens.length) {
        const t = tokens[i];
        if (t === '-X' || t === '--request') {
          i++;
          if (tokens[i]) method = tokens[i].toUpperCase();
        } else if (t === '-H' || t === '--header') {
          i++;
          if (tokens[i]) {
            const idx = tokens[i].indexOf(':');
            if (idx > 0) headers[tokens[i].slice(0, idx).trim()] = tokens[i].slice(idx + 1).trim();
          }
        } else if (t === '-d' || t === '--data' || t === '--data-raw') {
          i++;
          if (tokens[i]) { body = tokens[i]; if (method === 'GET') method = 'POST'; }
        } else if (!t.startsWith('-') && !url) {
          url = t;
        }
        i++;
      }

      if (!url || !/^https?:\/\//i.test(url)) return null;
      return { method, url, headers, body };
    } catch {
      return null;
    }
  },

  tokenize(cmd) {
    const tokens = [];
    let current = '';
    let inSQ = false;
    let inDQ = false;

    for (let i = 0; i < cmd.length; i++) {
      const ch = cmd[i];
      if (inSQ) { if (ch === "'") inSQ = false; else current += ch; }
      else if (inDQ) { if (ch === '"') inDQ = false; else current += ch; }
      else if (ch === "'") inSQ = true;
      else if (ch === '"') inDQ = true;
      else if (ch === ' ' || ch === '\t') { if (current) { tokens.push(current); current = ''; } }
      else current += ch;
    }
    if (current) tokens.push(current);
    return tokens;
  },

  toPreview(parsed) {
    if (!parsed) return 'Invalid curl command';
    let preview = `<strong style="color:var(--green)">${parsed.method}</strong> ${parsed.url}`;
    if (Object.keys(parsed.headers).length > 0) {
      preview += '<br><span style="color:var(--text-dim);font-size:11px">Headers: ' + Object.keys(parsed.headers).join(', ') + '</span>';
    }
    if (parsed.body) {
      preview += '<br><span style="color:var(--text-dim);font-size:11px">Body: ' + parsed.body.slice(0, 50) + (parsed.body.length > 50 ? '...' : '') + '</span>';
    }
    return preview;
  }
};
