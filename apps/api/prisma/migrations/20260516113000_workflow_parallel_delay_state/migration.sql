ALTER TABLE "workflow_runs"
  ADD COLUMN IF NOT EXISTS "active_node_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "runtime_state" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "waiting_until" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "workflow_runs_org_id_status_waiting_until_idx"
  ON "workflow_runs" ("org_id", "status", "waiting_until");
