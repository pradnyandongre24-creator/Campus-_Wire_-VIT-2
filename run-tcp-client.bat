@echo off
title CampusWire TCP Client
cd /d "%~dp0CampusWire-Ready-Folder"

echo ======================================================================
echo                  CampusWire TCP Client Terminal
echo ======================================================================
echo.
echo Commands you can run once connected:
echo   login faculty faculty123
echo   list
echo   put ./test.txt "Important Notice" students
echo   get <NOTICE_ID>
echo   quit
echo ======================================================================
echo.

node tcp-client.js
pause
