import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sameDownload } from '../api/utils/catalog-duplicates.js';
import { variantDescription, nuvioReleaseName } from '../public/app-variants.js';
import { catalogAliases } from '../public/catalog-aliases.js';

test('every reviewed deletion is same product and artifact and has a share redirect', () => {
  const plan = JSON.parse(readFileSync(new URL('../scripts/duplicate-plan-20260926.json', import.meta.url)));
  assert.equal(plan.length, 10);
  for (const e of plan) {
    assert.ok(sameDownload({name:e.name,code:e.code}, {name:e.keepName,code:e.keepCode}), e.name);
    assert.equal(catalogAliases['apps:'+e.remove], 'apps:'+e.keep);
  }
});

test('different architectures, platforms, releases and erroneous tutorial URLs are not clones', () => {
  const a = {name:'Nuvio TV Beta',code:'https://github.com/NuvioMedia/NuvioTV/releases/download/1.1-beta/app-armeabi.apk'};
  for (const code of [a.code.replace('armeabi','arm64'),a.code.replace('NuvioTV','NuvioMobile'),a.code.replace('1.1-beta','1.0')]) assert.equal(sameDownload(a,{...a,code}),false);
  assert.equal(sameDownload({name:'BeeTV',code:'https://troypoint.com/filmplus/'},{name:'VivaTV',code:'https://troypoint.com/filmplus/'}),false);
});

test('Nuvio descriptions and imported names follow actual release artifact', () => {
  const app = {name:'Nuvio Stable 64BIT Android Mobile',code:'https://github.com/NuvioMedia/NuvioMobile/releases/download/0.4.26-beta/androidApp-full-arm64-v8a-release.apk'};
  assert.match(variantDescription(app,''), /telefoni.*64 bit.*Beta/);
  assert.match(nuvioReleaseName(app), /^Nuvio Mobile Beta.*64 bit$/);
  assert.equal(nuvioReleaseName({name:'Other app',code:app.code}), 'Other app');
});
