@echo off
REM ============================================================
REM  install-service.bat
REM  Registra sync-sage como Servico Windows com NSSM
REM  Requer: NSSM instalado (https://nssm.cc/download)
REM  Execute como ADMINISTRADOR
REM ============================================================

SET SERVICE_NAME=SageOperatorSync
SET SYNC_DIR=%~dp0
SET NODE_EXE=node

REM Verificar se NSSM esta disponivel
where nssm >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERRO: nssm.exe nao encontrado no PATH.
    echo Baixe em: https://nssm.cc/download
    echo Coloque nssm.exe em C:\Windows\System32\ ou na mesma pasta.
    pause
    exit /b 1
)

REM Verificar se Node.js esta disponivel
where node >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERRO: node.exe nao encontrado.
    echo Instale Node.js em: https://nodejs.org (versao LTS)
    pause
    exit /b 1
)

REM Obter caminho completo do node
FOR /F "tokens=*" %%i IN ('where node') DO SET NODE_EXE=%%i

REM Remover servico antigo se existir
nssm stop %SERVICE_NAME% 2>nul
nssm remove %SERVICE_NAME% confirm 2>nul

REM Instalar dependencias
cd /d "%SYNC_DIR%"
IF NOT EXIST "node_modules" (
    echo Instalando dependencias npm...
    call npm install
)

REM Instalar servico
nssm install %SERVICE_NAME% "%NODE_EXE%" "node_modules\.bin\tsx" "src\index.ts"
nssm set %SERVICE_NAME% AppDirectory "%SYNC_DIR%"
nssm set %SERVICE_NAME% DisplayName "SAO - Sage Operator Sync"
nssm set %SERVICE_NAME% Description "Sincroniza operarios e referencias do Sage para o banco Neon PostgreSQL"
nssm set %SERVICE_NAME% Start SERVICE_AUTO_START
nssm set %SERVICE_NAME% AppStdout "%SYNC_DIR%logs\sync.log"
nssm set %SERVICE_NAME% AppStderr "%SYNC_DIR%logs\sync-error.log"
nssm set %SERVICE_NAME% AppRotateFiles 1
nssm set %SERVICE_NAME% AppRotateBytes 10485760

REM Criar pasta de logs
mkdir "%SYNC_DIR%logs" 2>nul

REM Iniciar servico
nssm start %SERVICE_NAME%

echo.
echo ============================================================
echo  Servico "%SERVICE_NAME%" instalado e iniciado!
echo  Logs: %SYNC_DIR%logs\sync.log
echo  Para parar:    nssm stop %SERVICE_NAME%
echo  Para remover:  nssm remove %SERVICE_NAME% confirm
echo ============================================================
pause
