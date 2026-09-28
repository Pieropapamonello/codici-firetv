import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseSource} from '../scripts/parse-catalog-source.mjs';
import {expansionPlan} from '../scripts/plan-catalog-expansion.mjs';
import {catalogMetadata} from '../public/catalog-metadata.js';
import {iconFamily,createIconRegistry} from '../public/catalog-icons.js';
import {expandedIcons} from '../public/expanded-icons.js';
import {downloadIdentity} from '../api/utils/catalog-duplicates.js';
const read=file=>JSON.parse(readFileSync(new URL('../scripts/'+file,import.meta.url),'utf8'));

test('VPN page layout and lazy app artwork are extracted without selecting related ads',()=>{
  const html='<h1>Proton VPN: Fast & Secure VPN</h1><img alt="AdGuard Downloader Code" src="https://example.org/adguard.webp"><img alt="Proton VPN Downloader Code" src="data:placeholder" data-src="https://example.org/proton.webp"><div id="d-code"><span>1784104</span></div><div id="d-link">https://example.org/proton.apk</div><span>123456</span>';
  const app=parseSource(html,'https://downloadercodes.com/vpn/proton-vpn/');
  assert.equal(app.code,'1784104');assert.equal(app.url,'https://example.org/proton.apk');assert.equal(app.icon,'https://example.org/proton.webp');
});

test('tracker, firewall and file-management apps are not misclassified as streaming',()=>{
  assert.equal(catalogMetadata('Moviebase 6.12.4 Prem').category,'Cataloghi e liste di visione');
  assert.equal(catalogMetadata('SeriesGuide 2026.4.3').category,'Cataloghi e liste di visione');
  assert.equal(catalogMetadata('NetGuard 2.335').category,'Firewall Android');
  assert.equal(catalogMetadata('MiXplorer 6.71.15').category,'Gestione file');
  assert.equal(iconFamily('MediaON Player 1.1.6 32 Bit'),iconFamily('MediaON Player 1.1.6 64 Bit'));
  assert.notEqual(iconFamily('Nova 2.5.1'),iconFamily('NovaTV'));
});

test('expanded planner does not suppress distinct architectures when a family exists',()=>{
  const first=expansionPlan({apps:{existing:{name:'MediaON Player 64 Bit',code:'https://example.org/another.apk'}}});
  assert.ok(first.additions.some(a=>/MediaON.*32 Bit/.test(a.app.name)));
  const apps=Object.fromEntries(first.additions.map(a=>[a.id,a.app]));
  assert.equal(expansionPlan({apps}).additions.length,0);
  assert.ok(first.skipped.some(a=>/Netfly/.test(a.name)&&/prodotti diversi/.test(a.reason)));
  assert.ok(!first.additions.some(a=>/9cwaa9\.com/.test(a.app.code)));
});

test('reviewed expansion has observations, descriptions, icons and no release timestamps',()=>{
  const plan=read('expansion-reviewed-20260928.json');
  const checks=[...read('expansion-link-checks-20260928.json'),...read('expansion-vpn-link-checks-20260928.json')];
  const registry=createIconRegistry(plan.additions.map(a=>a.app));
  const identities=new Set();
  for(const {id,app} of plan.additions){
    assert.equal(checks.find(x=>x.id===id)?.status,200);
    assert.ok(catalogMetadata(app.name).metadataVerified);
    assert.ok(app.desc.length>30);assert.equal(app.timestamp,undefined);
    assert.ok(!registry.resolve(app.name).startsWith('data:'),app.name);
    const identity=iconFamily(app.name)+'|'+downloadIdentity(app);
    assert.ok(!identities.has(identity),app.name);identities.add(identity);
    if(app.importSource==='https://linktr.ee/kpfire') assert.equal(app.downloaderCode,undefined);
    if(app.packageFormat==='apks') assert.match(app.name,/bundle APKS/);
  }
});

test('new cached icons are raster files and the TizenTube logo is not AdGuard artwork',()=>{
  assert.notEqual(expandedIcons.TizenTube,expandedIcons.AdGuard);
  const tizen=readFileSync(new URL('../public'+expandedIcons.TizenTube,import.meta.url));
  const adguard=readFileSync(new URL('../public/assets/catalog/source-437c820cd65f3f8e.webp',import.meta.url));
  assert.ok(!tizen.equals(adguard));
  for(const path of Object.values(expandedIcons)){
    const b=readFileSync(new URL('../public'+path,import.meta.url));
    assert.ok(b[0]===137&&b[1]===80 || b[0]===255&&b[1]===216 || b.toString('ascii',0,4)==='RIFF',path);
  }
});
