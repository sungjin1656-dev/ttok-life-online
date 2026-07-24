@echo off
setlocal
title TTOK LIFE INSTALL
cd /d "%~dp0"

echo.
echo ==========================================
echo          TTOK LIFE V1 INSTALL
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Please install Node.js 20 or newer, then run this file again.
  echo https://nodejs.org
  echo.
  pause
  exit /b 1
)

echo Node version:
node -v
echo.
echo Installing required packages...
echo This may take several minutes the first time.
echo.

call npm install
if errorlevel 1 (
  echo.
  echo [ERROR] npm install failed.
  echo Check your internet connection and firewall.
  echo.
  pause
  exit /b 1
)

echo.
echo ==========================================
echo Installation completed successfully.
echo Now double-click 2_RUN.bat
echo ==========================================
echo.
pause
endlocal
