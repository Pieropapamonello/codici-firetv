import { iconFamily } from '../../public/catalog-icons.js';

export function subscriptionChoices(apps) {
    return [...new Set(Object.values(apps || {}).filter(a => a?.name).map(a => iconFamily(a.name)))].sort((a,b) => a.localeCompare(b, 'it'));
}

export function subscriptionType(name) {
    const family = iconFamily(name);
    if (family !== 'Stremio') return String(name).replace(/\b(?:v)?\d+(?:\.\d+)+(?:-rc\.\d+)?\b/gi,'').replace(/\s+/g,' ').trim();
    const mobile = /mobile|cellulare|cell\b/i.test(name);
    const tv = /\btv\b|fire\s*tv/i.test(name);
    const device = mobile ? 'Mobile' : tv ? 'TV' : '';
    const channel = /\bmod\b/i.test(name) ? 'Mod' : /\bprem\b/i.test(name) ? 'Prem (build alternativa)' : /beta|\brc\b/i.test(name) ? 'Beta' : 'Ufficiale';
    // The Mod updater omits ARM32 from its original TV/Mobile names.
    const bits = /64\s*bit|arm64|64BIT/i.test(name) ? '64 bit' : /32\s*bit|\barm\b|32BIT/i.test(name) || channel === 'Mod' ? '32 bit' : '';
    return ['Stremio',device,channel,bits].filter(Boolean).join(' ');
}

export function subscriptionTypes(apps, family) {
    return [...new Set(Object.values(apps || {}).filter(a=>a?.name && iconFamily(a.name)===family).map(a=>subscriptionType(a.name)))].sort((a,b)=>a.localeCompare(b,'it'));
}

export function normalizeAppKey(name = '') {
    return String(name)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\b(?:v(?:ersione)?\s*)?\d+(?:[._-]\d+)*(?:[-._]?(?:rc|beta|alpha)\d*)?\b/gi, ' ')
        .replace(/\b(?:latest|new|nuova|stable|release|aggiornata)\b/gi, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 50);
}

export function isAppEnabled(user, appName) {
    if (!user?.apps) return false;

    const key = normalizeAppKey(appName);
    const muted = new Set((user.mutedApps || []).map(normalizeAppKey));
    if (muted.has(key)) return false;

    return user.apps.includes('all') || user.apps.some(name => name.startsWith('type:')
        ? normalizeAppKey(name.slice(5)) === normalizeAppKey(subscriptionType(appName))
        : normalizeAppKey(name) === key || normalizeAppKey(name) === normalizeAppKey(iconFamily(appName)));
}
