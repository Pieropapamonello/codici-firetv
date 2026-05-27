const startTime = Date.now();

export default async function handler(req, res) {
    const dbUrl = process.env.FIREBASE_DATABASE_URL;
    const apiKey = process.env.FIREBASE_API_KEY;

    let appCount = null;
    let dbStatus = 'unknown';

    try {
        const authRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: process.env.FIREBASE_ADMIN_EMAIL, password: process.env.FIREBASE_ADMIN_PASSWORD, returnSecureToken: true }) }
        );
        const authData = await authRes.json();
        if (authData.idToken) {
            const appsRes = await fetch(`${dbUrl}/apps.json?auth=${authData.idToken}&shallow=true`);
            const apps = await appsRes.json();
            appCount = apps ? Object.keys(apps).length : 0;
            dbStatus = 'connected';
        } else {
            dbStatus = 'auth_failed';
        }
    } catch (e) {
        dbStatus = 'error: ' + e.message;
    }

    const uptimeMs = Date.now() - startTime;
    const uptimeH = Math.floor(uptimeMs / 3600000);
    const uptimeM = Math.floor((uptimeMs % 3600000) / 60000);

    res.status(200).json({
        status: 'ok',
        uptime: `${uptimeH}h ${uptimeM}m`,
        uptimeMs,
        database: dbStatus,
        appCount,
        env: {
            firebase: !!process.env.FIREBASE_DATABASE_URL,
            resend: !!process.env.RESEND_API_KEY,
            telegram: !!process.env.TELEGRAM_BOT_TOKEN,
            webshare: !!process.env.WEBSHARE_PROXY_USER
        },
        timestamp: new Date().toISOString()
    });
}
