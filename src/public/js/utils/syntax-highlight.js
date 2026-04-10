// JSON / XML 语法高亮与 XML 格式化
import { escapeHtml } from './template.js';

export function highlightJson(json) {
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = 'json-number';
    if (/^"/.test(match)) cls = /:$/.test(match) ? 'json-key' : 'json-string';
    else if (/true|false/.test(match)) cls = 'json-bool';
    else if (/null/.test(match)) cls = 'json-null';
    return `<span class="${cls}">${match}</span>`;
  });
}

export function highlightXml(xml) {
  return escapeHtml(xml).replace(
    /(&lt;\/?)([\w:-]+)/g,
    '$1<span class="xml-tag">$2</span>'
  ).replace(
    /([\w:-]+)(=)(&quot;[^&]*&quot;)/g,
    '<span class="xml-attr">$1</span>$2<span class="xml-value">$3</span>'
  );
}

export function formatXml(xml) {
  const lines = xml.replace(/>\s*</g, '>\n<').split('\n');
  let indent = 0;
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('</')) {
      indent = Math.max(0, indent - 1);
    }
    result.push('  '.repeat(indent) + trimmed);
    if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<?') &&
        !trimmed.endsWith('/>') && !trimmed.includes('</')) {
      indent++;
    }
  }
  return result.join('\n');
}
