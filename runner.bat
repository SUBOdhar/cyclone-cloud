@echo off
:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting admin access...
    powershell -Command "Start-Process cmd -ArgumentList '/c cd /d %CD% && %~s0' -Verb RunAs"
    exit /b
)

:: Now running as admin, ensure we are in the correct directory
cd /d %~dp0

:: Run build.cmd
call build.cmd

:: Navigate to the server directory and run commands
cd server
call npm install
node index.js
