import test from 'node:test';
import assert from 'node:assert/strict';
import {registerPublicCommands,publicCommands} from '../api/utils/telegram-commands.js';

test('only start is advertised in default and private menus, including Italian overrides',async()=>{
    const calls=[];
    await registerPublicCommands('fake',async(url,options)=>{
        calls.push(JSON.parse(options.body));return Response.json({ok:true});
    });
    assert.equal(calls.length,4);
    for(const call of calls) assert.deepEqual(call.commands,[{command:'start',description:'Apri menu principale'}]);
    assert.deepEqual(publicCommands.map(c=>c.command),['start']);
});
