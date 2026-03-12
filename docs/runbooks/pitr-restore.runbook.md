# PITR (Point-in-Time Recovery) & Backup Restore Drill Runbook

## Overview

This runbook documents the procedure for performing a Cloud SQL Point-in-Time Recovery (PITR) and backup restoration drill for the TTNDD_Ops platform.

> **CRITICAL**: This drill MUST be completed before any production go-live.

## Prerequisites

- `gcloud` CLI authenticated with project-owner or `cloudsql.admin` role
- GCP Project ID: `$GCP_PROJECT` (e.g., `ttndd-ops-prod`)
- Cloud SQL Instance: `$SQL_INSTANCE` (e.g., `ttndd-ops-db`)
- Region: `$REGION` (e.g., `asia-southeast1`)

## 1. Verify PITR is Enabled

```bash
gcloud sql instances describe $SQL_INSTANCE \
  --project=$GCP_PROJECT \
  --format="value(settings.backupConfiguration.enabled,settings.backupConfiguration.pointInTimeRecoveryEnabled)"
```

Expected output: `True True`

If not enabled:
```bash
gcloud sql instances patch $SQL_INSTANCE \
  --project=$GCP_PROJECT \
  --backup-start-time=02:00 \
  --enable-point-in-time-recovery \
  --retained-transaction-log-days=7
```

## 2. List Available Backups

```bash
gcloud sql backups list \
  --instance=$SQL_INSTANCE \
  --project=$GCP_PROJECT \
  --limit=5
```

## 3. PITR Clone (Non-destructive)

> This creates a NEW instance from the backup point-in-time. It does NOT affect the live instance.

```bash
# Set restore timestamp (RFC 3339 format)
RESTORE_TIME="2026-03-12T10:00:00.000Z"

# Clone to a test instance
gcloud sql instances clone $SQL_INSTANCE ttndd-pitr-drill \
  --project=$GCP_PROJECT \
  --point-in-time=$RESTORE_TIME
```

Wait for operation to complete (~5-10 minutes):
```bash
gcloud sql operations list \
  --instance=$SQL_INSTANCE \
  --project=$GCP_PROJECT \
  --limit=3
```

## 4. Verify Restored Data

```bash
# Get the clone's IP
CLONE_IP=$(gcloud sql instances describe ttndd-pitr-drill \
  --project=$GCP_PROJECT \
  --format="value(ipAddresses[0].ipAddress)")

# Connect via Cloud SQL Proxy or authorized network
# Then run Prisma migrate status against the clone
DATABASE_URL="postgresql://postgres:$DB_PASSWORD@$CLONE_IP:5432/ttndd_ops" \
  npx prisma migrate status --schema=apps/api/prisma/schema.prisma
```

### Verification Checklist

| Check | Command | Expected |
|-------|---------|----------|
| Migration status | `prisma migrate status` | All migrations applied |
| Table count | `SELECT count(*) FROM information_schema.tables WHERE table_schema='public'` | ≥ 60 |
| Org data exists | `SELECT count(*) FROM "Organization"` | ≥ 1 |
| Member data | `SELECT count(*) FROM "OrgMember"` | ≥ 1 |
| Audit trail | `SELECT count(*) FROM "AuditLog"` | ≥ 0 |

## 5. Cleanup Drill Instance

```bash
gcloud sql instances delete ttndd-pitr-drill \
  --project=$GCP_PROJECT \
  --quiet
```

## 6. Document Results

After completing the drill, record results:

```markdown
## Drill Results — [DATE]

- **Operator**: [name]
- **Restore Point**: [timestamp]
- **Clone Duration**: [minutes]
- **Migration Status**: [pass/fail]
- **Table Count**: [number]
- **Data Integrity**: [pass/fail]
- **Total Drill Duration**: [minutes]
- **Issues Found**: [none / description]
```

## Emergency: Full Instance Restore

> **WARNING**: This replaces the LIVE instance. Use only in true disaster scenarios.

```bash
# 1. Stop application traffic (route to maintenance page)
gcloud run services update ttndd-api \
  --project=$GCP_PROJECT \
  --region=$REGION \
  --max-instances=0

# 2. Restore from backup
gcloud sql instances restore-backup $SQL_INSTANCE \
  --project=$GCP_PROJECT \
  --backup-id=$BACKUP_ID

# 3. Wait for restore, then re-enable traffic
gcloud run services update ttndd-api \
  --project=$GCP_PROJECT \
  --region=$REGION \
  --max-instances=10
```

## Schedule

| Drill Type | Frequency | Last Completed |
|------------|-----------|----------------|
| PITR Clone + Verify | Monthly | _Not yet_ |
| Full Restore (staging) | Quarterly | _Not yet_ |
