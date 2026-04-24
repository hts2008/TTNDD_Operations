#!/bin/bash
# Cloud Run Rollback Script
# Usage: ./scripts/rollback.sh [REVISION_NAME]
#
# If no revision specified, rolls back to the previous healthy revision.

set -euo pipefail

SERVICE="ttndd-platform"
REGION="asia-southeast1"
PROJECT="ttndd-platform-2026"

echo "🔄 Cloud Run Rollback"
echo "   Service: $SERVICE"
echo "   Region:  $REGION"

if [ -n "${1:-}" ]; then
  TARGET_REVISION="$1"
  echo "   Target:  $TARGET_REVISION (manual)"
else
  echo "   Finding previous healthy revision..."
  TARGET_REVISION=$(gcloud run revisions list \
    --service="$SERVICE" \
    --region="$REGION" \
    --project="$PROJECT" \
    --filter="status.conditions.type=Ready AND status.conditions.status=True" \
    --format="value(metadata.name)" \
    --sort-by="~metadata.creationTimestamp" \
    --limit=2 | tail -1)

  if [ -z "$TARGET_REVISION" ]; then
    echo "❌ No healthy previous revision found"
    exit 1
  fi
  echo "   Target:  $TARGET_REVISION (auto-detected)"
fi

echo ""
echo "⚡ Rolling back to: $TARGET_REVISION"

gcloud run services update-traffic "$SERVICE" \
  --region="$REGION" \
  --project="$PROJECT" \
  --to-revisions="$TARGET_REVISION=100"

echo ""
echo "✅ Rollback complete"
echo "   Verifying health..."

SERVICE_URL=$(gcloud run services describe "$SERVICE" \
  --region="$REGION" \
  --project="$PROJECT" \
  --format="value(status.url)")

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/system/health" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ Health check passed (HTTP 200)"
else
  echo "   ⚠️  Health check returned HTTP $HTTP_CODE"
fi
