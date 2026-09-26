param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$plan = Get-Content -Raw -Encoding UTF8 "$PSScriptRoot/duplicate-plan-20260926.json" | ConvertFrom-Json
$corrections = Get-Content -Raw -Encoding UTF8 "$PSScriptRoot/nuvio-corrections-20260926.json" | ConvertFrom-Json
if (-not $Apply) { Write-Output "Plan: remove $($plan.Count) confirmed duplicate entries and correct $($corrections.Count) Nuvio entries. Use -Apply to execute."; exit }
# Secrets remain in process memory, never logged or committed.
$config = node -e "require('dotenv').config({quiet:true});console.log(JSON.stringify({key:process.env.FIREBASE_API_KEY,email:process.env.FIREBASE_ADMIN_EMAIL,password:process.env.FIREBASE_ADMIN_PASSWORD,url:process.env.FIREBASE_DATABASE_URL}))" | ConvertFrom-Json
$owner = 'catalog-cleanup-' + [guid]::NewGuid().ToString('N')
$held = $false
try {
  $login = Invoke-RestMethod -Method Post -ContentType 'application/json' -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$($config.key)" -Body (@{email=$config.email;password=$config.password;returnSecureToken=$true} | ConvertTo-Json)
  $root = $config.url.TrimEnd('/')
  $authQuery = '?auth=' + $login.idToken
  $leaseUrl = $root + '/cron_state/_lease.json' + $authQuery
  $read = Invoke-WebRequest -UseBasicParsing -Uri $leaseUrl -Headers @{'X-Firebase-ETag'='true'}
  $lease = $read.Content | ConvertFrom-Json
  $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  if ($lease.until -gt $now) { throw 'Scheduled writer active; retry later.' }
  Invoke-RestMethod -Method Put -Uri $leaseUrl -ContentType 'application/json' -Headers @{'if-match'=$read.Headers['ETag']} -Body (@{owner=$owner;until=$now+600000} | ConvertTo-Json) | Out-Null
  $held = $true
  $apps = Invoke-RestMethod -Uri ($root+'/apps.json'+$authQuery)
  $backup = Get-Content -Raw -Encoding UTF8 'C:/Users/vitob/Downloads/codici-firetv-backup-20260926.json' | ConvertFrom-Json
  $patch = @{}
  foreach ($entry in $plan) {
    $old = $apps.($entry.remove); $keep = $apps.($entry.keep)
    if ($old.name -ne $entry.name -or $old.code -ne $entry.code -or $keep.name -ne $entry.keepName -or $keep.code -ne $entry.keepCode) { throw 'Catalog changed since review; abort.' }
    if (($old | ConvertTo-Json -Depth 20 -Compress) -ne ($backup.apps.($entry.remove) | ConvertTo-Json -Depth 20 -Compress)) { throw 'Backup differs from live entry; abort.' }
    $patch['apps/'+$entry.remove] = $null
  }
  foreach ($entry in $corrections) {
    $old = $apps.($entry.id)
    if ($old.name -ne $entry.expectedName -or $old.code -ne $entry.expectedCode) { throw 'Correction target changed; abort.' }
    $patch['apps/'+$entry.id+'/name'] = $entry.name
    if ($entry.code) { $patch['apps/'+$entry.id+'/code'] = $entry.code }
  }
  Invoke-RestMethod -Method Patch -Uri ($root+'/.json'+$authQuery) -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes(($patch | ConvertTo-Json -Depth 20 -Compress))) | Out-Null
  $after = Invoke-RestMethod -Uri ($root+'/apps.json'+$authQuery)
  foreach ($entry in $plan) { if ($after.($entry.remove) -or -not $after.($entry.keep)) { throw 'Verification failed.' } }
  foreach ($entry in $corrections) { if ($after.($entry.id).name -ne $entry.name) { throw 'Correction verification failed.' } }
  Write-Output "Verified: $($plan.Count) duplicate entries removed, $($corrections.Count) Nuvio entries corrected. No notifications sent. Backup: Downloads/codici-firetv-backup-20260926.json"
} catch {
  # Do not print HTTP exception objects: URLs may contain credentials.
  Write-Output 'Cleanup stopped or failed. No credentials logged. Re-read the public catalog before retrying.'
  exit 1
} finally {
  if ($held) {
    try {
      $read = Invoke-WebRequest -UseBasicParsing -Uri $leaseUrl -Headers @{'X-Firebase-ETag'='true'}
      if (($read.Content | ConvertFrom-Json).owner -eq $owner) { Invoke-RestMethod -Method Put -Uri $leaseUrl -ContentType 'application/json' -Headers @{'if-match'=$read.Headers['ETag']} -Body 'null' | Out-Null }
    } catch { Write-Output 'Lease release not confirmed; it expires automatically.' }
  }
}
