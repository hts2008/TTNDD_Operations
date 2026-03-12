#!/usr/bin/env bash
# T-0225 — Cloud Run Rollback Script
# Usage: ./scripts/rollback.sh [REVISION_NAME]
# If no revision specified, rolls back to the previous revision.

set -euo pipefail

SERVICE="${CLOUD_RUN_SERVICE:-ttndd-api}"
REGION="${CLOUD_RUN_REGION:-asia-southeast1}"
PROJECT="${GCP_PROJECT:-ttndd-platform}"
HEALTH_URL="${SERVICE_URL:-}"

echo "🔄 TTNDD Cloud Run Rollback"
echo "   Service: ${SERVICE}"
echo "   Region:  ${REGION}"
echo "   Project: ${PROJECT}"
echo ""

# Step 1: Get revisions
echo "📋 Recent revisions:"
gcloud run revisions list \
  --service="${SERVICE}" \
  --region="${REGION}" \
  --project="${PROJECT}" \
  --limit=5 \
  --format="table(name,status.conditions[0].status,createTime)"

# Step 2: Determine target revision
if [ -n "${1:-}" ]; then
  TARGET_REVISION="$1"
  echo ""
  echo "🎯 Rolling back to specified revision: ${TARGET_REVISION}"
else
  # Get the second most recent revision (previous)
  TARGET_REVISION=$(gcloud run revisions list \
    --service="${SERVICE}" \
    --region="${REGION}" \
    --project="${PROJECT}" \
    --limit=2 \
    --format="value(name)" | tail -n 1)
  echo ""
  echo "🎯 Rolling back to previous revision: ${TARGET_REVISION}"
fi

# Step 3: Route traffic
echo ""
echo "🔀 Routing 100% traffic to ${TARGET_REVISION}..."
gcloud run services update-traffic "${SERVICE}" \
  --region="${REGION}" \
  --project="${PROJECT}" \
  --to-revisions="${TARGET_REVISION}=100"

echo ""
echo "✅ Traffic updated."

# Step 4: Health check (if URL available)
if [ -n "${HEALTH_URL}" ]; then
  echo ""
  echo "🏥 Running health check..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_URL}/health" || echo "000")
  if [ "${HTTP_CODE}" = "200" ]; then
    echo "✅ Health check passed (HTTP ${HTTP_CODE})"
  else
    echo "⚠️  Health check returned HTTP ${HTTP_CODE}"
  fi
fi

echo ""
echo "🎉 Rollback complete. Monitor logs and run E2E suite to verify."
