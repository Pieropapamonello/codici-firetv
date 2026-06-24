import { createAftvCode } from "./utils/aftv.js";
import { notifyAll } from "./utils/notify.js";

async function getAdminToken() {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: process.env.FIREBASE_ADMIN_EMAIL, password: process.env.FIREBASE_ADMIN_PASSWORD, returnSecureToken: true })
    });
    return (await r.json()).idToken;
}

const VARIANTS = [
    { tag: 'tv', appName: 'Stremio TV Mod', desc: 'Stremio Mod per Fire TV / Android TV (ARM)', category: 'Film & Serie TV', assetMatch: /TV_ARM/i },
    { tag: 'mobile', appName: 'Stremio Mobile Mod', desc: 'Stremio Mod per cellulare (ARM 32-bit)', category: 'Film & Serie TV', assetMatch: /MOBILE_ARM_/i },
    { tag: 'mobile64', appName: 'Stremio Mobile Mod 64bit', desc: 'Stremio Mod per cellulare (ARM 64-bit)', category: 'Film & Serie TV', assetMatch: /MOBILE_ARM64/i }
];

export default async function handler(req, res) {
    console.log('Check Stremio Mod releases...');
    const dbUrl = process.env.FIREBASE_DATABASE_URL;
    const token = await getAdminToken();
    const results = [];

    try {
        const apps = await (await fetch(`${dbUrl}/apps.json?auth=${token}`)).json() || {};

        for (const v of VARIANTS) {
            try {
                const ghHeaders = { 'User-Agent': 'ilcovodinello-bot', 'Accept': 'application/vnd.github+json' };
                if (process.env.GITHUB_TOKEN) ghHeaders['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
                const relRes = await fetch(`https://api.github.com/repos/stremiomod/Stremio_APK/releases/tags/${v.tag}`, { headers: ghHeaders });
                if (!relRes.ok) { results.push({ tag: v.tag, error: `github ${relRes.status}` }); continue; }
                const rel = await relRes.json();
                const asset = (rel.assets || []).find(a => v.assetMatch.test(a.name) && a.name.endsWith('.apk'));
                if (!asset) { results.push({ tag: v.tag, error: 'no apk asset' }); continue; }
                const apkUrl = asset.browser_download_url;

                // Trova entry esistente per nome
                const entry = Object.entries(apps).find(([, a]) => a.name && a.name.toLowerCase() === v.appName.toLowerCase());
                const existingCode = entry ? entry[1].code : null;

                // Se gia' presente e URL non e' cambiato, salta
                if (entry && entry[1].directUrl === apkUrl) {
                    results.push({ tag: v.tag, app: v.appName, skipped: 'already up to date' });
                    continue;
                }

                // Prova a generare codice aftv
                const aftvResult = await createAftvCode(apkUrl);
                let finalCode;
                if (aftvResult.code) {
                    finalCode = aftvResult.code;
                } else if (existingCode && /^\d+$/.test(existingCode)) {
                    // Tieni il vecchio codice aftvnews se esiste (anche se ora punta a URL vecchio)
                    finalCode = existingCode;
                } else {
                    finalCode = apkUrl; // URL diretto come fallback
                }

                const data = {
                    name: v.appName,
                    code: finalCode,
                    desc: v.desc,
                    category: v.category,
                    timestamp: Date.now(),
                    directUrl: apkUrl,
                    icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Stremio_Icon.svg/512px-Stremio_Icon.svg.png'
                };

                if (entry) {
                    // Update
                    await fetch(`${dbUrl}/apps/${entry[0]}.json?auth=${token}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    results.push({ tag: v.tag, app: v.appName, updated: true, code: finalCode, aftvSource: aftvResult.code ? 'auto' : (aftvResult.error || 'fallback') });
                    await notifyAll(v.appName, rel.tag_name, apkUrl, data.icon);
                } else {
                    // New
                    data.order = -1;
                    await fetch(`${dbUrl}/apps.json?auth=${token}`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    results.push({ tag: v.tag, app: v.appName, created: true, code: finalCode, aftvSource: aftvResult.code ? 'auto' : (aftvResult.error || 'fallback') });
                    await notifyAll(v.appName, rel.tag_name, apkUrl, data.icon);
                }
            } catch (e) {
                results.push({ tag: v.tag, error: e.message });
            }
        }

        return res.status(200).json({ success: true, results });
    } catch (error) {
        console.error('Stremio Mod check error:', error);
        return res.status(500).json({ error: error.message, results });
    }
}
