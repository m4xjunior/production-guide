#!/bin/bash
# Inicia o servidor de transcrição MLX Whisper com Python 3.12
# Uso: ./start.sh

set -e
cd "$(dirname "$0")"

# Garante que o venv existe e está com Python 3.12
if [ ! -f ".venv/bin/python" ]; then
  echo "Criando venv com Python 3.12..."
  PYTHON312="$HOME/.pyenv/versions/3.12.12/bin/python"
  if [ ! -f "$PYTHON312" ]; then
    echo "ERRO: Python 3.12 não encontrado em $PYTHON312"
    echo "Execute: pyenv install 3.12.12"
    exit 1
  fi
  "$PYTHON312" -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi

echo "Iniciando servidor de transcrição MLX Whisper..."
echo "Python: $(.venv/bin/python --version)"
echo "Modelo: whisper-large-v3-turbo"
echo "Porta: 8765"
echo ""

.venv/bin/uvicorn server:app --host 0.0.0.0 --port 8765
