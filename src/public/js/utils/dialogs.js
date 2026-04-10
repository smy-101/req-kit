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
  var input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder || '';
  input.value = defaultValue != null ? defaultValue : '';
  input.className = 'dialog-input';

  return showDialog({
    title: title,
    bodyEl: input,
    actionText: 'OK',
    actionClass: 'modal-btn-primary',
    focusAction: false,
    enterResolves: 'input',
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
