import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, set, get, update, child } from "firebase/database";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import admZip from 'adm-zip';
import xml2js from 'xml2js';
import https from 'https';
import { notifyAll } from "./utils/notify.js";

// --- CONFIGURAZIONE ---
// Definiamo i pacchetti da tracciare e le loro fonti
const APPS = {
    revanced_manager: {
        name: "ReVanced Manager",
        source: "github_release",
        repo: "ReVanced/revanced-manager",
        firebaseKey: "revanced_manager", // Chiave nel DB Firebase
        icon: "https://raw.githubusercontent.com/ReVanced/revanced-manager/main/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png"
    },
    gmscore: {
        name: "microG Services (GmsCore)",
        source: "github_release",
        repo: "ReVanced/GmsCore", 
        firebaseKey: "gmscore",
        icon: "https://raw.githubusercontent.com/ReVanced/GmsCore/main/play-services-core/src/main/res/mipmap-xxxhdpi/ic_launcher.png"
    },
    youtube: {
        name: "YouTube",
        source: "apkmirror_rss",
        rssUrl: "https://www.apkmirror.com/apk/google-inc/youtube/feed/",
        patchSource: "revanced_patches", // Determina la versione compatibile analizzando le patch
        patchClassPath: "app/revanced/patches/youtube/misc/playservice/VersionCheckPatchKt.class", // Classe nel .rvp per controllare la versione
        firebaseKey: "youtube_revanced",
        icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/240px-YouTube_full-color_icon_%282017%29.svg.png"
    },
    youtube_music: {
        name: "YouTube Music",
        source: "apkmirror_rss",
        rssUrl: "https://www.apkmirror.com/apk/google-inc/youtube-music/feed/",
        patchSource: "revanced_patches",
        patchClassPath: "app/revanced/patches/music/playservice/VersionCheckPatchKt.class",
        firebaseKey: "youtube_music_revanced",
        icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Youtube_Music_icon.svg/240px-Youtube_Music_icon.svg.png"
    },
    google_photos: {
        name: "Google Photos",
        source: "apkmirror_rss",
        rssUrl: "https://www.apkmirror.com/apk/google-inc/photos/feed/",
        patchSource: "revanced_patches", 
        // Non abbiamo trovato un check specifico per Photos, assumiamo "Latest" o cerchiamo in GmsCoreSupportPatchKt se presente
        patchClassPath: null, 
        firebaseKey: "google_photos_revanced",
        icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Google_Photos_icon_%282020%29.svg/240px-Google_Photos_icon_%282020%29.svg.png",
        apkmirrorPath: "photos" // Percorso specifico su APKMirror
    }
};

// Funzione helper per scaricare un file in un buffer
const downloadBuffer = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                downloadBuffer(res.headers.location).then(resolve).catch(reject);
                return;
            }
            const data = [];
            res.on('data', (chunk) => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
            res.on('error', reject);
        }).on('error', reject);
    });
};

