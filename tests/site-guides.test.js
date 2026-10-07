import test from 'node:test';
import assert from 'node:assert/strict';
import {siteGuides,findSiteGuide} from '../api/utils/site-guides.js';
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
    for(const old of ['cf1','cf2','cf3','cf4']) assert.equal(findSiteGuide(old),findSiteGuide('cloudflare'));
    assert.equal(findSiteGuide('easyproxy'),findSiteGuide('battery-app'));
    assert.ok(findSiteGuide('cloudflare').messages.join('').includes('Termux:Boot'));
});
