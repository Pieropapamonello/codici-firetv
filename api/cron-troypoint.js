
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, get, update, push } from "firebase/database";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { notifyAll } from "./utils/notify.js";

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

function generateDesc(name, category) {
    const lower = name.toLowerCase();
    const ver = name.match(/(\d+[\d.]+)/)?.[0] || '';
    // VPN
    if (lower.includes('surfshark')) return 'VPN con crittografia avanzata — veloce e sicuro';
    if (lower.includes('nordvpn')) return 'VPN premium con protezione avanzata';
    if (lower.includes('privacydot')) return 'Indicatore visivo di attività VPN/rete';
    if (lower.includes('shadow rocket')) return 'Client proxy per Fire TV';
    if (lower.includes('super proxy')) return 'App proxy per navigazione sicura su Android TV';
    if (lower.includes('vpn')) return 'App VPN per navigazione sicura e anonima';
    // Media Center
    if (lower.includes('troypoint') && lower.includes('fork')) return 'Fork di Kodi ottimizzato da TroyPoint' + (ver ? ' v'+ver : '');
    if (lower.includes('kodi')) return 'Media center open source per streaming locale e online' + (ver ? ' v'+ver : '');
    if (lower.includes('plex')) return 'Media server e player per contenuti locali e online';
    if (lower.includes('jellyfin')) return 'Media server open source auto-ospitato';
    if (lower.includes('emby')) return 'Media server per gestire e riprodurre contenuti media';
    // Stremio
    if (lower.includes('stremio') && lower.includes('mod')) return 'Versione modificata di Stremio con player VLC integrato';
    if (lower.includes('stremio') && lower.includes('proxy')) return 'Proxy MPD per flussi Stremio';
    if (lower.includes('strmr')) return 'Client streaming alternativo per Fire TV';
    if (lower.includes('stremize')) return 'Client Stremio alternativo per Android TV';
    if (lower.includes('stremio')) return 'Aggregatore streaming con add-on' + (ver ? ' v'+ver : '');
    // YouTube
    if (lower.includes('smarttube') && lower.includes('beta')) return 'YouTube ad-free per TV — versione beta con ultime funzionalità';
    if (lower.includes('smarttube')) return 'YouTube ad-free open source per TV e Fire TV';
    if (lower.includes('tizentube')) return 'YouTube ad-free — fork per dispositivi non Samsung';
    if (lower.includes('revanced manager')) return 'Strumento per applicare patch ReVanced alle app Android';
    if (lower.includes('revanced')) return 'YouTube con patch ad-free e funzionalità extra';
    // Player IPTV
    if (lower.includes('tivimate')) return 'Player IPTV avanzato per liste M3U' + (ver ? ' v'+ver : '');
    if (lower.includes('xciptv')) return 'Player IPTV con interfaccia moderna' + (ver ? ' v'+ver : '');
    if (lower.includes('smarters')) return 'Player IPTV compatibile Xtream Codes e M3U';
    if (lower.includes('sparkle')) return 'Player IPTV leggero per Fire TV' + (ver ? ' v'+ver : '');
    if (lower.includes('wave iptv')) return 'Player IPTV con EPG integrata' + (ver ? ' v'+ver : '');
    if (lower.includes('nuvio')) return 'Player/aggregatore IPTV per Android TV';
    if (lower.includes('wiseplay')) return 'Player multimediale con supporto IPTV';
    if (lower.includes('nextv') || lower.includes('nex tv')) return 'Player IPTV per Fire TV e Android TV';
    if (lower.includes('implayer')) return 'Player IPTV con supporto M3U e Xtream';
    // Launcher
    if (lower.includes('launcher manager')) return 'Gestione launcher multipli su Fire TV' + (ver ? ' v'+ver : '');
    if (lower.includes('wolf launcher')) return 'Launcher personalizzabile per Android TV' + (ver ? ' v'+ver : '');
    if (lower.includes('projectivy')) return 'Launcher avanzato con widget per Android TV' + (ver ? ' v'+ver : '');
    if (lower.includes('sideload launcher')) return 'Launcher per avviare app sideloaded su Fire TV';
    if (lower.includes('leanback launcher') || lower.includes('ltv')) return 'Launcher classico per TV' + (ver ? ' v'+ver : '');
    if (lower.includes('premium tv launcher')) return 'Launcher premium per Android TV';
    if (lower.includes('launcher')) return 'Launcher personalizzabile per Fire TV e Android TV';
    // Xrom / Vimu
    if (lower.includes('xrom lite')) return 'Versione leggera di Xrom per Fire TV';
    if (lower.includes('xrom nuovo') || lower.includes('xrom new')) return 'Nuova versione di Xrom — launcher/custom ROM';
    if (lower.includes('xrom')) return 'Custom ROM / launcher alternativo per Fire TV';
    if (lower.includes('vimu installer')) return 'Installer per Vimu Media Player su Fire TV';
    if (lower.includes('vimu')) return 'Media player avanzato per Fire TV';
    // Store alternativi
    if (lower.includes('aurora store')) return 'Client open source per Google Play Store' + (ver ? ' v'+ver : '');
    if (lower.includes('aptoide')) return 'Store alternativo con milioni di APK' + (ver ? ' v'+ver : '');
    if (lower.includes('unlinked')) return 'Store privato per APK personalizzati';
    if (lower.includes('filesynced')) return 'Gestore di repository APK privati';
    if (lower.includes('apktime')) return 'Store alternativo per Fire TV e Android TV';
    if (lower.includes('apkpreem')) return 'Installer APK da repository online';
    if (lower.includes('apkmirror installer')) return 'Installer APK dal repository APKMirror';
    // Streaming/Film
    if (lower.includes('syncler')) return 'Client Premiumize/RD per streaming' + (ver ? ' v'+ver : '');
    if (lower.includes('cloudstream')) return 'App streaming con sorgenti multiple' + (ver ? ' v'+ver : '');
    if (lower.includes('veezie')) return 'Player e aggregatore streaming per TV';
    if (lower.includes('wuplay')) return 'Player streaming per Fire TV';
    if (lower.includes('just') && lower.includes('player')) return 'Player video minimalista senza pubblicità';
    if (lower.includes('mx player')) return 'Player video con supporto codec hardware';
    if (lower.includes('tplayer') || lower.includes('bplayer')) return 'Player video premium per Android TV';
    if (lower.includes('prime video')) return 'Prime Video su dispositivi non certificati Google';
    if (lower.includes('netflix')) return 'Netflix su dispositivi non certificati Google';
    if (lower.includes('paramount')) return 'App streaming Paramount+' + (name.includes('Bundle') ? ' con bundle Showtime' : '');
    // Tools
    if (lower.includes('mouse toggle')) return 'Abilita il cursore su Fire TV per app non ottimizzate';
    if (lower.includes('adb appcontrol')) return 'Gestione app Android via ADB da PC';
    if (lower.includes('easy fire tools')) return 'Strumenti ADB semplificati per Fire TV';
    if (lower.includes('remote adb')) return 'Shell ADB da remoto per Android TV';
    if (lower.includes('analiti') || lower.includes('speed test')) return 'Test velocità internet e analisi rete';
    if (lower.includes('fast task killer')) return 'Chiude le app in background per liberare memoria';
    if (lower.includes('appstarter')) return "Avvia app automaticamente al boot di Fire TV";
    if (lower.includes('launch on boot')) return "Avvia automaticamente un'app al riavvio" + (ver ? ' v'+ver : '');
    if (lower.includes('app cloner')) return 'Clona app per usare più account simultaneamente';
    if (lower.includes('es file explorer')) return 'Gestore file avanzato per Android TV' + (ver ? ' v'+ver : '');
    if (lower.includes('tv bro')) return 'Browser web leggero per TV';
    if (lower.includes('set orientation')) return 'Forza orientamento schermo su Android';
    if (lower.includes('virustotal')) return 'Scanner antivirus online per APK' + (ver ? ' v'+ver : '');
    if (lower.includes('mecool') || lower.includes('remote pairing')) return 'App accoppiamento telecomando per box MECOOL';
    if (lower.includes('android tv tools')) return 'Raccolta strumenti per Android TV';
    if (lower.includes('lm settings')) return 'Impostazioni avanzate per Launcher Manager';
    if (lower.includes('airscreen')) return 'Screen mirroring da iPhone/iPad/Mac/PC su TV';
    if (lower.includes('scrcpy')) return 'Specchia e controlla Android da PC via ADB';
    if (lower.includes('firetv toolbox') || lower.includes('fire tv toolbox')) return 'Raccolta strumenti avanzati per Fire TV';
    if (lower.includes('windows adb')) return 'Driver ADB per Windows — necessari per debug USB';
    if (lower.includes('gmscore') || lower.includes('microg')) return 'Sostituto open source dei Google Play Services';
    // Adobe
    if (lower.includes('photoshop')) return 'Editor fotografico Adobe per dispositivi mobili';
    if (lower.includes('premiere rush')) return 'Editor video professionale Adobe';
    if (lower.includes('lightroom')) return 'Editor foto e video professionale Adobe';
    if (lower.includes('acrobat')) return 'Lettore e editor PDF Adobe';
    // Fallback per categoria
    const catDesc = { 'VPN': 'App VPN per navigazione sicura', 'Media Center': 'Media center per riproduzione locale e online', 'Launcher': 'Launcher per Fire TV', 'Film & Serie TV': 'App per film e serie TV in streaming', 'Player IPTV': 'Player IPTV per liste M3U e Xtream', 'Streaming': 'App streaming per Fire TV', 'Store Alternativi': 'Store alternativo per APK Android', 'Strumenti': 'Strumento di sistema per Fire TV e Android TV', 'Adobe': 'App Adobe per creatività e produttività', 'Windows': 'Strumento per Windows per sviluppo Android' };
    return catDesc[category] || 'App per Fire TV e Android TV';
}

