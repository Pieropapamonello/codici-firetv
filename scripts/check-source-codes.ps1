param([int]$Batch = 0, [int]$Batches = 4, [string]$CandidatePath = "$PSScriptRoot/source-candidates-20260927.json")
$OutputEncoding = [System.Text.UTF8Encoding]::new()
$data = Get-Content -Raw -Encoding UTF8 $CandidatePath | ConvertFrom-Json
$codes = @($data | Select-Object -ExpandProperty code -Unique)
for ($i = $Batch; $i -lt $codes.Count; $i += $Batches) {
  $code = $codes[$i]
  $url = "https://go.aftvnews.com/$code"
  try {
    (Invoke-WebRequest -UseBasicParsing -TimeoutSec 15 $url -ErrorAction Stop).Content | node "$PSScriptRoot/parse-catalog-source.mjs" $url
  } catch { @{code=$code;url='';error='unreachable'} | ConvertTo-Json -Compress }
}
