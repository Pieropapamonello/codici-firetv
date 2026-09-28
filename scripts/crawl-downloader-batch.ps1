param([string]$UrlsPath,[int]$Batch=0,[int]$Batches=4)
$OutputEncoding=[Text.UTF8Encoding]::new()
$urls=Get-Content -Raw -Encoding UTF8 $UrlsPath | ConvertFrom-Json
for($i=$Batch;$i -lt $urls.Count;$i+=$Batches) {
  try {
    $page=Invoke-WebRequest -UseBasicParsing -TimeoutSec 18 -Uri $urls[$i] -ErrorAction Stop
    $page.Content | node "$PSScriptRoot/inspect-downloader-page.mjs" $urls[$i]
  } catch { @{source=$urls[$i];error='Page not retrieved';links=@()} | ConvertTo-Json -Compress }
}
