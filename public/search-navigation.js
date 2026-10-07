export function showSearchResult(doc = document, win = window) {
  const input = doc.getElementById('searchInput');
  if (!input.value.trim()) return;
  win.filterApps();
  input.blur();
  win.requestAnimationFrame(() => {
    const target = doc.querySelector('#main-content .app-variants > summary, #main-content .card')
      || doc.getElementById('main-content');
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start', behavior: win.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
}

export function bindSearchNavigation(doc = document, win = window) {
  doc.getElementById('searchInput').addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    showSearchResult(doc, win);
  });
}
