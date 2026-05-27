import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, update } from "firebase/database";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import gplay from "google-play-scraper";

export default async function handler(req, res) {
    // Abilita CORS per permettere al frontend di chiamare l'API
    if (res.setHeader) {
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        res.setHeader(
            'Access-Control-Allow-Headers',
            'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
        );
    }

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    console.log("Avvio ricerca e aggiornamento icone massivo...");

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

        const app = initializeApp(firebaseConfig);
        const db = getDatabase(app);
        const auth = getAuth(app);

        const adminEmail = process.env.FIREBASE_ADMIN_EMAIL;
        const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            return res.status(500).json({ error: 'Credenziali admin mancanti nelle variabili d\'ambiente.' });
        }

        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        console.log("Login Firebase effettuato con successo.");

        const dbRef = ref(db);
        const snapshot = await get(dbRef);
        
        if (!snapshot.exists()) {
            return res.status(404).json({ error: "Nessun dato trovato nel database." });
        }

        const data = snapshot.val();
        const updates = {};
        const log = [];

        // Funzione helper per cercare l'icona sul Play Store
        const findIcon = async (name, currentIcon) => {
            // Se ha già un'icona valida (link http e non un'icona di default locale), saltiamo
            if (currentIcon && currentIcon.startsWith('http') && !currentIcon.includes('nello.png') && !currentIcon.includes('downloads.png')) {
                return null;
            }
            
            try {
                // Puliamo il nome per migliorare la ricerca (rimuoviamo parole come "Craccato", "Mod", "Lite", ecc.)
                let cleanName = name.replace(/craccato|mod|vlc|lite|nuovo|tv|arm/gi, '').trim();
                
                // Cerchiamo l'app sul Play Store
                const searchResults = await gplay.search({ term: cleanName, num: 1 });
                
                if (searchResults && searchResults.length > 0) {
                    // Restituiamo l'URL dell'icona ad alta risoluzione
                    return searchResults[0].icon;
                }
            } catch (e) {
                console.error(`Errore ricerca per ${name}:`, e.message);
            }
            return null;
        };

        // 1. Processiamo il nodo 'apps' (le app aggiunte manualmente)
        if (data.apps) {
            for (const [key, appData] of Object.entries(data.apps)) {
                const newIcon = await findIcon(appData.name, appData.icon);
                if (newIcon) {
                    updates[`apps/${key}/icon`] = newIcon;
                    log.push(`Trovata icona per ${appData.name}: ${newIcon}`);
                }
            }
        }

        // 2. Processiamo il nodo 'software' (le app gestite dagli script)
        if (data.software) {
            for (const [key, appData] of Object.entries(data.software)) {
                const newIcon = await findIcon(appData.name, appData.icon);
                if (newIcon) {
                    updates[`software/${key}/icon`] = newIcon;
                    log.push(`Trovata icona per ${appData.name}: ${newIcon}`);
                }
            }
        }

        // 3. Salviamo tutto su Firebase in un colpo solo
        if (Object.keys(updates).length > 0) {
            await update(ref(db), updates);
            log.push("Database aggiornato con le nuove icone!");
            return res.status(200).json({ success: true, updatedCount: Object.keys(updates).length, log });
        } else {
            log.push("Nessuna icona da aggiornare. Tutte le app hanno già un'icona valida.");
            return res.status(200).json({ success: true, message: "Nessun aggiornamento necessario.", log });
        }

    } catch (error) {
        console.error("Errore generale:", error);
        return res.status(500).json({ error: error.message });
    }
}
