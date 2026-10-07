import { iconFamily } from './catalog-icons.js';
import { downloaderCode } from './app-sharing.js';

export function appGroupKey(app) {
  // Categories stay separate: never merge a companion tool with its player.
  return `${app.category || ''}:${iconFamily(app.name)}`;
}

export function groupCatalog(apps) {
  const groups = new Map();
  for (const app of apps) {
    const key = appGroupKey(app);
    if (!groups.has(key)) groups.set(key, { key, name: iconFamily(app.name), variants: [] });
    const variants = groups.get(key).variants;
    const code = downloaderCode(app);
    const url = String(app.directUrl || app.code || '').trim();
    const duplicate = variants.findIndex(other =>
      (code && downloaderCode(other) === code) ||
      (url && String(other.directUrl || other.code || '').trim() === url));
    if (duplicate < 0) variants.push(app);
    else {
      const existing = variants[duplicate];
      variants[duplicate] = { ...app, ...existing,
        downloaderCode: downloaderCode(existing) || code,
        desc: existing.desc || app.desc,
        icon: existing.icon || app.icon };
    }
  }
  return [...groups.values()];
}
