@echo off
setlocal
cd /d "%~dp0"
echo [1/3] Installing dependencies...
call npm install
if errorlevel 1 goto :fail
echo [2/3] Building locally...
call npm run build
if errorlevel 1 goto :fail
echo [3/3] Deploying to Vercel production...
call npx vercel --prod --force
if errorlevel 1 goto :fail
echo.
echo DEPLOYMENT COMPLETE.
pause
exit /b 0
:fail
echo.
echo DEPLOYMENT FAILED. Review the error above.
pause
exit /b 1
