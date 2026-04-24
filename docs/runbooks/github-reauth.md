# GitHub Re-authentication Runbook — GCP Cloud Build
# Ref: Post-STORY-009 / P1b / Manual Task

## Problem
GitHub repository connection in GCP Console expired or needs re-authentication.
CI/CD triggers cannot fire on push to `main`.

## Steps

### 1. Open GCP Console
- URL: https://console.cloud.google.com/cloud-build/triggers?project=ttndd-platform-2026
- Ensure you're in the `ttndd-platform-2026` project

### 2. Check Connection Status
- Navigate to **Cloud Build → Repositories (2nd gen)**
- Look for `ttndd-ops` repository
- If status shows "Disconnected" or "Error" → proceed to Step 3

### 3. Reconnect GitHub
1. Click **"Connect Repository"** or **"Link Repository"**
2. Select **GitHub** as the host
3. Authenticate with your GitHub credentials
4. Authorize Google Cloud Build to access your GitHub org
5. Select the `ttndd-ops` repository
6. Click **"Connect"**

### 4. Verify Trigger
1. Navigate to **Cloud Build → Triggers**
2. Verify trigger exists for `main` branch
3. If no trigger: Create one:
   - Name: `ttndd-ci-main`
   - Event: Push to branch
   - Branch: `^main$`
   - Config: `platform/.github/workflows/ci.yml` (or Cloud Build config)
4. Click **"Run Trigger"** manually to test

### 5. Verify End-to-End
```bash
# From local, push a small commit
git add -A && git commit -m "chore: trigger CI" && git push origin main

# Watch Cloud Build console for trigger execution
# Expected: lint → typecheck → test → migration-check → contract-lint all green
```

## Rollback
- If re-auth fails, CI can still be run locally:
  ```bash
  cd platform
  pnpm lint && pnpm build && pnpm test
  ```

## Evidence
- Screenshot of successful trigger run → attach to KANBAN T-P1b row
