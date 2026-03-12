# Go-Live Checklist — TTNDD_Ops

## Overview

6 gate categories. All gates must be **GREEN** before production go-live.

## Gate Status

| # | Gate | WP | Status | Evidence |
|---|------|----|--------|----------|
| 1 | 🔐 Security | WP-8.1 | ✅ | Rate limiter, headers, secret rotation, file validation, encryption |
| 2 | ⚡ Performance | WP-8.2 | ✅ | k6 load test, pagination DTOs, timeouts, caching, synthetic probes |
| 3 | 💰 Budget | WP-8.3 | ✅ | Budget alerts (4 tiers), degradation policy, kill-switch, cost dashboard |
| 4 | 🗄️ Data | WP-8.4 | ✅ | Seed data (14 models), CSV import, demo journeys, reset-seed script |
| 5 | 🧪 E2E Tests | WP-8.5 | ✅ | 26 Playwright specs, readiness check, canary health, signed manifest |
| 6 | 🎓 Training | WP-8.6 | ✅ | Admin SOP, Trưởng guide, FAQ |

## Pre-Go-Live Checks

### Security ✅
- [ ] Rate limiter configured (100 req/15min)
- [ ] Security headers enabled (Helmet)
- [ ] Secrets rotated within last 90 days
- [ ] File upload validation active (type + size)
- [ ] Sensitive data encryption verified

### Performance ✅
- [ ] k6 load test: p95 < 500ms under 100 VU
- [ ] Pagination DTOs used on all list endpoints
- [ ] Request timeout (30s) enabled globally
- [ ] Synthetic probes running (every 5 min)
- [ ] PITR enabled on Cloud SQL

### Budget ✅
- [ ] Budget alerts active (50/80/100/120%)
- [ ] Pub/Sub → webhook pipeline tested
- [ ] Feature degradation policy documented
- [ ] Cloud Run limits set (max 3 instances, 80 concurrency)
- [ ] Monthly budget cap: 800K VND

### Data ✅
- [ ] Seed data creates valid org with all module data
- [ ] CSV import tested with real-format data
- [ ] `db:reset-seed` script works idempotently
- [ ] Backup verified within last 7 days

### E2E Tests ✅
- [ ] All 26 Playwright specs pass on staging
- [ ] Module readiness check passes (`pnpm check:readiness`)
- [ ] Canary health endpoint returns healthy
- [ ] Release manifest signed with build SHA

### Training ✅
- [ ] Admin quick-start guide reviewed by stakeholder
- [ ] Trưởng guide reviewed by pilot Trưởng
- [ ] FAQ covers top 10 expected questions
- [ ] Support channel established

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| PM / BA | | | |
| System Architect | | | |
| QA / Release Engineer | | | |
| Pilot Trưởng | | | |

## Post-Sign-Off Actions

1. Deploy to production
2. Run smoke test on production
3. Confirm health probes green
4. Begin hypercare period (2–4 weeks)
5. Monitor cost dashboard daily
