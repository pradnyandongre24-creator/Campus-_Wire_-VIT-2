@echo off
title Push CampusWire Software to GitHub
cls
echo ======================================================================
echo             CAMPUSWIRE SOFTWARE - GITHUB PUSH UTILITY
echo ======================================================================
echo.
echo Note: This utility will push ONLY the software code, backend server,
echo       TCP socket daemons, and interactive dashboard to GitHub.
echo       All paper drafts, patent proposals, and presentations are
echo       automatically excluded via .gitignore.
echo.
echo ======================================================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in your system PATH.
    echo Please install Git for Windows from: https://git-scm.com/download/win
    echo Then run this script again.
    echo.
    pause
    exit /b
)

echo [1/5] Checking Git repository initialization...
if not exist ".git" (
    git init -b main
    echo Git repository initialized on branch 'main'.
) else (
    git branch -M main
    echo Existing Git repository found.
)

echo.
echo [2/5] Staging software files (excluding paper works and drafts)...
git add .

echo.
echo [3/5] Creating commit...
git commit -m "feat: complete CampusWire v3.0 release with dual-channel TCP socket architecture, concurrency control, and interactive dashboard"

echo.
echo ======================================================================
echo [4/5] GitHub Remote Repository Setup
echo ======================================================================
echo.
echo Please create a new empty repository on https://github.com/new
echo (Do NOT check 'Add a README' or '.gitignore' on GitHub)
echo.
set /p REPO_URL="Paste your GitHub repository URL (e.g. https://github.com/USERNAME/CampusWire.git): "

if "%REPO_URL%"=="" (
    echo [ERROR] Repository URL cannot be empty.
    pause
    exit /b
)

git remote remove origin >nul 2>nul
git remote add origin %REPO_URL%
echo Remote 'origin' configured to: %REPO_URL%

echo.
echo [5/5] Pushing software to GitHub (branch: main)...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ======================================================================
    echo  SUCCESS: CampusWire software has been successfully pushed to GitHub!
    echo ======================================================================
    echo.
) else (
    echo.
    echo [!] Push failed or authentication needed.
    echo If this is a private repo, please ensure you are signed into GitHub CLI or have
    echo entered a valid GitHub Personal Access Token (PAT).
    echo.
    echo You can also retry pushing manually at any time by running:
    echo     git push -u origin main
    echo.
)

pause
