import { load } from 'cheerio';
import { iconFamily } from '../public/catalog-icons.js';
export function parseSource(html, source) {
  const $ = load(html);
  if (source.includes('go.aftvnews.com')) {
    const inner = load($('noscript').text());
    const url = inner('a[href]').first().attr('href') || $('#redirect_url').attr('href') || '';
    return { code: new URL(source).pathname.slice(1), url };
  }
  if (source.includes('linktr.ee')) {
    const data = JSON.parse($('#__NEXT_DATA__').text());
    let section = '';
    const sections = new Set(['apk stores', 'media players', 'maintenance apps', 'anime', 'movie/tv shows', 'live tv', 'music']);
    return data.props.pageProps.account.links.flatMap(l => {
      if (l.type === 'HEADER') { section = l.title.toLowerCase().trim(); return []; }
      if (!sections.has(section) || l.type !== 'CLASSIC' || !/^https?:\/\//i.test(l.url || '') || /18\+|blumovies|porn|adult/i.test(l.title)) return [];
      return [{ name:l.title, url:l.url, icon:l.modifiers?.thumbnailUrl || '', source, sourceCategory:section }];
    });
  }
  if (source.includes('webassistanceita')) {
    return $('li').map((i, el) => {
      const match = $(el).text().trim().match(/^([^:\n]{2,65})\s*:\s*(\d{3,10})\b/);
      return match && !/invece|codice|esempio/i.test(match[1]) ? { name: match[1].trim(), code: match[2], source } : null;
    }).get();
  }
  if (new URL(source).pathname === '/') {
    return [...new Set($('h3 a').map((i, el) => $(el).attr('href')).get())];
  }
  const code = $('.copy-dl, #d-code, #copyCode1').first().text().trim();
  const name = $('h1').first().text().trim().replace(/\s*Downloader Code.*$/i, '');
  const normalize = text => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/player$/, '');
  const product = normalize(name === 'Private Internet Access' ? 'PIA VPN' : iconFamily(name));
  const icon = $('img').filter((i, el) => product && normalize($(el).attr('alt')).startsWith(product))
    .map((i, el) => $(el).attr('data-src') || $(el).attr('src')).get().find(s => /^https:\/\//i.test(s)) || '';
  return { name,
    code: /^\d{3,10}$/.test(code) ? code : '', url: $('.copy-dest, #d-link, #copyCode3').first().text().trim(),
    icon, source };
}
if (process.argv[1]?.endsWith('parse-catalog-source.mjs')) {
  let html = ''; for await (const chunk of process.stdin) html += chunk;
  console.log(JSON.stringify(parseSource(html, process.argv[2])));
}
