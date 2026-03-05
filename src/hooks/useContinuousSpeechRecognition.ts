import { useState, useEffect, useCallback, useRef } from "react";

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
    | null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void)
    | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
}

declare global {
  interface Window {
    webkitSpeechRecognition: SpeechRecognitionConstructor;
    SpeechRecognition: SpeechRecognitionConstructor;
  }
}

export const useContinuousSpeechRecognition = (
  expectedResponse: string,
  onMatch: () => void,
  isTTSSpeaking: boolean = false,
) => {
  const [isListening, setIsListening] = useState(false);
  const [lastHeard, setLastHeard] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  const checkMatch = useCallback(
    (transcript: string) => {
      // Normalização ultra-robusta: apenas letras e números
      const normalize = (str: string) => 
        str.toLowerCase()
           .normalize("NFD")
           .replace(/[\u0300-\u036f]/g, "") // Remove acentos
           .replace(/[^a-z0-9\s]/g, "") // Remove TUDO exceto letras, números e espaços
           .replace(/\s+/g, " ") // Normaliza espaços
           .trim();

      const t = normalize(transcript);
      const e = normalize(expectedResponse);

      if (!t || !e) return false;

      // Filtro de segurança relaxado para conversa de fundo
      const tWords = t.split(" ");
      const eWords = e.split(" ");
      if (tWords.length > eWords.length * 4 + 4) return false;

      // Lógica de matching progressiva
      const isMatch =
        t === e || // Exato
        t.includes(e) || e.includes(t) || // Contido
        (e.includes("bueno") && t.includes("bueno")) || // Keyword industrial
        (e.includes("pin") && t.includes("pin")) || // Keyword industrial
        (e.includes("ok") && t.includes("ok")) ||
        (t.length >= 3 && e.includes(t)) || // Match parcial de pelo menos 3 letras
        (e.length >= 3 && t.includes(e));

      // Feedback visual para o operário saber que o sistema reconheceu mas talvez o TTS estivesse bloqueando
      const debugStatus = isMatch ? " ✓" : "";
      const ttsStatus = isTTSSpeaking ? " (TTS)" : "";
      setLastHeard(transcript + debugStatus + ttsStatus);

      // Só dispara se não estiver falando (mantendo a segurança mas com feedback)
      if (isMatch && !isTTSSpeaking) {
        onMatch();
        return true;
      }

      return false;
    },
    [expectedResponse, onMatch, isTTSSpeaking],
  );

  const startContinuousListening = useCallback(() => {
    // Note: intentionally NOT blocking on isTTSSpeaking here.
    // checkMatch already ignores transcripts while TTS is speaking.
    // Blocking here causes recognition to never start when TTS finishes.
    if (!isSupported || isListeningRef.current) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "es-ES";

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Check both final and interim results
      const textToCheck = finalTranscript || interimTranscript;
      if (textToCheck.trim()) {
        setLastHeard(textToCheck);
        checkMatch(textToCheck);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Ignore common, non-critical errors
      if (
        event.error === "no-speech" ||
        event.error === "audio-capture" ||
        event.error === "aborted"
      ) {
        return;
      }

      console.error("Speech recognition error:", event.error);

      // Don't stop on network errors, just restart
      if (event.error === "network") {
        return;
      }

      setIsListening(false);

      // Auto-restart after error (except for permission denied)
      // checkMatch already suppresses matches during TTS, so restart is safe
      if (event.error !== "not-allowed" && isListeningRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          startContinuousListening();
        }, 1000);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we're supposed to be listening
      // checkMatch already suppresses matches during TTS, so restart is safe
      if (isListeningRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          startContinuousListening();
        }, 500);
      }
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("Failed to start recognition:", error);
      setIsListening(false);
    }
  }, [isSupported, checkMatch]);

  const stopContinuousListening = useCallback(() => {
    setIsListening(false);
    isListeningRef.current = false;

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopContinuousListening();
    };
  }, [stopContinuousListening]);

  return {
    isListening,
    lastHeard,
    isSupported,
    startContinuousListening,
    stopContinuousListening,
  };
};
