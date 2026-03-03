-- CreateTable
CREATE TABLE "operators" (
    "id" UUID NOT NULL,
    "sage_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operators_sage_code_key" ON "operators"("sage_code");

-- Backfill: create placeholder operators for existing sessions so FK doesn't fail
INSERT INTO "operators" ("id", "sage_code", "name", "is_active", "last_synced_at", "created_at", "updated_at")
SELECT gen_random_uuid(), os."operator_number", 'Operario ' || os."operator_number", true, NOW(), NOW(), NOW()
FROM (SELECT DISTINCT "operator_number" FROM "operator_sessions") os
ON CONFLICT ("sage_code") DO NOTHING;

-- AddForeignKey
ALTER TABLE "operator_sessions" ADD CONSTRAINT "operator_sessions_operator_number_fkey" FOREIGN KEY ("operator_number") REFERENCES "operators"("sage_code") ON DELETE RESTRICT ON UPDATE CASCADE;
