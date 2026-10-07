import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTelegramNotification } from '../api/utils/telegram-notification.js';
import { isAppEnabled } from '../api/utils/notification-prefs.js';
const base = 'https://ilcovodinello.onrender.com';
test('notification escapes publisher text and keeps exact variant sharing and code binding', () => {
    const app = { id: 'arm32', type: 'apps', desc: 'Text <unsafe>', code: 'https://example.com/app.apk', downloaderCode: '123456', codeBoundUrl: 'https://example.com/app.apk' };
    const result = buildTelegramNotification('Example <test> & app', '1.0_2', app.code, app, base);
    assert.ok(result.text.includes('Example &lt;test&gt; &amp; app'));
    assert.ok(result.text.includes('Text &lt;unsafe&gt;'));
    assert.equal(result.parse_mode, 'HTML');
    assert.equal(result.reply_markup.inline_keyboard[0][1].url, base + '/?app=apps%3Aarm32');
    assert.equal(result.reply_markup.inline_keyboard[1][0].copy_text.text, '123456');
    const changed = buildTelegramNotification('Example', '2.0', app.code, { ...app, codeBoundUrl: 'https://example.com/old.apk' }, base);
    assert.ok(!changed.reply_markup.inline_keyboard.flat().some(b => b.copy_text));
});
test('new listings and missing versions are not presented as numbered releases', () => {
    const fresh = buildTelegramNotification('Example', 'Nuova App', 'https://example.com/app.apk', null, base);
    assert.ok(fresh.text.includes('Nuova app nel Covo'));assert.ok(!fresh.text.includes('Versione:'));
    const update = buildTelegramNotification('Example', 'Aggiornata', 'https://example.com/app.apk', null, base);
    assert.ok(!update.text.includes('Versione:'));assert.ok(!update.text.includes('Scarica Subito'));
});
test('mute callbacks stay within Telegram limits and preserve future-version preferences', () => {
    const result = buildTelegramNotification('à'.repeat(100), '1.0', 'https://example.com/app.apk', null, base);
    for (const button of result.reply_markup.inline_keyboard.flat()) if (button.callback_data) assert.ok(Buffer.byteLength(button.callback_data) <= 64);
    assert.equal(isAppEnabled({ apps: ['all'], mutedApps: ['scrcpy-android-screen-mirroring'] }, 'scrcpy (Android Screen Mirroring) v5.1'), false);
    assert.equal(isAppEnabled({ apps: ['all'], mutedApps: [] }, 'scrcpy (Android Screen Mirroring) v5.1'), true);
    assert.equal(isAppEnabled({ apps: [] }, 'scrcpy'), false);
    assert.throws(() => buildTelegramNotification('Example', '1', 'javascript:alert(1)', null, base));
});
