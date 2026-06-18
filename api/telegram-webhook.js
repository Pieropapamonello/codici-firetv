import { uploadToDropbox } from "./utils/dropbox.js";
import { createAftvCode } from "./utils/aftv.js";

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN;
const API = () => `https://api.telegram.org/bot${BOT_TOKEN()}`;
const DB_URL = () => process.env.FIREBASE_DATABASE_URL;
const FB_KEY = () => process.env.FIREBASE_API_KEY;
const PUBLIC = () => process.env.PUBLIC_URL || 'https://ilcovodinello.onrender.com';

// ---------- Firebase helpers ----------
async function fbAdminToken() {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FB_KEY()}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: process.env.FIREBASE_ADMIN_EMAIL, password: process.env.FIREBASE_ADMIN_PASSWORD, returnSecureToken: true })
    });
    return (await r.json()).idToken;
}
async function isAdmin(chatId, token) {
    return !!(await (await fetch(`${DB_URL()}/telegram_admins/${chatId}.json?auth=${token}`)).json());
}
async function getState(chatId, token) {
    return (await (await fetch(`${DB_URL()}/telegram_state/${chatId}.json?auth=${token}`)).json()) || null;
}
async function setState(chatId, state, token) {
    await fetch(`${DB_URL()}/telegram_state/${chatId}.json?auth=${token}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
    });
}
async function clearState(chatId, token) {
    await fetch(`${DB_URL()}/telegram_state/${chatId}.json?auth=${token}`, { method: 'DELETE' });
}

// ---------- Telegram helpers ----------
async function tg(chatId, text, extra = {}) {
    return (await fetch(`${API()}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', disable_web_page_preview: true, ...extra })
    })).json();
}
async function tgEdit(chatId, messageId, text, extra = {}) {
    return (await fetch(`${API()}/editMessageText`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown', disable_web_page_preview: true, ...extra })
    })).json();
}
async function tgAnswer(callbackId, text = '') {
    await fetch(`${API()}/answerCallbackQuery`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackId, text })
    });
}

function resolveAppUrl(app) {
    const code = app.code || '';
    if (/^https?:\/\//i.test(code)) return code;
    if (/^\d+$/.test(code)) return `https://aftv.news/${code}`;
    if (/^[a-z0-9]{3,12}$/i.test(code)) return `${PUBLIC()}/d/${code}`;
    return code;
}
function buildAppButtons(apps) {
    return { inline_keyboard: apps.filter(a => { const u = resolveAppUrl(a); return u && u.startsWith('http'); }).map(a => [{ text: `📥 ${a.name.substring(0, 50)}`, url: resolveAppUrl(a) }]) };
}

async function sendAppCard(chatId, app) {
    const url = resolveAppUrl(app);
    if (!url || !url.startsWith('http')) return;
    const caption = `*${app.name}*\n${app.desc || ''}\n📁 ${app.category || '?'} · 🔢 \`${app.code}\``;
    const photo = app.icon && app.icon.startsWith('http') ? app.icon : null;
    const kb = { inline_keyboard: [[{ text: '📥 Scarica', url }]] };

    if (photo) {
        try {
            const r = await fetch(`${API()}/sendPhoto`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, photo, caption, parse_mode: 'Markdown', reply_markup: kb })
            });
            if ((await r.json()).ok) return;
        } catch (_) {}
    }
    await tg(chatId, caption, { reply_markup: kb });
}

