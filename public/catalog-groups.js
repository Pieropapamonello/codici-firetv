import { iconFamily } from './catalog-icons.js';

export function appGroupKey(app) {
  // Categories stay separate: never merge a companion tool with its player.
  return `${app.category || ''}:${iconFamily(app.name)}`;
}

export function groupCatalog(apps) {
  const groups = new Map();
  for (const app of apps) {
    const key = appGroupKey(app);
    if (!groups.has(key)) groups.set(key, { key, name: iconFamily(app.name), variants: [] });
    groups.get(key).variants.push(app);
  }
  return [...groups.values()];
}
