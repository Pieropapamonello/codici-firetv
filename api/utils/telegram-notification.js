import { catalogMetadata } from '../../public/catalog-metadata.js';
import { downloaderCode, appShareUrl } from '../../public/app-sharing.js';
import { normalizeAppKey } from './notification-prefs.js';

const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export function buildTelegramNotification(appName, version, downloadUrl, entry, origin) {
    const url = new URL(downloadUrl);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid download URL');
    const metadata = catalogMetadata(appName);
    const description = metadata.metadataVerified ? metadata.desc : entry?.desc;
    const isNew = /^nuova app$/i.test(String(version).trim());
    const concreteVersion = version && !/^(?:aggiornata|nuova app|latest|unknown)$/i.test(String(version).trim());
    const text = [
        isNew ? '🐾 <b>Nuova app nel Covo di Nello</b>' : '🐾 <b>Aggiornamento nel Covo di Nello</b>',
        `<b>${escapeHtml(String(appName).slice(0, 200))}</b>${concreteVersion ? '\nVersione: <b>' + escapeHtml(String(version).slice(0, 80)) + '</b>' : ''}`,
        description ? escapeHtml(String(description).slice(0, 600)) : '',
    ].filter(Boolean).join('\n\n');
    const rows = [[{ text: entry?.downloadKind === 'page' ? '🌐 Apri pagina download' : '⬇️ Scarica', url: url.href }]];
    if (entry?.id) rows[0].push({ text: '📋 Scheda app', url: appShareUrl(entry, origin) });
    else rows[0].push({ text: '📋 Catalogo app', url: new URL('/', origin).href });
    const code = entry && downloaderCode(entry);
    if (code) rows.push([{ text: `Copia codice Downloader · ${code}`, copy_text: { text: code } }]);
    rows.push([{ text: '🔕 Silenzia app', callback_data: `mute:${normalizeAppKey(appName)}` }, { text: '⚙️ Notifiche', callback_data: 'sub:status' }]);
    return { text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: rows } };
}
