// App entry point - initialize store, register components, bind events
(function() {
  'use strict';

  // Polyfill hidden class toggling
  document.querySelectorAll('.hidden').forEach(el => el.style.display = 'none');

  // Toggle hidden utility
  function toggleHidden(el, force) {
    if (!el) return;
    const isHidden = typeof force === 'boolean' ? !force : el.classList.contains('hidden');
    if (isHidden) {
      el.classList.remove('hidden');
      el.style.display = '';
    } else {
      el.classList.add('hidden');
      el.style.display = 'none';
    }
  }

  // Close modal on overlay click
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') {
      e.target.classList.add('hidden');
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+Enter to send
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      document.getElementById('send-btn').click();
    }
    // Escape to close modals
    if (e.key === 'Escape') {
      document.getElementById('modal-overlay').classList.add('hidden');
    }
  });

  // Log state changes in development
  store.on('change', (state) => {
    // Uncomment for debugging:
    // console.log('State:', state);
  });

  console.log('req-kit initialized');
})();
