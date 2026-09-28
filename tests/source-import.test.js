import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseSource} from '../scripts/parse-catalog-source.mjs';
import {planImport} from '../scripts/plan-source-import.mjs';
import {sourceInfo} from '../public/catalog-provenance.js';
import {sourceIcons} from '../public/source-icons.js';
import {downloaderCode} from '../public/app-sharing.js';
import {catalogMetadata} from '../public/catalog-metadata.js';
import {iconFamily} from '../public/catalog-icons.js';
import {sameDownload} from '../api/utils/catalog-duplicates.js';
const read = name => JSON.parse(readFileSync(new URL('../scripts/'+name,import.meta.url),'utf8'));

test('source parsers use current code only and ignore instructional text',()=>{
  const result=parseSource('<h1>VLC Downloader Code</h1><div class="copy-dl">3834114</div><div class="copy-src-1">123456</div><div class="copy-dest">https://example.org/vlc.apk</div>','https://downloadercodes.com/vlc/');
  assert.equal(result.code,'3834114'); assert.equal(result.name,'VLC');
  assert.equal(parseSource('<li>VLC: 631680</li><li>Invece di un URL, digita il codice (es: 28465)</li>','https://www.webassistanceita.com/codici-downloader-firestick/').length,1);
  assert.equal(parseSource('<noscript><a href="https://example.org/vlc.apk">Continue</a></noscript>','https://go.aftvnews.com/3834114').url,'https://example.org/vlc.apk');
});

test('planner is idempotent and does not attach a code based on name alone',()=>{
  const apps={differentVlc:{name:'VLC 64 bit',code:'https://example.org/64.apk'}};
  const first=planImport({apps});
  assert.ok(!first.enrichments.some(e=>e.id==='differentVlc'));
  for(const a of first.additions) apps[a.id]=a.app;
  assert.equal(planImport({apps}).additions.length,0);
  assert.ok(!first.additions.some(a=>['801637','84920','89497'].includes(a.app.downloaderCode)));
  assert.ok(!first.additions.some(a=>!a.app.downloaderCode && /\bPrem\b|\bMod\b|\bClone\b/i.test(a.app.name)));
});

test('reviewed import is additive, classified and backed by link/code observations',()=>{
  const plan=read('source-import-reviewed-20260928.json');
  const codes=read('source-code-checks-20260927.json');
  const links=read('source-link-checks-20260928.json');
  const identities=new Set();
  for(const {id,app} of plan.additions){
    assert.equal(links.find(c=>c.id===id)?.status,200);
    assert.equal(catalogMetadata(app.name).metadataVerified,true);
    assert.equal(app.timestamp,undefined);
    assert.ok(sourceInfo(app));
    if(app.downloaderCode) assert.equal(codes.find(c=>c.code===app.downloaderCode)?.url,app.code);
    const identity=iconFamily(app.name)+'|'+app.code;
    assert.ok(!identities.has(identity));identities.add(identity);
  }
  assert.ok(plan.enrichments.every(e=>e.fields.codeBoundUrl && !e.fields.code && !e.fields.name));
});

test('code is suppressed when a cron replaces its bound download URL',()=>{
  const app={code:'https://example.org/old.apk',downloaderCode:'123456',codeBoundUrl:'https://example.org/old.apk',codeSource:'https://downloadercodes.com/vlc/'};
  assert.equal(downloaderCode(app),'123456');
  app.code='https://example.org/new.apk';
  assert.equal(downloaderCode(app),'');assert.equal(sourceInfo(app),null);
  assert.equal(sourceInfo({importSource:'javascript:alert(1)'}),null);
  assert.equal(sourceInfo({importSource:'https://linktr.ee/not-kpfire'}),null);
});

test('transport flags and repository renames do not duplicate the same artifact',()=>{
  assert.ok(sameDownload({name:'Kodi 32bit',code:'https://mirrors.kodi.tv/releases/android/arm/kodi.apk?https=1'},{name:'Kodi',code:'https://mirrors.kodi.tv/releases/android/arm/kodi.apk'}));
  assert.ok(sameDownload({name:'SmartTubeNext',code:'https://github.com/yuliskov/SmartTubeNext/releases/download/latest/smarttube_stable.apk'},{name:'SmartTube',code:'https://github.com/yuliskov/SmartTube/releases/download/latest/smarttube_stable.apk'}));
  assert.equal(iconFamily('NuvioTV — codice 7042930'),'Nuvio');
  assert.equal(iconFamily('Bee TV 4.7.4'),'BeeTV');
});

test('cached source icons are real raster assets, not expired URLs or HTML',()=>{
  for(const path of Object.values(sourceIcons)){
    const buffer=readFileSync(new URL('../public'+path,import.meta.url));
    const png=buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpg=buffer[0]===255&&buffer[1]===216;
    const webp=buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP';
    assert.ok(png||jpg||webp,path);
  }
});
