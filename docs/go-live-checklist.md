# TTNDD_OPS — Go-Live Checklist

## GL-01: Infrastructure
- [ ] Cloud Run API deployed and healthy
- [ ] Cloud SQL PostgreSQL 16 provisioned (db-f1-micro)
- [ ] Redis Cloud Free 30MB connected
- [ ] DNS configured (custom domain)
- [ ] SSL/TLS certificate active (managed by GCP)
- [ ] Firebase Auth / Identity Platform configured

## GL-02: Security
- [ ] Security headers middleware active (HSTS, CSP, X-Frame-Options)
- [ ] Rate limiting active (100 req/min per IP)
- [ ] CORS configured for production domain
- [ ] Cloud Armor WAF rules active
- [ ] Secrets in Secret Manager (not env vars)
- [ ] OWASP baseline scan passed

## GL-03: Data
- [ ] Production database migrated (all migrations applied)
- [ ] Seed data loaded (default org config, admin user)
- [ ] Backup policy active (daily automated)
- [ ] Backup restore drill completed successfully

## GL-04: Monitoring
- [ ] Cloud Monitoring dashboards created
- [ ] Error rate alerts configured (<1%)
- [ ] Latency alerts configured (p95 < 500ms)
- [ ] Budget alerts active (≤800k VND/month)
- [ ] Cloud Logging configured with retention
- [ ] Uptime checks active

## GL-05: Performance
- [ ] k6 load test passed (100 concurrent users, p95 < 500ms)
- [ ] Lighthouse score ≥ 85
- [ ] Database indexes optimized
- [ ] Query performance validated (no N+1)

## GL-06: Compliance
- [ ] Child Safety P0 verified (2-adult rule, incident reporting, consent)
- [ ] RLS isolation verified (all tables have org_id filter)
- [ ] DPIA checklist completed
- [ ] Data retention policies active
- [ ] Privacy-by-default verified (spiritual logs, ngu gioi)

## GL-07: Operations
- [ ] Rollback plan documented and tested
- [ ] Monitoring runbooks written
- [ ] Incident response procedure defined
- [ ] Training materials ready (Trưởng, Đoàn sinh, Phụ huynh)
- [ ] Pilot org selected and data imported
- [ ] Feedback collection mechanism active

## Rollback Plan
1. Revert Cloud Run to previous revision: `gcloud run services update-traffic ttndd-api --to-revisions=PREVIOUS_REVISION=100`
2. Database: restore from latest backup if schema changes are incompatible
3. DNS: no change needed (Cloud Run handles routing)
