# TTNDD_Operations Localhost Readiness Runbook

> Created: 2026-05-19
> Scope: local-first build, smoke, and browser verification before any GitHub push or production handoff.
> Excludes: billing-account permissions, Billing Budgets API, and budget alert ownership.

## Purpose

TTNDD_Operations must be reliable on localhost before each build/push checkpoint.
This runbook defines the repeatable local gate for AI agents so UI, feature,
dataflow, and browser evidence stay grounded in a working local platform instead
of production-only claims.

## Required Local Targets

| Target   | URL                        | Required state                                          |
| -------- | -------------------------- | ------------------------------------------------------- |
| API      | `http://127.0.0.1:3001`    | NestJS API responds under `/api/v1` with local Postgres |
| Web      | `http://localhost:3101`    | Next.js app uses the local API URL                      |
| Postgres | `127.0.0.1:5432/ttndd_ops` | Local DB has TTNDD pilot seed and migrations applied    |

## Known Local Environment Defaults

API process from `platform/apps/api`:

```powershell
$env:APP_ENV='development'
$env:NODE_ENV='development'
$env:CORS_ORIGIN='http://localhost:3101'
$env:DATABASE_URL='postgresql://ttndd:ttndd_local@127.0.0.1:5432/ttndd_ops?schema=public'
$env:PORT='3001'
node_modules\.bin\ts-node.CMD -r ..\..\node_modules\tsconfig-paths\register src\main.ts
```

Web process from `platform/apps/web`:

```powershell
$env:NEXT_PUBLIC_API_URL='http://127.0.0.1:3001'
$env:TTNDD_AUTH_BYPASS='false'
node node_modules\next\dist\bin\next dev --port 3101
```

Important local DB note:

- The local app-role credential for `ttndd_app` has been unreliable in previous
  E2E runs. Any test that bootstraps `AppModule` should set
  `DATABASE_URL=postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops`
  explicitly until the local `ttndd_app` password is repaired.
- Do not store real production secrets in this runbook, memory, KANBAN, or test
  artifacts.

## Smoke Identity Fixtures

| Persona                    | Token/member                           |
| -------------------------- | -------------------------------------- |
| Admin/leader browser smoke | `Bearer dev:p0p1-browser-admin`        |
| Parent browser smoke       | `Bearer dev:p0p1-browser-parent`       |
| Member detail fixture      | `24000000-0000-0000-0000-000000000032` |

These are local development fixture identities. They are not production auth
credentials.

## Localhost Gate

Run the gate in this order before a build checkpoint is considered ready:

1. Confirm API and web are serving:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:3001/api/v1/system/health -TimeoutSec 10
Invoke-WebRequest -UseBasicParsing -Uri http://localhost:3101/login -TimeoutSec 10
```

2. Run API type-check after backend edits:

```powershell
node node_modules\typescript\bin\tsc -p apps\api\tsconfig.json --noEmit --incremental false
```

3. Run web type-check and lint after frontend edits:

```powershell
node node_modules\typescript\bin\tsc -p apps\web\tsconfig.json --noEmit --incremental false
pnpm --filter web lint
```

4. Probe endpoints that previously failed during route sweeps:

```powershell
$headers = @{ Authorization = 'Bearer dev:p0p1-browser-admin' }
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3001/api/v1/finance/fees?limit=50' -Headers $headers -TimeoutSec 10
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3001/api/v1/assets/uniform' -Headers $headers -TimeoutSec 10
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3001/api/v1/assets/loans' -Headers $headers -TimeoutSec 10
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3001/api/v1/assets/maintenance' -Headers $headers -TimeoutSec 10
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3001/api/v1/assets/kits' -Headers $headers -TimeoutSec 10
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3001/api/v1/process/sops?limit=50' -Headers $headers -TimeoutSec 10
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3001/api/v1/process/runs?limit=20' -Headers $headers -TimeoutSec 10
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3001/api/v1/process/definitions?limit=50' -Headers $headers -TimeoutSec 10
```

5. Run browser visual smoke for the primary routes and write artifacts under:

```text
platform/docs/artifacts/w1-008-core-pages/
```

Required clean result:

- every captured route returns page status `200`;
- no `Failed to fetch` UI text;
- no redirect to login after authenticated token injection;
- no browser console error;
- desktop routes include dashboard, sessions, approvals, tickets,
  consent-templates, member-detail, parent-portal, scout, skills, lms, rewards,
  finance, assets, process, reports, release;
- mobile captures include dashboard, sessions, assets, and parent-portal.

Current evidence:

- `platform/docs/artifacts/w1-008-core-pages/summary.json`
- `platform/docs/reviews/09_TTNDD_Operations_UI_Shell_Audit_Matrix.md`

## Build And Push Policy

Before pushing to `https://github.com/hts2008/TTNDD_Operations.git`:

1. The localhost gate above must be green or the blocker must be documented in
   `memory/memory-bank/progress.md` and `memory/sessions/current-session.md`.
2. Do not stage generated temporary exports from `apps/api/tmp/exports/`.
3. Do not stage Playwright scratch output from `pw-output/` unless it is an
   intentional evidence artifact.
4. Commit source, docs, tests, and intentional artifacts together only when they
   describe one coherent checkpoint.
5. Push after the build/checkpoint evidence exists, not before.

## Motion UI Guardrails For Local Testing

The user wants a motion-site quality direction inspired by MotionSites. For this
platform, motion must improve operational clarity instead of becoming a landing
page layer.

Acceptable motion:

- route entry reveal, table row reveal, stepper/timeline transitions;
- hover/press feedback for cards and icon buttons;
- progress-ring and EXP/rank meter transitions;
- command-center background texture with subtle parallax or animated gradient
  mesh only if it does not hide data;
- success/failed mutation transitions that clarify state changes.

Required guardrails:

- honor `prefers-reduced-motion`;
- keep default transitions between 150ms and 300ms unless a longer background
  loop is strictly decorative;
- no motion required to complete a workflow;
- no text overlap, flicker, scroll-jacking, or focus loss;
- mobile and low-end device performance must remain usable.

## Definition Of Ready For Next Agent

A feature task may start only after:

- API and web localhost targets respond;
- the route being changed has a known browser baseline or a new baseline task is
  included;
- expected API calls and mutation side effects are listed in the task row;
- evidence path is declared before code changes.
