@echo off
title CampusWire Unified Portal Launcher
cls
echo ======================================================================
echo                CAMPUSWIRE COMPLETE v3.0 LAUNCHER
echo ======================================================================
echo.
echo Select an option:
echo   [1] Open Interactive Web Portal in Default Browser (Instant Preview)
echo   [2] Start Node.js Backend Server & TCP Socket Daemon (Port 3000 / 2121)
echo   [3] Open Both (Server + Browser Portal)
echo.
set /p choice="Enter your choice (1, 2, or 3) [Default: 1]: "
if "%choice%"=="" set choice=1

if "%choice%"=="1" goto launch_browser
if "%choice%"=="2" goto launch_server
if "%choice%"=="3" goto launch_both

:launch_browser
echo.
echo Opening interactive application in your default browser...
start "" "file:///C:/Users/PRADNYAN/.gemini/antigravity/brain/862d99e0-58e3-42bf-8292-a08ab58687fd/campuswire_preview.html"
echo Application launched!
timeout /t 3 >nul
exit

:launch_server
echo.
cd /d "%~dp0CampusWire-Ready-Folder"
echo Starting CampusWire Node.js Server on http://localhost:3000...
node server.js
pause
exit

:launch_both
echo.
echo Starting Node.js Server in a new window...
start "CampusWire Server" cmd /k "cd /d %~dp0CampusWire-Ready-Folder && node server.js"
echo Opening browser...
start "" "file:///C:/Users/PRADNYAN/.gemini/antigravity/brain/862d99e0-58e3-42bf-8292-a08ab58687fd/campuswire_preview.html"
echo All systems running!
timeout /t 3 >nul
exit