function genShortCode(len = 5) {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let out = ''; for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

// ---------- Menus ----------
function mainMenuPublic(adminFlag) {
    const url = PUBLIC();
    const kb = [
        [{ text: '🌐 Apri Il Covo', web_app: { url: `${url}/` } }],
        [{ text: '📥 Sfoglia app', web_app: { url: `${url}/?view=apps` } }, { text: '🔍 Cerca', web_app: { url: `${url}/?view=search` } }],
        [{ text: '📁 Categorie', web_app: { url: `${url}/?view=cats` } }, { text: '📚 Guide', web_app: { url: `${url}/?view=guides` } }],
        [{ text: '🔔 Notifiche', web_app: { url: `${url}/?view=notify` } }]
    ];
    if (adminFlag) kb.push([{ text: '👑 Pannello Admin', web_app: { url: `${url}/?view=admin` } }, { text: '📊 Dashboard', web_app: { url: `${url}/dashboard` } }]);
    else kb.push([{ text: '🔐 Login admin', callback_data: 'admin:login' }]);
    return { inline_keyboard: kb };
}

function adminMenu() {
    return { inline_keyboard: [
        [{ text: '📋 Lista app', callback_data: 'a:list' }, { text: '🔍 Cerca app', callback_data: 'a:find' }],
        [{ text: '➕ Aggiungi app', callback_data: 'a:add' }, { text: '✏️ Modifica app', callback_data: 'a:edit' }],
        [{ text: '🗑️ Elimina app', callback_data: 'a:delete' }, { text: '🎨 Cerca icona', callback_data: 'a:icon' }],
        [{ text: '🔄 Aggiorna tutte icone', callback_data: 'a:icons' }, { text: '🧹 Dedup', callback_data: 'a:dedup' }],
        [{ text: '♻️ Ripristina blacklist', callback_data: 'a:restore' }, { text: '📊 Statistiche', callback_data: 'a:stats' }],
        [{ text: '⬆️ Upload APK', callback_data: 'a:upload_info' }, { text: '🚪 Logout', callback_data: 'a:logout' }],
        [{ text: '⬅️ Menu principale', callback_data: 'menu' }]
    ]};
}

function cancelKb() {
    return { inline_keyboard: [[{ text: '❌ Annulla', callback_data: 'cancel' }]] };
}

const FIELDS = { name: '📝 Nome', desc: '📄 Descrizione', category: '📁 Categoria', icon: '🖼️ Icona', code: '🔢 Codice' };
function editFieldsKb(key) {
    const rows = Object.entries(FIELDS).map(([f, label]) => [{ text: label, callback_data: `e:f:${f}:${key}` }]);
    rows.push([{ text: '⬅️ Menu Admin', callback_data: 'admin:menu' }]);
    return { inline_keyboard: rows };
}

// ---------- Command/callback handlers ----------
async function showMainMenu(chatId, token, adminFlag) {
    await tg(chatId, `🏠 *Menu principale*\n\nScegli un'opzione:`, { reply_markup: mainMenuPublic(adminFlag) });
}

async function showAdminMenu(chatId, token) {
    await tg(chatId, `👑 *Menu Admin*\n\nGestisci il catalogo:`, { reply_markup: adminMenu() });
}

async function listLatest(chatId, token, n = 15) {
    const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}`)).json() || {};
    const list = Object.values(apps).filter(a => a.name).sort((a,b) => (b.timestamp||0) - (a.timestamp||0)).slice(0, n);
    await tg(chatId, `📥 *Ultime ${list.length} app* (${Object.keys(apps).length} totali)\n\nTap per scaricare:`, { reply_markup: buildAppButtons(list) });
}

async function showCategories(chatId, token) {
    const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}`)).json() || {};
    const counts = {};
    Object.values(apps).forEach(a => { if (a.name) { const c = a.category || 'Altro'; counts[c] = (counts[c] || 0) + 1; } });
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    const kb = sorted.map(([c, n]) => [{ text: `${c} (${n})`, callback_data: `cat:${c.substring(0, 50)}` }]);
    kb.push([{ text: '⬅️ Menu', callback_data: 'menu' }]);
    await tg(chatId, `📁 *Categorie* — tap per esplorare:`, { reply_markup: { inline_keyboard: kb } });
}

async function showCategory(chatId, token, cat) {
    const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}`)).json() || {};
    const found = Object.values(apps).filter(a => a.name && (a.category || '') === cat).slice(0, 20);
    if (found.length === 0) { await tg(chatId, `Nessuna app in "${cat}"`); return; }
    await tg(chatId, `📂 *${cat}* — ${found.length} app\n\nTap per scaricare:`, { reply_markup: buildAppButtons(found) });
}

async function adminList(chatId, token, n = 10) {
    const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}`)).json() || {};
    const list = Object.entries(apps).filter(([,a]) => a.name).map(([k,a]) => ({...a, key: k})).sort((a,b) => (b.timestamp||0) - (a.timestamp||0)).slice(0, n);
    if (list.length === 0) { await tg(chatId, 'Catalogo vuoto'); return; }
    const text = list.map((a,i) => `*${i+1}.* ${a.name}\n   \`${a.code}\` · ${a.category||'?'}`).join('\n\n');
    await tg(chatId, `📋 *Ultime ${list.length} app:*\n\n${text}`, { reply_markup: { inline_keyboard: [[{ text: '⬅️ Menu Admin', callback_data: 'admin:menu' }]] } });
}

function findExact(apps, q) {
    const lower = q.toLowerCase().trim();
    return Object.entries(apps).find(([k, a]) => a.name && (a.code === q || a.name.toLowerCase() === lower || k === q));
}

function findAllMatches(apps, q) {
    const lower = q.toLowerCase().trim();
    const matches = Object.entries(apps).filter(([, a]) => a.name && a.name.toLowerCase().includes(lower));
    // Ordina: starts-with prima, poi alfabetico
    return matches.sort((a, b) => {
        const sa = a[1].name.toLowerCase().startsWith(lower) ? 0 : 1;
        const sb = b[1].name.toLowerCase().startsWith(lower) ? 0 : 1;
        if (sa !== sb) return sa - sb;
        return a[1].name.localeCompare(b[1].name);
    });
}

