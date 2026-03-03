"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type VoiceCommand = {
  id: string;
  scope: "global" | "station" | "step";
  stationId?: string | null;
  stepId?: string | null;
  action: string;
  phrases: string[];
  isEnabled: boolean;
  sequence?: string | null;
  context?: Record<string, unknown> | null;
};

type CommandCallbacks = {
  onConfirm?: (transcript: string) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onStop?: () => void;
  onLogout?: () => void;
  onRepeat?: () => void;
  onHelp?: () => void;
  onDigit?: (digit: number) => void;
  onCustom?: (action: string, transcript: string) => void;
};

type EngineOptions = {
  stationId?: string;
  stepId?: string;
  stepPhrases?: string[];
  callbacks: CommandCallbacks;
  language?: string;
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function matchesPhrases(transcript: string, phrases: string[]): boolean {
  const norm = normalizeText(transcript);
  return phrases.some((p) => normalizeText(p) === norm || norm.includes(normalizeText(p)));
}

const SEQUENCE_WINDOW_MS = 2500;

export function useVoiceCommandEngine(options: EngineOptions) {
  const [commands, setCommands] = useState<VoiceCommand[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const lastActionRef = useRef<{ action: string; at: number } | null>(null);
  const { stationId, stepId, stepPhrases = [], callbacks, language = "es-ES" } = options;

  useEffect(() => {
    fetch("/api/voice-commands")
      .then((r) => r.json())
      .then(({ commands: cmds }) => setCommands(cmds || []))
      .catch(() => setCommands([]));
  }, []);

  const applicableCommands = commands.filter((cmd) => {
    if (!cmd.isEnabled) return false;
    if (cmd.scope === "global") return true;
    if (cmd.scope === "station" && cmd.stationId === stationId) return true;
    if (cmd.scope === "step" && cmd.stepId === stepId) return true;
    return false;
  });

  const executeAction = useCallback(
    (action: string, transcript: string) => {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
      if (action.startsWith("digit_")) {
        const d = parseInt(action.replace("digit_", ""), 10);
        if (!isNaN(d)) callbacks.onDigit?.(d);
        return;
      }
      switch (action) {
        case "confirm": callbacks.onConfirm?.(transcript); break;
        case "next":    callbacks.onNext?.(); break;
        case "prev":    callbacks.onPrev?.(); break;
        case "stop":    callbacks.onStop?.(); break;
        case "logout":  callbacks.onLogout?.(); break;
        case "repeat":  callbacks.onRepeat?.(); break;
        case "help":    callbacks.onHelp?.(); break;
        default:        callbacks.onCustom?.(action, transcript); break;
      }
      lastActionRef.current = { action, at: Date.now() };
    },
    [callbacks]
  );

  const processTranscript = useCallback(
    (rawTranscript: string) => {
      setLastTranscript(rawTranscript);
      if (stepPhrases.length > 0 && matchesPhrases(rawTranscript, stepPhrases)) {
        executeAction("confirm", rawTranscript);
        return;
      }
      for (const cmd of applicableCommands) {
        if (!matchesPhrases(rawTranscript, cmd.phrases)) continue;
        if (cmd.sequence) {
          const prev = lastActionRef.current;
          const withinWindow = prev && Date.now() - prev.at < SEQUENCE_WINDOW_MS;
          if (!withinWindow || prev?.action !== cmd.sequence) continue;
        }
        executeAction(cmd.action, rawTranscript);
        return;
      }
    },
    [applicableCommands, stepPhrases, executeAction]
  );

  return {
    processTranscript,
    isListening,
    setIsListening,
    lastTranscript,
    applicableCommands,
    language,
  };
}
