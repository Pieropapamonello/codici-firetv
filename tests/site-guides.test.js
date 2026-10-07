import test from 'node:test';
import assert from 'node:assert/strict';
import {siteGuides,findSiteGuide,guidePage} from '../api/utils/site-guides.js';
import {load} from 'cheerio';

test('all site guides are available on Telegram with stable IDs and bounded HTML messages',()=>{
    assert.equal(siteGuides.length,10);
    assert.equal(new Set(siteGuides.map(g=>g.key)).size,10);
    for(const guide of siteGuides) {
        assert.ok(guide.key);
        assert.ok(guide.messages.length);
        for(const message of guide.messages) {
            assert.ok(message.length<=4096);
            assert.ok(load(message).text().trim());
            assert.ok(!/<\/?(?:div|p|li|h4|br)\b/.test(message));
        }
    }
    for(const key of ['dublift','kodi-scienziato','kodi-startup','battery-app']) assert.ok(findSiteGuide(key));
    for(const key of ['cf1','cf2','cf3','cf4']) assert.ok(findSiteGuide(key));
    assert.equal(findSiteGuide('cloudflare'),findSiteGuide('cf1'));
    assert.equal(findSiteGuide('easyproxy'),findSiteGuide('battery-app'));
    assert.ok(findSiteGuide('cf4').messages.join('').includes('Termux:Boot'));
    assert.ok(findSiteGuide('cf2').messages.join('').includes('domain.digitalplat.org'));
});

test('four original Kodi guides retain their instructions in a single guide and old buttons still work',()=>{
    const guide=findSiteGuide('kodi');
    for(const key of ['kodi-lang','kodi-wltv','kodi-scienziato','kodi-startup']) assert.equal(findSiteGuide(key),guide);
    const text=guide.messages.join('\n');
    for(const original of ['2130077','Regional / Regione','http://worldlivetv.github.io/repo/','repository.wltv-1.x.x.zip','http://aandroide.github.io/installer/repo/','Startup window']) assert.ok(text.includes(original));
    assert.equal(siteGuides.filter(g=>g.key.startsWith('kodi')).length,1);
});

test('dedicated app guide page contains only the chosen guide, not the home catalog',()=>{
    const html=guidePage(findSiteGuide('stremio-mod'));
    assert.ok(html.includes('catalogo.stremio-italia.eu/manifest.json'));
    assert.ok(!html.includes('DubLift'));
    assert.ok(!html.includes('id="catalog-guides"'));
});
