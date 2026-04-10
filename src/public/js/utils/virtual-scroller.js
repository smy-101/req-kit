// 虚拟滚动组件 — 大文本（如 API 响应 body）的高性能渲染

const LINE_HEIGHT = 21; // ceil(12px * 1.7)
const BUFFER_LINES = 30;

export class VirtualScroller {
  constructor(container, lines, highlightFn) {
    this.container = container;
    this.lines = lines;
    this.highlightFn = highlightFn;
    this._cache = new Array(lines.length).fill(null);
    this.totalHeight = lines.length * LINE_HEIGHT;
    this._start = -1;
    this._end = -1;
    this._raf = null;
    // 搜索高亮回调（可选）— 由 response-search 设置
    // fn(lineHtml, lineIdx) => { html, cls } | null
    this._searchHighlightFn = null;

    this.el = document.createElement('div');
    this.el.className = 'vscroll-viewport';

    this.spacer = document.createElement('div');
    this.spacer.className = 'vscroll-spacer';
    this.spacer.style.height = this.totalHeight + 'px';

    this.content = document.createElement('div');
    this.content.className = 'vscroll-content';

    this.spacer.appendChild(this.content);
    this.el.appendChild(this.spacer);
    this.container.appendChild(this.el);

    this._onScroll = () => {
      if (!this._raf) {
        this._raf = requestAnimationFrame(() => {
          this.render();
          this._raf = null;
        });
      }
    };
    this.el.addEventListener('scroll', this._onScroll, { passive: true });

    this._resizeObserver = new ResizeObserver(() => {
      this._start = -1;
      this.render();
    });
    this._resizeObserver.observe(this.el);

    this.render();
  }

  setSearchHighlight(fn) {
    this._searchHighlightFn = fn;
  }

  render() {
    const scrollTop = this.el.scrollTop;
    const viewHeight = this.el.clientHeight;
    if (viewHeight === 0) return;

    let start = Math.floor(scrollTop / LINE_HEIGHT) - BUFFER_LINES;
    start = Math.max(0, start);
    let end = Math.ceil((scrollTop + viewHeight) / LINE_HEIGHT) + BUFFER_LINES;
    end = Math.min(this.lines.length, end);

    if (start === this._start && end === this._end) return;
    this._start = start;
    this._end = end;

    this.content.style.transform = `translateY(${start * LINE_HEIGHT}px)`;

    let html = '';
    for (let i = start; i < end; i++) {
      if (!this._cache[i]) {
        this._cache[i] = this.highlightFn(this.lines[i]);
      }
      let lineContent = this._cache[i];
      let cls = 'vline';
      if (this._searchHighlightFn) {
        const decorated = this._searchHighlightFn(lineContent, i);
        if (decorated) {
          lineContent = decorated.html || lineContent;
          if (decorated.cls) cls += ' ' + decorated.cls;
        }
      }
      html += `<div class="${cls}"><span class="vline-num">${i + 1}</span><span class="vline-code">${lineContent}</span></div>`;
    }
    this.content.innerHTML = html;
  }

  scrollToLine(lineIdx) {
    this.el.scrollTo({ top: Math.max(0, lineIdx * LINE_HEIGHT - this.el.clientHeight / 2), behavior: 'smooth' });
  }

  invalidateCache() {
    this._cache = new Array(this.lines.length).fill(null);
    this._start = -1;
    this._end = -1;
    this.render();
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this.el.removeEventListener('scroll', this._onScroll);
    this._resizeObserver.disconnect();
    this.container.innerHTML = '';
  }
}
