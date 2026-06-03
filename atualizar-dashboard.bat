@echo off
REM ============================================================
REM  atualizar-dashboard.bat
REM  Gera o snapshot de KPIs e publica no GitHub Pages.
REM  Agende no Agendador de Tarefas do Windows (ex: 06h00).
REM ============================================================

set REPO_DIR=D:\LOKADORA\git_dash\dashboard
set SCRIPT=gerar-kpis.js

cd /d "%REPO_DIR%"

echo.
echo === Gerando snapshot de KPIs ===
node "%SCRIPT%"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERRO: a geracao do kpis.json falhou. Nada foi enviado ao Git.
    exit /b 1
)

echo.
echo === Publicando no GitHub ===
git add docs/kpis.json
git commit -m "snapshot KPIs %date% %time%"
git push

echo.
echo === Concluido ===
