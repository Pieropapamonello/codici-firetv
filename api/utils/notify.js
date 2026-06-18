import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

export async function sendTelegramNotification(appName, version, downloadUrl, iconUrl) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        console.log("TELEGRAM_BOT_TOKEN mancante. Salto notifiche Telegram.");
        return;
    }

    const message = `🚀 *Nuovo Aggiornamento Disponibile!*\n\n📱 *App:* ${appName}\n🔄 *Versione:* ${version}\n\n📥 [Scarica Subito](${downloadUrl})`;

    try {
        const firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            databaseURL: process.env.FIREBASE_DATABASE_URL,
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.FIREBASE_APP_ID
        };
        const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        const db = getDatabase(app);
        const auth = getAuth(app);
        await signInWithEmailAndPassword(auth, process.env.FIREBASE_ADMIN_EMAIL, process.env.FIREBASE_ADMIN_PASSWORD);

        const snapshot = await get(ref(db, 'telegram_users'));
        if (!snapshot.exists()) {
            console.log("Nessun utente Telegram registrato.");
            return;
        }

        const users = snapshot.val();
        const appNameLower = appName.toLowerCase();
        const appBaseName = appNameLower.split(' ')[0];
        let sent = 0;

        for (const [chatId, user] of Object.entries(users)) {
            if (!user.apps) continue;
            const match = user.apps.includes('all') || user.apps.some(a => {
                const aLower = a.toLowerCase();
                return aLower === appNameLower || (aLower.split(' ')[0] === appBaseName && appBaseName.length > 2);
            });
            if (!match) continue;

            try {
                const inlineKb = {
                    inline_keyboard: [[
                        { text: '📥 Scarica', url: downloadUrl },
                        { text: '🔕 Mute questa app', callback_data: `mute:${encodeURIComponent(appName).substring(0, 50)}` }
                    ]]
                };
                const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown', disable_web_page_preview: true, reply_markup: inlineKb })
                });
                if (res.ok) sent++;
            } catch (_) {}
        }
        console.log(`Notifiche Telegram inviate: ${sent}/${Object.keys(users).length}`);
    } catch (error) {
        console.error("Errore Telegram:", error.message);
    }
}

// Funzione per inviare notifiche Email (tramite Resend)
export async function sendEmailNotification(appName, version, downloadUrl, iconUrl) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const senderEmail = process.env.RESEND_SENDER_EMAIL;

    if (!resendApiKey) {
        console.log("Chiave API Resend mancante. Salto la notifica Email.");
        return;
    }

    try {
        // 1. Recupera gli iscritti da Firebase
        const firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            databaseURL: process.env.FIREBASE_DATABASE_URL,
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.FIREBASE_APP_ID
        };

        // Riusa l'app Firebase già inizializzata se presente (evita duplicate-app in serverless)
        const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        const db = getDatabase(app);
        const auth = getAuth(app);

        await signInWithEmailAndPassword(auth, process.env.FIREBASE_ADMIN_EMAIL, process.env.FIREBASE_ADMIN_PASSWORD);

        const subscribersRef = ref(db, 'subscribers');
        const snapshot = await get(subscribersRef);

        if (!snapshot.exists()) {
            console.log("Nessun iscritto alla newsletter trovato.");
            return;
        }

        const subscribers = snapshot.val();
        
        // Filtra chi è iscritto a 'all' o specificamente a questa app
        const appNameLower = appName.toLowerCase();
        // Estratto il nome base dell'app (es. "stremio" da "Stremio 1.9.8 ARM TV")
        const appBaseName = appNameLower.split(' ')[0];
        const emails = Object.values(subscribers)
            .filter(sub => {
                if (!sub.apps || sub.apps.includes('all')) return true; // vecchi iscritti + "tutte"
                return sub.apps.some(a => {
                    const aLower = a.toLowerCase();
                    // Match esatto
                    if (aLower === appNameLower) return true;
                    // Match per nome base (es. "stremio" matcha qualsiasi versione di Stremio)
                    const subBaseName = aLower.split(' ')[0];
                    return subBaseName === appBaseName && appBaseName.length > 2;
                });
            })
            .map(sub => sub.email);

        if (emails.length === 0) return;

        function buildHtml(recipientEmail) {
            const base = process.env.PUBLIC_URL || 'https://ilcovodinello.onrender.com';
            const unsub = `${base}/api/unsubscribe?email=${encodeURIComponent(recipientEmail)}`;
            const mute = `${base}/api/app-action?email=${encodeURIComponent(recipientEmail)}&app=${encodeURIComponent(appName)}&action=mute`;
            return `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #a855f7; text-align: center;">Nuovo Aggiornamento Disponibile!</h2>
                    <div style="text-align: center; margin: 20px 0;">
                        ${iconUrl ? `<img src="${iconUrl}" alt="${appName}" style="width: 80px; height: 80px; border-radius: 15px;">` : ''}
                    </div>
                    <p style="font-size: 16px;">È appena stata rilasciata una nuova versione per <strong>${appName}</strong>.</p>
                    <p style="font-size: 16px;"><strong>Versione:</strong> ${version}</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${downloadUrl}" style="background-color: #a855f7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Scarica Subito</a>
                    </div>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px; text-align: center;">Ricevi questa email perché ti sei iscritto alle notifiche sul nostro sito.<br>
                    <a href="${mute}" style="color: #6b7280; margin-right:14px;">🔕 Non mostrarmi piu' ${appName}</a>
                    <a href="${unsub}" style="color: #a855f7;">Disiscriviti da tutto</a></p>
                </div>
            `;
        }

        // Invia email individuali (serve per link disiscriviti personalizzato)
        let sent = 0;
        for (const email of emails) {
            try {
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: `FireTV Updates <${senderEmail}>`,
                        to: email,
                        subject: `🚀 Nuovo Aggiornamento: ${appName} v${version}`,
                        html: buildHtml(email)
                    })
                });
                if (response.ok) sent++;
                else console.error(`Email failed for ${email}:`, await response.text());
            } catch (e) {
                console.error(`Email error for ${email}:`, e.message);
            }
        }
        console.log(`Notifiche Email inviate: ${sent}/${emails.length}`);

    } catch (error) {
        console.error("Errore durante l'invio delle email:", error);
    }
}

// Funzione principale che chiama entrambe
export async function notifyAll(appName, version, downloadUrl, iconUrl) {
    await Promise.all([
        sendTelegramNotification(appName, version, downloadUrl, iconUrl),
        sendEmailNotification(appName, version, downloadUrl, iconUrl)
    ]);
}
