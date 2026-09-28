import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {catalogMetadata} from '../public/catalog-metadata.js';
import {iconFamily} from '../public/catalog-icons.js';
import {downloadIdentity} from '../api/utils/catalog-duplicates.js';
import {downloaderCode} from '../public/app-sharing.js';
const read=f=>JSON.parse(readFileSync(new URL(f,import.meta.url),'utf8'));
export function fullDownloaderPlan(snapshot, apps=read('dc-complete-apps-20260928.json'), codes=read('dc-code-checks-20260928.json'), links=read('dc-link-checks-20260928.json')) {
  const existing=['apps','software'].flatMap(type=>Object.entries(snapshot[type]||{}).map(([id,app])=>({...app,id,type})));
  const additions=[],enrichments=[],coverage=[];
  for(const item of apps){
    const checked=codes.find(c=>c.code===item.code);
    // Opera's unescaped &nothanks is decoded as the legacy &not HTML entity.
    const published=item.url.replace('¬hanks=', '&nothanks=');
    const codeMatches=!!checked?.url && downloadIdentity({code:published})===downloadIdentity({code:checked.url});
    const destination=codeMatches?checked.url:published;
    const family=iconFamily(item.name);
    const exact=existing.find(a=>iconFamily(a.name)===family && (downloadIdentity(a)===downloadIdentity({code:destination}) || (a.catalogImport && a.importSource===item.source && a.code===item.source) || (codeMatches && downloaderCode(a)===item.code)));
    if(exact){
      if(codeMatches&&!downloaderCode(exact)){
        enrichments.push({id:exact.id,type:exact.type,expected:exact,fields:{downloaderCode:item.code,codeBoundUrl:exact.directUrl||exact.code,codeSource:item.source,codeCheckedAt:'2026-09-28'}});
        exact.downloaderCode=item.code;
      }
      coverage.push({source:item.source,name:item.name,code:item.code,status:'existing',id:exact.id,type:exact.type});continue;
    }
    if(Object.values(snapshot.troypoint_ignored||{}).some(a=>a.name?.toLowerCase()===item.name.toLowerCase())){
      coverage.push({source:item.source,name:item.name,status:'admin-excluded'});continue;
    }
    const check=links.find(c=>c.id===item.code);
    const reachable=check?.status>=200&&check.status<300;
    const fallback=!codeMatches||!reachable;
    const page=fallback||/html/i.test(check?.contentType||'');
    const url=fallback?item.source:destination;
    const id='source_'+createHash('sha256').update(family+'\n'+url).digest('hex').slice(0,20);
    const notice=!codeMatches?'La destinazione del codice differisce dalla pagina: codice da verificare.' : !reachable?'Download non verificabile al momento: apri la fonte per controllare la disponibilità.' : page?'Il collegamento apre una pagina di download, non un APK diretto.':'';
    const app={name:item.name,...catalogMetadata(item.name),code:url,icon:item.icon||'',catalogImport:true,
      importSource:item.source,sourceName:item.name,sourceLabel:'DownloaderCodes',importedAt:'2026-09-28',
      publishedDestination:published,downloadNotice:notice,downloadKind:page?'page':'file',
      variantNote:[notice,'Codice e collegamento pubblicati da DownloaderCodes. Firma, autenticità e compatibilità del pacchetto non verificate.'].filter(Boolean).join(' '),
      ...(codeMatches?{downloaderCode:item.code,codeBoundUrl:url,codeCheckedAt:'2026-09-28'}:{reportedCode:item.code})};
    additions.push({id,app});existing.push({...app,id,type:'apps'});
    coverage.push({source:item.source,name:item.name,code:item.code,status:fallback?'source-fallback':page?'download-page':'download',id,type:'apps'});
  }
  return {additions,enrichments,coverage};
}
if(process.argv[1]?.endsWith('plan-full-downloader.mjs')){
  console.log(JSON.stringify(fullDownloaderPlan(JSON.parse(readFileSync(process.argv[2],'utf8')))));
}
