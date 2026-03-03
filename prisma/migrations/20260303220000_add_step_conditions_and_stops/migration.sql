-- Add new columns to steps table
ALTER TABLE "steps" ADD COLUMN "is_error_step" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "steps" ADD COLUMN "error_message" TEXT;
ALTER TABLE "steps" ADD COLUMN "period_every_n" INTEGER;

-- Create StepCondition table
CREATE TABLE "step_conditions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "step_id" UUID NOT NULL,
    "match_response" TEXT,
    "next_step_id" UUID,
    CONSTRAINT "step_conditions_pkey" PRIMARY KEY ("id")
);

-- Create StationStop table
CREATE TABLE "station_stops" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "station_id" UUID NOT NULL,
    "session_id" UUID,
    "start_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_at" TIMESTAMPTZ,
    "reason" TEXT,
    CONSTRAINT "station_stops_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "step_conditions_step_id_idx" ON "step_conditions"("step_id");
CREATE INDEX "station_stops_station_id_idx" ON "station_stops"("station_id");
CREATE INDEX "station_stops_start_at_idx" ON "station_stops"("start_at");

-- Add foreign keys
ALTER TABLE "step_conditions" ADD CONSTRAINT "step_conditions_step_id_fkey"
    FOREIGN KEY ("step_id") REFERENCES "steps"("id") ON DELETE CASCADE;
ALTER TABLE "step_conditions" ADD CONSTRAINT "step_conditions_next_step_id_fkey"
    FOREIGN KEY ("next_step_id") REFERENCES "steps"("id") ON DELETE SET NULL;
ALTER TABLE "station_stops" ADD CONSTRAINT "station_stops_station_id_fkey"
    FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE;
ALTER TABLE "station_stops" ADD CONSTRAINT "station_stops_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "operator_sessions"("id") ON DELETE SET NULL;
