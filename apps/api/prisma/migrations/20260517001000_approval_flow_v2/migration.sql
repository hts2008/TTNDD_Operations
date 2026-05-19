-- P3-004 Approval v2: multi-step approval flows for tickets.

CREATE TABLE IF NOT EXISTS "approval_flows" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" UUID NOT NULL,
  "ticket_id" UUID NOT NULL,
  "approval_type" VARCHAR(50) NOT NULL,
  "amount" DECIMAL(15, 2),
  "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
  "current_step_order" INTEGER NOT NULL DEFAULT 1,
  "requested_by" UUID NOT NULL,
  "requested_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "completed_at" TIMESTAMPTZ,
  "sla_due_at" TIMESTAMPTZ,
  "metadata" JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS "approval_steps" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" UUID NOT NULL,
  "flow_id" UUID NOT NULL,
  "step_order" INTEGER NOT NULL,
  "step_name" VARCHAR(255) NOT NULL,
  "approver_role" VARCHAR(50),
  "approver_user_id" UUID,
  "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
  "due_at" TIMESTAMPTZ,
  "decided_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "approval_decisions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" UUID NOT NULL,
  "flow_id" UUID NOT NULL,
  "step_id" UUID NOT NULL,
  "decision" VARCHAR(20) NOT NULL,
  "notes" TEXT,
  "decided_by" UUID NOT NULL,
  "decided_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "approval_flows_org_id_ticket_id_status_idx"
  ON "approval_flows" ("org_id", "ticket_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "approval_steps_flow_id_step_order_key"
  ON "approval_steps" ("flow_id", "step_order");
CREATE INDEX IF NOT EXISTS "approval_steps_org_id_flow_id_status_idx"
  ON "approval_steps" ("org_id", "flow_id", "status");
CREATE INDEX IF NOT EXISTS "approval_decisions_org_id_flow_id_idx"
  ON "approval_decisions" ("org_id", "flow_id");
CREATE INDEX IF NOT EXISTS "approval_decisions_org_id_step_id_idx"
  ON "approval_decisions" ("org_id", "step_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'approval_flows_ticket_id_fkey'
  ) THEN
    ALTER TABLE "approval_flows"
      ADD CONSTRAINT "approval_flows_ticket_id_fkey"
      FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'approval_steps_flow_id_fkey'
  ) THEN
    ALTER TABLE "approval_steps"
      ADD CONSTRAINT "approval_steps_flow_id_fkey"
      FOREIGN KEY ("flow_id") REFERENCES "approval_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'approval_decisions_flow_id_fkey'
  ) THEN
    ALTER TABLE "approval_decisions"
      ADD CONSTRAINT "approval_decisions_flow_id_fkey"
      FOREIGN KEY ("flow_id") REFERENCES "approval_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'approval_decisions_step_id_fkey'
  ) THEN
    ALTER TABLE "approval_decisions"
      ADD CONSTRAINT "approval_decisions_step_id_fkey"
      FOREIGN KEY ("step_id") REFERENCES "approval_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
DECLARE
  table_name text;
  policy_name text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ttndd_app') THEN
    CREATE ROLE ttndd_app LOGIN PASSWORD 'ttndd_local';
  END IF;

  GRANT USAGE ON SCHEMA public TO ttndd_app;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ttndd_app;

  FOREACH table_name IN ARRAY ARRAY['approval_flows', 'approval_steps', 'approval_decisions']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO ttndd_app', table_name);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);

    policy_name := 'org_isolation_' || table_name;
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO ttndd_app USING (org_id = NULLIF(current_setting(''app.current_org_id'', true), '''')::uuid) WITH CHECK (org_id = NULLIF(current_setting(''app.current_org_id'', true), '''')::uuid)',
      policy_name,
      table_name
    );
  END LOOP;
END $$;
