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
  maxAlternatives: number;
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

// ── Funções de matching exportadas para teste ──────────────────────

/**
 * Normaliza texto: lowercase, sem acentos, sem pontuação, espaços únicos.
 */
export function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalização fonética para espanhol — reduz confusões comuns do STT.
 * "vueno" → "bueno", "hola" → "ola", "siguiente" → "siguiente"
 */
export function phoneticNormalize(str: string): string {
  return str
    .replace(/v/g, "b")          // v↔b indistinguíveis em espanhol
    .replace(/z/g, "s")          // seseo: z→s
    .replace(/ce/g, "se")        // ce→se
    .replace(/ci/g, "si")        // ci→si
    .replace(/ll/g, "y")         // ll→y (yeísmo)
    .replace(/h/g, "")           // h mudo
    .replace(/qu/g, "k")         // qu→k
    .replace(/rr/g, "r")         // simplifica rr
    .replace(/x/g, "s")          // x→s em muitos dialetos
    .replace(/([aeiou])\1+/g, "$1"); // vogais duplicadas → uma só
}

/**
 * Duas palavras são similares se:
 * - Idênticas (texto ou fonética)
 * - Prefixo comum ≥3 chars
 * - Edit distance ≤1 para curtas, ≤2 para longas
 */
export function wordsSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 2 || b.length < 2) return a === b;

  // Phonetic match: "vueno" ≈ "bueno"
  if (phoneticNormalize(a) === phoneticNormalize(b)) return true;

  // Prefix match: a mais curta é prefixo da mais longa
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length >= 3 && long.startsWith(short)) return true;

  // Suffix match: "eno" no fim de "bueno" e "vueno"
  if (short.length >= 3 && long.endsWith(short)) return true;

  // Edit distance
  const maxDist = Math.min(a.length, b.length) <= 5 ? 1 : 2;
  if (Math.abs(a.length - b.length) > maxDist) return false;

  return editDistance(a, b) <= maxDist;
}

function editDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * Verifica se o transcript faz match com a resposta esperada.
 *
 * Estratégia progressiva (6 camadas):
 * 1. Match exato normalizado
 * 2. Containment (um contém o outro)
 * 3. Match fonético (espanhol)
 * 4. Word overlap exato ≥50% das palavras esperadas
 * 5. Word overlap fuzzy ≥50% (tolera erros de STT)
 * 6. Comando curto (1 palavra): qualquer palavra similar no transcript
 */
export function matchesExpected(transcript: string, expected: string): boolean {
  if (!transcript || !expected) return false;

  // 1. Exato
  if (transcript === expected) return true;

  // 2. Containment
  if (transcript.includes(expected) || expected.includes(transcript)) return true;

  // 3. Match fonético completo
  const tPhon = phoneticNormalize(transcript);
  const ePhon = phoneticNormalize(expected);
  if (tPhon === ePhon) return true;
  if (tPhon.includes(ePhon) || ePhon.includes(tPhon)) return true;

  const tWords = transcript.split(" ");
  const eWords = expected.split(" ");

  // 4. Exact word overlap ≥50%
  let exactHits = 0;
  for (const ew of eWords) {
    if (tWords.includes(ew)) exactHits++;
  }
  if (eWords.length > 0 && exactHits / eWords.length >= 0.5) return true;

  // 5. Fuzzy word overlap ≥50%
  let fuzzyHits = 0;
  for (const ew of eWords) {
    for (const tw of tWords) {
      if (wordsSimilar(tw, ew)) {
        fuzzyHits++;
        break;
      }
    }
  }
  if (eWords.length > 0 && fuzzyHits / eWords.length >= 0.5) return true;

  // 6. Comando curto (1 palavra): qualquer palavra similar no transcript basta
  if (eWords.length === 1 && eWords[0].length >= 2) {
    for (const tw of tWords) {
      if (wordsSimilar(tw, eWords[0])) return true;
    }
  }

  return false;
}

// ── Hook ───────────────────────────────────────────────────────────