async function showAppDetail(chatId, token, key, app) {
    const url = resolveAppUrl(app);
    const text = `📱 *${app.name}*\n\n📁 Categoria: ${app.category || '?'}\n🔢 Codice: \`${app.code}\`\n📄 ${app.desc || '_nessuna descrizione_'}\n🔑 Key: \`${key}\`\n${url ? '🔗 Link: ' + url : ''}`;
    await tg(chatId, text, { reply_markup: { inline_keyboard: [
        [{ text: '✏️ Modifica', callback_data: `e:m:${key}` }, { text: '🗑️ Elimina', callback_data: `d:c:${key}` }],
        [{ text: '🎨 Cerca icona', callback_data: `i:${key}` }, { text: '🔢 Codice aftv', callback_data: `s:${key}` }],
        [{ text: '⬅️ Menu Admin', callback_data: 'admin:menu' }]
    ]}});
}

// ---------- Flow handlers (state-driven text input) ----------
async function handleStateInput(msg, chatId, token, state) {
    const text = (msg.text || '').trim();

    if (text === '/cancel' || text === '/menu') {
        await clearState(chatId, token);
        await tg(chatId, '❌ Operazione annullata.');
        if (await isAdmin(chatId, token)) await showAdminMenu(chatId, token);
        else await showMainMenu(chatId, token, false);
        return;
    }

    switch (state.action) {
        case 'login': {
            if (text === process.env.FIREBASE_ADMIN_PASSWORD) {
                await fetch(`${DB_URL()}/telegram_admins/${chatId}.json?auth=${token}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: msg.from?.first_name, addedAt: Date.now() })
                });
                await clearState(chatId, token);
                await tg(chatId, '👑 Autenticato come admin!');
                await showAdminMenu(chatId, token);
            } else {
                await tg(chatId, '❌ Password errata. Riprova o /cancel', { reply_markup: cancelKb() });
            }
            return;
        }

        case 'search': {
            await clearState(chatId, token);
            const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}`)).json() || {};
            const found = Object.values(apps).filter(a => a.name?.toLowerCase().includes(text.toLowerCase())).slice(0, 8);
            if (found.length === 0) { await tg(chatId, `🔍 Nessun risultato per "${text}"`); return; }
            await tg(chatId, `🔍 *${found.length} risultati per "${text}"*`);
            for (const app of found) await sendAppCard(chatId, app);
            return;
        }

        case 'admin_find': {
            await clearState(chatId, token);
            const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}`)).json() || {};
            const found = Object.entries(apps).filter(([,a]) => a.name?.toLowerCase().includes(text.toLowerCase())).slice(0, 15);
            if (found.length === 0) { await tg(chatId, `Nessuna app trovata per "${text}"`); return; }
            const kb = found.map(([k, a]) => [{ text: `${a.name.substring(0, 40)} (${a.category||'?'})`, callback_data: `v:${k}` }]);
            kb.push([{ text: '⬅️ Menu Admin', callback_data: 'admin:menu' }]);
            await tg(chatId, `🔍 *${found.length} risultati* — tap per dettagli:`, { reply_markup: { inline_keyboard: kb } });
            return;
        }

        case 'add': {
            const step = state.step;
            const data = state.data || {};

            if (step === 'name') {
                data.name = text;
                await setState(chatId, { action: 'add', step: 'code', data }, token);
                await tg(chatId, `📝 Nome: *${text}*\n\n🔢 Ora mandami il *codice o URL* dell'app (es. \`123456\` o un URL completo). Usa /cancel per annullare.`, { reply_markup: cancelKb() });
            } else if (step === 'code') {
                data.code = text;
                await setState(chatId, { action: 'add', step: 'desc', data }, token);
                await tg(chatId, `🔢 Codice: \`${text}\`\n\n📄 Ora la *descrizione* breve (o manda \`-\` per saltare).`, { reply_markup: cancelKb() });
            } else if (step === 'desc') {
                data.desc = text === '-' ? '' : text;
                await setState(chatId, { action: 'add', step: 'category', data }, token);
                await tg(chatId, `📁 *Categoria* (es. Streaming, Launcher, VPN, Altro)`, { reply_markup: cancelKb() });
            } else if (step === 'category') {
                data.category = text;
                await setState(chatId, { action: 'add', step: 'icon', data }, token);
                await tg(chatId, `🖼️ URL *icona* (o \`-\` per cercare automaticamente da Play Store, o \`skip\` per nessuna)`, { reply_markup: cancelKb() });
            } else if (step === 'icon') {
                if (text === '-') {
                    try {
                        const gplay = (await import('google-play-scraper')).default;
                        const r = await gplay.search({ term: data.name, num: 1 });
                        if (r && r.length > 0) data.icon = r[0].icon;
                    } catch (_) {}
                } else if (text !== 'skip') {
                    data.icon = text;
                }
                // Save app
                const addRes = await fetch(`${DB_URL()}/apps.json?auth=${token}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: data.name, code: data.code, desc: data.desc || '', icon: data.icon || '', category: data.category || 'Altro', timestamp: Date.now(), order: -1 })
                });
                const addData = await addRes.json();
                await clearState(chatId, token);
                await tg(chatId, `✅ *App aggiunta!*\n\n📝 ${data.name}\n🔢 \`${data.code}\`\n📁 ${data.category}\n🔑 Key: \`${addData.name}\``);
                await showAdminMenu(chatId, token);
            }
            return;
        }

        case 'edit_value': {
            const { field, key, appName } = state;
            await fetch(`${DB_URL()}/apps/${key}.json?auth=${token}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: text })
            });
            await clearState(chatId, token);
            await tg(chatId, `✅ Aggiornato *${appName}*\n${FIELDS[field]} → \`${text}\``);
            const app = await (await fetch(`${DB_URL()}/apps/${key}.json?auth=${token}`)).json();
            if (app) await showAppDetail(chatId, token, key, app);
            return;
        }

        case 'find_to_edit':
        case 'find_to_delete':
        case 'find_to_icon':
        case 'find_to_setaftv': {
            const actionMap = { find_to_edit: 'edit', find_to_delete: 'delete', find_to_icon: 'icon', find_to_setaftv: 'setaftv' };
            const action = actionMap[state.action];
            const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}`)).json() || {};

            // 1. Match esatto (code o nome) → procedi diretto
            const exact = findExact(apps, text);
            if (exact) {
                await clearState(chatId, token);
                await runAction(chatId, token, action, exact[0], exact[1]);
                return;
            }

            // 2. Match parziali → mostra lista per scegliere
            const matches = findAllMatches(apps, text);
            if (matches.length === 0) {
                await tg(chatId, `❌ Nessuna app trovata per "${text}". Riprova o /cancel`, { reply_markup: cancelKb() });
                return;
            }
            if (matches.length === 1) {
                await clearState(chatId, token);
                await runAction(chatId, token, action, matches[0][0], matches[0][1]);
                return;
            }
            // Multi-match: lista + scelta
            await clearState(chatId, token);
            const kb = matches.slice(0, 20).map(([k, a]) => [{ text: `${a.name.substring(0, 45)} (${a.category||'?'})`, callback_data: `pk:${action}:${k}` }]);
            kb.push([{ text: '❌ Annulla', callback_data: 'admin:menu' }]);
            await tg(chatId, `🔍 *${matches.length} risultati* per "${text}". Quale?`, { reply_markup: { inline_keyboard: kb } });
            return;
        }

        case 'set_aftv': {
            if (!/^\d{3,10}$/.test(text)) { await tg(chatId, '❌ Codice deve essere numerico (3-10 cifre)', { reply_markup: cancelKb() }); return; }
            await fetch(`${DB_URL()}/apps/${state.key}.json?auth=${token}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: text })
            });
            await clearState(chatId, token);
            await tg(chatId, `✅ Codice aftv settato per *${state.appName}*\n⚡ https://aftv.news/${text}`);
            await showAdminMenu(chatId, token);
            return;
        }
    }
}

