import { store } from '../store.js';
import { InputDebounce } from '../utils/template.js';

export function init() {
  const container = document.getElementById('tab-tests');
  container.innerHTML = `
    <div class="script-desc">
      Post-response script runs after the response is received. Available: <code>response</code> (status/headers/body/json()/time/size), <code>tests</code>, <code>variables</code>, <code>environment</code>
    </div>
    <textarea id="post-script-textarea" placeholder="// Example:&#10;// tests[\"Status is 200\"] = response.status === 200&#10;// tests[\"Has body\"] = response.body.length > 0&#10;// variables.set(\"token\", response.json().access_token)"></textarea>
  `;
  const textarea = document.getElementById('post-script-textarea');

  function restoreFromTab() {
    const tab = store.getActiveTab();
    if (!tab) return;
    textarea.value = tab.postResponseScript || '';
  }

  restoreFromTab();
  textarea.addEventListener('input', () => { InputDebounce.schedule('post-script', () => store.setState({ postResponseScript: textarea.value })); });
  store.on('tab:switch', restoreFromTab);
}
