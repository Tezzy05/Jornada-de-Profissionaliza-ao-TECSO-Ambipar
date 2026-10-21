@echo off
chcp 65001 >nul
title Jornada TECSO - modo desenvolvimento
rem Para quem vai alterar o codigo. Precisa do Node.js 18 ou mais novo: https://nodejs.org
where node >nul 2>nul || (echo Node.js nao encontrado. Instale em https://nodejs.org e rode de novo. & pause & exit /b 1)
cd /d "%~dp0sistema"
if not exist node_modules (echo Instalando dependencias, aguarde... & call npm install || (pause & exit /b 1))
echo Abrindo em http://localhost:5173 ...
call npm run dev
pause
