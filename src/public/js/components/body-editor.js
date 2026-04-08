import { store } from '../store.js';
import { InputDebounce } from '../utils/template.js';
import { Toast } from '../utils/toast.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Body editor component
const container = document.getElementById('tab-body');

container.innerHTML = `
  <div class="body-actions">
    <button id="body-format-btn">Format JSON</button>
    <select id="body-type-select">
      <option value="json">JSON</option>
      <option value="text">Text</option>
      <option value="xml">XML</option>
      <option value="form">Form URL Encoded</option>
      <option value="multipart">Multipart Form Data</option>
      <option value="binary">Binary</option>
      <option value="none">None</option>
    </select>
  </div>
  <textarea id="body-textarea" placeholder="Request body..."></textarea>
  <div id="multipart-editor" class="multipart-editor hidden"></div>
  <div id="binary-editor" class="binary-editor hidden"></div>
`;

const textarea = document.getElementById('body-textarea');
const formatBtn = document.getElementById('body-format-btn');
const typeSelect = document.getElementById('body-type-select');
const multipartEditor = document.getElementById('multipart-editor');
const binaryEditor = document.getElementById('binary-editor');

function renderBodyEditor(type) {
  textarea.classList.toggle('hidden', type === 'multipart' || type === 'binary' || type === 'none');
  multipartEditor.classList.toggle('hidden', type !== 'multipart');
  binaryEditor.classList.toggle('hidden', type !== 'binary');
  formatBtn.classList.toggle('hidden', type !== 'json');

  if (type === 'multipart') {
    renderMultipartEditor();
  } else if (type === 'binary') {
    renderBinaryEditor();
  }
}

// --- Multipart Editor ---

function renderMultipartEditor() {
  const tab = store.getActiveTab();
  if (!tab) return;
  const parts = tab.multipartParts || [{ key: '', type: 'text', value: '' }];

  multipartEditor.innerHTML = '';

  const table = document.createElement('div');
  table.className = 'multipart-table';

  for (let i = 0; i < parts.length; i++) {
    table.appendChild(createMultipartRow(parts[i], i));
  }

  multipartEditor.appendChild(table);

  const addBtn = document.createElement('button');
  addBtn.className = 'multipart-add-btn';
  addBtn.textContent = '+ 添加字段';
  addBtn.addEventListener('click', () => {
    const tab = store.getActiveTab();
    if (!tab) return;
    const parts = [...(tab.multipartParts || [])];
    parts.push({ key: '', type: 'text', value: '' });
    store.setState({ multipartParts: parts });
    renderMultipartEditor();
  });
  multipartEditor.appendChild(addBtn);
}

function createMultipartRow(part, index) {
  const row = document.createElement('div');
  row.className = 'multipart-row';

  // Key input
  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.className = 'multipart-key';
  keyInput.placeholder = 'Key';
  keyInput.value = part.key || '';
  keyInput.addEventListener('input', () => {
    updatePart(index, 'key', keyInput.value);
  });

  // Type select
  const typeSelect = document.createElement('select');
  typeSelect.className = 'multipart-type';
  const textOpt = document.createElement('option');
  textOpt.value = 'text';
  textOpt.textContent = 'Text';
  const fileOpt = document.createElement('option');
  fileOpt.value = 'file';
  fileOpt.textContent = 'File';
  typeSelect.appendChild(textOpt);
  typeSelect.appendChild(fileOpt);
  typeSelect.value = part.type || 'text';

  typeSelect.addEventListener('change', () => {
    const tab = store.getActiveTab();
    if (!tab) return;
    const parts = [...tab.multipartParts];
    parts[index] = { ...parts[index], type: typeSelect.value, value: '', filename: undefined, contentType: undefined };
    store.setState({ multipartParts: parts });
    renderMultipartEditor();
  });

  // Value area
  const valueWrap = document.createElement('div');
  valueWrap.className = 'multipart-value';

  if (part.type === 'file') {
    const fileBtn = document.createElement('button');
    fileBtn.className = 'multipart-file-btn';
    fileBtn.textContent = part.filename ? `${part.filename}` : '选择文件';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.className = 'hidden';
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      if (file.size > MAX_FILE_SIZE) {
        Toast.error('文件大小超过 10MB 限制');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        const tab = store.getActiveTab();
        if (!tab) return;
        const parts = [...tab.multipartParts];
        parts[index] = {
          ...parts[index],
          value: base64,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
        };
        store.setState({ multipartParts: parts });
        renderMultipartEditor();
      };
      reader.readAsDataURL(file);
    });

    fileBtn.addEventListener('click', () => fileInput.click());
    valueWrap.appendChild(fileBtn);
    valueWrap.appendChild(fileInput);
  } else {
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'multipart-text-value';
    valueInput.placeholder = 'Value';
    valueInput.value = part.value || '';
    valueInput.addEventListener('input', () => {
      updatePart(index, 'value', valueInput.value);
    });
    valueWrap.appendChild(valueInput);
  }

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'multipart-delete-btn';
  deleteBtn.innerHTML = '&times;';
  deleteBtn.title = '删除';
  deleteBtn.addEventListener('click', () => {
    const tab = store.getActiveTab();
    if (!tab) return;
    const parts = [...tab.multipartParts];
    parts.splice(index, 1);
    if (parts.length === 0) parts.push({ key: '', type: 'text', value: '' });
    store.setState({ multipartParts: parts });
    renderMultipartEditor();
  });

  row.appendChild(keyInput);
  row.appendChild(typeSelect);
  row.appendChild(valueWrap);
  row.appendChild(deleteBtn);
  return row;
}

