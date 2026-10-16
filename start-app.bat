@echo off
title FitPower Dashboard
cd /d "%~dp0"
echo.
echo  ==========================================
echo    FitPower Dashboard - Starting on port 5173
echo  ==========================================
echo.

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Install it from https://nodejs.org and try again.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo First run detected - installing dependencies, this can take a minute...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: npm install failed.
        pause
        exit /b 1
    )
)

:: Kill anything already on 5173 so restart is always clean AND always lands
:: on the same port. Your data (localStorage/IndexedDB) is saved against
:: http://localhost:5173 specifically - a different port is a different
:: origin with none of it, so this step is what keeps your data intact.
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173 "') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Give the OS a moment to release the port
timeout /t 1 /nobreak >nul

:: Open the browser once the dev server has had a moment to boot
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:5173"

:: Start the dev server. vite.config.ts sets strictPort: true, so this fails
:: loudly instead of silently drifting to 5174+ if 5173 is somehow still busy.
call npm run dev

pause
