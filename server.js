import express from 'express';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 7860;

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---
import checkStremioHandler from './api/check-stremio.js';
import checkParamountHandler from './api/check-paramount.js';
import checkParamountTvHandler from './api/check-paramount-tv.js';
import checkRevancedHandler from './api/check-revanced.js';
import checkWindowsToolsHandler from './api/check-windows-tools.js';
import cronTroypointHandler from './api/cron-troypoint.js';
import downloadParamountHandler from './api/download-paramount.js';
import fixDbHandler from './api/fix-db.js';
import searchIconHandler from './api/search-icon.js';
import subscribeHandler from './api/subscribe.js';
import updateAllIconsHandler from './api/update-all-icons.js';
import healthHandler from './api/health.js';
import unsubscribeHandler from './api/unsubscribe.js';
import telegramWebhookHandler from './api/telegram-webhook.js';
import checkStremioBetaHandler from './api/check-stremio-beta.js';
import telegramBotInfoHandler from './api/telegram-bot-info.js';
import adminStatsHandler from './api/admin-stats.js';
import uploadApkHandler from './api/upload-apk.js';
import shortRedirectHandler from './api/short-redirect.js';
import updateAftvCodeHandler from './api/update-aftv-code.js';

app.all('/api/check-stremio', (req, res) => checkStremioHandler(req, res));
app.all('/api/check-paramount', (req, res) => checkParamountHandler(req, res));
app.all('/api/check-paramount-tv', (req, res) => checkParamountTvHandler(req, res));
app.all('/api/check-revanced', (req, res) => checkRevancedHandler(req, res));
app.all('/api/check-windows-tools', (req, res) => checkWindowsToolsHandler(req, res));
app.all('/api/cron-troypoint', (req, res) => cronTroypointHandler(req, res));
app.all('/api/download-paramount', (req, res) => downloadParamountHandler(req, res));
app.all('/api/fix-db', (req, res) => fixDbHandler(req, res));
app.all('/api/search-icon', (req, res) => searchIconHandler(req, res));
app.all('/api/subscribe', (req, res) => subscribeHandler(req, res));
app.all('/api/update-all-icons', (req, res) => updateAllIconsHandler(req, res));
app.all('/api/health', (req, res) => healthHandler(req, res));
app.all('/api/unsubscribe', (req, res) => unsubscribeHandler(req, res));
app.post('/api/telegram-webhook', (req, res) => telegramWebhookHandler(req, res));
app.all('/api/check-stremio-beta', (req, res) => checkStremioBetaHandler(req, res));
app.all('/api/telegram-bot-info', (req, res) => telegramBotInfoHandler(req, res));
app.all('/api/admin-stats', (req, res) => adminStatsHandler(req, res));
app.post('/api/upload-apk', (req, res) => uploadApkHandler(req, res));
app.get('/d/:code', (req, res) => shortRedirectHandler(req, res));
app.post('/api/update-aftv-code', (req, res) => updateAftvCodeHandler(req, res));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Cron Jobs ---
function callHandler(handler, label) {
    const req = { method: 'GET', headers: {}, query: {} };
    const res = {
        statusCode: 200,
        setHeader() {},
        status(code) { this.statusCode = code; return this; },
        json(data) { console.log(`[CRON ${label}] ${this.statusCode}:`, JSON.stringify(data).slice(0, 200)); return this; },
        send(data) { console.log(`[CRON ${label}] ${this.statusCode}:`, data); return this; },
        end() { return this; },
        redirect(code, url) { console.log(`[CRON ${label}] redirect ${code} -> ${url}`); return this; }
    };
    handler(req, res).catch(err => console.error(`[CRON ${label}] Error:`, err.message));
}

cron.schedule('0 8 * * *', () => {
    console.log('[CRON] Running cron-troypoint...');
    callHandler(cronTroypointHandler, 'cron-troypoint');
});

cron.schedule('0 12 * * *', () => {
    console.log('[CRON] Running check-stremio + check-stremio-beta...');
    callHandler(checkStremioHandler, 'check-stremio');
    callHandler(checkStremioBetaHandler, 'check-stremio-beta');
});

cron.schedule('0 13 * * *', () => {
    console.log('[CRON] Running check-paramount & check-paramount-tv...');
    callHandler(checkParamountHandler, 'check-paramount');
    callHandler(checkParamountTvHandler, 'check-paramount-tv');
});

cron.schedule('0 14 * * *', () => {
    console.log('[CRON] Running check-revanced...');
    callHandler(checkRevancedHandler, 'check-revanced');
});

cron.schedule('0 15 * * *', () => {
    console.log('[CRON] Running check-windows-tools...');
    callHandler(checkWindowsToolsHandler, 'check-windows-tools');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Cron jobs scheduled.');

    // Auto-register Telegram webhook
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const publicUrl = process.env.PUBLIC_URL || 'https://ilcovodinello.onrender.com';
    if (botToken) {
        const webhookUrl = `${publicUrl}/api/telegram-webhook`;
        fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`)
            .then(r => r.json())
            .then(d => console.log('Telegram webhook:', d.ok ? `registered at ${webhookUrl}` : d.description))
            .catch(e => console.error('Telegram webhook registration failed:', e.message));
    }
});
