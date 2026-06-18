import { uploadToDropbox } from "./utils/dropbox.js";
import { createAftvCode } from "./utils/aftv.js";

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN;
const API = () => `https://api.telegram.org/bot${BOT_TOKEN()}`;
const DB_URL = () => process.env.FIREBASE_DATABASE_URL;
const FB_KEY = () => process.env.FIREBASE_API_KEY;
const PUBLIC = () => process.env.PUBLIC_URL || 'https://ilcovodinello.onrender.com';

async function fbAdminToken() {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FB_KEY()}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: process.env.FIREBASE_ADMIN_EMAIL, password: process.env.FIREBASE_ADMIN_PASSWORD, returnSecureToken: true })
    });
    const d = await r.json();
    return d.idToken;
}

async function tg(chatId, text, extra = {}) {
    return fetch(`${API()}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', disable_web_page_preview: true, ...extra })
    });
}

async function isAdmin(chatId, token) {
    const r = await fetch(`${DB_URL()}/telegram_admins/${chatId}.json?auth=${token}`);
    const d = await r.json();
    return !!d;
}

function genShortCode(len = 5) {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let out = ''; for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

async function downloadTelegramFile(fileId) {
    const r = await fetch(`${API()}/getFile?file_id=${fileId}`);
    const d = await r.json();
    if (!d.ok) throw new Error('getFile fallito');
    if (d.result.file_size > 20 * 1024 * 1024) throw new Error(`File troppo grande per Telegram Bot (${(d.result.file_size/1024/1024).toFixed(1)}MB). Limite bot: 20MB. Usa il sito.`);
    const fr = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN()}/${d.result.file_path}`);
    const buf = Buffer.from(await fr.arrayBuffer());
    return { buffer: buf, fileName: d.result.file_path.split('/').pop() };
}

