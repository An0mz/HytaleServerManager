@echo off
echo Starting Hytale Server Manager (Development Mode)
echo.

REM Start backend
echo Starting backend on port 3000...
start "Backend" cmd /k "cd backend && npm run dev"

REM Wait a moment for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend
echo Starting frontend on port 5173...
start "Frontend" cmd /k "cd frontend && npm start"

echo.
echo Both servers are starting...
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
