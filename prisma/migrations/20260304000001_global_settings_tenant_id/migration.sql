-- Adicionar tenant_id a global_settings (campo nullable para compatibilidade legacy KH)
ALTER TABLE "global_settings" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
