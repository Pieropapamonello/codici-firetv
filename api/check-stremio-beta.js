import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, get, push, remove, child } from "firebase/database";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { notifyAll } from "./utils/notify.js";

export default async function handler(req, res) {
    console.log("Avvio controllo Stremio Beta/RC Android TV ARM...");

    try {
        const response = await fetch('https://www.stremio.com/downloads');
        const html = await response.text();

        // Cerca l'ultimo URL RC Android TV con architettura armeabi-v7a (Fire TV ARM)
        const allRcMatches = [...html.matchAll(/href="(https:\/\/dl\.strem\.io\/android\/v([\d.]+)-rc\.(\d+)-androidTV\/com\.stremio\.one-[\d.\-]+-armeabi-v7a\.apk)"/g)];

        if (allRcMatches.length === 0) {
            return res.status(200).json({ success: true, message: 'Nessuna versione RC Android TV ARM trovata.' });
        }

        // Ordina per versione + rc (prendi la piu' alta)
        allRcMatches.sort((a, b) => {
            const va = a[2].split('.').map(Number);
            const vb = b[2].split('.').map(Number);
            for (let i = 0; i < 3; i++) {
                if ((vb[i] || 0) !== (va[i] || 0)) return (vb[i] || 0) - (va[i] || 0);
            }
            return parseInt(b[3]) - parseInt(a[3]);
        });

        const [, link, version, rcNum] = allRcMatches[0];
        const appName = `Stremio Beta ${version}-rc.${rcNum} ARM TV`;
        console.log(`Stremio Beta trovata: ${appName} -> ${link}`);

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
                if (name.includes('stremio beta') || name.includes('stremio') && name.includes('rc')) {
                    if (app.code === link) {
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
                console.log(`Rimossa vecchia beta: ${key}`);
            }

            await push(dbRef, {
                name: appName,
                code: link,
                desc: `Release Candidate ${rcNum} di v${version} — ultime feature in test (ARM 32-bit)`,
                icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Stremio_Icon.svg/512px-Stremio_Icon.svg.png",
                category: "Film & Serie TV",
                timestamp: Date.now(),
                order: -1
            });

            await notifyAll(appName, `${version}-rc.${rcNum}`, link,
                "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Stremio_Icon.svg/512px-Stremio_Icon.svg.png");

            return res.status(200).json({ success: true, message: `Aggiunta ${appName}`, removed: oldBetaKeys.length });
        }

        return res.status(200).json({ success: true, message: `Nessun aggiornamento. Beta attuale: ${version}-rc.${rcNum}` });
    } catch (error) {
        console.error("Errore check Stremio Beta:", error);
        return res.status(500).json({ error: error.message });
    }
}
