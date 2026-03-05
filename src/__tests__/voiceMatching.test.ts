import { describe, it, expect } from "vitest";
import {
  normalize,
  phoneticNormalize,
  wordsSimilar,
  matchesExpected,
} from "@/hooks/useContinuousSpeechRecognition";

// ── normalize ──────────────────────────────────────────────────────

describe("normalize", () => {
  it("lowercase + trim", () => {
    expect(normalize("  PIN BUENO  ")).toBe("pin bueno");
  });

  it("remove acentos", () => {
    expect(normalize("próximo está")).toBe("proximo esta");
  });

  it("remove pontuação", () => {
    expect(normalize("pin bueno.")).toBe("pin bueno");
    expect(normalize('"PIN BUENO"')).toBe("pin bueno");
    expect(normalize("ok!")).toBe("ok");
  });

  it("normaliza espaços múltiplos", () => {
    expect(normalize("pin   bueno")).toBe("pin bueno");
  });

  it("remove caracteres especiais mantendo números", () => {
    expect(normalize("ref-123")).toBe("ref123");
  });

  it("string vazia", () => {
    expect(normalize("")).toBe("");
    expect(normalize("   ")).toBe("");
  });

  it("leading space do STT", () => {
    expect(normalize(" pin bueno")).toBe("pin bueno");
  });
});

// ── phoneticNormalize ──────────────────────────────────────────────

describe("phoneticNormalize", () => {
  it("v→b", () => {
    expect(phoneticNormalize("vueno")).toBe("bueno");
  });

  it("z→s", () => {
    expect(phoneticNormalize("zapato")).toBe("sapato");
  });

  it("h mudo", () => {
    expect(phoneticNormalize("hola")).toBe("ola");
  });

  it("ll→y", () => {
    expect(phoneticNormalize("llave")).toBe("yabe");
  });

  it("ce→se", () => {
    expect(phoneticNormalize("hacer")).toBe("aser");
  });

  it("preserva palavras sem confusão fonética", () => {
    expect(phoneticNormalize("pin")).toBe("pin");
    expect(phoneticNormalize("bueno")).toBe("bueno");
  });
});

// ── wordsSimilar ───────────────────────────────────────────────────

describe("wordsSimilar", () => {
  it("idênticas", () => {
    expect(wordsSimilar("bueno", "bueno")).toBe(true);
  });

  it("fonéticas: vueno ≈ bueno", () => {
    expect(wordsSimilar("vueno", "bueno")).toBe(true);
  });

  it("prefixo: buenoo ≈ bueno", () => {
    expect(wordsSimilar("buenoo", "bueno")).toBe(true);
  });

  it("sufixo: eno no fim de bueno", () => {
    expect(wordsSimilar("eno", "bueno")).toBe(true);
  });

  it("edit distance 1: fin ≈ pin", () => {
    expect(wordsSimilar("fin", "pin")).toBe(true);
  });

  it("edit distance 1: bin ≈ pin", () => {
    expect(wordsSimilar("bin", "pin")).toBe(true);
  });

  it("edit distance 2 para longas: siguente ≈ siguiente", () => {
    expect(wordsSimilar("siguente", "siguiente")).toBe(true);
  });

  it("muito diferentes: hola ≠ bueno", () => {
    expect(wordsSimilar("hola", "bueno")).toBe(false);
  });

  it("muito diferentes: casa ≠ pin", () => {
    expect(wordsSimilar("casa", "pin")).toBe(false);
  });

  it("palavras curtas iguais", () => {
    expect(wordsSimilar("si", "si")).toBe(true);
  });

  it("palavras curtas diferentes", () => {
    expect(wordsSimilar("si", "no")).toBe(false);
  });
});

// ── matchesExpected ────────────────────────────────────────────────

