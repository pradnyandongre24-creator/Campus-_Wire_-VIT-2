# CampusWire Complete v3 - 1-Click PowerShell ZIP Creator
$currentDir = $PSScriptRoot
if (-not $currentDir) { $currentDir = Get-Location }
$zipName = "CampusWire-Complete-v3.zip"
$localDest = Join-Path $currentDir $zipName
$parentDir = Split-Path $currentDir -Parent
$parentDest = Join-Path $parentDir $zipName

if (Test-Path $localDest) { Remove-Item $localDest -Force }
if (Test-Path $parentDest) { Remove-Item $parentDest -Force }

Write-Host "Gathering project files..." -ForegroundColor Cyan
$items = Get-ChildItem -Path $currentDir -Exclude 'node_modules', '*.zip' | Select-Object -ExpandProperty FullName

Write-Host "Compressing all files and directories into $zipName..." -ForegroundColor Cyan
Compress-Archive -Path $items -DestinationPath $localDest -CompressionLevel Optimal
Copy-Item -Path $localDest -Destination $parentDest -Force

Write-Host "`n======================================================================" -ForegroundColor Green
Write-Host "SUCCESS! ZIP Archive created successfully in two convenient locations:" -ForegroundColor Green
Write-Host "1. In Downloads:       $parentDest" -ForegroundColor Yellow
Write-Host "2. In Project Folder:  $localDest" -ForegroundColor Yellow
Write-Host "======================================================================`n" -ForegroundColor Green
