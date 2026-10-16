import test from 'node:test';
import assert from 'node:assert/strict';
import {androidVariant,rustdeskEntries} from '../scripts/soundtv-rustdesk.mjs';
import {groupCatalog} from '../public/catalog-groups.js';
test('RustDesk imports all Android architectures without desktop files',()=>{
  const names=['aarch64','armv7','universal','x86_64'].map(a=>`rustdesk-1.5.0-${a}-signed.apk`);
  const release={tag_name:'1.5.0',assets:[...names,'rustdesk.exe'].map(name=>({name,browser_download_url:`https://github.com/rustdesk/rustdesk/releases/download/1.5.0/${name}`}))};
  const entries=rustdeskEntries(release);
  assert.equal(entries.length,4);
  assert.equal(new Set(entries.map(e=>e.app.name)).size,4);
  assert.equal(groupCatalog(entries.map(e=>e.app)).length,1);
  assert.equal(groupCatalog([{name:'S0undTV Stabile'},{name:'S0undTV Beta'}]).length,1);
  assert.throws(()=>androidVariant('unknown.apk'));
});
