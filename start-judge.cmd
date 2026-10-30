@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 exit /b 1
if exist ".tools\node\node-v24.22.1-win-x64\node.exe" set "PATH=%CD%\.tools\node\node-v24.22.1-win-x64;%PATH%"
where node.exe >nul 2>&1
if errorlevel 1 (
  echo Install Node 24 LTS first. See docs\JUDGE_GUIDE.md.
  popd
  exit /b 1
)
node.exe "ops\judge.mjs" start
set "playableExitCode=%ERRORLEVEL%"
popd
exit /b %playableExitCode%
