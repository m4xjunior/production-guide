"""
Teste de transcrição em tempo real usando o microfone.
Conecta ao servidor WebSocket e transcreve o que você fala.

Uso: python3 test_mic.py
Pressione Ctrl+C para parar.
"""

import asyncio
import json
import signal

import numpy as np
import sounddevice as sd
import websockets

SAMPLE_RATE = 16000
# Enviar chunks de ~0.5s para o servidor
CHUNK_SAMPLES = int(SAMPLE_RATE * 0.5)
SERVER_URL = "ws://localhost:8765/ws/transcribe"


async def main():
    print("Conectando ao servidor de transcrição...")
    async with websockets.connect(SERVER_URL) as ws:
        await ws.send(json.dumps({"action": "start"}))
        resp = json.loads(await ws.recv())
        print(f"Status: {resp['status']}")
        print("Fale algo (Ctrl+C para parar)...\n")

        audio_queue = asyncio.Queue()

        def audio_callback(indata, frames, time_info, status):
            if status:
                print(f"  [audio status: {status}]")
            audio_queue.put_nowait(indata.copy())

        stream = sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype="float32",
            blocksize=CHUNK_SAMPLES,
            callback=audio_callback,
        )

        async def send_audio():
            with stream:
                while True:
                    data = await audio_queue.get()
                    samples = data.flatten()
                    await ws.send(samples.tobytes())

        async def receive_transcriptions():
            while True:
                msg = json.loads(await ws.recv())
                if msg["type"] == "transcription":
                    print(f"  >>> {msg['text']}")

        try:
            await asyncio.gather(send_audio(), receive_transcriptions())
        except (KeyboardInterrupt, asyncio.CancelledError):
            pass
        finally:
            await ws.send(json.dumps({"action": "stop"}))
            try:
                resp = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
                if resp.get("type") == "transcription":
                    print(f"  >>> {resp['text']}")
                    resp = json.loads(await asyncio.wait_for(ws.recv(), timeout=2))
            except (asyncio.TimeoutError, Exception):
                pass
            print("\nTranscrição encerrada.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nEncerrado.")
