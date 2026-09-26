
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, get, update, push } from "firebase/database";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { notifyAll } from "./utils/notify.js";
import { extractVersion, compareVersions } from './utils/app-version.js';
import { catalogMetadata } from '../public/catalog-metadata.js';
import { parseToolbox } from './utils/toolbox-parser.js';
import { sameDownload } from './utils/catalog-duplicates.js';
import { nuvioReleaseName } from '../public/app-variants.js';

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

function generateDesc(name) { return catalogMetadata(name).desc; }
function categorizeApp(name) { return catalogMetadata(name).category; }

async function scrapeTroypoint() {
    try {
        const response = await fetch("https://troypoint.com/troypoint-toolbox/");
        if (!response.ok) throw new Error(`TroyPoint HTTP ${response.status}`);
        const html = await response.text();
        const apps = [];

        const rawApps = parseToolbox(html);

        // Raggruppa per nome base (senza "(Mirror)" o "Download Mirror") e preferisci la variante Mirror
        function stripMirror(name) {
            return name.replace(/\s*\(?\s*(Download\s+)?Mirror\)?[\s\S]*$/i, '').trim();
        }
        function isMirror(name) {
            return /mirror/i.test(name);
        }

        const groups = {};
        for (const a of rawApps) {
            const base = stripMirror(a.name).toLowerCase();
            if (!groups[base]) groups[base] = [];
            groups[base].push(a);
        }

        for (const entries of Object.values(groups)) {
            // Mirror ha priorita': se esiste, scarta il non-mirror
            const mirror = entries.find(e => isMirror(e.name));
            const chosen = mirror || entries[0];
            // Usa il nome SENZA "(Mirror)" per coerenza con eventuali entry gia' nel DB
            chosen.name = stripMirror(chosen.name) || chosen.name;
            if (!apps.some(x => x.name === chosen.name)) apps.push(chosen);
        }

        console.log(`TroyPoint scraped: ${rawApps.length} raw, ${apps.length} dedup`);
        if (!apps.length) throw new Error('TroyPoint catalog empty or parsing failed');
        return apps;
    } catch (e) {
        console.error("Scrape failed:", e);
        throw e;
    }
}

