// Tab Bar component
(function() {
  const container = document.getElementById('tab-bar');

  function getTabTitle(tab) {
    if (!tab.url) return 'New Request';
    try {
      const url = new URL(tab.url);
      return `${tab.method} ${url.pathname}`;
    } catch {
      return `${tab.method} ${tab.url}`;
    }
  }

  function render() {
    const { tabs, activeTabId } = store.getState();

    container.innerHTML = '';

    for (const tab of tabs) {
      const tabEl = document.createElement('div');
      tabEl.className = 'request-tab' + (tab.id === activeTabId ? ' active' : '');
      tabEl.dataset.tabId = tab.id;

      const title = document.createElement('span');
      title.className = 'request-tab-title';
      title.textContent = getTabTitle(tab);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'request-tab-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.title = 'Close tab';

      // Click x to close
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        store.closeTab(tab.id);
      });

      tabEl.appendChild(title);
      tabEl.appendChild(closeBtn);

      // Click tab to switch
      tabEl.addEventListener('click', () => {
        store.switchTab(tab.id);
      });

      // Middle-click to close
      tabEl.addEventListener('mousedown', (e) => {
        if (e.button === 1) {
          e.preventDefault();
          store.closeTab(tab.id);
        }
      });

      container.appendChild(tabEl);
    }

    // "+" button
    const addBtn = document.createElement('button');
    addBtn.className = 'request-tab-add';
    addBtn.innerHTML = '+';
    addBtn.title = 'New tab (Ctrl+T)';
    addBtn.addEventListener('click', () => {
      store.createTab();
    });
    container.appendChild(addBtn);
  }

  // Re-render on tab lifecycle events and title changes only
  store.on('tab:created', render);
  store.on('tab:closed', render);
  store.on('tab:switch', render);
  store.on('tab:title-change', render);

  render();
})();
