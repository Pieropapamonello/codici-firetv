export function nuvioReleaseName(app) {
  if (!/^Nuvio\b/i.test(app.name || '')) return app.name;
  const url = String(app.directUrl || app.code || '');
  const match = url.match(/^https:\/\/github\.com\/(?:NuvioMedia|tapframe)\/(NuvioTV|NuvioMobile)\/releases\/download\/([^/]+)\/.*(arm64-v8a|armeabi-v7a).*\.apk$/i);
  if (!match) return app.name;
  const [, product, version, arch] = match;
  const channel = /beta|alpha|rc/i.test(version) ? 'Beta ' : '';
  return `Nuvio ${product.toLowerCase() === 'nuviotv' ? 'TV' : 'Mobile'} ${channel}${version} ARM ${arch.toLowerCase() === 'arm64-v8a' ? '64' : '32'} bit`;
}

export function variantDescription(app, description) {
  const name = String(app.name || '');
  if (!/^Nuvio\b/i.test(name)) return description;
  const url = String(app.directUrl || app.code || '');
  const mobile = /NuvioMobile/i.test(url) || /mobile/i.test(name);
  const arch = /arm64|64\s*bit/i.test(url + ' ' + name) ? '64 bit: richiede Android ARM a 64 bit.'
    : /armeabi|32\s*bit/i.test(url + ' ' + name) ? '32 bit: richiede supporto per app ARM a 32 bit.' : 'Architettura non specificata: controlla il download.';
  const tag = url.match(/\/releases\/download\/([^/]+)\//)?.[1];
  const channel = tag ? (/beta|alpha|rc/i.test(tag) ? 'Beta: versione di prova, può contenere problemi.' : 'Release senza etichetta beta nel link.')
    : /beta/i.test(name) ? 'Beta: versione di prova, può contenere problemi.' : 'Verifica il canale nella pagina di download.';
  return `${mobile ? 'Per telefoni e tablet Android, comandi touch.' : 'Per Android TV / Fire TV compatibili, comandi da telecomando.'} ${arch} ${channel}${tag ? ' Versione collegata: ' + tag + '.' : ''}`;
}
