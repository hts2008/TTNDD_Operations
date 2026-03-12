# Cloud Run Limits Runbook — TTNDD_Ops

## Overview

Cloud Run cost controls via concurrency limits, instance caps, and resource constraints.

## Recommended Settings (Low-Cost Profile)

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Max instances** | 3 | Cap compute cost; sufficient for ~150 concurrent users |
| **Min instances** | 0 | Scale to zero when idle — no cost when unused |
| **Concurrency** | 80 | Requests per instance before scaling out |
| **Memory** | 512 Mi | Sufficient for NestJS + Prisma |
| **CPU** | 1 | Single vCPU per instance |
| **Timeout** | 300s | Max request duration |
| **CPU throttling** | ON | Only charge for CPU during request processing |

## Apply Settings

### Standard Configuration
```bash
gcloud run services update ttndd-api \
  --region=asia-southeast1 \
  --max-instances=3 \
  --min-instances=0 \
  --concurrency=80 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --cpu-throttling
```

### Emergency Scale-Down
```bash
# Scale to 1 instance (minimum cost while keeping service alive)
gcloud run services update ttndd-api \
  --region=asia-southeast1 \
  --max-instances=1 \
  --concurrency=20

# Kill switch — scale to 0 (service becomes unavailable)
gcloud run services update ttndd-api \
  --region=asia-southeast1 \
  --max-instances=0
```

### Recovery Scale-Up
```bash
gcloud run services update ttndd-api \
  --region=asia-southeast1 \
  --max-instances=3 \
  --concurrency=80
```

## Cost Estimation

| Scenario | Instances | Hourly Cost (est.) | Monthly Cost (est.) |
|----------|-----------|-------------------|-------------------|
| Idle (0 requests) | 0 | 0 VND | 0 VND |
| Low traffic (10 req/min) | 1 | ~300 VND | ~200K VND |
| Medium traffic (50 req/min) | 2 | ~600 VND | ~400K VND |
| Peak traffic (200 req/min) | 3 | ~900 VND | ~600K VND |

> **Note**: Estimates based on Cloud Run pricing in asia-southeast1 with CPU throttling enabled.

## Monitoring

### Check current settings
```bash
gcloud run services describe ttndd-api \
  --region=asia-southeast1 \
  --format="table(spec.template.spec.containerConcurrency, \
                   spec.template.metadata.annotations['autoscaling.knative.dev/maxScale'], \
                   spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])"
```

### Watch active instances
```bash
gcloud run services describe ttndd-api \
  --region=asia-southeast1 \
  --format="value(status.conditions)"
```

## Kill-Switch Quick Reference

| Severity | Command | Effect |
|----------|---------|--------|
| 🟡 Reduce | `--max-instances=1 --concurrency=20` | Minimal capacity |
| 🔴 Kill | `--max-instances=0` | Service offline |
| 🟢 Recover | `--max-instances=3 --concurrency=80` | Normal capacity |