async function handleCommand(text, chatId, msg, token) {
    const adminFlag = await isAdmin(chatId, token);
    const [cmd, ...args] = text.split(/\s+/);
    const rest = args.join(' ');

    // PUBLIC commands
    if (cmd === '/start') {
        await fetch(`${DB_URL()}/telegram_users/${chatId}.json?auth=${token}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, firstName: msg.from?.first_name || 'Utente', username: msg.from?.username || null, apps: ['all'], joinedAt: Date.now() })
        });
        await tg(chatId, `🎉 *Benvenuto!*\nSei iscritto alle notifiche.\n\nComandi:\n/status — la tua iscrizione\n/stop — disiscriviti\n/apps — n. app nel catalogo\n/myid — il tuo chat ID${adminFlag ? '\n\n👑 Sei admin. /help per comandi admin' : ''}`);
        return;
    }

    if (cmd === '/myid') { await tg(chatId, `🆔 Il tuo chat ID:\n\`${chatId}\``); return; }

    if (cmd === '/stop') {
        await fetch(`${DB_URL()}/telegram_users/${chatId}.json?auth=${token}`, { method: 'DELETE' });
        await tg(chatId, `👋 Disiscritto. /start per re-iscriverti.`); return;
    }

    if (cmd === '/status') {
        const sub = await (await fetch(`${DB_URL()}/telegram_users/${chatId}.json?auth=${token}`)).json();
        if (sub) await tg(chatId, `✅ Iscritto\nApp: ${sub.apps?.includes('all') ? 'Tutte' : (sub.apps || []).join(', ')}`);
        else await tg(chatId, `❌ Non iscritto. /start`);
        return;
    }

    if (cmd === '/apps') {
        const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}&shallow=true`)).json();
        await tg(chatId, `📱 *${Object.keys(apps || {}).length}* app nel catalogo.\n🌐 ${PUBLIC()}`);
        return;
    }

    // ADMIN AUTH
    if (cmd === '/admin') {
        if (rest === process.env.FIREBASE_ADMIN_PASSWORD) {
            await fetch(`${DB_URL()}/telegram_admins/${chatId}.json?auth=${token}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: msg.from?.first_name, addedAt: Date.now() })
            });
            await tg(chatId, `👑 *Autenticato come admin!*\n\nComandi admin:\n/help — questa lista\n/list [N] — ultime N app\n/find <nome>\n/delete <code> — elimina app\n/stats\n/logout — esci\n\n📦 Invia un *file APK* per caricarlo (max 20MB).\nCaption opzionale: \`nome|desc|categoria\``);
        } else {
            await tg(chatId, `❌ Password errata`);
        }
        return;
    }

    // ADMIN-ONLY
    if (!adminFlag) {
        await tg(chatId, `Comandi: /start /status /stop /apps /myid\nAdmin: /admin <password>`);
        return;
    }

    if (cmd === '/logout') {
        await fetch(`${DB_URL()}/telegram_admins/${chatId}.json?auth=${token}`, { method: 'DELETE' });
        await tg(chatId, `👋 Disconnesso da admin.`);
        return;
    }

    if (cmd === '/help') {
        await tg(chatId, `*Comandi admin:*\n\n📋 *Catalogo:*\n/list [N] — ultime N app\n/find <nome>\n/stats\n\n➕ *Aggiungi:*\n/add <nome>|<code>|<desc>|<cat>|<icon>\n📦 Invia file APK con caption opzionale\n\n✏️ *Modifica:*\n/edit <code> <field>=<value>\n   (field: name|desc|category|icon|code)\n/icon <code> — cerca icona da Play Store\n/icons — aggiorna tutte le icone mancanti\n/setaftv <key> <num> — setta codice aftv.news manuale\n\n🗑️ *Elimina:*\n/delete <code>\n\n🔧 *Manutenzione:*\n/dedup — rimuove duplicati\n/restore list | /restore <nome>\n\n🚪 /logout`);
        return;
    }

    if (cmd === '/add') {
        if (!rest) { await tg(chatId, 'Uso:\n/add <nome>|<code>|<desc>|<categoria>|<icon>\n\nSolo nome+code obbligatori. Esempio:\n/add MyApp|123456|App test|Streaming'); return; }
        const [n, c, d, cat, ic] = rest.split('|').map(s => s?.trim());
        if (!n || !c) { await tg(chatId, '❌ Nome e codice obbligatori'); return; }
        const addRes = await fetch(`${DB_URL()}/apps.json?auth=${token}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: n, code: c, desc: d || '', icon: ic || '', category: cat || 'Altro', timestamp: Date.now(), order: -1 })
        });
        const addData = await addRes.json();
        await tg(chatId, `✅ Aggiunta *${n}*\nCodice: \`${c}\`\nKey: \`${addData.name}\``);
        return;
    }

    if (cmd === '/edit') {
        if (!rest) { await tg(chatId, 'Uso: /edit <code> <field>=<value>\nField: name, desc, category, icon, code'); return; }
        const [codeArg, ...fields] = rest.split(/\s+/);
        if (!codeArg || fields.length === 0) { await tg(chatId, '❌ Esempio: /edit abc123 name=Nuovo Nome'); return; }

        const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}`)).json() || {};
        const entry = Object.entries(apps).find(([,a]) => a.code === codeArg);
        if (!entry) { await tg(chatId, `❌ App non trovata per code "${codeArg}"`); return; }
        const [key, app] = entry;

        const fieldStr = fields.join(' ');
        const fieldMatch = fieldStr.match(/^(name|desc|category|icon|code)=(.+)$/);
        if (!fieldMatch) { await tg(chatId, '❌ Field deve essere: name|desc|category|icon|code'); return; }
        const [, field, value] = fieldMatch;

        await fetch(`${DB_URL()}/apps/${key}.json?auth=${token}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: value })
        });
        await tg(chatId, `✅ *${app.name}*\n${field} → \`${value}\``);
        return;
    }

    if (cmd === '/icon') {
        if (!rest) { await tg(chatId, 'Uso: /icon <code>'); return; }
        const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}`)).json() || {};
        const entry = Object.entries(apps).find(([,a]) => a.code === rest);
        if (!entry) { await tg(chatId, `❌ App non trovata`); return; }
        const [key, app] = entry;

        try {
            const gplay = (await import('google-play-scraper')).default;
            const cleanName = app.name.replace(/craccato|mod|vlc|lite|nuovo|tv|arm/gi, '').trim();
            const results = await gplay.search({ term: cleanName, num: 1 });
            if (results && results.length > 0) {
                await fetch(`${DB_URL()}/apps/${key}/icon.json?auth=${token}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(results[0].icon)
                });
                await tg(chatId, `✅ Icona aggiornata per *${app.name}*\n${results[0].icon}`);
            } else {
                await tg(chatId, `❌ Nessuna icona trovata per "${cleanName}"`);
            }
        } catch (e) {
            await tg(chatId, `❌ Errore: ${e.message}`);
        }
        return;
    }

    if (cmd === '/icons') {
        await tg(chatId, `⏳ Ricerca massiva icone mancanti in corso...`);
        try {
            const gplay = (await import('google-play-scraper')).default;
            const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}`)).json() || {};
            const updates = {};
            let updated = 0, skipped = 0;
            for (const [key, app] of Object.entries(apps)) {
                if (!app.name) continue;
                if (app.icon && app.icon.startsWith('http') && !app.icon.includes('nello.png') && !app.icon.includes('downloads.png')) { skipped++; continue; }
                try {
                    const cleanName = app.name.replace(/craccato|mod|vlc|lite|nuovo|tv|arm/gi, '').trim();
                    const r = await gplay.search({ term: cleanName, num: 1 });
                    if (r && r.length > 0) {
                        updates[`apps/${key}/icon`] = r[0].icon;
                        updated++;
                    }
                } catch (_) {}
            }
            if (Object.keys(updates).length > 0) {
                await fetch(`${DB_URL()}/.json?auth=${token}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
            }
            await tg(chatId, `✅ *Icone aggiornate*\n\n📥 Trovate: *${updated}*\n⏭️ Saltate (gia' valide): *${skipped}*`);
        } catch (e) {
            await tg(chatId, `❌ Errore: ${e.message}`);
        }
        return;
    }

    if (cmd === '/dedup') {
        const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}`)).json() || {};
        function baseName(name) { return name.replace(/\b\d+[\d.]+\b/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); }
        function extractVersion(name) { const m = name.match(/\b(\d+)\.(\d+)(?:\.(\d+))?\b/); return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]||0)] : null; }
        const groups = {};
        for (const [key, a] of Object.entries(apps)) {
            if (!a.name) continue;
            const b = baseName(a.name);
            if (!groups[b]) groups[b] = [];
            groups[b].push({ key, app: a });
        }
        const toDelete = [];
        for (const entries of Object.values(groups)) {
            if (entries.length <= 1) continue;
            entries.sort((a,b) => {
                const va = extractVersion(a.app.name), vb = extractVersion(b.app.name);
                if (va && vb) { for (let i=0;i<3;i++) { const d = (vb[i]||0)-(va[i]||0); if (d) return d; } }
                return (b.app.timestamp||0) - (a.app.timestamp||0);
            });
            toDelete.push(...entries.slice(1));
        }
        if (toDelete.length > 0) {
            const patch = {};
            for (const e of toDelete) patch[e.key] = null;
            await fetch(`${DB_URL()}/apps.json?auth=${token}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch)
            });
        }
        const names = toDelete.map(e => `• ${e.app.name}`).slice(0, 15).join('\n');
        await tg(chatId, `🧹 *Dedup completato*\n\nRimossi: *${toDelete.length}*\n${names ? '\n' + names : ''}${toDelete.length > 15 ? `\n_...e altri ${toDelete.length-15}_` : ''}`);
        return;
    }

    if (cmd === '/setaftv') {
        const [key, aftvCode] = args;
        if (!key || !aftvCode || !/^\d{3,10}$/.test(aftvCode)) {
            await tg(chatId, 'Uso: /setaftv <firebaseKey> <codice_aftv>\n\nEs: /setaftv -O123xyz 7274133');
            return;
        }
        const appRes = await fetch(`${DB_URL()}/apps/${key}.json?auth=${token}`);
        const app = await appRes.json();
        if (!app) { await tg(chatId, `❌ App con key "${key}" non trovata`); return; }
        await fetch(`${DB_URL()}/apps/${key}.json?auth=${token}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: aftvCode })
        });
        await tg(chatId, `✅ Codice aggiornato per *${app.name}*\n⚡ \`${aftvCode}\`\n🔗 https://aftv.news/${aftvCode}`);
        return;
    }

    if (cmd === '/restore') {
        const ignored = await (await fetch(`${DB_URL()}/troypoint_ignored.json?auth=${token}`)).json() || {};
        if (rest === 'list' || !rest) {
            const list = Object.values(ignored).map(e => `• ${e.name}`).join('\n');
            if (!list) { await tg(chatId, `📂 Nessuna app blacklistata`); return; }
            await tg(chatId, `📂 *App blacklistate (scraper TroyPoint le ignora):*\n\n${list}\n\nPer rimuovere dalla blacklist:\n/restore <nome esatto>`);
            return;
        }
        const targetName = rest.toLowerCase().trim();
        const entry = Object.entries(ignored).find(([, e]) => (e.name || '').toLowerCase().trim() === targetName);
        if (!entry) { await tg(chatId, `❌ "${rest}" non e' nella blacklist. Usa /restore list per vedere`); return; }
        await fetch(`${DB_URL()}/troypoint_ignored/${entry[0]}.json?auth=${token}`, { method: 'DELETE' });
        await tg(chatId, `✅ "${rest}" rimossa dalla blacklist. Sara' ri-aggiunta al prossimo scraping TroyPoint.`);
        return;
    }

    if (cmd === '/list') {
        const n = parseInt(rest) || 10;
        const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}`)).json() || {};
        const list = Object.entries(apps).filter(([,a]) => a.name).map(([k,a]) => ({...a, key: k})).sort((a,b) => (b.timestamp||0) - (a.timestamp||0)).slice(0, n);
        const text = list.length === 0 ? 'Nessuna app' : list.map((a,i) => `${i+1}. *${a.name}*\n   \`${a.code}\` · ${a.category||'?'}`).join('\n\n');
        await tg(chatId, `📱 *Ultime ${list.length} app:*\n\n${text}`);
        return;
    }

    if (cmd === '/find') {
        if (!rest) { await tg(chatId, 'Uso: /find <nome>'); return; }
        const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}`)).json() || {};
        const q = rest.toLowerCase();
        const found = Object.entries(apps).filter(([,a]) => a.name?.toLowerCase().includes(q)).slice(0, 15);
        if (found.length === 0) { await tg(chatId, `🔍 Nessuna app per "${rest}"`); return; }
        const text = found.map(([k,a]) => `*${a.name}*\n  \`${a.code}\` · ${a.category||'?'}\n  key: \`${k}\``).join('\n\n');
        await tg(chatId, `🔍 ${found.length} risultati:\n\n${text}`);
        return;
    }

    if (cmd === '/delete') {
        if (!rest) { await tg(chatId, 'Uso: /delete <code>'); return; }
        const apps = await (await fetch(`${DB_URL()}/apps.json?auth=${token}`)).json() || {};
        const entry = Object.entries(apps).find(([,a]) => a.code === rest || a.name === rest);
        if (!entry) { await tg(chatId, `❌ App non trovata per "${rest}"`); return; }
        const [key, app] = entry;
        await fetch(`${DB_URL()}/apps/${key}.json?auth=${token}`, { method: 'DELETE' });
        await tg(chatId, `🗑️ Eliminata: *${app.name}*`);
        return;
    }

    if (cmd === '/stats') {
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
        await tg(chatId, `📊 *Statistiche*\n\n📱 App: *${Object.keys(apps).length}*\n🔗 Short links: *${Object.keys(shorts).length}*\n📧 Email iscritti: *${Object.keys(subs).length}*\n📲 Telegram iscritti: *${Object.keys(tel).length}*\n⬇️ Click totali: *${totalClicks}*`);
        return;
    }

    await tg(chatId, `Comando sconosciuto. /help`);
}

