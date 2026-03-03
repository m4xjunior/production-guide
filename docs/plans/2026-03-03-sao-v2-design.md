# SAO v2.0 — Design Document
**Data:** 2026-03-03
**Projeto:** Pick to Voice — Sistema de Ayuda al Operario
**Versão:** 2.0

---

## Contexto (O que já existe)

Os 5 agentes de estudo mapearam o estado atual:

### Funciona 100%
- CRUD admin de estações e passos (16 endpoints)
- ElevenLabs TTS pré-gerado + GCS storage
- Google Cloud Storage (imagens, áudio)
- Autenticação admin via header
- Relatórios de presença e produção
- Reconhecimento de voz via Web Speech API

### Funciona parcialmente
- Whisper Python server: **funciona mas NUNCA conectado ao frontend**
- Upload de imagens: **funciona mas sem drag-and-drop visual**
- Seed: **bug no path de imagens** (`/products/00610/images/P1.png` → deveria ser `/products/00610/P1.png`)
- 66 passos do seed sem `vozAudioUrl` (TTS nunca gerado para eles)

### Não existe
- PWA (manifest, service worker, ícones, install prompt)
- Modelo de Settings (global + por estação)
- Hook WebSocket para Whisper
- Drag-and-drop visual para upload
- Transições animadas entre passos
- Multi-mídia por passo (só 1 foto)
- Import visual de Excel no admin
- RabbitMQ, MSSQL (aguardar credenciais)

---

## Arquitetura Escolhida

### Stack mantido (sem mudanças)
- **Next.js 15.5.2** App Router — frontend + API routes
- **Prisma 7** + **PostgreSQL** — banco de dados principal
- **GCS** — armazenamento de todos os arquivos de mídia
- **ElevenLabs** — geração de áudio TTS
- **shadcn/ui** — componentes UI
- **Python/FastAPI** — exclusivamente para WebSocket de transcrição Whisper

### Novos componentes
- **Settings**: modelo no PostgreSQL, API REST, UI no admin
- **WebSocket hook**: `useWhisperSTT.ts` conecta ao servidor Python local
- **Media**: modelo multi-mídia por passo (fase 2)
- **PWA**: manifest + service worker + ícones

### O que NÃO entrar na Fase 1
- MSSQL (aguardar credenciais)
- RabbitMQ (overhead para fase inicial)
- Modelos 3D
- Backend Python separado para mídia (desnecessário — Next.js API routes já fazem isso)

---

## Fase 1 — Sprint Atual (Implementar imediatamente)

### 1. Fix críticos (30 min)
- **Bug path imagens seed**: corrigir `/images/` extra na seed.ts
- **Gerar TTS em lote**: chamar `POST /api/tts/generate-all` para os 66 passos sem áudio
- **Upload imagens GCS**: script para subir os 39 PNGs locais para GCS e atualizar DB

### 2. PWA completo
**Arquivos a criar:**
- `/public/manifest.json` — configuração PWA
- `/public/sw.js` — service worker (cache first para assets, network first para API)
- `/public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
- Atualizar `src/app/layout.tsx` — meta tags viewport, theme-color, apple

**Comportamento:**
- Instala no tablet do operário como app nativo
- Cache offline para passos já carregados
- Background sync para step logs quando offline

### 3. WebSocket Whisper (precisão máxima)
**Arquivo a criar:** `src/hooks/useWhisperSTT.ts`

```
Fluxo:
1. Conecta a ws://localhost:8765/ws/transcribe
2. Envia {"action": "start"}
3. Captura áudio via AudioContext (16kHz, mono, float32)
4. Envia chunks binários a cada 0.5s
5. Recebe {"type":"transcription","text":"...","is_final":true}
6. Faz matching com expectedResponse (igual ao useContinuousSpeechRecognition)
7. Fallback: se WebSocket falhar, usa Web Speech API
```

**Atualizar:** `ProductionStep.tsx` usa `useWhisperSTT` quando server disponível

### 4. Sistema de Settings
**Schema Prisma (novo modelo):**
```prisma
model GlobalSettings {
  id               String   @id @default("global")
  ttsVoiceId       String   @default("JBFqnCBsd6RMkjVDRZzb")
  ttsSpeed         Float    @default(1.0)
  defaultLanguage  String   @default("es")
  fontSize         Int      @default(16)
  theme            String   @default("light")
  updatedAt        DateTime @updatedAt
  updatedBy        String?
}

model StationSettings {
  id               String   @id @default(uuid())
  stationId        String   @unique
  station          Station  @relation(...)
  ttsVoiceId       String?
  fontSize         Int?
  backgroundColor  String?
  updatedAt        DateTime @updatedAt
}
```

**API:**
- `GET/PUT /api/config/global`
- `GET/PUT /api/config/stations/[id]`

**Admin UI:**
- Nova página `/admin/settings` — configurações globais com preview em tempo real
- Aba "Configuraciones" na página da estação

### 5. Drag-and-drop de mídia
**Componente:** `src/components/admin/MediaDropzone.tsx`
- Zona de drop visual com dashed border + ícone
- Suporte: imagens (JPEG, PNG, WebP), vídeos (MP4), drag from desktop e mobile
- Progress bar por arquivo
- Preview thumbnail instantâneo
- Substituir o input file atual no editor de passos

### 6. Animações de transição (react-spring)
**Arquivo:** `src/components/StepTransition.tsx`
- Usa `useTransition` do react-spring
- Slide horizontal ao avançar/recuar passos
- Fade + scale no auto-advance
- Glow verde ao completar passo com sucesso

---

## Fase 2 — Após Fase 1 estável

### Multi-mídia por passo
```prisma
model StepMedia {
  id        String   @id @default(uuid())
  stepId    String
  type      String   // image | video | 3d
  url       String
  order     Int
  createdAt DateTime @default(now())
}
```

### Import de Excel/CSV visual no admin
- Upload de CSV + ZIP de imagens no admin
- Preview antes de confirmar
- Validação de campos obrigatórios
- Relatório de erros por linha

### Modo offline robusto
- IndexedDB para cache dos dados dos passos
- Queue de step logs para sync posterior

---

## Fase 3 — Quando credenciais chegarem

### MSSQL (Sage ERP)
- Segundo datasource no Prisma
- Sync de `productCode` com ordens de produção
- Webhooks de produção para Sage

### RabbitMQ
- Fila de jobs para TTS em lote
- Fila para upload de mídia pesada
- Workers separados

---

## Critérios de Sucesso — Fase 1

| Critério | Verificação |
|----------|-------------|
| PWA instalável no tablet | Chrome → "Instalar app" aparece |
| Whisper transcribe "PIN BUENO" | Demo ao vivo no chão de fábrica |
| Settings global muda fonte em todas telas | Testar no admin |
| Drag-and-drop aceita imagem | Arrastar PNG para a zona |
| Transição suave entre passos | Animação visível no operador |
| 66 passos com áudio ElevenLabs | Endpoint `/api/tts/generate-all` retorna 66 |
| Imagens dos 5 produtos servidas do GCS | Sem 404 nas fotos |

---

## Estimativa de Escopo — Fase 1

| Item | Complexidade |
|------|-------------|
| Fix seed + upload imagens | Baixa |
| PWA completo | Média |
| useWhisperSTT hook | Média |
| Settings schema + API | Média |
| Settings Admin UI | Média |
| MediaDropzone | Baixa |
| Animações react-spring | Baixa |

**Total Fase 1:** ~200-300 linhas de código novo, ~5 arquivos novos, ~8 arquivos modificados
