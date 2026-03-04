-- Migration: Multi-tenant Foundation (SAO v3.0)
-- IMPORTANTE: preserva dados existentes de KH (tenant slug = "kh")
-- Execute este arquivo MANUALMENTE no Neon via:
--   npx prisma db execute --file prisma/migrations/20260303000001_multitenant_foundation/migration.sql

-- =============================================================================
-- 1. Criar tabela tenants
-- =============================================================================
CREATE TABLE IF NOT EXISTS "tenants" (
  "id"                    UUID             NOT NULL DEFAULT gen_random_uuid(),
  "slug"                  TEXT             NOT NULL,
  "name"                  TEXT             NOT NULL,
  "logo_url"              TEXT,
  "primary_color"         TEXT,
  "accent_color"          TEXT,
  "favicon_url"           TEXT,
  "system_name"           TEXT             NOT NULL DEFAULT 'SAO',
  "custom_domain"         TEXT,
  "tts_voice_id"          TEXT             NOT NULL DEFAULT 'JBFqnCBsd6RMkjVDRZzb',
  "tts_speed"             DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "tts_stability"         DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  "tts_similarity"        DOUBLE PRECISION NOT NULL DEFAULT 0.8,
  "default_language"      TEXT             NOT NULL DEFAULT 'es',
  "font_size"             INTEGER          NOT NULL DEFAULT 16,
  "theme"                 TEXT             NOT NULL DEFAULT 'dark',
  "auto_advance_delay_ms" INTEGER          NOT NULL DEFAULT 3000,
  "features"              JSONB            NOT NULL DEFAULT '{"whisperStt":false,"elevenLabsTts":true,"qcDefault":false,"barcodeScanning":true}',
  "plan"                  TEXT             NOT NULL DEFAULT 'starter',
  "max_stations"          INTEGER          NOT NULL DEFAULT 10,
  "max_operators"         INTEGER          NOT NULL DEFAULT 50,
  "erp_type"              TEXT,
  "erp_config_ref"        TEXT,
  "trial_ends_at"         TIMESTAMPTZ,
  "is_active"             BOOLEAN          NOT NULL DEFAULT true,
  "created_at"            TIMESTAMPTZ      NOT NULL DEFAULT now(),
  "updated_at"            TIMESTAMPTZ      NOT NULL DEFAULT now(),
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_key"          ON "tenants"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_custom_domain_key" ON "tenants"("custom_domain");

-- =============================================================================
-- 2. Insertar tenant KH (fábrica existente)
-- =============================================================================
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

-- =============================================================================
-- 3. Criar tabela tenant_admins
-- =============================================================================
CREATE TABLE IF NOT EXISTS "tenant_admins" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     UUID        NOT NULL,
  "email"         TEXT        NOT NULL,
  "password_hash" TEXT        NOT NULL,
  "role"          TEXT        NOT NULL DEFAULT 'admin',
  "is_active"     BOOLEAN     NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMPTZ,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "tenant_admins_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  ALTER TABLE "tenant_admins" ADD CONSTRAINT "tenant_admins_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'constraint tenant_admins_tenant_id_fkey já existe, ignorando'; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_admins_tenant_id_email_key" ON "tenant_admins"("tenant_id", "email");
CREATE INDEX        IF NOT EXISTS "tenant_admins_tenant_id_idx"        ON "tenant_admins"("tenant_id");

-- =============================================================================
-- 4. Adicionar tenant_id (nullable primeiro) às tabelas existentes
-- =============================================================================
ALTER TABLE "stations"   ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE "operators"  ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE "operators"  ADD COLUMN IF NOT EXISTS "language"  TEXT NOT NULL DEFAULT 'es-ES';
ALTER TABLE "references" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- =============================================================================
-- 5. Backfill: atribuir todos os registos ao tenant KH
-- =============================================================================
UPDATE "stations"   SET "tenant_id" = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE "tenant_id" IS NULL;
UPDATE "operators"  SET "tenant_id" = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE "tenant_id" IS NULL;
UPDATE "references" SET "tenant_id" = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE "tenant_id" IS NULL;
UPDATE "audit_logs" SET "tenant_id" = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' WHERE "tenant_id" IS NULL;

-- =============================================================================
-- 6. Aplicar NOT NULL + FK + índices
-- =============================================================================
ALTER TABLE "stations"   ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "operators"  ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "references" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "tenant_id" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "stations" ADD CONSTRAINT "stations_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'constraint stations_tenant_id_fkey já existe, ignorando'; END $$;

DO $$ BEGIN
  ALTER TABLE "operators" ADD CONSTRAINT "operators_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'constraint operators_tenant_id_fkey já existe, ignorando'; END $$;

DO $$ BEGIN
  ALTER TABLE "references" ADD CONSTRAINT "references_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'constraint references_tenant_id_fkey já existe, ignorando'; END $$;

DO $$ BEGIN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'constraint audit_logs_tenant_id_fkey já existe, ignorando'; END $$;

CREATE INDEX IF NOT EXISTS "stations_tenant_id_idx"   ON "stations"("tenant_id");
CREATE INDEX IF NOT EXISTS "operators_tenant_id_idx"  ON "operators"("tenant_id");
CREATE INDEX IF NOT EXISTS "references_tenant_id_idx" ON "references"("tenant_id");
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- =============================================================================
-- 7. Substituir unique simples por compostos em operators e references
-- (mesmo sageCode pode existir em tenants diferentes)
-- =============================================================================
-- Dropar FK que depende do índice antes de removê-lo
ALTER TABLE "operator_sessions" DROP CONSTRAINT IF EXISTS "operator_sessions_operator_number_fkey";
DROP INDEX IF EXISTS "operators_sage_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "operators_tenant_sage_code_key"  ON "operators"("tenant_id", "sage_code");
DROP INDEX IF EXISTS "references_sage_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "references_tenant_sage_code_key" ON "references"("tenant_id", "sage_code");

-- =============================================================================
-- 8. Adicionar campos a steps
-- =============================================================================
ALTER TABLE "steps" ADD COLUMN IF NOT EXISTS "video_url" TEXT;
ALTER TABLE "steps" ADD COLUMN IF NOT EXISTS "synonyms"  TEXT[] NOT NULL DEFAULT '{}';

-- =============================================================================
-- 9. Adicionar operatorId a operator_sessions (FK para operators.id)
-- =============================================================================
ALTER TABLE "operator_sessions" ADD COLUMN IF NOT EXISTS "operator_id" UUID;

DO $$ BEGIN
  ALTER TABLE "operator_sessions" ADD CONSTRAINT "operator_sessions_operator_id_fkey"
    FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'constraint operator_sessions_operator_id_fkey já existe, ignorando'; END $$;

CREATE INDEX IF NOT EXISTS "operator_sessions_operator_id_idx" ON "operator_sessions"("operator_id");

-- =============================================================================
-- 10. Criar tabela voice_commands
-- =============================================================================
CREATE TABLE IF NOT EXISTS "voice_commands" (
  "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  UUID        NOT NULL,
  "scope"      TEXT        NOT NULL,
  "station_id" UUID,
  "step_id"    UUID,
  "action"     TEXT        NOT NULL,
  "phrases"    TEXT[]      NOT NULL DEFAULT '{}',
  "is_enabled" BOOLEAN     NOT NULL DEFAULT true,
  "language"   TEXT        NOT NULL DEFAULT 'es-ES',
  "sequence"   TEXT,
  "context"    JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "voice_commands_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "voice_commands" ADD CONSTRAINT "voice_commands_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'constraint voice_commands_tenant_id_fkey já existe, ignorando'; END $$;

DO $$ BEGIN
  ALTER TABLE "voice_commands" ADD CONSTRAINT "voice_commands_station_id_fkey"
    FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'constraint voice_commands_station_id_fkey já existe, ignorando'; END $$;

DO $$ BEGIN
  ALTER TABLE "voice_commands" ADD CONSTRAINT "voice_commands_step_id_fkey"
    FOREIGN KEY ("step_id") REFERENCES "steps"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'constraint voice_commands_step_id_fkey já existe, ignorando'; END $$;

CREATE INDEX IF NOT EXISTS "voice_commands_tenant_scope_idx" ON "voice_commands"("tenant_id", "scope");

-- =============================================================================
-- 11. Insertar comandos de voz por defecto para KH
-- =============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS "voice_commands_tenant_scope_action_key"
  ON "voice_commands"("tenant_id", "scope", "action")
  WHERE "station_id" IS NULL AND "step_id" IS NULL;

INSERT INTO "voice_commands" ("tenant_id", "scope", "action", "phrases", "language")
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'global', 'confirm', ARRAY['pin bueno','bueno','ok','confirmado','sí'], 'es-ES'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'global', 'next',    ARRAY['siguiente','avanzar','continuar'],          'es-ES'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'global', 'prev',    ARRAY['atrás','anterior','volver'],                'es-ES'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'global', 'repeat',  ARRAY['repetir','repite','otra vez'],              'es-ES'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'global', 'stop',    ARRAY['parar','paro','stop'],                      'es-ES'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'global', 'logout',  ARRAY['salir','cerrar sesión','logout'],           'es-ES'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'global', 'help',    ARRAY['ayuda','help','socorro'],                   'es-ES')
ON CONFLICT DO NOTHING;
