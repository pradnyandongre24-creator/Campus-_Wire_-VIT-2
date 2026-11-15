@echo off
title CampusWire - 1-Click ZIP Creator
cls
echo ======================================================================
echo          CampusWire Complete v3 - 1-Click ZIP Package Creator
echo ======================================================================
echo.
echo Compressing all project files into CampusWire-Complete-v3.zip...
echo (Includes: Backend, TCP daemon, Web UI, 12-Slide PPT, IEEE Paper, Docs)
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$currentDir = Get-Location; ^
   $zipName = 'CampusWire-Complete-v3.zip'; ^
   $localDest = Join-Path $currentDir $zipName; ^
   $parentDir = Split-Path $currentDir -Parent; ^
   $parentDest = Join-Path $parentDir $zipName; ^
   if (Test-Path $localDest) { Remove-Item $localDest -Force }; ^
   if (Test-Path $parentDest) { Remove-Item $parentDest -Force }; ^
   Write-Host 'Gathering all project files and directories...' -ForegroundColor Cyan; ^
   $items = Get-ChildItem -Path . -Exclude 'node_modules', '*.zip' | Select-Object -ExpandProperty FullName; ^
   Write-Host 'Creating ZIP archive...' -ForegroundColor Cyan; ^
   Compress-Archive -Path $items -DestinationPath $localDest -CompressionLevel Optimal; ^
   Copy-Item -Path $localDest -Destination $parentDest -Force; ^
   Write-Host ''; ^
   Write-Host '======================================================================' -ForegroundColor Green; ^
   Write-Host 'SUCCESS! ZIP Archive created successfully in two convenient locations:' -ForegroundColor Green; ^
   Write-Host '1. In Downloads:       ' $parentDest -ForegroundColor Yellow; ^
   Write-Host '2. In Project Folder:  ' $localDest -ForegroundColor Yellow; ^
   Write-Host '======================================================================' -ForegroundColor Green;"

echo.
echo All files (Backend + TCP Server + Web UI + 12-Slide Presentation + IEEE Paper)
echo are now packaged into CampusWire-Complete-v3.zip!
echo.
echo Press any key to finish...
pause >nul
