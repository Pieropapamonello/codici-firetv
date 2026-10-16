import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {officialEntries} from './official-companions.mjs';

export function androidVariant(name) {
  if(name.includes('universal')) return 'Universale';
  if(name.includes('aarch64')) return 'ARM 64 bit';
  if(name.includes('armv7')) return 'ARM 32 bit';
  if(name.includes('x86_64')) return 'Intel x86_64';
  throw Error('Architettura APK sconosciuta');
}
export function rustdeskEntries(release) {
  return officialEntries(release,'rustdesk/rustdesk','RustDesk','Accesso remoto',
    'Client open source per accesso remoto tra dispositivi autorizzati. Su Android il controllo remoto dipende da sistema e permessi di accessibilita e cattura schermo. Non e un telecomando Fire TV dedicato. Condividi codici e password solo con persone fidate.')
    .map(entry=>({...entry,app:{...entry.app,name:`RustDesk ${entry.app.version} Android ${androidVariant(entry.app.code.split('/').pop())}`,variant:androidVariant(entry.app.code.split('/').pop()),icon:'https://raw.githubusercontent.com/rustdesk/rustdesk/master/flutter/android/app/src/main/res/mipmap-hdpi/ic_launcher.png'}}));
}
function github(path) { return JSON.parse(execFileSync('gh',['api',path],{encoding:'utf8'})); }
function plan() {
  const channels=github('repos/S0und/S0undTV/contents/update.json');
  const manifest=JSON.parse(Buffer.from(channels.content,'base64').toString('utf8'));
  const sound=[];
  for(const type of [0,1]) {
    const channel=manifest.find(row=>row.ReleaseType===type&&row.APK);
    if(!channel) throw Error('Canale S0undTV non disponibile');
    const tag=type===0?channel.VersionName:'beta';
    const release=github(`repos/S0und/S0undTV/releases/tags/${tag}`);
    const entries=officialEntries({...release,assets:release.assets.filter(a=>a.name===channel.APK)},'S0und/S0undTV','S0undTV','Video e Twitch',
      'Client non ufficiale di Twitch progettato per Android TV e telecomando. Non affiliato a Twitch. Scegli Stabile per uso normale oppure Beta per le funzioni sperimentali.',type===0?'Stabile':'Beta');
    for(const entry of entries) {
      entry.app.icon='https://play-lh.googleusercontent.com/c6Ol0HocFNr74WvnfL46PN4_7uzWonJQbVPsNhuecNmfyY_fPJEW-X-tCCs8LVogBusxMQIxkIXuiIUdYnYS=s180';
      entry.app.version=type===0?release.tag_name.replace(/^v/,''):channel.VersionName.replace(/^v/,'');
      entry.app.name=`S0undTV ${entry.app.version} ${type===0?'Stabile':'Beta'}`;
      entry.app.prerelease=type===1;
    }
    sound.push(...entries);
  }
  return [...sound,...rustdeskEntries(github('repos/rustdesk/rustdesk/releases/latest'))];
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) console.log(JSON.stringify(plan()));
