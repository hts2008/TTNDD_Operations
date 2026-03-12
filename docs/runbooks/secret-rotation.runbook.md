# Secret Rotation Runbook — TTNDD_Ops Platform

> **T-0203** | WP-8.1 Security Hardening | STORY-008
> **Owner**: SRE/Security | **Rotation Cycle**: Every 90 days
> **Last Updated**: 2026-03-12

---

## Secret Inventory

| Secret Name | Location | Type | Rotation Frequency | Impact if Compromised |
|---|---|---|---|---|
| `DATABASE_URL` | GCP Secret Manager / `.env` | PostgreSQL connection string | 90 days | Full DB access |
| `JWT_SECRET` | GCP Secret Manager / `.env` | HMAC signing key | 90 days | Auth bypass |
| `GCS_SERVICE_ACCOUNT_KEY` | GCP IAM / `.env` | GCS signed URL signing | 180 days (managed by GCP) | File access |
| `ENCRYPTION_KEY` | GCP Secret Manager / `.env` | AES-256 field encryption | 180 days | PII exposure |
| `SESSION_SECRET` | GCP Secret Manager / `.env` | Express session signing | 90 days | Session hijack |

---

## Rotation Procedures

### 1. Database Password (`DATABASE_URL`)

```bash
# Step 1: Generate new password
NEW_PASS=$(openssl rand -base64 32)

# Step 2: Update Cloud SQL user password
gcloud sql users set-password postgres \
  --instance=ttndd-ops-db \
  --password="$NEW_PASS"

# Step 3: Update Secret Manager
echo -n "postgresql://postgres:${NEW_PASS}@/ttndd_ops?host=/cloudsql/PROJECT:REGION:INSTANCE" | \
  gcloud secrets versions add DATABASE_URL --data-file=-

# Step 4: Redeploy Cloud Run (picks up new secret)
gcloud run services update ttndd-ops-api --region=asia-southeast1 --update-secrets=DATABASE_URL=DATABASE_URL:latest

# Step 5: Verify
curl -s https://ttndd-ops-api-*.run.app/api/health | jq .status
```

### 2. JWT Secret (`JWT_SECRET`)

```bash
# Step 1: Generate new key
NEW_JWT=$(openssl rand -hex 64)

# Step 2: Update Secret Manager
echo -n "$NEW_JWT" | gcloud secrets versions add JWT_SECRET --data-file=-

# Step 3: Redeploy
gcloud run services update ttndd-ops-api --region=asia-southeast1 --update-secrets=JWT_SECRET=JWT_SECRET:latest

# ⚠️ Impact: All existing JWTs invalidated — users must re-login
```

### 3. Encryption Key (`ENCRYPTION_KEY`)

> [!CAUTION]
> Rotating the encryption key requires **re-encrypting all sensitive fields** in the database.
> This is a data migration — plan downtime or use dual-key strategy.

```bash
# Step 1: Generate new key
NEW_KEY=$(openssl rand -base64 32)

# Step 2: Run re-encryption migration script
# (Script must decrypt with old key, re-encrypt with new key)
npx ts-node scripts/rotate-encryption-key.ts --old-key="$OLD_KEY" --new-key="$NEW_KEY"

# Step 3: Update Secret Manager
echo -n "$NEW_KEY" | gcloud secrets versions add ENCRYPTION_KEY --data-file=-

# Step 4: Redeploy + verify
gcloud run services update ttndd-ops-api --region=asia-southeast1 --update-secrets=ENCRYPTION_KEY=ENCRYPTION_KEY:latest
```

### 4. GCS Service Account Key

```bash
# Prefer Workload Identity (no key file rotation needed)
# If using key file:
gcloud iam service-accounts keys create new-key.json \
  --iam-account=ttndd-gcs@PROJECT.iam.gserviceaccount.com

# Deploy new key, then delete old key
gcloud iam service-accounts keys delete OLD_KEY_ID \
  --iam-account=ttndd-gcs@PROJECT.iam.gserviceaccount.com
```

---

## Post-Rotation Validation Checklist

- [ ] API health check returns 200
- [ ] Login flow works (JWT verification)
- [ ] File upload/download works (GCS signed URLs)
- [ ] Encrypted fields decrypt correctly (spot-check 3 records)
- [ ] No 500 errors in Cloud Run logs for 15 minutes
- [ ] Monitoring alerts clear

## Emergency Rollback

If rotation fails:

```bash
# Revert to previous version
gcloud secrets versions access latest --secret=SECRET_NAME  # verify current
gcloud run services update ttndd-ops-api \
  --region=asia-southeast1 \
  --update-secrets=SECRET_NAME=SECRET_NAME:PREVIOUS_VERSION_NUMBER
```

## Rotation Schedule

| Month | Secrets Due |
|---|---|
| Every Q1 (Jan) | DATABASE_URL, JWT_SECRET, SESSION_SECRET |
| Every Q2 (Apr) | DATABASE_URL, JWT_SECRET, SESSION_SECRET |
| Every Q3 (Jul) | DATABASE_URL, JWT_SECRET, SESSION_SECRET, ENCRYPTION_KEY, GCS_KEY |
| Every Q4 (Oct) | DATABASE_URL, JWT_SECRET, SESSION_SECRET |
