import {createHash} from 'node:crypto';
import {load} from 'cheerio';
import {parseSource} from '../../scripts/parse-catalog-source.mjs';
import {catalogMetadata} from '../../public/catalog-metadata.js';
import {iconFamily} from '../../public/catalog-icons.js';
import {downloaderCode} from '../../public/app-sharing.js';
import {downloadIdentity} from './catalog-duplicates.js';

export const sources={
    downloadercodes:'https://downloadercodes.com/',
    webassistanceita:'https://www.webassistanceita.com/codici-downloader-firestick/',
    kpfire:'https://linktr.ee/kpfire'
};
const hash=value=>createHash('sha256').update(value).digest('hex').slice(0,20);
export async function sourceText(url,request=fetch) {
    const response=await request(url,{headers:{'User-Agent':'IlCovoDiNello-Catalog/1.0'},signal:AbortSignal.timeout(20000)});
    if(!response.ok) throw new Error(`Source HTTP ${response.status}`);
    return response.text();
}

export async function collectSource(source,request=fetch) {
    const origin=sources[source];
    if(!origin) throw new Error('Unknown source');
    if(source!=='downloadercodes') {
        const items=parseSource(await sourceText(origin,request),origin);
        if(!Array.isArray(items)||!items.length) throw new Error('Source empty or parser changed');
        return {items,failures:0,pages:1};
    }
    // App records are WordPress pages; articles use posts. Crawl both.
    const index=load(await sourceText(origin+'sitemap_index.xml',request),{xmlMode:true});
    const maps=index('sitemap > loc').map((i,e)=>index(e).text()).get()
        .filter(url=>/^https:\/\/downloadercodes\.com\/(?:post|page)-sitemap(?:\d+)?\.xml$/.test(url));
    if(!maps.length) throw new Error('Catalog sitemaps missing');
    const urls=new Set();
    for(const map of maps) {
        const xml=load(await sourceText(map,request),{xmlMode:true});
        xml('url > loc').each((i,e)=>{
            const url=xml(e).text();
            if(/^https:\/\/downloadercodes\.com\//.test(url)) urls.add(url);
        });
    }
    if(!urls.size || urls.size>1000) throw new Error('Unexpected sitemap size');
    const queue=[...urls],items=[];
    let failures=0;
    await Promise.all(Array.from({length:3},async()=>{
        while(queue.length) {
            const url=queue.shift();
            try {
                const item=parseSource(await sourceText(url,request),url);
                if(item.name && (item.code||item.url)) items.push(item);
            } catch { failures++; }
            await new Promise(resolve=>setTimeout(resolve,150));
        }
    }));
    if(!items.length) throw new Error('No catalog entries parsed');
    return {items,failures,pages:urls.size};
}

export function planSourceSync(source,items,apps,software={},ignored={}) {
    const updates={},review={};
    const existing=Object.entries(apps).map(([id,app])=>({...app,id,path:'apps'}))
        .concat(Object.entries(software).map(([id,app])=>({...app,id,path:'software'})));
    const stats={added:0,updated:0,unchanged:0,review:0};
    const ignoredNames=new Set(Object.values(ignored).map(a=>String(typeof a==='string'?a:a?.name||'').toLowerCase()));
    for(const item of items) {
        const name=String(item.name||'').replace(/\s*[—–-]\s*codice\s+\d+$/i,'').trim();
        if(!name || ignoredNames.has(name.toLowerCase())) continue;
        const code=/^\d{3,10}$/.test(item.code||'')?item.code:'';
        const url=code?`https://aftv.news/${code}`:item.url;
        if(!/^https?:\/\//i.test(url||'')) continue;
        const metadata=catalogMetadata(name);
        const family=iconFamily(name);
        const identity=downloadIdentity({code:item.url||url});
        const exact=existing.find(a=>iconFamily(a.name)===family &&
            ((code && downloaderCode(a)===code)||(identity && downloadIdentity(a)===identity)));
        if(exact) {
            // Attach an externally published code only when its declared destination
            // matches the exact artifact already in our catalog.
            if(code && !downloaderCode(exact) && item.url && downloadIdentity(exact)===downloadIdentity({code:item.url})) {
                updates[`${exact.path}/${exact.id}/downloaderCode`]=code;
                updates[`${exact.path}/${exact.id}/codeBoundUrl`]=exact.directUrl||exact.code;
                updates[`${exact.path}/${exact.id}/codeSource`]=item.source;
                stats.updated++;
            } else stats.unchanged++;
            continue;
        }
        const owned=existing.find(a=>a.sourceSync===source && a.sourceName===name);
        const oldImport=existing.find(a=>a.catalogImport && a.importSource===item.source && a.sourceName===item.name);
        const target=owned||oldImport;
        // A changed external code is not proof of a new APK. Keep known downloads intact.
        if(!metadata.metadataVerified || (target && target.sourceSync!==source) || (!target && existing.some(a=>iconFamily(a.name)===family))) {
            review[hash(item.source+'\n'+name)]={name,code,url,source:item.source,reason:metadata.metadataVerified?'existing product: destination/variant needs review':'unknown product metadata'};
            stats.review++;continue;
        }
        // Codes rejected during the earlier manual audit point to different products.
        if(['801637','84920','89497'].includes(code)) {stats.review++;continue;}
        const id=target?.id||'source_'+hash(source+'\n'+name);
        const path=target?.path||'apps';
        const data={...(target||{}),name,code:url,desc:metadata.desc,category:metadata.category,
            metadataVerified:true,metadataSource:metadata.metadataSource||'',
            icon:target?.icon||item.icon||'',catalogImport:true,sourceSync:source,sourceName:name,
            importSource:item.source,sourceLabel:source,
            downloaderCode:code||null,codeBoundUrl:code?url:null,directUrl:null,
            variantNote:'Segnalazione da fonte esterna: controlla versione, compatibilità e provenienza nella destinazione. Un cambio di codice non certifica un aggiornamento APK.'};
        delete data.id;delete data.path;
        if(target && Object.entries(data).every(([k,v])=>(target[k]??null)===(v??null))) {stats.unchanged++;continue;}
        updates[`${path}/${id}`]=data;
        stats[target?'updated':'added']++;
        existing.push({...data,id,path});
    }
    return {updates,review,stats};
}
