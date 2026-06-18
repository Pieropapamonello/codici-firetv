// Wrapper Dropbox con auto-refresh del token

let cachedAccessToken = process.env.DROPBOX_TOKEN || null;
let tokenExpiresAt = cachedAccessToken ? Date.now() + 3 * 3600 * 1000 : 0;

async function refreshAccessToken() {
    const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
    const appKey = process.env.DROPBOX_APP_KEY;
    const appSecret = process.env.DROPBOX_APP_SECRET;
    if (!refreshToken || !appKey || !appSecret) {
        throw new Error('Dropbox refresh token o app credentials mancanti');
    }
    const auth = Buffer.from(`${appKey}:${appSecret}`).toString('base64');
    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`
    });
    const data = await res.json();
    if (!data.access_token) throw new Error(`Refresh fallito: ${JSON.stringify(data)}`);
    cachedAccessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return cachedAccessToken;
}

export async function getDropboxToken() {
    if (cachedAccessToken && Date.now() < tokenExpiresAt) return cachedAccessToken;
    return await refreshAccessToken();
}

export async function dbxRequest(url, options = {}) {
    let token = await getDropboxToken();
    let res = await fetch(url, { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${token}` } });
    if (res.status === 401) {
        token = await refreshAccessToken();
        res = await fetch(url, { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${token}` } });
    }
    return res;
}

export async function uploadToDropbox(filename, buffer) {
    const path = `/${filename}`;
    const uploadRes = await dbxRequest('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': JSON.stringify({ path, mode: 'add', autorename: true, mute: false })
        },
        body: buffer
    });
    if (!uploadRes.ok) throw new Error(`Upload fallito: ${await uploadRes.text()}`);
    const meta = await uploadRes.json();

    const shareRes = await dbxRequest('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: meta.path_lower, settings: { requested_visibility: 'public', audience: 'public', access: 'viewer' } })
    });
    let shareData = await shareRes.json();
    if (!shareRes.ok) {
        if (shareData.error_summary?.includes('shared_link_already_exists')) {
            const listRes = await dbxRequest('https://api.dropboxapi.com/2/sharing/list_shared_links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: meta.path_lower, direct_only: true })
            });
            const listData = await listRes.json();
            shareData = listData.links?.[0] || {};
        } else {
            throw new Error(`Share fallito: ${shareData.error_summary || 'sconosciuto'}`);
        }
    }
    const directUrl = (shareData.url || '').replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '');
    return { dropboxPath: meta.path_lower, dropboxName: meta.name, shareUrl: shareData.url, directUrl };
}
