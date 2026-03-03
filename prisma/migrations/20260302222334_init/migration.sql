-- CreateTable
CREATE TABLE "stations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "product_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "steps" (
    "id" UUID NOT NULL,
    "station_id" UUID NOT NULL,
    "order_num" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "voz" TEXT,
    "response_type" TEXT NOT NULL DEFAULT 'voice',
    "respuesta" TEXT,
    "photo_url" TEXT,
    "model_url" TEXT,
    "is_qc" BOOLEAN NOT NULL DEFAULT false,
    "qc_frequency" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operator_sessions" (
    "id" UUID NOT NULL,
    "operator_number" TEXT NOT NULL,
    "station_id" UUID NOT NULL,
    "login_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logout_at" TIMESTAMPTZ,
    "completed_units" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "operator_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_logs" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "step_id" UUID NOT NULL,
    "completed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response_received" TEXT,
    "duration_ms" INTEGER,
    "was_skipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "step_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "steps_station_id_idx" ON "steps"("station_id");

-- CreateIndex
CREATE UNIQUE INDEX "steps_station_id_order_num_key" ON "steps"("station_id", "order_num");

-- CreateIndex
CREATE INDEX "operator_sessions_station_id_idx" ON "operator_sessions"("station_id");

-- CreateIndex
CREATE INDEX "operator_sessions_operator_number_idx" ON "operator_sessions"("operator_number");

-- CreateIndex
CREATE INDEX "operator_sessions_is_active_idx" ON "operator_sessions"("is_active");

-- CreateIndex
CREATE INDEX "step_logs_session_id_idx" ON "step_logs"("session_id");

-- CreateIndex
CREATE INDEX "step_logs_step_id_idx" ON "step_logs"("step_id");

-- CreateIndex
CREATE INDEX "step_logs_completed_at_idx" ON "step_logs"("completed_at");

-- AddForeignKey
ALTER TABLE "steps" ADD CONSTRAINT "steps_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_sessions" ADD CONSTRAINT "operator_sessions_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_logs" ADD CONSTRAINT "step_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "operator_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_logs" ADD CONSTRAINT "step_logs_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
