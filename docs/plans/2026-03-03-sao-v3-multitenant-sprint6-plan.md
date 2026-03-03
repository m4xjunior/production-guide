# SAO v3.0 — Sprint 6: Multi-tenant + UI + Voz + Deploy

> **Para Claude:** Este plan usa agentes especializados. Cada tarea indica su agente: `code-architect`, `ai-engineer`, `frontend-developer` o `deployment-engineer`. NO usar agentes genéricos.
>
> **REQUIRED SUB-SKILL:** Use `superpowers:subagent-driven-development` para ejecutar este plan tarea a tarea.

**Goal:** Transformar SAO de app single-tenant en SaaS industrial multi-fábrica plug-and-play con comandos de voz configurables, UI touch-optimized y deployment Docker+Vercel reproducible.

**Architecture:** Schema compartido con tenantId en tablas raíz + Prisma Client Extensions para filtro automático por tenant. Subdomínio → middleware → x-tenant-id header. Frontend Vercel, backend services Docker, Makefile para operaciones.

**Tech Stack:** Next.js 15, Prisma 7 + PostgreSQL Neon, ElevenLabs TTS, Web Speech API, Three.js, GCS, Shadcn/UI, Tailwind, Sentry, Docker Compose.

**Branch:** `feat/advanced-ui` (worktree: `.worktrees/feat-advanced-ui`)

**Tests baseline:** 40 tests passing. Mantener o aumentar.

---

## SPRINT 6A — Multi-tenant Foundation

> **Agente:** `code-architect`
> Cuidado con la migración: hay datos reales de KH en producción. NO borrar datos.

---

### Tarea 1: Schema Prisma — Modelo Tenant y TenantAdmin

**Agente:** `code-architect`

**Files:**
- Modify: `prisma/schema.prisma`

**Contexto:**
El schema actual tiene `GlobalSettings` con config TTS/tema/idioma. El nuevo modelo `Tenant` absorbe ese contenido y añade multi-tenancy. `TenantAdmin` reemplaza la contraseña global de admin (`ADMIN_PASSWORD` env var).

**Paso 1: Añadir modelos Tenant y TenantAdmin al final de `prisma/schema.prisma`**

```prisma
/// Tenant (fábrica cliente) — root de todos los datos multi-tenant
model Tenant {
  id              String    @id @default(uuid()) @db.Uuid
  slug            String    @unique                       // "kh", "acme"
  name            String                                  // "KH Know How"
  logoUrl         String?   @map("logo_url")
  primaryColor    String?   @map("primary_color")        // "#8B1A1A"
  accentColor     String?   @map("accent_color")
  faviconUrl      String?   @map("favicon_url")
  systemName      String    @default("SAO") @map("system_name")
  customDomain    String?   @unique @map("custom_domain")
  ttsVoiceId      String    @default("JBFqnCBsd6RMkjVDRZzb") @map("tts_voice_id")
  ttsSpeed        Float     @default(1.0) @map("tts_speed")
  ttsStability    Float     @default(0.7) @map("tts_stability")
  ttsSimilarity   Float     @default(0.8) @map("tts_similarity")
  defaultLanguage String    @default("es") @map("default_language")
  fontSize        Int       @default(16) @map("font_size")
  theme           String    @default("dark")
  autoAdvanceDelay Int      @default(3000) @map("auto_advance_delay_ms")
  features        Json      @default("{\"whisperStt\":false,\"elevenLabsTts\":true,\"qcDefault\":false,\"barcodeScanning\":true}")
  plan            String    @default("starter")          // "starter" | "growth" | "enterprise"
  maxStations     Int       @default(10) @map("max_stations")
  maxOperators    Int       @default(50) @map("max_operators")
  erpType         String?   @map("erp_type")             // "sage" | "sap" | null
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  stations      Station[]
  operators     Operator[]
  references    Reference[]
  admins        TenantAdmin[]
  voiceCommands VoiceCommand[]

  @@map("tenants")
}

/// Admin de un tenant (reemplaza ADMIN_PASSWORD global)
model TenantAdmin {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @map("tenant_id") @db.Uuid
  email        String
  passwordHash String    @map("password_hash")
  role         String    @default("admin")               // "admin" | "viewer"
  isActive     Boolean   @default(true) @map("is_active")
  lastLoginAt  DateTime? @map("last_login_at") @db.Timestamptz
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, email])
  @@index([tenantId])
  @@map("tenant_admins")
}
```

**Paso 2: Añadir `tenantId` a modelos existentes**

En `Station`, después de `updatedBy String?`:
```prisma
  tenantId  String  @map("tenant_id") @db.Uuid
  tenant    Tenant  @relation(fields: [tenantId], references: [id])
  @@index([tenantId])
```
Eliminar la línea `@@map("stations")` antigua y reponerla al final.

En `Operator`, después de `updatedAt`:
```prisma
  tenantId  String  @map("tenant_id") @db.Uuid
  language  String  @default("es-ES")
  tenant    Tenant  @relation(fields: [tenantId], references: [id])
  @@index([tenantId])
```
Cambiar `sageCode String @unique` → `sageCode String @map("sage_code")` (unique pasa a ser compuesto).
Añadir `@@unique([tenantId, sageCode])`.

En `Reference`, después de `createdAt`:
```prisma
  tenantId  String  @map("tenant_id") @db.Uuid
  tenant    Tenant  @relation(fields: [tenantId], references: [id])
  @@index([tenantId])
```
Cambiar `sageCode String @unique` → `sageCode String @map("sage_code")`.
Añadir `@@unique([tenantId, sageCode])`.

En `AuditLog`, añadir:
```prisma
  tenantId  String  @map("tenant_id") @db.Uuid
  @@index([tenantId])
```

En `Step`, añadir después de `periodEveryN`:
```prisma
  videoUrl  String? @map("video_url")     /// URL GCS del video por paso
  synonyms  String[] @default([])         /// Sinónimos para reconocimiento de voz
```

**Paso 3: Añadir modelo VoiceCommand**

```prisma
/// Comandos de voz configurables por tenant (scope: global | station | step)
model VoiceCommand {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  scope     String                               // "global" | "station" | "step"
  stationId String?  @map("station_id") @db.Uuid
  stepId    String?  @map("step_id") @db.Uuid
  action    String                               // "confirm" | "next" | "prev" | "stop" | "logout" | "digit_N" | "repeat" | "help"
  phrases   String[]                             // ["pin bueno", "bueno", "ok"] — primero = canónico
  isEnabled Boolean  @default(true) @map("is_enabled")
  language  String   @default("es-ES")
  sequence  String?                              // acción previa requerida (ventana 2.5s)
  context   Json?                                // condiciones: { stepType?, responseType? }
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  tenant  Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  station Station? @relation(fields: [stationId], references: [id])
  step    Step?    @relation(fields: [stepId], references: [id])

  @@index([tenantId, scope])
  @@map("voice_commands")
}
```

Añadir en `Station`: `voiceCommands VoiceCommand[]`
Añadir en `Step`: `voiceCommands VoiceCommand[]`

**Paso 4: Verificar que el schema no tenga errores**

```bash
cd .worktrees/feat-advanced-ui
npx prisma validate
```
Esperado: sin errores.

