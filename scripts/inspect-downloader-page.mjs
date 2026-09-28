import {load} from 'cheerio';
import {parseSource} from './parse-catalog-source.mjs';
export function internalPage(value, base='https://downloadercodes.com/') {
  try {
    const url=new URL(value,base);
    if(url.origin!=='https://downloadercodes.com') return null;
    if(/^\/(?:wp-|cdn-cgi\/|recommends\/|recommended\/|go\/|vpn-riskfree)/i.test(url.pathname)) return null;
    if(/\.(?:xml|jpg|jpeg|png|webp|svg|gif|pdf|apk|zip|css|js|ico|woff2?)$/i.test(url.pathname) || /\/(?:feed|embed)\/?$/i.test(url.pathname)) return null;
    if(url.search && !/^\?(?:paged|page)=\d+$/.test(url.search)) return null;
    url.hash='';url.pathname=url.pathname.replace(/\/?$/, '/');return url.href;
  } catch {return null;}
}
export function inspectPage(html, source) {
  const $=load(html);
  const links=[...new Set($('a[href]').map((i,e)=>internalPage($(e).attr('href'),source)).get().filter(Boolean))];
  const parsed=parseSource(html,source);
  const app=!Array.isArray(parsed) && parsed.code && parsed.name && parsed.url && !new URL(source).pathname.startsWith('/blog/') ? parsed : null;
  return {source,app,links,canonical:internalPage($('link[rel="canonical"]').attr('href') || source),hasCodeWidget:$('.copy-dl,#d-code').length>0,
    title:$('h1').first().text().trim(),category:$('.rank-math-breadcrumb, .breadcrumb, .breadcrumbs').first().text().trim()};
}
if(process.argv[1]?.endsWith('inspect-downloader-page.mjs')){
  let html='';for await(const chunk of process.stdin)html+=chunk;
  console.log(JSON.stringify(inspectPage(html,process.argv[2])));
}
