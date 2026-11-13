@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
echo Starting Alder & Code Studio Go-to-Market Web App at http://127.0.0.1:4173/
call npm run start

