import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {guideText} from '../public/guide-actions.js';
import {findSiteGuide,guidePage} from '../api/utils/site-guides.js';

test('copy preserves full commands, line breaks and external link destinations',()=>{
    const $=load('<div><h4>Avvio</h4><div>#!/bin/sh\ntermux-wake-lock\nbash ~/tunnel.sh</div><p>Installa <a href="https://f-droid.org/">Termux</a></p><ol><li>Apri impostazioni</li><li>Conferma</li></ol></div>');
    const text=guideText($('body').get(0));
    assert.ok(text.includes('#!/bin/sh\ntermux-wake-lock\nbash ~/tunnel.sh'));
    assert.ok(text.includes('Termux (https://f-droid.org/)'));
    assert.ok(text.includes('• Apri impostazioni\n• Conferma'));
});

test('dedicated guides have social and copy controls without changing their source content',()=>{
    const guide=findSiteGuide('cloudflare');
    const html=guidePage(guide);
    assert.ok(html.includes('data-guide="cloudflare"'));
    assert.ok(html.includes('src="/guide-actions.js"'));
    assert.ok(guide.messages.join('').includes('domain.digitalplat.org'));
});