**Paso 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(6a): schema Prisma — Tenant, TenantAdmin, VoiceCommand, tenantId en modelos raíz"
```

---

### Tarea 2: Migration SQL Manual (preservar datos KH)

**Agente:** `code-architect`

**Files:**
- Create: `prisma/migrations/20260303000001_multitenant_foundation/migration.sql`

**Contexto:**
No se puede usar `prisma migrate dev` porque hay datos reales en Neon que no podemos perder. La migration debe:
1. Crear tablas nuevas
2. Hacer backfill del tenant KH
3. Añadir columnas con NOT NULL después del backfill

**Paso 1: Crear el directorio de migration**

```bash
mkdir -p .worktrees/feat-advanced-ui/prisma/migrations/20260303000001_multitenant_foundation
```

**Paso 2: Crear `migration.sql`**

```sql
-- Migration: Multi-tenant Foundation
-- IMPORTANTE: preserva datos existentes de KH (tenant slug = "kh")

-- 1. Crear tabla tenants
CREATE TABLE IF NOT EXISTS "tenants" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "slug"             TEXT         NOT NULL,
  "name"             TEXT         NOT NULL,
  "logo_url"         TEXT,
  "primary_color"    TEXT,
  "accent_color"     TEXT,
  "favicon_url"      TEXT,
  "system_name"      TEXT         NOT NULL DEFAULT 'SAO',
  "custom_domain"    TEXT,
  "tts_voice_id"     TEXT         NOT NULL DEFAULT 'JBFqnCBsd6RMkjVDRZzb',
  "tts_speed"        DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "tts_stability"    DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  "tts_similarity"   DOUBLE PRECISION NOT NULL DEFAULT 0.8,
  "default_language" TEXT         NOT NULL DEFAULT 'es',
  "font_size"        INTEGER      NOT NULL DEFAULT 16,
  "theme"            TEXT         NOT NULL DEFAULT 'dark',
  "auto_advance_delay_ms" INTEGER NOT NULL DEFAULT 3000,
  "features"         JSONB        NOT NULL DEFAULT '{"whisperStt":false,"elevenLabsTts":true,"qcDefault":false,"barcodeScanning":true}',
  "plan"             TEXT         NOT NULL DEFAULT 'starter',
  "max_stations"     INTEGER      NOT NULL DEFAULT 10,
  "max_operators"    INTEGER      NOT NULL DEFAULT 50,
  "erp_type"         TEXT,
  "is_active"        BOOLEAN      NOT NULL DEFAULT true,
  "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_key" ON "tenants"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_custom_domain_key" ON "tenants"("custom_domain");

-- 2. Insertar tenant KH (backfill de datos existentes)
-- NOTA: Cambiar primaryColor y name si es necesario
INSERT INTO "tenants" ("id", "slug", "name", "primary_color", "tts_voice_id", "theme")
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'kh',
  'KH Know How',
  '#8B1A1A',
  'JBFqnCBsd6RMkjVDRZzb',
  'dark'
)
ON CONFLICT ("slug") DO NOTHING;

-- 3. Crear tabla tenant_admins
CREATE TABLE IF NOT EXISTS "tenant_admins" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "email"         TEXT        NOT NULL,
  "password_hash" TEXT        NOT NULL,
  "role"          TEXT        NOT NULL DEFAULT 'admin',
  "is_active"     BOOLEAN     NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "tenant_admins_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_admins_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_admins_tenant_id_email_key" ON "tenant_admins"("tenant_id", "email");
CREATE INDEX IF NOT EXISTS "tenant_admins_tenant_id_idx" ON "tenant_admins"("tenant_id");

-- 4. Añadir tenant_id (nullable primero) a tablas existentes
ALTER TABLE "stations"   ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE "operators"  ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE "operators"  ADD COLUMN IF NOT EXISTS "language"  TEXT NOT NULL DEFAULT 'es-ES';
ALTER TABLE "references" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- 5. Backfill: asignar todos los registros al tenant KH
UPDATE "stations"   SET "tenant_id" = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE "tenant_id" IS NULL;
UPDATE "operators"  SET "tenant_id" = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE "tenant_id" IS NULL;
UPDATE "references" SET "tenant_id" = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE "tenant_id" IS NULL;
UPDATE "audit_logs" SET "tenant_id" = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE "tenant_id" IS NULL;

-- 6. Aplicar NOT NULL + FK + índices
ALTER TABLE "stations"   ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "operators"  ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "references" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "stations"   ADD CONSTRAINT "stations_tenant_id_fkey"   FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");
ALTER TABLE "operators"  ADD CONSTRAINT "operators_tenant_id_fkey"   FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");
ALTER TABLE "references" ADD CONSTRAINT "references_tenant_id_fkey"  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");

CREATE INDEX IF NOT EXISTS "stations_tenant_id_idx"   ON "stations"("tenant_id");
CREATE INDEX IF NOT EXISTS "operators_tenant_id_idx"  ON "operators"("tenant_id");
CREATE INDEX IF NOT EXISTS "references_tenant_id_idx" ON "references"("tenant_id");
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- 7. Reemplazar unique constraints simples por compuestos en operators y references
-- (mismo sageCode puede existir en tenants distintos)
DROP INDEX IF EXISTS "operators_sage_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "operators_tenant_sage_code_key" ON "operators"("tenant_id", "sage_code");
DROP INDEX IF EXISTS "references_sage_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "references_tenant_sage_code_key" ON "references"("tenant_id", "sage_code");

-- 8. Añadir campos a steps
ALTER TABLE "steps" ADD COLUMN IF NOT EXISTS "video_url" TEXT;
ALTER TABLE "steps" ADD COLUMN IF NOT EXISTS "synonyms" TEXT[] NOT NULL DEFAULT '{}';

-- 9. Crear tabla voice_commands
CREATE TABLE IF NOT EXISTS "voice_commands" (
  "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID        NOT NULL,
  "scope"      TEXT        NOT NULL,  -- "global" | "station" | "step"
  "station_id" UUID,
  "step_id"    UUID,
  "action"     TEXT        NOT NULL,
  "phrases"    TEXT[]      NOT NULL DEFAULT '{}',
  "is_enabled" BOOLEAN     NOT NULL DEFAULT true,
  "language"   TEXT        NOT NULL DEFAULT 'es-ES',
  "sequence"   TEXT,
  "context"    JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "voice_commands_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "voice_commands_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "voice_commands_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id"),
  CONSTRAINT "voice_commands_step_id_fkey"    FOREIGN KEY ("step_id")    REFERENCES "steps"("id")
);
CREATE INDEX IF NOT EXISTS "voice_commands_tenant_scope_idx" ON "voice_commands"("tenant_id", "scope");

-- 10. Insertar comandos de voz por defecto para KH
INSERT INTO "voice_commands" ("tenant_id", "scope", "action", "phrases", "language")
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'global', 'confirm',  ARRAY['pin bueno','bueno','ok','confirmado','sí'], 'es-ES'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'global', 'next',     ARRAY['siguiente','avanzar','continuar'], 'es-ES'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'global', 'prev',     ARRAY['atrás','anterior','volver'], 'es-ES'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'global', 'repeat',   ARRAY['repetir','repite','otra vez'], 'es-ES'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'global', 'stop',     ARRAY['parar','paro','stop'], 'es-ES'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'global', 'logout',   ARRAY['salir','cerrar sesión','logout'], 'es-ES'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'global', 'help',     ARRAY['ayuda','help','socorro'], 'es-ES')
ON CONFLICT DO NOTHING;
```

**Paso 3: Crear `migration_lock.toml` (registrar en Prisma)**

Verificar que existe `prisma/migrations/migration_lock.toml`. Si no, crear:
```toml
# Please do not edit this file manually
# It should be added in your version-control system (i.e. Git)
provider = "postgresql"
```

**Paso 4: Verificar que la migration es válida (dry-run local)**

```bash
# Solo comprobar sintaxis, no ejecutar en producción todavía
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma 2>&1 | head -20
```

**Paso 5: Commit**

```bash
git add prisma/migrations/
git commit -m "feat(6a): migration SQL manual multi-tenant con backfill KH"
```

---

### Tarea 3: `src/lib/db.ts` — getTenantPrisma factory

**Agente:** `code-architect`

**Files:**
- Modify: `src/lib/db.ts`

**Contexto:**
Actualmente hay un singleton `prisma` global. Necesitamos añadir `getTenantPrisma(tenantId)` que retorna un cliente con filtro automático, manteniendo el singleton para compatibilidad backward.

**Paso 1: Test primero**

Crear `src/lib/__tests__/db.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";

