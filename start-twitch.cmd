@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 exit /b 1
where node.exe >nul 2>&1
if errorlevel 1 (
  echo Node.js 24 is required. Reopen your terminal after installing it.
  popd
  exit /b 1
)
if not exist ".env.twitch" (
  echo Run this in PowerShell first: powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\setup-twitch.ps1
  popd
  exit /b 1
)
if not exist "node_modules\tsx\dist\cli.mjs" (
  echo Project dependencies are missing. See README.md.
  popd
  exit /b 1
)
set "APP_MODE=real"
node.exe --env-file=".env.twitch" "node_modules\tsx\dist\cli.mjs" "ops\manage.ts" doctor
if errorlevel 1 (
  popd
  exit /b 1
)
echo Keep this terminal open. Press Ctrl+C to stop Playable Moments.
node.exe --env-file=".env.twitch" "node_modules\tsx\dist\cli.mjs" "ops\dev.ts"
set "playableExitCode=%ERRORLEVEL%"
popd
exit /b %playableExitCode%
