"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Status, useConversation } from "@elevenlabs/react";

export type VoiceProvider = "elevenlabs" | "fallback";

type ElevenSessionResponse =
  | {
      provider: "elevenlabs";
      signedUrl: string;
      agentId: string;
    }
  | {
      provider: "fallback";
      reason: string;
    };

interface UseElevenStepConversationOptions {
  sessionId: string;
  stationId: string;
  stepId: string;
  expectedResponse: string;
  onMatch: () => void;
  isTTSSpeaking: boolean;
  enabled?: boolean;
  reconnectAttempts?: number;
  reconnectDelayMs?: number;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildWaveformBars(data?: Uint8Array): number[] {
  if (!data || data.length === 0) return [];
  const targetBars = 24;
  const bucketSize = Math.max(1, Math.floor(data.length / targetBars));
  const bars: number[] = [];

  for (let i = 0; i < targetBars; i += 1) {
    const start = i * bucketSize;
    const end = Math.min(start + bucketSize, data.length);
    if (start >= end) break;

    let sum = 0;
    for (let idx = start; idx < end; idx += 1) {
      sum += data[idx];
    }
    const average = sum / (end - start);
    // Curve para dar visibilidade melhor de voz baixa.
    bars.push(Math.pow(average / 255, 0.7));
  }

  return bars;
}

export function useElevenStepConversation({
  sessionId,
  stationId,
  stepId,
  expectedResponse,
  onMatch,
  isTTSSpeaking,
  enabled = true,
  reconnectAttempts = 2,
  reconnectDelayMs = 1200,
}: UseElevenStepConversationOptions) {
  const [provider, setProvider] = useState<VoiceProvider>("elevenlabs");
  const [error, setError] = useState<string | null>(null);
  const [lastHeard, setLastHeard] = useState("");
  const [inputBars, setInputBars] = useState<number[]>([]);
  const [outputBars, setOutputBars] = useState<number[]>([]);
  const [status, setStatus] = useState<Status>("disconnected");

  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectCountRef = useRef(0);
  const intentionalStopRef = useRef(false);
  const hasStartedRef = useRef(false);
  const isTTSSpeakingRef = useRef(isTTSSpeaking);
  const lastMatchedRef = useRef("");
  const onMatchRef = useRef(onMatch);

  useEffect(() => {
    onMatchRef.current = onMatch;
  });

  useEffect(() => {
    isTTSSpeakingRef.current = isTTSSpeaking;
  }, [isTTSSpeaking]);

  useEffect(() => {
    lastMatchedRef.current = "";
  }, [stepId, expectedResponse]);

  const setFallback = useCallback((reason: string) => {
    setProvider("fallback");
    setError(reason);
  }, []);

  const checkMatch = useCallback(
    (heardRaw: string) => {
      if (!heardRaw || isTTSSpeakingRef.current) return;

      const heard = normalize(heardRaw);
      const expected = normalize(expectedResponse);

      if (!heard || !expected) return;

      const isMatch =
        heard.includes(expected) ||
        expected.includes(heard) ||
        (expected.includes("pin bueno") &&
          (heard.includes("pin bueno") ||
            heard.includes("pinbueno") ||
            heard.includes("pin buen") ||
            heard.includes("bueno"))) ||
        (heard.length >= 3 &&
          expected.length >= 3 &&
          (expected.startsWith(heard.slice(0, 3)) ||
            heard.startsWith(expected.slice(0, 3))));

      if (!isMatch) return;

      if (lastMatchedRef.current === heard) return;
      lastMatchedRef.current = heard;
      onMatchRef.current();
    },
    [expectedResponse],
  );

  const {
    startSession,
    endSession,
    status: sdkStatus,
    isSpeaking,
    getInputByteFrequencyData,
    getOutputByteFrequencyData,
  } = useConversation({
    onMessage: ({ message, role, source }) => {
      const isUserMessage = role === "user" || source === "user";
      if (!isUserMessage || !message) return;
      setLastHeard(message);
      checkMatch(message);
    },
    onError: (message) => {
      setError(message || "Error de conexión ElevenLabs");
    },
  });

  useEffect(() => {
    setStatus(sdkStatus);
  }, [sdkStatus]);

  const stopListening = useCallback(async () => {
    intentionalStopRef.current = true;
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectCountRef.current = 0;
    hasStartedRef.current = false;
    setInputBars([]);
    setOutputBars([]);
    try {
      await endSession();
    } catch {
      // noop
    }
  }, [endSession]);

  const startListening = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false;
    if (!sessionId || !stationId || !stepId) {
      setFallback("Contexto inválido para sesión de voz");
      return false;
    }

    intentionalStopRef.current = false;
    setError(null);
    setLastHeard("");
    setProvider("elevenlabs");

    try {
      const response = await fetch("/api/elevenlabs/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, stationId, stepId }),
      });

      if (!response.ok) {
        setFallback(`No se pudo iniciar ElevenLabs (${response.status})`);
        return false;
      }

      const data = (await response.json()) as ElevenSessionResponse;
      if (data.provider === "fallback") {
        setFallback(data.reason || "ElevenLabs no disponible");
        return false;
      }

      await startSession({
        signedUrl: data.signedUrl,
        connectionType: "websocket",
        dynamicVariables: {
          session_id: sessionId,
          station_id: stationId,
          step_id: stepId,
        },
      });

      hasStartedRef.current = true;
      reconnectCountRef.current = 0;
      setProvider("elevenlabs");
      return true;
    } catch (err) {
      console.error("Error starting ElevenLabs conversation:", err);
      setFallback("Fallo al conectar con ElevenLabs");
      return false;
    }
  }, [enabled, sessionId, stationId, stepId, setFallback, startSession]);

  // Reconexión automática limitada. Si falla, activa fallback.
  useEffect(() => {
    if (!enabled || provider !== "elevenlabs") return;
    if (intentionalStopRef.current) return;
    if (!hasStartedRef.current) return;
    if (status !== "disconnected") return;

    if (reconnectCountRef.current >= reconnectAttempts) {
      setFallback("Conexión ElevenLabs inestable, usando fallback");
      return;
    }

    reconnectCountRef.current += 1;
    reconnectTimerRef.current = window.setTimeout(() => {
      void startListening();
    }, reconnectDelayMs);

    return () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [
    enabled,
    provider,
    status,
    reconnectAttempts,
    reconnectDelayMs,
    startListening,
    setFallback,
  ]);

  // Atualiza waveform em tempo real com os dados de áudio da sessão ElevenLabs.
  // Usamos refs para as funções de frequência para evitar re-renders infinitos —
  // getInputByteFrequencyData e getOutputByteFrequencyData mudam de referência
  // a cada render do useConversation, causando loop se colocadas nas deps.
  const getInputFreqRef = useRef(getInputByteFrequencyData);
  const getOutputFreqRef = useRef(getOutputByteFrequencyData);
  useEffect(() => {
    getInputFreqRef.current = getInputByteFrequencyData;
    getOutputFreqRef.current = getOutputByteFrequencyData;
  });

  useEffect(() => {
    if (provider !== "elevenlabs" || status !== "connected") {
      setInputBars((prev) => (prev.length === 0 ? prev : []));
      setOutputBars((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const interval = window.setInterval(() => {
      setInputBars(buildWaveformBars(getInputFreqRef.current()));
      setOutputBars(buildWaveformBars(getOutputFreqRef.current()));
    }, 40);

    return () => {
      window.clearInterval(interval);
    };
  }, [provider, status]);

  useEffect(() => {
    if (enabled) return;
    void stopListening();
    setProvider("fallback");
  }, [enabled, stopListening]);

  useEffect(() => {
    return () => {
      void stopListening();
    };
  }, [stopListening]);

  return {
    provider,
    status,
    isConnected: provider === "elevenlabs" && status === "connected",
    isListening:
      provider === "elevenlabs" &&
      (status === "connected" || status === "connecting"),
    isSpeaking,
    lastHeard,
    error,
    inputBars,
    outputBars,
    startListening,
    stopListening,
  };
}
