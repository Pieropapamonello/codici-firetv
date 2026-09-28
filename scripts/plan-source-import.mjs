import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { catalogMetadata } from '../public/catalog-metadata.js';
import { iconFamily } from '../public/catalog-icons.js';
import { downloadIdentity } from '../api/utils/catalog-duplicates.js';
import { downloaderCode } from '../public/app-sharing.js';
const read = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const candidates = read('source-candidates-20260927.json');
const checks = read('source-code-checks-20260927.json');
const kp = read('kpfire-candidates-20260927.json');
const rejectedCodes = new Set(['801637', '84920', '89497']); // resolved to a different product
const cleanName = name => name.replace(/\s+(?:Jan|Feb|Mar|Apr|May|Jun\w*|Jul\w*|Aug|Sep\w*|Oct|Nov|Dec)\s+\d*\/?\d{2}\s*$/i, '').trim();
export function planImport(snapshot) {
  const existing = Object.entries(snapshot.apps || {}).map(([id, app]) => ({...app, id, type:'apps'}))
    .concat(Object.entries(snapshot.software || {}).map(([id, app]) => ({...app, id, type:'software'})));
  const selectedFamilies = new Set();
  const additions = [], enrichments = [], skipped = [], icons = {};
  for (const item of [...candidates, ...kp]) {
    const name = cleanName(item.name);
    const family = iconFamily(name);
    if (item.icon && !icons[family]) icons[family] = { url:item.icon, source:item.source };
    if (rejectedCodes.has(item.code)) { skipped.push({name, reason:'Codice associato a un altro prodotto'}); continue; }
    const metadata = catalogMetadata(name);
    if (!metadata.metadataVerified) { skipped.push({name, reason:'Identità da approfondire'}); continue; }
    if (!item.code && /\bPrem\b|\bMod\b|\bClone\b|Ad Free|Morphe|Revanced/i.test(name)) {
      skipped.push({name, reason:'Pacchetto modificato: non importato automaticamente'}); continue;
    }
    const resolved = item.code ? checks.find(c => c.code === item.code)?.url : item.url;
    if (!resolved || !/^https?:\/\//i.test(resolved) || (item.code && item.url && item.url !== resolved)) {
      skipped.push({name, reason:'Destinazione non confermata'}); continue;
    }
    const candidate = {name, code:resolved};
    const exact = existing.find(app => iconFamily(app.name) === family &&
      ((item.code && downloaderCode(app) === item.code) || (downloadIdentity(candidate) && downloadIdentity(app) === downloadIdentity(candidate))));
    if (exact) {
      if (item.code && !downloaderCode(exact)) enrichments.push({type:exact.type,id:exact.id,expected:exact,fields:{downloaderCode:item.code,codeBoundUrl:exact.directUrl || exact.code,codeSource:item.source,codeCheckedAt:'2026-09-27'}});
      selectedFamilies.add(family);
      skipped.push({name, reason:'Download già presente'}); continue;
    }
    if (selectedFamilies.has(family) || (!item.code && existing.some(app => iconFamily(app.name) === family))) {
      skipped.push({name, reason:'Prodotto già coperto: non aggiunto un mirror non confrontabile'}); continue;
    }
    if (Object.values(snapshot.troypoint_ignored || {}).some(a => (typeof a === 'string' ? a : a.name)?.toLowerCase() === name.toLowerCase())) {
      skipped.push({name, reason:'Eliminata in precedenza dall’amministratore'}); continue;
    }
    const id = 'source_' + createHash('sha256').update(family + '\n' + resolved).digest('hex').slice(0,20);
    if (snapshot.apps?.[id]) { selectedFamilies.add(family); continue; }
    const displayName = item.code ? `${name} — codice ${item.code}` : name;
    additions.push({id, app:{name:displayName, code:resolved, ...(item.code ? {downloaderCode:item.code,codeBoundUrl:resolved}:{}),
      ...metadata, icon:item.icon || '', catalogImport:true, importSource:item.source,
      sourceLabel:item.source.includes('downloadercodes')?'DownloaderCodes':item.source.includes('linktr.ee')?'KPFire':'WebAssistanceITA',
      sourceName:item.name, codeCheckedAt:item.code?'2026-09-27':'', importedAt:'2026-09-27',
      // Import time is not an app release: no timestamp/new-release badge or notifications.
      variantNote:item.code ? 'Codice della fonte esterna: controlla versione e compatibilità nella pagina di destinazione. Non è una certificazione di sicurezza.' : 'APK da hosting esterno segnalato da KPFire. Versione dichiarata dalla fonte; autenticità e firma non verificate.'
    }});
    selectedFamilies.add(family);
  }
  return {additions,enrichments,skipped,icons};
}
if (process.argv[1]?.endsWith('plan-source-import.mjs')) {
  let input='';for await(const chunk of process.stdin) input+=chunk;
  console.log(JSON.stringify(planImport(JSON.parse(input))));
}