function categorizeApp(name, currentCat = '') {
    const lower = name.toLowerCase();
    
    // Explicit keywords override generic categories
    if (lower.includes('vpn') || lower.includes('wireguard') || lower.includes('surfshark')) return 'VPN';
    if (lower.includes('kodi') || lower.includes('plex') || lower.includes('emby') || lower.includes('jellyfin')) return 'Media Center';
    if (lower.includes('launcher') || lower.includes('wolf') || lower.includes('home') || lower.includes('leanback')) return 'Launcher';
    if (lower.includes('stremio') || lower.includes('cinema') || lower.includes('bee') || lower.includes('film') || lower.includes('series') || lower.includes('popcorn') || lower.includes('tea') || lower.includes('nova') || lower.includes('syncler') || lower.includes('cloudstream') || lower.includes('onstream') || lower.includes('hdo') || lower.includes('cuco') || lower.includes('vivatv')) return 'Film & Serie TV';
    if (lower.includes('sport') || lower.includes('calcio') || lower.includes('dazn') || lower.includes('espn') || lower.includes('livescore') || lower.includes('arena')) return 'Sport';
    if (lower.includes('player') || lower.includes('vlc') || lower.includes('mx') || lower.includes('tivimate') || lower.includes('xciptv') || lower.includes('smarters') || lower.includes('implayer') || lower.includes('ott') || lower.includes('purple') || lower.includes('televizo') || lower.includes('sparkle')) return 'Player IPTV';
    if (lower.includes('clean') || lower.includes('boost') || lower.includes('file') || lower.includes('browser') || lower.includes('mouse') || lower.includes('kb') || lower.includes('speed') || lower.includes('test') || lower.includes('adb') || lower.includes('tools') || lower.includes('utility') || lower.includes('manager') || lower.includes('backup')) return 'Strumenti';
    if (lower.includes('store') || lower.includes('market') || lower.includes('aptoide') || lower.includes('aurora') || lower.includes('downloader') || lower.includes('unlinked') || lower.includes('filesynced') || lower.includes('apktime')) return 'Store Alternativi';
    if (lower.includes('youtube') || lower.includes('tube') || lower.includes('revanced') || lower.includes('piped') || lower.includes('newpipe') || lower.includes('smarttube')) return 'Streaming';

    // If current category is specific, keep it
    if (currentCat && currentCat !== 'Altro' && currentCat !== 'Strumenti' && currentCat !== 'Streaming') {
        return currentCat;
    }
    
    return 'Altro';
}