// Mock Prisma — no conectamos a DB real en tests unitarios
vi.mock("../../generated/prisma/client", () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $extends: vi.fn().mockImplementation((ext) => ({ _isExtended: true, _ext: ext })),
  })),
}));
vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: vi.fn().mockImplementation(() => ({})),
}));

describe("getTenantPrisma", () => {
  it("retorna un cliente extendido con tenantId", async () => {
    process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
    const { getTenantPrisma } = await import("../db");
    const client = getTenantPrisma("tenant-123");
    expect(client).toBeDefined();
  });
});
```

**Paso 2: Ejecutar test — debe FALLAR**

```bash
cd .worktrees/feat-advanced-ui
npx vitest run src/lib/__tests__/db.test.ts
```
Esperado: FAIL (getTenantPrisma no existe)

**Paso 3: Implementar en `src/lib/db.ts`**

```typescript
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ── Singleton base (sin filtro de tenant) ──
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ── Para super-admin (sin filtro de tenant) ──
export { prisma as adminPrisma };

// ── Modelos que requieren filtro automático de tenant ──
const TENANT_SCOPED_MODELS = ["station", "operator", "reference", "auditlog"];

/**
 * Retorna un cliente Prisma pre-filtrado por tenantId.
 * Usar en todas las rutas API que no son super-admin.
 *
 * @param tenantId - UUID del tenant extraído de x-tenant-id header
 */
export function getTenantPrisma(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model: string;
          operation: string;
          args: Record<string, unknown>;
          query: (args: Record<string, unknown>) => Promise<unknown>;
        }) {
          if (TENANT_SCOPED_MODELS.includes(model.toLowerCase())) {
            if (["findMany", "findFirst", "findUnique", "count", "aggregate"].includes(operation)) {
              args = { ...args, where: { ...(args.where as object), tenantId } };
            }
            if (operation === "create") {
              args = { ...args, data: { ...(args.data as object), tenantId } };
            }
            if (operation === "createMany") {
              // createMany: data es un array
              const data = args.data as Record<string, unknown>[];
              args = { ...args, data: data.map((d) => ({ ...d, tenantId })) };
            }
          }
          return query(args);
        },
      },
    },
  });
}
```

**Paso 4: Ejecutar test — debe PASAR**

```bash
npx vitest run src/lib/__tests__/db.test.ts
```
Esperado: PASS

**Paso 5: Verificar que los tests existentes siguen pasando**

```bash
npx vitest run
```
Esperado: 40+ tests pasando.

**Paso 6: Commit**

```bash
git add src/lib/db.ts src/lib/__tests__/db.test.ts
git commit -m "feat(6a): getTenantPrisma factory con auto-filtro por tenant"
```

---

### Tarea 4: `src/lib/gcs.ts` — paths dinámicos por tenant

**Agente:** `code-architect`

**Files:**
- Modify: `src/lib/gcs.ts`

**Contexto:**
Actualmente `tenantPath` usa `const TENANT = process.env.GCS_TENANT || "p2v"` estático. Necesitamos `gcsPath(tenantSlug, ...segments)` dinámico. La función antigua se mantiene para backward compat durante la transición.

**Paso 1: Test primero**

Crear `src/lib/__tests__/gcs.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { buildGcsPath } from "../gcs";

describe("buildGcsPath", () => {
  it("construye path con tenant y segmentos", () => {
    expect(buildGcsPath("kh", "stations", "abc", "steps", "xyz", "photo.jpg"))
      .toBe("tenants/kh/stations/abc/steps/xyz/photo.jpg");
  });

  it("funciona con un solo segmento", () => {
    expect(buildGcsPath("acme", "branding/logo.png"))
      .toBe("tenants/acme/branding/logo.png");
  });
});
```

**Paso 2: Ejecutar test — debe FALLAR**

```bash
npx vitest run src/lib/__tests__/gcs.test.ts
```
Esperado: FAIL (buildGcsPath no existe)

**Paso 3: Añadir `buildGcsPath` a `src/lib/gcs.ts`**

Al inicio del archivo, después de `const TENANT`:
```typescript
/**
 * Construye un path GCS con aislamiento por tenant.
 * Uso: buildGcsPath(tenantSlug, "stations", stationId, "steps", stepId, "photo.jpg")
 * Resultado: "tenants/kh/stations/<id>/steps/<id>/photo.jpg"
 */
export function buildGcsPath(tenantSlug: string, ...segments: string[]): string {
  return `tenants/${tenantSlug}/${segments.join("/")}`;
}
```

**Paso 4: Ejecutar test — debe PASAR**

```bash
npx vitest run src/lib/__tests__/gcs.test.ts
```

**Paso 5: Commit**

```bash
git add src/lib/gcs.ts src/lib/__tests__/gcs.test.ts
git commit -m "feat(6a): buildGcsPath — paths GCS dinámicos por tenant"
```

---

### Tarea 5: Middleware — resolución de tenant por subdominio

**Agente:** `code-architect`

**Files:**
- Modify: `src/middleware.ts`
- Create: `src/lib/tenant-cache.ts`

**Contexto:**
El middleware actual solo valida `X-Admin-Password`. Necesitamos extraer el subdominio del host, buscar el tenant en DB, e inyectar `x-tenant-id` y `x-tenant-slug` en headers. Usar cache en memoria (Map + TTL 5min) para no hacer query a DB en cada request.

**Paso 1: Crear `src/lib/tenant-cache.ts`**

```typescript
type TenantEntry = {
  id: string;
  slug: string;
  expiresAt: number;
};

const cache = new Map<string, TenantEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 minutos

export function getTenantFromCache(slug: string): TenantEntry | null {
  const entry = cache.get(slug);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(slug);
    return null;
  }
  return entry;
}

export function setTenantCache(slug: string, id: string): void {
  cache.set(slug, { id, slug, expiresAt: Date.now() + TTL_MS });
}

export function extractSubdomain(hostname: string): string | null {
  // "kh.sao.app" → "kh"
  // "localhost" | "sao.app" → null (usa DEFAULT_TENANT_SLUG)
  const parts = hostname.split(".");
  if (parts.length < 3) return null;
  const sub = parts[0];
  if (sub === "www" || sub === "app") return null;
  return sub;
}
```

**Paso 2: Test de `tenant-cache.ts`**

Crear `src/lib/__tests__/tenant-cache.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { extractSubdomain, getTenantFromCache, setTenantCache } from "../tenant-cache";

describe("extractSubdomain", () => {
  it("extrae subdominio de kh.sao.app", () => {
    expect(extractSubdomain("kh.sao.app")).toBe("kh");
  });

  it("retorna null para localhost", () => {
    expect(extractSubdomain("localhost")).toBeNull();
  });

  it("retorna null para www", () => {
    expect(extractSubdomain("www.sao.app")).toBeNull();
  });
});

