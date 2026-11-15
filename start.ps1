Set-Location "$PSScriptRoot\CampusWire-Ready-Folder"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "                CampusWire Complete v3 Launcher                       " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "[ERROR] Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js 20+ from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Free previous processes on port 3000 and 2121 if running
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "Stopping previous process on port 3000 (PID $($_.OwningProcess))..." -ForegroundColor Yellow
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
Get-NetTCPConnection -LocalPort 2121 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "Stopping previous process on port 2121 (PID $($_.OwningProcess))..." -ForegroundColor Yellow
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

Write-Host "Starting Full Backend + Frontend Server..." -ForegroundColor Green
Write-Host "Web UI / API:  http://localhost:3000" -ForegroundColor White
Write-Host "TCP Service:   Port 2121" -ForegroundColor White
Write-Host ""
Write-Host "Launching your default browser to http://localhost:3000..." -ForegroundColor Green

Start-Process "http://localhost:3000"

node server.js
