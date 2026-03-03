"use client";

/**
 * VoiceStatusIndicator — devkit
 *
 * Animated badge that shows the current voice state:
 *  - idle      → gray dot
 *  - speaking  → blue pulsing (TTS active)
 *  - listening → red pulsing (mic active)
 *
 * Also shows the last heard transcript in a small bubble when listening.
 */

interface VoiceStatusIndicatorProps {
  isListening: boolean;
  isSpeaking: boolean;
  lastHeard?: string;
  /** Compact mode: smaller badge, no label text */
  compact?: boolean;
}

export const VoiceStatusIndicator: React.FC<VoiceStatusIndicatorProps> = ({
  isListening,
  isSpeaking,
  lastHeard,
  compact = false,
}) => {
  const state = isSpeaking ? "speaking" : isListening ? "listening" : "idle";

  const config = {
    idle: {
      dot: "bg-gray-500",
      ring: "",
      label: "En espera",
      emoji: "💤",
      textColor: "text-gray-400",
      border: "border-gray-500/30",
      bg: "bg-gray-500/10",
    },
    speaking: {
      dot: "bg-blue-400 voice-speaking",
      ring: "ring-2 ring-blue-400/40",
      label: "Hablando…",
      emoji: "🔊",
      textColor: "text-blue-300",
      border: "border-blue-400/40",
      bg: "bg-blue-500/10",
    },
    listening: {
      dot: "bg-red-400 voice-listening",
      ring: "ring-2 ring-red-400/40",
      label: "Escuchando…",
      emoji: "🎙️",
      textColor: "text-red-300",
      border: "border-red-400/40",
      bg: "bg-red-500/10",
    },
  }[state];

  if (compact) {
    return (
      <div
        className={[
          "flex items-center gap-2 px-3 py-1.5 rounded-full border",
          config.bg,
          config.border,
          config.ring,
        ].join(" ")}
        title={config.label}
      >
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dot}`} />
        <span className={`text-xs font-medium ${config.textColor}`}>
          {config.emoji} {config.label}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={[
          "flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300",
          config.bg,
          config.border,
          config.ring,
        ].join(" ")}
      >
        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${config.dot}`} />
        <span className={`text-sm font-semibold ${config.textColor}`}>
          {config.emoji} {config.label}
        </span>
      </div>

      {isListening && lastHeard && (
        <div className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-400/20">
          <p className="text-xs text-gray-400 mb-0.5">Último oído:</p>
          <p className="text-sm text-red-200 font-mono truncate">
            &quot;{lastHeard}&quot;
          </p>
        </div>
      )}
    </div>
  );
};
