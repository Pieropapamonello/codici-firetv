import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, get, push, remove, child } from "firebase/database";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { notifyAll } from "./utils/notify.js";

export default async function handler(req, res) {
    console.log("Avvio controllo aggiornamenti Stremio Beta...");

    try {
        const response = await fetch('https://www.stremio.com/downloads');
        const html = await response.text();

        const match = html.match(/<a href="([^"]+)" title="Stremio for Android TV ARM Beta[^"]*">Stremio ([0-9.]+)[^<]*Beta[^<]*<\/a>/i)
            || html.match(/href="([^"]*androidTV[^"]*beta[^"]*)"/i);

        let link, version, appName;

        if (match) {
            link = match[1];
            version = match[2] || link.match(/v([\d.]+)/)?.[1] || 'latest';
            appName = `Stremio Beta ${version} Android TV`;
        } else {
            const stableMatch = html.match(/href="([^"]*\/v([\d.]+)-androidTV\/[^"]*)"/);
            if (!stableMatch) {
                return res.status(200).json({ success: true, message: 'Nessun link Stremio Beta trovato sulla pagina.' });
            }
            version = stableMatch[2];
            link = `https://dl.strem.io/android/v${version}-androidTV-beta/com.stremio.one-v${version}-androidTV-beta.apk`;
            appName = `Stremio Beta ${version} Android TV`;
        }

        console.log(`Stremio Beta: ${version} — ${link}`);

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

        const dbRef = ref(db, 'apps');
        const snapshot = await get(dbRef);

        let exists = false;
        let oldBetaKeys = [];
        if (snapshot.exists()) {
            const apps = snapshot.val();
            Object.entries(apps).forEach(([key, app]) => {
                const name = (app.name || '').toLowerCase();
                if (name.includes('stremio beta')) {
                    if (app.name === appName || app.code === link) {
                        exists = true;
                    } else {
                        oldBetaKeys.push(key);
                    }
                }
            });
        }

        if (!exists) {
            for (const key of oldBetaKeys) {
                await remove(child(dbRef, key));
            }

            await push(dbRef, {
                name: appName,
                code: link,
                desc: "Versione beta con ultime funzionalità — test nuove feature",
                icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Stremio_Icon.svg/512px-Stremio_Icon.svg.png",
                category: "Film & Serie TV",
                timestamp: Date.now(),
                order: -1
            });

            await notifyAll(appName, version, link,
                "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Stremio_Icon.svg/512px-Stremio_Icon.svg.png");

            return res.status(200).json({ success: true, message: `Aggiunta Stremio Beta ${version}`, removed: oldBetaKeys.length });
        }

        return res.status(200).json({ success: true, message: `Nessun aggiornamento. Beta attuale: ${version}` });
    } catch (error) {
        console.error("Errore check Stremio Beta:", error);
        return res.status(500).json({ error: error.message });
    }
}
