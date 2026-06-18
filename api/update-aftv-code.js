// Aggiorna il codice di un'app con quello creato manualmente su aftv.news

import { checkTelegramSession } from "./telegram-auth.js";

async function verifyAdminToken(req) {
    const apiKey = process.env.FIREBASE_API_KEY;
    const auth = (req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
    if (!auth) return null;
    const sess = await checkTelegramSession(req);
    if (sess && sess.isAdmin) return { telegramUser: sess.userId };
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });
    if (!await verifyAdminToken(req)) return res.status(401).json({ error: 'Non autorizzato' });

    const { firebaseKey, aftvCode } = req.body;
    if (!firebaseKey || !aftvCode) return res.status(400).json({ error: 'firebaseKey e aftvCode richiesti' });
    if (!/^\d{3,10}$/.test(aftvCode)) return res.status(400).json({ error: 'aftvCode deve essere numerico (3-10 cifre)' });

    try {
        const dbUrl = process.env.FIREBASE_DATABASE_URL;
        const token = await getAdminToken();

        const appRes = await fetch(`${dbUrl}/apps/${firebaseKey}.json?auth=${token}`);
        const app = await appRes.json();
        if (!app) return res.status(404).json({ error: 'App non trovata' });

        await fetch(`${dbUrl}/apps/${firebaseKey}.json?auth=${token}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: aftvCode })
        });

        return res.status(200).json({
            success: true,
            aftvCode,
            shortUrl: `https://aftv.news/${aftvCode}`
        });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
