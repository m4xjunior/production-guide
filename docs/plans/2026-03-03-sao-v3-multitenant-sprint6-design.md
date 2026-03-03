# SAO v3.0 — Design: Multi-tenant SaaS Industrial + Sprint 6

> **Para Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans para criar o plano de implementação a partir deste design.

**Data:** 2026-03-03
**Branch:** `feat/advanced-ui` (worktree: `.worktrees/feat-advanced-ui`)
**Estado actual:** Sprints 1-3 mergeados em main. 40 testes passando.

---

## Contexto e Visão

O SAO (Sistema de Ayuda al Operario) serve actualmente uma única fábrica (KH Know How). O objectivo deste design é torná-lo um produto SaaS multi-tenant plug-and-play que pode ser instalado em qualquer fábrica industrial em horas, não semanas.

**Stack:** Next.js 15, Prisma 7 + PostgreSQL (Neon), ElevenLabs TTS, Web Speech API + Whisper Python, GCS, Shadcn/UI, Tailwind, Sentry, Vercel (frontend), Docker (backend services).

**Pesquisa realizada:**
- Benchmarking de Tulip, Plex, Siemens Opcenter, SAP DMC, Honeywell Vocollect, Lucas Systems, Dematic
- Arquitectura multi-tenant: Neon, Prisma Client Extensions, WorkOS SaaS patterns
- Voice-Directed Work (VDW) industrial: wake words, echo back, comandos configuráveis

---

## Arquitectura Multi-tenant

### Estratégia de Isolamento

**Escolha:** Schema compartilhado com `tenantId` em todas as tabelas raiz + Prisma Client Extensions para filtro automático.

Razões:
- Simples de desenvolver e manter para uma equipa pequena
- Uma migration serve todos os tenants
- GCS já usa prefixo por tenant (`GCS_TENANT` env var em `src/lib/gcs.ts`)
- Escape hatch futura: tenants enterprise podem migrar para Neon project dedicado sem reescrever o produto

### Identificação do Tenant

Subdomínio → middleware → header interno:

```
kh.sao.app   → middleware extrai "kh" → busca Tenant → injeta x-tenant-id
acme.sao.app → middleware extrai "acme" → busca Tenant → injeta x-tenant-id
app.sao.app  → super-admin central
```

Vercel suporta wildcard domains (`*.sao.app`) nativamente. Custom domains futuros: `sao.kh-knowhow.com`.

### Novos Modelos Prisma

```prisma
model Tenant {
  id             String    @id @default(uuid()) @db.Uuid
  slug           String    @unique                    // "kh", "acme"
  name           String                               // "KH Know How"
  logoUrl        String?   @map("logo_url")
  primaryColor   String?   @map("primary_color")      // "#8B1A1A"
  accentColor    String?   @map("accent_color")
  faviconUrl     String?   @map("favicon_url")
  systemName     String    @default("SAO") @map("system_name")
  customDomain   String?   @unique @map("custom_domain")
  ttsVoiceId     String    @default("JBFqnCBsd6RMkjVDRZzb") @map("tts_voice_id")
  ttsSpeed       Float     @default(1.0) @map("tts_speed")
  ttsStability   Float     @default(0.7) @map("tts_stability")
  ttsSimilarity  Float     @default(0.8) @map("tts_similarity")
  defaultLanguage String   @default("es") @map("default_language")
  fontSize       Int       @default(16) @map("font_size")
  theme          String    @default("dark")
  autoAdvanceDelay Int     @default(3000) @map("auto_advance_delay_ms")
  features       Json      @default("{\"whisperStt\":false,\"elevenLabsTts\":true,\"qcDefault\":false,\"barcodeScanning\":true}")
  plan           String    @default("starter")        // "starter" | "growth" | "enterprise"
  maxStations    Int       @default(10) @map("max_stations")
  maxOperators   Int       @default(50) @map("max_operators")
  erpType        String?   @map("erp_type")           // "sage" | "sap" | null
  erpConfigRef   String?   @map("erp_config_ref")     // referência a secret externo
  isActive       Boolean   @default(true) @map("is_active")
  trialEndsAt    DateTime? @map("trial_ends_at") @db.Timestamptz
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  stations       Station[]
  operators      Operator[]
  references     Reference[]
  admins         TenantAdmin[]
  voiceCommands  VoiceCommand[]
  @@map("tenants")
}

model TenantAdmin {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @map("tenant_id") @db.Uuid
  email        String
  passwordHash String    @map("password_hash")
  role         String    @default("admin")             // "admin" | "viewer"
  isActive     Boolean   @default(true) @map("is_active")
  lastLoginAt  DateTime? @map("last_login_at") @db.Timestamptz
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  tenant       Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  @@unique([tenantId, email])
  @@index([tenantId])
  @@map("tenant_admins")
}
```

