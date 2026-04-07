import { store } from '../store.js';
import { InputDebounce } from '../utils/template.js';

// Script editor component
const container = document.getElementById('tab-script');

container.innerHTML = `
  <div class="script-desc">
    Pre-request script runs before the request is sent. Available: <code>environment</code>, <code>request.setHeader()</code>, <code>request.setBody()</code>, <code>request.setParam()</code>
  </div>
  <textarea id="script-textarea" placeholder="// Example:&#10;// request.setHeader('X-Timestamp', Date.now().toString())&#10;// request.setHeader('Authorization', 'Bearer ' + environment.token)"></textarea>
`;

const textarea = document.getElementById('script-textarea');

function restoreFromTab() {
  const tab = store.getActiveTab();
  if (!tab) return;
  textarea.value = tab.preRequestScript || '';
}

restoreFromTab();

textarea.addEventListener('input', () => {
  InputDebounce.schedule('script', () => {
    store.setState({ preRequestScript: textarea.value });
  });
});

// Restore on tab switch
store.on('tab:switch', restoreFromTab);
