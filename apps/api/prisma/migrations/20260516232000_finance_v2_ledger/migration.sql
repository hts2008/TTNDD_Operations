-- P3-003 Finance v2: persistent cost centers, fee plans, sponsors, and ledger entries.

ALTER TABLE "financial_transactions"
  ADD COLUMN IF NOT EXISTS "cost_center_id" VARCHAR(50);

CREATE TABLE IF NOT EXISTS "cost_centers" (
  "id" VARCHAR(50) PRIMARY KEY,
  "org_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "code" VARCHAR(50),
  "parent_id" VARCHAR(50),
  "budget_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "spent_amount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "description" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "fee_plans" (
  "id" VARCHAR(50) PRIMARY KEY,
  "org_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "frequency" VARCHAR(50) NOT NULL,
  "amount" DECIMAL(15, 2) NOT NULL,
  "fee_type" VARCHAR(50),
  "description" TEXT,
  "start_date" DATE,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sponsors" (
  "id" VARCHAR(50) PRIMARY KEY,
  "org_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "contribution_type" VARCHAR(50) NOT NULL,
  "amount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "description" TEXT,
  "received_date" DATE,
  "contact_info" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ledger_entries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" UUID NOT NULL,
  "transaction_id" UUID NOT NULL,
  "account_id" UUID,
  "cost_center_id" VARCHAR(50),
  "posting_key" VARCHAR(120) NOT NULL,
  "entry_type" VARCHAR(20) NOT NULL,
  "ledger_account" VARCHAR(100) NOT NULL,
  "amount" DECIMAL(15, 2) NOT NULL,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'VND',
  "description" TEXT,
  "source_type" VARCHAR(50),
  "source_id" UUID,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "cost_centers_org_id_code_key"
  ON "cost_centers" ("org_id", "code");
CREATE INDEX IF NOT EXISTS "cost_centers_org_id_idx" ON "cost_centers" ("org_id");
CREATE INDEX IF NOT EXISTS "fee_plans_org_id_is_active_idx" ON "fee_plans" ("org_id", "is_active");
CREATE INDEX IF NOT EXISTS "sponsors_org_id_contribution_type_idx" ON "sponsors" ("org_id", "contribution_type");
CREATE UNIQUE INDEX IF NOT EXISTS "ledger_entries_org_id_posting_key_entry_type_ledger_account_key"
  ON "ledger_entries" ("org_id", "posting_key", "entry_type", "ledger_account");
CREATE INDEX IF NOT EXISTS "ledger_entries_org_id_transaction_id_idx" ON "ledger_entries" ("org_id", "transaction_id");
CREATE INDEX IF NOT EXISTS "ledger_entries_org_id_account_id_idx" ON "ledger_entries" ("org_id", "account_id");
CREATE INDEX IF NOT EXISTS "ledger_entries_org_id_cost_center_id_idx" ON "ledger_entries" ("org_id", "cost_center_id");
CREATE INDEX IF NOT EXISTS "financial_transactions_org_id_cost_center_id_idx"
  ON "financial_transactions" ("org_id", "cost_center_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'financial_transactions_cost_center_id_fkey'
  ) THEN
    ALTER TABLE "financial_transactions"
      ADD CONSTRAINT "financial_transactions_cost_center_id_fkey"
      FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ledger_entries_transaction_id_fkey'
  ) THEN
    ALTER TABLE "ledger_entries"
      ADD CONSTRAINT "ledger_entries_transaction_id_fkey"
      FOREIGN KEY ("transaction_id") REFERENCES "financial_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ledger_entries_account_id_fkey'
  ) THEN
    ALTER TABLE "ledger_entries"
      ADD CONSTRAINT "ledger_entries_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ledger_entries_cost_center_id_fkey'
  ) THEN
    ALTER TABLE "ledger_entries"
      ADD CONSTRAINT "ledger_entries_cost_center_id_fkey"
      FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

