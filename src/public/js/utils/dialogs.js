// Custom dialog system — replaces native prompt/confirm/alert
// Uses the existing #modal-overlay / #modal infrastructure

const overlay = document.getElementById('modal-overlay');
const modal = document.getElementById('modal');

let activeKeyHandler = null;
let _cleanupFns = [];

// ── Internal helpers ──────────────────────────

function _hide() {
  overlay.classList.add('hidden');
  modal.innerHTML = '';
  if (activeKeyHandler) {
    document.removeEventListener('keydown', activeKeyHandler);
    activeKeyHandler = null;
  }
  while (_cleanupFns.length) _cleanupFns.pop()();
}

function _show() {
  overlay.classList.remove('hidden');
}

function buildDialog() {
  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';
  dialog.addEventListener('click', function (e) { e.stopPropagation(); });
  modal.innerHTML = '';
  modal.appendChild(dialog);
  return dialog;
}

/**
 * Core dialog renderer — shared by prompt, confirm, confirmDanger.
 * @param {Object} opts
 * @param {string} opts.title
 * @param {HTMLElement} opts.bodyEl - pre-built DOM element
 * @param {string} opts.actionText - action button label ("OK", "Confirm", "Delete")
 * @param {string} opts.actionClass - action button CSS class
 * @param {boolean} opts.focusAction - true = focus action button; false = focus cancel (or input if present)
 * @param {'input'|boolean} opts.enterResolves - 'input' = resolve to input value; true/false = resolve with that value
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
      var result = enterResolves;
      if (enterResolves === 'input') {
        result = bodyEl.querySelector('.dialog-input').value;
      }
      _hide();
      resolve(result);
    }

    function doCancel() {
      _hide();
      resolve(enterResolves === 'input' ? null : false);
    }

    cancelBtn.addEventListener('click', doCancel);
    actionBtn.addEventListener('click', doAction);

    activeKeyHandler = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); doCancel(); }
      else if (e.key === 'Enter') { e.preventDefault(); doAction(); }
    };
    document.addEventListener('keydown', activeKeyHandler);

    // Overlay click-to-cancel (capture phase to beat app.js handler)
    var overlayClickCatcher = function (e) {
      if (e.target === overlay) {
        e.stopImmediatePropagation();
        doCancel();
      }
    };
    overlay.addEventListener('click', overlayClickCatcher, true);
    _cleanupFns.push(function () {
      overlay.removeEventListener('click', overlayClickCatcher, true);
    });

    _show();

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

/**
 * prompt(title, placeholder, defaultValue)
 * Returns a Promise that resolves to the entered string or null if cancelled.
 */
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

/**
 * confirm(title, message)
 * Returns a Promise that resolves to true (confirmed) or false (cancelled).
 */
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

/**
 * confirmDanger(title, message)
 * Same as confirm but with a red/danger styled button for destructive actions.
 */
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
