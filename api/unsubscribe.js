export default async function handler(req, res) {
    const email = req.query?.email || req.body?.email;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ error: 'Email non valida' });
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
        if (!authData.idToken) {
            return res.status(500).json({ error: 'Errore interno' });
        }
        const token = authData.idToken;

        const emailKey = email.replace(/\./g, ',').replace(/@/g, '__at__');
        const checkRes = await fetch(`${dbUrl}/subscribers/${emailKey}.json?auth=${token}`);
        const sub = await checkRes.json();

        if (!sub || !sub.email) {
            return res.status(404).json({ error: 'Email non trovata tra gli iscritti' });
        }

        await fetch(`${dbUrl}/subscribers/${emailKey}.json?auth=${token}`, { method: 'DELETE' });

        const accept = req.headers?.accept || '';
        if (accept.includes('text/html') || req.method === 'GET') {
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(`
                <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
                <title>Disiscrizione</title>
                <style>body{font-family:Inter,sans-serif;background:#0a0a0f;color:#f0f0f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
                .box{text-align:center;padding:40px;border-radius:24px;background:rgba(15,15,25,0.8);border:1px solid rgba(168,85,247,0.3);max-width:400px;}
                h2{color:#a855f7;} a{color:#22d3ee;}</style></head>
                <body><div class="box"><h2>Disiscrizione completata</h2><p>${email} e' stata rimossa dalle notifiche.</p><p><a href="/">Torna al sito</a></p></div></body></html>
            `);
        }

        return res.status(200).json({ success: true, message: 'Disiscrizione completata' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
