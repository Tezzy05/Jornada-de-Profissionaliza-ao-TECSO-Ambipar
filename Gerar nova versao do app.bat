@echo off
chcp 65001 >nul
rem Gera de novo app\index.html e o modelo Excel em modelos\ depois de alterar o codigo.
where node >nul 2>nul || (echo Node.js nao encontrado. Instale em https://nodejs.org e rode de novo. & pause & exit /b 1)
cd /d "%~dp0sistema"
if not exist node_modules call npm install
call npm run build && call npm run modelo
echo.
echo Pronto. Abra "Abrir Jornada TECSO.bat".
pause
