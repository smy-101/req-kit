import { store } from '../store.js';

// Request options component — collapsible panel for timeout and redirect settings
const optionsBtn = document.getElementById('request-options-btn');
const optionsPanel = document.getElementById('request-options-panel');
const timeoutInput = document.getElementById('request-timeout-input');
const redirectToggle = document.getElementById('request-redirect-toggle');

// Toggle panel
optionsBtn.addEventListener('click', () => {
  const isHidden = optionsPanel.classList.contains('hidden');
  optionsPanel.classList.toggle('hidden', !isHidden);
  optionsBtn.classList.toggle('active', isHidden);
});

// Timeout input
timeoutInput.addEventListener('input', () => {
  let val = parseInt(timeoutInput.value);
  if (isNaN(val)) return;
  val = Math.max(1000, Math.min(300000, val));
  const tab = store.getActiveTab();
  if (tab) {
    store.setState({ options: { ...tab.options, timeout: val } });
  }
});

// Redirect toggle
redirectToggle.addEventListener('change', () => {
  const tab = store.getActiveTab();
  if (tab) {
    store.setState({ options: { ...tab.options, followRedirects: redirectToggle.checked } });
  }
});

// Restore from tab
function restoreFromTab() {
  const tab = store.getActiveTab();
  if (!tab) return;
  const opts = tab.options || { timeout: 30000, followRedirects: true };
  timeoutInput.value = opts.timeout ?? 30000;
  redirectToggle.checked = opts.followRedirects !== false;
}

store.on('tab:switch', restoreFromTab);
restoreFromTab();
