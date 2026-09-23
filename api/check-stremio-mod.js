import { createAftvCode } from "./utils/aftv.js";
import { notifyAll } from "./utils/notify.js";

async function getAdminToken() {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: process.env.FIREBASE_ADMIN_EMAIL, password: process.env.FIREBASE_ADMIN_PASSWORD, returnSecureToken: true })
    });
    const data = await r.json();
    if (!r.ok || !data.idToken) throw new Error('Firebase authentication failed');
    return data.idToken;
}

const VARIANTS = [
    { tag: 'tv', appName: 'Stremio TV Mod', desc: 'Stremio Mod per Fire TV / Android TV (ARM 32-bit)', category: 'Film & Serie TV', assetMatch: /TV_ARM_/i },
    { tag: 'tv', appName: 'Stremio TV Mod ARM64', desc: 'Stremio Mod per Android TV (ARM 64-bit)', category: 'Film & Serie TV', assetMatch: /TV_ARM64_/i },
    { tag: 'mobile', appName: 'Stremio Mobile Mod', desc: 'Stremio Mod per cellulare (ARM 32-bit)', category: 'Film & Serie TV', assetMatch: /MOBILE_ARM_/i },
    { tag: 'mobile64', appName: 'Stremio Mobile Mod 64bit', desc: 'Stremio Mod per cellulare (ARM 64-bit)', category: 'Film & Serie TV', assetMatch: /MOBILE_ARM64/i }
];

export function newestApk(assets, pattern) {
    return assets.filter(a => pattern.test(a.name) && /\.apk$/i.test(a.name))
        .sort((a, b) => {
            const version = asset => (asset.name.match(/_V([\d.]+)\.apk$/i)?.[1] || '0').split('.').map(Number);
            const av = version(a), bv = version(b);
            for (let i = 0; i < Math.max(av.length, bv.length); i++) {
                const diff = (bv[i] || 0) - (av[i] || 0);
                if (diff) return diff;
            }
            return Date.parse(b.updated_at) - Date.parse(a.updated_at);
        })[0];
}

export default async function handler(req, res) {
    console.log('Check Stremio Mod releases...');
    const dbUrl = process.env.FIREBASE_DATABASE_URL;
    const results = [];

    try {
        const token = await getAdminToken();
        const appsResponse = await fetch(`${dbUrl}/apps.json?auth=${token}`);
        if (!appsResponse.ok) throw new Error('Firebase catalog read failed');
        const apps = await appsResponse.json() || {};

        for (const v of VARIANTS) {
            try {
                const ghHeaders = { 'User-Agent': 'ilcovodinello-bot', 'Accept': 'application/vnd.github+json' };
                if (process.env.GITHUB_TOKEN) ghHeaders['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
                const relRes = await fetch(`https://api.github.com/repos/stremiomod/Stremio_APK/releases/tags/${v.tag}`, { headers: ghHeaders });
                if (!relRes.ok) { results.push({ tag: v.tag, error: `github ${relRes.status}` }); continue; }
                const rel = await relRes.json();
                const asset = newestApk(rel.assets || [], v.assetMatch);
                if (!asset) { results.push({ app: v.appName, skipped: 'architecture not published' }); continue; }
                const apkUrl = asset.browser_download_url;
                const version = asset.name.match(/_V([\d.]+)\.apk$/i)?.[1] || asset.name;
                const fingerprint = asset.digest || `${asset.id}:${asset.updated_at}:${asset.size}`;

                // Trova entry esistente per nome
                const entry = Object.entries(apps).find(([, a]) => a.name && a.name.toLowerCase() === v.appName.toLowerCase());
                const existingCode = entry ? entry[1].code : null;

                // Se gia' presente e URL non e' cambiato, salta
                if (entry && entry[1].directUrl === apkUrl && entry[1].assetFingerprint === fingerprint) {
                    results.push({ tag: v.tag, app: v.appName, skipped: 'already up to date' });
                    continue;
                }

                // Prova a generare codice aftv
                const aftvResult = await createAftvCode(apkUrl);
                let finalCode;
                if (aftvResult.code) {
                    finalCode = aftvResult.code;
                } else if (existingCode && /^\d+$/.test(existingCode) && entry[1].directUrl === apkUrl) {
                    // Reuse a code only when its destination has not changed.
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
                    version,
                    assetFingerprint: fingerprint,
                    icon: 'assets/stremio.png'
                };

                if (entry) {
                    // Update
                    const saved = await fetch(`${dbUrl}/apps/${entry[0]}.json?auth=${token}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (!saved.ok) throw new Error('Firebase update failed');
                    results.push({ tag: v.tag, app: v.appName, updated: true, code: finalCode, aftvSource: aftvResult.code ? 'auto' : (aftvResult.error || 'fallback') });
                    // Baseline migration of unchanged URLs must not resend notifications.
                    if (entry[1].directUrl !== apkUrl || (entry[1].assetFingerprint && entry[1].assetFingerprint !== fingerprint)) {
                        await notifyAll(v.appName, version, apkUrl, data.icon);
                    }
                } else {
                    // New
                    data.order = -1;
                    const saved = await fetch(`${dbUrl}/apps.json?auth=${token}`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (!saved.ok) throw new Error('Firebase creation failed');
                    results.push({ tag: v.tag, app: v.appName, created: true, code: finalCode, aftvSource: aftvResult.code ? 'auto' : (aftvResult.error || 'fallback') });
                    await notifyAll(v.appName, version, apkUrl, data.icon);
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
