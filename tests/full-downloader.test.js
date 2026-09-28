import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectPage,internalPage} from '../scripts/inspect-downloader-page.mjs';
import {fullDownloaderPlan} from '../scripts/plan-full-downloader.mjs';
import {catalogMetadata} from '../public/catalog-metadata.js';
import {iconFamily,createIconRegistry} from '../public/catalog-icons.js';
import {downloaderCode} from '../public/app-sharing.js';
import {variantDescription} from '../public/app-variants.js';
const read=f=>JSON.parse(readFileSync(new URL('../scripts/'+f,import.meta.url),'utf8'));
const apps=read('dc-complete-apps-20260928.json'),plan=read('dc-reviewed-20260928.json');

test('all discovered current app pages have a recorded catalog outcome',()=>{
  const audit=read('dc-coverage-audit-20260928.json');
  assert.equal(audit.pageCount,170);assert.deepEqual(audit.unseen,[]);
  assert.equal(apps.length,104);assert.equal(plan.coverage.length,104);
  assert.deepEqual(new Set(apps.map(a=>a.source)),new Set(plan.coverage.map(a=>a.source)));
  assert.ok(audit.pages.some(a=>a.source.endsWith('/games/retroarch/')));
  assert.ok(audit.pages.some(a=>a.source.endsWith('/author/bichriid/page/2/')));
  assert.ok(!audit.pages.some(a=>a.error));
});
test('crawler follows categories and pagination, but not downloads or affiliate/system endpoints',()=>{
  assert.equal(internalPage('/games/retroarch#code'),'https://downloadercodes.com/games/retroarch/');
  assert.equal(internalPage('/author/test/page/2/'),'https://downloadercodes.com/author/test/page/2/');
  assert.ok(internalPage('/?paged=2'));
  for(const path of ['/go/vpn/','/cdn-cgi/l/email-protection','/wp-admin/','/a.apk','https://example.com/app/']) assert.equal(internalPage(path),null);
});
test('legacy copyCode widgets and PIA alias artwork are parsed',()=>{
  const html='<h1>Private Internet Access</h1><img alt="AdGuard" src="https://example.com/wrong.png"><img alt="PIA VPN Downloader code" data-src="https://example.com/pia.webp"><div id="copyCode1">48649</div><div id="copyCode3">https://example.com/pia.apk</div>';
  const r=inspectPage(html,'https://downloadercodes.com/vpn/private-internet-access-vpn/');
  assert.equal(r.app.code,'48649');assert.equal(r.app.icon,'https://example.com/pia.webp');
});
test('RetroArch is searchable with the published code and a local icon',()=>{
  const {app}=plan.additions.find(a=>a.app.name==='RetroArch');
  assert.ok(app.name.toLowerCase().includes('retro'));assert.equal(downloaderCode(app),'4361890');
  assert.equal(catalogMetadata(app.name).category,'Giochi ed emulazione');
  assert.ok(createIconRegistry([app]).resolve(app.name).startsWith('/assets/catalog/'));
});
test('distinct VPN and video products are not merged with AdGuard or Nova',()=>{
  assert.notEqual(iconFamily('AdGuard VPN'),iconFamily('AdGuard'));
  assert.notEqual(iconFamily('NOVA Video Player'),iconFamily('Nova'));
  assert.equal(catalogMetadata('NOVA Video Player').category,'Lettori video');
  assert.equal(catalogMetadata('AdGuard VPN').category,'VPN');
  assert.equal(iconFamily('IPTV Smarters Pro'),'IPTV Smarters');
});
test('unconfirmed downloads remain discoverable with a visible warning and source-page action',()=>{
  for(const row of plan.coverage.filter(c=>c.status==='source-fallback')){
    const {app}=plan.additions.find(a=>a.id===row.id);
    assert.equal(app.downloadKind,'page');assert.equal(app.code,app.importSource);
    assert.ok(app.downloadNotice);assert.ok(variantDescription(app,app.desc).includes(app.downloadNotice));
    if(app.reportedCode) assert.equal(downloaderCode(app),'');
  }
  const registry=createIconRegistry(plan.additions.map(a=>a.app));
  for(const {app} of plan.additions){
    assert.ok(catalogMetadata(app.name).metadataVerified,app.name);
    assert.ok(!registry.resolve(app.name).startsWith('data:'),app.name);
    assert.equal(app.timestamp,undefined);
  }
});
test('complete import is idempotent, including fallback pages',()=>{
  const first=fullDownloaderPlan({});
  const snapshot={apps:Object.fromEntries(first.additions.map(a=>[a.id,a.app]))};
  const again=fullDownloaderPlan(snapshot);
  assert.equal(again.additions.length,0);assert.equal(again.enrichments.length,0);
  assert.equal(again.coverage.length,104);
});