async function runAction(chatId, token, action, key, app) {
    if (action === 'edit') {
        await tg(chatId, `✏️ Modifica *${app.name}*\nScegli il campo:`, { reply_markup: editFieldsKb(key) });
    } else if (action === 'delete') {
        await tg(chatId, `🗑️ Eliminare *${app.name}*?\n\`${app.code}\` · ${app.category||'?'}`, { reply_markup: { inline_keyboard: [
            [{ text: '✅ Si, elimina', callback_data: `d:y:${key}` }, { text: '❌ No', callback_data: 'admin:menu' }]
        ]}});
    } else if (action === 'icon') {
        await searchIcon(chatId, token, key, app);
    } else if (action === 'setaftv') {
        await setState(chatId, { action: 'set_aftv', key, appName: app.name }, token);
        await tg(chatId, `🔢 Mandami il codice aftv.news per *${app.name}*:`, { reply_markup: cancelKb() });
    }
}

async function searchIcon(chatId, token, key, app) {
    await tg(chatId, `⏳ Cerco icona per *${app.name}*...`);
    try {
        const gplay = (await import('google-play-scraper')).default;
        const cleanName = app.name.replace(/craccato|mod|vlc|lite|nuovo|tv|arm/gi, '').trim();
        const r = await gplay.search({ term: cleanName, num: 1 });
        if (r && r.length > 0) {
            await fetch(`${DB_URL()}/apps/${key}/icon.json?auth=${token}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(r[0].icon)
            });
            await tg(chatId, `✅ Icona aggiornata!\n${r[0].icon}`);
        } else {
            await tg(chatId, `❌ Nessuna icona trovata`);
        }
    } catch (e) {
        await tg(chatId, `❌ Errore: ${e.message}`);
    }
    await showAdminMenu(chatId, token);
}

// ---------- Document (APK file) handler ----------
async function downloadTelegramFile(fileId) {
    const r = await fetch(`${API()}/getFile?file_id=${fileId}`);
    const d = await r.json();
    if (!d.ok) throw new Error('getFile fallito');
    if (d.result.file_size > 20 * 1024 * 1024) throw new Error(`Troppo grande per il bot (${(d.result.file_size/1024/1024).toFixed(1)}MB, max 20MB). Usa il sito.`);
    const fr = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN()}/${d.result.file_path}`);
    const buf = Buffer.from(await fr.arrayBuffer());
    return { buffer: buf };
}

async function handleDocument(msg, chatId, token) {
    if (!(await isAdmin(chatId, token))) { await tg(chatId, `❌ Solo admin. Usa il menu per accedere.`); await showMainMenu(chatId, token, false); return; }
    const doc = msg.document;
    if (!doc.file_name?.toLowerCase().endsWith('.apk')) { await tg(chatId, `⚠️ Solo file .apk`); return; }
    await tg(chatId, `⏳ Scarico *${doc.file_name}* (${(doc.file_size/1024/1024).toFixed(1)}MB)...`);

    try {
        const { buffer } = await downloadTelegramFile(doc.file_id);
        const caption = (msg.caption || '').trim();
        const [name, desc, category] = caption.split('|').map(s => s?.trim()).concat([null, null, null]);
        const appName = name || doc.file_name.replace(/\.apk$/i, '').replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        await tg(chatId, `📤 Upload su Dropbox...`);
        const { directUrl } = await uploadToDropbox(doc.file_name, buffer);

        let code, exists = true, attempts = 0;
        while (exists && attempts < 8) {
            code = genShortCode();
            const r = await fetch(`${DB_URL()}/short_links/${code}.json?auth=${token}`);
            exists = !!(await r.json());
            attempts++;
        }
        await fetch(`${DB_URL()}/short_links/${code}.json?auth=${token}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: directUrl, createdAt: Date.now(), clicks: 0, appName })
        });

        await tg(chatId, `🔢 Genero codice aftv.news...`);
        const aftvResult = await createAftvCode(directUrl);
        const finalCode = aftvResult.code || code;
        const codeSource = aftvResult.code ? 'aftvnews' : 'internal';

        const addRes = await fetch(`${DB_URL()}/apps.json?auth=${token}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: appName, code: finalCode, desc: desc || '', icon: '', category: category || 'Altro', timestamp: Date.now(), order: -1, internalCode: code, directUrl })
        });
        const addData = await addRes.json();

        if (codeSource === 'aftvnews') {
            await tg(chatId, `✅ *${appName}*\n⚡ Codice aftv: \`${finalCode}\`\n🔗 https://aftv.news/${finalCode}`);
        } else {
            await tg(chatId, `✅ *${appName}*\n🔗 Codice interno: \`${code}\`\nURL: \`${PUBLIC().replace(/^https?:\/\//,'')}/d/${code}\`\n\n⚡ Vuoi codice aftv.news? Vai sul menu admin → "🔢 Codice aftv" e seleziona questa app.`, { reply_markup: { inline_keyboard: [
                [{ text: '🔢 Imposta codice aftv ora', callback_data: `s:${addData.name}` }],
                [{ text: '👑 Menu Admin', callback_data: 'admin:menu' }]
            ]}});
        }
    } catch (e) {
        await tg(chatId, `❌ ${e.message}`);
    }
}