describe("matchesExpected", () => {
  // ── Exact ──
  it("match exato", () => {
    expect(matchesExpected("pin bueno", "pin bueno")).toBe(true);
  });

  // ── Containment ──
  it("transcript contém expected", () => {
    expect(matchesExpected("ah pin bueno si", "pin bueno")).toBe(true);
  });

  it("expected contém transcript", () => {
    expect(matchesExpected("bueno", "pin bueno")).toBe(true);
  });

  // ── Phonetic ──
  it("phonetic: 'pin vueno' ≈ 'pin bueno'", () => {
    expect(matchesExpected("pin vueno", "pin bueno")).toBe(true);
  });

  it("phonetic containment: 'ah pin vueno' ≈ 'pin bueno'", () => {
    expect(matchesExpected("ah pin vueno", "pin bueno")).toBe(true);
  });

  // ── Word overlap ──
  it("word overlap: 'pin' com 'pin bueno' (50%)", () => {
    expect(matchesExpected("pin", "pin bueno")).toBe(true);
  });

  it("word overlap: 'bueno' com 'pin bueno' (50%)", () => {
    expect(matchesExpected("bueno", "pin bueno")).toBe(true);
  });

  // ── Fuzzy ──
  it("fuzzy: 'fin bueno' ≈ 'pin bueno'", () => {
    expect(matchesExpected("fin bueno", "pin bueno")).toBe(true);
  });

  it("fuzzy: 'fin' match com 'pin bueno' (edit dist 1 + 50%)", () => {
    expect(matchesExpected("fin", "pin bueno")).toBe(true);
  });

  // ── Single-word aggressive ──
  it("comando curto: 'ah ok si' match com 'ok'", () => {
    expect(matchesExpected("ah ok si", "ok")).toBe(true);
  });

  it("comando curto: 'bueno bueno' match com 'bueno'", () => {
    expect(matchesExpected("bueno bueno", "bueno")).toBe(true);
  });

  it("comando curto fuzzy: 'vueno' match com 'bueno' (fonético)", () => {
    expect(matchesExpected("vueno", "bueno")).toBe(true);
  });

  it("comando curto fuzzy: 'buen' match com 'bueno' (prefixo)", () => {
    expect(matchesExpected("buen", "bueno")).toBe(true);
  });

  // ── Real-world STT outputs ──
  it("STT real: ' pin bueno' (leading space normalizado)", () => {
    // O normalize é chamado pelo hook; aqui testamos matchesExpected pré-normalizado
    expect(matchesExpected("pin bueno", "pin bueno")).toBe(true);
  });

  it("STT real: 'pin bueno.' → normalizado 'pin bueno'", () => {
    expect(matchesExpected("pin bueno", "pin bueno")).toBe(true);
  });

  it("STT com ruído: 'digo pin bueno ya' contém expected", () => {
    expect(matchesExpected("digo pin bueno ya", "pin bueno")).toBe(true);
  });

  it("confirmar pieza — match exato", () => {
    expect(matchesExpected("confirmar pieza", "confirmar pieza")).toBe(true);
  });

  it("confirmar — 50% de 'confirmar pieza'", () => {
    expect(matchesExpected("confirmar", "confirmar pieza")).toBe(true);
  });

  it("3 palavras: 2/3 match (67%)", () => {
    expect(matchesExpected("pin bueno hoy", "pin bueno listo")).toBe(true);
  });

  // ── Should NOT match ──
  it("rejeita frase sem overlap", () => {
    expect(matchesExpected("hola como estas", "pin bueno")).toBe(false);
  });

  it("rejeita palavras completamente diferentes", () => {
    expect(matchesExpected("casa mesa", "pin bueno")).toBe(false);
  });

  it("string vazia não faz match", () => {
    expect(matchesExpected("", "pin bueno")).toBe(false);
    expect(matchesExpected("pin bueno", "")).toBe(false);
  });

  it("1/3 palavras (33% < 50%) não faz match", () => {
    expect(matchesExpected("solo", "pin bueno listo")).toBe(false);
  });
});
