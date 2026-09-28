import { sourceIcons } from './source-icons.js';
import { expandedProduct } from './expanded-products.js';
import { expandedIcons } from './expanded-icons.js';
import { fullCatalogIcons } from './full-catalog-icons.js';
// Match product identity, not architecture/release labels or category.
const products = ['Nuvio', 'Stremio', 'Kodi', 'SmartTube', 'SmartTubeNext', 'TizenTube',
  'DodoStream', 'Lumera', 'Arvio', 'Debrify', 'OnStream', 'MobiFlix', 'SStream',
  'Streamflix', 'Paramount', 'BeeTV', 'FilmPlus', 'VivaTV', 'App Cloner',
  'ChillHub Launcher', 'Launcher Manager', 'LTvLauncher', 'Projectivy Launcher',
  'Wireshark', 'adblink', 'Amlogic USB Burning Tool', 'TV Bro', 'TPlayer', 'RealStream',
  'VLC', 'AIDA64', 'AdGuard', 'Blokada', 'Downloader', 'Orion Store', 'Aurora Store',
  'APKTime', 'APKPure', 'AppLinked', 'Aptoide', 'Unlinked', 'FileSynced',
  'YTV Player Pro', 'Bear Player', 'Drama Player', 'Fluid Video Player', 'Wuffy', 'Ludio',
  'MX Player', 'BPlayer', 'AMPlayer', 'Vimu', 'Veezie', 'Wiseplay',
  'IPTV Smarters', 'IPTV Pro', 'Smart IPTV', 'Perfect Player', 'IBO Player',
  'TiviMate', 'iMPlayer', 'Sparkle', 'XCIPTV', 'Ott Navigator', 'M3U IPTV', 'STB Emu', 'XTREAM IPTV',
  'CloudStream', 'Syncler', 'Weyd', 'Plex', 'Jellyfin', 'Emby', 'Wuplay', 'STRMR',
  'NordVPN', 'Proton VPN', 'ExpressVPN', 'Surfshark', 'IPVanish', 'CyberGhost',
  'Background Apps & Process List', 'Send files to TV', 'Mouse Toggle', 'ES File Explorer',
  'SD Maid SE', 'SD Maid', 'SpeedTest', 'AZ Screen Recorder', 'Fast Task Killer',
  'Puffin', 'Spotify', 'TuneIn', 'TikTok', 'Analiti', 'VirusTotal',
  'Cinema HD', 'Flix Vision', 'Flixoid', 'Tea TV', 'CyberFlix TV', 'NovaTV', 'Picasso',
  'MediaBox', 'Cuco TV', 'Cartoon HD', 'AppFlix', 'MorpheusTV', 'OneBoxHD', 'Strix', 'CatMouse',
  'HDO', 'MediaLounge', 'OceanStreamz', 'UKTurks', 'DofuStream', 'SportsFire', 'SportzX',
  'SportsZone', 'StreamFire', 'Blink Streamz', 'HD Streamz', 'Live Net TV', 'Redbox TV',
  'HDTV Ultimate', 'Ola TV', 'USTVGO', 'Swift Streamz', 'Kraken TV', 'TVTap Pro', 'AOS TV',
  'Oreo TV', 'Rapid Streamz', '1 Pix Media', 'Crackle', 'Tubi TV', 'BBC iPlayer', 'STIRR',
  'MagellanTV', 'Vavoo', 'Rokkr', 'DNS Changer', 'ADM', 'Wolf Launcher'];
export function iconFamily(name = '') {
  const normalized = String(name).trim()
    .replace(/^NuvioTV\b/i, 'Nuvio TV').replace(/^Bee TV\b/i, 'BeeTV')
    .replace(/^Viva TV\b/i, 'VivaTV').replace(/^B Player\b/i, 'BPlayer')
    .replace(/^XCIP TV\b/i, 'XCIPTV').replace(/^Aida 64\b/i, 'AIDA64')
    .replace(/^Smartube\b/i, 'SmartTube').replace(/^MX-Player-Pro/i, 'MX Player Pro')
    .replace(/^Magellan TV\b/i, 'MagellanTV').replace(/^Sports? Fire\b/i, 'SportsFire')
    .replace(/^WolfLauncher\b/i, 'Wolf Launcher').replace(/^UK Turks\b/i,'UKTurks')
    .replace(/^Ocean Streamz\b/i,'OceanStreamz').replace(/^LiveNet TV\b/i,'Live Net TV');
  const expanded = expandedProduct(normalized);
  if (expanded) return expanded.name === 'Movie Box' ? 'MovieBox' : expanded.name;
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
  const selected = new Map(Object.entries({ ...sourceIcons, ...expandedIcons, ...fullCatalogIcons, ...canonical }));
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
