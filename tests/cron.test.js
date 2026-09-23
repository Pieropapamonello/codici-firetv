import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCronRunner, dueSlot } from '../api/utils/cron-runner.js';
import { compareVersions, extractVersion } from '../api/utils/app-version.js';

function fakeFirebase() {
    const records = new Map();
    const revisions = new Map();
    const request = async (url, options = {}) => {
        if (url.includes('signInWithPassword')) return new Response(JSON.stringify({ idToken: 'test-token' }));
        const key = url.match(/cron_state\/([^.?]+)/)[1];
        const revision = String(revisions.get(key) || 0);
        if (options.method === 'PUT') {
            if (options.headers?.['if-match'] && options.headers['if-match'] !== revision) return new Response('{}', { status: 412 });
            records.set(key, JSON.parse(options.body));
            revisions.set(key, Number(revision) + 1);
        }
        return new Response(JSON.stringify(records.get(key) ?? null), { headers: { etag: String(revisions.get(key) || 0) } });
    };
    return { request, records };
}

test('UTC slot recovers the most recent missed run, including before today schedule', () => {
    assert.equal(dueSlot(12, new Date('2026-09-23T11:59:00Z')), '2026-09-22T12:00:00.000Z');
    assert.equal(dueSlot(12, new Date('2026-09-23T12:00:00Z')), '2026-09-23T12:00:00.000Z');
});

test('completed jobs are not repeated after restart', async () => {
    const db = fakeFirebase(); let count = 0;
    const jobs = [{ name: 'test', hour: 0, handler: async () => count++ }];
    await createCronRunner(jobs, db.request)();
    await createCronRunner(jobs, db.request)();
    assert.equal(count, 1);
    assert.equal(db.records.get('test').status, 'ok');
});

test('separate instances cannot run a job concurrently', async () => {
    const db = fakeFirebase(); let count = 0;
    const jobs = [{ name: 'test', hour: 0, handler: async () => { count++; await new Promise(r => setTimeout(r, 20)); } }];
    await Promise.all([createCronRunner(jobs, db.request)(), createCronRunner(jobs, db.request)()]);
    assert.equal(count, 1);
});

test('failed jobs back off and retry without being marked completed', async () => {
    const db = fakeFirebase(); let count = 0;
    const jobs = [{ name: 'test', hour: 0, handler: async (_, res) => { count++; res.status(500).json({ error: 'test' }); } }];
    const tick = createCronRunner(jobs, db.request);
    await tick(); await tick();
    assert.equal(count, 1);
    assert.equal(db.records.get('test').completedSlot, undefined);
    db.records.get('test').retryAt = 0;
    await tick();
    assert.equal(count, 2);
});

test('versions reject downgrades and handle numeric and prerelease ordering', () => {
    assert.equal(compareVersions('3.2', '3.3'), -1);
    assert.equal(compareVersions('3.10', '3.9'), 1);
    assert.equal(compareVersions('1.0-rc.2', '1.0'), -1);
    assert.equal(compareVersions('1.0', '1.0.0'), 0);
    assert.equal(extractVersion('Stremio 1.10.0-rc.18 ARM TV'), '1.10.0-rc.18');
});