**Modificações nos modelos existentes:**

- `Station`, `Operator`, `Reference`, `AuditLog` — adicionar `tenantId String @db.Uuid` + `@@index([tenantId])`
- `Operator.sageCode @unique` → `@@unique([tenantId, sageCode])` (mesmo código pode existir em tenants diferentes)
- `Reference.sageCode @unique` → `@@unique([tenantId, sageCode])`
- `GlobalSettings` absorvido pelo `Tenant` model (deprecar)
- `Step` — adicionar `videoUrl String? @map("video_url")`
- `Operator` — adicionar `language String @default("es-ES")`

**Modelos que NÃO precisam de `tenantId` direto** (já isolados via relação):
Step, StepLog, StepCondition, OperatorSession, StationSettings, StationStop, StationReference.

### Prisma Client Scoped

```typescript
// src/lib/db.ts
const TENANT_SCOPED_MODELS = ["station", "operator", "reference", "auditlog"];

export function getTenantPrisma(tenantId: string) {
  return basePrisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model.toLowerCase())) {
            if (["findMany","findFirst","findUnique","count"].includes(operation)) {
              args.where = { ...args.where, tenantId };
            }
            if (operation === "create") {
              args.data = { ...args.data, tenantId };
            }
          }
          return query(args);
        },
      },
    },
  });
}

export { basePrisma as adminPrisma }; // para super-admin sem filtro
```

### Estratégia de Migration (preservar dados KH)

1. Criar tenant KH via INSERT
2. ADD COLUMN `tenant_id UUID` nullable em todas as tabelas raiz
3. UPDATE ... SET `tenant_id = 'uuid-kh'` onde NULL
4. ALTER COLUMN NOT NULL + ADD CONSTRAINT FK + CREATE INDEX
5. DROP + ADD unique constraints compostos em operators e references
6. Actualizar schema.prisma

### Middleware Multi-tenant

`src/middleware.ts` expandido:
1. Extrair hostname → parsear subdomínio
2. Buscar Tenant no DB (cache em memória com TTL 5min)
3. Injectar `x-tenant-id` + `x-tenant-slug` nos headers internos
4. Validar TenantAdmin session (substituir senha global)

### White-labeling

Config do tenant lida no `layout.tsx` Server Component → injectada como CSS variables inline:

```html
<html style="--color-primary: #8B1A1A; --system-name: 'SAO';">
```

Cacheada com TTL de 5min. Logo servida de `tenants/{slug}/branding/logo.png` no GCS.

---

## GCS Organização

### Estrutura de Paths

```
tenants/{tenantSlug}/stations/{stationId}/steps/{stepId}/photo.{ext}
tenants/{tenantSlug}/stations/{stationId}/steps/{stepId}/video.{ext}
tenants/{tenantSlug}/stations/{stationId}/steps/{stepId}/model.glb
tenants/{tenantSlug}/stations/{stationId}/steps/{stepId}/audio.mp3
tenants/{tenantSlug}/branding/logo.png
```

### Modificação em `src/lib/gcs.ts`

```typescript
// Antes (estático via env):
const TENANT = process.env.GCS_TENANT || "p2v";

// Depois (dinâmico por request):
export function gcsPath(tenantSlug: string, ...segments: string[]): string {
  return `tenants/${tenantSlug}/${segments.join("/")}`;
}
```

Todas as rotas de upload passam `tenantSlug` (obtido do header `x-tenant-slug`).

### Upload de Vídeo

Nova rota `/api/upload/video` análoga a `/api/upload/image`:
- Aceita `multipart/form-data` com campo `video`
- Valida tipo MIME (`video/mp4`, `video/webm`, `video/quicktime`)
- Limite de tamanho: 200MB
- Path GCS: `tenants/{slug}/stations/{sid}/steps/{stepId}/video.{ext}`
- Retorna `{ url: string }`

Drag & drop no `StepEditor` (igual ao upload de imagem existente).

---

## Sistema de Comandos de Voz Configurável

### Modelo VoiceCommand

