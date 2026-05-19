# P3 Production Deploy Evidence - 2026-05-17

## Scope

This artifact records the P3-005 and P3-006 production evidence for TTNDD_Ops.
It is intentionally evidence-oriented so KANBAN and future agents can audit the
claim without re-running long Cloud Build or GCP commands.

## Production Targets

| Surface        | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| GCP project    | `ttndd-platform-2026`                                         |
| Region         | `asia-southeast1`                                             |
| API service    | `ttndd-api`                                                   |
| API URL        | `https://ttndd-api-122940795437.asia-southeast1.run.app`      |
| Web service    | `ttndd-platform`                                              |
| Web URL        | `https://ttndd-platform-122940795437.asia-southeast1.run.app` |
| Smoke build id | `p3-20260517-api-r2-web-r1`                                   |
| Smoke commit   | `84557a7ac31e0bb41b6281cfef30937c00122cd6`                    |

## Build And Deployment Evidence

| Item                | Evidence                                                                               |
| ------------------- | -------------------------------------------------------------------------------------- |
| API Cloud Build     | `84a7515d-7ebe-480f-9ab3-2361c081e65b` completed `SUCCESS`                             |
| API image           | `gcr.io/ttndd-platform-2026/ttndd-api:p3-20260517-84557a7-r2`                          |
| API revision        | `ttndd-api-00030-5h9`                                                                  |
| Web Cloud Build     | `66c5be82-e4b9-4368-8ebc-a206d4a56808` completed `SUCCESS`                             |
| Web image           | `gcr.io/ttndd-platform-2026/ttndd-web:p3-20260517-84557a7`                             |
| Web revision        | `ttndd-platform-00057-6ws`                                                             |
| API runtime secrets | `DATABASE_URL` and `JWT_SECRET` are sourced from Secret Manager on the runtime service |
| API service account | `ttndd-api-sa@ttndd-platform-2026.iam.gserviceaccount.com`                             |

## Migration Evidence

| Item                            | Evidence                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Production migration job        | `ttndd-api-migrate-zs6ms` completed successfully                                                            |
| Production migration status job | `ttndd-api-migrate-status-mxntl` reported `Database schema is up to date!`                                  |
| Migrations detected             | `19 migrations found`                                                                                       |
| Corrective action               | Secret versions were rotated with no trailing newline after Cloud Run jobs exposed malformed DB URLs        |
| Corrective action               | `ttndd_app` was granted required access to `_prisma_migrations`                                             |
| Corrective action               | Missing prerequisite tables for older migrations were bootstrapped idempotently before final migrate deploy |

## Production Smoke Evidence

Detailed JSON output: `docs/artifacts/p3-production-smoke.json`.

| Gate                 | Result                                                                          |
| -------------------- | ------------------------------------------------------------------------------- |
| API health           | `PASS`, HTTP 200, `db=connected`                                                |
| API canary           | `PASS`, HTTP 200, `status=healthy`, `buildId=ttndd-api-00030-5h9`               |
| API probes           | `PASS`, HTTP 200, `overall=healthy`                                             |
| Web home             | `PASS`, HTTP 200                                                                |
| Release gate saved   | `PASS`, HTTP 201, report id `f9988b48-91e0-42eb-92e1-8f7a45240833`              |
| Release gate visible | `PASS`, latest report retrievable through `/api/v1/system/release-gates/latest` |

## Monitoring Evidence

| Item                | Evidence                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| API uptime check    | `projects/ttndd-platform-2026/uptimeCheckConfigs/ttndd-api-health-rwwLmlKjrKU`, path `/api/v1/system/health`, period 300s |
| Web uptime check    | `projects/ttndd-platform-2026/uptimeCheckConfigs/ttndd-web-home-aVbafikZSSA`, path `/`, period 300s                       |
| Uptime alert policy | `projects/ttndd-platform-2026/alertPolicies/9635202395194466368`, display `TTNDD production uptime failures`, enabled     |
| Alert policy source | `docs/artifacts/p3-uptime-alert-policy.json`                                                                              |

## Backup, Restore, And Rollback Evidence

| Item                     | Evidence                                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Cloud SQL backup enabled | `settings.backupConfiguration.enabled=true`                                                                                   |
| PITR enabled             | `pointInTimeRecoveryEnabled=true`, `replicationLogArchivingEnabled=true`, `transactionalLogStorageState=CLOUD_STORAGE`        |
| Backup retention         | `retainedBackups=7`                                                                                                           |
| Latest automated backup  | `1779030760000`, `SUCCESSFUL`, start `2026-05-17T15:12:40.020Z`, end `2026-05-17T15:14:21.514Z`                               |
| API rollback candidate   | Previous healthy revisions include `ttndd-api-00029-95h`, `ttndd-api-00028-rfh`, `ttndd-api-00027-hdb`, `ttndd-api-00026-fxv` |
| Web rollback candidate   | Previous healthy revisions include `ttndd-platform-00056-bb9`, `ttndd-platform-00055-txp`                                     |
| Rollback runbook         | `scripts/rollback.sh` and `docs/runbooks/p3-production-ops-runbook.md`                                                        |

## Open Blocker

Budget alert creation is not complete. `gcloud alpha/beta billing budgets` could
not be used because the SDK alpha/beta components are not installed in the
current machine, and the direct Billing Budgets API call returned `403 Forbidden`
for billing account `0125A2-B70311-300412`. The code/deploy work is not blocked,
but closing P3-006 requires either Billing Account Budget Admin permission or a
manual budget alert configured by an owner.

## Verdict

P3-005 is implemented: the API and web surfaces are deployed, healthy, and the
release gate report is saved and visible in production.

P3-006 is partial: uptime monitoring, alert policy, backup/PITR, restore/rollback
evidence, and runbook coverage are present, but budget alert creation is blocked
by billing-account permissions.
