import test from 'node:test';
import assert from 'node:assert/strict';
import { createIconRegistry, iconFamily, familyMonogram } from '../public/catalog-icons.js';

test('Nuvio variants override conflicting/missing imported logos', () => {
  const names = ['Nuvio Fire TV', 'Nuvio Beta 0.4.2 Android Mobile', 'Nuvio Stable 64BIT Android Mobile', 'Nuvio TV Stable 32BIT Android TV/Fire TV'];
  const registry = createIconRegistry(names.map((name, i) => ({ name, icon: i ? `https://example.com/${i}.png` : '' })));
  for (const name of names) assert.equal(registry.resolve(name), '/assets/nuvio-official.png');
  registry.fail(names[0]);
  assert.equal(new Set(names.map(name => registry.resolve(name))).size, 1);
});

test('same family uses one icon regardless of input order, platform or release', () => {
  const apps = [{name:'Wireshark V4.6.8 Windows',icon:'https://example.com/b.png'}, {name:'Wireshark V4.6.8 macOS',icon:'https://example.com/a.png'}];
  const a = createIconRegistry(apps), b = createIconRegistry([...apps].reverse());
  for (const app of apps) assert.equal(a.resolve(app.name), b.resolve(apps[0].name));
  assert.equal(familyMonogram('Nuvio Fire TV'), familyMonogram('Nuvio Beta'));
});

test('distinct products are not merged and official local logos win', () => {
  assert.notEqual(iconFamily('Projectivy Icon Pack'), iconFamily('Projectivy Launcher 4.71'));
  assert.notEqual(iconFamily('NuvioSomething'), iconFamily('Nuvio TV'));
  assert.equal(createIconRegistry([]).resolve('Stremio Mobile Mod'), '/assets/stremio.png');
});
