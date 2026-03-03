-- CreateTable: referencias de producto sincronizadas del Sage
CREATE TABLE "references" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sage_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "references_pkey" PRIMARY KEY ("id")
);

-- CreateTable: many-to-many estaciones <-> referencias
CREATE TABLE "station_references" (
    "station_id" UUID NOT NULL,
    "reference_id" UUID NOT NULL,

    CONSTRAINT "station_references_pkey" PRIMARY KEY ("station_id","reference_id")
);

-- AlterTable: agregar referenceId a operator_sessions
ALTER TABLE "operator_sessions" ADD COLUMN "reference_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "references_sage_code_key" ON "references"("sage_code");

-- AddForeignKey
ALTER TABLE "station_references" ADD CONSTRAINT "station_references_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_references" ADD CONSTRAINT "station_references_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_sessions" ADD CONSTRAINT "operator_sessions_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "references"("id") ON DELETE SET NULL ON UPDATE CASCADE;
