"use client";
import * as Sentry from "@sentry/nextjs";
import { useState, useCallback, useRef } from "react";

// Rastrea URLs ya precargadas para evitar duplicados dentro de la sesión
const preloadedUrls = new Set<string>();

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearSafetyTimer = () => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  };

  /**
   * Reproduce audio pre-generado desde una URL usando <audio> nativo.
   * No usa fetch() para evitar restricciones CORS del bucket GCS privado.
   * El navegador gestiona el caché HTTP de las respuestas de audio.
   */
  const speak = useCallback(async (audioUrl: string) => {
    if (!audioUrl) return;

    // Cancelar audio en curso
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    clearSafetyTimer();

    try {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsSpeaking(true);
        // Safety: force-reset se o audio nunca terminar (browser bug, element GC'd)
        clearSafetyTimer();
        safetyTimerRef.current = setTimeout(() => {
          setIsSpeaking(false);
          audioRef.current = null;
        }, 30000);
      };
      audio.onended = () => {
        clearSafetyTimer();
        setIsSpeaking(false);
        audioRef.current = null;
      };
      audio.onerror = () => {
        clearSafetyTimer();
        setIsSpeaking(false);
        audioRef.current = null;
      };

      await audio.play();
    } catch (err) {
      console.error("Error reproduciendo audio TTS:", err);
      Sentry.captureException(err);
      clearSafetyTimer();
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(() => {
    clearSafetyTimer();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  /**
   * Pre-carga los audios de todos los pasos para latencia cero durante producción.
   * Usa <audio preload="auto"> en lugar de fetch() para evitar restricciones CORS.
   */
  const preload = useCallback(async (audioUrls: string[]) => {
    audioUrls
      .filter((url) => url && !preloadedUrls.has(url))
      .forEach((url) => {
        preloadedUrls.add(url);
        const audio = new Audio(url);
        audio.preload = "auto";
        // El navegador descarga y almacena en caché en background
      });
  }, []);

  /**
   * Desbloquea la reproducción de audio en navegadores móviles.
   * Debe llamarse durante una interacción del usuario (click/touch).
   */
  const unlockAudio = useCallback(() => {
    const audio = new Audio();
    audio.volume = 0;
    audio.play().then(() => audio.pause()).catch(() => {});
  }, []);

  return {
    speak,
    stop,
    pause: stop,
    resume: () => {},
    unlockAudio,
    preload,
    isSpeaking,
    isSupported: true,
    voices: [],
  };
};
