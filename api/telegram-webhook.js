export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).json({ ok: true });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return res.status(200).json({ ok: true });

    const dbUrl = process.env.FIREBASE_DATABASE_URL;
    const apiKey = process.env.FIREBASE_API_KEY;

    try {
        const update = req.body;
        const message = update?.message;
        if (!message || !message.chat) return res.status(200).json({ ok: true });

        const chatId = message.chat.id;
        const text = (message.text || '').trim();
        const firstName = message.from?.first_name || 'Utente';

        const authRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: process.env.FIREBASE_ADMIN_EMAIL, password: process.env.FIREBASE_ADMIN_PASSWORD, returnSecureToken: true }) }
        );
        const authData = await authRes.json();
        if (!authData.idToken) return res.status(200).json({ ok: true });
        const token = authData.idToken;

        async function sendTg(chatId, text, opts = {}) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', ...opts })
            });
        }

        if (text === '/start') {
            await fetch(`${dbUrl}/telegram_users/${chatId}.json?auth=${token}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId,
                    firstName,
                    username: message.from?.username || null,
                    apps: ['all'],
                    joinedAt: Date.now()
                })
            });

            await sendTg(chatId,
                `🎉 *Benvenuto ${firstName}!*\n\n` +
                `Sei iscritto alle notifiche de *Il Covo di Nello*.\n` +
                `Riceverai aggiornamenti per tutte le app.\n\n` +
                `Comandi:\n` +
                `/status — Vedi la tua iscrizione\n` +
                `/stop — Disiscriviti\n` +
                `/apps — Lista app disponibili`
            );

        } else if (text === '/stop') {
            await fetch(`${dbUrl}/telegram_users/${chatId}.json?auth=${token}`, { method: 'DELETE' });
            await sendTg(chatId, `👋 Disiscritto con successo. Usa /start per re-iscriverti.`);

        } else if (text === '/status') {
            const subRes = await fetch(`${dbUrl}/telegram_users/${chatId}.json?auth=${token}`);
            const sub = await subRes.json();
            if (sub) {
                const apps = sub.apps?.includes('all') ? 'Tutte le app' : (sub.apps || []).join(', ');
                await sendTg(chatId, `✅ *Iscritto*\nApp monitorate: ${apps}`);
            } else {
                await sendTg(chatId, `❌ Non sei iscritto. Usa /start per iscriverti.`);
            }

        } else if (text === '/apps') {
            const appsRes = await fetch(`${dbUrl}/apps.json?auth=${token}&shallow=true`);
            const apps = await appsRes.json();
            const count = apps ? Object.keys(apps).length : 0;
            await sendTg(chatId, `📱 Ci sono *${count} app* nel catalogo.\n\n🌐 Visita il sito per vederle tutte.`);

        } else {
            await sendTg(chatId, `Usa /start per iscriverti o /stop per disiscriverti.`);
        }

        return res.status(200).json({ ok: true });
    } catch (e) {
        console.error('Telegram webhook error:', e.message);
        return res.status(200).json({ ok: true });
    }
}