WITH legacy_cost_centers AS (
  SELECT
    o.id AS org_id,
    value AS item,
    row_number() OVER (PARTITION BY o.id ORDER BY value->>'name') AS rn
  FROM "organizations" o
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(o.settings->'costCenters') = 'array' THEN o.settings->'costCenters'
      ELSE '[]'::jsonb
    END
  ) AS value
)
INSERT INTO "cost_centers" (
  "id", "org_id", "name", "code", "parent_id", "budget_amount", "spent_amount", "description", "created_at", "updated_at"
)
SELECT
  COALESCE(NULLIF(item->>'id', ''), 'cc-legacy-' || org_id::text || '-' || rn::text),
  org_id,
  COALESCE(NULLIF(item->>'name', ''), 'Legacy cost center ' || rn::text),
  NULLIF(item->>'code', ''),
  NULLIF(item->>'parentId', ''),
  COALESCE(NULLIF(item->>'budgetAmount', '')::numeric, 0),
  COALESCE(NULLIF(item->>'spentAmount', '')::numeric, 0),
  NULLIF(item->>'description', ''),
  COALESCE(NULLIF(item->>'createdAt', '')::timestamptz, now()),
  now()
FROM legacy_cost_centers
ON CONFLICT ("id") DO NOTHING;

WITH legacy_fee_plans AS (
  SELECT
    o.id AS org_id,
    value AS item,
    row_number() OVER (PARTITION BY o.id ORDER BY value->>'name') AS rn
  FROM "organizations" o
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(o.settings->'feePlans') = 'array' THEN o.settings->'feePlans'
      ELSE '[]'::jsonb
    END
  ) AS value
)
INSERT INTO "fee_plans" (
  "id", "org_id", "name", "frequency", "amount", "fee_type", "description", "start_date", "is_active", "created_at", "updated_at"
)
SELECT
  COALESCE(NULLIF(item->>'id', ''), 'fp-legacy-' || org_id::text || '-' || rn::text),
  org_id,
  COALESCE(NULLIF(item->>'name', ''), 'Legacy fee plan ' || rn::text),
  COALESCE(NULLIF(item->>'frequency', ''), 'one_time'),
  COALESCE(NULLIF(item->>'amount', '')::numeric, 0),
  NULLIF(item->>'feeType', ''),
  NULLIF(item->>'description', ''),
  NULLIF(item->>'startDate', '')::date,
  COALESCE((item->>'isActive')::boolean, true),
  COALESCE(NULLIF(item->>'createdAt', '')::timestamptz, now()),
  now()
FROM legacy_fee_plans
ON CONFLICT ("id") DO NOTHING;

WITH legacy_sponsors AS (
  SELECT
    o.id AS org_id,
    value AS item,
    row_number() OVER (PARTITION BY o.id ORDER BY value->>'name') AS rn
  FROM "organizations" o
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(o.settings->'sponsors') = 'array' THEN o.settings->'sponsors'
      ELSE '[]'::jsonb
    END
  ) AS value
)
INSERT INTO "sponsors" (
  "id", "org_id", "name", "contribution_type", "amount", "description", "received_date", "contact_info", "created_at", "updated_at"
)
SELECT
  COALESCE(NULLIF(item->>'id', ''), 'sp-legacy-' || org_id::text || '-' || rn::text),
  org_id,
  COALESCE(NULLIF(item->>'name', ''), 'Legacy sponsor ' || rn::text),
  COALESCE(NULLIF(item->>'contributionType', ''), 'cash'),
  COALESCE(NULLIF(item->>'amount', '')::numeric, 0),
  NULLIF(item->>'description', ''),
  NULLIF(item->>'receivedDate', '')::date,
  NULLIF(item->>'contactInfo', ''),
  COALESCE(NULLIF(item->>'createdAt', '')::timestamptz, now()),
  now()
FROM legacy_sponsors
ON CONFLICT ("id") DO NOTHING;

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

  FOREACH table_name IN ARRAY ARRAY['cost_centers', 'fee_plans', 'sponsors', 'ledger_entries']
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
