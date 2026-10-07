import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/telegram-webhook.js';
import { isAppEnabled } from '../api/utils/notification-prefs.js';

test('explicit subscriptions start empty, group variants, edit in place and require all-app confirmation', async () => {
    const originalFetch = global.fetch;
    const previous = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    let user = { apps: ['all'], mutedApps: ['nuvio-tv'] };
    const messages = [];
    const apps = { a: {name:'Nuvio TV ARM 32 bit'}, b:{name:'Nuvio TV ARM 64 bit'}, c:{name:'Kodi 21.3'} };
    global.fetch = async (url, options = {}) => {
        const body = options.body ? JSON.parse(options.body) : {};
        if (url.includes('identitytoolkit')) return Response.json({idToken:'admin'});
        if (url.includes('api.telegram.org')) { messages.push({url,body}); return Response.json({ok:true}); }
        if (url.includes('/telegram_admins/') || url.includes('/telegram_state/')) return Response.json(null);
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
        await click('sub:confirmall');assert.deepEqual(user.apps,['Nuvio']);
        await click('sub:setall');assert.deepEqual(user.apps,['all']);
        await click('sub:pause');assert.deepEqual(user.apps,[]);
        user=null;
        await handler({method:'POST',body:{message:{chat:{id:1},from:{first_name:'Test'},text:'/start'}}},res);
        assert.deepEqual(user.apps,[]);
    } finally {
        global.fetch=originalFetch;
        if(previous===undefined) delete process.env.TELEGRAM_BOT_TOKEN; else process.env.TELEGRAM_BOT_TOKEN=previous;
    }
});
