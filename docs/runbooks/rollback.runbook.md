# Rollback Runbook — TTNDD_Ops Cloud Run

> **Purpose**: Step-by-step rollback procedure when a deployment causes issues.

## Prerequisites

- `gcloud` CLI authenticated with project access
- Project ID: `ttndd-platform` (or as configured)
- Service name: `ttndd-api`
- Region: `asia-southeast1`

---

## 1. Detect Issue

| Signal | Action |
|--------|--------|
| `/health/canary` returns `degraded` | Rollback immediately |
| Error rate > 5% in Cloud Run logs | Rollback immediately |
| Playwright E2E gate fails post-deploy | Rollback immediately |
| User reports critical bug | Assess → rollback if blocking |

---

## 2. Identify Previous Revision

```bash
# List recent revisions
gcloud run revisions list \
  --service=ttndd-api \
  --region=asia-southeast1 \
  --limit=5

# Note the last known-good revision name
# Format: ttndd-api-XXXXX-XXX
```

---

## 3. Rollback Traffic

```bash
# Route 100% traffic to the known-good revision
gcloud run services update-traffic ttndd-api \
  --region=asia-southeast1 \
  --to-revisions=LAST_GOOD_REVISION=100
```

---

## 4. Verify Rollback

```bash
# Check health
curl https://YOUR_SERVICE_URL/health

# Check canary (DB connectivity)
curl https://YOUR_SERVICE_URL/health/canary

# Run smoke test
npx playwright test tests/e2e/canary/canary.spec.ts
```

---

## 5. Database Rollback (if needed)

> ⚠️ Only if the faulty release included a Prisma migration

```bash
# Check migration status
npx prisma migrate status

# If needed, manually revert the migration
# (Prisma does not support auto-rollback; use manual SQL)
# 1. Identify the migration in prisma/migrations/
# 2. Write reversal SQL
# 3. Execute against the database
# 4. Remove the migration entry from _prisma_migrations table
```

---

## 6. Post-Rollback

1. [ ] Update `#ops-incidents` channel with rollback summary
2. [ ] Create a bug ticket in KANBAN for root cause analysis
3. [ ] Lock deployments until fix is verified
4. [ ] Run full E2E suite against rolled-back version

---

## 7. Canary-to-Stable Promotion

When the fix is deployed and verified:

```bash
# Gradual rollout: 10% → 50% → 100%
gcloud run services update-traffic ttndd-api \
  --region=asia-southeast1 \
  --to-revisions=NEW_FIXED_REVISION=10,LAST_GOOD_REVISION=90

# After monitoring (15 min minimum):
gcloud run services update-traffic ttndd-api \
  --region=asia-southeast1 \
  --to-revisions=NEW_FIXED_REVISION=50,LAST_GOOD_REVISION=50

# Final promotion:
gcloud run services update-traffic ttndd-api \
  --region=asia-southeast1 \
  --to-revisions=NEW_FIXED_REVISION=100
```
