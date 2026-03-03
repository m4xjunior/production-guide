"use client";

/**
 * VoiceCommandPanel — devkit
 *
 * Large-button voice control area for PWA/tablet use.
 * Provides:
 *  - Toggle for continuous listening mode (auto-detect spoken responses)
 *  - Manual single-capture button
 *  - Expected response display
 *  - Last heard transcript with match feedback
 *
 * All touch targets are ≥ 64px (4rem) for easy PWA interaction.
 */

interface VoiceCommandPanelProps {
  /** Whether single-utterance mic is currently listening */
  isListening: boolean;
  /** Whether continuous mode is active */
  isContinuousListening: boolean;
  /** Toggle continuous listening on/off */
  onToggleContinuous: () => void;
  /** Start single capture */
  onManualListen: () => void;
  /** The correct answer the system is waiting for */
  expectedResponse: string;
  /** Last transcript captured by continuous recognition */
  lastHeard?: string;
  /** Whether speech recognition is supported */
  isSupported: boolean;
  /** Whether continuous speech recognition is supported */
  isContinuousSupported: boolean;
  /** Current transcript from manual recognition */
  transcript?: string;
  /** Validation result (true=correct, false=wrong, null=no result yet) */
  isValidResponse?: boolean | null;
}

export const VoiceCommandPanel: React.FC<VoiceCommandPanelProps> = ({
  isListening,
  isContinuousListening,
  onToggleContinuous,
  onManualListen,
  expectedResponse,
  lastHeard,
  isSupported,
  isContinuousSupported,
  transcript,
  isValidResponse,
}) => {
  const displayTranscript = transcript || lastHeard;

  return (
    <div className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex flex-col gap-4">
      {/* Section title */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs">🎤</span>
        </div>
        <h3 className="text-base font-bold text-red-300">Control de Voz</h3>
      </div>

      {/* Expected response */}
      <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
        <p className="text-xs text-green-400 mb-1 font-medium uppercase tracking-wide">
          Respuesta esperada:
        </p>
        <p className="text-green-200 font-mono text-base text-center font-bold">
          &quot;{expectedResponse}&quot;
        </p>
      </div>

      {/* Voice buttons — two large touch-friendly buttons */}
      {(isContinuousSupported || isSupported) && (
        <div className="grid grid-cols-2 gap-3">
          {/* Continuous mode toggle */}
          {isContinuousSupported && (
            <button
              onClick={onToggleContinuous}
              className={[
                "relative h-16 rounded-xl font-bold text-sm overflow-hidden",
                "flex items-center justify-center gap-2",
                "transition-all duration-200 active:scale-95",
                "focus:outline-none focus:ring-4",
                isContinuousListening
                  ? "bg-gradient-to-br from-green-600 to-green-700 text-white focus:ring-green-400/50 voice-listening"
                  : "bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white focus:ring-blue-400/50",
              ].join(" ")}
            >
              <span className="text-xl">{isContinuousListening ? "🔴" : "▶"}</span>
              <span className="leading-tight text-center">
                {isContinuousListening ? "Escuchando\nsiempre" : "Modo\ncontinuo"}
              </span>
            </button>
          )}

          {/* Manual capture button */}
          {isSupported && (
            <button
              onClick={onManualListen}
              disabled={isListening}
              className={[
                "relative h-16 rounded-xl font-bold text-sm overflow-hidden",
                "flex items-center justify-center gap-2",
                "transition-all duration-200 active:scale-95",
                "focus:outline-none focus:ring-4",
                isListening
                  ? "bg-gradient-to-br from-orange-600 to-orange-700 text-white focus:ring-orange-400/50 voice-listening"
                  : "bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white focus:ring-slate-400/50",
                "disabled:opacity-70 disabled:cursor-wait",
              ].join(" ")}
            >
              <span className="text-xl">{isListening ? "⏺" : "🎤"}</span>
              <span className="leading-tight text-center">
                {isListening ? "Grabando…" : "Captura\nmanual"}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Last heard / validation feedback */}
      {displayTranscript && (
        <div
          className={[
            "rounded-xl p-3 border transition-all duration-300",
            isValidResponse === true
              ? "bg-green-500/20 border-green-500/40"
              : isValidResponse === false
              ? "bg-red-500/20 border-red-500/40"
              : "bg-white/5 border-white/10",
          ].join(" ")}
        >
          <p className="text-xs text-gray-400 mb-1">Oído:</p>
          <p
            className={[
              "font-mono text-sm truncate",
              isValidResponse === true
                ? "text-green-300"
                : isValidResponse === false
                ? "text-red-300"
                : "text-gray-200",
            ].join(" ")}
          >
            {isValidResponse === true && "✅ "}
            {isValidResponse === false && "❌ "}
            &quot;{displayTranscript}&quot;
          </p>
        </div>
      )}

      {!isSupported && !isContinuousSupported && (
        <div className="bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/20">
          <p className="text-yellow-300 text-xs text-center">
            ⚠️ Reconocimiento de voz no disponible en este dispositivo
          </p>
        </div>
      )}
    </div>
  );
};
