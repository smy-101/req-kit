/** 纯函数：计算下一个主题值（便于测试） */
export function toggleTheme(current) {
  return current === 'dark' ? 'light' : 'dark';
}

export function init() {
  const KEY = 'theme';
  const sidebarHeader = document.querySelector('.sidebar-actions');
  if (!sidebarHeader) return;

  const btn = document.createElement('button');
  btn.id = 'btn-theme-toggle';
  btn.title = '切换主题';
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  btn.style.cursor = 'pointer';

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = toggleTheme(current);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(KEY, next);
  });

  sidebarHeader.insertBefore(btn, sidebarHeader.firstChild);
}