async function handleDocument(msg, chatId, token) {
    if (!(await isAdmin(chatId, token))) {
        await tg(chatId, `❌ Devi essere admin. Usa /admin <password>`);
        return;
    }
    const doc = msg.document;
    if (!doc.file_name?.toLowerCase().endsWith('.apk')) {
        await tg(chatId, `⚠️ Solo file .apk supportati`);
        return;
    }
    await tg(chatId, `⏳ Sto scaricando *${doc.file_name}* (${(doc.file_size/1024/1024).toFixed(1)}MB)...`);

    try {
        const { buffer } = await downloadTelegramFile(doc.file_id);

        // Parse caption: "nome|desc|categoria" oppure solo nome
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

        await tg(chatId, `🔢 Genero codice aftv.news (se 2captcha configurato)...`);
        const aftvResult = await createAftvCode(directUrl);
        const finalCode = aftvResult.code || code;
        const codeSource = aftvResult.code ? 'aftvnews' : 'internal';

        const addRes = await fetch(`${DB_URL()}/apps.json?auth=${token}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: appName, code: finalCode, desc: desc || '', icon: '', category: category || 'Altro', timestamp: Date.now(), order: -1, internalCode: code, directUrl })
        });
        const addData = await addRes.json();
        const firebaseKey = addData.name;

        if (codeSource === 'aftvnews') {
            await tg(chatId, `✅ *Caricata: ${appName}*\n\n⚡ Codice aftv.news: \`${finalCode}\`\n🔗 https://aftv.news/${finalCode}\n\n📺 Digita questo nel Downloader Fire TV.`);
        } else {
            await tg(chatId, `✅ *Caricata: ${appName}*\n\n🔗 Codice interno: \`${code}\`\nURL: \`${PUBLIC().replace(/^https?:\/\//,'')}/d/${code}\`\n\n⚡ *Per ottenere codice numerico aftv.news:*\n1. Apri https://aftv.news/\n2. Incolla questo link: ${directUrl}\n3. Risolvi captcha → ottieni codice\n4. Mandami: \`/setaftv ${firebaseKey} <codice>\``);
        }
    } catch (e) {
        await tg(chatId, `❌ Errore: ${e.message}`);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).json({ ok: true });
    if (!BOT_TOKEN()) return res.status(200).json({ ok: true });

    try {
        const update = req.body;
        const msg = update?.message;
        if (!msg || !msg.chat) return res.status(200).json({ ok: true });
        const chatId = msg.chat.id;
        const token = await fbAdminToken();

        if (msg.document) {
            await handleDocument(msg, chatId, token);
        } else if (msg.text) {
            await handleCommand(msg.text.trim(), chatId, msg, token);
        }

        return res.status(200).json({ ok: true });
    } catch (e) {
        console.error('Webhook error:', e.message);
        return res.status(200).json({ ok: true });
    }
}
