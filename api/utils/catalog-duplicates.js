import { iconFamily } from '../../public/catalog-icons.js';

export function productIdentity(name = '') {
  for (const product of ['Surfshark', 'Netflix', 'Prime Video', 'LM Settings']) {
    if (String(name).toLowerCase().includes(product.toLowerCase())) return product;
  }
  return iconFamily(name);
}

export function downloadIdentity(app) {
  const value = String(app.directUrl || app.code || '');
  try {
    const url = new URL(value);
    // Tutorial pages were incorrectly imported by the old scraper. Never
    // deduplicate them: unrelated apps may have inherited the same tutorial.
    if (url.hostname === 'troypoint.com' || url.hostname === 'www.troypoint.com') return null;
    if (url.hostname === 'mediafire.com' || url.hostname.endsWith('.mediafire.com')) {
      const match = url.pathname.match(/^\/file(?:_premium)?\/([^/]+)\//);
      if (match) return `mediafire:${match[1]}`;
    }
    url.hash = '';
    return url.href;
  } catch { return null; }
}

export function sameDownload(a, b) {
  const identity = downloadIdentity(a);
  return !!identity && productIdentity(a.name) === productIdentity(b.name) && identity === downloadIdentity(b);
}