```prisma
model VoiceCommand {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  scope     String                               // "global" | "station" | "step"
  stationId String?  @map("station_id") @db.Uuid
  stepId    String?  @map("step_id") @db.Uuid
  action    String                               // ver lista abaixo
  phrases   String[]                             // ["pin bueno", "bueno", "ok"]
  isEnabled Boolean  @default(true) @map("is_enabled")
  language  String   @default("es-ES")
  sequence  String?                              // acção precedente necessária (janela 2.5s)
  context   Json?                                // condições: { stepType, responseType }
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  station   Station? @relation(fields: [stationId], references: [id])
  step      Step?    @relation(fields: [stepId], references: [id])
  @@index([tenantId, scope])
  @@map("voice_commands")
}
```

**Acções pré-definidas:**
`confirm`, `next`, `prev`, `stop`, `stop_emergency` (sequência: stop→emergency), `repeat`, `help`, `logout`, `digit_0`…`digit_9`, `delete_digit`, `submit_number`, `resume`

### Hook `useVoiceCommandEngine`

Pipeline centralizado que substitui lógica dispersa:

```
Audio → STT (ElevenLabs/Whisper/WebSpeech fallback)
      → normalizar transcript (lowercase, remover acentos)
      → checar buffer de sequências (janela 2.5s)
      → match comandos GLOBAL
      → match comandos STATION
      → match step.respuesta + step.synonyms
      → echo back TTS ("Pin bueno... confirmado")
      → executar acção
      → vibrar tablet (Vibration API)
      → log evento
```

### Sinónimos por Passo

`Step` recebe campo `synonyms String[] @default([])`. O `StepEditor` adiciona "Sinónimos" (tags input). O engine faz matching contra `[respuesta, ...synonyms]`.

### Admin `/admin/voice-commands`

- Lista de comandos globais com toggle enabled/disabled
- Por estação: override de comandos globais
- Por passo: gerido no StepEditor
- Botão "Testar comando" (microfone → mostra o que o engine reconheceria)

---

## Sprint 6 UI Features

### 3D Viewer Transparente

`StepAssemblyViewer` modificado:
```typescript
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0); // totalmente transparente
```
Remove o Card/CardContent wrapper. O viewer assenta directamente sobre o fundo da página (`#111113`). Mantém o overlay de label e instrução.

### Vídeo por Passo

Player nativo com prioridade sobre 3D e foto:
```html
<video src={step.videoUrl} autoPlay muted loop playsInline
       className="w-full aspect-video rounded-xl object-cover" />
```

Hierarquia de media: `videoUrl` > `modelUrl` > `photoUrl` > placeholder.

### Optimizações Touch Screen

- Botões de resposta mínimo `h-20 text-xl`
- Zona de swipe-up para confirmar passo (alternativa ao botão)
- Sem hover states em mobile
- Fonte aumentada no modo produção: `text-lg` → `text-xl`
- `touch-action: manipulation` para eliminar delay de 300ms

### PWA Melhorado

`sw.js` expandido com:
- Cache de assets estáticos (imagens, áudio TTS, ícones)
- Offline page personalizada (`/offline`) com tema KH
- Cache de passos da estação actual (para uso offline temporário)

Componente `InstallPrompt`:
- Interceta `beforeinstallprompt`
- Banner discreto na tela de login e no admin
- Guarda estado em localStorage (não mostrar se dispensado)

---

## Deployment Architecture

### Frontend → Vercel

O Next.js app vai sempre para Vercel. Variáveis de ambiente configuram o tenant (para desenvolvimento local ou single-tenant).

### Backend Services → Docker

```yaml
# docker-compose.yml (raiz do projecto)
version: "3.9"
services:
  sync-sage:
    build: ./sync-sage
    env_file: ./sync-sage/.env
    restart: unless-stopped

  transcription-server:
    build: ./transcription-server
    ports: ["8765:8765"]
    env_file: ./transcription-server/.env
    restart: unless-stopped
```

### Makefile

```makefile
.PHONY: start stop logs sync-once deploy migrate status

start:          ## Inicia todos os serviços Docker
    docker compose up -d

stop:           ## Para todos os serviços
    docker compose down

logs:           ## Segue logs em tempo real
    docker compose logs -f

sync-once:      ## Roda sync Sage uma vez e sai
    docker compose run --rm sync-sage sh -c "SYNC_ONCE=true node dist/index.js"

deploy:         ## Deploy do frontend para Vercel
    vercel --prod

migrate:        ## Aplica migrations Prisma no Neon
    npx prisma migrate deploy

status:         ## Estado dos containers + health
    docker compose ps
    @echo "\n--- Neon DB ---"
    @npx prisma db execute --stdin <<< "SELECT 1" 2>&1 | head -3
```

