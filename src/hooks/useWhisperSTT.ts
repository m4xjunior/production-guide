"use client";
import { useEffect, useRef, useState, useCallback } from "react";

interface WhisperSTTOptions {
  expectedResponse: string;
  onMatch: () => void;
  isTTSSpeaking: boolean;
  serverUrl?: string;
  enabled?: boolean;
}

export function useWhisperSTT({
  expectedResponse,
  onMatch,
  isTTSSpeaking,
  serverUrl = "ws://localhost:8765",
  enabled = true,
}: WhisperSTTOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastHeard, setLastHeard] = useState("");
  const [hasFailed, setHasFailed] = useState(false);
  const isSpeakingRef = useRef(isTTSSpeaking);
  // Evita loop de reconexão: após uma falha de conexão, não tenta novamente
  // até que o contexto mude (step novo, enabled toggle, etc.)
  const hasFailedRef = useRef(false);

  useEffect(() => {
    isSpeakingRef.current = isTTSSpeaking;
  }, [isTTSSpeaking]);

  // Reseta o flag de falha quando muda de step ou servidor — permite nova tentativa
  useEffect(() => {
    hasFailedRef.current = false;
    setHasFailed(false);
  }, [enabled, serverUrl]);

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const checkMatch = useCallback(
    (text: string) => {
      if (isSpeakingRef.current) return;
      const t = normalize(text);
      const e = normalize(expectedResponse);
      if (!e) return;
      const isMatch =
        // 1. Match exato
        t === e ||
        // 2. Transcript contém a frase esperada completa
        t.includes(e) ||
        // 3. Variantes fonéticas explícitas para "pin bueno"
        (e === "pin bueno" &&
          (t.includes("pin bueno") || t.includes("pinbueno") || t.includes("fin bueno") || t.includes("pin buen"))) ||
        // 4. Truncagem: ≥80% do comprimento e coincide com o início
        (t.length >= Math.floor(e.length * 0.8) && e.startsWith(t.slice(0, Math.min(t.length, e.length))));
      if (isMatch) {
        console.log("[Whisper] Match:", { heard: text, expected: expectedResponse });
        onMatch();
      }
    },
    [expectedResponse, onMatch],
  );

  const startListening = useCallback(async () => {
    if (!enabled || isListening || hasFailedRef.current) return;

    try {
      const ws = new WebSocket(`${serverUrl}/ws/transcribe`);
      wsRef.current = ws;

      ws.onopen = async () => {
        setIsConnected(true);
        ws.send(JSON.stringify({ action: "start" }));

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const audioCtx = new AudioContext({ sampleRate: 16000 });
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const processor = audioCtx.createScriptProcessor(8192, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const samples = e.inputBuffer.getChannelData(0);
            ws.send(samples.buffer);
          }
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
        setIsListening(true);
        console.log("[Whisper] Escutando...");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as { type: string; text?: string; status?: string };
          if (data.type === "transcription" && data.text) {
            setLastHeard(data.text);
            checkMatch(data.text);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsListening(false);
        console.log("[Whisper] Desconectado");
      };

      ws.onerror = () => {
        hasFailedRef.current = true; // Bloqueia reconexão automática após falha
        setHasFailed(true); // Sinaliza ao consumer para cascadear ao fallback
        console.warn("[Whisper] Servidor indisponível - usando Web Speech API como fallback");
        setIsConnected(false);
      };
    } catch (err) {
      console.warn("[Whisper] Falha ao iniciar:", err);
    }
  }, [enabled, isListening, serverUrl, checkMatch]);

  const stopListening = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "stop" }));
      wsRef.current.close();
    }
    processorRef.current?.disconnect();
    void audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setIsListening(false);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    startListening,
    stopListening,
    isListening,
    isConnected,
    lastHeard,
    hasFailed,
    isSupported: typeof WebSocket !== "undefined",
  };
}
