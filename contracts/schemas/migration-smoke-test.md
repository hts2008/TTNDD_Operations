# T-0910: Migration Smoke & Seed Verification Script

> **STORY-009 / WP-9.2 / M9.2**
> Run from `platform/apps/api/` directory

---

## Smoke Test Checklist

### 1. Migration Status Check

```bash
npx prisma migrate status
```

**Expected:** "Database schema is up to date!" — all 7 migrations applied.

### 2. Prisma Client Generation

```bash
npx prisma generate
```

**Expected:** "✔ Generated Prisma Client" — zero errors.

### 3. Schema Validation

```bash
npx prisma validate
```

**Expected:** "The schema at ... is valid." — zero warnings.

### 4. Model Count Verification

```bash
npx prisma db execute --stdin <<< "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
```

**Expected:** Count = 64 (63 models + 1 `_prisma_migrations` table).

### 5. Index Count Verification

```bash
npx prisma db execute --stdin <<< "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';"
```

**Expected:** Count ≥ 83 (composite indexes) + 60 (PK indexes) + 34 (unique indexes) = ~177+.

### 6. FK Count Verification

```bash
npx prisma db execute --stdin <<< "SELECT count(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';"
```

**Expected:** Count = 80 foreign keys.

---

## Seed Verification (if seed exists)

```bash
npx prisma db seed
```

**Expected:** Seed script completes without errors. Check:

- At least 1 Organization created
- At least 1 User + OrgMember created
- At least 1 Branch created

---

## Quick Validation Query

```sql
-- All tables with row counts
SELECT
  schemaname,
  relname AS table_name,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;
```

---

## RLS Readiness Check (Future)

> RLS policies are NOT YET implemented. When implemented, verify:

```sql
-- Check for RLS-enabled tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected (future):** `rowsecurity = true` for all 57 tenant-scoped tables.
