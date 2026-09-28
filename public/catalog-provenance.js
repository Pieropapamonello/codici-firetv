const sources = new Map([
  ['downloadercodes.com', 'DownloaderCodes'],
  ['www.webassistanceita.com', 'WebAssistanceITA'],
  ['linktr.ee', 'KPFire'],
]);
export function sourceInfo(app) {
  if (!app.importSource && app.codeBoundUrl && app.codeBoundUrl !== (app.directUrl || app.code)) return null;
  try {
    const url = new URL(app.importSource || app.codeSource);
    if (url.protocol !== 'https:' || !sources.has(url.hostname)) return null;
    if (url.hostname === 'linktr.ee' && url.pathname !== '/kpfire') return null;
    return { url:url.href, label:sources.get(url.hostname), note:app.variantNote || 'Codice segnalato dalla fonte. Verifica il file prima di installarlo.' };
  } catch { return null; }
}
export function appendProvenance(card, app) {
  const info = sourceInfo(app);
  if (!info) return;
  const details = document.createElement('details');
  details.className = 'app-provenance';
  const summary = document.createElement('summary');
  summary.textContent = 'Fonte e compatibilità';
  const p = document.createElement('p');
  p.textContent = info.note + ' ';
  const link = document.createElement('a');
  link.href = info.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
  link.textContent = info.label;
  p.append(link); details.append(summary, p); card.append(details);
}
