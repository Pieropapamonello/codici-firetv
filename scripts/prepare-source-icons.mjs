import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {catalogMetadata} from '../public/catalog-metadata.js';
const plan=JSON.parse(readFileSync(new URL('source-import-plan-20260927.json',import.meta.url),'utf8'));
const icons=Object.entries(plan.icons).filter(([name])=>catalogMetadata(name).metadataVerified && !['Nuvio','Stremio','Kodi'].includes(name))
  .map(([name,info])=>({name,...info,file:'source-'+createHash('sha256').update(name).digest('hex').slice(0,16)}));
console.log(JSON.stringify(icons));
