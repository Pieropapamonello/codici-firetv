import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {batteryGuide} from '../api/utils/battery-guide.js';

test('generic battery guide has package discovery, exemption, verification and rollback on both channels',()=>{
    const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
    for(const command of ['adb shell pm list packages -3','adb shell pm list packages stremio','adb shell dumpsys deviceidle whitelist +NOME.PACCHETTO','adb shell dumpsys deviceidle whitelist -NOME.PACCHETTO','adb disconnect']) {
        assert.ok(batteryGuide.includes(command));
        assert.ok(html.includes(command));
    }
    assert.ok(batteryGuide.length<4096);
    assert.ok(!batteryGuide.includes('pm grant com.'));
    assert.ok(!html.includes('pm grant com.mediaflow.proxy.tv'));
});
