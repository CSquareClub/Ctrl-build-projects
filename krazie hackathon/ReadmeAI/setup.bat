@echo off
REM ReadmeAI Setup Script for Windows

echo.
echo 🚀 ReadmeAI - Smart README Generator Setup
echo ==========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install it from https://nodejs.org
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>nul
if errorlevel 1 (
    echo ❌ Python 3 is not installed. Please install it from https://python.org
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i

echo ✅ Node.js version: %NODE_VERSION%
echo ✅ Python version: %PYTHON_VERSION%
echo.

REM Setup Frontend
echo 📦 Setting up Frontend...
cd frontend
call npm install
echo ✅ Frontend ready!
echo.

REM Setup Backend
echo 🐍 Setting up Backend...
cd ..\backend

REM Create virtual environment
if not exist "venv" (
    python -m venv venv
    echo ✅ Virtual environment created
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
pip install -r requirements.txt
echo ✅ Backend dependencies installed

REM Copy environment file
if not exist ".env" (
    copy .env.example .env
    echo ✅ .env file created (update with your settings)
)

echo.
echo ==========================================
echo ✅ Setup Complete!
echo ==========================================
echo.
echo 📖 Next Steps:
echo.
echo 1. Start the Backend:
echo    cd backend
echo    venv\Scripts\activate.bat
echo    python app.py
echo.
echo 2. Start the Frontend (in another terminal):
echo    cd frontend
echo    npm run dev
echo.
echo 3. Open http://localhost:3000 in your browser
echo.
echo Happy coding! 🎉
echo.
pause
