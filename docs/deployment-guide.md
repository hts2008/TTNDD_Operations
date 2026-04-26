# TTNDD_Ops Platform — Deployment Guide

## Prerequisites

- Node.js 20+ with pnpm 8+
- Docker (for containerized deployment)
- Google Cloud SDK (`gcloud`) for Cloud Run
- PostgreSQL 16+ database
- Redis 7+ (optional, for caching)

---

## Local Development

### 1. Start infrastructure

```bash
docker-compose up -d
```

### 2. Configure environment

```bash
cp .env.example apps/api/.env
# Edit .env with local database credentials
```

### 3. Run migrations

```bash
cd apps/api
npx prisma migrate dev
npx prisma db seed   # optional: seed demo data
```

### 4. Start development server

```bash
pnpm dev --filter=api
# API runs at http://localhost:8080
```

### 5. Verify

```bash
curl http://localhost:8080/api/v1/system/health
# Expected: { "status": "ok", ... }
```

---

## Production Deployment (Cloud Run)

### Option A: Automated (Cloud Build)

1. **Connect repository** to Cloud Build in GCP Console
2. **Set up secrets** in Secret Manager:
   ```bash
   gcloud secrets create ttndd-database-url --data-file=-
   gcloud secrets create ttndd-jwt-secret --data-file=-
   gcloud secrets create ttndd-redis-url --data-file=-
   ```
3. **Create service account**:
   ```bash
   gcloud iam service-accounts create ttndd-api-sa
   gcloud secrets add-iam-policy-binding ttndd-database-url \
     --member="serviceAccount:ttndd-api-sa@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   # Repeat for other secrets
   ```
4. **Push to main** → Cloud Build triggers automatically
5. **Verify**:
   ```bash
   gcloud run services describe ttndd-api --region=asia-southeast1
   curl $(gcloud run services describe ttndd-api --region=asia-southeast1 --format='value(status.url)')/api/v1/system/health
   ```

### Option B: Manual Deploy

1. **Build image**:

   ```bash
   docker build -t gcr.io/PROJECT_ID/ttndd-api:latest .
   docker push gcr.io/PROJECT_ID/ttndd-api:latest
   ```

2. **Deploy**:
   ```bash
   gcloud run deploy ttndd-api \
     --image=gcr.io/PROJECT_ID/ttndd-api:latest \
     --region=asia-southeast1 \
     --platform=managed \
     --port=8080 \
     --memory=512Mi \
     --cpu=1 \
     --min-instances=0 \
     --max-instances=10 \
     --set-secrets=DATABASE_URL=ttndd-database-url:latest
   ```

---

## Database Migration (Production)

```bash
# 1. Connect to Cloud SQL proxy or set DATABASE_URL
export DATABASE_URL="postgresql://..."

# 2. Run migrations
npx prisma migrate deploy

# 3. Verify
npx prisma db pull  # should show no diff
```

**⚠️ NEVER run `prisma migrate dev` in production.** Use `prisma migrate deploy` only.

---

## Health Endpoints

| Endpoint                           | Auth | Purpose                    |
| ---------------------------------- | ---- | -------------------------- |
| `GET /api/v1/system/health`        | None | Load balancer health check |
| `GET /api/v1/system/health/canary` | None | Post-deploy verification   |
| `GET /api/v1/system/health/probes` | None | Synthetic probe results    |
| `GET /api/v1/system/module-health` | JWT  | Module readiness per org   |
| `GET /api/v1/system/seed-health`   | JWT  | Seed data completeness     |

---

## Monitoring

### Metrics to watch

- Request latency (P99 < 500ms)
- Error rate (< 1%)
- Memory usage (< 400Mi steady-state)
- Database connection pool utilization

### Alerts

- Health check failure → PagerDuty/Slack
- Error rate > 5% for 5 minutes → Rollback trigger
- Memory > 450Mi → Scale up investigation

---

## Rollback

```bash
# List revisions
gcloud run revisions list --service=ttndd-api --region=asia-southeast1

# Route traffic to previous revision
gcloud run services update-traffic ttndd-api \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region=asia-southeast1
```
