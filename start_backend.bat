@echo off
title Start Antigravity3D Backend

echo ==============================================
echo Installing Python Requirements...
echo ==============================================
cd server
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ----------------------------------------------
    echo ERROR: Failed to install Python packages.
    echo Please make sure you have Python installed!
    echo ----------------------------------------------
    pause
    exit /b
)

if not exist "outputs" mkdir outputs
if not exist "uploads" mkdir uploads

echo.
echo ==============================================
echo Starting FastAPI Background Server...
echo ==============================================
echo You must leave this black window OPEN for 3D Maker to work!
echo.
python -m uvicorn main:app --reload --port 8000

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ----------------------------------------------
    echo ERROR: Server crashed or failed to start!
    echo Please share this error message with Antigravity.
    echo ----------------------------------------------
    pause
)
