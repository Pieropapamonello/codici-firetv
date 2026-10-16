param([switch]$Apply)
$ErrorActionPreference='Stop'
$entries = node "$PSScriptRoot/official-companions.mjs" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or -not $entries.Count) { throw 'Piano non disponibile' }
if (-not $Apply) { $entries | ForEach-Object {$_.app} | Select-Object name,category; exit }
$config=(node -e "console.log(JSON.stringify(require('dotenv').config({quiet:true}).parsed))")|ConvertFrom-Json
$owner='official-companions-'+[guid]::NewGuid().ToString('N')
$held=$false
$stage='autenticazione'
try {
  $login=Invoke-RestMethod -Method Post -Uri ('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+$config.FIREBASE_API_KEY) -ContentType 'application/json' -Body (@{email=$config.FIREBASE_ADMIN_EMAIL;password=$config.FIREBASE_ADMIN_PASSWORD;returnSecureToken=$true}|ConvertTo-Json)
  $root=$config.FIREBASE_DATABASE_URL.TrimEnd('/'); $query='?auth='+$login.idToken
  $leaseUrl=$root+'/cron_state/_lease.json'+$query
  $stage='blocco scritture'; $leaseRead=Invoke-WebRequest -UseBasicParsing -Uri $leaseUrl -Headers @{'X-Firebase-ETag'='true'}
  $now=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  if (($leaseRead.Content|ConvertFrom-Json).until -gt $now) { throw 'Writer occupato' }
  Invoke-RestMethod -Method Put -Uri $leaseUrl -ContentType 'application/json' -Headers @{'if-match'=$leaseRead.Headers['ETag']} -Body (@{owner=$owner;until=$now+600000}|ConvertTo-Json) | Out-Null
  $held=$true
  $stage='lettura catalogo'; $data=@{apps=(Invoke-RestMethod ($root+'/apps.json'+$query));software=(Invoke-RestMethod ($root+'/software.json'+$query))}
  $patch=@{}; $skipped=0
  foreach ($entry in $entries) {
    $stage='preflight '+$entry.id
    $id=$entry.id; $collection=$entry.collection
    $old=$data[$collection].$id
    if ($old -and $old.code -ne $entry.app.code) { throw 'ID esistente con link differente' }
    $matches=@(foreach ($type in @('apps','software')) { $data[$type].PSObject.Properties | Where-Object {$_.Value.code -eq $entry.app.code -or $_.Value.directUrl -eq $entry.app.directUrl} })
    if ($old -or $matches.Count) { $skipped++; continue }
    $patch[$collection+'/'+$id]=$entry.app
  }
  $stage='scrittura atomica'; if ($patch.Count) { Invoke-RestMethod -Method Patch -Uri ($root+'/.json'+$query) -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes(($patch|ConvertTo-Json -Depth 12))) | Out-Null }
  foreach ($path in $patch.Keys) {
    $stage='verifica '+$path
    $saved=Invoke-RestMethod ($root+'/'+$path+'.json'+$query)
    if ($saved.code -ne $patch[$path].code -or $saved.name -ne $patch[$path].name) { throw 'Verifica fallita' }
  }
  Write-Output "Aggiunte e verificate $($patch.Count) varianti; $skipped gia presenti. Nessuna notifica inviata."
} catch { throw "Importazione interrotta in fase: $stage. Tipo: $($_.Exception.GetType().Name). Credenziali omesse." }
finally {
  if ($held) {
    $leaseRead=Invoke-WebRequest -UseBasicParsing -Uri $leaseUrl -Headers @{'X-Firebase-ETag'='true'}
    if (($leaseRead.Content|ConvertFrom-Json).owner -eq $owner) { Invoke-RestMethod -Method Put -Uri $leaseUrl -ContentType 'application/json' -Headers @{'if-match'=$leaseRead.Headers['ETag']} -Body 'null' | Out-Null }
  }
}
