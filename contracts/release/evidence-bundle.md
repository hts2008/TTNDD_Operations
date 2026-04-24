# TTNDD_OPS Release Evidence Bundle
# Deployment-ready evidence for CTO review and sign-off
# Ref: STORY-009 / WP-9.7 / T-0931→T-0935

## Release Profile

| Field | Value |
|---|---|
| **Platform** | TTNDD_OPS |
| **Spec Version** | V10 FINAL |
| **Evidence Date** | 2026-04-11 |
| **Cloud Run Service** | ttndd-platform |
| **Region** | asia-southeast1 |
| **Active Revision** | v51 |
| **Build Status** | ✅ 0 TypeScript errors |

## 1. Module Readiness Summary (T-0931)

| Module | Active | Routes | DB Tables | Events | State Machines | E2E | Readiness |
|---|---|---|---|---|---|---|---|
| HRM | ✅ | 2 | 5 | 7 | SM-001 | ⏳ | IMPLEMENTED |
| Scout | ✅ | 7 | 6 | 8 | SM-004, SM-005 | ⏳ | IMPLEMENTED |
| Sessions | ✅ | 1 | 3 | 5 | SM-002 | ⏳ | IMPLEMENTED |
| Events | ✅ | 1 | 2 | 6 | SM-003 | ⏳ | IMPLEMENTED |
| Rewards | ✅ | 1 | 10 | 5 | SM-007 | ⏳ | IMPLEMENTED |
| LMS | ✅ | 19 | 12 | 7 | SM-006, SM-008 | ⏳ | IMPLEMENTED |
| Finance | ✅ | 1 | 3 | 4 | — | ⏳ | IMPLEMENTED |
| Assets | ✅ | 17 | 8 | 3 | — | ⏳ | IMPLEMENTED |
| Projects | ✅ | 1 | 3 | 4 | — | ⏳ | IMPLEMENTED |
| Tickets | ✅ | 1 | 3 | 4 | SM-009 | ⏳ | IMPLEMENTED |
| Process | ✅ | 10 | 7 | 3 | — | ⏳ | IMPLEMENTED |
| Notifications | ✅ | 1 | 4 | 3 | — | ⏳ | IMPLEMENTED |
| FileStorage | ✅ | 1 | 1 | 0 | — | ⏳ | IMPLEMENTED |
| DataImport | ✅ | 1 | 1 | 0 | — | ⏳ | IMPLEMENTED |
| Enrichment | ✅ | 0 | 5 | 4 | — | — | IMPLEMENTED |

**Totals**: 15 modules active, 80 DB models, 63 domain events, 9 state machines

## 2. API Surface Evidence (T-0932)

### Production Endpoints Verified
| Endpoint | Status | Verified |
|---|---|---|
| `GET /api/v1/system/health` | ✅ 200 | 2026-04-07 |
| `GET /api/v1/system/canary` | ⚠️ (unhealthy - Redis pending) | 2026-04-07 |
| `GET /api/v1/system/probes` | ✅ 200 | 2026-04-07 |
| `GET /api/docs` | ✅ Swagger UI live | 2026-04-07 |

### API Diff Since Last Release
- Applied `@Public()` to system health endpoints
- No breaking changes to existing routes
- Global prefix `api/v1` confirmed active

### Migration Evidence
| Migration | Applied | Verified |
|---|---|---|
| `20260305110811_init_foundation_tables` | ✅ | Prisma migrate dev |
| `20260305112708_add_hrm_audit_models` | ✅ | Prisma migrate dev |
| `20260305113109_add_reward_engine_models` | ✅ | Prisma migrate dev |
| `20260305113435_add_scout_session_event_models` | ✅ | Prisma migrate dev |
| `20260305114907_add_phase2_all_models` | ✅ | Prisma migrate dev |
| `20260305121858_add_notifications_models` | ✅ | Prisma migrate dev |
| `20260305164804_sprint_a_spices_file_system_import` | ✅ | Prisma migrate dev |

## 3. Build & Type-Check Evidence (T-0932)

```
Build: npx tsc --noEmit → 0 errors ✅
Docker: docker build → SUCCESS (v51) ✅
Cloud Run: gcloud run deploy → OK ✅
```

