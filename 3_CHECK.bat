@echo off
setlocal
title TTOK LIFE CHECK
cd /d "%~dp0"

if not exist "node_modules" (
  echo [ERROR] Packages are not installed.
  echo Run 1_INSTALL.bat first.
  pause
  exit /b 1
)

echo Running TypeScript check...
call npm run typecheck
if errorlevel 1 goto error

echo.
echo Running production build check...
call npm run build
if errorlevel 1 goto error

echo.
echo ==========================================
echo All checks completed successfully.
echo ==========================================
pause
exit /b 0

:error
echo.
echo [ERROR] A check failed.
pause
exit /b 1
