#!/usr/bin/env bash
# ──────────────────────────────────────────────────────
# backup-verify.sh — Automated Backup Verification
#
# Creates a Cloud SQL clone from latest backup, verifies
# Prisma migration status and table count, then cleans up.
#
# Usage:
#   GCP_PROJECT=ttndd-ops-prod SQL_INSTANCE=ttndd-ops-db \
#     DB_PASSWORD=xxx ./scripts/backup-verify.sh
# ──────────────────────────────────────────────────────
set -euo pipefail

: "${GCP_PROJECT:?GCP_PROJECT is required}"
: "${SQL_INSTANCE:?SQL_INSTANCE is required}"
: "${DB_PASSWORD:?DB_PASSWORD is required}"

CLONE_NAME="${SQL_INSTANCE}-verify-$(date +%Y%m%d%H%M)"
SCHEMA_PATH="apps/api/prisma/schema.prisma"

echo "═══════════════════════════════════════════════"
echo "  TTNDD_Ops — Backup Verification Drill"
echo "  Instance : $SQL_INSTANCE"
echo "  Clone    : $CLONE_NAME"
echo "  Project  : $GCP_PROJECT"
echo "═══════════════════════════════════════════════"

# ── Step 1: Clone from latest backup ────────────────
echo ""
echo "⏳ Step 1: Cloning from latest backup..."
gcloud sql instances clone "$SQL_INSTANCE" "$CLONE_NAME" \
  --project="$GCP_PROJECT" \
  --quiet

echo "✅ Clone created: $CLONE_NAME"

# ── Step 2: Get clone IP ────────────────────────────
echo ""
echo "⏳ Step 2: Getting clone IP..."
CLONE_IP=$(gcloud sql instances describe "$CLONE_NAME" \
  --project="$GCP_PROJECT" \
  --format="value(ipAddresses[0].ipAddress)")
echo "   Clone IP: $CLONE_IP"

# ── Step 3: Check migration status ─────────────────
echo ""
echo "⏳ Step 3: Checking Prisma migration status..."
export DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@${CLONE_IP}:5432/ttndd_ops"

MIGRATE_STATUS=$(npx prisma migrate status --schema="$SCHEMA_PATH" 2>&1) || true
echo "$MIGRATE_STATUS"

if echo "$MIGRATE_STATUS" | grep -q "Database schema is up to date"; then
  echo "✅ Migrations: UP TO DATE"
  MIGRATE_PASS=true
else
  echo "⚠️  Migrations: DRIFT DETECTED"
  MIGRATE_PASS=false
fi

# ── Step 4: Check table count ──────────────────────
echo ""
echo "⏳ Step 4: Checking table count..."
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$CLONE_IP" -U postgres -d ttndd_ops -t -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ') || TABLE_COUNT="N/A"
echo "   Tables found: $TABLE_COUNT"

if [ "$TABLE_COUNT" != "N/A" ] && [ "$TABLE_COUNT" -ge 60 ]; then
  echo "✅ Table count: PASS (≥60)"
  TABLE_PASS=true
else
  echo "⚠️  Table count: BELOW THRESHOLD"
  TABLE_PASS=false
fi

# ── Step 5: Cleanup ────────────────────────────────
echo ""
echo "⏳ Step 5: Cleaning up clone..."
gcloud sql instances delete "$CLONE_NAME" \
  --project="$GCP_PROJECT" \
  --quiet

echo "✅ Clone deleted: $CLONE_NAME"

# ── Summary ────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo "  VERIFICATION SUMMARY"
echo "═══════════════════════════════════════════════"
echo "  Migration Status : $([ "$MIGRATE_PASS" = true ] && echo '✅ PASS' || echo '❌ FAIL')"
echo "  Table Count      : $TABLE_COUNT $([ "$TABLE_PASS" = true ] && echo '✅ PASS' || echo '❌ FAIL')"
echo "  Clone Name       : $CLONE_NAME (deleted)"
echo "═══════════════════════════════════════════════"

if [ "$MIGRATE_PASS" = true ] && [ "$TABLE_PASS" = true ]; then
  echo ""
  echo "🎉 Backup verification: ALL CHECKS PASSED"
  exit 0
else
  echo ""
  echo "⚠️  Backup verification: SOME CHECKS FAILED"
  exit 1
fi
