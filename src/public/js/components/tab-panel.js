import { store } from '../store.js';

export function init() {
  document.querySelectorAll('#request-panel .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      document.querySelectorAll('#request-panel .tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('#request-panel .tab-content').forEach(c => {
        c.classList.add('hidden');
        c.style.display = 'none';
      });
      tab.classList.add('active');
      const selected = document.getElementById(`tab-${tabName}`);
      selected.classList.remove('hidden');
      selected.style.display = '';
      store.setState({ activeTab: tabName });
    });
  });

  document.querySelectorAll('#response-panel .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.responseTab;
      document.querySelectorAll('#response-panel .tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('#response-panel .tab-content').forEach(c => {
        c.classList.add('hidden');
        c.style.display = 'none';
      });
      tab.classList.add('active');
      const selected = document.getElementById(`response-${tabName}`);
      selected.classList.remove('hidden');
      selected.style.display = '';
      store.setState({ activeResponseTab: tabName });
    });
  });
}
