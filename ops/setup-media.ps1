$ErrorActionPreference = 'Stop'
$projectDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$toolsDir = Join-Path $projectDir '.tools'
$archive = Join-Path $toolsDir 'ffmpeg.zip'
$destination = Join-Path $toolsDir 'ffmpeg-extracted'
$binary = Join-Path $destination 'ffmpeg-9.0.2-essentials_build\bin\ffmpeg.exe'
if (Test-Path -LiteralPath $binary) { & $binary -version | Select-Object -First 1; exit 0 }
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
$expectedHash = '60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba'
if (!(Test-Path -LiteralPath $archive)) {
  Invoke-WebRequest -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile $archive
}
$actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToLowerInvariant()
if ($actualHash -ne $expectedHash) { throw 'Archive does not match the tested FFmpeg 9.0.2 build. Review the upstream release before updating the pinned checksum, or configure current system FFmpeg/FFprobe paths in .env.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$pack = [System.IO.Compression.ZipFile]::OpenRead($archive)
try {
  foreach ($entry in $pack.Entries) {
    $target = [System.IO.Path]::GetFullPath((Join-Path $destination $entry.FullName))
    if (!$target.StartsWith($destination + [System.IO.Path]::DirectorySeparatorChar)) { throw 'Unsafe archive path' }
    if (!$entry.Name) { [System.IO.Directory]::CreateDirectory($target) | Out-Null; continue }
    [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($target)) | Out-Null
    if (!(Test-Path -LiteralPath $target)) { [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target) }
  }
} finally { $pack.Dispose() }
& $binary -version | Select-Object -First 1
Write-Output 'FFmpeg and FFprobe installed inside .tools. No system settings changed.'
