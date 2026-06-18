import { uploadToDropbox } from "./utils/dropbox.js";

async function verifyAdminToken(req) {
    const apiKey = process.env.FIREBASE_API_KEY;
    const auth = (req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
    if (!auth) return null;
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: auth })
    });
    const d = await r.json();
    return d.users?.[0] || null;
}

async function getAdminToken() {
    const apiKey = process.env.FIREBASE_API_KEY;
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: process.env.FIREBASE_ADMIN_EMAIL, password: process.env.FIREBASE_ADMIN_PASSWORD, returnSecureToken: true })
    });
    const d = await r.json();
    return d.idToken;
}

function genShortCode(len = 5) {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

    const user = await verifyAdminToken(req);
    if (!user) return res.status(401).json({ error: 'Non autorizzato' });

    try {
        const { fileBase64, filename, name, desc, category, icon } = req.body;
        if (!fileBase64 || !filename || !name) {
            return res.status(400).json({ error: 'fileBase64, filename, name richiesti' });
        }

        const safeName = filename.replace(/[^\w.\-]/g, '_');
        const buffer = Buffer.from(fileBase64, 'base64');
        if (buffer.length > 150 * 1024 * 1024) {
            return res.status(413).json({ error: 'File troppo grande (max 150 MB)' });
        }

        const { directUrl, shareUrl, dropboxPath } = await uploadToDropbox(safeName, buffer);

        const dbUrl = process.env.FIREBASE_DATABASE_URL;
        const adminToken = await getAdminToken();

        let code, exists = true, attempts = 0;
        while (exists && attempts < 8) {
            code = genShortCode();
            const r = await fetch(`${dbUrl}/short_links/${code}.json?auth=${adminToken}`);
            const d = await r.json();
            exists = !!d;
            attempts++;
        }
        if (!code) return res.status(500).json({ error: 'Impossibile generare codice univoco' });

        await fetch(`${dbUrl}/short_links/${code}.json?auth=${adminToken}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: directUrl, shareUrl, dropboxPath, createdAt: Date.now(), clicks: 0, appName: name })
        });

        const appData = {
            name,
            code,
            desc: desc || '',
            icon: icon || '',
            category: category || 'Altro',
            timestamp: Date.now(),
            order: -1
        };
        const addRes = await fetch(`${dbUrl}/apps.json?auth=${adminToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appData)
        });
        const addData = await addRes.json();

        return res.status(200).json({
            success: true,
            code,
            shortUrl: `${process.env.PUBLIC_URL || 'https://ilcovodinello.onrender.com'}/d/${code}`,
            directUrl,
            firebaseKey: addData.name
        });
    } catch (e) {
        console.error('Upload APK error:', e.message);
        return res.status(500).json({ error: e.message });
    }
}
