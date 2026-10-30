$ErrorActionPreference = 'Stop'
$judgeRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or -not [Environment]::Is64BitOperatingSystem) {
  throw 'This helper targets Windows x64. See docs/JUDGE_GUIDE.md for prerequisites.'
}
Push-Location $judgeRoot
try {
  $judgePortable = Join-Path $judgeRoot '.tools/node/node-v24.22.1-win-x64'
  if (Test-Path -LiteralPath (Join-Path $judgePortable 'node.exe')) { $env:PATH = $judgePortable + ';' + $env:PATH }
  $judgeNode = Get-Command node.exe -ErrorAction SilentlyContinue
  $judgeNpx = Get-Command npx.cmd -ErrorAction SilentlyContinue
  if (-not $judgeNode -or -not $judgeNpx) { throw 'Install Node 24 LTS (including npm), reopen PowerShell, then retry. See docs/JUDGE_GUIDE.md.' }
  $judgeVersionText = & $judgeNode.Source --version
  if ($LASTEXITCODE -ne 0 -or $judgeVersionText -notmatch '^v24\.') { throw 'Use Node 24.22.1 or a newer Node 24 LTS release.' }
  if ([version]$judgeVersionText.TrimStart('v') -lt [version]'24.22.1') { throw 'Update Node to 24.22.1 or a newer Node 24 LTS security release, then reopen PowerShell.' }
  $judgeArchitecture = & $judgeNode.Source -p process.arch
  if ($LASTEXITCODE -ne 0 -or $judgeArchitecture -ne 'x64') { throw 'This verified setup requires Windows x64 and the x64 Node build.' }
  Write-Host '1/3 Installing the frozen project dependencies with pnpm 11.25.0 (no global pnpm installation).'
  & $judgeNpx.Source --yes pnpm@11.25.0 install --frozen-lockfile
  if ($LASTEXITCODE -ne 0) { throw 'Dependency install failed. Native SQLite may need Python 3 and Visual Studio C++ Build Tools; see docs/JUDGE_GUIDE.md. Nothing will be seeded.' }
  Write-Host '2/3 Preparing the checksum-pinned local FFmpeg tools.'
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'setup-media.ps1')
  if ($LASTEXITCODE -ne 0) { throw 'Media setup failed. Do not bypass the checksum; see docs/JUDGE_GUIDE.md.' }
  Write-Host '3/3 Checking tools and generating the original demo recording in data/judge-demo.'
  & $judgeNode.Source ops/judge.mjs prepare
  if ($LASTEXITCODE -ne 0) { throw 'Judge demo preparation failed; read the diagnostic above.' }
  Write-Host 'Complete. Run .\start-judge.cmd and open http://127.0.0.1:5180.'
} finally {
  Pop-Location
}
