import test from 'node:test';
import assert from 'node:assert/strict';
import {planSourceSync,collectSource} from '../api/utils/source-sync.js';
import {dubLiftUpdates} from '../api/check-dublift.js';

test('source sync adds known apps once, stages unknown identities and respects ignored entries',()=>{
    const item={name:'RetroArch',code:'4361890',source:'https://downloadercodes.com/games/retroarch/'};
    const plan=planSourceSync('downloadercodes',[item,{name:'Unknown xyz',code:'12345',source:item.source}],{});
    assert.equal(plan.stats.added,1);assert.equal(plan.stats.review,1);
    const [path,app]=Object.entries(plan.updates)[0];
    assert.equal(app.downloaderCode,'4361890');assert.equal(app.timestamp,undefined);
    assert.equal(planSourceSync('downloadercodes',[item],{[path.split('/')[1]]:app}).stats.added,0);
    assert.equal(planSourceSync('downloadercodes',[item],{},{},{a:{name:'RetroArch'}}).stats.added,0);
});

test('alternate codes do not overwrite a manually managed product or duplicate its variant',()=>{
    const plan=planSourceSync('webassistanceita',[{name:'Kodi',code:'483927',source:'https://example.com/'}],{k:{name:'Kodi',code:'https://official.example/kodi.apk'}});
    assert.deepEqual(plan.updates,{});assert.equal(plan.stats.review,1);
});

test('DownloaderCodes crawls all post sitemap pages and reports partial failures',async()=>{
    const replies={
        'https://downloadercodes.com/sitemap_index.xml':'<sitemapindex><sitemap><loc>https://downloadercodes.com/post-sitemap.xml</loc></sitemap><sitemap><loc>https://downloadercodes.com/page-sitemap.xml</loc></sitemap></sitemapindex>',
        'https://downloadercodes.com/post-sitemap.xml':'<urlset></urlset>',
        'https://downloadercodes.com/page-sitemap.xml':'<urlset><url><loc>https://downloadercodes.com/games/retroarch/</loc></url><url><loc>https://downloadercodes.com/broken/</loc></url></urlset>',
        'https://downloadercodes.com/games/retroarch/':'<h1>RetroArch Downloader Code</h1><div id="d-code">4361890</div>'
    };
    const result=await collectSource('downloadercodes',async url=>new Response(replies[url]||'',{status:replies[url]?200:503}));
    assert.equal(result.pages,2);assert.equal(result.failures,1);assert.equal(result.items[0].code,'4361890');
});

const release=version=>({tag_name:'v'+version,assets:['armv7','arm64'].map((arch,i)=>({name:`DubLift-${arch}.apk`,id:i,updated_at:'2026-10-07',size:123,browser_download_url:`https://github.com/joojoooo/DubLiftApp/releases/download/v${version}/DubLift-${arch}.apk`}))});
test('DubLift baseline never sends a false update; real changes update two architectures once',()=>{
    const initial=dubLiftUpdates(release('0.0.7'),{});
    assert.equal(initial.notifications.length,0);
    const apps=Object.fromEntries(Object.entries(initial.updates).map(([path,app])=>[path.split('/')[1],app]));
    assert.deepEqual(dubLiftUpdates(release('0.0.7'),apps).updates,{});
    const imported=structuredClone(apps);
    for(const app of Object.values(imported)) delete app.assetFingerprint;
    assert.equal(dubLiftUpdates(release('0.0.7'),imported).notifications.length,0);
    const changed=dubLiftUpdates(release('0.0.8'),apps);
    assert.equal(changed.notifications.length,2);
    assert.equal(changed.updates['apps/github_dublift_arm64'].architecture,'arm64-v8a');
    assert.throws(()=>dubLiftUpdates({...release('0.0.8'),assets:[]},apps),/missing/);
});
