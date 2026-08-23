$root = Join-Path $PSScriptRoot '..\src'
$f = Get-ChildItem -Path $root -Recurse -Include *.tsx,*.ts,*.css
$lines = 0
foreach ($x in $f) { $lines += (Get-Content $x.FullName | Measure-Object -Line).Lines }
Write-Output ("TOTAL files=" + $f.Count + " lines=" + $lines)
Get-ChildItem -Path (Join-Path $root 'pages') -Directory | ForEach-Object {
  $c = Get-ChildItem $_.FullName -Recurse -Include *.tsx,*.ts,*.css
  $l = 0
  foreach ($y in $c) { $l += (Get-Content $y.FullName | Measure-Object -Line).Lines }
  Write-Output ($_.Name + " files=" + $c.Count + " lines=" + $l)
}
$comp = Get-ChildItem -Path (Join-Path $root 'components') -Recurse -Include *.tsx,*.ts,*.css
$cl = 0
foreach ($y in $comp) { $cl += (Get-Content $y.FullName | Measure-Object -Line).Lines }
Write-Output ("components files=" + $comp.Count + " lines=" + $cl)
$shots = Get-ChildItem -Path (Join-Path $PSScriptRoot '..\scripts') -Filter *-shot*.cjs
Write-Output ("shot-scripts=" + ($shots.Count + (Get-ChildItem -Path (Join-Path $PSScriptRoot '..\scripts') -Filter *shots.cjs).Count))
