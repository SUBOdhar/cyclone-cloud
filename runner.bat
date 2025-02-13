@echo off
REM Open first Command Prompt window for the server
start cmd /k "cd /d C:\Users\aryal\source\codes\fireo\server && node index.js"

REM Open second Command Prompt window for cyclone_web
start cmd /k "cd /d C:\Users\aryal\source\codes\fireo\cyclone_web && npm run dev"
