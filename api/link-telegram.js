export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });
    const { email, telegramChatId } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Email non valida' });
    if (!/^\d{5,15}$/.test(String(telegramChatId))) return res.status(400).json({ error: 'Chat ID non valido' });

    const dbUrl = process.env.FIREBASE_DATABASE_URL;
    const apiKey = process.env.FIREBASE_API_KEY;

    try {
        const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: process.env.FIREBASE_ADMIN_EMAIL, password: process.env.FIREBASE_ADMIN_PASSWORD, returnSecureToken: true })
        });
        const authData = await authRes.json();
        if (!authData.idToken) return res.status(500).json({ error: 'Auth fallita' });
        const token = authData.idToken;

        // Verifica che il Telegram user esista
        const tgRes = await fetch(`${dbUrl}/telegram_users/${telegramChatId}.json?auth=${token}`);
        const tgUser = await tgRes.json();
        if (!tgUser) return res.status(404).json({ error: 'Telegram non iscritto. Manda /start a @nellofirebot prima' });

        // Verifica che la mail subscriber esista
        const emailKey = email.replace(/\./g, ',').replace(/@/g, '__at__');
        const subRes = await fetch(`${dbUrl}/subscribers/${emailKey}.json?auth=${token}`);
        const sub = await subRes.json();
        if (!sub) return res.status(404).json({ error: 'Email non iscritta. Iscriviti dal modal notifiche prima' });

        // Salva il link sui due record
        await fetch(`${dbUrl}/subscribers/${emailKey}.json?auth=${token}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramChatId: parseInt(telegramChatId) })
        });
        await fetch(`${dbUrl}/telegram_users/${telegramChatId}.json?auth=${token}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ linkedEmail: email })
        });

        return res.status(200).json({ success: true });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
