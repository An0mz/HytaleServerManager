@echo off
echo ========================================
echo   Hytale Server Manager - Windows
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js is installed
node --version
echo.

REM Check if npm packages are installed in backend
if not exist "backend\node_modules\" (
    echo [INFO] Installing backend dependencies...
    cd backend
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install backend dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
) else (
    echo [OK] Backend dependencies already installed
)

REM Check if npm packages are installed in frontend
if not exist "frontend\node_modules\" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install frontend dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
) else (
    echo [OK] Frontend dependencies already installed
)

REM Create .env file if it doesn't exist
if not exist "backend\.env" (
    echo [INFO] Creating .env file...
    copy backend\.env.example backend\.env >nul
)

REM Create data directories
if not exist "servers" mkdir servers
if not exist "backups" mkdir backups
if not exist "data" mkdir data

echo.
echo ========================================
echo   Starting Hytale Server Manager
echo ========================================
echo.
echo [INFO] Backend will start on: http://localhost:3000
echo [INFO] Frontend will start on: http://localhost:3001
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Start backend in new window
start "Hytale Manager - Backend" cmd /k "cd backend && npm start"

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in new window
start "Hytale Manager - Frontend" cmd /k "cd frontend && npm start"

echo.
echo [OK] Both servers are starting in separate windows
echo [OK] Wait a few seconds and then open: http://localhost:3001
echo.
echo To stop the servers, close the server windows or press Ctrl+C in them.
echo.
pause
