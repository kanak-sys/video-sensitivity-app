@echo off
echo ========================================
echo Video Sensitivity Backend Setup (Windows)
echo ========================================
echo.

echo Step 1: Creating required directories...
if not exist "uploads" mkdir uploads
if not exist "uploads\thumbnails" mkdir uploads\thumbnails
if not exist "temp" mkdir temp
echo [OK] Directories ready
echo.

echo Step 2: Checking .env file...
if not exist ".env" (
    echo [WARN] .env not found
    echo Copying from .env.example
    copy .env.example .env
    echo Please EDIT .env before running server
) else (
    echo [OK] .env file exists
)
echo.

echo Step 3: Installing dependencies...
call npm install
echo [OK] Dependencies installed
echo.

echo ========================================
echo SETUP COMPLETE
echo ========================================
echo.
echo Next steps:
echo 1. Ensure MongoDB Atlas is accessible
echo 2. Edit .env with real secrets
echo 3. Start server using:
echo    npm run dev
echo ========================================
pause
