# P3 Production Ops Runbook

This runbook closes the P3-005/P3-006 evidence shape for TTNDD_Ops. It is written for the current GCP target:

- Project: `ttndd-platform-2026`
- Region: `asia-southeast1`
- API service: `ttndd-api`
- Web service: `ttndd-platform`
- Cloud SQL instance: `ttndd-db`
- Upload bucket: `ttndd-uploads-2026`

## 1. Pre-Deploy Gates

Run from `platform/`:

```powershell
node node_modules\prisma\build\index.js generate --schema apps\api\prisma\schema.prisma
node node_modules\typescript\bin\tsc -p apps\api\tsconfig.json --noEmit --incremental false
node node_modules\typescript\bin\tsc -p apps\web\tsconfig.json --noEmit --incremental false
pnpm.cmd --filter api exec jest tickets.service.spec.ts finance.service.spec.ts --runInBand
pnpm.cmd --filter api exec jest --config ./test/jest-e2e.json p0-j1-j3-smoke.e2e-spec.ts tickets-approval-v2.e2e-spec.ts --runInBand --testTimeout=30000
pnpm.cmd --filter api build
pnpm.cmd --filter @ttndd/web build
node contracts\openapi\generate.js
node scripts\check-contract-drift.js
```

Do not deploy if any gate fails.

Cloud Build runs ESLint as an advisory step because the repository still has
historical warning debt. TypeScript typecheck, Jest, production build, migration,
and smoke tests remain blocking release gates.

## 2. Database Migration

Production migrations must use `migrate deploy`, never `migrate dev`.

```powershell
gcloud.cmd sql instances describe ttndd-db --project ttndd-platform-2026

$env:DATABASE_URL = "<production owner connection string>"
$env:DATABASE_MIGRATION_URL = "<production owner connection string>"
node node_modules\prisma\build\index.js migrate deploy --schema apps\api\prisma\schema.prisma
```

Expected current latest migration:

```text
20260517001000_approval_flow_v2
```

## 3. API Deploy

Use Cloud Build so the image and deploy settings are recorded in Cloud Build history:

```powershell
$sha = git rev-parse HEAD
gcloud.cmd builds submit `
  --config cloudbuild.yaml `
  --substitutions COMMIT_SHA=$sha `
  --project ttndd-platform-2026 `
  .
```

The API deploy must set:

- `NODE_ENV=production`
- `APP_ENV=production`
- `GOOGLE_CLOUD_PROJECT=ttndd-platform-2026`
- `GCS_BUCKET=ttndd-uploads-2026`
- `RATE_LIMIT_MAX_REQUESTS=100`
- `RATE_LIMIT_WINDOW_MS=60000`
- `FINANCE_DOUBLE_ENTRY=true`
- Secret Manager values for `DATABASE_URL` and `JWT_SECRET`
- `REDIS_URL` is optional future cache wiring; do not add it to deploy config until
  a production Redis instance and secret exist.
- Cloud SQL attachment `ttndd-platform-2026:asia-southeast1:ttndd-db`

## 4. Web Deploy

```powershell
$sha = git rev-parse HEAD
gcloud.cmd builds submit `
  --config cloudbuild-web.yaml `
  --substitutions COMMIT_SHA=$sha `
  --project ttndd-platform-2026 `
  .
```

The web image must be built with:

```text
NEXT_PUBLIC_API_URL=https://ttndd-api-122940795437.asia-southeast1.run.app
```

The frontend API client appends `/api/v1` automatically.

## 5. Post-Deploy Smoke And Release Gate

Unauthenticated public smoke:

```powershell
$env:TTNDD_API_BASE = "https://ttndd-api-122940795437.asia-southeast1.run.app"
$env:TTNDD_WEB_BASE = "https://ttndd-platform-122940795437.asia-southeast1.run.app"
$env:TTNDD_SAVE_RELEASE_GATE = "true"
$env:TTNDD_SMOKE_OUTPUT = "docs/artifacts/p3-production-smoke.json"
node scripts\p3-production-smoke.mjs
```

