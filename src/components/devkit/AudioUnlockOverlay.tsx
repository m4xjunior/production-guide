"use client";

import { useState, useEffect } from "react";

/**
 * AudioUnlockOverlay — devkit
 *
 * Mobile browsers (and PWAs) require a user gesture before audio can play.
 * This overlay blocks the UI on first load and shows a "Tap to Start" button.
 * Tapping it:
 *   1. Calls `unlockAudio()` to release the audio context
 *   2. Requests microphone permission so speech recognition can start cleanly
 *   3. Calls `onUnlocked()` so the parent can proceed
 */

interface AudioUnlockOverlayProps {
  onUnlocked: () => void;
  unlockAudio: () => void;
}

export const AudioUnlockOverlay: React.FC<AudioUnlockOverlayProps> = ({
  onUnlocked,
  unlockAudio,
}) => {
  const [micStatus, setMicStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Check if mic is already granted (e.g. second visit)
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((result) => {
        if (result.state === "granted") {
          setMicStatus("granted");
        }
      })
      .catch(() => {});
  }, []);

  const handleStart = async () => {
    setIsUnlocking(true);

    // 1. Unlock audio context (TTS)
    unlockAudio();

    // 2. Request microphone permission
    setMicStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop tracks immediately — we only needed the permission grant
      stream.getTracks().forEach((t) => t.stop());
      setMicStatus("granted");
    } catch {
      setMicStatus("denied");
    }

    // 3. Proceed even if mic was denied (app will handle it gracefully)
    setTimeout(() => {
      onUnlocked();
    }, 300);
  };

  const micIcon =
    micStatus === "granted" ? "✅" :
    micStatus === "denied"  ? "🚫" :
    micStatus === "requesting" ? "⏳" : "🎙️";

  const micLabel =
    micStatus === "granted"   ? "Micrófono listo" :
    micStatus === "denied"    ? "Micrófono denegado — comandos de voz desactivados" :
    micStatus === "requesting" ? "Solicitando micrófono…" :
                                 "Necesita acceso al micrófono";

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-red-950 to-slate-900">
      {/* Background dots */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center max-w-sm w-full animate-fade-in-up">
        {/* Logo / Title */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-2xl bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center">
            <span className="text-5xl">🏭</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Guía de Producción
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Sistema de control de producción<br />con comandos de voz
          </p>
        </div>

        {/* Microphone status */}
        <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">{micIcon}</span>
          <p className="text-sm text-gray-300 text-left">{micLabel}</p>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={isUnlocking}
          className={[
            "w-full py-5 rounded-2xl text-xl font-bold text-white",
            "bg-gradient-to-r from-red-600 to-red-700",
            "hover:from-red-500 hover:to-red-600",
            "active:scale-95 transition-all duration-150",
            "shadow-lg shadow-red-900/50",
            "focus:outline-none focus:ring-4 focus:ring-red-400/50",
            "disabled:opacity-60 disabled:cursor-wait",
          ].join(" ")}
        >
          {isUnlocking ? (
            <span className="flex items-center justify-center gap-3">
              <span className="animate-spin inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              Iniciando…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-3">
              <span>▶</span>
              Iniciar Estación
            </span>
          )}
        </button>

        <p className="text-xs text-gray-500">
          Toque para activar el audio y el micrófono
        </p>
      </div>
    </div>
  );
};
