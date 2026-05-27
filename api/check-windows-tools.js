import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, update, get } from "firebase/database";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import https from 'https';
import { notifyAll } from "./utils/notify.js";

// --- CONFIGURAZIONE APP WINDOWS ---
const APPS = {
    scrcpy: {
        name: "scrcpy (Android Screen Mirroring)",
        repo: "Genymobile/scrcpy",
        assetFilter: (name) => name.includes("win64") && name.endsWith(".zip"),
        firebaseKey: "scrcpy_win64",
        icon: "https://raw.githubusercontent.com/Genymobile/scrcpy/master/app/data/icon.png"
    },
    wsa_builds: {
        name: "WSA Builds (Windows Subsystem for Android)",
        repo: "MustardChef/WSABuilds",
        // Filtro per: GApps incluso E NoAmazon incluso. Escludiamo Magisk/KernelSU se non specificato (l'utente ha chiesto 'gapps no amazon')
        // Preferiamo la versione standard senza root per semplicità, a meno che l'utente non voglia root, ma "gapps no amazon" è generico.
        // Release assets: 
        // WSA_..._Release-Nightly-GApps-13.0-NoAmazon.7z
        // WSA_..._Release-Nightly-with-magisk-...-GApps-13.0-NoAmazon.7z
        // Prenderemo la versione più pulita (senza "with-magisk" o "with-KernelSU" nel nome se possibile, altrimenti la prima che matcha)
        assetFilter: (name) => {
            const lowerName = name.toLowerCase();
            return lowerName.includes("gapps") && 
                   lowerName.includes("noamazon") && 
                   !lowerName.includes("nogapps") && // ridondante ma sicuro
                   !lowerName.includes("magisk") && 
                   !lowerName.includes("kernelsu");
        },
        firebaseKey: "wsa_gapps_noamazon",
        icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Windows_Subsystem_for_Android_icon.png/240px-Windows_Subsystem_for_Android_icon.png"
    }
};

// --- CODICI STATICI ---
const staticCodes = {
    "software/winhubx": {
        name: "WinHubX",
        version: "Static Code",
        code: "1303984",
        icon: "https://cdn-icons-png.flaticon.com/512/732/732221.png",
        lastUpdated: new Date().toISOString()
    },
    "software/aimods_store": {
        name: "AIMODS-Store",
        version: "Static Code",
        code: "3386029",
        icon: "https://cdn-icons-png.flaticon.com/512/888/888856.png",
        lastUpdated: new Date().toISOString()
    },
    "software/adobe_acrobat_pro_2025": {
        name: "Adobe_Acrobat_Pro_2025",
        version: "Static Code",
        code: "7855030",
        icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/PDF_file_icon.svg/240px-PDF_file_icon.svg.png",
        lastUpdated: new Date().toISOString()
    },
    "software/office_2016": {
        name: "Microsoft Office Professional Plus 2016",
        version: "Static Code",
        code: "2086958",
        icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Microsoft_Office_logo_%282013%E2%80%932019%29.svg/240px-Microsoft_Office_logo_%282013%E2%80%932019%29.svg.png",
        lastUpdated: new Date().toISOString()
    }
};

const getLatestGithubRelease = async (repo) => {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
    if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`);
    return await response.json();
};

export default async function handler(req, res) {
    /*
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        if (process.env.VERCEL_ENV === 'production') {
            return res.status(401).json({ error: 'Non autorizzato' });
        }
    }
    */

    console.log("Avvio controllo aggiornamenti Windows Tools...");

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

    // Inizializza updates con i codici statici per assicurarci che siano sempre presenti/aggiornati
    const updates = { ...staticCodes };
    const log = ["Codici statici accodati per l'aggiornamento."];

    try {
        // Autenticazione come admin per poter scrivere nel database
        const adminEmail = process.env.FIREBASE_ADMIN_EMAIL;
        const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD;

        if (adminEmail && adminPassword) {
            await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
            log.push("Autenticazione Firebase riuscita.");
        } else {
            log.push("ATTENZIONE: Credenziali admin mancanti. La scrittura potrebbe fallire se le regole di sicurezza lo richiedono.");
        }

        for (const [key, config] of Object.entries(APPS)) {
            try {
                log.push(`Controllo ${config.name}...`);
                const release = await getLatestGithubRelease(config.repo);
                const version = release.tag_name;
                
                const asset = release.assets.find(a => config.assetFilter(a.name));

                if (asset) {
                    // Controlla la versione attuale nel database
                    const dbRef = ref(db, `software/${config.firebaseKey}`);
                    const snapshot = await get(dbRef);
                    let currentVersion = null;
                    if (snapshot.exists()) {
                        currentVersion = snapshot.val().version;
                    }

                    if (currentVersion !== version) {
                        updates[`software/${config.firebaseKey}`] = {
                            name: config.name,
                            version: version,
                            code: asset.browser_download_url, // Link diretto al download
                            icon: config.icon,
                            lastUpdated: new Date().toISOString(),
                            releaseNote: `Release: ${release.name}`
                        };
                        log.push(`Trovato aggiornamento per ${config.name}: ${version} -> ${asset.name}`);
                        
                        // Invia notifica
                        await notifyAll(config.name, version, asset.browser_download_url, config.icon);
                    } else {
                        log.push(`Nessun aggiornamento per ${config.name}. Versione attuale: ${version}`);
                    }
                } else {
                    log.push(`Nessun asset corrispondente trovato per ${config.name} nella release ${version}`);
                    // Logghiamo i nomi degli asset disponibili per debug
                    log.push(`Assets disponibili: ${release.assets.map(a => a.name).join(", ")}`);
                }

            } catch (err) {
                console.error(`Errore ${config.name}:`, err);
                log.push(`Errore ${config.name}: ${err.message}`);
            }
        }

        if (Object.keys(updates).length > 0) {
            await update(ref(db), updates);
            log.push("Database aggiornato.");
        } else {
            log.push("Nessun aggiornamento necessario.");
        }

        res.status(200).json({ success: true, log, updates });

    } catch (error) {
        console.error("Critical error:", error);
        res.status(500).json({ error: error.message, log });
    }
}
