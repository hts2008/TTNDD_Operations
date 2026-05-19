# TTNDD_Operations P3 Release Package - 2026-05-17

## Release Verdict

Status: `PRODUCTION-LIVE WITH ONE OPS BLOCKER`.

The TTNDD_Ops API and web services are live on Cloud Run, production database
migrations are up to date, production smoke gates pass, release-gate evidence is
stored and retrievable, uptime checks are active, Cloud SQL backups/PITR are
enabled, and rollback candidates are available.

P3-006 is not fully closed because budget alert creation requires billing-account
permission that was not available to this session. This is an IAM/owner action,
not an application-code blocker.

## Production URLs

| Surface | URL                                                           |
| ------- | ------------------------------------------------------------- |
| API     | `https://ttndd-api-122940795437.asia-southeast1.run.app`      |
| Web     | `https://ttndd-platform-122940795437.asia-southeast1.run.app` |

## Release Components

| Component             | Status        | Evidence                                                                                              |
| --------------------- | ------------- | ----------------------------------------------------------------------------------------------------- |
| API build/deploy      | `IMPLEMENTED` | Cloud Build `84a7515d-7ebe-480f-9ab3-2361c081e65b`; revision `ttndd-api-00030-5h9`                    |
| Web build/deploy      | `IMPLEMENTED` | Cloud Build `66c5be82-e4b9-4368-8ebc-a206d4a56808`; revision `ttndd-platform-00057-6ws`               |
| Production migrations | `IMPLEMENTED` | `ttndd-api-migrate-zs6ms` success; status job `ttndd-api-migrate-status-mxntl` says schema up to date |
| Smoke/release gate    | `IMPLEMENTED` | `docs/artifacts/p3-production-smoke.json`; release report `f9988b48-91e0-42eb-92e1-8f7a45240833`      |
| Uptime checks         | `IMPLEMENTED` | API and Web uptime checks active in Cloud Monitoring                                                  |
| Uptime alert policy   | `IMPLEMENTED` | Alert policy `9635202395194466368` enabled                                                            |
| Backup/PITR           | `IMPLEMENTED` | Backup `1779030760000` successful; PITR enabled                                                       |
| Rollback runbook      | `IMPLEMENTED` | `docs/runbooks/p3-production-ops-runbook.md`; `scripts/rollback.sh`                                   |
| Budget alert          | `BLOCKED`     | Billing Budgets API returned `403 Forbidden` on billing account `0125A2-B70311-300412`                |

## Validation Summary

| Validation           | Result                        |
| -------------------- | ----------------------------- |
| API unit suite       | `PASS`, 39 suites / 374 tests |
| System probe tests   | `PASS`, 2 suites / 23 tests   |
| API type-check       | `PASS`                        |
| API build            | `PASS`                        |
| Web type-check       | `PASS`                        |
| Web production build | `PASS`                        |
| Production smoke     | `PASS`, 6/6 gates             |

## Known Production Notes

- `REDIS_URL` is not configured in production and is intentionally omitted from
  Cloud Run deploy because the current production path does not require it for
  the P3 smoke gate. Future cache/session work should add the secret before
  making Redis mandatory.
- ESLint in `cloudbuild.yaml` is advisory while existing warning debt is
  cleaned up; type-check, unit tests, API build, Docker build, deploy, and
  production smoke are still hard gates.
- Cloud SQL production ownership is mixed across historical migrations; the
  current deploy path uses owner/migration secrets only for migration jobs and
  app-role/runtime secrets for service traffic.

## Remaining Owner Action

Grant this operator Billing Account Budget Admin on billing account
`0125A2-B70311-300412`, or create a budget alert manually for the TTNDD project.
After this, update P3-006 from `PARTIAL` to `IMPLEMENTED` and then close P3-007.

## Handoff

Next agent should start from:

1. `docs/artifacts/p3-production-deploy-evidence.md`
2. `docs/artifacts/p3-production-smoke.json`
3. `docs/runbooks/p3-production-ops-runbook.md`
4. `docs/reviews/05_TTNDD_Operations_Remediation_KANBAN.md`
5. Root `KANBAN.md`
