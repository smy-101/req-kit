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

  textarea.addEventListener('input', () => {
    store.setState({ body: textarea.value });
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

  // Listen for external state changes
  store.on('request:load', (data) => {
    textarea.value = data.body || '';
    typeSelect.value = data.body_type || 'json';
    store.setState({ body: textarea.value, bodyType: typeSelect.value });
  });
})();
