import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSearchMessages} from '../api/utils/telegram-search.js';
test('one compact product result keeps every distinct variant without raw URLs or duplicate artifacts',()=>{
    const apps=Array.from({length:12},(_,i)=>({name:`Stremio ${i+1}.0 ARM TV`,code:`https://example.com/${i}.apk`}));
    apps.push({...apps[0],name:'Stremio duplicate'});
    const messages=buildSearchMessages(apps,'https://ilcovodinello.onrender.com');
    assert.equal(messages.length,1);
    assert.equal(messages[0].reply_markup.inline_keyboard.length,12);
    assert.ok(!messages[0].text.includes('https://'));
    assert.equal(messages[0].link_preview_options.prefer_small_media,true);
    assert.ok(messages[0].link_preview_options.url.endsWith('/assets/stremio.png'));
});
test('long lists retain all downloads and only the first page has artwork',()=>{
    const apps=Array.from({length:31},(_,i)=>({name:`Nuvio ${i+1}.0 ARM TV`,code:`https://example.com/${i}.apk`}));
    const messages=buildSearchMessages(apps,'https://ilcovodinello.onrender.com');
    assert.equal(messages.flatMap(m=>m.reply_markup.inline_keyboard).length,31);
    assert.equal(messages.filter(m=>m.link_preview_options.url).length,1);
    assert.ok(messages.every(m=>m.text.length<4096));
});
test('different products stay separate and invalid download links are omitted',()=>{
    const messages=buildSearchMessages([{name:'Kodi',code:'123456'},{name:'DubLift ARM64',code:'https://example.com/dub.apk'},{name:'Unsafe',code:'javascript:alert(1)'}],'https://ilcovodinello.onrender.com');
    assert.equal(messages.length,2);
    assert.ok(messages.some(m=>m.reply_markup.inline_keyboard[0][0].url==='https://aftv.news/123456'));
});