## 4. Known Issues Registry

| ID | Severity | Module | Description | Workaround |
|---|---|---|---|---|
| KI-001 | P2 | System | Canary reports unhealthy (Redis not configured) | Redis deferred to Phase 3 |
| KI-002 | P3 | All | RLS at PostgreSQL level not implemented | App-level orgId filtering active |
| KI-003 | P2 | CI/CD | GitHub repo connection needs re-auth in GCP | Manual deployment used |
| KI-004 | P3 | Frontend | Next.js frontend not yet deployed to Cloud Run | Backend-only deployment |
| KI-005 | P3 | Rewards | Leaderboard snapshot worker not automated | Manual trigger available |
| KI-006 | P3 | LMS | Offline pack generation is placeholder | API returns mock response |

## 5. Canary/Rollback Evidence Format (T-0934)

### Canary Deployment Strategy
```yaml
strategy: incremental_traffic
phases:
  - name: canary
    traffic_pct: 10
    duration: 15_minutes
    health_check: GET /api/v1/system/health
    rollback_trigger:
      - error_rate > 5%
      - p99_latency > 2000ms
      - health_check != 200
  - name: expansion
    traffic_pct: 50
    duration: 30_minutes
    rollback_trigger:
      - error_rate > 2%
      - p99_latency > 1500ms
  - name: full
    traffic_pct: 100
    monitoring_period: 60_minutes
```

### Rollback Procedure
1. `gcloud run services update-traffic ttndd-platform --to-revisions=PREVIOUS_REVISION=100`
2. Verify health: `curl https://ttndd-platform-xxx.run.app/api/v1/system/health`
3. Investigate: check Cloud Run logs for error spike
4. If DB migration involved: `npx prisma migrate resolve --rolled-back MIGRATION_NAME`

## 6. CTO Review Dashboard (T-0933)

### Quick Links
| Resource | Location |
|---|---|
| **KANBAN Board** | `KANBAN.md` → STORY-009 (lines 432-471) |
| **Module Readiness** | `contracts/release/module-readiness.yaml` |
| **Module Capabilities** | `contracts/release/module-capabilities.yaml` |
| **Event Catalog** | `contracts/events/catalog.json` (61 events, 14 modules) |
| **State Machine Registry** | `contracts/state-machines/registry.yaml` (9 SMs) |
| **DB Schema Appendix A** | `contracts/db/appendix-a.yaml` (80 models, 898 fields) |
| **Module Contract Packs** | `contracts/modules/module-contract-packs.yaml` (15 modules) |
| **Checklist Matrix** | `contracts/release/checklist-matrix.yaml` |
| **AI-Agent Handoff** | `contracts/modules/ai-agent-handoff.md` |
| **Scout Contract Pack** | `contracts/modules/scout-contract-pack.md` |
| **Swagger Docs (Live)** | `https://ttndd-platform-xxx.run.app/api/docs` |
| **Health Check (Live)** | `https://ttndd-platform-xxx.run.app/api/v1/system/health` |

### Budget Profile
| Resource | Monthly Estimate |
|---|---|
| Cloud Run (1 instance, 256MB) | ~$5-10 |
| Cloud SQL (db-f1-micro) | ~$7-10 |
| Cloud Storage (GCS) | ~$1-2 |
| **Total** | **~$15-25/month** |

## 7. Final Handoff Pack (T-0935)

### Sign-off Trail
| Role | Status | Date |
|---|---|---|
| PM/BA | ✅ Plan approved | 2026-04-11 |
| System Architect | ✅ Contract packs created | 2026-04-11 |
| Backend Engineer | ✅ Code audited, 0 TS errors | 2026-04-07 |
| QA/Release | ✅ Evidence bundle assembled | 2026-04-11 |
| SRE/Security | ⏳ RLS audit pending | — |
| CTO | ⏳ Final review pending | — |

### Ownership Transfer
- All contract artifacts are in `platform/contracts/`
- All manifests are version-controlled in git
- Generator scripts are in `platform/scripts/`
- No external dependencies for contract maintenance
