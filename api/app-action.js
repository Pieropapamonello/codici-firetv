export default async function handler(req, res) {
    const email = req.query?.email || req.body?.email;
    const app = req.query?.app || req.body?.app;
    const action = req.query?.action || req.body?.action;
    if (!email || !app || !action) return res.status(400).send('Parametri mancanti');

    const dbUrl = process.env.FIREBASE_DATABASE_URL;
    const apiKey = process.env.FIREBASE_API_KEY;

    try {
        const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: process.env.FIREBASE_ADMIN_EMAIL, password: process.env.FIREBASE_ADMIN_PASSWORD, returnSecureToken: true })
        });
        const token = (await authRes.json()).idToken;
        const emailKey = email.replace(/\./g, ',').replace(/@/g, '__at__');

        const sub = await (await fetch(`${dbUrl}/subscribers/${emailKey}.json?auth=${token}`)).json();
        if (!sub) return res.status(404).send('Email non iscritta');

        if (action === 'mute') {
            let apps = sub.apps || [];
            if (apps.includes('all')) {
                // espandi 'all' alle app correnti meno questa
                const all = await (await fetch(`${dbUrl}/apps.json?auth=${token}`)).json() || {};
                apps = Object.values(all).map(a => a.name).filter(n => n && n.toLowerCase() !== app.toLowerCase());
            } else {
                apps = apps.filter(a => a.toLowerCase() !== app.toLowerCase());
            }
            await fetch(`${dbUrl}/subscribers/${emailKey}/apps.json?auth=${token}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apps)
            });
        } else {
            return res.status(400).send('Azione non valida');
        }

        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(`
            <!DOCTYPE html><html><head><meta charset="utf-8"><title>Aggiornato</title>
            <style>body{font-family:Inter,sans-serif;background:#0a0a0f;color:#f0f0f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
            .box{text-align:center;padding:40px;border-radius:24px;background:rgba(15,15,25,0.8);border:1px solid rgba(168,85,247,0.3);max-width:420px;}
            h2{color:#a855f7;} a{color:#22d3ee;}</style></head>
            <body><div class="box"><h2>🔕 Mute applicato</h2><p>Non riceverai piu' notifiche per <strong>${app}</strong>.</p><p><a href="/">Torna al sito</a></p></div></body></html>
        `);
    } catch (e) {
        return res.status(500).send('Errore: ' + e.message);
    }
}
