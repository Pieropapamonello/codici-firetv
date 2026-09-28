param([int]$Batch = 0, [int]$Batches = 4, [string]$IconPlanPath = '')
$icons = if ($IconPlanPath) { Get-Content -Raw -Encoding UTF8 $IconPlanPath | ConvertFrom-Json } else { node "$PSScriptRoot/prepare-source-icons.mjs" | ConvertFrom-Json }
$folder = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/assets/catalog'))
New-Item -ItemType Directory -Force -Path $folder | Out-Null
for ($i=$Batch; $i -lt $icons.Count; $i+=$Batches) {
  $icon=$icons[$i]
  $temp=Join-Path $folder ($icon.file+'.download')
  try {
    $response=Invoke-WebRequest -UseBasicParsing -TimeoutSec 15 -Uri $icon.url -OutFile $temp -PassThru -ErrorAction Stop
    $mime=($response.Headers['Content-Type'] -split ';')[0]
    $ext=switch ($mime) { 'image/png' {'png'} 'image/jpeg' {'jpg'} 'image/webp' {'webp'} default {''} }
    if (-not $ext -or (Get-Item -LiteralPath $temp).Length -gt 2097152) { throw 'Unsupported image' }
    $target=Join-Path $folder ($icon.file+'.'+$ext)
    Move-Item -LiteralPath $temp -Destination $target -Force
    @{name=$icon.name;path=('/assets/catalog/'+$icon.file+'.'+$ext);source=$icon.source;original=$icon.url} | ConvertTo-Json -Compress
  } catch { @{name=$icon.name;error='Icon not confirmed'} | ConvertTo-Json -Compress }
  finally { if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp } }
}
