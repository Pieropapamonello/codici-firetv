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

    return user.apps.includes('all') || user.apps.some(name => normalizeAppKey(name) === key);
}
