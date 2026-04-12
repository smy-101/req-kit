import { escapeHtml } from '../utils/template.js';
import { highlightJson, highlightXml } from '../utils/syntax-highlight.js';

function _highlightSearchInHtml(html, term) {
  const termLower = term.toLowerCase();
  let result = '', i = 0;
  while (i < html.length) {
    if (html[i] === '<') { const end = html.indexOf('>', i); if (end === -1) break; result += html.slice(i, end + 1); i = end + 1; }
    else {
      const remaining = html.slice(i);
      const matchIdx = remaining.toLowerCase().indexOf(termLower);
      if (matchIdx === -1) { result += remaining; break; }
      result += html.slice(i, i + matchIdx);
      result += `<mark class="search-highlight">${html.slice(i + matchIdx, i + matchIdx + term.length)}</mark>`;
      i = i + matchIdx + term.length;
    }
  }
  return result;
}

function _highlightSearchInDOM(root, term) {
  const termLower = term.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodesToReplace = [];
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent;
    const firstIdx = text.toLowerCase().indexOf(termLower);
    if (firstIdx === -1) continue;
    const frag = document.createDocumentFragment();
    let pos = 0;
    while (pos < text.length) {
      const idx = text.toLowerCase().indexOf(termLower, pos);
      if (idx === -1) { if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos))); break; }
      if (idx > pos) frag.appendChild(document.createTextNode(text.slice(pos, idx)));
      const mark = document.createElement('mark');
      mark.className = 'search-highlight'; mark.textContent = text.slice(idx, idx + term.length);
      frag.appendChild(mark); pos = idx + term.length;
    }
    nodesToReplace.push({ oldNode: node, frag });
  }
  for (const { oldNode, frag } of nodesToReplace) oldNode.parentNode.replaceChild(frag, oldNode);
}

export function init(deps) {
  let searchVisible = false;
  let searchTerm = '';
  let searchMatches = [];
  let currentMatchIdx = -1;

  const getVScroller = deps.getVScroller;
  const getFormatContentEl = deps.getFormatContentEl;
  const getLastResponseText = deps.getLastResponseText;
  const getCurrentFormat = deps.getCurrentFormat;
  const getPrettyHighlighted = deps.getPrettyHighlighted;
  const renderCurrentFormat = deps.renderCurrentFormat;

  const searchBar = document.getElementById('response-search-bar');
  const searchInput = document.getElementById('response-search-input');
  const searchCountEl = document.getElementById('response-search-count');

  function showSearch() { searchVisible = true; searchBar.classList.remove('hidden'); searchInput.focus(); searchInput.select(); }
  function hideSearch() { searchVisible = false; searchBar.classList.add('hidden'); clearSearch(); }

  function clearSearch() {
    searchTerm = ''; searchMatches = []; currentMatchIdx = -1;
    searchInput.value = ''; searchCountEl.textContent = '';
    const vscroller = getVScroller();
    if (vscroller) vscroller.invalidateCache();
    else renderCurrentFormat();
  }

  function performSearch(term) {
    searchTerm = term; searchMatches = []; currentMatchIdx = -1;
    if (!term || !getLastResponseText()) { searchCountEl.textContent = ''; const vscroller = getVScroller(); if (vscroller) vscroller.invalidateCache(); else renderCurrentFormat(); return; }
    const termLower = term.toLowerCase();
    const vscroller = getVScroller();
    if (vscroller) {
      const lines = getLastResponseText().split('\n');
      for (let i = 0; i < lines.length; i++) { if (lines[i].toLowerCase().includes(termLower)) searchMatches.push({ lineIdx: i }); }
    } else {
      const text = getLastResponseText().toLowerCase();
      let pos = 0;
      while ((pos = text.indexOf(termLower, pos)) !== -1) { searchMatches.push({}); pos += termLower.length; }
    }
    if (searchMatches.length > 0) currentMatchIdx = 0;
    updateSearchCount();
    applySearchHighlights();
  }

  function updateSearchCount() {
    searchCountEl.textContent = searchMatches.length === 0 ? (searchTerm ? '0/0' : '') : `${currentMatchIdx + 1}/${searchMatches.length}`;
  }

  function applySearchHighlights() {
    const vscroller = getVScroller();
    if (vscroller) {
      vscroller.invalidateCache();
      if (currentMatchIdx >= 0) vscroller.scrollToLine(searchMatches[currentMatchIdx].lineIdx);
    } else {
      const formatContentEl = getFormatContentEl();
      const pre = formatContentEl?.querySelector('pre');
      if (pre && getLastResponseText()) {
        if (getCurrentFormat() === 'raw') pre.innerHTML = escapeHtml(getLastResponseText());
        else pre.innerHTML = getPrettyHighlighted();
        if (searchTerm) _highlightSearchInDOM(pre, searchTerm);
        if (currentMatchIdx >= 0) {
          const marks = pre.querySelectorAll('.search-highlight');
          if (marks.length > 0) {
            const target = marks[currentMatchIdx] || marks[0];
            marks.forEach(m => m.classList.remove('search-highlight-current'));
            target.classList.add('search-highlight-current');
            target.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
      }
    }
  }

  function navigateMatch(direction) {
    if (searchMatches.length === 0) return;
    currentMatchIdx += direction;
    if (currentMatchIdx < 0) currentMatchIdx = searchMatches.length - 1;
    if (currentMatchIdx >= searchMatches.length) currentMatchIdx = 0;
    updateSearchCount();
    applySearchHighlights();
  }

  searchInput.addEventListener('input', () => performSearch(searchInput.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); navigateMatch(e.shiftKey ? -1 : 1); }
    else if (e.key === 'Escape') hideSearch();
  });
  document.getElementById('search-prev-btn').addEventListener('click', () => navigateMatch(-1));
  document.getElementById('search-next-btn').addEventListener('click', () => navigateMatch(1));
  document.getElementById('search-close-btn').addEventListener('click', () => hideSearch());
  document.getElementById('search-toggle-btn').addEventListener('click', () => {
    if (searchVisible) { searchInput.focus(); searchInput.select(); }
    else showSearch();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      const panel = document.getElementById('response-panel');
      const bodyTab = document.querySelector('[data-response-tab="body"]');
      if (panel && bodyTab?.classList.contains('active') && panel.offsetWidth > 0) { e.preventDefault(); showSearch(); }
    }
  });
  function resetSearch() {
    searchTerm = ''; searchMatches = []; currentMatchIdx = -1;
    searchInput.value = '';
    searchCountEl.textContent = '';
    if (searchVisible) hideSearch();
  }
  function isSearchVisible() { return searchVisible; }
  function getSearchBar() { return searchBar; }

  return { resetSearch, isSearchVisible, getSearchBar };
}
