param([switch]$Apply, [string]$PlanPath = "$PSScriptRoot/source-import-reviewed-20260928.json", [string]$BackupPath = 'C:/Users/vitob/Downloads/codici-firetv-before-source-import-20260928.json')
$ErrorActionPreference = 'Stop'
$plan = Get-Content -Raw -Encoding UTF8 $PlanPath | ConvertFrom-Json
if (-not $Apply) {
  Write-Output "Reviewed plan: $($plan.additions.Count) additions, $($plan.enrichments.Count) exact-match code enrichments. No notifications. Use -Apply to execute."
  exit
}
$backup = Get-Content -Raw -Encoding UTF8 $BackupPath | ConvertFrom-Json
$config = node -e "require('dotenv').config({quiet:true});console.log(JSON.stringify({key:process.env.FIREBASE_API_KEY,email:process.env.FIREBASE_ADMIN_EMAIL,password:process.env.FIREBASE_ADMIN_PASSWORD,url:process.env.FIREBASE_DATABASE_URL}))" | ConvertFrom-Json
$owner = 'source-import-' + [guid]::NewGuid().ToString('N')
$held = $false
$stage = 'authentication'
try {
  $login = Invoke-RestMethod -Method Post -ContentType 'application/json' -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$($config.key)" -Body (@{email=$config.email;password=$config.password;returnSecureToken=$true} | ConvertTo-Json)
  $root = $config.url.TrimEnd('/')
  $authQuery = '?auth=' + $login.idToken
  $leaseUrl = $root + '/cron_state/_lease.json' + $authQuery
  $stage = 'writer lease'
  $read = Invoke-WebRequest -UseBasicParsing -Uri $leaseUrl -Headers @{'X-Firebase-ETag'='true'}
  $lease = $read.Content | ConvertFrom-Json
  $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  if ($lease.until -gt $now) { throw 'Scheduled writer active' }
  Invoke-RestMethod -Method Put -Uri $leaseUrl -ContentType 'application/json' -Headers @{'if-match'=$read.Headers['ETag']} -Body (@{owner=$owner;until=$now+600000} | ConvertTo-Json) | Out-Null
  $held = $true
  $stage = 'preflight'
  $data = @{ apps=(Invoke-RestMethod -Uri ($root+'/apps.json'+$authQuery)); software=(Invoke-RestMethod -Uri ($root+'/software.json'+$authQuery)) }
  $patch = @{}
  foreach ($entry in $plan.additions) {
    if ($data.apps.($entry.id)) {
      if ($data.apps.($entry.id).code -ne $entry.app.code -or $data.apps.($entry.id).name -ne $entry.app.name) { throw 'Import ID changed' }
      continue
    }
    if ($backup.apps.($entry.id)) { throw 'Unexpected backup ID' }
    $patch['apps/'+$entry.id] = $entry.app
  }
  foreach ($entry in $plan.enrichments) {
    $old = $data[$entry.type].($entry.id)
    $saved = $backup.($entry.type).($entry.id)
    if (-not $saved -or $old.code -ne $entry.expected.code -or $old.directUrl -ne $entry.expected.directUrl -or $old.name -ne $entry.expected.name) { throw 'Entry changed since review' }
    foreach ($field in $entry.fields.PSObject.Properties) {
      if ($old.($field.Name) -eq $field.Value) { continue }
      if ($old.($field.Name) -and $old.($field.Name) -ne $saved.($field.Name)) { throw 'Field modified by another writer' }
      $patch[$entry.type+'/'+$entry.id+'/'+$field.Name] = $field.Value
    }
  }
  $stage = 'atomic scoped update'
  if ($patch.Count -gt 0) {
    Invoke-RestMethod -Method Patch -Uri ($root+'/.json'+$authQuery) -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes(($patch | ConvertTo-Json -Depth 30 -Compress))) | Out-Null
  }
  $stage = 'verification'
  $after = @{apps=(Invoke-RestMethod -Uri ($root+'/apps.json'+$authQuery));software=(Invoke-RestMethod -Uri ($root+'/software.json'+$authQuery))}
  foreach ($entry in $plan.additions) {
    foreach ($field in $entry.app.PSObject.Properties) {
      if ($after.apps.($entry.id).($field.Name) -ne $field.Value) { throw 'Addition verification failed' }
    }
  }
  foreach ($entry in $plan.enrichments) {
    foreach ($field in $entry.fields.PSObject.Properties) {
      if ($after[$entry.type].($entry.id).($field.Name) -ne $field.Value) { throw 'Enrichment verification failed' }
    }
  }
  Write-Output "Verified $($plan.additions.Count) imported entries and $($plan.enrichments.Count) enriched entries; $($patch.Count) paths written. No notifications sent."
} catch {
  Write-Output "Import stopped at: $stage. Credentials omitted. Re-read public catalog before retrying."
  exit 1
} finally {
  if ($held) {
    try {
      $read = Invoke-WebRequest -UseBasicParsing -Uri $leaseUrl -Headers @{'X-Firebase-ETag'='true'}
      if (($read.Content | ConvertFrom-Json).owner -eq $owner) {
        Invoke-RestMethod -Method Put -Uri $leaseUrl -ContentType 'application/json' -Headers @{'if-match'=$read.Headers['ETag']} -Body 'null' | Out-Null
      }
    } catch { Write-Output 'Lease release unconfirmed; expires automatically.' }
  }
}
