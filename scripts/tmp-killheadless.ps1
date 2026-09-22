$procs = Get-CimInstance Win32_Process -Filter "Name='chrome.exe'"
$hl = @($procs | Where-Object { $_.CommandLine -match 'headless' })
Write-Output ("headless chrome count: " + $hl.Count)
if ($hl.Count -gt 0) {
  $hl | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Write-Output "killed"
}
