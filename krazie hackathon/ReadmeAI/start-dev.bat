@echo off
REM ReadmeAI Development - Start Both Services (Windows)

setlocal enabledelayedexpansion

echo 🚀 Starting ReadmeAI Development Environment...
echo.

REM Check if both directories exist
if not exist "frontend\" (
    echo ❌ Error: frontend directory not found
    exit /b 1
)

if not exist "backend\" (
    echo ❌ Error: backend directory not found
    exit /b 1
)

echo 📍 Starting backend on http://localhost:5000...
cd backend

REM Activate virtual environment if it exists
if exist "venv\" (
    call venv\Scripts\activate.bat
)

start "ReadmeAI Backend" python app.py
echo ✅ Backend started
echo.

REM Go back to root
cd ..

timeout /t 2 /nobreak > nul

echo 📍 Starting frontend on http://localhost:3000...
cd frontend
start "ReadmeAI Frontend" npm run dev
echo ✅ Frontend started
echo.

echo ==========================================
echo ✅ Both services are running!
echo ==========================================
echo.
echo Frontend:  http://localhost:3000
echo Backend:   http://localhost:5000
echo.
echo Check the separate windows for logs
echo.
pause
