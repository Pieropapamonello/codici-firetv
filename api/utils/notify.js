import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// Funzione per inviare notifiche Telegram
export async function sendTelegramNotification(appName, version, downloadUrl, iconUrl) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        console.log("Credenziali Telegram mancanti. Salto la notifica Telegram.");
        return;
    }

    const message = `🚀 *Nuovo Aggiornamento Disponibile!*\n\n📱 *App:* ${appName}\n🔄 *Versione:* ${version}\n\n📥 [Scarica Subito](${downloadUrl})`;

    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            })
        });

        if (!response.ok) {
            console.error("Errore invio Telegram:", await response.text());
        } else {
            console.log("Notifica Telegram inviata con successo!");
        }
    } catch (error) {
        console.error("Errore di rete Telegram:", error);
    }
}

// Funzione per inviare notifiche Email (tramite Resend)
export async function sendEmailNotification(appName, version, downloadUrl, iconUrl) {
    const resendApiKey = process.env.RESEND_API_KEY || "re_W7vEFbU5_5k9sRmtoPU2zFae9Yg1e2YF2";
    const senderEmail = process.env.RESEND_SENDER_EMAIL || "onboarding@resend.dev"; // Sostituisci con la tua email verificata su Resend

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

        const emailPayload = {
            from: `FireTV Updates <${senderEmail}>`,
            to: emails[0], // Resend richiede almeno un 'to', mettiamo il primo
            subject: `🚀 Nuovo Aggiornamento: ${appName} v${version}`,
            html: `
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
                    <p style="color: #666; font-size: 12px; text-align: center;">Ricevi questa email perché ti sei iscritto alle notifiche sul nostro sito.</p>
                </div>
            `
        };

        if (emails.length > 1) {
            emailPayload.bcc = emails.slice(1); // Gli altri in copia nascosta
        }

        // 2. Invia l'email a tutti gli iscritti (usando Bcc per privacy)
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailPayload)
        });

        if (!response.ok) {
            console.error("Errore invio Email (Resend):", await response.text());
        } else {
            console.log(`Notifica Email inviata con successo a ${emails.length} iscritti!`);
        }

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
