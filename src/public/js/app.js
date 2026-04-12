// App entry point - explicit init() calls, no side-effect imports
import { store } from './store.js';
import { api } from './api.js';
import { initPanelResizer } from './utils/panel-resizer.js';
import { InputDebounce } from './utils/template.js';
import { matchShortcut } from './utils/shortcuts.js';

// Simple components (no return value)
import { init as initUrlBar } from './components/url-bar.js';
import { init as initTabBar } from './components/tab-bar.js';
import { init as initTabPanel } from './components/tab-panel.js';
import { init as initHeadersEditor } from './components/headers-editor.js';
import { init as initBodyEditor } from './components/body-editor.js';
import { init as initAuthPanel } from './components/auth-panel.js';
import { init as initScriptEditor } from './components/script-editor.js';
import { init as initPostScriptEditor } from './components/post-script-editor.js';
import { init as initTestResults } from './components/test-results.js';
import { init as initCookieTab } from './components/cookie-tab.js';
import { init as initRequestOptions } from './components/request-options.js';
import { init as initVariableAutocomplete } from './components/variable-autocomplete.js';
import { init as initCollectionVarEditor } from './components/collection-var-editor.js';
import { init as initImportExport } from './components/import-export.js';
import { init as initThemeSwitcher } from './components/theme-switcher.js';

// Components with public API
import { init as initResponseViewer } from './components/response-viewer.js';
import { init as initSidebar } from './components/sidebar.js';
import { init as initEnvManager } from './components/env-manager.js';
import { init as initHistoryPanel } from './components/history-panel.js';
import { init as initCookieManager } from './components/cookie-manager.js';
import { init as initVariablePreview } from './components/variable-preview.js';
import { init as initGlobalVarModal } from './components/global-var-modal.js';
import { init as initRunnerPanel } from './components/runner-panel.js';

import { Modal } from './utils/modal.js';

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  const action = matchShortcut(e, e.target?.tagName, e.target?.isContentEditable);
  if (!action) return;

  switch (action) {
    case 'save':
      e.preventDefault();
      document.getElementById('save-btn').click();
      break;
    case 'send':
      e.preventDefault();
      document.getElementById('send-btn').click();
      break;
    case 'close-modal':
      Modal.close();
      break;
    case 'new-request':
      e.preventDefault();
      sidebar.saveAsNewRequest();
      break;
    case 'close-tab':
      e.preventDefault();
      const tab = store.getActiveTab();
      if (tab) store.closeTab(tab.id);
      break;
    case 'next-tab':
      e.preventDefault();
      store.switchToNextTab();
      break;
    case 'prev-tab':
      e.preventDefault();
      store.switchToPrevTab();
      break;
    case 'new-tab':
      e.preventDefault();
      store.createTab();
      break;
  }
});

// Initialize panel resizer
initPanelResizer();

// Initialize cookie manager
const cookieManager = initCookieManager();

// Initialize variable preview (needs showGlobalVarModal)
// Pass a stub; will be updated after global-var-modal init
let _showGlobalVarModal = () => {};
const variablePreview = initVariablePreview(() => { _showGlobalVarModal(); });
const { refreshGlobalVars: refreshGlobalVars } = variablePreview;

// Initialize global-var-modal (needs refreshGlobalVars)
const globalVarModal = initGlobalVarModal(refreshGlobalVars);
_showGlobalVarModal = globalVarModal.showGlobalVarModal;

// Initialize simple components (no return value)
initUrlBar();
initTabBar();
initTabPanel();
initHeadersEditor();
initBodyEditor();
initAuthPanel();
initScriptEditor();
initPostScriptEditor();
initTestResults();
initCookieTab();
initRequestOptions();
initVariableAutocomplete();
initThemeSwitcher();

// Initialize history panel (returns HistoryPanel)
const { HistoryPanel } = initHistoryPanel();

// Initialize runner panel (returns openRunnerPanel)
const runnerPanel = initRunnerPanel();

// Initialize sidebar (needs HistoryPanel for tree rendering)
const sidebar = initSidebar(runnerPanel.openRunnerPanel, HistoryPanel);

// Initialize response viewer (async — dynamically imports response-search)
initResponseViewer();

// Initialize env manager
initEnvManager();

// Initialize import-export (needs sidebar.refreshCollections)
initImportExport(() => sidebar.refreshCollections());

// Initialize collection-var-editor (needs sidebar.refreshCollections)
initCollectionVarEditor(() => sidebar.refreshCollections());

// Wire up save button
document.getElementById('save-btn').addEventListener('click', () => {
  InputDebounce.flush();
  const tab = store.getActiveTab();
  if (tab && tab.requestId) {
    sidebar.updateExistingRequest?.(tab);
  } else {
    sidebar.saveAsNewRequest();
  }
});

// Create initial empty tab
store.createTab();

console.log('req-kit initialized');
