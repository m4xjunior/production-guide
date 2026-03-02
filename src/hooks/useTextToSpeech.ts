import { useState, useEffect, useCallback, useRef } from "react";

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
      setIsSupported(true);

      // Load voices
      const loadVoices = () => {
        const availableVoices = synthRef.current?.getVoices() || [];
        setVoices(availableVoices);
      };

      // Load voices immediately and on voiceschanged event
      loadVoices();
      if (synthRef.current) {
        synthRef.current.addEventListener("voiceschanged", loadVoices);
      }

      return () => {
        if (synthRef.current) {
          synthRef.current.removeEventListener("voiceschanged", loadVoices);
        }
      };
    }
  }, []);

  const speak = useCallback(
    (
      text: string,
      options?: {
        rate?: number;
        pitch?: number;
        volume?: number;
        voice?: string;
      },
    ) => {
      if (!synthRef.current || !text || text === "N/A") return;

      // Cancel any ongoing speech
      synthRef.current.cancel();

      // Clean and prepare text for better pronunciation
      const cleanText = text
        .replace(/\s+/g, " ") // Replace multiple spaces with single space
        .replace(/([.!?])\s*([A-Z])/g, "$1 $2") // Ensure pause after punctuation
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      currentUtteranceRef.current = utterance;

      // Configure for Spanish (Castellano) with improved settings
      utterance.lang = "es-ES";
      utterance.rate = options?.rate || 0.85; // Slightly slower for better clarity
      utterance.pitch = options?.pitch || 1.0;
      utterance.volume = options?.volume || 0.9;

      // Enhanced voice selection
      const spanishVoices = voices.filter(
        (voice) =>
          voice.lang.startsWith("es") &&
          (voice.lang.includes("ES") ||
            voice.lang.includes("MX") ||
            voice.lang.includes("AR")),
      );

      // Prefer female voices for better clarity in industrial environments
      const preferredVoice =
        spanishVoices.find(
          (voice) =>
            voice.name.toLowerCase().includes("female") ||
            voice.name.toLowerCase().includes("maria") ||
            voice.name.toLowerCase().includes("carmen") ||
            voice.name.toLowerCase().includes("elena"),
        ) ||
        spanishVoices.find((voice) => voice.lang === "es-ES") ||
        spanishVoices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      // Enhanced event handlers
      utterance.onstart = () => {
        console.log("TTS started:", cleanText);
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        console.log("TTS ended");
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
      };

      utterance.onerror = (event) => {
        // The "interrupted" error is expected when we cancel speech, so we can ignore it.
        if (event.error === "interrupted") {
          console.log("TTS intentionally interrupted");
          // We need to ensure the speaking state is false if it was interrupted.
          setIsSpeaking(false);
          return;
        }
        console.error("TTS error:", event.error);
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
      };

      utterance.onpause = () => {
        console.log("TTS paused");
      };

      utterance.onresume = () => {
        console.log("TTS resumed");
      };

      // Speak with retry mechanism for better reliability
      try {
        synthRef.current.speak(utterance);

        // Fallback: if speech doesn't start within 1 second, try again
        setTimeout(() => {
          if (currentUtteranceRef.current === utterance && !isSpeaking) {
            console.log("TTS fallback: retrying speech");
            synthRef.current?.cancel();
            synthRef.current?.speak(utterance);
          }
        }, 1000);
      } catch (error) {
        console.error("TTS speak error:", error);
        setIsSpeaking(false);
      }
    },
    [voices, isSpeaking],
  );

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
    }
  }, []);

  const pause = useCallback(() => {
    if (synthRef.current && isSpeaking) {
      synthRef.current.pause();
    }
  }, [isSpeaking]);

  const resume = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.resume();
    }
  }, []);

  const unlockAudio = useCallback(() => {
    if (synthRef.current && synthRef.current.paused) {
      const utterance = new SpeechSynthesisUtterance("");
      utterance.volume = 0;
      synthRef.current.speak(utterance);
    }
  }, []);

  return {
    speak,
    stop,
    pause,
    resume,
    unlockAudio,
    isSpeaking,
    isSupported,
    voices: voices.filter((voice) => voice.lang.startsWith("es")),
  };
};
