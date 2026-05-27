import { notifyAll } from "./utils/notify.js";

export default async function handler(req, res) {
    console.log("Avvio controllo aggiornamenti Paramount+ US (Fire TV)...");

    const headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS reader)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    };

    const dbUrl = process.env.FIREBASE_DATABASE_URL;
    const apiKey = process.env.FIREBASE_API_KEY;
    const adminEmail = process.env.FIREBASE_ADMIN_EMAIL;
    const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD;

    try {
        // 1. Leggi RSS APKMirror per Paramount+ US (com.cbs.app - versione americana, compatibile Fire TV)
        const rssRes = await fetch('https://www.apkmirror.com/apk/cbs-interactive-inc/paramount/feed/', { headers });
        const rssText = await rssRes.text();

        const titleMatch = rssText.match(/<title>Paramount\+\s*([\d.]+)[^<]*<\/title>/);
        const slugMatch = rssText.match(/<link>https:\/\/www\.apkmirror\.com\/apk\/cbs-interactive-inc\/paramount\/(paramount-[\d-]+-release)\/<\/link>/);

        if (!titleMatch) {
            return res.status(500).json({ error: 'Impossibile trovare la versione Paramount+ US nel feed RSS.' });
        }

        const version = titleMatch[1];
        // Usa sempre l'endpoint API che gestisce il download via proxy (got-scraping + Webshare)
        const downloadUrlApk    = `/api/download-paramount?tv=us&type=apk`;
        const downloadUrlBundle = `/api/download-paramount?tv=us&type=bundle`;
        const nameApk    = `Paramount+ ${version} US Fire TV APK`;
        const nameBundle = `Paramount+ ${version} US Fire TV Bundle`;

        console.log(`Versione US trovata su APKMirror: ${version}`);

        // 2. Autentica su Firebase
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

        // 3. Leggi il DB per trovare le schede esistenti (APK e Bundle)
        const appsRes = await fetch(`${dbUrl}/apps.json?auth=${token}`);
        const apps = await appsRes.json();

        let keyApk = null, keyBundle = null, existingApk = null, existingBundle = null;
        if (apps) {
            for (const [key, app] of Object.entries(apps)) {
                if (!app.name) continue;
                if (app.name.includes('Paramount+') && app.name.includes('US Fire TV APK')) {
                    keyApk = key; existingApk = app;
                } else if (app.name.includes('Paramount+') && app.name.includes('US Fire TV Bundle')) {
                    keyBundle = key; existingBundle = app;
                } else if (app.name.includes('Paramount+') && (app.name.includes('Android TV') || app.name.includes('US Fire TV'))
                           && !app.name.includes('APK') && !app.name.includes('Bundle')) {
                    // Vecchia scheda singola → diventa Bundle
                    keyBundle = key; existingBundle = app;
                }
            }
        }

        const iconUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Paramount_Plus.svg/512px-Paramount_Plus.svg.png";
        const ts = Date.now();

        const dataApk = {
            name: nameApk,
            code: downloadUrlApk,
            desc: `Versione ${version} USA — APK standalone (Uptodown, compatibile Fire TV con proxy US)`,
            icon: iconUrl, category: "Streaming", timestamp: ts
        };
        const dataBundle = {
            name: nameBundle,
            code: downloadUrlBundle,
            desc: `Versione ${version} USA — Bundle APKM (APKMirror, richiede APKMirror Installer o split APK)`,
            icon: iconUrl, category: "Streaming", timestamp: ts
        };

        let updated = 0;

        // --- Gestione scheda APK ---
        if (!keyApk) {
            dataApk.order = -1;
            await fetch(`${dbUrl}/apps.json?auth=${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataApk) });
            console.log('Nuova scheda APK aggiunta');
            await notifyAll(nameApk, version, downloadUrlApk);
            updated++;
        } else if (existingApk.name !== nameApk) {
            await fetch(`${dbUrl}/apps/${keyApk}.json?auth=${token}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataApk) });
            console.log(`Scheda APK aggiornata a ${version}`);
            await notifyAll(nameApk, version, downloadUrlApk);
            updated++;
        }

        // --- Gestione scheda Bundle ---
        if (!keyBundle) {
            dataBundle.order = -1;
            await fetch(`${dbUrl}/apps.json?auth=${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataBundle) });
            console.log('Nuova scheda Bundle aggiunta');
            updated++;
        } else if (existingBundle.name !== nameBundle) {
            await fetch(`${dbUrl}/apps/${keyBundle}.json?auth=${token}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataBundle) });
            console.log(`Scheda Bundle aggiornata a ${version}`);
            updated++;
        }

        if (updated > 0) {
            return res.status(200).json({ success: true, message: `Aggiornate ${updated} schede US Fire TV: ${version}` });
        } else {
            return res.status(200).json({ success: true, message: `Nessun aggiornamento. Versione TV attuale: ${version}` });
        }

    } catch (error) {
        console.error('Errore check Paramount+ TV:', error.message);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
}
