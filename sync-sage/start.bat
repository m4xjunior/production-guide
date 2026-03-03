@echo off
REM ============================================================
REM  sage-operator-sync — iniciar sincronizacao continua
REM  Executa em loop: sync Operarios + Referencias a cada 60s
REM ============================================================

cd /d "%~dp0"

IF NOT EXIST "node_modules" (
    echo [SETUP] Instalando dependencias...
    call npm install
)

echo [SAO] Iniciando sync Sage → Neon...
echo [SAO] Pressione Ctrl+C para parar.
echo.

call npx tsx src/index.ts
