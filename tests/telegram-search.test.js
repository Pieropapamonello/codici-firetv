import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSearchMessages} from '../api/utils/telegram-search.js';
import {load} from 'cheerio';
test('one compact product result keeps every distinct variant without raw URLs or duplicate artifacts',()=>{
    const apps=Array.from({length:12},(_,i)=>({name:`Stremio ${i+1}.0 ARM TV`,code:`https://example.com/${i}.apk`}));
    apps.push({...apps[0],name:'Stremio duplicate'});
    const messages=buildSearchMessages(apps,'https://ilcovodinello.onrender.com');
    assert.equal(messages.length,1);
    assert.match(messages[0].reply_markup.inline_keyboard[0][0].callback_data,/^sub:follow:[a-f0-9]{16}$/);
    assert.equal(load(messages[0].text)('a').filter((i,e)=>load(messages[0].text)(e).text()==='Scarica').length,12);
    assert.ok(!load(messages[0].text).text().includes('https://'));
    assert.equal(messages[0].link_preview_options.is_disabled,true);
});
test('long lists retain all downloads without image previews',()=>{
    const apps=Array.from({length:31},(_,i)=>({name:`Nuvio ${i+1}.0 ARM TV`,code:`https://example.com/${i}.apk`}));
    const messages=buildSearchMessages(apps,'https://ilcovodinello.onrender.com');
    assert.equal(messages.reduce((sum,m)=>sum+(m.text.match(/>Scarica<\/a>/g)||[]).length,0),31);
    assert.equal(messages.filter(m=>m.link_preview_options.url).length,0);
    assert.ok(messages.every(m=>load(m.text).text().length<4096));
});
test('copy code contains only digits and WhatsApp shares the selected variant',()=>{
    const apps=[{id:'arm32',name:'Stremio ARM 32 bit',code:'https://example.com/32.apk',downloaderCode:'123456',codeBoundUrl:'https://example.com/32.apk'},
        {id:'arm64',name:'Stremio ARM 64 bit',code:'https://example.com/64.apk'}];
    const [message]=buildSearchMessages(apps,'https://ilcovodinello.onrender.com');
    const $=load(message.text);
    assert.equal($('code').text(),'123456');
    const shares=$('a').filter((i,e)=>$(e).text()==='WhatsApp').map((i,e)=>new URL($(e).attr('href')).searchParams.get('text')).get();
    assert.ok(shares[0].includes('app=apps%3Aarm32'));assert.ok(!shares[0].includes('arm64'));
    assert.ok(shares[1].includes('app=apps%3Aarm64'));assert.ok(!shares[1].includes('123456'));
    assert.match(message.reply_markup.inline_keyboard[0][0].text,/Stremio/);
});
test('different products stay separate and invalid download links are omitted',()=>{
    const messages=buildSearchMessages([{name:'Kodi',code:'123456'},{name:'DubLift ARM64',code:'https://example.com/dub.apk'},{name:'Unsafe',code:'javascript:alert(1)'}],'https://ilcovodinello.onrender.com');
    assert.equal(messages.length,2);
    assert.ok(messages.some(m=>m.text.includes('href="https://aftv.news/123456"')));
});
