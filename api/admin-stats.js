import { checkTelegramSession } from "./telegram-auth.js";

export default async function handler(req, res) {
    const dbUrl = process.env.FIREBASE_DATABASE_URL;
    const apiKey = process.env.FIREBASE_API_KEY;

    const authHeader = req.headers?.authorization || '';
    const userToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!userToken) return res.status(401).json({ error: 'Token mancante' });

    try {
        // Try Telegram session first
        const sess = await checkTelegramSession(req);
        if (!sess || !sess.isAdmin) {
            // Fallback Firebase token
            const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: userToken })
            });
            const verifyData = await verifyRes.json();
            if (!verifyData.users || verifyData.users.length === 0) return res.status(401).json({ error: 'Token non valido' });
        }

        // Usa il token admin per leggere il DB
        const authRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: process.env.FIREBASE_ADMIN_EMAIL, password: process.env.FIREBASE_ADMIN_PASSWORD, returnSecureToken: true }) }
        );
        const adminAuth = await authRes.json();
        if (!adminAuth.idToken) return res.status(500).json({ error: 'Auth fallita' });
        const adminToken = adminAuth.idToken;

        // Fetch dati in parallelo
        const [appsR, subsR, telegramR] = await Promise.all([
            fetch(`${dbUrl}/apps.json?auth=${adminToken}`),
            fetch(`${dbUrl}/subscribers.json?auth=${adminToken}&shallow=true`),
            fetch(`${dbUrl}/telegram_users.json?auth=${adminToken}&shallow=true`)
        ]);

        const apps = (await appsR.json()) || {};
        const subs = (await subsR.json()) || {};
        const telegram = (await telegramR.json()) || {};

        const appsArr = Object.entries(apps)
            .filter(([, a]) => a.name)
            .map(([key, a]) => ({ key, ...a }));

        // Top 10 cliccate
        const topClicked = [...appsArr]
            .filter(a => (a.clicks || 0) > 0)
            .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
            .slice(0, 10)
            .map(a => ({ name: a.name, clicks: a.clicks || 0, category: a.category }));

        // App aggiunte ultima settimana
        const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
        const newApps = appsArr
            .filter(a => a.timestamp && a.timestamp > weekAgo)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10)
            .map(a => ({ name: a.name, timestamp: a.timestamp, category: a.category }));

        // Categorie
        const categoryCounts = {};
        appsArr.forEach(a => {
            const cat = a.category || 'Altro';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        // Click totali
        const totalClicks = appsArr.reduce((s, a) => s + (a.clicks || 0), 0);

        return res.status(200).json({
            success: true,
            totals: {
                apps: appsArr.length,
                emailSubscribers: Object.keys(subs).length,
                telegramSubscribers: Object.keys(telegram).length,
                totalClicks
            },
            topClicked,
            newApps,
            categoryCounts,
            generatedAt: new Date().toISOString()
        });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
