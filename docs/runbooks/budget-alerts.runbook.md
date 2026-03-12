# Budget Alerts Runbook — TTNDD_Ops

## Overview

Monthly budget: **800,000 VND**. Four alert thresholds trigger escalating responses.

## Alert Thresholds

| Threshold | Level | Action |
|-----------|-------|--------|
| **50%** (400K) | ℹ️ Info | Review spend breakdown, verify no anomalies |
| **80%** (640K) | ⚠️ Warning | Disable optional modules (`warehouse_sync`, `parent_portal`) |
| **100%** (800K) | 🔴 Critical | Switch to read-only mode for non-essential writes |
| **120%** (960K) | 🚨 Emergency | Execute kill-switch: scale to 0 instances |

## Setup (gcloud CLI)

### 1. Create Pub/Sub Topic
```bash
gcloud pubsub topics create budget-alerts \
  --project=ttndd-ops-prod
```

### 2. Create Budget
```bash
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="TTNDD_Ops Monthly Budget" \
  --budget-amount=800000VND \
  --threshold-rule=percent=0.50,basis=current-spend \
  --threshold-rule=percent=0.80,basis=current-spend \
  --threshold-rule=percent=1.00,basis=current-spend \
  --threshold-rule=percent=1.20,basis=current-spend \
  --notifications-rule-pubsub-topic=projects/ttndd-ops-prod/topics/budget-alerts
```

### 3. Create Push Subscription
```bash
gcloud pubsub subscriptions create budget-alerts-webhook \
  --topic=budget-alerts \
  --push-endpoint=https://api.ttndd.org/admin/cost/budget-webhook \
  --ack-deadline=20
```

## Responding to Alerts

### 50% — Review
1. Check GCP Billing Console → Cost breakdown
2. Verify no unexpected services running
3. No action required if within normal usage

### 80% — Disable Optional Modules
```bash
# API call to disable optional modules
curl -X POST https://api.ttndd.org/admin/cost/degrade \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"level": "warning"}'
```

### 100% — Read-Only Mode
```bash
curl -X POST https://api.ttndd.org/admin/cost/degrade \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"level": "critical"}'
```

### 120% — Kill Switch
```bash
# Emergency: scale Cloud Run to 0
gcloud run services update ttndd-api \
  --max-instances=0 \
  --region=asia-southeast1

# Notify stakeholders
echo "EMERGENCY: TTNDD_Ops scaled to 0 due to budget overrun" | \
  mail -s "Budget Emergency" admin@ttndd.org
```

## Recovery
When a new billing cycle begins:
1. Re-enable Cloud Run instances: `--max-instances=3`
2. Re-enable all feature flags
3. Verify all services healthy via `/health/probes`
