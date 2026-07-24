@echo off
setlocal
title TTOK LIFE START SCREEN
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Please install Node.js 20 or newer.
  pause
  exit /b 1
)

if not exist "node_modules" (
  call "1_INSTALL.bat"
  if errorlevel 1 exit /b 1
)

echo.
echo ==========================================
echo TTOK LIFE START SCREEN
echo URL: http://localhost:3021
echo ==========================================
echo.

start "TTOK LIFE SERVER" cmd /c "npm run dev -- -H 0.0.0.0 -p 3021"
timeout /t 6 /nobreak >nul
start "" "http://localhost:3021"

echo.
echo The server is running in another window.
echo Close that server window when testing is finished.
echo.
pause
endlocal
