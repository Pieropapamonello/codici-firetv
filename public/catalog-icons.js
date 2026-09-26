// Match product identity, not architecture/release labels or category.
const products = ['Nuvio', 'Stremio', 'Kodi', 'SmartTube', 'SmartTubeNext', 'TizenTube',
  'DodoStream', 'Lumera', 'Arvio', 'Debrify', 'OnStream', 'MobiFlix', 'SStream',
  'Streamflix', 'Paramount', 'BeeTV', 'FilmPlus', 'VivaTV', 'App Cloner',
  'ChillHub Launcher', 'Launcher Manager', 'LTvLauncher', 'Projectivy Launcher',
  'Wireshark', 'adblink', 'Amlogic USB Burning Tool', 'TV Bro', 'TPlayer', 'RealStream'];
export function iconFamily(name = '') {
  const normalized = String(name).trim();
  if (/^TROYPOINT.*\bKodi\b/i.test(normalized)) return 'Kodi';
  const product = products.find(p => new RegExp('^' + p + '(?=$|[^a-z])', 'i').test(normalized));
  return product === 'SmartTubeNext' ? 'SmartTube' : product || normalized;
}

const canonical = {
  Nuvio: '/assets/nuvio-official.png',
  Stremio: '/assets/stremio.png',
  Kodi: '/assets/kodi.png',
};

export function familyMonogram(name) {
  const family = iconFamily(name);
  const words = family.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(/\s+/);
  const initials = words.slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || 'APP';
  let hash = 0;
  for (const char of family) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="20" fill="hsl(${hash % 360},55%,30%)"/><text x="48" y="50" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="32" fill="white">${initials}</text></svg>`);
}

function usable(icon) {
  return typeof icon === 'string' && /^(https?:\/\/|\/?assets\/)/.test(icon)
    && !/(?:nello|downloads|android-os|tv-settings|proxy|video)\.png(?:\?.*)?$/.test(icon);
}

export function createIconRegistry(apps) {
  const selected = new Map(Object.entries(canonical));
  // Deterministic across Firebase order, filters and pagination. Every variant
  // gets the same chosen asset; bad imports cannot override canonical logos.
  for (const app of [...apps].sort((a, b) => String(a.icon || '').localeCompare(String(b.icon || '')))) {
    const family = iconFamily(app.name);
    if (!selected.has(family) && usable(app.icon)) selected.set(family, app.icon);
  }
  const failed = new Set();
  return {
    resolve(name) {
      const family = iconFamily(name);
      return !failed.has(family) && selected.get(family) || familyMonogram(family);
    },
    fail(name) { failed.add(iconFamily(name)); },
  };
}
