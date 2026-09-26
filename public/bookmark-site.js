const bookmarkButton = document.getElementById('bookmark-site');
const bookmarkHelp = document.getElementById('bookmark-site-help');
bookmarkButton.addEventListener('click', () => {
  const open = bookmarkHelp.hidden;
  bookmarkHelp.hidden = !open;
  bookmarkButton.setAttribute('aria-expanded', String(open));
});
bookmarkHelp.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    bookmarkHelp.hidden = true;
    bookmarkButton.setAttribute('aria-expanded', 'false');
    bookmarkButton.focus();
  }
});
