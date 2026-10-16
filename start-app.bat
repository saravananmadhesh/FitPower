@echo off
title FitPower
cd /d "%~dp0"
echo.
echo  ==========================================
echo    FitPower - starting on http://localhost:5173
echo  ==========================================
echo.

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Install the LTS version from https://nodejs.org and try again.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo First run - installing dependencies, this can take a few minutes...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: npm install failed.
        pause
        exit /b 1
    )
)

:: Free port 5173 so the app always lands on the same address. Your data
:: (localStorage/IndexedDB) is saved against http://localhost:5173 exactly;
:: a different port is a different origin with none of it.
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Open the browser as soon as the server answers (the build runs first).
start "" /min powershell -NoProfile -Command "for($i=0;$i -lt 300;$i++){try{Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://localhost:5173 | Out-Null; Start-Process 'http://localhost:5173'; break}catch{Start-Sleep 1}}"

:: Build the app and serve it. vite.config.ts makes the port strict, so this
:: fails loudly instead of drifting to another port if 5173 is still busy.
call npm start

pause
