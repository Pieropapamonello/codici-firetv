import { notifyAll } from "./utils/notify.js";

export default async function handler(req, res) {
    console.log("Avvio controllo aggiornamenti Paramount+ (mobile/tablet)...");

    const dbUrl = process.env.FIREBASE_DATABASE_URL;
    const apiKey = process.env.FIREBASE_API_KEY;
    const adminEmail = process.env.FIREBASE_ADMIN_EMAIL;
    const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD;

    try {
        // 1. Recupera la versione da Uptodown
        const response = await fetch('https://com-cbs-ott.en.uptodown.com/android');
        const html = await response.text();

        const versionMatch = html.match(/"softwareVersion":"([^"]+)"/) || html.match(/<span class="version">([^<]+)<\/span>/);
        if (!versionMatch) {
            return res.status(500).json({ error: 'Impossibile trovare la versione di Paramount+ su Uptodown.' });
        }

        const version = versionMatch[1];
        const appName = `Paramount+ ${version} US TV`;
        const downloadUrl = `/api/download-paramount`;
        console.log(`Versione trovata su Uptodown: ${version}`);

        // 2. Autentica su Firebase REST API
        const authResponse = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: adminEmail, password: adminPassword, returnSecureToken: true })
            }
        );
        const authData = await authResponse.json();
        if (!authResponse.ok || !authData.idToken) {
            return res.status(500).json({ error: 'Errore autenticazione Firebase' });
        }
        const token = authData.idToken;

        // 3. Leggi il DB e trova la scheda mobile (esclude Android TV)
        const appsRes = await fetch(`${dbUrl}/apps.json?auth=${token}`);
        const apps = await appsRes.json();

        let existingKey = null;
        let existingApp = null;
        if (apps) {
            for (const [key, app] of Object.entries(apps)) {
                if (app.name?.startsWith("Paramount+") && !app.name?.includes("Android TV")) {
                    existingKey = key;
                    existingApp = app;
                    break;
                }
            }
        }

        const newAppData = {
            name: appName,
            code: downloadUrl,
            desc: `Versione ${version} — Solo cellulare/tablet`,
            icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Paramount_Plus.svg/512px-Paramount_Plus.svg.png",
            category: "Streaming",
            timestamp: Date.now()
        };

        if (!existingKey) {
            // Aggiunge nuova scheda mobile
            await fetch(`${dbUrl}/apps.json?auth=${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAppData)
            });
            console.log('Scheda mobile Paramount+ aggiunta!');
            await notifyAll(appName, version, `https://${req.headers.host}${downloadUrl}`);
            return res.status(200).json({ success: true, message: `Aggiunta nuova versione: ${version}` });

        } else if (existingApp.name !== appName || existingApp.code !== downloadUrl || existingApp.desc !== newAppData.desc) {
            // Aggiorna scheda esistente
            await fetch(`${dbUrl}/apps/${existingKey}.json?auth=${token}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAppData)
            });
            console.log(`Scheda mobile Paramount+ aggiornata a ${version}`);
            await notifyAll(appName, version, `https://${req.headers.host}${downloadUrl}`);
            return res.status(200).json({ success: true, message: `Aggiornata versione: ${version}` });

        } else {
            return res.status(200).json({ success: true, message: `Nessun aggiornamento. Versione attuale: ${version}` });
        }

    } catch (error) {
        console.error("Errore check Paramount+ mobile:", error.message);
        return res.status(500).json({ error: error.message });
    }
}
