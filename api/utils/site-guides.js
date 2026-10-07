import {readFileSync} from 'node:fs';
import {load} from 'cheerio';

// The site's guide bodies are the single source of truth for Telegram too.
const $ = load(readFileSync(new URL('../../public/index.html',import.meta.url),'utf8'));
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function render(node) {
    if(node.type==='text') return escape(node.data);
    const tag=node.name;
    const inner=(node.children||[]).map(render).join('');
    if(tag==='br') return '\n';
    if(tag==='strong'||tag==='b'||tag==='h4') return `<b>${inner.trim()}</b>${tag==='h4'?'\n':''}`;
    if(tag==='code'||$(node).hasClass('code-snippet')) return `<code>${escape($(node).text().trim())}</code>\n`;
    if(tag==='a') {
        const href=$(node).attr('href')||'';
        return /^https?:\/\//.test(href)?`<a href="${escape(href)}">${inner}</a>`:inner;
    }
    if(tag==='li') return '• '+inner.trim()+'\n';
    if(['p','div','ol','ul'].includes(tag)) return inner.trim()+'\n\n';
    return inner;
}
export const siteGuides = $('#catalog-guides details.adv-guide').map((index,el)=>{
    const title=$(el).children('summary').text().trim();
    const body=$(el).children('.guide-body').contents().toArray().map(render).join('').replace(/\n{3,}/g,'\n\n').trim();
    const blocks=body.split('\n\n');
    const messages=[];
    let current=`<b>${escape(title)}</b>\n\n`;
    for(const block of blocks) {
        if(current.length+block.length>3500 && current.trim()) {messages.push(current.trim());current='';}
        current+=block+'\n\n';
    }
    if(current.trim()) messages.push(current.trim());
    const key=($(el).attr('id')||'').replace(/^guide-/,'');
    return {key,title,messages};
}).get();

export function findSiteGuide(key) {
    const canonical=key==='easyproxy'?'battery-app':key==='cloudflare'?'cf1':key;
    return siteGuides.find(g=>g.key===canonical);
}
