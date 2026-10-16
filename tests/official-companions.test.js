import test from 'node:test';
import assert from 'node:assert/strict';
import {sunshineAssets,officialEntries} from '../scripts/official-companions.mjs';
import {groupCatalog} from '../public/catalog-groups.js';
test('Sunshine selects installable packages, not debug symbols or build recipes',()=>{
  const assets=['Sunshine.msi','sunshine_alpine.apk','sunshine.pkg.tar.zst','sunshine.flatpak','sunshine_debug.flatpak','debuginfo.7z','flathub.tar.gz','sunshine.rb','sunshine.pkg.tar.gz'].map(name=>({name}));
  assert.deepEqual(sunshineAssets({assets}).map(a=>a.name),assets.slice(0,4).map(a=>a.name));
});
test('official imports keep GmsCore variants together and PC packages out of Android',()=>{
  const release={tag_name:'v1',assets:[{name:'sunshine_alpine.apk',browser_download_url:'https://github.com/LizardByte/Sunshine/releases/download/v1/sunshine_alpine.apk'}]};
  assert.equal(officialEntries(release,'LizardByte/Sunshine','Sunshine','PC','PC host')[0].collection,'software');
  assert.equal(groupCatalog([{name:'ReVanced Manager 2.6 Stabile'},{name:'Revanced Manager 2.7-dev Sviluppo'}]).length,1);
  assert.equal(groupCatalog([{name:'ReVanced GmsCore 1 Huawei'},{name:'ReVanced GmsCore 1 Standard'}]).length,1);
});
