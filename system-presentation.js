/* Retire saved Terminal choices and old links without touching business data. */
(() => {
  'use strict';
  function normalizePresentation() {
    delete document.body.dataset.systemVersion;
    delete document.body.dataset.terminalStyle;
    const url = new URL(location.href);
    if (url.searchParams.has('system_version') || url.searchParams.has('terminal_style')) {
      url.searchParams.delete('system_version');
      url.searchParams.delete('terminal_style');
      history.replaceState(history.state, '', url);
    }
  }
  try { localStorage.removeItem('fleet-system-view-v1'); } catch {}
  normalizePresentation();
  window.addEventListener('popstate', normalizePresentation);
})();