export default async function handler(req, res) {
    if (res.setHeader) res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        if (process.env.FIREBASE_ADMIN_EMAIL && process.env.FIREBASE_ADMIN_PASSWORD) {
            await signInWithEmailAndPassword(auth, process.env.FIREBASE_ADMIN_EMAIL, process.env.FIREBASE_ADMIN_PASSWORD);
        }

        const [snapshot, ignoredSnapshot] = await Promise.all([
            get(ref(db, 'apps')),
            get(ref(db, 'troypoint_ignored'))
        ]);

        const existingApps = snapshot.val() || {};
        const scrapedApps = await scrapeTroypoint();

        // Costruisci set dei nomi ignorati (normalizzati)
        const ignoredNames = new Set();
        if (ignoredSnapshot.exists()) {
            Object.values(ignoredSnapshot.val()).forEach(entry => {
                if (entry.name) ignoredNames.add(entry.name.toLowerCase().trim());
            });
        }
        
        const updates = {};
        const notifications = [];
        
        function baseName(name) {
            return name.toLowerCase().replace(/\b(?:v\d+(?:\.\d+)*|\d+(?:\.\d+)+)\b/g, '').replace(/\b(stable|release|apk|for fire tv|for android tv|android tv boxes|most|latest|new)\b/gi, '').replace(/[^a-z0-9]/g, '').trim();
        }


        // 1. Process Scraped Data (Add new or Update existing links)
        for (const scraped of scrapedApps) {
            scraped.name = nuvioReleaseName(scraped);
            const scrapedNameNorm = scraped.name.toLowerCase().trim();
            const scrapedBase = baseName(scraped.name);

            // Salta se l'admin ha eliminato questa app in precedenza
            if (ignoredNames.has(scrapedNameNorm)) {
                console.log(`Skipping ignored app: ${scraped.name}`);
                continue;
            }
            // Check anche il nome base nella ignore list
            if ([...ignoredNames].some(ignored => baseName(ignored) === scrapedBase)) {
                console.log(`Skipping ignored (fuzzy): ${scraped.name}`);
                continue;
            }

            let foundKey = null;
            let existingApp = null;
            // Same product and exact artifact: aliases are not new apps.
            // Do not overwrite its reviewed name/channel with scraper text.
            if (Object.values(existingApps).some(val => sameDownload(val, scraped))) continue;

            // Trova per nome esatto O per nome base (fuzzy match)
            const entries = Object.entries(existingApps).sort(([, a], [, b]) =>
                Number(b.name?.toLowerCase().trim() === scrapedNameNorm) - Number(a.name?.toLowerCase().trim() === scrapedNameNorm));
            for (const [key, val] of entries) {
                if (!val.name) continue;
                const valNorm = val.name.toLowerCase().trim();
                if (valNorm === scrapedNameNorm || baseName(val.name) === scrapedBase) {
                    foundKey = key;
                    existingApp = val;
                    break;
                }
            }

            if (foundKey) {
                const previousVersion = extractVersion(existingApp.name);
                const scrapedVersion = extractVersion(scraped.name);
                // Dedicated release checkers own these entries, including their download codes.
                if (existingApp.directUrl || /stremio|paramount/i.test(existingApp.name)) continue;
                if (previousVersion && scrapedVersion && compareVersions(scrapedVersion, previousVersion) < 0) continue;
                const versionChanged = previousVersion && scrapedVersion && compareVersions(scrapedVersion, previousVersion) > 0;

                // I link TroyPoint possono cambiare senza che cambi la versione.
                // Aggiorna il download silenziosamente e notifica solo una versione realmente diversa.
                if (existingApp.code !== scraped.code) {
                    updates[`apps/${foundKey}/code`] = scraped.code;
                }
                if (versionChanged) {
                    updates[`apps/${foundKey}/name`] = scraped.name;
                    updates[`apps/${foundKey}/timestamp`] = Date.now();
                    notifications.push({ name: scraped.name, version: scrapedVersion, link: scraped.code, icon: existingApp.icon });
                }
                existingApps[foundKey] = { ...existingApp, code: scraped.code, ...(versionChanged ? { name: scraped.name } : {}) };
                // Aggiungi/correggi desc se vuota o placeholder
                if (!existingApp.desc || existingApp.desc === "Imported from TroyPoint") {
                    updates[`apps/${foundKey}/desc`] = generateDesc(existingApp.name, existingApp.category);
                }
            } else {
                // New App
                const newRef = push(ref(db, 'apps'));
                const newCat = categorizeApp(scraped.name);
                
                // Try fetch icon (import dinamico per evitare crash serverless)
                let icon = "assets/nello.png";
                try {
                    const gplay = (await import('google-play-scraper')).default;
                    const results = await gplay.search({ term: scraped.name, num: 1 });
                    if (results && results.length > 0) icon = results[0].icon;
                } catch(e) { console.warn("gplay icon fetch failed:", e.message); }
                
                updates[`apps/${newRef.key}`] = {
                    name: scraped.name,
                    code: scraped.code,
                    desc: generateDesc(scraped.name, newCat),
                    category: newCat,
                    icon: icon,
                    timestamp: Date.now()
                };
                existingApps[newRef.key] = updates[`apps/${newRef.key}`];
                notifications.push({ name: scraped.name, version: "Nuova App", link: scraped.code, icon: icon });
            }
        }

        // 2. Re-Categorize & Cleanup ALL existing apps (User Request)
        for (const [key, val] of Object.entries(existingApps)) {
            const newCat = categorizeApp(val.name, val.category);
            
            // Apply category if changed
            if (newCat !== val.category) {
                updates[`apps/${key}/category`] = newCat;
            }
            
            const description = generateDesc(val.name);
            if (val.desc !== description) updates[`apps/${key}/desc`] = description;
        }

        if (Object.keys(updates).length > 0) {
            await update(ref(db), updates);
            
            // Invia notifiche
            for (const notif of notifications) {
                await notifyAll(notif.name, notif.version, notif.link, notif.icon);
            }
        }

        return res.status(200).json({ success: true, updates: Object.keys(updates).length, ignored: ignoredNames.size });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}