export const useContinuousSpeechRecognition = (
  expectedResponse: string,
  onMatch: () => void,
  isTTSSpeaking: boolean = false,
  alternativeResponses: string[] = [],
) => {
  const [isListening, setIsListening] = useState(false);
  const [lastHeard, setLastHeard] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef(false);

  // ── Refs para valores mutáveis ──
  // O handler onresult captura checkMatch no closure do SpeechRecognition.
  // Sem refs, quando isTTSSpeaking muda, o handler antigo ainda usa o valor velho.
  const isTTSSpeakingRef = useRef(isTTSSpeaking);
  const expectedResponseRef = useRef(expectedResponse);
  const alternativeResponsesRef = useRef<string[]>(alternativeResponses);
  const onMatchRef = useRef(onMatch);
  const matchCooldownRef = useRef(false);
  const wordBufferRef = useRef<string[]>([]);
  const pendingDuringTTSRef = useRef<string[]>([]);
  const bufferTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { isTTSSpeakingRef.current = isTTSSpeaking; }, [isTTSSpeaking]);
  useEffect(() => { expectedResponseRef.current = expectedResponse; }, [expectedResponse]);
  useEffect(() => { alternativeResponsesRef.current = alternativeResponses; }, [alternativeResponses]);
  useEffect(() => { onMatchRef.current = onMatch; }, [onMatch]);

  // Reset ao mudar de step
  useEffect(() => {
    wordBufferRef.current = [];
    pendingDuringTTSRef.current = [];
    matchCooldownRef.current = false;
    setLastHeard("");
  }, [expectedResponse, alternativeResponses]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      setIsSupported(!!SR);
    }
  }, []);

  const runMatch = useCallback(() => {
    if (matchCooldownRef.current) return;
    if (isTTSSpeakingRef.current) return;

    const candidates = [
      expectedResponseRef.current,
      ...alternativeResponsesRef.current,
    ]
      .map((c) => normalize(c || ""))
      .filter((c) => c.length > 0);

    if (candidates.length === 0) return;

    const currentTranscript = wordBufferRef.current.join(" ");
    const pendingWhileSpeaking = pendingDuringTTSRef.current.join(" ");
    const corpus = [currentTranscript, pendingWhileSpeaking]
      .map((t) => normalize(t))
      .filter((t) => t.length > 0);

    if (corpus.length === 0) return;

    const matched = corpus.some((t) =>
      candidates.some((expected) => matchesExpected(t, expected))
    );

    if (!matched) return;

    matchCooldownRef.current = true;
    setTimeout(() => {
      matchCooldownRef.current = false;
    }, 2000);
    wordBufferRef.current = [];
    pendingDuringTTSRef.current = [];
    onMatchRef.current();
  }, []);

  // checkMatch estável — lê tudo de refs, referência nunca muda.
  // Isso resolve o bug de closure stale no onresult.
  const checkMatch = useCallback(
    (transcript: string, isFinal: boolean) => {
      if (matchCooldownRef.current) return false;

      const t = normalize(transcript);

      setLastHeard(transcript.trim());

      if (!t) return false;

      // Acumular palavras finais para match cross-result
      if (isFinal) {
        wordBufferRef.current.push(...t.split(" "));
        if (wordBufferRef.current.length > 20) {
          wordBufferRef.current = wordBufferRef.current.slice(-20);
        }
        if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
        bufferTimerRef.current = setTimeout(() => {
          wordBufferRef.current = [];
        }, 8000);
      }

      // Enquanto TTS fala, guardamos o texto final para validar assim que terminar
      if (isTTSSpeakingRef.current) {
        if (isFinal) {
          pendingDuringTTSRef.current.push(t);
          if (pendingDuringTTSRef.current.length > 40) {
            pendingDuringTTSRef.current = pendingDuringTTSRef.current.slice(-40);
          }
        }
        return false;
      }

      // Rejeitar apenas lixo extremo (frases enormes de fundo)
      if (t.split(" ").length > 30) return false;

      // ── MATCH DIRETO no transcript atual (interim OU final) ──
      // Crítico: runMatch() só verifica o buffer (final results).
      // Sem este check, resultados interim NUNCA fazem match —
      // e em mobile o STT pode demorar muito a finalizar.
      const candidates = [
        expectedResponseRef.current,
        ...alternativeResponsesRef.current,
      ]
        .map((c) => normalize(c || ""))
        .filter((c) => c.length > 0);

      const directMatch = candidates.some((e) => matchesExpected(t, e));

      if (directMatch) {
        matchCooldownRef.current = true;
        setTimeout(() => { matchCooldownRef.current = false; }, 2000);
        wordBufferRef.current = [];
        pendingDuringTTSRef.current = [];
        onMatchRef.current();
        return true;
      }

      // Fallback: verificar buffer acumulado (para resultados split)
      runMatch();
      if (matchCooldownRef.current) return true;

      return false;
    },
    [runMatch],
  );

  useEffect(() => {
    // Assim que TTS termina, tenta casar o que foi dito durante a fala
    if (!isTTSSpeaking) {
      runMatch();
    }
  }, [isTTSSpeaking, runMatch]);

  const startContinuousListening = useCallback(() => {
    if (!isSupported || isListeningRef.current) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SR();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3; // Pedir 3 alternativas ao STT
    recognition.lang = "es-ES";

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let bestTranscript = "";
      let isFinal = false;

      // Iterar por todos os resultados novos
      for (let i = event.resultIndex; i < event.results.length; i++) {
        isFinal = event.results[i].isFinal;
        const numAlts = event.results[i].length;

        // Verificar TODAS as alternativas do STT (não só a primeira)
        for (let alt = 0; alt < numAlts; alt++) {
          const text = event.results[i][alt].transcript;
          const confidence = event.results[i][alt].confidence;

          // Ignorar alternativas com confiança muito baixa
          if (confidence > 0 && confidence < 0.15) continue;

          if (text.trim()) {
            // Tentar match em cada alternativa — parar no primeiro match
            if (checkMatch(text, isFinal)) return;

            // Guardar o melhor transcript para feedback visual
            if (!bestTranscript) bestTranscript = text;
          }
        }
      }

      // Se nenhuma alternativa fez match, mostrar o melhor transcript como feedback
      if (bestTranscript.trim()) {
        setLastHeard(bestTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (["no-speech", "audio-capture", "aborted"].includes(event.error)) return;

      console.error("Speech recognition error:", event.error);
      if (event.error === "network") return;

      setIsListening(false);

      if (event.error !== "not-allowed" && isListeningRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          startContinuousListening();
        }, 1000);
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          startContinuousListening();
        }, 150); // 150ms — gap mínimo para não perder falas
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

    wordBufferRef.current = [];
    pendingDuringTTSRef.current = [];
    matchCooldownRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      stopContinuousListening();
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
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
