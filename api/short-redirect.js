export default async function handler(req, res) {
    const code = req.params?.code || req.query?.code;
    if (!code || !/^[a-z0-9]{3,12}$/i.test(code)) {
        return res.status(400).send('Codice non valido');
    }

    const dbUrl = process.env.FIREBASE_DATABASE_URL;
    const apiKey = process.env.FIREBASE_API_KEY;

    try {
        const authRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: process.env.FIREBASE_ADMIN_EMAIL, password: process.env.FIREBASE_ADMIN_PASSWORD, returnSecureToken: true }) }
        );
        const authData = await authRes.json();
        if (!authData.idToken) return res.status(500).send('Errore server');
        const token = authData.idToken;

        const r = await fetch(`${dbUrl}/short_links/${code}.json?auth=${token}`);
        const data = await r.json();
        if (!data || !data.url) {
            return res.status(404).send(`
                <html><head><meta charset="utf-8"><title>Link non trovato</title>
                <style>body{font-family:sans-serif;background:#0a0a0f;color:#f0f0f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
                .box{text-align:center;padding:40px;border-radius:24px;background:rgba(15,15,25,0.8);border:1px solid rgba(168,85,247,0.3);}
                h2{color:#ef4444;} a{color:#22d3ee;}</style></head>
                <body><div class="box"><h2>Link non trovato</h2><p>Il codice <strong>${code}</strong> non esiste o e' stato rimosso.</p><p><a href="/">Torna al sito</a></p></div></body></html>
            `);
        }

        // Async click tracking + auto-subscribe per Telegram users (non-blocking)
        fetch(`${dbUrl}/short_links/${code}/clicks.json?auth=${token}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify((data.clicks || 0) + 1)
        }).catch(() => {});

        // Se richiesta da un Telegram user (header X-TG-Chat-Id), auto-iscrivilo all'app
        const tgChat = req.headers?.['x-tg-chat-id'];
        if (tgChat && data.appName) {
            fetch(`${dbUrl}/telegram_users/${tgChat}.json?auth=${token}`).then(r => r.json()).then(user => {
                if (user && user.chatId) {
                    const apps = user.apps || [];
                    if (!apps.includes('all') && !apps.includes(data.appName)) {
                        apps.push(data.appName);
                        fetch(`${dbUrl}/telegram_users/${tgChat}/apps.json?auth=${token}`, {
                            method: 'PUT', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(apps)
                        }).catch(() => {});
                    }
                }
            }).catch(() => {});
        }

        return res.redirect(302, data.url);
    } catch (e) {
        console.error('Short redirect error:', e.message);
        return res.status(500).send('Errore server');
    }
}
