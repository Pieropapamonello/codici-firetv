import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

export function sunshineAssets(release) {
  return (release.assets||[]).filter(a=>!/(debug|debuginfo)/i.test(a.name) && /(?:\.msi|\.zip|\.dmg|\.rpm|\.deb|\.AppImage|\.flatpak|\.apk|\.pkg|\.pkg\.tar\.zst)$/i.test(a.name));
}
export function officialEntries(release,repo,family,category,description,channel='') {
  if(release.draft) throw Error('Draft release');
  const assets=family==='Sunshine'?sunshineAssets(release):(release.assets||[]).filter(a=>a.name.endsWith('.apk'));
  if(!assets.length) throw Error(`No installation assets: ${repo}`);
  return assets.map(asset=>{
    if(!asset.browser_download_url.startsWith(`https://github.com/${repo}/releases/download/`)) throw Error('Unexpected asset origin');
    const version=release.tag_name.replace(/^v/,'');
    const variant=family==='Sunshine'?asset.name.replace(/^sunshine[-_]?/i,'').replace(version,'').replace(/^[-_]+/,'').replace(/\.(msi|zip|dmg|rpm|deb|AppImage|flatpak|apk|pkg)$/i,' ($1)').replace(/^1\+/,'').replace(/-/g,' '):family==='ReVanced GmsCore'?(asset.name.includes('-hw-')?'Huawei':'Standard'):channel;
    const id=`github_${repo.replace(/[^a-z0-9]/gi,'_')}_${channel}_${asset.name.replace(version,'').replace(/[^a-z0-9]/gi,'_')}`.toLowerCase();
    return {collection:family==='Sunshine'?'software':'apps',id,app:{
      name:`${family} ${version} ${variant}`.trim(),code:asset.browser_download_url,directUrl:asset.browser_download_url,
      version,variant,category,desc:description,source:`https://github.com/${repo}`,releaseUrl:release.html_url,
      metadataVerified:true,downloadKind:'file',icon:family==='Sunshine'?'https://raw.githubusercontent.com/LizardByte/Sunshine/master/src_assets/common/assets/web/public/images/logo-sunshine-45.png':'https://github.com/ReVanced.png',
      prerelease:!!release.prerelease,
    }};
  });
}
function github(path) { return JSON.parse(execFileSync('gh',['api',path],{encoding:'utf8'})); }
function plan() {
  const sunshine=github('repos/LizardByte/Sunshine/releases/latest');
  const manager=github('repos/ReVanced/revanced-manager/releases/latest');
  const dev=github('repos/ReVanced/revanced-manager/releases?per_page=100').find(r=>r.prerelease&&!r.draft&&r.assets.some(a=>a.name.endsWith('.apk')));
  const gms=github('repos/ReVanced/GmsCore/releases/latest');
  const managerDesc='Strumento ufficiale per applicare patch ReVanced ad app Android compatibili. Non include YouTube gia modificato. Stabile: uso normale; sviluppo: versione sperimentale.';
  return [
    ...officialEntries(sunshine,'LizardByte/Sunshine','Sunshine','Game streaming - Server per PC','Server open source per trasmettere giochi dal proprio computer a Moonlight. Si installa sul computer host, non su Fire TV o Android. Scegli sistema operativo e architettura corretti. I file .apk per Alpine sono pacchetti Linux, NON APK Android.'),
    ...officialEntries(manager,'ReVanced/revanced-manager','ReVanced Manager','Personalizzazione app Android',managerDesc,'Stabile'),
    ...(dev?officialEntries(dev,'ReVanced/revanced-manager','ReVanced Manager','Personalizzazione app Android',managerDesc,'Sviluppo'):[]),
    ...officialEntries(gms,'ReVanced/GmsCore','ReVanced GmsCore','Servizi di compatibilità Android','Componente ufficiale ReVanced basato su microG, richiesto da alcune app con patch GmsCore. Scegli Standard oppure la variante Huawei. Non e un lettore video.'),
  ];
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) console.log(JSON.stringify(plan()));
