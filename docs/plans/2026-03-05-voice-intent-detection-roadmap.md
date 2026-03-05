# Roadmap: Detecção de Intenção de Voz

**Data:** 2026-03-05
**Problema:** A app dispara comandos quando o operário fala com colegas, canta ou faz qualquer ruído que contenha a palavra esperada.
**Objetivo:** A plataforma só deve responder quando o operário está FALANDO COM ELA — intencionalmente.

---

## 1. Diagnóstico — Por Que Está Falhando Hoje

O matching atual é:

```typescript
// ❌ Problema: "includes" é cego
normalizedTranscript.includes(normalizedExpected)
// "Oye Juan, qué pin bueno hiciste" → DISPARA porque contém "pin bueno"
// "Ay qué bueno" → DISPARA se expected = "bueno"
```

O sistema não distingue:
- "Pin bueno" dito ao microfone com intenção → **deve disparar**
- "Juan, qué pin tan bueno" dito a um colega → **não deve disparar**
- Alguém cantando com a palavra esperada → **não deve disparar**
- Canto de fundo com a palavra → **não deve disparar**

---

## 2. Mental Model — Como Pensar no Problema

A pergunta certa não é *"o que ele disse?"* mas sim **"ele estava me falando?"**

Existem 4 sinais para identificar intenção:

| Sinal | Fala com a plataforma | Conversa de fundo | Canto |
|---|---|---|---|
| **Duração** | Curta (1–4 seg) | Longa ou variável | Longa, sustentada |
| **Contagem de palavras** | Poucas (1–5) ≈ frase esperada | Muitas (5–20+) | Irrelevante |
| **Similaridade fonética** | Alta (≥85% da frase esperada) | Baixa (contém mas tem muito mais) | Baixa |
| **Pausa antes de falar** | Há silêncio antes (intenção) | Fluxo contínuo sem pausa | Ritmo, não pausa |

**Princípio arquitetural:** o backend não precisa ouvir áudio bruto. Ele recebe o transcript + metadados e devolve um score de intenção.

---

## 3. Arquitetura Proposta

```
Browser (Web Speech API + Web Audio API)
    │
    ├── transcript (texto)
    ├── duration_ms (duração da fala)
    ├── word_count (número de palavras)
    ├── audio_energy_db (volume médio)
    └── silence_before_ms (silêncio antes de falar)
    │
    ▼
Backend (POST /api/voice/score)
    │
    ├── score de similaridade fonética (Levenshtein)
    ├── score de proporção de palavras
    ├── score de janela temporal
    └── score de energia (campo industrial = ruído alto = precisa ser mais perto)
    │
    ▼
Intent Score: 0.0 → 1.0
    ├── < 0.6  → ignorar
    ├── 0.6–0.8 → feedback visual "ouvindo..." mas não avança
    └── > 0.8  → avança o passo ✅
```

---

## 4. Fases de Implementação

---

### FASE 1 — Matching Cirúrgico (sem backend, rápido)

**Objetivo:** Eliminar 80% dos falsos positivos só com heurísticas no browser.

**Problema raiz:** `includes()` é cego. Substituir por matching posicional.

#### Fix 1.1 — Word Count Gate

A frase esperada tem N palavras. Se o transcript tem mais de `N × 2` palavras, é conversa de fundo.

```typescript
function wordCountGate(transcript: string, expected: string): boolean {
  const tWords = transcript.trim().split(/\s+/).length;
  const eWords = expected.trim().split(/\s+/).length;
  return tWords <= eWords * 2.5; // permite variação de 150% no máximo
}
```

Exemplo: expected = "pin bueno" (2 palavras) → aceita até 5 palavras no transcript.
"Pin bueno" ✅ | "Oye Juan qué pin bueno hiciste hoy" ❌ (7 palavras)

#### Fix 1.2 — Anchor Matching (começo ou fim)

A resposta intencional geralmente preenche o transcript quase inteiro.
Substituir `includes()` por: a frase esperada deve estar **no início ou no final** do transcript, não enterrada no meio.

