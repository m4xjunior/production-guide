"""
Servidor de transcrição local Whisper via WebSocket.

Detecta automaticamente o backend disponível:
  - MLX Whisper (Mac Apple Silicon) — mais rápido no Mac
  - faster-whisper (Linux/Windows/Mac) — cross-platform com CTranslate2

Recebe áudio PCM 16kHz mono float32 do navegador via WebSocket,
transcreve e retorna texto em tempo real.

Uso: uvicorn server:app --host 0.0.0.0 --port 8765
"""

import asyncio
import json
import logging
import platform
import re
import time
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("transcription-server")

SAMPLE_RATE = 16000
CHUNK_DURATION_SECONDS = 2.0
CHUNK_SIZE = int(SAMPLE_RATE * CHUNK_DURATION_SECONDS)

# Limite mínimo de energia RMS para considerar que há fala.
# Áudio de microfone típico com fala fica acima de 0.02-0.05.
# Silêncio/ruído ambiente fica abaixo de 0.005-0.01.
SILENCE_RMS_THRESHOLD = 0.015

# Frases que o Whisper alucina com frequência em silêncio
HALLUCINATION_PATTERNS = {
    "gracias",
    "exactamente",
    "suscríbete al canal",
    "suscríbete",
    "subtítulos",
    "subtitulado por",
    "amara.org",
    "música",
    "aplausos",
    "risas",
    "you",
    "thank you",
    "thanks for watching",
    "bye",
    "...",
}

# --- Detecção automática de backend ---

BACKEND = None
_mlx_whisper = None
_faster_model = None
MODEL_NAME = "whisper-large-v3-turbo"


def _detect_backend():
    """Detecta o melhor backend disponível."""
    global BACKEND, _mlx_whisper

    if platform.system() == "Darwin" and platform.machine() == "arm64":
        try:
            import mlx_whisper
            _mlx_whisper = mlx_whisper
            BACKEND = "mlx"
            logger.info("Backend detectado: MLX Whisper (Apple Silicon)")
            return
        except ImportError:
            pass

    try:
        import faster_whisper  # noqa: F401
        BACKEND = "faster-whisper"
        logger.info("Backend detectado: faster-whisper (CTranslate2)")
        return
    except ImportError:
        pass

    raise RuntimeError(
        "Nenhum backend de transcrição disponível. "
        "Instale mlx-whisper (Mac) ou faster-whisper (Linux/Windows): "
        "pip install mlx-whisper  OU  pip install faster-whisper"
    )


def _load_model():
    """Carrega o modelo Whisper no backend detectado."""
    global _faster_model

    start = time.time()

    if BACKEND == "mlx":
        repo = "mlx-community/whisper-large-v3-turbo"
        logger.info(f"Carregando modelo MLX: {repo}")
        dummy = np.zeros(SAMPLE_RATE, dtype=np.float32)
        _mlx_whisper.transcribe(dummy, path_or_hf_repo=repo, language="es")

    elif BACKEND == "faster-whisper":
        from faster_whisper import WhisperModel
        logger.info(f"Carregando modelo faster-whisper: {MODEL_NAME}")
        _faster_model = WhisperModel(
            MODEL_NAME,
            device="auto",
            compute_type="auto",
        )

    elapsed = time.time() - start
    logger.info(f"Modelo carregado em {elapsed:.1f}s ({BACKEND})")


def _is_silence(audio: np.ndarray) -> bool:
    """Verifica se o áudio é silêncio baseado na energia RMS."""
    rms = np.sqrt(np.mean(audio ** 2))
    is_silent = rms < SILENCE_RMS_THRESHOLD
    if is_silent:
        logger.debug(f"Silêncio detectado (RMS={rms:.4f})")
    return is_silent