### `.env.example` (cada serviço)

Valores reais de estrutura, sem mascarar (repo privado):

**`sync-sage/.env.example`:**
```bash
SAGE_HOST=10.0.0.41
SAGE_PORT=1433
SAGE_USER=sa
SAGE_PASSWORD=
SAGE_DATABASE=KH
SAGE_ENCRYPT=false
SAGE_TRUST_CERT=true
SAGE_OPERATOR_TABLE=Operario
SAGE_CODE_COLUMN=id
SAGE_NAME_COLUMN=descripcion
SAGE_REFERENCE_TABLE=Referencia
SAGE_REF_CODE_COLUMN=id
SAGE_REF_NAME_COLUMN=descripcion
DATABASE_URL=postgresql://neondb_owner:@ep-orange-paper-ab890z35-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
SYNC_INTERVAL=60
```

**`.env.example` (Next.js / Vercel):**
```bash
DATABASE_URL=postgresql://neondb_owner:@ep-orange-paper-ab890z35-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
ADMIN_PASSWORD=
GCS_BUCKET=sao-production
GCS_TENANT=kh
GCS_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
ELEVENLABS_API_KEY=
NEXT_PUBLIC_WHISPER_WS_URL=ws://servidor-fabrica:8765
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

---

## Funcionalidades MES Prioritárias (do Benchmarking)

Com base na pesquisa, as funcionalidades que diferenciam o SAO no mercado de PMEs industriais:

**Já implementado (vantagens competitivas):**
- Voz bidirecional nativa (único entre MES tradicionais)
- Fluxos condicionais (Sprint 3)
- Simplicidade de implantação vs Siemens/SAP

**Roadmap pós-Sprint 6 (por impacto/esforço):**
1. Andon digital por voz ("ayuda" → alerta ao supervisor)
2. KPIs em tempo real no admin (tempo por passo, desvios)
3. Gamificação básica (pontos por passo sem erro)
4. Work instructions versionadas (histórico de alterações)
5. Skills matrix / qualificações por operário
6. AI Copilot para criar instruções a partir de PDFs

---

## Sprints de Implementação

### Sprint 6A — Multi-tenant Foundation
**Branch:** `feat/advanced-ui` (em curso)
**Agente:** `code-architect`
Scope: Prisma schema + migration + middleware + getTenantPrisma + GCS dinâmico + TenantAdmin auth + backfill KH

### Sprint 6B — Voice Command System
**Branch:** `feat/advanced-ui`
**Agente:** `ai-engineer`
Scope: VoiceCommand model + useVoiceCommandEngine hook + echo back + sinónimos + admin /voice-commands + testes TDD

### Sprint 6C — UI Features + PWA
**Branch:** `feat/advanced-ui`
**Agente:** `frontend-developer`
Scope: 3D viewer transparente + video player + touch optimisations + PWA InstallPrompt + sw.js melhorado

### Sprint 6D — Deployment + Docs
**Branch:** `feat/advanced-ui`
**Agente:** `deployment-engineer`
Scope: docker-compose.yml + Makefile + .env.example completos + README actualizado + documentação de onboarding

---

## Ficheiros Críticos

| Ficheiro | Tipo de Mudança |
|---|---|
| `prisma/schema.prisma` | Novos modelos Tenant, TenantAdmin, VoiceCommand; tenantId em Station/Operator/Reference/AuditLog; videoUrl/synonyms em Step |
| `src/lib/db.ts` | Substituir singleton por getTenantPrisma factory |
| `src/middleware.ts` | Adicionar resolução de tenant por subdomínio |
| `src/lib/gcs.ts` | tenantPath estático → gcsPath dinâmico |
| `src/hooks/useVoiceCommandEngine.ts` | Novo hook central de voz |
| `src/components/StepAssemblyViewer.tsx` | Fundo transparente |
| `src/components/ProductionStep.tsx` | Integrar useVoiceCommandEngine, video player, touch opts |
| `src/components/admin/StepEditor.tsx` | Upload vídeo + campo sinónimos |
| `src/app/admin/voice-commands/page.tsx` | Novo: gestão de comandos de voz |
| `docker-compose.yml` | Novo: orquestração de serviços |
| `Makefile` | Novo: targets de operação |
| `.env.example` | Actualizado com todos os campos |
| `public/sw.js` | Cache expandido + offline page |
| `src/components/InstallPrompt.tsx` | Novo: banner PWA |
