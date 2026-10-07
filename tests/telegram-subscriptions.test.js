import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/telegram-webhook.js';
import { isAppEnabled } from '../api/utils/notification-prefs.js';

test('explicit subscriptions start empty, group variants, edit in place and require all-app confirmation', async () => {
    const originalFetch = global.fetch;
    const previous = process.env.TELEGRAM_BOT_TOKEN;
    const previousPassword = process.env.FIREBASE_ADMIN_PASSWORD;
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.FIREBASE_ADMIN_PASSWORD = 'test-password';
    let photoEdit = false, state = null, admin = null;
    let user = { apps: ['all'], mutedApps: ['nuvio-tv'] };
    const messages = [];
    const apps = { a: {name:'Nuvio TV ARM 32 bit'}, b:{name:'Nuvio TV ARM 64 bit'}, c:{name:'Kodi 21.3'} };
    global.fetch = async (url, options = {}) => {
        const body = options.body ? JSON.parse(options.body) : {};
        if (url.includes('identitytoolkit')) return Response.json({idToken:'admin'});
        if (url.includes('api.telegram.org')) {
            messages.push({url,body});
            if (photoEdit && url.endsWith('/editMessageText')) return Response.json({ok:false,description:'Bad Request: there is no text in the message to edit'});
            return Response.json({ok:true});
        }
        if (url.includes('/telegram_admins/')) {
            if(options.method==='DELETE') admin=null;
            if(options.method==='PUT') admin=body;
            return Response.json(admin);
        }
        if (url.includes('/telegram_state/')) {
            if(options.method==='PUT') state=body;
            if(options.method==='DELETE') state=null;
            return Response.json(state);
        }
        if (url.includes('/apps.json')) return Response.json(apps);
        if (url.includes('/telegram_users/')) {
            if (options.method === 'PATCH') user = {...user,...body};
            if (options.method === 'PUT') user = body;
            return Response.json(user);
        }
        throw new Error('Unexpected request');
    };
    const res = {status(){return this;},json(){return this;}};
    const click = data => handler({method:'POST',body:{callback_query:{id:'cb',data,message:{message_id:7,chat:{id:1}}}}},res);
    try {
        await click('sub:custom');
        assert.deepEqual(user.apps,[]);
        let edited = messages.filter(m=>m.url.endsWith('/editMessageText')).at(-1).body;
        const choices = edited.reply_markup.inline_keyboard.flat().filter(b=>b.callback_data.startsWith('sub:pick:'));
        assert.equal(choices.length,2);assert.ok(choices.every(b=>!b.text.startsWith('✅')));
        assert.equal(messages.filter(m=>m.url.endsWith('/sendMessage')).length,0);
        await click(choices.find(b=>b.text.includes('Nuvio')).callback_data);
        assert.deepEqual(user.apps,['Nuvio']);
        assert.equal(isAppEnabled(user,apps.a.name),true);assert.equal(isAppEnabled(user,apps.b.name),true);
        assert.equal(isAppEnabled(user,apps.c.name),false);
        apps.tv={name:'Stremio TV Mod'};
        apps.mobile={name:'Stremio Mobile Mod 64bit'};
        apps.mobile32={name:'Stremio Mobile Mod'};
        apps.official={name:'Stremio 1.10.4 ARM TV'};
        user.apps.push('Stremio');
        await click('sub:pick:0:stremio');
        assert.ok(user.apps.includes('Stremio')); // Opening the submenu does not change settings.
        const typeMenu=messages.filter(m=>m.url.endsWith('/editMessageText')).at(-1).body;
        const tvChoice=typeMenu.reply_markup.inline_keyboard.flat().find(b=>b.text.includes('TV Mod'));
        await click(tvChoice.callback_data);
        assert.deepEqual(user.apps,['Nuvio','type:Stremio TV Mod 32 bit']);
        assert.equal(isAppEnabled(user,'Stremio TV Mod v4.0'),true);
        assert.equal(isAppEnabled(user,'Stremio Mobile Mod 64bit'),false);
        assert.equal(isAppEnabled(user,'Stremio 1.11.0 ARM TV'),false);
        const mobileChoices=typeMenu.reply_markup.inline_keyboard.flat().filter(b=>b.text.includes('Mobile Mod'));
        assert.equal(new Set(mobileChoices.map(b=>b.callback_data)).size,2);
        for(const choice of mobileChoices) await click(choice.callback_data);
        assert.equal(user.apps.filter(n=>n.startsWith('type:')).length,3);
        assert.equal(isAppEnabled(user,'Stremio Mobile Mod'),true);
        assert.equal(isAppEnabled(user,'Stremio Mobile Mod 64bit'),true);
        const updated=messages.filter(m=>m.url.endsWith('/editMessageText')).at(-1).body;
        assert.equal(updated.reply_markup.inline_keyboard.flat().filter(b=>b.text.startsWith('✅ Stremio')).length,3);
        await click(mobileChoices[0].callback_data);
        assert.equal(user.apps.filter(n=>n.startsWith('type:')).length,2);
        for(const choice of mobileChoices.slice(1)) await click(choice.callback_data);
        await click('sub:following:0');
        const following=messages.filter(m=>m.url.endsWith('/editMessageText')).at(-1).body;
        const followedRows=following.reply_markup.inline_keyboard.flat().filter(b=>b.callback_data.startsWith('sub:remove:'));
        assert.equal(followedRows.length,2);
        await click(followedRows.find(b=>b.text.includes('TV Mod')).callback_data);
        assert.deepEqual(user.apps,['Nuvio']);
        await click('sub:confirmall');assert.deepEqual(user.apps,['Nuvio']);
        await click('sub:setall');assert.deepEqual(user.apps,['all']);
        await click('sub:following:0');
        const allFollowing=messages.filter(m=>m.url.endsWith('/editMessageText')).at(-1).body;
        await click(allFollowing.reply_markup.inline_keyboard.flat().find(b=>b.callback_data.startsWith('sub:remove:')&&b.text.includes('Stremio')).callback_data);
        assert.equal(isAppEnabled(user,'Stremio TV Mod'),false);
        assert.equal(isAppEnabled(user,'Kodi 22.0'),true);
        await click('sub:pause');assert.deepEqual(user.apps,[]);
        user=null;
        await handler({method:'POST',body:{message:{chat:{id:1},from:{first_name:'Test'},text:'/start'}}},res);
        assert.deepEqual(user.apps,[]);
        const menu = messages.filter(m=>m.url.endsWith('/sendPhoto')).at(-1).body.reply_markup.inline_keyboard.flat();
        assert.deepEqual(menu.map(b=>b.callback_data),['apps:search','apps:cats','guides:list','sub:status']);
        photoEdit=true;
        await click('sub:status');
        assert.ok(messages.filter(m=>m.url.endsWith('/sendMessage')).at(-1).body.text.includes('Notifiche app'));
        const message = text => handler({method:'POST',body:{message:{message_id:8,chat:{id:1,type:'private'},from:{first_name:'Test'},text}}},res);
        await message('/admin');assert.equal(state.action,'login');assert.equal(admin,null);
        await message('wrong-password');assert.equal(admin,null);assert.equal(state.action,'login');
        await message('test-password');assert.ok(admin);assert.equal(state,null);
    } finally {
        global.fetch=originalFetch;
        if(previous===undefined) delete process.env.TELEGRAM_BOT_TOKEN; else process.env.TELEGRAM_BOT_TOKEN=previous;
        if(previousPassword===undefined) delete process.env.FIREBASE_ADMIN_PASSWORD; else process.env.FIREBASE_ADMIN_PASSWORD=previousPassword;
    }
});