describe("tenant cache", () => {
  it("almacena y recupera tenant", () => {
    setTenantCache("kh", "uuid-kh");
    const entry = getTenantFromCache("kh");
    expect(entry?.id).toBe("uuid-kh");
  });
});
```

**Paso 3: Ejecutar test — debe PASAR**

```bash
npx vitest run src/lib/__tests__/tenant-cache.test.ts
```

**Paso 4: Actualizar `src/middleware.ts`**

Añadir al principio, después de los imports:
```typescript
import { extractSubdomain, getTenantFromCache, setTenantCache } from "@/lib/tenant-cache";
import { prisma } from "@/lib/db";

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || "kh";
```

Reemplazar la función `middleware` por:
```typescript
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "localhost";
  const slug = extractSubdomain(hostname) ?? DEFAULT_TENANT_SLUG;

  // Resolver tenant (cache → DB)
  let tenantId: string;
  const cached = getTenantFromCache(slug);

  if (cached) {
    tenantId = cached.id;
  } else {
    try {
      const tenant = await prisma.tenant.findUnique({ where: { slug } });
      if (!tenant || !tenant.isActive) {
        return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
      }
      setTenantCache(slug, tenant.id);
      tenantId = tenant.id;
    } catch {
      // Si no hay DB, usar tenant por defecto (desarrollo sin DB)
      tenantId = "00000000-0000-0000-0000-000000000000";
    }
  }

  // Solo aplicar autenticación admin a rutas de API
  if (request.nextUrl.pathname.startsWith("/api") && requiereAdmin(request)) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword) {
      const passwordRecibida = request.headers.get("X-Admin-Password");
      if (!passwordRecibida) {
        return NextResponse.json(
          { error: "Acceso denegado. Se requiere la cabecera X-Admin-Password" },
          { status: 401 }
        );
      }
      if (!constantTimeEqual(passwordRecibida, adminPassword)) {
        return NextResponse.json(
          { error: "Contraseña de administrador incorrecta" },
          { status: 401 }
        );
      }
    }
  }

  // Inyectar headers de tenant en la request
  const response = NextResponse.next();
  response.headers.set("x-tenant-id", tenantId);
  response.headers.set("x-tenant-slug", slug);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

**Paso 5: Verificar todos los tests**

```bash
npx vitest run
```
Esperado: todos pasando.

**Paso 6: Commit**

```bash
git add src/middleware.ts src/lib/tenant-cache.ts src/lib/__tests__/tenant-cache.test.ts
git commit -m "feat(6a): middleware multi-tenant — subdominio → x-tenant-id header"
```

---

### Tarea 6: Upload de video — nueva ruta API

**Agente:** `code-architect`

**Files:**
- Create: `src/app/api/upload/video/route.ts`

**Contexto:**
Ya existe `src/app/api/upload/image/route.ts` (o `route.ts` en upload). Crear ruta análoga para video. Límite 200MB. Tipos aceptados: mp4, webm, quicktime.

**Paso 1: Leer la ruta de upload existente para entender el patrón**

```bash
cat .worktrees/feat-advanced-ui/src/app/api/upload/*/route.ts 2>/dev/null || cat .worktrees/feat-advanced-ui/src/app/api/upload/route.ts 2>/dev/null | head -60
```

