import { load } from 'cheerio';

// Never let a preceding tutorial/advertisement donate its URL to a download.
export function parseToolbox(html) {
  const $ = load(html);
  const apps = [];
  $('.toolbox-button-text').each((_, element) => {
    const label = $(element);
    const anchor = label.closest('a[href]');
    const name = label.text().replace(/\s+/g, ' ').trim();
    const code = anchor.attr('href');
    if (!name || /tutorial|^note:/i.test(name) || !code) return;
    try {
      const url = new URL(code);
      if (!['http:', 'https:'].includes(url.protocol)) return;
      apps.push({ name, code: url.href, timestamp: Date.now() });
    } catch { /* Invalid link: skip rather than borrowing another card's URL. */ }
  });
  return apps;
}
