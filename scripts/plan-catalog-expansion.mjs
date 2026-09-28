import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {catalogMetadata} from '../public/catalog-metadata.js';
import {iconFamily} from '../public/catalog-icons.js';
import {downloadIdentity} from '../api/utils/catalog-duplicates.js';
import {downloaderCode} from '../public/app-sharing.js';
const read = file => JSON.parse(readFileSync(new URL(file,import.meta.url),'utf8'));
const kp=read('kpfire-expanded-20260928.json');
const codes=[...read('source-candidates-20260927.json'), ...read('expansion-vpn-sources-20260928.json')];
const checks=[...read('source-code-checks-20260927.json'), ...read('expansion-vpn-code-checks-20260928.json')];
export const cleanName = name => name.replace(/\s+(?:Jan|Feb|Mar|Apr|May|Jun\w*|Jul\w*|Aug|Sep\w*|Oct|Nov|Dec)\s+\d*\/?\d{2}\s*$/i,'').trim();
export function expansionPlan(snapshot) {
  const existing=['apps','software'].flatMap(type=>Object.entries(snapshot[type]||{}).map(([id,app])=>({...app,id,type})));
  const additions=[], enrichments=[], skipped=[];
  const destinations = new Map();
  for(const item of kp){
    const family=iconFamily(item.name);
    if(!destinations.has(item.url)) destinations.set(item.url,new Set());
    destinations.get(item.url).add(family);
  }
  for(const item of [...kp,...codes]) {
    const name=cleanName(item.name), family=iconFamily(name);
    const url=item.code?checks.find(c=>c.code===item.code)?.url:item.url;
    const reject=reason=>skipped.push({name,source:item.source,reason});
    if(['801637','84920','89497'].includes(item.code)) {reject('Codice per un altro prodotto');continue;}
    if(!url || !/^https?:\/\//i.test(url)) {reject('Indirizzo non confermato');continue;}
    if(item.url && item.code && item.url!==url) {reject('Destinazione del codice cambiata');continue;}
    if(destinations.get(url)?.size>1) {reject('Stesso file attribuito a prodotti diversi dalla fonte');continue;}
    if(/\.com(?:\?|$)/i.test(new URL(url).pathname)) {reject('File con estensione inattesa: non un APK');continue;}
    const metadata=catalogMetadata(name);
    if(!metadata.metadataVerified) {reject('Identità da approfondire');continue;}
    if(Object.values(snapshot.troypoint_ignored||{}).some(a=>a.name?.toLowerCase()===name.toLowerCase())) {reject('Rimossa dall’amministratore');continue;}
    const identity=downloadIdentity({code:url});
    const exact=existing.find(a=>iconFamily(a.name)===family && ((item.code&&downloaderCode(a)===item.code)||(identity&&downloadIdentity(a)===identity)));
    if(exact){
      if(item.code&&!downloaderCode(exact)&&!additions.some(a=>a.id===exact.id)) {
        enrichments.push({id:exact.id,type:exact.type,expected:exact,fields:{downloaderCode:item.code,codeBoundUrl:exact.directUrl||exact.code,codeSource:item.source,codeCheckedAt:'2026-09-28'}});
        exact.downloaderCode=item.code;
      }
      reject('Download già presente');continue;
    }
    const id='source_'+createHash('sha256').update(family+'\n'+url).digest('hex').slice(0,20);
    if(snapshot.apps?.[id]) {reject('ID già importato');continue;}
    const ambiguousPlatform=kp.filter(a=>a.url===url).some(a=>a.name!==item.name && /Mobile/i.test(a.name)!==/Mobile/i.test(item.name));
    const label=ambiguousPlatform ? `${family} — piattaforma da verificare` : item.code ? `${name} — codice ${item.code}` : name;
    const modified=/\bPrem\b|\bMod\b|Ad Free|\bClone\b/i.test(item.name);
    const bundle=/\.apks(?:\?|$)/i.test(url);
    const note=[
      item.code?'Codice pubblicato dalla fonte esterna.':'Link pubblicato da KPFire: nessun codice Downloader fornito.',
      ambiguousPlatform?'La fonte attribuisce lo stesso file a TV e Mobile: piattaforma non confermata.':'Versione e compatibilità dichiarate dalla fonte, non verificate sul dispositivo.',
      modified?'La fonte indica Prem/Mod/Ad Free/Clone: build non autenticata, nessuna garanzia di licenza Premium.':'Autenticità e firma del pacchetto non verificate.',
      bundle?'È un bundle APKS: richiede un installer compatibile, non aprirlo come APK singolo.':''
    ].filter(Boolean).join(' ');
    const app={name:label,code:url,...metadata,icon:item.icon||'',catalogImport:true,importSource:item.source,
      sourceName:item.name,sourceLabel:item.source.includes('linktr.ee')?'KPFire':item.source.includes('downloadercodes')?'DownloaderCodes':'WebAssistanceITA',
      importedAt:'2026-09-28',variantNote:note,...(bundle?{packageFormat:'apks'}:{}),
      ...(item.code?{downloaderCode:item.code,codeBoundUrl:url,codeCheckedAt:'2026-09-28'}:{})};
    additions.push({id,app});existing.push({...app,id,type:'apps'});
  }
  return {additions,enrichments,skipped};
}
if(process.argv[1]?.endsWith('plan-catalog-expansion.mjs')) {
  let input='';for await(const c of process.stdin)input+=c;
  const plan=expansionPlan(JSON.parse(input));
  const section=process.argv[2];
  console.log(JSON.stringify(section ? plan[section].slice(Number(process.argv[3]||0),Number(process.argv[3]||0)+Number(process.argv[4]||40)) : plan));
}
