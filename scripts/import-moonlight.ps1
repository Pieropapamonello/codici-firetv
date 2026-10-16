param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$release = gh api repos/moonlight-stream/moonlight-android/releases/latest | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $release.draft -or $release.prerelease) { throw 'Release stabile non disponibile' }
$version = $release.tag_name -replace '^v',''
$entries = @{}
foreach ($flavor in @('nonRoot','root')) {
  $asset = @($release.assets | Where-Object {$_.name -eq "app-$flavor-release.apk"})
  if ($asset.Count -ne 1) { throw "APK $flavor non disponibile" }
  $url = $asset[0].browser_download_url
  if ($url -notmatch '^https://github.com/moonlight-stream/moonlight-android/releases/download/') { throw 'Origine APK inattesa' }
  $label = if ($flavor -eq 'nonRoot') {'Standard senza root'} else {'Root'}
  $entries['github_moonlight_'+$flavor.ToLowerInvariant()] = @{
    name="Moonlight $version $label"; code=$url; directUrl=$url; version=$version
    category='Giochi ed emulazione'; downloadKind='file'; metadataVerified=$true
    icon='https://raw.githubusercontent.com/moonlight-stream/moonlight-android/master/app/src/main/res/mipmap-hdpi/ic_launcher.png'
    source='https://github.com/moonlight-stream/moonlight-android'; releaseUrl=$release.html_url
    desc='Client open source per giocare in streaming dal proprio PC tramite Sunshine o un host GameStream compatibile. Il gioco viene eseguito sul PC, che deve restare acceso. Su Android e Fire TV usa normalmente la variante standard senza root; la build root e destinata ai dispositivi con root.'
    variant=$flavor; assetFingerprint=$asset[0].digest
  }
}
if (-not $Apply) { $entries.Values | Select-Object name,code; exit }
$config = (node -e "console.log(JSON.stringify(require('dotenv').config({quiet:true}).parsed))") | ConvertFrom-Json
$held=$false
$owner='moonlight-import-'+[guid]::NewGuid().ToString('N')
try {
  $login=Invoke-RestMethod -Method Post -Uri ('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+$config.FIREBASE_API_KEY) -ContentType 'application/json' -Body (@{email=$config.FIREBASE_ADMIN_EMAIL;password=$config.FIREBASE_ADMIN_PASSWORD;returnSecureToken=$true}|ConvertTo-Json)
  $root=$config.FIREBASE_DATABASE_URL.TrimEnd('/')
  $query='?auth='+$login.idToken
  $leaseUrl=$root+'/cron_state/_lease.json'+$query
  $leaseRead=Invoke-WebRequest -UseBasicParsing -Uri $leaseUrl -Headers @{'X-Firebase-ETag'='true'}
  $now=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  if (($leaseRead.Content|ConvertFrom-Json).until -gt $now) { throw 'Writer attivo: riprovare piu tardi' }
  Invoke-RestMethod -Method Put -Uri $leaseUrl -ContentType 'application/json' -Headers @{'if-match'=$leaseRead.Headers['ETag']} -Body (@{owner=$owner;until=$now+600000}|ConvertTo-Json) | Out-Null
  $held=$true
  $apps=Invoke-RestMethod ($root+'/apps.json'+$query)
  $patch=@{}
  foreach ($id in $entries.Keys) {
    $old=$apps.$id
    if ($old) {
      if ($old.code -eq $entries[$id].code) { continue }
      throw 'Voce esistente differente: revisione necessaria'
    }
    if (@($apps.PSObject.Properties | Where-Object {$_.Value.code -eq $entries[$id].code -or $_.Value.directUrl -eq $entries[$id].directUrl}).Count) { throw 'APK gia presente: revisione duplicati necessaria' }
    $patch['apps/'+$id]=$entries[$id]
  }
  if ($patch.Count) { Invoke-RestMethod -Method Patch -Uri ($root+'/.json'+$query) -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes(($patch|ConvertTo-Json -Depth 10))) | Out-Null }
  foreach ($id in $entries.Keys) {
    $saved=Invoke-RestMethod ($root+'/apps/'+$id+'.json'+$query)
    if ($saved.code -ne $entries[$id].code -or $saved.name -ne $entries[$id].name) { throw 'Verifica importazione fallita' }
  }
  Write-Output "Verificate $($entries.Count) varianti Moonlight. Nessuna notifica inviata."
} catch { throw 'Importazione Moonlight interrotta. Nessuna credenziale mostrata; verificare il catalogo prima di riprovare.' }
finally {
  if ($held) {
    $leaseRead=Invoke-WebRequest -UseBasicParsing -Uri $leaseUrl -Headers @{'X-Firebase-ETag'='true'}
    if (($leaseRead.Content|ConvertFrom-Json).owner -eq $owner) { Invoke-RestMethod -Method Put -Uri $leaseUrl -ContentType 'application/json' -Headers @{'if-match'=$leaseRead.Headers['ETag']} -Body 'null' | Out-Null }
  }
}
