import test from 'node:test';
import assert from 'node:assert/strict';
import { downloaderCode, appShareUrl, appShareText, attachAppActions } from '../public/app-sharing.js';

test('only real numeric or AFTV URL codes are offered', () => {
  for (const code of ['123456', 123456, 'https://go.aftvnews.com/123456', 'https://aftv.news/123456/']) {
    assert.equal(downloaderCode({ code }), '123456');
  }
  for (const code of ['https://example.com/123456', '/d/123456', 'https://example.com/app.apk', '', undefined]) {
    assert.equal(downloaderCode({ code }), '');
  }
  assert.equal(downloaderCode({ code: 'https://example.com/app.apk', aftvCode: '456789' }), '456789');
});

test('share links identify a single app including its collection and discard current filters', () => {
  const a = appShareUrl({ type: 'software', id: '-test:42' }, 'https://example.com/?category=VPN');
  const url = new URL(a);
  assert.equal(url.searchParams.get('app'), 'software:-test:42');
  assert.equal(url.searchParams.has('category'), false);
  assert.notEqual(a, appShareUrl({ type: 'apps', id: '-test:42' }, url.origin));
});

test('copied payload contains name, description, code and direct download instead of app card', () => {
  const app = { name: 'Nello & amici', desc: 'Per Android TV, ARM 32 bit.', code: '123456', id: 'abc', type: 'apps' };
  const text = appShareText(app, 'https://example.com');
  for (const expected of [app.name, app.desc, 'Codice Downloader: 123456', 'Download: https://go.aftvnews.com/123456']) assert.ok(text.includes(expected));
  assert.ok(!text.includes('Scheda app:')); assert.ok(!text.includes('?app='));
  assert.ok(appShareText({...app,directUrl:'https://developer.example/file.apk'},'https://example.com').includes('Download: https://developer.example/file.apk'));
  assert.ok(!appShareText({ ...app, code: '/download/app.apk' }, 'https://example.com').includes('Codice Downloader:'));
});

test('only copy code is bound and includes details plus the direct download', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const events = {};
  const status = { textContent: '' };
  const card = { querySelector: selector => selector === '.app-action-status' ? status : { addEventListener: (_, fn) => { events[selector] = fn; } } };
  let copied = '';
  try {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async text => { copied = text; } } } });
    attachAppActions(card, { name: 'Test', desc: 'Descrizione', code: '123456', id: 'abc' }, 'https://example.com');
    await events['.copy-app-code']();
    assert.match(copied, /Test\n\nDescrizione\n\nCodice Downloader: 123456/);
    assert.ok(copied.includes('Download: https://go.aftvnews.com/123456'));
    assert.equal(events['.share-app'],undefined);
    attachAppActions(card, {name:'WSA Builds',desc:'Android su Windows',code:'https://example.com/wsa.7z'}, 'https://example.com');
    await events['.copy-app-code']();
    assert.ok(copied.includes('Download: https://example.com/wsa.7z'));
    assert.ok(!copied.includes('Codice Downloader:'));
    assert.equal(status.textContent,'Copiati nome, descrizione e link diretto.');
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
    else delete globalThis.navigator;
  }
});
