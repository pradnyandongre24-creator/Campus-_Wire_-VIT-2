# CampusWire Complete v3.0 Launcher (PowerShell)
Clear-Host
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "                CAMPUSWIRE COMPLETE v3.0 LAUNCHER                     " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Select an option:" -ForegroundColor Yellow
Write-Host "  [1] Open Interactive Web Portal in Browser (Instant Preview)" -ForegroundColor White
Write-Host "  [2] Start Node.js Backend Server & TCP Daemon (Port 3000 / 2121)" -ForegroundColor White
Write-Host "  [3] Open Both (Server + Browser Portal)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1, 2, or 3) [Default: 1]"
if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

$portalUrl = "file:///C:/Users/PRADNYAN/.gemini/antigravity/brain/862d99e0-58e3-42bf-8292-a08ab58687fd/campuswire_preview.html"
$serverDir = Join-Path $PSScriptRoot "CampusWire-Ready-Folder"

switch ($choice) {
    "1" {
        Write-Host "Opening interactive application in your default browser..." -ForegroundColor Green
        Start-Process $portalUrl
    }
    "2" {
        Write-Host "Starting Node.js server on http://localhost:3000..." -ForegroundColor Green
        Set-Location $serverDir
        node server.js
    }
    "3" {
        Write-Host "Starting Node.js server in a separate process..." -ForegroundColor Green
        Start-Process cmd.exe -ArgumentList "/k cd /d `"$serverDir`" && node server.js"
        Start-Sleep -Seconds 1
        Write-Host "Opening browser..." -ForegroundColor Green
        Start-Process $portalUrl
    }
    Default {
        Start-Process $portalUrl
    }
}

Write-Host "Done! CampusWire is running." -ForegroundColor Cyan
