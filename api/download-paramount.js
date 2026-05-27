export default async function handler(req, res) {
    const isTV = req.query?.tv === 'true' || req.query?.tv === '1' || req.query?.tv === 'us';
    const type = req.query?.type || 'bundle'; // 'apk' = Uptodown standalone, 'bundle' = APKMirror .apkm

    try {
        if (isTV && type === 'apk') {
            // --- Paramount+ US Fire TV APK standalone (Uptodown - nessun Cloudflare) ---
            const response = await fetch('https://com-cbs-ott.en.uptodown.com/android/download', {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const html = await response.text();
            const match = html.match(/id="detail-download-button"[^>]*data-url="([^"]+)"/);
            if (match) {
                const dlUrl = 'https://dw.uptodown.com/dwn/' + match[1];
                const redirectRes = await fetch(dlUrl, { redirect: 'manual' });
                return res.redirect(302, redirectRes.headers.get('location') || dlUrl);
            } else {
                return res.redirect(302, 'https://com-cbs-ott.en.uptodown.com/android/');
            }

        } else if (isTV) {
            // --- Paramount+ US Fire TV Bundle .apkm (APKMirror via got-scraping + Webshare proxy) ---
            const proxyUser = process.env.WEBSHARE_PROXY_USER?.trim();
            const proxyPass = process.env.WEBSHARE_PROXY_PASS?.trim();
            // Lista proxy (quelli funzionanti per Cloudflare prima)
            const proxyList = (process.env.WEBSHARE_PROXIES || '').split(',').map(s => s.trim()).filter(Boolean);

            const { gotScraping } = await import('got-scraping');

            async function scrapeWithProxy(url, opts = {}) {
                for (const host of proxyList) {
                    const proxyUrl = `http://${proxyUser}:${proxyPass}@${host}`;
                    try {
                        const r = await gotScraping(url, {
                            proxyUrl,
                            headerGeneratorOptions: { browsers: [{ name: 'chrome', minVersion: 120 }], operatingSystems: ['windows'] },
                            timeout: { request: 15000 },
                            ...opts
                        });
                        if (r.statusCode === 200 || opts.followRedirect === false) return r;
                    } catch (_) { /* prova il prossimo */ }
                }
                throw new Error('Tutti i proxy hanno fallito');
            }

            // 1. RSS → versione + slug (non protetto da Cloudflare)
            const rssRes = await fetch('https://www.apkmirror.com/apk/cbs-interactive-inc/paramount/feed/', {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS reader)' }
            });
            const rssText = await rssRes.text();
            const slugMatch = rssText.match(/<link>https:\/\/www\.apkmirror\.com\/apk\/cbs-interactive-inc\/paramount\/(paramount-[\d-]+-release)\/<\/link>/);
            const releaseSlug = slugMatch?.[1];
            if (!releaseSlug) return res.redirect(302, 'https://www.apkmirror.com/apk/cbs-interactive-inc/paramount/');

            const downloadPage = `https://www.apkmirror.com/apk/cbs-interactive-inc/paramount/${releaseSlug}/${releaseSlug.replace('-release', '-android-apk-download')}/`;

            // 2. Fetch pagina download via proxy → estrai href completo con ?key=
            const pageRes = await scrapeWithProxy(downloadPage);
            const keyHrefMatch = pageRes.body.match(/href="([^"]*\?key=[a-zA-Z0-9_-]+[^"]*)"/);
            if (!keyHrefMatch) { console.warn('APKMirror: key href non trovato'); return res.redirect(302, downloadPage); }
            const keyHref = keyHrefMatch[1];
            const keyUrl = keyHref.startsWith('http') ? keyHref : 'https://www.apkmirror.com' + keyHref;

            // 3. Fetch pagina key → download.php
            const keyPageRes = await scrapeWithProxy(keyUrl);
            const dlPhpMatch = keyPageRes.body.match(/href="(\/wp-content\/themes\/APKMirror\/download\.php\?id=[^"]+)"/);
            if (!dlPhpMatch) { console.warn('APKMirror: download.php non trovato'); return res.redirect(302, downloadPage); }
            const dlPhpUrl = 'https://www.apkmirror.com' + dlPhpMatch[1].replace(/&amp;/g, '&');

            // 4. Segui redirect CDN
            const cdnRes = await scrapeWithProxy(dlPhpUrl, { followRedirect: false });
            const finalUrl = cdnRes.headers.location || dlPhpUrl;

            return res.redirect(302, finalUrl);

        } else {
            // --- Paramount+ Mobile/Tablet (Uptodown) ---
            const response = await fetch('https://com-cbs-ott.en.uptodown.com/android/download');
            const html = await response.text();
            const match = html.match(/id="detail-download-button"[^>]*data-url="([^"]+)"/);

            if (match) {
                const token = match[1];
                const dlUrl = 'https://dw.uptodown.com/dwn/' + token;
                const redirectResponse = await fetch(dlUrl, { redirect: 'manual' });
                const finalApkUrl = redirectResponse.headers.get('location');
                return res.redirect(302, finalApkUrl || dlUrl);
            } else {
                res.status(404).send('Download link not found');
            }
        }
    } catch (error) {
        console.error('Errore download Paramount+:', error.message);
        res.status(500).send('Error fetching download link');
    }
}