```typescript
function anchorMatch(transcript: string, expected: string): boolean {
  const t = transcript.trim();
  const e = expected.trim();

  // Início: "pin bueno algo" ← esperado no início
  if (t.startsWith(e)) return true;
  // Fim: "ya sí pin bueno" ← esperado no fim (STT pode adicionar conectivo)
  if (t.endsWith(e)) return true;
  // Transcript É a frase esperada (match exato com variação mínima)
  if (t === e) return true;
  // Transcript tem no máximo 1 palavra extra E contém a frase
  const extra = t.replace(e, "").trim().split(/\s+/).filter(Boolean).length;
  return t.includes(e) && extra <= 1;
}
```

#### Fix 1.3 — Phonetic Similarity Score (Levenshtein normalizado)

Em vez de binário (match/no-match), calcular um score 0–1.

```typescript
function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[a.length][b.length];
}

function similarityScore(transcript: string, expected: string): number {
  const t = transcript.trim().toLowerCase();
  const e = expected.trim().toLowerCase();
  const maxLen = Math.max(t.length, e.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(t, e) / maxLen;
}

// Uso: só avança se score >= 0.75
const score = similarityScore(transcript, expectedResponse);
if (score >= 0.75) onMatch();
```

**Resultado esperado da Fase 1:** Falsos positivos caem ~80%. Implementação: 1–2 dias.

---

### FASE 2 — Response Window (Janela Temporal)

**Objetivo:** O microfone só "escuta de verdade" nos momentos certos.

**Insight:** Há um padrão natural:
1. TTS fala a instrução (ex: "Diga PIN BUENO quando confirmar")
2. Operário processa (1–3 segundos de silêncio)
3. Operário fala a resposta
4. Plataforma avança

Fora desse ciclo, qualquer fala é ruído.

#### Fix 2.1 — Janela de Resposta Explícita

```typescript
// Estado: ESCUTANDO_RESPOSTA ou AGUARDANDO
type ListeningState = "idle" | "tts_playing" | "response_window" | "cooldown";

// Ao terminar o TTS:
// → Abrir janela de 8 segundos
// → Qualquer fala dentro da janela é candidata a comando
// → Fora da janela, score mínimo sobe de 0.75 para 0.95 (quase exato)

const RESPONSE_WINDOW_MS = 8000;
const [listeningState, setListeningState] = useState<ListeningState>("idle");

// threshold dinâmico:
const threshold = listeningState === "response_window" ? 0.75 : 0.95;
```

#### Fix 2.2 — Cooldown Anti-Duplicata

Após disparar um match, ignorar qualquer fala por 2 segundos.
Evita duplo disparo se o operário fala um pouco mais longo.

---

### FASE 3 — Audio Feature Analysis (Web Audio API)

**Objetivo:** Detectar canto e ruído que o STT não filtra.

O Web Speech API só devolve texto. Para detectar padrões de áudio (canto, ruído industrial), precisamos do **Web Audio API** em paralelo.

#### Fix 3.1 — Speech Duration Gate

Capturar quando o usuário começa e termina de falar via Web Audio API.

```typescript
// Detectar onset e offset de fala
// Fala intencional: duração típica 0.5–3 segundos
// Conversa longa: >4 segundos → ignora
// Canto: detectado por duração sustentada + pitch estável

const MAX_COMMAND_DURATION_MS = 4000; // >4s = não é comando
```

#### Fix 3.2 — Pre-Speech Silence Gate

Quando alguém quer dar um comando intencional, há tipicamente uma micropausa antes de falar.
Medir o silêncio nos 800ms antes do onset de fala.

```typescript
// Silêncio pré-fala < 200ms → fluxo contínuo de conversa → penalizar score
// Silêncio pré-fala > 400ms → fala intencional → boost no score
```

#### Fix 3.3 — Detecção de Canto via FFT

Canto = notas sustentadas = frequência dominante estável por >800ms.
Conversa = frequência fundamental varia constantemente.

```typescript
// Usar AnalyserNode para FFT a cada 100ms
// Se frequência dominante varia < 50Hz por >800ms = canto
// Se varia > 200Hz em <500ms = fala normal
```

---

### FASE 4 — Backend Scoring API

**Objetivo:** Centralizar toda a lógica de scoring no backend para poder treinar e ajustar sem deploy.

#### Endpoint

```
POST /api/voice/score
```

#### Request

