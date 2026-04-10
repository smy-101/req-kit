import { store } from '../store.js';
import { InputDebounce } from '../utils/template.js';
import { createKVEditor } from '../utils/kv-editor.js';

// Key-Value editors for request headers and params
function createTabKVEditor(containerId, storeKey) {
  const container = document.getElementById(containerId);
  const _syncId = storeKey + '-sync';

  function getInitialRows() {
    const tab = store.getActiveTab();
    return tab && tab[storeKey] && tab[storeKey].length > 0
      ? [...tab[storeKey]]
      : [{ key: '', value: '', enabled: true }];
  }

  const editor = createKVEditor(container, {
    rows: getInitialRows(),
    onChange(rows) {
      InputDebounce.schedule(_syncId, () => {
        store.setState({ [storeKey]: [...rows] });
      });
    },
  });

  store.on('tab:switch', () => {
    editor.setRows(getInitialRows());
  });

  return editor;
}

const headersEditor = createTabKVEditor('tab-headers', 'headers');
const paramsEditor = createTabKVEditor('tab-params', 'params');
