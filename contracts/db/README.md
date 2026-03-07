# contracts/db — Database Schema Contract

## Schema Source of Truth

The database schema is managed via **Prisma** in `apps/api/prisma/`.

```
apps/api/prisma/
├── schema.prisma          ← SSOT schema definition (60 models)
├── migrations/            ← Migration history
│   ├── 20260305110811_init_foundation_tables/
│   ├── 20260305112708_add_hrm_audit_models/
│   ├── 20260305113109_add_reward_engine_models/
│   ├── 20260305113435_add_scout_session_event_models/
│   ├── 20260305114907_add_phase2_all_models/
│   ├── 20260305121858_add_notifications_models/
│   └── 20260305164804_sprint_a_spices_file_system_import/
└── seed.ts                ← Seed data script
```

## Convention

- Schema changes MUST go through `prisma migrate dev` (never raw SQL)
- Every model MUST have `orgId` for RLS multi-tenancy
- Migration history is verified in CI via `prisma migrate deploy` against a clean PostgreSQL
- Schema changes MUST be reflected in `TTNDD_OPS_V3.md` PHẦN IV (Data)

## CI Verification

The `migration-check` job in `.github/workflows/ci.yml` validates that all migrations
apply cleanly to a fresh PostgreSQL 16 instance on every push/PR.

## Related Contracts

- `contracts/openapi/ttndd-ops-api.json` — API surface generated from these models
- `contracts/events/catalog.json` — Domain events emitted by these entities
- `contracts/release/module-readiness.yaml` — Module readiness gates
