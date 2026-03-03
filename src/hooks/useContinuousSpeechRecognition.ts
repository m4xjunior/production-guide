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
      // Don't process if TTS is speaking
      if (isTTSSpeaking) {
        console.log("TTS is speaking, ignoring input:", transcript);
        return false;
      }

      const normalizedTranscript = transcript.toLowerCase().trim();
      const normalizedExpected = expectedResponse.toLowerCase().trim();

      console.log("Checking match:", {
        transcript: normalizedTranscript,
        expected: normalizedExpected,
      });

      // More flexible matching - check for common variations
      const isMatch =
        normalizedTranscript.includes(normalizedExpected) ||
        normalizedExpected.includes(normalizedTranscript) ||
        // Check for "pin bueno" variations
        (normalizedExpected.includes("pin bueno") &&
          (normalizedTranscript.includes("pin bueno") ||
            normalizedTranscript.includes("pinbueno") ||
            normalizedTranscript.includes("pin buen") ||
            normalizedTranscript.includes("bueno") ||
            normalizedTranscript.includes("buen"))) ||
        // Check for other common patterns
        (normalizedTranscript.length >= 3 &&
          normalizedExpected.length >= 3 &&
          (normalizedTranscript.includes(
            normalizedExpected.substring(
              0,
              Math.max(3, normalizedExpected.length - 2),
            ),
          ) ||
            normalizedExpected.includes(
              normalizedTranscript.substring(
                0,
                Math.max(3, normalizedTranscript.length - 2),
              ),
            )));

      if (isMatch) {
        console.log("Match found! Advancing step.");
        setLastHeard(transcript);
        onMatch();
        return true;
      }

      console.log("No match found.");
      return false;
    },
    [expectedResponse, onMatch, isTTSSpeaking],
  );

  const startContinuousListening = useCallback(() => {
    if (!isSupported || isListeningRef.current || isTTSSpeaking) return;

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
      console.log("Continuous listening started");
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
        console.log("Heard:", textToCheck);
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
      if (event.error !== "not-allowed" && isListeningRef.current && !isTTSSpeaking) {
        restartTimeoutRef.current = setTimeout(() => {
          startContinuousListening();
        }, 1000);
      }
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");

      // Auto-restart if we're supposed to be listening and TTS is not speaking
      if (isListeningRef.current && !isTTSSpeaking) {
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
  }, [isSupported, isTTSSpeaking, checkMatch]);

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

    console.log("Continuous listening stopped");
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
