import { randomUUID } from 'node:crypto';

export function dueSlot(hour, now = new Date()) {
    const slot = new Date(now);
    slot.setUTCHours(hour, 0, 0, 0);
    if (slot > now) slot.setUTCDate(slot.getUTCDate() - 1);
    return slot.toISOString();
}

export function createCronRunner(jobs, request = fetch) {
    let running = false;
    let cachedToken, tokenExpires = 0;
    async function token() {
        if (cachedToken && Date.now() < tokenExpires) return cachedToken;
        const r = await request(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: process.env.FIREBASE_ADMIN_EMAIL, password: process.env.FIREBASE_ADMIN_PASSWORD, returnSecureToken: true }),
            signal: AbortSignal.timeout(20000)
        });
        const data = await r.json();
        if (!r.ok || !data.idToken) throw new Error('Cron authentication failed');
        cachedToken = data.idToken;
        tokenExpires = Date.now() + 45 * 60 * 1000;
        return cachedToken;
    }
    async function db(key, options = {}) {
        const url = `${process.env.FIREBASE_DATABASE_URL}/cron_state/${key}.json?auth=${await token()}`;
        const r = await request(url, { ...options, signal: AbortSignal.timeout(20000) });
        if (!r.ok && r.status !== 412) throw new Error(`Cron state HTTP ${r.status}`);
        return r;
    }
    // One shared lease serializes catalog writers across instances and redeploys.
    async function changeLease(owner, release = false) {
        const read = await db('_lease', { headers: { 'X-Firebase-ETag': 'true' } });
        const state = await read.json();
        if (state?.owner !== owner && state?.until > Date.now()) return false;
        if (release && state?.owner !== owner) return false;
        const write = await db('_lease', {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'if-match': read.headers.get('etag') },
            body: JSON.stringify(release ? null : { owner, until: Date.now() + 10 * 60 * 1000 })
        });
        return write.status !== 412;
    }
    return async function tick() {
        if (running) return;
        running = true;
        const owner = randomUUID();
        let held = false, heartbeat, leaseLost = false;
        try {
            held = await changeLease(owner);
            if (!held) return;
            // Do not let a live process continue writing after losing its lease.
            heartbeat = setInterval(async () => {
                try { if (!await changeLease(owner)) leaseLost = true; }
                catch { leaseLost = true; }
                if (leaseLost) { console.error('[CRON] Lease renewal failed; restarting for safe recovery'); process.exit(1); }
            }, 60000);
            for (const job of jobs) {
                if (leaseLost) break;
                const slot = dueSlot(job.hour);
                const state = await (await db(job.name)).json() || {};
                if (state.completedSlot >= slot || state.retryAt > Date.now()) continue;
                let status = 200, body;
                const res = {
                    setHeader() {}, status(code) { status = code; return this; },
                    json(value) { body = value; return this; }, send(value) { body = value; return this; }, end() {}
                };
                const watchdog = setTimeout(() => {
                    console.error(`[CRON ${job.name}] Execution exceeded 30 minutes; restarting`);
                    process.exit(1);
                }, 30 * 60000);
                try {
                    await job.handler({ method: 'GET', headers: { host: new URL(process.env.PUBLIC_URL || 'https://ilcovodinello.onrender.com').host }, query: {} }, res);
                    if (status >= 400 || body?.error || body?.success === false || body?.results?.some(item => item.error) || body?.log?.some(line => /^Errore|Impossibile/i.test(line))) throw new Error('Handler reported an error');
                    await db(job.name, { method: 'PUT', body: JSON.stringify({ completedSlot: slot, finishedAt: new Date().toISOString(), status: 'ok' }) });
                    console.log(`[CRON ${job.name}] Completed ${slot}`);
                } catch (error) {
                    await db(job.name, { method: 'PUT', body: JSON.stringify({ ...state, status: 'error', lastAttempt: new Date().toISOString(), retryAt: Date.now() + 30 * 60000 }) });
                    console.error(`[CRON ${job.name}] Failed; retry in 30 minutes`);
                } finally { clearTimeout(watchdog); }
            }
        } catch { console.error('[CRON] Scheduler unavailable; will retry on next tick'); }
        finally {
            clearInterval(heartbeat);
            if (held) await changeLease(owner, true).catch(() => {});
            running = false;
        }
    };
}
