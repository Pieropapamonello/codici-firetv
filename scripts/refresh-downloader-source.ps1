param([int]$Batch=0,[int]$Batches=4)
$OutputEncoding=[Text.UTF8Encoding]::new()
$homePage=(Invoke-WebRequest -UseBasicParsing -TimeoutSec 20 'https://downloadercodes.com/').Content
$urls=$homePage | node "$PSScriptRoot/parse-catalog-source.mjs" 'https://downloadercodes.com/' | ConvertFrom-Json
for($i=$Batch;$i -lt $urls.Count;$i+=$Batches) {
  try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 20 $urls[$i]).Content | node "$PSScriptRoot/parse-catalog-source.mjs" $urls[$i] }
  catch { @{source=$urls[$i];error='unreachable'} | ConvertTo-Json -Compress }
}
