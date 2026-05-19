# P3 RLS Rollback Drill

## Scope

This drill covers rollback of migration `20260516211000_rls_full_tenant_tables`, which enables Row Level Security for all migrated tenant tables that carry `org_id`, plus `organizations`, `ticket_status_history`, and `notification_delivery_logs`.

## Current Enforcement Model

- RLS is enforced for non-owner app role `ttndd_app`.
- `FORCE ROW LEVEL SECURITY` is not enabled in this migration.
- Owner/dev flows continue to work without RLS context while P3 runtime enforcement is expanded.
- App-role requests must set `app.current_org_id` inside a transaction before reading or writing tenant tables.

## Rollback Trigger

Use this rollback only if one of these is observed after deploy:

- Production app role cannot read or write expected same-org data despite a valid tenant context.
- Cross-org isolation policy blocks a legitimate table because the table lacks `org_id` and needs a parent-based policy.
- A previously missing table is created and needs explicit RLS policy validation before app-role traffic resumes.

## Pre-Rollback Evidence

Capture:

- Failing request id or job id.
- API route or worker job name.
- `current_org_id`, user id, and role used for the request.
- PostgreSQL error code/message.
- Output of:

```sql
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('organizations', 'branches', 'tickets', 'notifications');
```

## Rollback Command

Prefer a targeted policy disable over destructive schema rollback.

```sql
BEGIN;

ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_logs DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tenant_table text;
BEGIN
    FOR tenant_table IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.oid
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND a.attname = 'org_id'
          AND NOT a.attisdropped
        ORDER BY c.relname
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tenant_table);
    END LOOP;
END
$$;

COMMIT;
```

## Re-Enable Command

After fixing the offending policy or service path, re-run:

```powershell
$env:DATABASE_URL='postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops'
$env:DATABASE_MIGRATION_URL='postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops'
node node_modules\prisma\build\index.js migrate deploy --schema apps\api\prisma\schema.prisma
```

If the migration is already marked applied, manually run the SQL from `apps/api/prisma/migrations/20260516211000_rls_full_tenant_tables/migration.sql` in the target database after approval.

## Verification After Rollback Or Re-Enable

Run:

```powershell
$env:DATABASE_URL='postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops'
$env:DATABASE_MIGRATION_URL='postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops'
$env:RLS_SUPERUSER_URL='postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops'
$env:RLS_APP_USER_URL='postgresql://ttndd_app:ttndd_local@localhost:5432/ttndd_ops'
pnpm.cmd --filter api exec jest --config ./test/jest-e2e.json rls-full-tenant-tables.e2e-spec.ts --runInBand --testTimeout=30000
```

Expected:

- RLS enabled on all discovered tenant tables.
- App role sees only rows for the active `app.current_org_id`.
- Cross-org writes are rejected.

## Notes

- Do not enable `FORCE ROW LEVEL SECURITY` until services that use owner connections are routed through a reliable transaction-scoped tenant context.
- Do not use `ttndd_app` for broad app runtime traffic unless the request path sets RLS context inside a transaction.
