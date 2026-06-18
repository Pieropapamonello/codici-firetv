// aftv.news code shortener (aftvnews.com)
// Tenta automatico via 2Captcha se configurato. Fallback: ritorna null per flusso manuale.

const SITEKEY = '6LcAO9wZAAAAANzzYTxePle21XQ-_IKTfabQoGXS';
const SITE_URL = 'https://go.aftvnews.com/';

async function solve2Captcha(apiKey) {
    const submitRes = await fetch(`https://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${SITEKEY}&pageurl=${encodeURIComponent(SITE_URL)}&json=1`);
    const submit = await submitRes.json();
    if (submit.status !== 1) throw new Error(`2captcha submit fail: ${submit.request}`);
    const taskId = submit.request;

    for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const r = await fetch(`https://2captcha.com/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`);
        const d = await r.json();
        if (d.status === 1) return d.request;
        if (d.request !== 'CAPCHA_NOT_READY') throw new Error(`2captcha res: ${d.request}`);
    }
    throw new Error('2captcha timeout');
}

export async function createAftvCode(targetUrl) {
    const apiKey = process.env.TWOCAPTCHA_API_KEY;
    if (!apiKey) return { code: null, error: 'no_2captcha_key' };

    try {
        const captchaToken = await solve2Captcha(apiKey);
        const form = new URLSearchParams();
        form.append('url', targetUrl);
        form.append('action', 'new');
        form.append('g-recaptcha-response', captchaToken);

        const submitRes = await fetch(SITE_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
                'Referer': SITE_URL,
                'Origin': 'https://go.aftvnews.com'
            },
            body: form.toString()
        });

        const html = await submitRes.text();
        // Cerca il codice nella risposta (formato: aftv.news/12345 o nel div info_code)
        const codeMatch = html.match(/<div[^>]*id="info_code"[^>]*>[\s\S]*?<div[^>]*class="info-content"[^>]*>\s*(\d+)\s*</)
                       || html.match(/aftv\.news\/(\d{4,8})/);
        if (codeMatch) return { code: codeMatch[1], error: null };
        return { code: null, error: 'no_code_in_response' };
    } catch (e) {
        return { code: null, error: e.message };
    }
}
