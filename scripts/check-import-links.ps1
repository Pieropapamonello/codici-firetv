param([int]$Batch = 0, [int]$Batches = 4)
$plan = Get-Content -Raw -Encoding UTF8 "$PSScriptRoot/source-import-plan-20260927.json" | ConvertFrom-Json
for ($i=$Batch; $i -lt $plan.additions.Count; $i+=$Batches) {
  $entry=$plan.additions[$i]
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Method Head -TimeoutSec 12 -Uri $entry.app.code -ErrorAction Stop
    @{id=$entry.id;status=[int]$response.StatusCode;host=$response.BaseResponse.ResponseUri.Host;contentType=$response.Headers['Content-Type']} | ConvertTo-Json -Compress
  } catch { @{id=$entry.id;status=0} | ConvertTo-Json -Compress }
}
