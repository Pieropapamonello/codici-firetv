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
