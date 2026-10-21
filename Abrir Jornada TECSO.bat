@echo off
chcp 65001 >nul
rem Abre o prototipo no navegador padrao. Nao precisa de internet nem de instalar nada.
start "" "%~dp0app\index.html"