// ---------- Callback query handler ----------
async function handleCallback(cb, token) {
    const chatId = cb.message.chat.id;
    const data = cb.data;
    const adminFlag = await isAdmin(chatId, token);

    await tgAnswer(cb.id);

    if (data === 'menu') { await showMainMenu(chatId, token, adminFlag); return; }
    if (data === 'cancel') { await clearState(chatId, token); await tg(chatId, '❌ Annullato.'); if (adminFlag) await showAdminMenu(chatId, token); else await showMainMenu(chatId, token, false); return; }

    if (data === 'admin:login') {
        await setState(chatId, { action: 'login' }, token);
        await tg(chatId, `🔐 Mandami la *password admin*:`, { reply_markup: cancelKb() });
        return;
    }
    if (data === 'admin:menu') {
        if (!adminFlag) { await tg(chatId, '❌ Non sei admin'); return; }
        await showAdminMenu(chatId, token); return;
    }

    if (data === 'apps:latest') { await listLatest(chatId, token); return; }
    if (data === 'apps:cats') { await showCategories(chatId, token); return; }
    if (data === 'apps:search') {
        await setState(chatId, { action: 'search' }, token);
        await tg(chatId, `🔍 Mandami il nome dell'app che cerchi:`, { reply_markup: cancelKb() });
        return;
    }
    if (data === 'sub:status') {
        const sub = await (await fetch(`${DB_URL()}/telegram_users/${chatId}.json?auth=${token}`)).json();
        if (sub) await tg(chatId, `✅ Iscritto\nApp: ${sub.apps?.includes('all') ? 'Tutte' : (sub.apps || []).join(', ')}`, { reply_markup: { inline_keyboard: [[{ text: '🛑 Disiscriviti', callback_data: 'sub:stop' }],[{ text: '⬅️ Menu', callback_data: 'menu' }]] } });
        else await tg(chatId, '❌ Non iscritto');
        return;
    }
    if (data === 'sub:stop') {
        await fetch(`${DB_URL()}/telegram_users/${chatId}.json?auth=${token}`, { method: 'DELETE' });
        await tg(chatId, '👋 Disiscritto. Usa /start per re-iscriverti.');
        return;
    }

    if (data.startsWith('cat:')) { await showCategory(chatId, token, data.substring(4)); return; }

    if (!adminFlag) { await tg(chatId, '❌ Solo admin'); return; }

    // ADMIN actions
    if (data === 'a:list') { await adminList(chatId, token); return; }
    if (data === 'a:find') {
        await setState(chatId, { action: 'admin_find' }, token);
        await tg(chatId, `🔍 Mandami nome (anche parziale) dell'app:`, { reply_markup: cancelKb() });
        return;
    }
    if (data === 'a:add') {
        await setState(chatId, { action: 'add', step: 'name', data: {} }, token);
        await tg(chatId, `➕ *Aggiungi nuova app*\n\n📝 Mandami il *nome* dell'app:`, { reply_markup: cancelKb() });
        return;
    }
    if (data === 'a:edit') {
        await setState(chatId, { action: 'find_to_edit' }, token);
        await tg(chatId, `✏️ Quale app modificare?\nMandami codice o nome:`, { reply_markup: cancelKb() });
        return;
    }
    if (data === 'a:delete') {
        await setState(chatId, { action: 'find_to_delete' }, token);
        await tg(chatId, `🗑️ Quale app eliminare?\nMandami codice o nome:`, { reply_markup: cancelKb() });
        return;
    }
    if (data === 'a:icon') {
        await setState(chatId, { action: 'find_to_icon' }, token);
        await tg(chatId, `🎨 Per quale app cerco l'icona?\nMandami codice o nome:`, { reply_markup: cancelKb() });
        return;
    }
    if (data === 'a:icons') {
        await tg(chatId, `⏳ Ricerca massiva icone in corso...`);
        try {
            const gplay = (await import('google-play-scraper')).default;
            const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}`)).json() || {};
            const updates = {}; let updated = 0, skipped = 0;
            for (const [key, app] of Object.entries(apps)) {
                if (!app.name) continue;
                if (app.icon && app.icon.startsWith('http') && !app.icon.includes('nello.png') && !app.icon.includes('downloads.png')) { skipped++; continue; }
                try {
                    const cleanName = app.name.replace(/craccato|mod|vlc|lite|nuovo|tv|arm/gi, '').trim();
                    const r = await gplay.search({ term: cleanName, num: 1 });
                    if (r && r.length > 0) { updates[`apps/${key}/icon`] = r[0].icon; updated++; }
                } catch (_) {}
            }
            if (Object.keys(updates).length > 0) {
                await fetch(`${DB_URL()}/.json?auth=${token}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
            }
            await tg(chatId, `✅ Icone — Trovate: *${updated}*, saltate: *${skipped}*`);
        } catch (e) { await tg(chatId, `❌ ${e.message}`); }
        await showAdminMenu(chatId, token);
        return;
    }
    if (data === 'a:dedup') {
        const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}`)).json() || {};
        function baseName(name) { return name.replace(/\b\d+[\d.]+\b/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); }
        function extractVersion(name) { const m = name.match(/\b(\d+)\.(\d+)(?:\.(\d+))?\b/); return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]||0)] : null; }
        const groups = {};
        for (const [key, a] of Object.entries(apps)) { if (!a.name) continue; const b = baseName(a.name); if (!groups[b]) groups[b] = []; groups[b].push({ key, app: a }); }
        const toDelete = [];
        for (const entries of Object.values(groups)) {
            if (entries.length <= 1) continue;
            entries.sort((a,b) => { const va = extractVersion(a.app.name), vb = extractVersion(b.app.name); if (va && vb) for (let i=0;i<3;i++) { const d = (vb[i]||0)-(va[i]||0); if (d) return d; } return (b.app.timestamp||0)-(a.app.timestamp||0); });
            toDelete.push(...entries.slice(1));
        }
        if (toDelete.length > 0) {
            const patch = {}; for (const e of toDelete) patch[e.key] = null;
            await fetch(`${DB_URL()}/apps.json?auth=${token}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
        }
        await tg(chatId, `🧹 Dedup completato — Rimossi: *${toDelete.length}*`);
        await showAdminMenu(chatId, token);
        return;
    }
    if (data === 'a:restore') {
        const ignored = await (await fetch(`${DB_URL()}/troypoint_ignored.json?auth=${token}`)).json() || {};
        if (Object.keys(ignored).length === 0) { await tg(chatId, '📂 Nessuna app blacklistata'); return; }
        const kb = Object.entries(ignored).slice(0, 30).map(([k, e]) => [{ text: `♻️ ${e.name}`, callback_data: `r:${k}` }]);
        kb.push([{ text: '⬅️ Menu Admin', callback_data: 'admin:menu' }]);
        await tg(chatId, `♻️ *App blacklistate* — tap per ripristinare:`, { reply_markup: { inline_keyboard: kb } });
        return;
    }
    if (data.startsWith('r:')) {
        const ignoredKey = data.substring(2);
        await fetch(`${DB_URL()}/troypoint_ignored/${ignoredKey}.json?auth=${token}`, { method: 'DELETE' });
        await tg(chatId, `✅ Ripristinata`);
        await showAdminMenu(chatId, token);
        return;
    }
    if (data === 'a:stats') {
        const [appsR, subsR, telR, shortsR] = await Promise.all([
            fetch(`${DB_URL()}/apps.json?auth=${token}`),
            fetch(`${DB_URL()}/subscribers.json?auth=${token}&shallow=true`),
            fetch(`${DB_URL()}/telegram_users.json?auth=${token}&shallow=true`),
            fetch(`${DB_URL()}/short_links.json?auth=${token}&shallow=true`)
        ]);
        const apps = await appsR.json() || {};
        const subs = await subsR.json() || {};
        const tel = await telR.json() || {};
        const shorts = await shortsR.json() || {};
        const totalClicks = Object.values(apps).reduce((s,a) => s + (a.clicks||0), 0);
        await tg(chatId, `📊 *Statistiche*\n\n📱 App: *${Object.keys(apps).length}*\n🔗 Short links: *${Object.keys(shorts).length}*\n📧 Email iscritti: *${Object.keys(subs).length}*\n📲 Telegram iscritti: *${Object.keys(tel).length}*\n⬇️ Click totali: *${totalClicks}*`, { reply_markup: { inline_keyboard: [[{ text: '⬅️ Menu Admin', callback_data: 'admin:menu' }]] } });
        return;
    }
    if (data === 'a:upload_info') {
        await tg(chatId, `⬆️ *Upload APK*\n\nManda direttamente il file .apk in questa chat (max 20MB).\n\nOpzionale: aggiungi una caption tipo \`Nome App|Descrizione|Categoria\`.\n\nPer file piu' grandi usa il sito: ${PUBLIC()}`, { reply_markup: { inline_keyboard: [[{ text: '⬅️ Menu Admin', callback_data: 'admin:menu' }]] } });
        return;
    }
    if (data === 'a:logout') {
        await fetch(`${DB_URL()}/telegram_admins/${chatId}.json?auth=${token}`, { method: 'DELETE' });
        await tg(chatId, '👋 Disconnesso da admin.');
        await showMainMenu(chatId, token, false);
        return;
    }

    // Pick action target from multi-match results
    if (data.startsWith('pk:')) {
        const [, action, key] = data.split(':');
        const app = await (await fetch(`${DB_URL()}/apps/${key}.json?auth=${token}`)).json();
        if (!app) { await tg(chatId, '❌ App non trovata'); return; }
        await runAction(chatId, token, action, key, app);
        return;
    }

    // View app detail (from search)
    if (data.startsWith('v:')) {
        const key = data.substring(2);
        const app = await (await fetch(`${DB_URL()}/apps/${key}.json?auth=${token}`)).json();
        if (!app) { await tg(chatId, '❌ App non trovata'); return; }
        await showAppDetail(chatId, token, key, app);
        return;
    }

    // Edit menu from detail
    if (data.startsWith('e:m:')) {
        const key = data.substring(4);
        const app = await (await fetch(`${DB_URL()}/apps/${key}.json?auth=${token}`)).json();
        if (!app) return;
        await tg(chatId, `✏️ *${app.name}*\nScegli il campo da modificare:`, { reply_markup: editFieldsKb(key) });
        return;
    }
    // Edit field selection
    if (data.startsWith('e:f:')) {
        const [, , field, key] = data.split(':');
        const app = await (await fetch(`${DB_URL()}/apps/${key}.json?auth=${token}`)).json();
        if (!app) return;
        await setState(chatId, { action: 'edit_value', field, key, appName: app.name }, token);
        await tg(chatId, `${FIELDS[field]} per *${app.name}*\nValore attuale: \`${app[field] || '_vuoto_'}\`\n\nMandami il nuovo valore (o /cancel):`, { reply_markup: cancelKb() });
        return;
    }

    // Delete confirm
    if (data.startsWith('d:c:')) {
        const key = data.substring(4);
        const app = await (await fetch(`${DB_URL()}/apps/${key}.json?auth=${token}`)).json();
        if (!app) return;
        await tg(chatId, `🗑️ Eliminare *${app.name}*?\n\`${app.code}\` · ${app.category||'?'}`, { reply_markup: { inline_keyboard: [
            [{ text: '✅ Si, elimina', callback_data: `d:y:${key}` }, { text: '❌ No', callback_data: 'admin:menu' }]
        ]}});
        return;
    }
    if (data.startsWith('d:y:')) {
        const key = data.substring(4);
        const app = await (await fetch(`${DB_URL()}/apps/${key}.json?auth=${token}`)).json();
        if (!app) return;
        await fetch(`${DB_URL()}/apps/${key}.json?auth=${token}`, { method: 'DELETE' });
        await tg(chatId, `🗑️ Eliminata: *${app.name}*`);
        await showAdminMenu(chatId, token);
        return;
    }

    // Icon search from detail
    if (data.startsWith('i:')) {
        const key = data.substring(2);
        const app = await (await fetch(`${DB_URL()}/apps/${key}.json?auth=${token}`)).json();
        if (!app) return;
        await searchIcon(chatId, token, key, app);
        return;
    }
    // Set aftv code from detail / upload success
    if (data.startsWith('s:')) {
        const key = data.substring(2);
        const app = await (await fetch(`${DB_URL()}/apps/${key}.json?auth=${token}`)).json();
        if (!app) return;
        await setState(chatId, { action: 'set_aftv', key, appName: app.name }, token);
        await tg(chatId, `🔢 Mandami codice aftv.news per *${app.name}*:\n\n_(Crea il codice su https://aftv.news/ usando il link dell'app)_`, { reply_markup: cancelKb() });
        return;
    }
}

