import {catalogDb} from './utils/catalog-job.js';
import {notifyAll} from './utils/notify.js';

export function dubLiftUpdates(release,apps) {
    if(release.draft||release.prerelease) throw new Error('Latest stable release unavailable');
    const updates={},notifications=[];
    for(const [arch,bits] of [['armv7',32],['arm64',64]]) {
        const asset=(release.assets||[]).find(a=>a.name===`DubLift-${arch}.apk`);
        if(!asset||!/^https:\/\/github\.com\/joojoooo\/DubLiftApp\/releases\/download\//.test(asset.browser_download_url)) throw new Error(`DubLift ${arch} APK missing`);
        const id=`github_dublift_${arch}`,old=apps[id];
        const version=String(release.tag_name||'').replace(/^v/,'');
        if(!version) throw new Error('Missing DubLift release version');
        const url=asset.browser_download_url;
        const fingerprint=asset.digest||`${asset.id}:${asset.updated_at}:${asset.size}`;
        if(old && (old.directUrl||old.code)===url && old.assetFingerprint===fingerprint) continue;
        const changed=old && ((old.directUrl||old.code)!==url || (old.assetFingerprint && old.assetFingerprint!==fingerprint));
        const data={...old,name:`DubLift ${version} ARM ${bits} bit`,code:url,directUrl:url,version,
            architecture:arch==='armv7'?'armeabi-v7a':'arm64-v8a',icon:'/assets/dublift.png',downloadKind:'file',
            category:'Componenti aggiuntivi per Stremio e Nuvio',
            desc:'Server addon locale per Stremio e Nuvio: abbina le proprie sorgenti HTTP(S) ad audio italiano sincronizzato. Richiede Android 7.1 o superiore e deve restare attivo durante la visione.',
            metadataVerified:true,source:'https://github.com/joojoooo/DubLiftApp',assetFingerprint:fingerprint,
            ...(changed?{timestamp:Date.now(),downloaderCode:null,codeBoundUrl:null}:{})};
        updates[`apps/${id}`]=data;
        if(changed) notifications.push(data);
    }
    return {updates,notifications};
}

export default async function handler(req,res) {
    try {
        const headers={'User-Agent':'IlCovoDiNello-Catalog','Accept':'application/vnd.github+json'};
        if(process.env.GITHUB_TOKEN) headers.Authorization=`Bearer ${process.env.GITHUB_TOKEN}`;
        const response=await fetch('https://api.github.com/repos/joojoooo/DubLiftApp/releases/latest',{headers,signal:AbortSignal.timeout(20000)});
        if(!response.ok) throw new Error(`DubLift GitHub HTTP ${response.status}`);
        const release=await response.json();
        const db=await catalogDb();
        const plan=dubLiftUpdates(release,await db('apps')||{});
        if(Object.keys(plan.updates).length) await db('',plan.updates);
        for(const app of plan.notifications) await notifyAll(app.name,app.version,app.directUrl,app.icon);
        return res.status(200).json({success:true,updated:Object.keys(plan.updates).length});
    } catch(error) {return res.status(500).json({error:error.message});}
}
