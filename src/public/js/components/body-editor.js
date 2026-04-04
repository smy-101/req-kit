// Body editor component
(function() {
  const container = document.getElementById('tab-body');

  container.innerHTML = `
    <div class="body-actions">
      <button id="body-format-btn">Format JSON</button>
      <select id="body-type-select">
        <option value="json">JSON</option>
        <option value="text">Text</option>
        <option value="xml">XML</option>
        <option value="form">Form URL Encoded</option>
        <option value="none">None</option>
      </select>
    </div>
    <textarea id="body-textarea" placeholder="Request body..."></textarea>
  `;

  const textarea = document.getElementById('body-textarea');
  const formatBtn = document.getElementById('body-format-btn');
  const typeSelect = document.getElementById('body-type-select');

  function restoreFromTab() {
    const tab = store.getActiveTab();
    if (!tab) return;
    textarea.value = tab.body || '';
    typeSelect.value = tab.bodyType || 'json';
  }

  restoreFromTab();

  textarea.addEventListener('input', () => {
    InputDebounce.schedule('body', () => {
      store.setState({ body: textarea.value });
    });
  });

  typeSelect.addEventListener('change', () => {
    store.setState({ bodyType: typeSelect.value });
  });

  formatBtn.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(textarea.value);
      textarea.value = JSON.stringify(parsed, null, 2);
      store.setState({ body: textarea.value });
      Toast.success('JSON formatted');
    } catch (e) {
      Toast.error('Invalid JSON: ' + e.message);
    }
  });

  // Restore on tab switch
  store.on('tab:switch', restoreFromTab);
})();