def _is_hallucination(text: str) -> bool:
    """Filtra alucinações comuns do Whisper."""
    cleaned = text.strip().lower()
    # Remover pontuação para comparação
    cleaned = re.sub(r'[¡¿!?.,:;…\-\[\]()"""\']+', '', cleaned).strip()

    if not cleaned:
        return True

    # Verificar contra frases alucinadas conhecidas
    if cleaned in HALLUCINATION_PATTERNS:
        logger.debug(f"Alucinação filtrada: '{text}'")
        return True

    # Detectar repetição excessiva (ex: "Skills Skills Skills...")
    words = cleaned.split()
    if len(words) >= 4:
        unique_words = set(words)
        if len(unique_words) <= 2:
            logger.debug(f"Repetição filtrada: '{text}'")
            return True

    return False


def _transcribe_sync(audio: np.ndarray) -> str:
    """Transcreve áudio de forma síncrona usando o backend ativo."""
    if _is_silence(audio):
        return ""

    if BACKEND == "mlx":
        result = _mlx_whisper.transcribe(
            audio,
            path_or_hf_repo="mlx-community/whisper-large-v3-turbo",
            language="es",
            condition_on_previous_text=False,
            hallucination_silence_threshold=0.3,
            no_speech_threshold=0.6,
            compression_ratio_threshold=1.8,
            logprob_threshold=-0.5,
            temperature=0.0,
        )
        text = result.get("text", "")

    elif BACKEND == "faster-whisper":
        segments, _ = _faster_model.transcribe(
            audio,
            language="es",
            condition_on_previous_text=False,
            no_speech_threshold=0.6,
            log_prob_threshold=-0.5,
            compression_ratio_threshold=1.8,
            vad_filter=True,
        )
        text = " ".join(seg.text for seg in segments)

    else:
        return ""

    if _is_hallucination(text):
        return ""

    return text


# --- FastAPI App ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    _detect_backend()
    _load_model()
    yield


app = FastAPI(title="Whisper Transcription Server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "backend": BACKEND, "model": MODEL_NAME}


@app.websocket("/ws/transcribe")
async def websocket_transcribe(ws: WebSocket):
    await ws.accept()
    logger.info("Cliente WebSocket conectado")

    audio_buffer = np.array([], dtype=np.float32)
    is_listening = False

    try:
        while True:
            message = await ws.receive()

            if "text" in message:
                data = json.loads(message["text"])
                action = data.get("action")

                if action == "start":
                    audio_buffer = np.array([], dtype=np.float32)
                    is_listening = True
                    logger.info("Escuta iniciada")
                    await ws.send_json({"type": "status", "status": "listening"})

                elif action == "stop":
                    is_listening = False
                    if len(audio_buffer) > SAMPLE_RATE * 0.3:
                        text = await _transcribe(audio_buffer)
                        if text.strip():
                            await ws.send_json({
                                "type": "transcription",
                                "text": text.strip(),
                                "is_final": True,
                            })
                    audio_buffer = np.array([], dtype=np.float32)
                    logger.info("Escuta parada")
                    await ws.send_json({"type": "status", "status": "stopped"})

            elif "bytes" in message and is_listening:
                raw_bytes = message["bytes"]
                samples = np.frombuffer(raw_bytes, dtype=np.float32)
                audio_buffer = np.concatenate([audio_buffer, samples])

                if len(audio_buffer) >= CHUNK_SIZE:
                    chunk = audio_buffer[:CHUNK_SIZE]
                    audio_buffer = audio_buffer[CHUNK_SIZE:]

                    text = await _transcribe(chunk)
                    if text.strip():
                        await ws.send_json({
                            "type": "transcription",
                            "text": text.strip(),
                            "is_final": True,
                        })

    except WebSocketDisconnect:
        logger.info("Cliente WebSocket desconectado")
    except Exception as e:
        logger.error(f"Erro no WebSocket: {e}")
        try:
            await ws.close(code=1011, reason=str(e))
        except Exception:
            pass


async def _transcribe(audio: np.ndarray) -> str:
    """Transcreve áudio em thread separada para não bloquear o event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _transcribe_sync, audio)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8765)
