@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 exit /b 1

where node.exe >nul 2>&1
if errorlevel 1 (
  echo Node.js 24 is required. Install it, then reopen your terminal.
  popd
  exit /b 1
)
if not exist "node_modules\tsx\dist\cli.mjs" (
  echo Project dependencies are missing. Follow the fresh installation steps in README.md.
  popd
  exit /b 1
)

node.exe "node_modules\tsx\dist\cli.mjs" "ops\manage.ts" doctor
if errorlevel 1 (
  popd
  exit /b 1
)
echo.
echo Keep this terminal open. Press Ctrl+C to stop Playable Moments.
node.exe "node_modules\tsx\dist\cli.mjs" "ops\dev.ts"
set "playableExitCode=%ERRORLEVEL%"
popd
exit /b %playableExitCode%