// Funzione helper per ottenere l'ultima release da GitHub
const getLatestGithubRelease = async (repo) => {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
    if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`);
    return await response.json();
};

// Funzione per analizzare il file .rvp (ZIP) e trovare la versione massima supportata
const analyzeRvpForVersion = async (rvpBuffer, classPath) => {
    if (!classPath) return "Latest"; // Se non c'è classPath, assumiamo l'ultima versione

    try {
        const zip = new admZip(rvpBuffer);
        const zipEntries = zip.getEntries();
        const entry = zipEntries.find(e => e.entryName === classPath);

        if (!entry) {
            console.warn(`Classe ${classPath} non trovata nel file .rvp.`);
            return null;
        }

        const buffer = entry.getData();
        const content = buffer.toString('utf8'); // Le stringhe Kotlin compilate sono spesso visibili in UTF-8/ASCII

        // Cerchiamo pattern tipo "is_19_34_or_greater"
        // Regex per trovare tutte le occorrenze di is_XX_YY_or_greater
        const regex = /is_(\d+)_(\d+)_or_greater/g;
        let match;
        let maxVersion = 0;
        let maxVersionString = null;

        while ((match = regex.exec(content)) !== null) {
            const major = parseInt(match[1]);
            const minor = parseInt(match[2]);
            // Convertiamo in numero per confronto (es. 19.34 -> 1934)
            const versionNum = major * 100 + minor; // Assumiamo minor < 100
            
            if (versionNum > maxVersion) {
                maxVersion = versionNum;
                maxVersionString = `${major}.${minor < 10 ? '0' + minor : minor}`;
            }
        }

        return maxVersionString;

    } catch (e) {
        console.error("Errore analisi .rvp:", e);
        return null;
    }
};

export default async function handler(req, res) {
    // Sicurezza Cron
    /*
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
       if (process.env.VERCEL_ENV === 'production') {
           return res.status(401).json({ error: 'Non autorizzato' });
       }
    }
    */

    console.log("Avvio controllo aggiornamenti ReVanced Ecosystem...");

    // Inizializza Firebase
    // NOTA: Configurazione Firebase deve essere presente nelle variabili d'ambiente
    const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
    };

    // Singleton app initialization
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const auth = getAuth(app);

    const updates = {};
    const log = [];

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

        // 1. Scarica patches.rvp una volta sola per analizzare le versioni compatibili
        log.push("Recupero ultima release di revanced-patches...");
        const patchesRelease = await getLatestGithubRelease("ReVanced/revanced-patches");
        const rvpAsset = patchesRelease.assets.find(a => a.name.endsWith('.rvp'));
        
        let rvpBuffer = null;
        if (rvpAsset) {
            log.push(`Scaricamento .rvp da ${rvpAsset.browser_download_url}...`);
            rvpBuffer = await downloadBuffer(rvpAsset.browser_download_url);
        } else {
            log.push("ERRORE: Nessun file .rvp trovato nella release patches.");
        }

        // 2. Itera su ogni app configurata
        for (const [key, config] of Object.entries(APPS)) {
            try {
                let version = null;
                let downloadUrl = ""; // Lasceremo vuoto o metteremo link release

                if (config.source === "github_release") {
                    // Caso ReVanced Manager / GmsCore
                    const release = await getLatestGithubRelease(config.repo);
                    version = release.tag_name;
                    // Cerchiamo l'asset APK se esiste
                    const apkAsset = release.assets.find(a => a.name.endsWith('.apk'));
                    if (apkAsset) {
                        downloadUrl = apkAsset.browser_download_url;
                    }
                    log.push(`Trovato ${config.name}: ${version}`);
                } 
                else if (config.source === "apkmirror_rss" && config.patchSource === "revanced_patches") {
                    // Caso YouTube / Music / Photos
                    // Prima troviamo la versione compatibile dal .rvp
                    let compatibleVersionPrefix = null;
                    if (rvpBuffer && config.patchClassPath) {
                        compatibleVersionPrefix = await analyzeRvpForVersion(rvpBuffer, config.patchClassPath);
                        log.push(`${config.name} compatible version prefix (from patches): ${compatibleVersionPrefix}`);
                    } else if (!config.patchClassPath) {
                         compatibleVersionPrefix = "Latest"; // Photos
                    }

                    if (!compatibleVersionPrefix) {
                        log.push(`Impossibile determinare versione compatibile per ${config.name}. Salto.`);
                        continue;
                    }

                    // Poiché APKMirror blocca le richieste automatiche (Cloudflare),
                    // generiamo un link di ricerca diretto per la versione compatibile.
                    if (compatibleVersionPrefix === "Latest") {
                        version = "Ultima versione";
                        const pathName = config.apkmirrorPath || config.name.toLowerCase().replace(/ /g, '-');
                        downloadUrl = `https://www.apkmirror.com/apk/google-inc/${pathName}/`;
                    } else {
                        version = `${compatibleVersionPrefix}.x`;
                        // Crea un link di ricerca su APKMirror per la versione specifica
                        const searchQuery = encodeURIComponent(`${config.name} ${compatibleVersionPrefix}`);
                        downloadUrl = `https://www.apkmirror.com/?post_type=app_release&searchtype=apk&s=${searchQuery}`;
                    }
                    
                    log.push(`Generato link di ricerca per ${config.name}: ${version}`);
                }

                // Aggiorna DB se abbiamo trovato qualcosa
                if (version) {
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
                            code: downloadUrl, // URL download o pagina
                            lastUpdated: new Date().toISOString(),
                            compatibleWithPatches: patchesRelease.tag_name,
                            icon: config.icon || ""
                        };
                        
                        // Invia notifica
                        await notifyAll(config.name, version, downloadUrl, config.icon);
                    } else {
                        log.push(`Nessun aggiornamento per ${config.name}. Versione attuale: ${version}`);
                    }
                }

            } catch (err) {
                console.error(`Errore elaborazione ${config.name}:`, err);
                log.push(`Errore ${config.name}: ${err.message}`);
            }
        }

        // Scrittura batch su Firebase
        if (Object.keys(updates).length > 0) {
            await update(ref(db), updates);
            log.push("Database aggiornato con successo.");
        } else {
            log.push("Nessun aggiornamento da salvare.");
        }

        res.status(200).json({ success: true, log: log, updates: updates });

    } catch (error) {
        console.error("Errore generale:", error);
        res.status(500).json({ error: error.message, log: log });
    }
}
