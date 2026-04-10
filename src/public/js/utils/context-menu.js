// 右键上下文菜单
export function showContextMenu(e, items) {
  return new Promise((resolve) => {
    const menu = document.createElement('div');
    menu.className = 'context-menu';

    for (const item of items) {
      const btn = document.createElement('button');
      btn.className = 'context-menu-item' + (item.danger ? ' danger' : '');
      btn.textContent = item.label;
      btn.addEventListener('click', () => {
        menu.remove();
        resolve(item.value);
      });
      menu.appendChild(btn);
    }

    // 位置：避免超出窗口
    const x = Math.min(e.clientX, window.innerWidth - 160);
    const y = Math.min(e.clientY, window.innerHeight - items.length * 36 - 10);
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    document.body.appendChild(menu);

    // 点击外部关闭
    const close = (ev) => {
      if (!menu.contains(ev.target)) {
        menu.remove();
        resolve(null);
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  });
}
