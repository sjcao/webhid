@echo off
echo Setting temporary PATH for Node.js...
SET PATH=C:\Program Files\nodejs;%PATH%

echo Starting Development Server...
npm run dev

pause
