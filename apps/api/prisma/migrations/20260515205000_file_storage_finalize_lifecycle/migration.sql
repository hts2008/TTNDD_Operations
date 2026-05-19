ALTER TABLE "file_object_refs"
  ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "checksum" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "scan_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "scan_error" TEXT,
  ADD COLUMN IF NOT EXISTS "finalized_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "file_object_refs_org_id_status_idx"
  ON "file_object_refs"("org_id", "status");

CREATE INDEX IF NOT EXISTS "file_object_refs_org_id_scan_status_idx"
  ON "file_object_refs"("org_id", "scan_status");