async function scrapeTroypoint() {
    try {
        const response = await fetch("https://troypoint.com/troypoint-toolbox/");
        const html = await response.text();
        const apps = [];
        
        const sections = html.split(/<h3[^>]*>/);
        for (let i = 1; i < sections.length; i++) {
            const section = sections[i];
            const appBlocks = section.split('class="inherit-container-width wp-block-group');
            for (let j = 1; j < appBlocks.length; j++) {
                const block = appBlocks[j];
                const nameMatch = block.match(/<p class="has-text-align-center"[^>]*>(.*?)<\/p>/);
                const linkMatch = block.match(/href="([^"]+)"[^>]*><strong>Download<\/strong>/);

                if (nameMatch && linkMatch) {
                    let name = nameMatch[1].replace(/<[^>]+>/g, '').trim();
                    const downloadUrl = linkMatch[1];
                    if (!name || name.length < 2 || name.includes("Note:") || name.toLowerCase().includes("tutorial")) continue;
                    name = name.replace(/&amp;/g, '&');
                    
                    if (!apps.some(a => a.name === name)) {
                        apps.push({
                            name: name,
                            code: downloadUrl,
                            timestamp: Date.now()
                        });
                    }
                }
            }
        }
        return apps;
    } catch (e) {
        console.error("Scrape failed:", e);
        return [];
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
        
        // 1. Process Scraped Data (Add new or Update existing links)
        for (const scraped of scrapedApps) {
            const scrapedNameNorm = scraped.name.toLowerCase().trim();

            // Salta se l'admin ha eliminato questa app in precedenza
            if (ignoredNames.has(scrapedNameNorm)) {
                console.log(`Skipping ignored app: ${scraped.name}`);
                continue;
            }

            let foundKey = null;
            let existingApp = null;

            // Trova per nome (case-insensitive + trim per sicurezza)
            for (const [key, val] of Object.entries(existingApps)) {
                if (val.name && val.name.toLowerCase().trim() === scrapedNameNorm) {
                    foundKey = key;
                    existingApp = val;
                    break;
                }
            }

            if (foundKey) {
                // Check updates
                if (existingApp.code !== scraped.code) {
                    updates[`apps/${foundKey}/code`] = scraped.code;
                    updates[`apps/${foundKey}/timestamp`] = Date.now();
                    notifications.push({ name: scraped.name, version: "Aggiornata", link: scraped.code, icon: existingApp.icon });
                }
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
            
            // Remove "Imported from TroyPoint"
            if (val.desc === "Imported from TroyPoint") {
                updates[`apps/${key}/desc`] = "";
            }
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
