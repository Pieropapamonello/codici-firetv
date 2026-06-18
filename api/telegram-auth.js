import crypto from 'crypto';

async function adminToken() {
    const apiKey = process.env.FIREBASE_API_KEY;
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: process.env.FIREBASE_ADMIN_EMAIL, password: process.env.FIREBASE_ADMIN_PASSWORD, returnSecureToken: true })
    });
    return (await r.json()).idToken;
}

// Verifica initData secondo specifica Telegram WebApp
function verifyTelegramInitData(initData, botToken) {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return null;
    urlParams.delete('hash');

    const dataCheckArr = [];
    for (const [k, v] of [...urlParams.entries()].sort()) dataCheckArr.push(`${k}=${v}`);
    const dataCheckString = dataCheckArr.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calcHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (calcHash !== hash) return null;

    // Check auth_date freshness (24h)
    const authDate = parseInt(urlParams.get('auth_date') || '0');
    if (Date.now() / 1000 - authDate > 86400) return null;

    try { return JSON.parse(urlParams.get('user') || '{}'); }
    catch { return null; }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: 'initData mancante' });

    const user = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
    if (!user || !user.id) return res.status(401).json({ error: 'initData non valido' });

    try {
        const tk = await adminToken();
        const dbUrl = process.env.FIREBASE_DATABASE_URL;
        const adminEntry = await (await fetch(`${dbUrl}/telegram_admins/${user.id}.json?auth=${tk}`)).json();
        const isAdmin = !!adminEntry;

        // Crea session ID per uso lato client
        const sessionId = crypto.randomBytes(24).toString('hex');
        await fetch(`${dbUrl}/telegram_sessions/${sessionId}.json?auth=${tk}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, firstName: user.first_name, isAdmin, createdAt: Date.now(), expiresAt: Date.now() + 4 * 3600 * 1000 })
        });

        return res.status(200).json({ success: true, sessionId, user: { id: user.id, firstName: user.first_name, username: user.username }, isAdmin });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}

// Helper esportato — verifica se Bearer e' una sessione Telegram valida
export async function checkTelegramSession(req) {
    const auth = (req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
    if (!auth || !/^[a-f0-9]{48}$/i.test(auth)) return null;
    try {
        const tk = await adminToken();
        const sess = await (await fetch(`${process.env.FIREBASE_DATABASE_URL}/telegram_sessions/${auth}.json?auth=${tk}`)).json();
        if (!sess || Date.now() > sess.expiresAt) return null;
        return sess;
    } catch { return null; }
}
