export default async function handler(req, res) {
    // mode=dedup → rimuove schede vecchie lasciando solo l'ultima versione per ogni app
    // mode=clean (default) → rimuove entry senza nome
    // mode=purge-firestickhacks → rimuove tutte le voci aggiunte dallo scraper FirestickHacks
    // mode=list → restituisce tutte le schede (per debug)
    // mode=restore → ripristina app mancanti caricate manualmente
    // mode=fix → corregge categorie Paramount+ e re-aggiunge Adobe apps
    // mode=fill-desc → aggiunge descrizioni alle schede che ne sono prive
    const mode = req.query?.mode || 'clean';

    function generateDesc(name, category) {
        const lower = name.toLowerCase();
        const ver = name.match(/(\d+[\d.]+)/)?.[0] || '';
        if (lower.includes('surfshark')) return 'VPN con crittografia avanzata — veloce e sicuro';
        if (lower.includes('nordvpn')) return 'VPN premium con protezione avanzata';
        if (lower.includes('privacydot')) return 'Indicatore visivo di attività VPN/rete';
        if (lower.includes('shadow rocket')) return 'Client proxy per Fire TV';
        if (lower.includes('super proxy')) return 'App proxy per navigazione sicura su Android TV';
        if (lower.includes('vpn')) return 'App VPN per navigazione sicura e anonima';
        if (lower.includes('troypoint') && lower.includes('fork')) return 'Fork di Kodi ottimizzato da TroyPoint' + (ver ? ' v'+ver : '');
        if (lower.includes('kodi')) return 'Media center open source per streaming locale e online' + (ver ? ' v'+ver : '');
        if (lower.includes('plex')) return 'Media server e player per contenuti locali e online';
        if (lower.includes('jellyfin')) return 'Media server open source auto-ospitato';
        if (lower.includes('emby')) return 'Media server per gestire e riprodurre contenuti media';
        if (lower.includes('stremio') && lower.includes('mod')) return 'Versione modificata di Stremio con player VLC integrato';
        if (lower.includes('stremio') && lower.includes('proxy')) return 'Proxy MPD per flussi Stremio';
        if (lower.includes('strmr')) return 'Client streaming alternativo per Fire TV';
        if (lower.includes('stremize')) return 'Client Stremio alternativo per Android TV';
        if (lower.includes('stremio')) return 'Aggregatore streaming con add-on' + (ver ? ' v'+ver : '');
        if (lower.includes('smarttube') && lower.includes('beta')) return 'YouTube ad-free per TV — versione beta con ultime funzionalità';
        if (lower.includes('smarttube')) return 'YouTube ad-free open source per TV e Fire TV';
        if (lower.includes('tizentube')) return 'YouTube ad-free — fork per dispositivi non Samsung';
        if (lower.includes('revanced manager')) return 'Strumento per applicare patch ReVanced alle app Android';
        if (lower.includes('revanced')) return 'YouTube con patch ad-free e funzionalità extra';
        if (lower.includes('tivimate')) return 'Player IPTV avanzato per liste M3U' + (ver ? ' v'+ver : '');
        if (lower.includes('xciptv')) return 'Player IPTV con interfaccia moderna' + (ver ? ' v'+ver : '');
        if (lower.includes('smarters')) return 'Player IPTV compatibile Xtream Codes e M3U';
        if (lower.includes('sparkle')) return 'Player IPTV leggero per Fire TV' + (ver ? ' v'+ver : '');
        if (lower.includes('wave iptv')) return 'Player IPTV con EPG integrata' + (ver ? ' v'+ver : '');
        if (lower.includes('nuvio')) return 'Player/aggregatore IPTV per Android TV';
        if (lower.includes('wiseplay')) return 'Player multimediale con supporto IPTV';
        if (lower.includes('nextv') || lower.includes('nex tv')) return 'Player IPTV per Fire TV e Android TV';
        if (lower.includes('implayer')) return 'Player IPTV con supporto M3U e Xtream';
        if (lower.includes('launcher manager')) return 'Gestione launcher multipli su Fire TV' + (ver ? ' v'+ver : '');
        if (lower.includes('wolf launcher')) return 'Launcher personalizzabile per Android TV' + (ver ? ' v'+ver : '');
        if (lower.includes('projectivy')) return 'Launcher avanzato con widget per Android TV' + (ver ? ' v'+ver : '');
        if (lower.includes('sideload launcher')) return 'Launcher per avviare app sideloaded su Fire TV';
        if (lower.includes('leanback launcher') || lower.includes('ltv')) return 'Launcher classico per TV' + (ver ? ' v'+ver : '');
        if (lower.includes('premium tv launcher')) return 'Launcher premium per Android TV';
        if (lower.includes('launcher')) return 'Launcher personalizzabile per Fire TV e Android TV';
        if (lower.includes('xrom lite')) return 'Versione leggera di Xrom per Fire TV';
        if (lower.includes('xrom')) return 'Custom ROM / launcher alternativo per Fire TV';
        if (lower.includes('vimu installer')) return 'Installer per Vimu Media Player su Fire TV';
        if (lower.includes('vimu')) return 'Media player avanzato per Fire TV';
        if (lower.includes('aurora store')) return 'Client open source per Google Play Store' + (ver ? ' v'+ver : '');
        if (lower.includes('aptoide')) return 'Store alternativo con milioni di APK' + (ver ? ' v'+ver : '');
        if (lower.includes('unlinked')) return 'Store privato per APK personalizzati';
        if (lower.includes('filesynced')) return 'Gestore di repository APK privati';
        if (lower.includes('apktime')) return 'Store alternativo per Fire TV e Android TV';
        if (lower.includes('apkpreem')) return 'Installer APK da repository online';
        if (lower.includes('apkmirror installer')) return 'Installer APK dal repository APKMirror';
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
        if (lower.includes('photoshop')) return 'Editor fotografico Adobe per dispositivi mobili';
        if (lower.includes('premiere rush')) return 'Editor video professionale Adobe';
        if (lower.includes('lightroom')) return 'Editor foto e video professionale Adobe';
        if (lower.includes('acrobat')) return 'Lettore e editor PDF Adobe';
        if (lower.includes('veezie')) return 'Player e aggregatore streaming per TV';
        if (lower.includes('tutti i file') || lower.includes('archivio')) return 'Raccolta link e file per Fire TV';
        const catDesc = { 'VPN': 'App VPN per navigazione sicura', 'Media Center': 'Media center per riproduzione locale e online', 'Launcher': 'Launcher per Fire TV', 'Film & Serie TV': 'App per film e serie TV in streaming', 'Player IPTV': 'Player IPTV per liste M3U e Xtream', 'Streaming': 'App streaming per Fire TV', 'Store Alternativi': 'Store alternativo per APK Android', 'Strumenti': 'Strumento di sistema per Fire TV e Android TV', 'Adobe': 'App Adobe per creatività e produttività', 'Windows': 'Strumento per Windows per sviluppo Android', 'Sistema': 'Strumento di sistema per Fire TV' };
        return catDesc[category] || 'App per Fire TV e Android TV';
    }

    const dbUrl = process.env.FIREBASE_DATABASE_URL;
    const apiKey = process.env.FIREBASE_API_KEY;

    try {
        // Autenticazione REST
        const authRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: process.env.FIREBASE_ADMIN_EMAIL, password: process.env.FIREBASE_ADMIN_PASSWORD, returnSecureToken: true }) }
        );
        const authData = await authRes.json();
        if (!authData.idToken) return res.status(500).json({ error: 'Auth fallita' });
        const token = authData.idToken;

        const appsRes = await fetch(`${dbUrl}/apps.json?auth=${token}`);
        const apps = await appsRes.json();
        if (!apps) return res.status(200).json({ success: true, message: 'DB vuoto', removed: 0 });

        if (mode === 'dedup') {
            function baseName(name) {
                return name.replace(/\b\d+[\d.]+\b/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
            }
            function extractVersion(name) {
                const m = name.match(/\b(\d+)\.(\d+)(?:\.(\d+))?\b/);
                return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3] || 0)] : null;
            }
            function compareEntries(a, b) {
                const vA = extractVersion(a.app.name), vB = extractVersion(b.app.name);
                if (vA && vB) {
                    for (let i = 0; i < 3; i++) {
                        const d = (vB[i] || 0) - (vA[i] || 0);
                        if (d !== 0) return d; // versione più alta vince
                    }
                }
                return (b.app.timestamp || 0) - (a.app.timestamp || 0);
            }
            const groups = {};
            for (const [key, appObj] of Object.entries(apps)) {
                if (!appObj.name) continue;
                const base = baseName(appObj.name);
                if (!groups[base]) groups[base] = [];
                groups[base].push({ key, app: appObj });
            }
            const toDelete = [];
            for (const entries of Object.values(groups)) {
                if (entries.length <= 1) continue;
                entries.sort(compareEntries);
                toDelete.push(...entries.slice(1));
            }
            if (toDelete.length > 0) {
                const patchBody = {};
                for (const { key } of toDelete) patchBody[key] = null;
                await fetch(`${dbUrl}/apps.json?auth=${token}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patchBody)
                });
            }
            return res.status(200).json({
                success: true,
                removed: toDelete.length,
                details: toDelete.map(e => e.app.name)
            });

        } else if (mode === 'restore') {
            // Ripristina app caricate manualmente che mancano nel DB
            const appsToRestore = [
                {
                    name: "Xrom",
                    code: "4537574",
                    desc: "Custom ROM / launcher per Fire TV",
                    category: "Launcher",
                    icon: "assets/android-os.png",
                    timestamp: Date.now()
                },
                {
                    name: "Xrom Lite",
                    code: "3271802",
                    desc: "Versione leggera di Xrom per Fire TV",
                    category: "Launcher",
                    icon: "assets/android-file.png",
                    timestamp: Date.now()
                },
                {
                    name: "Vimu Installer",
                    code: "3188516",
                    desc: "Installa Vimu Media Player su Fire TV",
                    category: "Strumenti",
                    icon: "assets/downloads.png",
                    timestamp: Date.now()
                },
                {
                    name: "Super Proxy",
                    code: "https://www.dropbox.com/scl/fi/10ifdk8arqtupxo7762ik/uptodown-com.scheler.superproxy.apk?rlkey=22ia21a34q3g2dypu5zwcd907&st=wr1ns3pr&dl=0",
                    desc: "App proxy per Android TV e Fire TV",
                    category: "VPN",
                    icon: "assets/proxy.png",
                    timestamp: Date.now()
                },
                {
                    name: "Stremio TV Mod VLC",
                    code: "3988093",
                    desc: "Versione modificata di Stremio con player VLC per TV",
                    category: "Film & Serie TV",
                    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Stremio_Icon.svg/512px-Stremio_Icon.svg.png",
                    timestamp: Date.now()
                }
            ];

            const existingNames = Object.values(apps).map(a => (a.name || '').toLowerCase().trim());
            const patchBody = {};
            const restored = [];
            const skipped = [];

            for (const app of appsToRestore) {
                if (!existingNames.includes(app.name.toLowerCase())) {
                    const newKey = 'restore_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
                    patchBody[newKey] = app;
                    restored.push(app.name);
                } else {
                    skipped.push(app.name);
                }
            }

            if (Object.keys(patchBody).length > 0) {
                await fetch(`${dbUrl}/apps.json?auth=${token}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patchBody)
                });
            }
            return res.status(200).json({ success: true, restored, skipped });

        } else if (mode === 'fix') {
            // Fix puntali:
            // 1. Corregge categorie sbagliate su schede Paramount+
            // 2. Re-inserisce app Adobe mancanti (Photoshop Express, Premiere Rush, Lightroom)
            const patchBody = {};
            let fixCount = 0;

            for (const [key, appObj] of Object.entries(apps)) {
                const name = appObj.name || '';
                // Paramount+ schede → categoria Streaming
                if (name.includes('Paramount+') && appObj.category !== 'Streaming') {
                    patchBody[`${key}/category`] = 'Streaming';
                    fixCount++;
                }
            }

            // Adobe apps mancanti
            const adobeApps = [
                {
                    name: "Adobe Photoshop Express",
                    code: "https://apkpure.com/adobe-photoshop-express-photo-editor-collage-maker/com.adobe.psmobile/download",
                    desc: "Editor fotografico Adobe per Android TV e Fire TV",
                    category: "Adobe",
                    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Adobe_Photoshop_CC_icon.svg/240px-Adobe_Photoshop_CC_icon.svg.png",
                    timestamp: Date.now()
                },
                {
                    name: "Adobe Premiere Rush",
                    code: "https://apkpure.com/adobe-premiere-rush-video-editor/com.adobe.premiererush.videoeditor/download",
                    desc: "Editor video professionale Adobe per mobile e TV",
                    category: "Adobe",
                    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Adobe_Premiere_Pro_logo_%282023%29.svg/240px-Adobe_Premiere_Pro_logo_%282023%29.svg.png",
                    timestamp: Date.now()
                },
                {
                    name: "Adobe Lightroom",
                    code: "https://apkpure.com/lightroom-photo-video-editor/com.adobe.lrmobile/download",
                    desc: "Editor foto e video professionale Adobe",
                    category: "Adobe",
                    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Adobe_Photoshop_Lightroom_CC_logo.svg/240px-Adobe_Photoshop_Lightroom_CC_logo.svg.png",
                    timestamp: Date.now()
                }
            ];

            // Controlla se le app Adobe esistono già
            const existingNames = Object.values(apps).map(a => (a.name || '').toLowerCase().trim());
            for (const adobe of adobeApps) {
                if (!existingNames.includes(adobe.name.toLowerCase())) {
                    // Genera chiave casuale tipo Firebase push key
                    const newKey = 'adobe_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
                    patchBody[newKey] = adobe;
                    fixCount++;
                }
            }

            if (Object.keys(patchBody).length > 0) {
                await fetch(`${dbUrl}/apps.json?auth=${token}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patchBody)
                });
            }
            return res.status(200).json({ success: true, fixed: fixCount, details: Object.keys(patchBody) });

        } else if (mode === 'purge-firestickhacks') {
            // Rimuove tutte le voci provenienti dallo scraper FirestickHacks
            // Identificate da: category="FireTV Hack"
            const toDelete = [];
            for (const [key, appObj] of Object.entries(apps)) {
                if ((appObj.category || '') === 'FireTV Hack' || (appObj.source || '').toLowerCase().includes('firestickhacks')) {
                    toDelete.push({ key, name: appObj.name });
                }
            }
            if (toDelete.length > 0) {
                // Batch delete: un singolo PATCH con tutti i null è molto più veloce di N DELETE separati
                const patchBody = {};
                for (const { key } of toDelete) patchBody[key] = null;
                await fetch(`${dbUrl}/apps.json?auth=${token}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patchBody)
                });
            }
            return res.status(200).json({
                success: true,
                removed: toDelete.length,
                details: toDelete.map(e => e.name)
            });

        } else if (mode === 'list') {
            // Elenca tutte le schede (per debug)
            const entries = Object.entries(apps)
                .filter(([, a]) => a.name)
                .map(([key, a]) => ({ key, name: a.name, code: a.code, category: a.category, timestamp: a.timestamp }));
            return res.status(200).json({ success: true, count: entries.length, entries });

        } else if (mode === 'fill-desc') {
            // Aggiunge descrizioni alle schede che le hanno vuote o con placeholder
            const patchBody = {};
            let filled = 0;
            for (const [key, appObj] of Object.entries(apps)) {
                if (!appObj.name) continue;
                if (!appObj.desc || appObj.desc === 'Imported from TroyPoint') {
                    const newDesc = generateDesc(appObj.name, appObj.category || '');
                    patchBody[`${key}/desc`] = newDesc;
                    filled++;
                }
            }
            if (filled > 0) {
                await fetch(`${dbUrl}/apps.json?auth=${token}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patchBody)
                });
            }
            return res.status(200).json({ success: true, filled, details: Object.entries(patchBody).map(([k, v]) => ({ key: k.split('/')[0], desc: v })) });

        } else {
            // Modalità default: rimuovi entry senza nome (batch)
            const patchBody = {};
            let removedCount = 0;
            for (const [key, appObj] of Object.entries(apps)) {
                if (!appObj.name) { patchBody[key] = null; removedCount++; }
            }
            if (removedCount > 0) {
                await fetch(`${dbUrl}/apps.json?auth=${token}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patchBody)
                });
            }
            return res.status(200).json({ success: true, message: `Rimosse ${removedCount} entry corrotte.` });
        }

    } catch (error) {
        console.error("Errore:", error);
        return res.status(500).json({ error: error.message });
    }
}
