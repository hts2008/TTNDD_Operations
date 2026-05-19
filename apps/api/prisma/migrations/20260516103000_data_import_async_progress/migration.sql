ALTER TABLE "import_batches"
  ADD COLUMN IF NOT EXISTS "processed_rows" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "duplicate_rows" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "progress_pct" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "validation_report" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "report_csv" TEXT,
  ADD COLUMN IF NOT EXISTS "source_hash" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "source_payload" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "import_batches_org_id_status_idx"
  ON "import_batches" ("org_id", "status");

CREATE INDEX IF NOT EXISTS "import_batches_org_id_import_type_source_hash_idx"
  ON "import_batches" ("org_id", "import_type", "source_hash");
