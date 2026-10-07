import test from 'node:test';
import assert from 'node:assert/strict';
import { groupCatalog, appGroupKey } from '../public/catalog-groups.js';

test('TV/Mobile, beta/stable and architectures share one card without losing variants', () => {
  const apps = ['Nuvio Fire TV','Nuvio TV Stabile 1.0.0 ARM 32 bit','Nuvio Mobile Beta 0.4.26 ARM 64 bit'].map((name,id) => ({name,id:String(id),type:'apps',category:'Media center',code:String(id)}));
  const groups = groupCatalog(apps);
  assert.equal(groups.length,1);
  assert.equal(groups[0].name,'Nuvio');
  assert.deepEqual(groups[0].variants,apps);
  assert.equal(new Set(apps.map(appGroupKey)).size,1);
});

test('different apps and companion categories stay separate', () => {
  const groups = groupCatalog([{name:'Nuvio TV',category:'Media center'},{name:'Stremio TV Mod',category:'Media center'},{name:'Projectivy Launcher 4.71',category:'Launcher'},{name:'Projectivy Icon Pack',category:'Launcher'}]);
  assert.equal(groups.length,4);
  assert.equal(groupCatalog([]).length,0);
});

test('verified duplicate destinations/codes collapse but distinct artifacts remain', () => {
  const groups=groupCatalog([
    {name:'Fast Task Killer',code:'https://example.com/app.apk'},
    {name:'Fast Task Killer — codice 435347',code:'https://example.com/app.apk',downloaderCode:'435347'},
    {name:'Fast Task Killer ARM64',code:'https://example.com/app64.apk'},
  ]);
  assert.equal(groups.length,1);
  assert.equal(groups[0].variants.length,2);
  assert.equal(groups[0].variants[0].downloaderCode,'435347');
  assert.equal(groupCatalog([{name:'TV Bro',code:'627360'},{name:'TV Bro Browser',code:'https://go.aftvnews.com/627360'}])[0].variants.length,1);
});
