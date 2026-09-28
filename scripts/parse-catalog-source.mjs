import { load } from 'cheerio';
export function parseSource(html, source) {
  const $ = load(html);
  if (source.includes('go.aftvnews.com')) {
    const inner = load($('noscript').text());
    const url = inner('a[href]').first().attr('href') || $('#redirect_url').attr('href') || '';
    return { code: new URL(source).pathname.slice(1), url };
  }
  if (source.includes('linktr.ee')) {
    const data = JSON.parse($('#__NEXT_DATA__').text());
    return data.props.pageProps.account.links.filter(l => l.url && /\.apk(?:\?|$)/i.test(l.url))
      .filter(l => !/18\+|blumovies|porn|adult/i.test(l.title))
      .map(l => ({ name: l.title, url: l.url, icon: l.modifiers?.thumbnailUrl || '', source }));
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
  const code = $('.copy-dl').first().text().trim();
  return { name: $('h1').first().text().trim().replace(/\s*Downloader Code.*$/i, ''),
    code: /^\d{3,10}$/.test(code) ? code : '', url: $('.copy-dest').first().text().trim(),
    icon: $('img').map((i, el) => $(el).attr('src')).get().find(s => /^https:.*\/uploads\/.*(?:downloader|code)/i.test(s) && !/logo/i.test(s)) || '', source };
}
if (process.argv[1]?.endsWith('parse-catalog-source.mjs')) {
  let html = ''; for await (const chunk of process.stdin) html += chunk;
  console.log(JSON.stringify(parseSource(html, process.argv[2])));
}
