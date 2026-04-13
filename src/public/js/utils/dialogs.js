// Custom dialog system — replaces native prompt/confirm/alert
// Built on Modal stack, supports nesting

import { Modal } from './modal.js';

let activeKeyHandler = null;

// ── Internal helpers ──────────────────────────

function buildDialog() {
  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';
  dialog.addEventListener('click', function (e) { e.stopPropagation(); });
  return dialog;
}

/**
 * Core dialog renderer — shared by prompt, confirm, confirmDanger.
 */
function showDialog({ title, bodyEl, actionText, actionClass, focusAction, enterResolves }) {
  return new Promise(function (resolve) {
    var dialog = buildDialog();

    var titleEl = document.createElement('div');
    titleEl.className = 'confirm-dialog-title';
    titleEl.textContent = title;
    dialog.appendChild(titleEl);

    dialog.appendChild(bodyEl);

    var actions = document.createElement('div');
    actions.className = 'confirm-dialog-actions' + (bodyEl.querySelector('.dialog-input') ? ' dialog-actions-gap' : '');

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn modal-btn-secondary';
    cancelBtn.textContent = 'Cancel';

    var actionBtn = document.createElement('button');
    actionBtn.className = 'modal-btn ' + actionClass;
    actionBtn.textContent = actionText;

    actions.appendChild(cancelBtn);
    actions.appendChild(actionBtn);
    dialog.appendChild(actions);

    function doAction() {
      cleanup();
      var result = enterResolves;
      if (enterResolves === 'input') {
        result = bodyEl.querySelector('.dialog-input').value;
      }
      Modal.close();
      resolve(result);
    }

    function doCancel() {
      cleanup();
      Modal.close();
      resolve(enterResolves === 'input' ? null : false);
    }

    function cleanup() {
      if (activeKeyHandler) {
        document.removeEventListener('keydown', activeKeyHandler);
        activeKeyHandler = null;
      }
    }

    cancelBtn.addEventListener('click', doCancel);
    actionBtn.addEventListener('click', doAction);

    activeKeyHandler = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); doCancel(); }
      else if (e.key === 'Enter') { e.preventDefault(); doAction(); }
    };
    document.addEventListener('keydown', activeKeyHandler);

    Modal.open(dialog);

    setTimeout(function () {
      if (focusAction) {
        actionBtn.focus();
      } else {
        var input = bodyEl.querySelector('.dialog-input');
        if (input) { input.focus(); input.select(); }
        else { cancelBtn.focus(); }
      }
    }, 50);
  });
}

// ── Public API ───────────────────────────────

export const Dialogs = {};

Dialogs.prompt = function (title, placeholder, defaultValue) {
  var wrapper = document.createElement('div');
  var input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder || '';
  input.value = defaultValue != null ? defaultValue : '';
  input.className = 'dialog-input';
  wrapper.appendChild(input);

  return showDialog({
    title: title,
    bodyEl: wrapper,
    actionText: 'OK',
    actionClass: 'modal-btn-primary',
    focusAction: false,
    enterResolves: 'input',
  });
};

Dialogs.promptWithParent = function (title, collections) {
  var wrapper = document.createElement('div');

  var input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Collection name';
  input.className = 'dialog-input';
  wrapper.appendChild(input);

  if (collections && collections.length > 0) {
    var select = document.createElement('select');
    select.className = 'dialog-input';
    var defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '— No parent (top level) —';
    select.appendChild(defaultOpt);
    function addOptions(list, depth) {
      for (var i = 0; i < list.length; i++) {
        var opt = document.createElement('option');
        opt.value = String(list[i].id);
        opt.textContent = '\u00A0\u00A0'.repeat(depth) + list[i].name;
        select.appendChild(opt);
        if (list[i].children) addOptions(list[i].children, depth + 1);
      }
    }
    addOptions(collections, 0);
    wrapper.appendChild(select);
  }

  return showDialog({
    title: title,
    bodyEl: wrapper,
    actionText: 'OK',
    actionClass: 'modal-btn-primary',
    focusAction: false,
    enterResolves: 'input',
  }).then(function (name) {
    if (!name) return null;
    var selectEl = wrapper.querySelector('select');
    var parentId = selectEl && selectEl.value ? parseInt(selectEl.value, 10) : null;
    return { name: name, parentId: parentId };
  });
};

Dialogs.confirm = function (title, message) {
  var msgEl = document.createElement('div');
  msgEl.className = 'confirm-dialog-message';
  msgEl.textContent = message;

  return showDialog({
    title: title,
    bodyEl: msgEl,
    actionText: 'Confirm',
    actionClass: 'modal-btn-primary',
    focusAction: true,
    enterResolves: true,
  });
};

Dialogs.confirmDanger = function (title, message) {
  var msgEl = document.createElement('div');
  msgEl.className = 'confirm-dialog-message';
  msgEl.textContent = message;

  return showDialog({
    title: title,
    bodyEl: msgEl,
    actionText: 'Delete',
    actionClass: 'modal-btn-danger',
    focusAction: false,
    enterResolves: true,
  });
};
