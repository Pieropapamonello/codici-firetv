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

test('copied payload contains name, full description, code when present and single-app link', () => {
  const app = { name: 'Nello & amici', desc: 'Per Android TV, ARM 32 bit.', code: '123456', id: 'abc', type: 'apps' };
  const text = appShareText(app, 'https://example.com');
  for (const expected of [app.name, app.desc, 'Codice Downloader: 123456', '?app=apps%3Aabc']) assert.ok(text.includes(expected));
  assert.ok(!appShareText({ ...app, code: '/download/app.apk' }, 'https://example.com').includes('Codice Downloader:'));
});

test('copy code includes details; share copies only URL and never opens native sharing', async () => {
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
    copied = '';
    await events['.share-app']();
    assert.equal(copied, 'https://example.com/?app=apps%3Aabc');
    copied = '';
    let nativeCalled = false;
    navigator.share = async () => { nativeCalled = true; };
    await events['.share-app']();
    assert.equal(copied, 'https://example.com/?app=apps%3Aabc');
    assert.equal(nativeCalled, false);
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
    else delete globalThis.navigator;
  }
});
