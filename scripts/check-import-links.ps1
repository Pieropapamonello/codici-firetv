param([int]$Batch = 0, [int]$Batches = 4, [string]$PlanPath = "$PSScriptRoot/source-import-plan-20260927.json")
$plan = Get-Content -Raw -Encoding UTF8 $PlanPath | ConvertFrom-Json
for ($i=$Batch; $i -lt $plan.additions.Count; $i+=$Batches) {
  $entry=$plan.additions[$i]
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Method Head -TimeoutSec 12 -Uri $entry.app.code -ErrorAction Stop
    @{id=$entry.id;status=[int]$response.StatusCode;host=$response.BaseResponse.ResponseUri.Host;contentType=$response.Headers['Content-Type']} | ConvertTo-Json -Compress
  } catch {
    # Some hosts reject HEAD. Read GET headers only; never download/execute the APK.
    $request = [Net.HttpWebRequest]::Create($entry.app.code)
    $request.Method = 'GET'; $request.Timeout = 10000; $request.ReadWriteTimeout = 10000
    $request.AddRange(0,0)
    $response = $null
    try {
      $response = $request.GetResponse()
      @{id=$entry.id;status=[int]$response.StatusCode;host=$response.ResponseUri.Host;contentType=$response.ContentType;method='GET headers'} | ConvertTo-Json -Compress
    } catch { @{id=$entry.id;status=0} | ConvertTo-Json -Compress }
    finally { if ($response) { $response.Close() }; $request.Abort() }
  }
}
