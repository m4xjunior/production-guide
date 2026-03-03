#!/bin/bash
# Inicia o servidor de transcrição MLX Whisper
# Uso: ./start.sh

cd "$(dirname "$0")"

echo "Iniciando servidor de transcrição MLX Whisper..."
echo "Modelo: whisper-large-v3"
echo "Porta: 8765"
echo ""

uvicorn server:app --host 0.0.0.0 --port 8765
