@echo off
title CampusWire Backend Server & TCP Daemon
cd /d "%~dp0CampusWire-Ready-Folder"
echo ======================================================================
echo             Starting CampusWire Node.js Backend Server
echo ======================================================================
echo Web Port : http://localhost:3000
echo TCP Port : 2121 (Control) / 2122 (Data)
echo ======================================================================
echo.
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in your system PATH.
    echo Please install Node.js from https://nodejs.org or use open-software.bat for the standalone portal.
    pause
    exit /b
)
node server.js
pause
