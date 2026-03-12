# Pilot Org Bootstrap Runbook — TTNDD_Ops

## Overview

Deploy to **1 pilot org** (a single DTNDD chapter), run 2–4 weeks hypercare, then scale.

## Pilot Org Selection Criteria

| Criterion | Requirement | Why |
|-----------|-------------|-----|
| Size | 20–50 members | Large enough to stress-test, small enough to manage |
| Digital maturity | Has consistent internet + smartphone usage | Minimize infrastructure friction |
| Engaged leadership | Trưởng actively uses digital tools | Champion adoption |
| Diverse age groups | Oanh Vũ + Thiếu + Thanh | Test age-appropriate features |
| Geographic | Within support radius | Enable in-person training |

## Bootstrap Checklist

### Pre-Deployment (1 week before)

- [ ] Select pilot org and confirm Trưởng participation
- [ ] Brief Trưởng on timeline and expectations
- [ ] Prepare org-specific seed data (member list, structure)
- [ ] Configure feature flags for pilot org
- [ ] Verify all E2E tests pass on staging (`pnpm test:e2e`)
- [ ] Confirm budget alerts are active (`GET /admin/cost/status`)

### Deployment Day

- [ ] Run `pnpm db:reset-seed` on staging (or use pilot-specific seed)
- [ ] Create pilot org in system
- [ ] Import member data via CSV import
- [ ] Configure org structure (Đoàn → Ngành → Đội)
- [ ] Set up admin accounts for Trưởng
- [ ] Run smoke test: create session, take attendance, verify scout skill
- [ ] Confirm health probes green: `GET /health/probes`

### Post-Deployment (Day 1–3)

- [ ] Monitor error rate via logs
- [ ] Check budget status: `GET /admin/cost/summary`
- [ ] Collect initial feedback from Trưởng
- [ ] Address any blocking issues immediately

## Feature Flag Configuration

```bash
# Enable core modules for pilot org
curl -X POST https://api.ttndd.org/admin/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "orgId": "PILOT_ORG_ID",
    "flags": {
      "module.hrm": true,
      "module.scout": true,
      "module.lms": true,
      "module.finance": true,
      "module.notifications": true,
      "module.reporting": true,
      "module.parent_portal": false,
      "module.warehouse_sync": false
    }
  }'
```

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Active users | > 50% of members log in within 2 weeks | Login analytics |
| Session creation | At least 4 sessions created | Module usage |
| Attendance tracking | > 80% attendance recorded digitally | Attendance records |
| Skill submissions | At least 10 skill evidence submissions | Scout module |
| Error rate | < 1% of API requests | Error logs |
| Uptime | > 99.5% | Health probes |

## Failure Criteria (Abort Pilot)

- Error rate > 5% sustained for 24 hours
- Data corruption detected
- Budget overrun > 120%
- Trưởng feedback indicates fundamental usability issues
