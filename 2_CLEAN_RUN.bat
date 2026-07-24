@echo off
setlocal
title TTOK LIFE FARM CLEAN START
cd /d "%~dp0"

taskkill /F /IM node.exe >nul 2>nul

if not exist "node_modules" (
  call "1_INSTALL.bat"
  if errorlevel 1 exit /b 1
)

start "TTOK LIFE SERVER" cmd /c "npm run dev -- -H 0.0.0.0 -p 3021"
timeout /t 6 /nobreak >nul
start "" "http://localhost:3021"
pause
endlocal
