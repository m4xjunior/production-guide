-- CreateTable
CREATE TABLE "global_settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "tts_voice_id" TEXT NOT NULL DEFAULT 'JBFqnCBsd6RMkjVDRZzb',
    "tts_speed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "tts_stability" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "tts_similarity" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "font_size" INTEGER NOT NULL DEFAULT 16,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "default_language" TEXT NOT NULL DEFAULT 'es',
    "auto_advance_delay_ms" INTEGER NOT NULL DEFAULT 3000,
    "enable_qc_by_default" BOOLEAN NOT NULL DEFAULT false,
    "whisper_server_url" TEXT NOT NULL DEFAULT 'ws://localhost:8765',
    "use_whisper_stt" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "station_settings" (
    "id" UUID NOT NULL,
    "station_id" UUID NOT NULL,
    "tts_voice_id" TEXT,
    "font_size" INTEGER,
    "background_color" TEXT,
    "accent_color" TEXT,
    "auto_advance_delay_ms" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "station_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_value" JSONB,
    "new_value" JSONB NOT NULL,
    "performed_by" TEXT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "station_settings_station_id_key" ON "station_settings"("station_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_performed_at_idx" ON "audit_logs"("performed_at");

-- AddForeignKey
ALTER TABLE "station_settings" ADD CONSTRAINT "station_settings_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