// ---------- Inline query handler ----------
async function handleInlineQuery(iq, token) {
    const q = (iq.query || '').trim().toLowerCase();
    const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}`)).json() || {};

    let list = Object.values(apps).filter(a => a.name);
    if (q) {
        list = list.filter(a => a.name.toLowerCase().includes(q) || (a.desc || '').toLowerCase().includes(q));
    } else {
        list = list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    list = list.slice(0, 30);

    const results = list.map((app, i) => {
        const url = resolveAppUrl(app);
        const desc = app.desc || app.category || '';
        return {
            type: 'article',
            id: String(i),
            title: app.name,
            description: desc,
            thumb_url: app.icon && app.icon.startsWith('http') ? app.icon : undefined,
            input_message_content: {
                message_text: `📥 *${app.name}*\n${desc}\n\n🔗 ${url}`,
                parse_mode: 'Markdown'
            },
            reply_markup: { inline_keyboard: [[{ text: '📥 Scarica', url }]] }
        };
    });

    await fetch(`${API()}/answerInlineQuery`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inline_query_id: iq.id, results, cache_time: 60, is_personal: false })
    });
}

// ---------- Main handler ----------
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).json({ ok: true });
    if (!BOT_TOKEN()) return res.status(200).json({ ok: true });

    try {
        const update = req.body;
        const token = await fbAdminToken();

        if (update.inline_query) {
            await handleInlineQuery(update.inline_query, token);
            return res.status(200).json({ ok: true });
        }
        if (update.callback_query) {
            await handleCallback(update.callback_query, token);
            return res.status(200).json({ ok: true });
        }

        const msg = update.message;
        if (!msg || !msg.chat) return res.status(200).json({ ok: true });
        const chatId = msg.chat.id;
        const adminFlag = await isAdmin(chatId, token);

        if (msg.document) { await handleDocument(msg, chatId, token); return res.status(200).json({ ok: true }); }

        const text = (msg.text || '').trim();
        if (!text) return res.status(200).json({ ok: true });

        // Check conversation state first
        const state = await getState(chatId, token);
        if (state && !text.startsWith('/')) {
            await handleStateInput(msg, chatId, token, state);
            return res.status(200).json({ ok: true });
        }

        // Commands
        if (text === '/start' || text === '/menu') {
            await fetch(`${DB_URL()}/telegram_users/${chatId}.json?auth=${token}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId, firstName: msg.from?.first_name || 'Utente', username: msg.from?.username || null, apps: ['all'], joinedAt: Date.now() })
            });
            // Manda foto logo con benvenuto
            try {
                await fetch(`${API()}/sendPhoto`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        photo: `${PUBLIC()}/assets/nello.png`,
                        caption: `🏴‍☠️ *Il Covo di Nello*\n\nIl bot ora usa un'interfaccia grafica. Tap sui bottoni:`,
                        parse_mode: 'Markdown',
                        reply_markup: mainMenuPublic(adminFlag)
                    })
                });
            } catch (_) {
                await tg(chatId, `🏴‍☠️ *Il Covo di Nello*\n\nTap sui bottoni:`, { reply_markup: mainMenuPublic(adminFlag) });
            }
            return res.status(200).json({ ok: true });
        }
        if (text === '/cancel') { await clearState(chatId, token); await tg(chatId, '❌ Annullato.'); await showMainMenu(chatId, token, adminFlag); return res.status(200).json({ ok: true }); }
        if (text === '/myid') { await tg(chatId, `🆔 Chat ID:\n\`${chatId}\``); return res.status(200).json({ ok: true }); }

        // Default: show menu
        await tg(chatId, `Usa i bottoni per navigare:`, { reply_markup: mainMenuPublic(adminFlag) });

        return res.status(200).json({ ok: true });
    } catch (e) {
        console.error('Webhook error:', e.message);
        return res.status(200).json({ ok: true });
    }
}
