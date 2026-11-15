@echo off
title CampusWire Complete v3
cd /d "%~dp0CampusWire-Ready-Folder"

echo ======================================================================
echo                 CampusWire Complete v3 Launcher
echo ======================================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not found in your PATH.
    echo Please install Node.js 20 or newer from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Starting Full Backend + Frontend Server...
echo Web UI / API:  http://localhost:3000
echo TCP Service:   Port 2121
echo.
echo Launching your default browser to http://localhost:3000
start "" "http://localhost:3000"

echo.
echo Server log output (keep this window open):
echo ----------------------------------------------------------------------
node server.js
pause
