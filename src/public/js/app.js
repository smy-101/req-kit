// App entry point - import all components and initialize
import { store } from './store.js';
import { initPanelResizer } from './utils/panel-resizer.js';

// Components (side-effect imports — they self-register on the store)
import './components/tab-bar.js';
import './components/url-bar.js';
import './components/tab-panel.js';
import './components/headers-editor.js';
import './components/body-editor.js';
import './components/response-viewer.js';
import './components/history-panel.js';
import './components/sidebar.js';
import './components/env-manager.js';
import './components/auth-panel.js';
import './components/import-export.js';
import './components/script-editor.js';
import './components/post-script-editor.js';
import './components/test-results.js';
import './components/variable-preview.js';
import './components/global-var-modal.js';
import './components/collection-var-editor.js';
import './components/variable-autocomplete.js';
import './components/cookie-manager.js';
import './components/cookie-tab.js';
import './components/request-options.js';

// Close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') {
    e.target.classList.add('hidden');
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl+Enter to send
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    document.getElementById('send-btn').click();
  }
  // Escape to close modals
  if (e.key === 'Escape') {
    document.getElementById('modal-overlay').classList.add('hidden');
  }
  // Ctrl+W / Cmd+W to close active tab
  if (e.key === 'w' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    const tab = store.getActiveTab();
    if (tab) store.closeTab(tab.id);
  }
  // Ctrl+T to create new tab
  if (e.key === 't' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    store.createTab();
  }
});

// Initialize panel resizer
initPanelResizer();

// Log state changes in development
store.on('change', (state) => {
  // Uncomment for debugging:
  // console.log('State:', state);
});

// Create initial empty tab
store.createTab();

console.log('req-kit initialized');
