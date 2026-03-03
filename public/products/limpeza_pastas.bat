@ECHO OFF
REM Este script percorre cada subdiretório e apaga pastas específicas.

SETLOCAL ENABLEDELAYEDEXPANSION

REM Define o diretório base onde o script está localizado.
SET "BASE_DIR=%~dp0"

ECHO Iniciando limpeza de pastas em: %BASE_DIR%

REM Loop através de cada pasta de produto (ex: 00610, 00612, etc.)
FOR /D %%p IN ("%BASE_DIR%*") DO (
    ECHO Processando produto: %%~nxp

    REM Define os nomes das pastas a serem apagadas
    SET "PASTA_A_APAGAR_1=formacion laboral"
    SET "PASTA_A_APAGAR_2=obsoleto"

    REM Caminho para a pasta "formacion laboral"
    SET "DIR_PARA_APAGAR_1=%%p\!PASTA_A_APAGAR_1!"
    REM Caminho para a pasta "obsoleto"
    SET "DIR_PARA_APAGAR_2=%%p\!PASTA_A_APAGAR_2!"

    REM Verifica e apaga "formacion laboral"
    IF EXIST "!DIR_PARA_APAGAR_1!" (
        ECHO   -> Apagando "!PASTA_A_APAGAR_1!"...
        RMDIR /S /Q "!DIR_PARA_APAGAR_1!"
        ECHO      ...Apagada.
    ) ELSE (
        ECHO   -  A pasta "!PASTA_A_APAGAR_1!" não foi encontrada.
    )

    REM Verifica e apaga "obsoleto"
    IF EXIST "!DIR_PARA_APAGAR_2!" (
        ECHO   -> Apagando "!PASTA_A_APAGAR_2!"...
        RMDIR /S /Q "!DIR_PARA_APAGAR_2!"
        ECHO      ...Apagada.
    ) ELSE (
        ECHO   -  A pasta "!PASTA_A_APAGAR_2!" não foi encontrada.
    )

    ECHO.
)

ECHO Limpeza concluída.
PAUSE
