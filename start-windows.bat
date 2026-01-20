@echo off
title Hytale Server Manager - Launcher
color 0B
echo.
echo  ===============================================
echo   Hytale Server Manager - Development Launcher
echo  ===============================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check and install backend dependencies
echo [1/4] Installing backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Failed to install backend dependencies!
    pause
    exit /b 1
)
cd ..
echo [SUCCESS] Backend dependencies installed!

REM Check and install frontend dependencies
echo [2/4] Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Failed to install frontend dependencies!
    pause
    exit /b 1
)
cd ..
echo [SUCCESS] Frontend dependencies installed!

echo.
echo  ===============================================
echo   Starting Servers...
echo  ===============================================
echo.

REM Start backend
echo [3/4] Starting backend on port 3000...
start "Hytale Manager - Backend" cmd /k "cd backend && npm run dev"

REM Wait for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend
echo [4/4] Starting frontend on port 5173...
start "Hytale Manager - Frontend" cmd /k "cd frontend && npm start"

echo.
echo  ===============================================
echo   Servers are starting!
echo  ===============================================
echo.
echo   Backend:  http://localhost:3000
echo   Frontend: http://localhost:5173
echo.
echo   Press any key to close this window...
echo  ===============================================
pause >nul
