import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogMetadata, classifyCatalogEntry } from '../public/catalog-metadata.js';
import { parseToolbox } from '../api/utils/toolbox-parser.js';

test('firmware tools and PC software are not Android TV apps', () => {
  assert.equal(catalogMetadata('All You Need Firmware Pack').category, 'Firmware e lettori Blu-ray');
  assert.equal(catalogMetadata('SDFtool Flasher V1.3.6').category, 'Firmware e lettori Blu-ray');
  assert.equal(catalogMetadata('Amlogic USB Burning Tool v3.2.0').category, 'Firmware e ripristino box Android');
  assert.match(catalogMetadata('Streaming Downloader').desc, /Windows/);
  assert.match(catalogMetadata('adblink v8.1 Linux').desc, /computer/);
});

test('classify by function, not loose player/file/latest substrings', () => {
  assert.equal(catalogMetadata('MX Player Pro with Codecs').category, 'Lettori video');
  assert.equal(catalogMetadata('iMPlayer').category, 'TV in diretta · Player IPTV');
  assert.equal(catalogMetadata('Nuvio TV Stable 64BIT Android TV').category, 'Film e serie · Media center');
  assert.equal(catalogMetadata('FileSynced Latest Release').category, 'Store e raccolte APK');
  assert.equal(catalogMetadata('ES File Explorer').category, 'Gestione file');
  assert.equal(catalogMetadata('Airscreen – Screen Mirroring').category, 'Trasmetti lo schermo alla TV');
  assert.equal(catalogMetadata('Google Photos').category, 'Foto e immagini');
  assert.equal(catalogMetadata('YouTube Music').category, 'Musica');
});

test('correct stale database descriptions while preserving identity/download/architecture', () => {
  const app = { id: 'abc', name: 'Amlogic USB Burning Tool v2.2.0', code: '123', category: 'Altro', desc: 'App per Fire TV e Android TV' };
  const result = classifyCatalogEntry(app);
  assert.equal(result.code, app.code);
  assert.equal(result.name, app.name);
  assert.equal(result.id, app.id);
  assert.match(result.desc, /Windows/);
  assert.notEqual(result.category, 'Altro');
  assert.equal(app.category, 'Altro'); // no in-place mutation
});

test('ambiguous and future names are explicitly unverified, never guessed', () => {
  for (const name of ['Huhu', 'Media Droid Play 1.1 Exo', 'A New Player', '', undefined]) {
    const metadata = catalogMetadata(name);
    assert.equal(metadata.category, 'Da identificare');
    assert.equal(metadata.metadataVerified, false);
  }
});

test('toolbox uses the containing download anchor, never previous tutorial/advertisement', () => {
  const html = `<a href="https://example.com/tutorial">View Tutorial</a>
    <a href="https://example.com/ad">Ad</a>
    <a href="https://example.com/app32.apk"><img src="x"><p class="gb-text toolbox-button-text">Example <b>32BIT</b> Android TV<br></p></a>
    <a href="https://example.com/tutorial2">View Tutorial</a>
    <a href="https://example.com/app64.apk"><p class="toolbox-button-text">Example 64BIT Android TV &amp; Google TV</p></a>`;
  const apps = parseToolbox(html);
  assert.deepEqual(apps.map(({name, code}) => ({name, code})), [
    { name: 'Example 32BIT Android TV', code: 'https://example.com/app32.apk' },
    { name: 'Example 64BIT Android TV & Google TV', code: 'https://example.com/app64.apk' }
  ]);
});

test('toolbox rejects orphan labels, invalid schemes, tutorial labels and changed markup', () => {
  assert.deepEqual(parseToolbox(`<a href="https://example.com/wrong">Before</a><p class="toolbox-button-text">Orphan</p>
    <a href="javascript:alert(1)"><p class="toolbox-button-text">Invalid</p></a>
    <a href="https://example.com/help"><p class="toolbox-button-text">Tutorial</p></a>`), []);
  assert.deepEqual(parseToolbox('<h3>Unexpected redesign</h3>'), []);
});
