// Custom dialog system — replaces native prompt/confirm/alert
// Uses the existing #modal-overlay / #modal infrastructure

const overlay = document.getElementById('modal-overlay');
const modal = document.getElementById('modal');

// Currently active keyboard listener (only one dialog at a time)
let activeKeyHandler = null;

// ── Helpers ──────────────────────────────────

function show() {
  overlay.classList.remove('hidden');
}

let hide = function () {
  overlay.classList.add('hidden');
  modal.innerHTML = '';
  if (activeKeyHandler) {
    document.removeEventListener('keydown', activeKeyHandler);
    activeKeyHandler = null;
  }
};

// Build a confirm-dialog shell and render it inside #modal
function buildDialog() {
  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';

  // Prevent overlay click handler in app.js from closing the dialog
  // when the user clicks inside the dialog content itself
  dialog.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  modal.innerHTML = '';
  modal.appendChild(dialog);
  return dialog;
}

// ── Public API ───────────────────────────────

export const Dialogs = {};

/**
 * prompt(title, placeholder, defaultValue)
 * Returns a Promise that resolves to the entered string or null if cancelled.
 */
Dialogs.prompt = function (title, placeholder, defaultValue) {
  return new Promise(function (resolve) {
    var dialog = buildDialog();

    // Title
    var titleEl = document.createElement('div');
    titleEl.className = 'confirm-dialog-title';
    titleEl.textContent = title;
    dialog.appendChild(titleEl);

    // Input
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder || '';
    input.value = defaultValue != null ? defaultValue : '';
    input.className = 'dialog-input';
    dialog.appendChild(input);

    // Actions
    var actions = document.createElement('div');
    actions.className = 'confirm-dialog-actions dialog-actions-gap';

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn modal-btn-secondary';
    cancelBtn.textContent = 'Cancel';

    var okBtn = document.createElement('button');
    okBtn.className = 'modal-btn modal-btn-primary';
    okBtn.textContent = 'OK';

    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    dialog.appendChild(actions);

    function submit() {
      var val = input.value;
      hide();
      resolve(val);
    }

    function cancel() {
      hide();
      resolve(null);
    }

    cancelBtn.addEventListener('click', cancel);
    okBtn.addEventListener('click', submit);

    // Keyboard: Enter to submit, Escape to cancel
    activeKeyHandler = function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    };
    document.addEventListener('keydown', activeKeyHandler);

    // Override the overlay click to cancel instead of just hiding
    var overlayClickCatcher = function (e) {
      if (e.target === overlay) {
        e.stopImmediatePropagation();
        cancel();
      }
    };
    overlay.addEventListener('click', overlayClickCatcher, true);
    // Clean up the catcher when dialog closes
    var origHide = hide;
    hide = function () {
      overlay.removeEventListener('click', overlayClickCatcher, true);
      origHide();
      hide = origHide;
    };

    show();

    // Auto-focus the input after the modal is visible
    setTimeout(function () {
      input.focus();
      input.select();
    }, 50);
  });
};

/**
 * confirm(title, message)
 * Returns a Promise that resolves to true (confirmed) or false (cancelled).
 */
Dialogs.confirm = function (title, message) {
  return new Promise(function (resolve) {
    var dialog = buildDialog();

    var titleEl = document.createElement('div');
    titleEl.className = 'confirm-dialog-title';
    titleEl.textContent = title;
    dialog.appendChild(titleEl);

    var msgEl = document.createElement('div');
    msgEl.className = 'confirm-dialog-message';
    msgEl.textContent = message;
    dialog.appendChild(msgEl);

    var actions = document.createElement('div');
    actions.className = 'confirm-dialog-actions';

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn modal-btn-secondary';
    cancelBtn.textContent = 'Cancel';

    var confirmBtn = document.createElement('button');
    confirmBtn.className = 'modal-btn modal-btn-primary';
    confirmBtn.textContent = 'Confirm';

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    dialog.appendChild(actions);

    function confirmAction() {
      hide();
      resolve(true);
    }

    function cancelAction() {
      hide();
      resolve(false);
    }

    cancelBtn.addEventListener('click', cancelAction);
    confirmBtn.addEventListener('click', confirmAction);

    activeKeyHandler = function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelAction();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        confirmAction();
      }
    };
    document.addEventListener('keydown', activeKeyHandler);

    // Override overlay click to cancel
    var overlayClickCatcher = function (e) {
      if (e.target === overlay) {
        e.stopImmediatePropagation();
        cancelAction();
      }
    };
    overlay.addEventListener('click', overlayClickCatcher, true);
    var origHide = hide;
    hide = function () {
      overlay.removeEventListener('click', overlayClickCatcher, true);
      origHide();
      hide = origHide;
    };

    show();
    setTimeout(function () {
      confirmBtn.focus();
    }, 50);
  });
};

/**
 * confirmDanger(title, message)
 * Same as confirm but with a red/danger styled button for destructive actions.
 */
Dialogs.confirmDanger = function (title, message) {
  return new Promise(function (resolve) {
    var dialog = buildDialog();

    var titleEl = document.createElement('div');
    titleEl.className = 'confirm-dialog-title';
    titleEl.textContent = title;
    dialog.appendChild(titleEl);

    var msgEl = document.createElement('div');
    msgEl.className = 'confirm-dialog-message';
    msgEl.textContent = message;
    dialog.appendChild(msgEl);

    var actions = document.createElement('div');
    actions.className = 'confirm-dialog-actions';

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn modal-btn-secondary';
    cancelBtn.textContent = 'Cancel';

    var dangerBtn = document.createElement('button');
    dangerBtn.className = 'modal-btn modal-btn-danger';
    dangerBtn.textContent = 'Delete';

    actions.appendChild(cancelBtn);
    actions.appendChild(dangerBtn);
    dialog.appendChild(actions);

    function confirmAction() {
      hide();
      resolve(true);
    }

    function cancelAction() {
      hide();
      resolve(false);
    }

    cancelBtn.addEventListener('click', cancelAction);
    dangerBtn.addEventListener('click', confirmAction);

    activeKeyHandler = function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelAction();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        confirmAction();
      }
    };
    document.addEventListener('keydown', activeKeyHandler);

    // Override overlay click to cancel
    var overlayClickCatcher = function (e) {
      if (e.target === overlay) {
        e.stopImmediatePropagation();
        cancelAction();
      }
    };
    overlay.addEventListener('click', overlayClickCatcher, true);
    var origHide = hide;
    hide = function () {
      overlay.removeEventListener('click', overlayClickCatcher, true);
      origHide();
      hide = origHide;
    };

    show();
    setTimeout(function () {
      cancelBtn.focus();
    }, 50);
  });
};