function updatePart(index, field, value) {
  const tab = store.getActiveTab();
  if (!tab) return;
  const parts = [...tab.multipartParts];
  parts[index] = { ...parts[index], [field]: value };
  store.setState({ multipartParts: parts });
}

// --- Binary Editor ---

function renderBinaryEditor() {
  const tab = store.getActiveTab();
  if (!tab) return;

  binaryEditor.innerHTML = '';

  const file = tab.binaryFile;

  const dropArea = document.createElement('div');
  dropArea.className = 'binary-drop-area';

  if (file) {
    const info = document.createElement('div');
    info.className = 'binary-file-info';
    info.innerHTML = `
      <span class="binary-filename">${escapeHtml(file.filename)}</span>
      <span class="binary-size">(${formatSize(typeof file.data === 'string' ? Math.ceil(file.data.length * 3 / 4) : 0)})</span>
      <span class="binary-content-type">${escapeHtml(file.contentType)}</span>
    `;
    dropArea.appendChild(info);
  }

  const fileBtn = document.createElement('button');
  fileBtn.className = 'binary-file-btn';
  fileBtn.textContent = file ? '更换文件' : '选择文件';
  dropArea.appendChild(fileBtn);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.className = 'hidden';
  fileInput.addEventListener('change', () => {
    const selectedFile = fileInput.files?.[0];
    if (!selectedFile) return;
    if (selectedFile.size > MAX_FILE_SIZE) {
      Toast.error('文件大小超过 10MB 限制');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      store.setState({
        binaryFile: {
          data: base64,
          filename: selectedFile.name,
          contentType: selectedFile.type || 'application/octet-stream',
        },
      });
      renderBinaryEditor();
    };
    reader.readAsDataURL(selectedFile);
  });

  fileBtn.addEventListener('click', () => fileInput.click());
  dropArea.appendChild(fileInput);
  binaryEditor.appendChild(dropArea);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Restore ---

function restoreFromTab() {
  const tab = store.getActiveTab();
  if (!tab) return;
  textarea.value = tab.body || '';
  typeSelect.value = tab.bodyType || 'json';
  renderBodyEditor(tab.bodyType || 'json');
}

restoreFromTab();

textarea.addEventListener('input', () => {
  InputDebounce.schedule('body', () => {
    store.setState({ body: textarea.value });
  });
});

typeSelect.addEventListener('change', () => {
  const newType = typeSelect.value;
  store.setState({ bodyType: newType });
  if (newType === 'multipart') {
    const tab = store.getActiveTab();
    if (tab && (!tab.multipartParts || tab.multipartParts.length === 0)) {
      store.setState({ multipartParts: [{ key: '', type: 'text', value: '' }] });
    }
  }
  renderBodyEditor(newType);
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