```json
{
  "transcript": "pin bueno",
  "expected": "pin bueno",
  "metadata": {
    "duration_ms": 800,
    "word_count": 2,
    "silence_before_ms": 450,
    "audio_energy_db": -18,
    "listening_state": "response_window"
  }
}
```

#### Response

```json
{
  "intent_score": 0.92,
  "signals": {
    "phonetic_similarity": 0.97,
    "word_proportion": 1.0,
    "temporal_bonus": 0.15,
    "silence_bonus": 0.10,
    "duration_ok": true
  },
  "decision": "accept"
}
```

#### Lógica de Scoring

```typescript
// Fórmula composta (pesos ajustáveis por tenant/ambiente)
function calcScore(input: ScoreInput): number {
  const phonetic = similarityScore(input.transcript, input.expected);    // 0–1
  const proportion = wordProportionScore(input.transcript, input.expected); // 0–1
  const temporal = input.listeningState === "response_window" ? 0.15 : 0;
  const silence = input.silenceBeforeMs > 400 ? 0.10 : 0;
  const durationPenalty = input.durationMs > 4000 ? -0.30 : 0;

  const raw = phonetic * 0.60 + proportion * 0.25 + temporal + silence + durationPenalty;
  return Math.min(1.0, Math.max(0.0, raw));
}
```

**Vantagem:** Cada tenant (fábrica) pode ter threshold e pesos diferentes.
Fábrica barulhenta → threshold mais alto. Ambiente silencioso → threshold mais baixo.

---

### FASE 5 — VAD + Modelo Leve (Avançado)

**Objetivo:** Detectar com 95%+ de precisão se há voz humana no áudio vs. ruído/música.

#### Opção A — Silero VAD (ONNX no browser)

- Modelo: 1.8MB, roda 100% no browser via ONNX Runtime Web
- Detecta: voz humana vs. ruído vs. música com 95% accuracy
- Latência: <10ms por janela de 100ms
- Não precisa de backend

```
npm install onnxruntime-web
# Baixar modelo: silero_vad.onnx (1.8MB)
```

Uso: antes de enviar transcript pro backend, verificar se o audio chunk era voz humana. Se não era voz (era ruído/música), descartar o transcript.

#### Opção B — Speaker Enrollment (Verificação de Locutor)

- Gravar "assinatura de voz" do operário no cadastro
- A cada transcript, verificar se a voz pertence ao operário cadastrado
- Rejeitar fala de outros ao redor
- Requer: 3–5 segundos de áudio de referência por operário

---

## 5. Cronograma de Implementação

| Fase | Implementação | Impacto | Esforço |
|---|---|---|---|
| Fase 1: Matching cirúrgico | `useContinuousSpeechRecognition.ts` | Elimina 80% falsos positivos | 1–2 dias |
| Fase 2: Response window | `page.tsx` + estado de escuta | +10% precisão | 1 dia |
| Fase 3: Web Audio API | Novo hook `useAudioAnalyzer.ts` | Detecta canto e conversa longa | 3–4 dias |
| Fase 4: Backend scoring | `POST /api/voice/score` | Controle centralizado por tenant | 2–3 dias |
| Fase 5: Silero VAD | Integração ONNX | 95%+ precisão total | 4–5 dias |

**Recomendação:** Implementar Fase 1 + 2 primeiro. São 2–3 dias de trabalho e resolvem o problema principal sem infraestrutura nova.

---

## 6. O Que NÃO Fazer

- ❌ **Não usar STT do backend para processar áudio bruto** — latência alta, custo de banda, complexidade desnecessária para este caso
- ❌ **Não depender de "push-to-talk"** — operário industrial tem as mãos ocupadas
- ❌ **Não treinar modelo próprio do zero** — Silero VAD já está treinado e é pequeno
- ❌ **Não aumentar threshold para resolver tudo** — score alto demais recusa falas válidas com ruído

---

## 7. Métricas de Sucesso

| Métrica | Atual (estimado) | Meta Fase 1+2 | Meta Fase 3+4 |
|---|---|---|---|
| Falsos positivos / hora | ~5–10 | <1 | <0.1 |
| Taxa de aceitação válida | ~85% | ~90% | ~97% |
| Latência de decisão | 0ms (local) | <50ms (local) | <80ms (com API) |