If an auth token is available, also prove the saved release gate is visible through the authenticated endpoint:

```powershell
$env:TTNDD_AUTH_TOKEN = "<admin or service token>"
node scripts\p3-production-smoke.mjs
```

Expected gates:

- `api-health-ok = PASS`
- `api-canary-not-unhealthy = PASS`
- `api-probes-not-unhealthy = PASS`
- `web-home-200 = PASS`
- `release-gate-report-saved = PASS` when `TTNDD_SAVE_RELEASE_GATE=true`
- `release-gate-visible = PASS` when `TTNDD_AUTH_TOKEN` is provided

## 6. Monitoring Setup

Minimum production monitoring:

```powershell
gcloud.cmd monitoring uptime create ttndd-api-health `
  --resource-type=uptime-url `
  --hostname=ttndd-api-122940795437.asia-southeast1.run.app `
  --path=/api/v1/system/health `
  --protocol=https `
  --period=60 `
  --project=ttndd-platform-2026

gcloud.cmd monitoring uptime create ttndd-web-home `
  --resource-type=uptime-url `
  --hostname=ttndd-platform-122940795437.asia-southeast1.run.app `
  --path=/ `
  --protocol=https `
  --period=60 `
  --project=ttndd-platform-2026
```

Alert policies required before production sign-off:

- API uptime check failure for 2 consecutive checks.
- Cloud Run 5xx rate above 1% for 5 minutes.
- Cloud Run p95 latency above 500 ms for 5 minutes.
- Cloud SQL CPU above 80% for 10 minutes.
- Cloud SQL connection utilization above 80% for 10 minutes.
- Billing budget alert at 50%, 80%, and 100% of the monthly threshold.

Cloud Logging retention should be configured at the sink/bucket level according to the DPIA checklist.

## 7. Backup And Restore Drill

Non-destructive drill:

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
gcloud.cmd sql exports sql ttndd-db gs://ttndd-uploads-2026/backups/drills/ttndd-db-$stamp.sql.gz `
  --database=ttndd_ops `
  --project=ttndd-platform-2026

gcloud.cmd sql instances create ttndd-db-restore-drill-$stamp `
  --database-version=POSTGRES_16 `
  --tier=db-f1-micro `
  --region=asia-southeast1 `
  --project=ttndd-platform-2026

gcloud.cmd sql imports sql ttndd-db-restore-drill-$stamp gs://ttndd-uploads-2026/backups/drills/ttndd-db-$stamp.sql.gz `
  --database=ttndd_ops `
  --project=ttndd-platform-2026
```

After import, connect read-only and verify:

```sql
select count(*) from organizations;
select migration_name, finished_at from _prisma_migrations order by finished_at desc limit 5;
```

Delete the drill instance after evidence is captured:

```powershell
gcloud.cmd sql instances delete ttndd-db-restore-drill-$stamp --project=ttndd-platform-2026
```

## 8. Rollback

API rollback:

```powershell
$env:TTNDD_ROLLBACK_SERVICE = "ttndd-api"
$env:TTNDD_HEALTH_PATH = "/api/v1/system/health"
bash scripts/rollback.sh
```

Web rollback:

```powershell
$env:TTNDD_ROLLBACK_SERVICE = "ttndd-platform"
$env:TTNDD_HEALTH_PATH = "/"
bash scripts/rollback.sh
```

Manual rollback:

```powershell
gcloud.cmd run revisions list --service ttndd-api --region asia-southeast1 --project ttndd-platform-2026
gcloud.cmd run services update-traffic ttndd-api --to-revisions PREVIOUS_REVISION=100 --region asia-southeast1 --project ttndd-platform-2026
```

Schema rollback should prefer targeted policy/feature-flag rollback. Destructive database restore is last resort.
