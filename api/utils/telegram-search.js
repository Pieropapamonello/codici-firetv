import { iconFamily } from '../../public/catalog-icons.js';
import { catalogMetadata } from '../../public/catalog-metadata.js';
import { downloaderCode } from '../../public/app-sharing.js';
import { downloadIdentity } from './catalog-duplicates.js';
import { subscriptionTypeKey } from './notification-prefs.js';
const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

export function buildSearchMessages(entries, origin) {
    const groups = new Map();
    for (const app of entries) {
        if (!app.name) continue;
        const family = iconFamily(app.name);
        let url = app.directUrl || app.code || '';
        if (/^\d+$/.test(url)) url = `https://aftv.news/${url}`;
        else if (/^[a-z0-9]{3,12}$/i.test(url)) url = new URL(`/d/${url}`,origin).href;
        try { if (!['http:','https:'].includes(new URL(url).protocol)) continue; } catch { continue; }
        if (!groups.has(family)) groups.set(family, new Map());
        const identity = downloadIdentity({...app,code:url,directUrl:url}) || url;
        if (!groups.get(family).has(identity)) groups.get(family).set(identity,{...app,url});
    }
    const messages = [];
    for (const [family, variants] of [...groups].sort(([a],[b])=>a.localeCompare(b,'it'))) {
        const list = [...variants.values()].sort((a,b)=>a.name.localeCompare(b.name,'it',{numeric:true}));
        const metadata = catalogMetadata(family);
        const desc = metadata.metadataVerified ? metadata.desc : list[0].desc || '';
        for (let offset=0;offset<list.length;offset+=15) {
            const rows = list.slice(offset,offset+15).map(app=> {
                const code = downloaderCode(app);
                const label = app.name.replace(/\s*[—–-]\s*codice\s+\d+\s*$/i,'').slice(0,100);
                return `<a href="${escape(app.url)}"><b>${escape(label)}</b></a> <a href="${escape(app.url)}">${app.downloadKind==='page'?'↗️':'⬇️'}</a>${code ? '\nCodice Downloader: <code>'+escape(code)+'</code>' : ''}`;
            });
            messages.push({
                text:`📱 <b>${escape(family)}</b>${offset===0&&desc?'\n'+escape(desc.slice(0,600)):''}\n\n${list.length} versioni disponibili${list.length>15?' · '+(offset+1)+'–'+Math.min(offset+15,list.length):''}\n\n${rows.join('\n\n')}${offset===0&&list.some(a=>downloaderCode(a))?'\n\nTocca il codice per copiarlo.':''}${offset===0&&family==='Stremio'&&list.some(a=>/\bMod\b/i.test(a.name))?'\n<a href="'+escape(new URL('/#guide-stremio-mod',origin).href)+'">Guida Stremio Mod: attivare i plugin</a>':''}`,
                parse_mode:'HTML',link_preview_options:{is_disabled:true},
                reply_markup:{inline_keyboard:[[{text:family==='Stremio'?'🔔 Scegli quale Stremio seguire':'🔔 Segui '+family.slice(0,45),callback_data:'sub:follow:'+subscriptionTypeKey(family)}]]}
            });
        }
    }
    return messages;
}
