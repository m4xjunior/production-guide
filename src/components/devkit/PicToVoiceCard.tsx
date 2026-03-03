"use client";

import Image from "next/image";
import { VoiceStatusIndicator } from "./VoiceStatusIndicator";

/**
 * PicToVoiceCard — devkit
 *
 * Responsive "picture to voice" card: displays a product reference image
 * alongside TTS voice instruction text and controls.
 *
 * Layout:
 *  - Mobile  (< md): image on top, text + controls below (stacked)
 *  - Tablet+ (≥ md): image on the left, text + controls on the right (side-by-side)
 */

interface PicToVoiceCardProps {
  /** Path to reference image, e.g. "/products/ABC123/P1.png" */
  imagePath: string;
  /** Alt text for the image */
  imageAlt?: string;
  /** The text the TTS will read aloud (shown for reference) */
  voiceText: string;
  /** Callback to replay the TTS */
  onRepeatVoice: () => void;
  /** Whether TTS is currently speaking */
  isSpeaking: boolean;
  /** Whether the mic is currently listening */
  isListening?: boolean;
  /** Last heard transcript */
  lastHeard?: string;
  /** Whether TTS is supported in the current environment */
  isTTSSupported?: boolean;
}

export const PicToVoiceCard: React.FC<PicToVoiceCardProps> = ({
  imagePath,
  imageAlt = "Referencia del producto",
  voiceText,
  onRepeatVoice,
  isSpeaking,
  isListening = false,
  lastHeard,
  isTTSSupported = true,
}) => {
  const hasImage = Boolean(imagePath && imagePath !== "N/A" && imagePath !== "");
  const hasVoiceText = Boolean(voiceText && voiceText !== "N/A" && voiceText !== "");

  return (
    <div className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Image section */}
        {hasImage && (
          <div className="relative md:w-1/2 bg-black/30 flex items-center justify-center min-h-[200px] md:min-h-[280px]">
            <div className="relative w-full h-[200px] md:h-[280px]">
              <Image
                src={imagePath}
                alt={imageAlt}
                fill
                className="object-contain p-4"
                sizes="(max-width: 768px) 100vw, 50vw"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            {/* Image label */}
            <div className="absolute bottom-2 left-2 right-2">
              <span className="text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">
                📷 Referencia visual
              </span>
            </div>
          </div>
        )}

        {/* Voice content section */}
        <div className={`flex flex-col gap-3 p-4 ${hasImage ? "md:w-1/2" : "w-full"}`}>
          {/* TTS text display */}
          {hasVoiceText && (
            <div className="bg-purple-500/10 rounded-xl p-3 border border-purple-500/20 flex-1">
              <p className="text-xs text-purple-400 mb-1 font-medium uppercase tracking-wide">
                🤖 IA dice:
              </p>
              <p className="text-purple-100 text-sm leading-relaxed">
                &quot;{voiceText}&quot;
              </p>
            </div>
          )}

          {/* Voice status */}
          <VoiceStatusIndicator
            isListening={isListening}
            isSpeaking={isSpeaking}
            lastHeard={lastHeard}
            compact
          />

          {/* Repeat TTS button */}
          {isTTSSupported && hasVoiceText && (
            <button
              onClick={onRepeatVoice}
              disabled={isSpeaking}
              className={[
                "w-full py-3 px-4 rounded-xl font-semibold text-sm",
                "flex items-center justify-center gap-2",
                "transition-all duration-200 active:scale-95",
                "focus:outline-none focus:ring-2 focus:ring-blue-400/50",
                isSpeaking
                  ? "bg-blue-600/50 text-blue-300 cursor-wait"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white",
              ].join(" ")}
            >
              <span className="text-base">{isSpeaking ? "🔊" : "🎵"}</span>
              <span>{isSpeaking ? "Reproduciendo…" : "Repetir instrucción"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
