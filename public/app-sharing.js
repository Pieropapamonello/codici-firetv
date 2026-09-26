export function downloaderCode(app) {
  for (const candidate of [app.downloaderCode, app.aftvCode, app.code]) {
    const value = String(candidate ?? '').trim();
    if (/^\d{3,10}$/.test(value)) return value;
    try {
      const url = new URL(value);
      if (['go.aftvnews.com', 'aftv.news'].includes(url.hostname) && /^\/\d{3,10}\/?$/.test(url.pathname)) {
        return url.pathname.replaceAll('/', '');
      }
    } catch { /* A plain code or a non-URL is handled above. */ }
  }
  return '';
}

export function appShareUrl(app, origin) {
  const url = new URL('/', origin);
  url.searchParams.set('app', `${app.type || 'apps'}:${app.id}`);
  return url.href;
}

export function appShareText(app, origin) {
  const code = downloaderCode(app);
  return [app.name, app.desc, code ? `Codice Downloader: ${code}` : '',
    `Scheda app: ${appShareUrl(app, origin)}`].filter(Boolean).join('\n\n');
}

// Never report success when clipboard permission is denied. On TV/older
// browsers, provide selectable text instead of losing the share payload.
export async function copyAppText(text) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const previousFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'modal active';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Copia i dettagli dell’app');
    const content = document.createElement('div');
    content.className = 'modal-content';
    const label = document.createElement('p');
    label.textContent = 'Copia automatica non disponibile. Seleziona e copia questo testo:';
    const area = document.createElement('textarea');
    area.className = 'share-copy-text';
    area.setAttribute('aria-label', 'Testo da copiare');
    area.readOnly = true;
    area.value = text;
    const close = document.createElement('button');
    close.className = 'app-action';
    close.textContent = 'Chiudi';
    const dismiss = () => { overlay.remove(); previousFocus?.focus(); };
    close.addEventListener('click', dismiss);
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.stopPropagation(); dismiss(); }
      if (event.key === 'Tab') {
        event.preventDefault();
        (document.activeElement === area ? close : area).focus();
      }
    });
    content.append(label, area, close);
    overlay.append(content);
    document.body.append(overlay);
    area.focus();
    area.select();
    return false;
  }
}

export function attachAppActions(card, app, origin) {
  const text = appShareText(app, origin);
  const status = card.querySelector('.app-action-status');
  card.querySelector('.copy-app-code')?.addEventListener('click', async () => {
    if (await copyAppText(text)) status.textContent = 'Copiati nome, descrizione, codice e link.';
  });
  card.querySelector('.share-app').addEventListener('click', async () => {
    if (await copyAppText(appShareUrl(app, origin))) status.textContent = 'Link copiato.';
  });
}
