@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
    echo Instale o Node.js 24 ou superior e abra este arquivo novamente.
    pause
    exit /b 1
)
echo Abra http://localhost:5000 no navegador.
echo Pressione Ctrl+C para encerrar a agenda.
node app.js
pause
