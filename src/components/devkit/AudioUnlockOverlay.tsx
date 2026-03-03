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

    // 1. Unlock audio context (HTML5 Audio)
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

    // 3. Proceed even if mic was denied (app will handle gracefully)
    setTimeout(() => {
      onUnlocked();
    }, 300);
  };

  const micIcon =
    micStatus === "granted"    ? "✅" :
    micStatus === "denied"     ? "🚫" :
    micStatus === "requesting" ? "⏳" : "🎙️";

  const micLabel =
    micStatus === "granted"    ? "Micrófono listo" :
    micStatus === "denied"     ? "Micrófono denegado — comandos de voz desactivados" :
    micStatus === "requesting" ? "Solicitando micrófono…" :
                                 "Necesita acceso al micrófono para comandos de voz";

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0A0A0C]">
      {/* Industrial scanline texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255,255,255,0.1) 2px,
            rgba(255,255,255,0.1) 3px
          )`,
        }}
      />

      {/* Red ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.07] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, #8B1A1A 0%, transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center max-w-sm w-full animate-fade-in-up">
        {/* Logo / Title */}
        <div className="flex flex-col items-center gap-4">
          <img
            src="/logo-kh.png"
            alt="KH Know How"
            className="h-14 w-auto mx-auto"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div>
            <h1
              className="text-2xl font-bold tracking-[0.2em] text-[#E8E8E8]"
              style={{ fontFamily: "var(--font-geist-mono), monospace" }}
            >
              S.A.O.
            </h1>
            <p className="text-xs tracking-[0.3em] uppercase text-[#6B6B6B] mt-1">
              Sistema de Ayuda al Operario
            </p>
          </div>
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#8B1A1A]/50 to-transparent" />
        </div>

        {/* Microphone status */}
        <div className="w-full bg-[#141416] border border-[#2A2A2E] rounded-xl p-4 flex items-center gap-3">
          <span className="text-xl">{micIcon}</span>
          <p className="text-sm text-[#A1A1AA] text-left">{micLabel}</p>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={isUnlocking}
          className={[
            "w-full h-14 rounded-xl font-semibold text-base tracking-[0.15em] uppercase",
            "flex items-center justify-center gap-3 transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-wait",
            isUnlocking
              ? "bg-[#1A1A1E] text-[#4A4A4E] border border-[#2A2A2E]"
              : "bg-[#8B1A1A] text-white hover:bg-[#A52525] active:translate-y-[1px] cursor-pointer",
          ].join(" ")}
          style={!isUnlocking ? {
            boxShadow: "0 2px 0 0 #5A0E0E, 0 0 30px -5px rgba(139,26,26,0.4), inset 0 1px 0 0 rgba(255,255,255,0.1)",
          } : undefined}
        >
          {isUnlocking ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-[#4A4A4E] border-t-[#6B6B6B] rounded-full" />
              Iniciando…
            </>
          ) : (
            <>
              ▶ Iniciar Estación
            </>
          )}
        </button>

        <p className="text-[10px] tracking-[0.2em] uppercase text-[#3A3A3E]">
          Toque para activar audio y micrófono
        </p>
      </div>
    </div>
  );
};
