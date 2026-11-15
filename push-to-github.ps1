# Push CampusWire Software to GitHub (PowerShell)
Clear-Host
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "             CAMPUSWIRE SOFTWARE - GITHUB PUSH UTILITY                " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Pushing ONLY software code, backend server, TCP daemon, and" -ForegroundColor Yellow
Write-Host "      interactive dashboard. Paper works, patents & PPTs are excluded." -ForegroundColor Yellow
Write-Host ""

$gitCheck = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCheck) {
    Write-Host "[ERROR] Git is not installed or not in your system PATH." -ForegroundColor Red
    Write-Host "Please install Git for Windows from: https://git-scm.com/download/win" -ForegroundColor White
    Read-Host "Press Enter to exit..."
    exit
}

Write-Host "[1/5] Checking Git repository initialization..." -ForegroundColor Cyan
if (-not (Test-Path ".git")) {
    git init -b main
    Write-Host "Git repository initialized on branch 'main'." -ForegroundColor Green
} else {
    git branch -M main
    Write-Host "Existing Git repository found." -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/5] Staging software files (excluding paper works & drafts)..." -ForegroundColor Cyan
git add .

Write-Host ""
Write-Host "[3/5] Creating commit..." -ForegroundColor Cyan
git commit -m "feat: complete CampusWire v3.0 release with dual-channel TCP socket architecture, concurrency control, and interactive dashboard"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "[4/5] GitHub Remote Repository Setup" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please create a new repository on https://github.com/new" -ForegroundColor Yellow
Write-Host "(Do NOT initialize with a README or .gitignore on GitHub)" -ForegroundColor Yellow
Write-Host ""

$repoUrl = Read-Host "Paste your GitHub repository URL (e.g. https://github.com/USERNAME/CampusWire.git)"
if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host "[ERROR] Repository URL cannot be empty." -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit
}

git remote remove origin 2>$null
git remote add origin $repoUrl
Write-Host "Remote 'origin' configured to: $repoUrl" -ForegroundColor Green

Write-Host ""
Write-Host "[5/5] Pushing to GitHub (branch: main)..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host " SUCCESS: CampusWire software has been successfully pushed to GitHub! " -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[!] Push failed or authentication required." -ForegroundColor Yellow
    Write-Host "Ensure you have permission to write to this repository." -ForegroundColor White
}

Read-Host "Press Enter to finish..."