**Paso 2: Crear `src/app/api/upload/video/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { uploadBuffer, buildGcsPath } from "@/lib/gcs";

const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB
const ACCEPTED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const EXT_MAP: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export async function POST(request: NextRequest) {
  const tenantSlug = request.headers.get("x-tenant-slug") || "kh";

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  }

  const file = formData.get("video") as File | null;
  const stationId = formData.get("stationId") as string | null;
  const stepId = formData.get("stepId") as string | null;

  if (!file) return NextResponse.json({ error: "Campo 'video' requerido" }, { status: 400 });
  if (!stationId || !stepId) return NextResponse.json({ error: "stationId y stepId requeridos" }, { status: 400 });
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Tipo no soportado: ${file.type}` }, { status: 415 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Vídeo demasiado grande (máx 200MB)" }, { status: 413 });
  }

  const ext = EXT_MAP[file.type] || "mp4";
  const gcsObjectPath = buildGcsPath(tenantSlug, "stations", stationId, "steps", stepId, `video.${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { uploadBuffer: upload } = await import("@/lib/gcs");
  // uploadBuffer usa tenantPath internamente — aquí pasamos el path ya construido
  // Necesitamos una variante que no agregue el prefijo automáticamente
  // Por ahora usar Storage directamente con el path completo
  const { Storage } = await import("@google-cloud/storage");
  let credentials: Record<string, unknown> | undefined;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try { credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON); } catch {}
  }
  const storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    ...(credentials && { credentials }),
  });
  const bucketObj = storage.bucket(process.env.GCS_BUCKET!);
  const fileRef = bucketObj.file(gcsObjectPath);
  await fileRef.save(buffer, {
    contentType: file.type,
    metadata: { cacheControl: "public, max-age=86400" },
  });

  const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET}/${gcsObjectPath}`;
  return NextResponse.json({ url: publicUrl });
}
```

**Paso 3: Commit**

```bash
git add src/app/api/upload/video/route.ts
git commit -m "feat(6a): ruta /api/upload/video — subida de video por paso al GCS"
```

---

## SPRINT 6B — Voice Command System

> **Agente:** `ai-engineer`
> Toda la lógica de voz pasa por un único hook. El STT pipeline sigue: audio → transcript → normalizar → match comandos → echo back → ejecutar.

---

### Tarea 7: API de comandos de voz

**Agente:** `ai-engineer`

**Files:**
- Create: `src/app/api/voice-commands/route.ts`

**Contexto:**
Los `VoiceCommand` se almacenan en DB por tenant. El hook `useVoiceCommandEngine` necesita cargar los comandos al iniciar la sesión. Esta ruta devuelve todos los comandos activos del tenant filtrados por scope.

**Paso 1: Crear `src/app/api/voice-commands/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ error: "Tenant no identificado" }, { status: 400 });

  const db = getTenantPrisma(tenantId);
  const commands = await db.voiceCommand.findMany({
    where: { isEnabled: true },
    orderBy: [{ scope: "asc" }, { action: "asc" }],
  });

  return NextResponse.json({ commands });
}

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ error: "Tenant no identificado" }, { status: 400 });

  const body = await request.json();
  const { scope, action, phrases, stationId, stepId, language, sequence, context } = body;

  if (!scope || !action || !phrases?.length) {
    return NextResponse.json({ error: "scope, action, phrases son requeridos" }, { status: 400 });
  }

  const db = getTenantPrisma(tenantId);
  const cmd = await db.voiceCommand.create({
    data: { tenantId, scope, action, phrases, stationId, stepId, language: language || "es-ES", sequence, context },
  });

  return NextResponse.json({ command: cmd }, { status: 201 });
}
```

**Paso 2: Crear ruta PATCH/DELETE para toggle y borrado**

Crear `src/app/api/voice-commands/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const updated = await prisma.voiceCommand.update({
    where: { id },
    data: { isEnabled: body.isEnabled, phrases: body.phrases, sequence: body.sequence },
  });
  return NextResponse.json({ command: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.voiceCommand.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

**Paso 3: Commit**

```bash
git add src/app/api/voice-commands/
git commit -m "feat(6b): API /api/voice-commands — CRUD de comandos de voz por tenant"
```

---

### Tarea 8: Hook `useVoiceCommandEngine`

**Agente:** `ai-engineer`

**Files:**
- Create: `src/hooks/useVoiceCommandEngine.ts`

**Contexto:**
Pipeline central de voz. Reemplaza la lógica dispersa entre `useContinuousSpeechRecognition`, `useTextToSpeech` y `ProductionStep`. El hook:
1. Carga comandos de voz del tenant desde la API
2. Mantiene buffer de secuencias (ventana 2.5s)
3. Hace matching contra comandos globales y por estación/paso
4. Ejecuta echo back TTS ("Pin bueno... confirmado")
5. Dispara callbacks (onConfirm, onNext, onPrev, onLogout, etc.)

**Paso 1: Crear el hook**

```typescript
// src/hooks/useVoiceCommandEngine.ts
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
  stepPhrases?: string[];   // respuesta esperada + sinónimos del paso actual
  callbacks: CommandCallbacks;
  language?: string;
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
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

  // Cargar comandos del tenant al montar
  useEffect(() => {
    fetch("/api/voice-commands")
      .then((r) => r.json())
      .then(({ commands: cmds }) => setCommands(cmds || []))
      .catch(() => setCommands([]));
  }, []);

  // Filtrar comandos aplicables al contexto actual
  const applicableCommands = commands.filter((cmd) => {
    if (!cmd.isEnabled) return false;
    if (cmd.scope === "global") return true;
    if (cmd.scope === "station" && cmd.stationId === stationId) return true;
    if (cmd.scope === "step" && cmd.stepId === stepId) return true;
    return false;
  });

  const executeAction = useCallback(
    (action: string, transcript: string) => {
      // Vibración táctil
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }

      // Manejar dígitos
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
      const transcript = normalizeText(rawTranscript);

      // 1. Comprobar si es respuesta al paso actual (sinónimos incluidos)
      if (stepPhrases.length > 0 && matchesPhrases(rawTranscript, stepPhrases)) {
        executeAction("confirm", rawTranscript);
        return;
      }

      // 2. Buscar en comandos aplicables (con soporte de secuencia)
      for (const cmd of applicableCommands) {
        if (!matchesPhrases(rawTranscript, cmd.phrases)) continue;

        // Verificar secuencia si se requiere
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
  };
}
```

**Paso 2: Test del engine**

Crear `src/hooks/__tests__/useVoiceCommandEngine.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock fetch para devolver comandos de voz
global.fetch = vi.fn().mockResolvedValue({
  json: () => Promise.resolve({
    commands: [
      { id: "1", scope: "global", action: "confirm", phrases: ["pin bueno", "ok"], isEnabled: true },
      { id: "2", scope: "global", action: "logout",  phrases: ["salir"], isEnabled: true },
    ],
  }),
}) as unknown as typeof fetch;

import { useVoiceCommandEngine } from "../useVoiceCommandEngine";

describe("useVoiceCommandEngine", () => {
  it("dispara onConfirm cuando transcript coincide con frase de paso", async () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useVoiceCommandEngine({
        stepPhrases: ["pin bueno"],
        callbacks: { onConfirm },
      })
    );

    // Esperar a que se carguen los comandos
    await vi.waitFor(() => {});

    act(() => { result.current.processTranscript("Pin Bueno"); });
    expect(onConfirm).toHaveBeenCalledWith("Pin Bueno");
  });

  it("normaliza acentos y mayúsculas", async () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() =>
      useVoiceCommandEngine({
        stepPhrases: ["revisión ok"],
        callbacks: { onConfirm },
      })
    );
    await vi.waitFor(() => {});
    act(() => { result.current.processTranscript("Revision OK"); });
    expect(onConfirm).toHaveBeenCalled();
  });

  it("dispara onLogout con comando global", async () => {
    const onLogout = vi.fn();
    const { result } = renderHook(() =>
      useVoiceCommandEngine({
        callbacks: { onLogout },
      })
    );
    await vi.waitFor(() => {});
    act(() => { result.current.processTranscript("salir"); });
    expect(onLogout).toHaveBeenCalled();
  });
});
```

**Paso 3: Ejecutar tests**

```bash
npx vitest run src/hooks/__tests__/useVoiceCommandEngine.test.ts
```
Esperado: 3 tests pasando.

**Paso 4: Commit**

```bash
git add src/hooks/useVoiceCommandEngine.ts src/hooks/__tests__/useVoiceCommandEngine.test.ts
git commit -m "feat(6b): useVoiceCommandEngine — pipeline central de voz con match, secuencias y normalización"
```

---

### Tarea 9: Admin — página gestión de comandos de voz

**Agente:** `ai-engineer`

**Files:**
- Create: `src/app/admin/voice-commands/page.tsx`

**Contexto:**
Página de administración en tema KH dark (igual que el resto del admin). Permite:
- Ver todos los comandos de voz del tenant agrupados por scope
- Toggle enable/disable por comando
- Editar frases (array de sinónimos)
- Botón "Probar" que activa el micrófono y muestra qué acción se ejecutaría

**Paso 1: Crear `src/app/admin/voice-commands/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";

type VoiceCommand = {
  id: string;
  scope: string;
  action: string;
  phrases: string[];
  isEnabled: boolean;
  language: string;
};

const ACTION_LABELS: Record<string, string> = {
  confirm: "Confirmar paso",
  next:    "Siguiente",
  prev:    "Anterior",
  stop:    "Paro de estación",
  logout:  "Cerrar sesión",
  repeat:  "Repetir instrucción",
  help:    "Ayuda / Andon",
};

export default function VoiceCommandsPage() {
  const [commands, setCommands] = useState<VoiceCommand[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/voice-commands", {
      headers: { "X-Admin-Password": localStorage.getItem("adminPassword") || "" },
    })
      .then((r) => r.json())
      .then(({ commands: cmds }) => setCommands(cmds || []));
  }, []);

  async function toggleCommand(id: string, isEnabled: boolean) {
    await fetch(`/api/voice-commands/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Password": localStorage.getItem("adminPassword") || "",
      },
      body: JSON.stringify({ isEnabled }),
    });
    setCommands((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isEnabled } : c))
    );
  }

  function startTest() {
    setTesting(true);
    setTestResult(null);
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTestResult("Reconocimiento de voz no disponible en este navegador");
      setTesting(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "es-ES";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      const norm = transcript.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const matched = commands.find((c) =>
        c.isEnabled && c.phrases.some((p) => p.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === norm)
      );
      setTestResult(matched
        ? `✅ Reconocido: "${transcript}" → Acción: ${ACTION_LABELS[matched.action] || matched.action}`
        : `❓ No reconocido: "${transcript}" — sin coincidencia`
      );
      setTesting(false);
    };
    rec.onerror = () => { setTesting(false); setTestResult("Error al escuchar"); };
    rec.onend = () => setTesting(false);
    rec.start();
  }

  const byScope = {
    global:  commands.filter((c) => c.scope === "global"),
    station: commands.filter((c) => c.scope === "station"),
    step:    commands.filter((c) => c.scope === "step"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Comandos de Voz</h1>
        <Button
          variant={testing ? "destructive" : "outline"}
          className="gap-2"
          onClick={startTest}
          disabled={testing}
        >
          {testing ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {testing ? "Escuchando..." : "Probar comando"}
        </Button>
      </div>

      {testResult && (
        <div className="rounded-lg bg-zinc-800 p-4 text-sm text-zinc-200">{testResult}</div>
      )}

      {(["global", "station", "step"] as const).map((scope) => (
        byScope[scope].length > 0 && (
          <Card key={scope} className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base text-zinc-300 capitalize">{scope}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {byScope[scope].map((cmd) => (
                <div key={cmd.id} className="flex items-center justify-between rounded-md bg-zinc-800 px-4 py-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">
                      {ACTION_LABELS[cmd.action] || cmd.action}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {cmd.phrases.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Switch
                    checked={cmd.isEnabled}
                    onCheckedChange={(v) => toggleCommand(cmd.id, v)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )
      ))}
    </div>
  );
}
```

**Paso 2: Añadir link en el sidebar del admin**

Buscar `src/app/admin/layout.tsx` y añadir en la lista de navegación:
```tsx
{ href: "/admin/voice-commands", label: "Comandos de Voz", icon: Mic }
```
Importar `Mic` de `lucide-react` si no está.

**Paso 3: Commit**

```bash
git add src/app/admin/voice-commands/page.tsx src/app/admin/layout.tsx
git commit -m "feat(6b): admin /voice-commands — gestión de comandos de voz por tenant"
```

---

## SPRINT 6C — UI Features + PWA

> **Agente:** `frontend-developer`
> UI siempre en castellano. Touch-first. Tema KH dark.

---

### Tarea 10: Three.js viewer — fondo transparente

**Agente:** `frontend-developer`

**Files:**
- Modify: `src/components/StepAssemblyViewer.tsx`

**Contexto:**
Actualmente el viewer usa `const BASE_BACKGROUND = "#f5f5f4"` y `renderer.setClearColor(sceneBackground, 1)`. El wrapper tiene `Card`/`CardContent` con fondo blanco. Necesitamos fondo transparente para que el modelo 3D asiente sobre el fondo oscuro `#111113` de la pantalla de producción.

**Paso 1: Modificar `src/components/StepAssemblyViewer.tsx`**

Cambios específicos:
1. Eliminar `const BASE_BACKGROUND = "#f5f5f4"` (no se usa más)
2. Buscar la creación del renderer: `new THREE.WebGLRenderer({ antialias: true })` → añadir `alpha: true`
3. Buscar `renderer.setClearColor` → cambiar a `renderer.setClearColor(0x000000, 0)`
4. Eliminar el wrapper `<Card>` y `<CardContent>` — el viewer retorna directamente el `<div>` del canvas
5. Eliminar el import de `Card` y `CardContent` si ya no se usan

**Paso 2: Verificar visualmente**

```bash
npm run dev
# Abrir http://localhost:3000, ir a una estación con modelo 3D
# Verificar que el fondo del canvas es transparente (no blanco)
```

**Paso 3: Commit**

```bash
git add src/components/StepAssemblyViewer.tsx
git commit -m "feat(6c): StepAssemblyViewer — fondo transparente (alpha: true)"
```

---

### Tarea 11: Video player por paso

**Agente:** `frontend-developer`

**Files:**
- Modify: `src/components/ProductionStep.tsx`
- Modify: `src/components/admin/StepEditor.tsx`

**Contexto:**
`Step` ahora tiene campo `videoUrl`. La jerarquía de media es: `videoUrl` > `modelUrl` > `photoUrl` > placeholder. En el admin, `StepEditor` debe tener un campo de upload de video con drag & drop (análogo al de imagen).

**Paso 1: Modificar `ProductionStep.tsx`**

Buscar el bloque de renderizado de media (donde se muestra la imagen o el viewer 3D). Añadir antes de `modelUrl`:

```tsx
{step.videoUrl ? (
  <video
    src={step.videoUrl}
    autoPlay
    muted
    loop
    playsInline
    className="w-full aspect-video rounded-xl object-cover"
  />
) : step.modelUrl ? (
  <StepAssemblyViewer sourceUrl={step.modelUrl} />
) : step.photoUrl ? (
  <img src={step.photoUrl} alt={step.mensaje} className="w-full rounded-xl object-cover max-h-64" />
) : null}
```

**Paso 2: Modificar `StepEditor.tsx` — campo video**

Buscar el campo de `photoUrl` y añadir campo análogo para `videoUrl`:

```tsx
{/* Video del paso */}
<div className="space-y-2">
  <label className="text-sm text-zinc-400">Vídeo (MP4/WebM, máx 200MB)</label>
  {editedStep.videoUrl ? (
    <div className="relative">
      <video src={editedStep.videoUrl} className="w-full rounded-md max-h-32" controls />
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-1 right-1 text-red-400 hover:text-red-300"
        onClick={() => updateField("videoUrl", null)}
      >
        Eliminar
      </Button>
    </div>
  ) : (
    <div
      className="border-2 border-dashed border-zinc-700 rounded-md p-4 text-center text-sm text-zinc-500 cursor-pointer hover:border-zinc-500 transition-colors"
      onDragOver={(e) => e.preventDefault()}
      onDrop={async (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("video", file);
        fd.append("stationId", editedStep.stationId);
        fd.append("stepId", editedStep.id);
        const res = await fetch("/api/upload/video", {
          method: "POST",
          headers: { "X-Admin-Password": localStorage.getItem("adminPassword") || "" },
          body: fd,
        });
        const { url } = await res.json();
        if (url) updateField("videoUrl", url);
      }}
    >
      Arrastra el vídeo aquí o
      <input
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        id="video-upload"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const fd = new FormData();
          fd.append("video", file);
          fd.append("stationId", editedStep.stationId);
          fd.append("stepId", editedStep.id);
          const res = await fetch("/api/upload/video", {
            method: "POST",
            headers: { "X-Admin-Password": localStorage.getItem("adminPassword") || "" },
            body: fd,
          });
          const { url } = await res.json();
          if (url) updateField("videoUrl", url);
        }}
      />
      <label htmlFor="video-upload" className="cursor-pointer text-blue-400 hover:underline ml-1">
        selecciona
      </label>
    </div>
  )}
</div>
```

También añadir campo `synonyms` (tags input para sinónimos de respuesta de voz):
```tsx
{/* Sinónimos de voz */}
<div className="space-y-2">
  <label className="text-sm text-zinc-400">Sinónimos de respuesta (voz)</label>
  <p className="text-xs text-zinc-600">El operario puede decir cualquiera de estas frases para confirmar el paso.</p>
  {/* Tags input simple: texto separado por comas */}
  <input
    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
    placeholder="ok, bueno, correcto"
    value={(editedStep.synonyms || []).join(", ")}
    onChange={(e) => updateField("synonyms", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
  />
</div>
```

**Paso 3: Commit**

```bash
git add src/components/ProductionStep.tsx src/components/admin/StepEditor.tsx
git commit -m "feat(6c): video por paso + sinónimos de voz en StepEditor"
```

---

### Tarea 12: Touch screen optimizations

**Agente:** `frontend-developer`

**Files:**
- Modify: `src/components/ProductionStep.tsx`
- Modify: `src/app/globals.css` (si existe) o `tailwind.config.ts`

**Contexto:**
La app se usa en tablets táctiles en la fábrica. Los botones de respuesta tienen que ser grandes (mínimo h-20), sin hover effects, y eliminar el delay de 300ms de click en mobile.

**Paso 1: Añadir `touch-action: manipulation` globalmente**

En `src/app/globals.css`:
```css
/* Eliminar delay de 300ms en clicks táctiles */
* {
  touch-action: manipulation;
}

/* Eliminar text selection en elementos interactivos */
button, [role="button"] {
  -webkit-user-select: none;
  user-select: none;
}
```

**Paso 2: Aumentar tamaño mínimo de botones de respuesta en `ProductionStep.tsx`**

Buscar los botones de opciones de respuesta (tipo `button` o `scan`) y cambiar clases:
- `h-12` o similar → `h-20 min-h-[80px]`
- `text-base` o `text-sm` → `text-xl`
- Añadir `active:scale-95 transition-transform` para feedback táctil

**Paso 3: Swipe-up para confirmar paso**

En el componente de paso actual, añadir gesture de swipe-up como alternativa al botón de confirmar:
```tsx
const touchStartY = useRef(0);

<div
  onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; }}
  onTouchEnd={(e) => {
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (delta > 80) { // swipe up de más de 80px
      handleConfirm();
    }
  }}
>
  {/* contenido del paso */}
</div>
```

**Paso 4: Commit**

```bash
git add src/components/ProductionStep.tsx src/app/globals.css
git commit -m "feat(6c): touch screen optimizations — botones grandes, sin delay, swipe-up"
```

---

### Tarea 13: PWA — offline page + InstallPrompt

**Agente:** `frontend-developer`

**Files:**
- Create: `src/app/offline/page.tsx`
- Create: `src/components/InstallPrompt.tsx`
- Modify: `public/sw.js` (si existe) o crear
- Modify: `src/app/layout.tsx`

**Contexto:**
El PWA actual puede tener un manifest básico. Necesitamos:
1. Página offline con tema KH
2. Cache de assets estáticos y pasos de la estación activa
3. Banner de instalación que aparece 1 vez y se puede descartar

**Paso 1: Crear `src/app/offline/page.tsx`**

```tsx
export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#111113] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-6xl">📡</div>
        <h1 className="text-2xl font-bold text-white">Sin conexión</h1>
        <p className="text-zinc-400 max-w-sm">
          No hay conexión a internet. Los pasos de la estación activa pueden seguir disponibles
          si los cargaste antes.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-red-800 px-6 py-3 text-white font-medium hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
```

**Paso 2: Crear/actualizar `public/sw.js`**

```javascript
const CACHE_NAME = "sao-v3";
const STATIC_ASSETS = ["/", "/offline", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache responses de la API de pasos
        if (event.request.url.includes("/api/stations/")) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match("/offline"))
      )
  );
});
```

**Paso 3: Crear `src/components/InstallPrompt.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<Event & { prompt?: () => void } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("pwa-dismissed") === "1") { setDismissed(true); return; }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as Event & { prompt?: () => void });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!prompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-zinc-800 border border-zinc-700 p-4 shadow-xl flex items-center gap-3">
      <Download className="h-5 w-5 text-red-400 shrink-0" />
      <p className="text-sm text-zinc-200 flex-1">
        Instala SAO para acceso rápido y funcionamiento offline
      </p>
      <button
        onClick={() => {
          prompt.prompt?.();
          setPrompt(null);
        }}
        className="rounded-lg bg-red-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
      >
        Instalar
      </button>
      <button
        onClick={() => {
          localStorage.setItem("pwa-dismissed", "1");
          setDismissed(true);
        }}
        className="text-zinc-500 hover:text-zinc-300"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
```

**Paso 4: Añadir `InstallPrompt` al layout**

En `src/app/layout.tsx`, añadir `<InstallPrompt />` dentro del `<body>`.

**Paso 5: Registrar SW en el layout**

Añadir en `src/app/layout.tsx`:
```tsx
<script dangerouslySetInnerHTML={{ __html: `
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
` }} />
```

**Paso 6: Commit**

```bash
git add src/app/offline/ public/sw.js src/components/InstallPrompt.tsx src/app/layout.tsx
git commit -m "feat(6c): PWA — offline page, cache SW v3, InstallPrompt banner"
```

---

## SPRINT 6D — Deployment + Docs

> **Agente:** `deployment-engineer`
> Docker para backend services. Vercel para frontend. Makefile como UI de operaciones. Credenciales reales en .env.example (repo privado).

---

### Tarea 14: Docker Compose + Makefile

**Agente:** `deployment-engineer`

**Files:**
- Create: `docker-compose.yml`
- Create: `Makefile`
- Modify: `sync-sage/Dockerfile` (si no existe, crear)
- Modify: `transcription-server/Dockerfile` (si no existe, crear)

**Paso 1: Verificar que existen Dockerfiles**

```bash
ls sync-sage/Dockerfile transcription-server/Dockerfile 2>/dev/null
```

Si no existen, crear `sync-sage/Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
CMD ["node", "dist/index.js"]
```

Y `transcription-server/Dockerfile` (Python):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8765
CMD ["python", "server.py"]
```

**Paso 2: Crear `docker-compose.yml` en la raíz**

```yaml
version: "3.9"

services:
  sync-sage:
    build:
      context: ./sync-sage
      dockerfile: Dockerfile
    env_file: ./sync-sage/.env
    restart: unless-stopped
    networks:
      - sao-internal

  transcription-server:
    build:
      context: ./transcription-server
      dockerfile: Dockerfile
    ports:
      - "8765:8765"
    env_file: ./transcription-server/.env
    restart: unless-stopped
    networks:
      - sao-internal

networks:
  sao-internal:
    driver: bridge
```

**Paso 3: Crear `Makefile`**

```makefile
.PHONY: start stop logs sync-once deploy migrate status build help

## Inicia todos los servicios Docker (sync-sage + transcription-server)
start:
	docker compose up -d

## Para todos los servicios
stop:
	docker compose down

## Sigue logs en tiempo real (Ctrl+C para salir)
logs:
	docker compose logs -f

## Ejecuta sync Sage una vez y sale (para testing)
sync-once:
	docker compose run --rm sync-sage sh -c "SYNC_ONCE=true node dist/index.js"

## Build de imágenes Docker
build:
	docker compose build

## Deploy del frontend a Vercel (producción)
deploy:
	vercel --prod

## Aplica migrations Prisma en Neon (producción)
migrate:
	npx prisma migrate deploy

## Estado de containers + conexión DB
status:
	docker compose ps
	@echo "\n--- Neon DB ---"
	@npx prisma db execute --stdin <<< "SELECT 1 AS ok" 2>&1 | head -5

## Muestra esta ayuda
help:
	@grep -E '^##' Makefile | sed 's/^## //'
```

**Paso 4: Commit**

```bash
git add docker-compose.yml Makefile sync-sage/Dockerfile transcription-server/Dockerfile
git commit -m "feat(6d): docker-compose.yml + Makefile para operaciones de producción"
```

---

### Tarea 15: Variables de entorno — .env.example completo

**Agente:** `deployment-engineer`

**Files:**
- Modify: `.env.example` (raíz)
- Modify: `sync-sage/.env.example`
- Create: `transcription-server/.env.example`

**Contexto:**
El repo es privado. Los .env.example muestran valores reales de estructura (no contraseñas, pero sí hosts, buckets, etc.) para que sea plug-and-play al instalar en una nueva fábrica.

**Paso 1: Actualizar `.env.example` (Next.js / Vercel)**

```bash
# ============================================================
#  SAO v3.0 — Variables de entorno (Next.js / Vercel)
#  Repo privado: los valores de ejemplo son reales de KH
# ============================================================

# --- Base de Datos (Neon PostgreSQL) ---
DATABASE_URL=postgresql://neondb_owner:CONTRASEÑA@ep-orange-paper-ab890z35-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require

# --- Autenticación Admin (legacy — se reemplaza por TenantAdmin en v3.1) ---
ADMIN_PASSWORD=

# --- Tenant por defecto (para desarrollo local sin subdominio) ---
DEFAULT_TENANT_SLUG=kh

# --- Google Cloud Storage ---
GCS_BUCKET=sao-production
GCS_TENANT=kh
GOOGLE_CLOUD_PROJECT=sao-industrial
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"sao-industrial",...}

# --- ElevenLabs TTS ---
ELEVENLABS_API_KEY=

# --- Whisper STT (servidor Python local en la fábrica) ---
NEXT_PUBLIC_WHISPER_WS_URL=ws://10.0.0.50:8765

# --- Sentry ---
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
NEXT_PUBLIC_SENTRY_DSN=
```

**Paso 2: Actualizar `sync-sage/.env.example`**

```bash
# ============================================================
#  sync-sage — Variables de entorno
#  Copia a .env y rellena SAGE_PASSWORD y DATABASE_URL
# ============================================================

# --- Sage SQL Server ---
SAGE_HOST=10.0.0.41
SAGE_PORT=1433
SAGE_USER=sa
SAGE_PASSWORD=
SAGE_DATABASE=KH
SAGE_ENCRYPT=false
SAGE_TRUST_CERT=true

# --- Tablas de operarios ---
SAGE_OPERATOR_TABLE=Operario
SAGE_CODE_COLUMN=id
SAGE_NAME_COLUMN=descripcion

# --- Tablas de referencias de producto ---
SAGE_REFERENCE_TABLE=Referencia
SAGE_REF_CODE_COLUMN=id
SAGE_REF_NAME_COLUMN=descripcion

# --- Neon PostgreSQL ---
DATABASE_URL=postgresql://neondb_owner:CONTRASEÑA@ep-orange-paper-ab890z35-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require

# --- Sync ---
SYNC_INTERVAL=60
# SYNC_ONCE=true  # descomenta para ejecutar una vez y salir
```

**Paso 3: Crear `transcription-server/.env.example`**

```bash
# ============================================================
#  transcription-server — Variables de entorno
# ============================================================

# Puerto WebSocket (debe coincidir con NEXT_PUBLIC_WHISPER_WS_URL)
WS_PORT=8765

# Modelo Whisper (tiny | base | small | medium | large)
WHISPER_MODEL=base

# Idioma por defecto
WHISPER_LANGUAGE=es
```

**Paso 4: Commit**

```bash
git add .env.example sync-sage/.env.example transcription-server/.env.example
git commit -m "feat(6d): .env.example completos — estructura plug-and-play para nueva fábrica"
```

---

### Tarea 16: README actualizado — guía de onboarding

**Agente:** `deployment-engineer`

**Files:**
- Modify: `README.md`

**Contexto:**
El README actual puede estar desactualizado. Necesita cubrir: qué es SAO, requisitos, cómo instalar en una nueva fábrica en 30 minutos, cómo añadir tenant, cómo ejecutar migrations.

**Paso 1: Reescribir `README.md`**

```markdown
# SAO — Sistema de Ayuda al Operario v3.0

Sistema MES industrial multi-tenant para guiar operarios en línea de montaje mediante voz, imagen y vídeo.

## Arquitectura

- **Frontend:** Next.js 15 → Vercel (wildcard domains: `*.sao.app`)
- **DB:** PostgreSQL en Neon (multi-tenant con tenantId)
- **Backend services:** Docker Compose (sync-sage + transcription-server)
- **Storage:** Google Cloud Storage por tenant

## Requisitos

- Node.js 20+
- Docker + Docker Compose
- Cuenta Neon (PostgreSQL)
- Cuenta Vercel
- Cuenta GCS
- ElevenLabs API key (TTS)

## Instalación en nueva fábrica (30 min)

### 1. Clonar y configurar

\`\`\`bash
git clone <repo>
cp .env.example .env
# Rellenar DATABASE_URL, GCS_*, ELEVENLABS_API_KEY
\`\`\`

### 2. Ejecutar migration en Neon

\`\`\`bash
npx prisma migrate deploy
\`\`\`

### 3. Crear tenant en DB

\`\`\`sql
INSERT INTO tenants (slug, name, primary_color)
VALUES ('acme', 'Acme Factory', '#1A4B8B');
\`\`\`

### 4. Configurar DNS

Añadir `acme.sao.app` → Vercel (wildcard ya configurado).

### 5. Iniciar servicios Docker

\`\`\`bash
cp sync-sage/.env.example sync-sage/.env
# Rellenar credenciales Sage
make start
\`\`\`

### 6. Deploy frontend

\`\`\`bash
make deploy
\`\`\`

## Comandos

| Comando | Descripción |
|---------|-------------|
| `make start` | Inicia Docker services |
| `make stop` | Para Docker services |
| `make logs` | Logs en tiempo real |
| `make sync-once` | Sync Sage manual |
| `make migrate` | Aplica migrations Prisma |
| `make deploy` | Deploy a Vercel |
| `make status` | Estado de servicios |

## Desarrollo local

\`\`\`bash
npm install
npx prisma generate
npm run dev
# App en http://localhost:3000
# Admin en http://localhost:3000/admin
\`\`\`

## Tests

\`\`\`bash
npx vitest run       # todos los tests
npx vitest          # modo watch
\`\`\`
```

**Paso 2: Commit**

```bash
git add README.md
git commit -m "docs: README v3.0 — guía de onboarding multi-tenant + comandos Make"
```

---

### Tarea 17: Verificación final — tests + build

**Agente:** `deployment-engineer`

**Files:**
- Sin modificaciones de código

**Paso 1: Ejecutar todos los tests**

```bash
cd .worktrees/feat-advanced-ui
npx vitest run
```
Esperado: 40+ tests pasando, ninguno fallando.

**Paso 2: Verificar build de producción**

```bash
npm run build
```
Esperado: sin errores de TypeScript ni de build. Warnings menores son aceptables.

**Paso 3: Verificar prisma validate**

```bash
npx prisma validate
```
Esperado: sin errores.

**Paso 4: Si todos los checks pasan, commit final**

```bash
git add -A
git status  # verificar que no hay archivos inesperados
git commit -m "chore: verificación final Sprint 6 — tests OK, build OK, schema OK" --allow-empty
```

**Paso 5: Reportar resultado completo**

El agente debe reportar:
- Número de tests pasando
- Duración del build
- Lista de tareas completadas
- Cualquier warning que requiera atención

---

## Resumen de Agentes por Tarea

| Tarea | Agente | Sprint |
|-------|--------|--------|
| 1 — Schema Prisma (Tenant, TenantAdmin, VoiceCommand) | `code-architect` | 6A |
| 2 — Migration SQL manual con backfill KH | `code-architect` | 6A |
| 3 — getTenantPrisma factory | `code-architect` | 6A |
| 4 — buildGcsPath dinámico | `code-architect` | 6A |
| 5 — Middleware multi-tenant | `code-architect` | 6A |
| 6 — Upload de video API | `code-architect` | 6A |
| 7 — API /api/voice-commands | `ai-engineer` | 6B |
| 8 — useVoiceCommandEngine hook | `ai-engineer` | 6B |
| 9 — Admin /voice-commands page | `ai-engineer` | 6B |
| 10 — Three.js transparent background | `frontend-developer` | 6C |
| 11 — Video player + sinónimos editor | `frontend-developer` | 6C |
| 12 — Touch screen optimizations | `frontend-developer` | 6C |
| 13 — PWA offline + InstallPrompt | `frontend-developer` | 6C |
| 14 — Docker Compose + Makefile | `deployment-engineer` | 6D |
| 15 — .env.example completos | `deployment-engineer` | 6D |
| 16 — README onboarding | `deployment-engineer` | 6D |
| 17 — Verificación final | `deployment-engineer` | 6D |
