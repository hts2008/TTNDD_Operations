# TTNDD_OPS — Go-Live Checklist

## GL-01: Infrastructure

- [x] Cloud Run API deployed and healthy (`ttndd-api-00030-5h9`)
- [x] Cloud Run Web deployed and healthy (`ttndd-platform-00057-6ws`)
- [x] Cloud SQL PostgreSQL 16 provisioned (`ttndd-db`)
- [ ] Redis Cloud Free 30MB connected
- [ ] DNS configured (custom domain)
- [ ] SSL/TLS certificate active (managed by GCP)
- [ ] Firebase Auth / Identity Platform configured

## GL-02: Security

- [ ] Security headers middleware active (HSTS, CSP, X-Frame-Options)
- [ ] Rate limiting active (100 req/min per IP)
- [ ] CORS configured for production domain
- [ ] Cloud Armor WAF rules active
- [x] Secrets in Secret Manager for runtime `DATABASE_URL` and `JWT_SECRET`
- [ ] OWASP baseline scan passed

## GL-03: Data

- [x] Production database migrated (19 migrations, schema up to date)
- [ ] Seed data loaded (default org config, admin user)
- [x] Backup policy active (daily automated, retained backups=7)
- [ ] Backup restore drill completed successfully

## GL-04: Monitoring

- [ ] Cloud Monitoring dashboards created
- [ ] Error rate alerts configured (<1%)
- [ ] Latency alerts configured (p95 < 500ms)
- [ ] Budget alerts active (≤800k VND/month)
- [ ] Cloud Logging configured with retention
- [x] Uptime checks active for API `/api/v1/system/health` and Web `/`

## GL-05: Performance

- [ ] k6 load test passed (100 concurrent users, p95 < 500ms)
- [ ] Lighthouse score ≥ 85
- [ ] Database indexes optimized
- [ ] Query performance validated (no N+1)

## GL-06: Compliance

- [x] Child Safety P0 verified in code/test evidence (2-adult rule, incident reporting, retention)
- [x] RLS isolation verified in local DB app-role evidence (phase 1 + full tenant-scoped table suite)
- [x] DPIA checklist completed with evidence links
- [x] Data retention policies implemented in code/test evidence
- [x] Privacy-by-default verified in code/test evidence (parent portal, privacy export, spiritual logs, child safety)

> Production deployment evidence for GL-06 is now linked through P3-005/P3-006 artifacts. Budget alert remains blocked by billing-account permissions.

## GL-07: Operations

- [x] Rollback plan documented with Cloud Run revision candidates
- [x] Monitoring runbooks written
- [ ] Incident response procedure defined
- [ ] Training materials ready (Trưởng, Đoàn sinh, Phụ huynh)
- [ ] Pilot org selected and data imported
- [ ] Feedback collection mechanism active

## P3 Production Evidence

- Production smoke artifact: `docs/artifacts/p3-production-smoke.json`
- Deploy evidence artifact: `docs/artifacts/p3-production-deploy-evidence.md`
- Release package: `docs/reviews/07_TTNDD_Operations_P3_Release_Package.md`
- Open blocker: budget alert creation returned Billing Budgets API `403 Forbidden` for billing account `0125A2-B70311-300412`; requires Billing Account Budget Admin or manual owner setup.

## Rollback Plan

1. Revert Cloud Run to previous revision: `gcloud run services update-traffic ttndd-api --to-revisions=PREVIOUS_REVISION=100`
2. Database: restore from latest backup if schema changes are incompatible
3. DNS: no change needed (Cloud Run handles routing)
