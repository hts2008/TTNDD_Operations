# T-0936→T-0940: Canonical Traceability & Closure

> **Purpose:** Full traceability from roadmap rows → PRD/UI/API/DB/Event/Test + audit + publish
> **Generated:** 2026-03-12 | **STORY-009 / WP-9.8 / M9.8**

---

## Traceability Matrix (T-0936)

### Row-Level Traceability: Roadmap → Implementation

| KANBAN Story | V3 Spec § | Module | API Tags | DB Tables | SM | Events | E2E | UI Route |
|-------------|-----------|--------|----------|-----------|-----|--------|-----|----------|
| STORY-001 | §2 IAM | Core | Auth | users, organizations | — | org.* | auth/login.spec | /login |
| STORY-001 | §2 RLS | Core | — | ALL (policy) | — | — | rls/isolation.spec | — |
| STORY-002 | §3 HRM | HRM | HRM, Org | 9 tables | member-lifecycle | hrm.* (7) | hrm/onboard.spec | /members |
| STORY-003 | §8A Scout | Scout | Scout | 15 tables | skill-progress, rank-progression, program-version | scout.* (8) | scout/skill.spec | /skills |
| STORY-003 | §8B Sessions | Sessions | Sessions | 3 tables | session-lifecycle | session.* (5) | sessions/attend.spec | /sessions |
| STORY-003 | §8C Events | Events | Events | 2 tables | event-lifecycle | event.* (6) | events/register.spec | /events |
| STORY-003 | §8D Enrichment | Enrichment | Enrichment | 4 tables | — | enrichment.* (4) | — | TBD |
| STORY-004 | §9 Rewards | Rewards | Rewards | 8 tables | reward-redemption | rewards.* (5) | rewards/badge.spec | /rewards |
| STORY-005 | §7 LMS | LMS | LMS | 8 tables | course-progress, quiz-battle | lms.* (5) | lms/enroll.spec | /lms |
| STORY-006 | §4 Finance | Finance | Finance | 4 tables | — | finance.* (4) | finance/fee.spec | /finance |
| STORY-006 | §5 Assets | Assets | Assets | 6 tables | — | asset.* (3) | assets/loan.spec | /assets |
| STORY-007 | §Import | DataImport | DataImport | 1 table | — | — | import/csv.spec | /settings |
| STORY-008 | §14 Notif | Notifications | Notifications | 4 tables | — | notification.* (3) | notif/receive.spec | — |
| STORY-009 | Contracts | — | — | — | — | — | — | — |

---

## Module Coverage Diff Check (T-0937)

### What SPEC says vs What CODE has

| Module | Spec Endpoints | Code Endpoints | Gap | Spec Tables | Code Tables | Gap |
|--------|---------------|----------------|-----|-------------|-------------|-----|
| HRM | ~15 | 12+ | ~3 missing | 9 | 9 | ✅ match |
| Scout 8A | ~20 | 26 | ✅ over | 15 | 15 | ✅ match |
| Sessions 8B | ~8 | 10 | ✅ over | 3 | 3 | ✅ match |
| Events 8C | ~6 | 8 | ✅ over | 2 | 2 | ✅ match |
| Enrichment 8D | ~10 | 0 | 🔴 10 missing | 4 | 4 | ✅ tables exist |
| Rewards | ~10 | 8+ | ~2 missing | 8 | 8 | ✅ match |
| LMS | ~12 | 10+ | ~2 missing | 8 | 8 | ✅ match |
| Finance | ~8 | 6+ | ~2 missing | 4 | 4 | ✅ match |
| Assets | ~6 | 5+ | ~1 missing | 6 | 6 | ✅ match |
| Process | ~6 | 4+ | ~2 missing | 4 | 4 | ✅ match |

> **Key Finding:** DB schema is ahead of API — all 60 models exist, but not all controllers are wired.

---

## Dead-Link / Heading Audit (T-0938)

### Contract Files Audit

| File | Links | Dead Links | Status |
|------|-------|-----------|--------|
| `state-machines/*.ts` (15) | Internal imports | 0 | ✅ Clean |
| `schemas/*.md` (5) | Cross-refs to Prisma | 0 | ✅ Clean |
| `scout/*.md` (5) | Cross-refs to SMs, schemas | 0 | ✅ Clean |
| `agent-pack/*.md` (5) | Cross-refs to all above | 0 | ✅ Clean |
| `release/*.yaml` (2) | Paths to e2e specs | ⚠️ 11 specs don't exist yet | Known gap |
| `release/checklist-sync.md` | Spec references | 0 | ✅ Clean |
| `modules/module-contract-packs.md` | Module paths | 0 | ✅ Clean |
| `events/catalog.json` | Event references | 0 | ✅ Clean |

### Heading Consistency Check
- All contract files use `# Title` → `## Section` → `### Subsection`
- All tables use pipe-delimited markdown format
- All Mermaid diagrams validated (no syntax errors)

---

## Numbering / Section Audit (T-0939)

### Contract Directory Structure (Final)

```
contracts/                          # 35+ files
├── agent-pack/                     # WP-9.4 (5 files)
│   ├── openapi-dto-pack.md
│   ├── migration-rollback-pack.md
│   ├── seed-demo-pack.md
│   ├── repo-paths-pack.md
│   └── runbook.md
├── events/                         # Event catalog
│   └── catalog.json
├── modules/                        # WP-9.5 (1 consolidated file)
│   └── module-contract-packs.md
├── openapi/                        # OpenAPI artifacts
│   ├── api-types.d.ts
│   ├── codegen.js
│   ├── generate.js
│   ├── generate.ts
│   └── ttndd-ops-api.json
├── release/                        # WP-9.6 + WP-9.7
│   ├── module-capabilities.yaml
│   ├── module-readiness.yaml
│   ├── checklist-sync.md
│   └── readiness-cto-pack.md
├── schemas/                        # WP-9.2 (5 files)
│   ├── canonical-tables.md
│   ├── constraint-matrix.md
│   ├── coverage-matrix.md
│   ├── migration-mapping.md
│   └── migration-smoke-test.md
├── scout/                          # WP-9.3 (5 files)
│   ├── scout-ai-playbook.md
│   ├── scout-openapi-contract.md
│   ├── scout-rls-rules.md
│   ├── scout-sql-baseline.md
│   └── scout-story-sm-mapping.md
├── state-machines/                 # WP-9.1 (15 files)
│   ├── __tests__/transition-harness.spec.ts
│   ├── audit-event-rules.ts
│   ├── course-progress.ts
│   ├── docs/transition-tables.md
│   ├── enum-mapping.ts
│   ├── event-lifecycle.ts
│   ├── index.ts
│   ├── member-lifecycle.ts
│   ├── program-version.ts
│   ├── quiz-battle.ts
│   ├── rank-progression.ts
│   ├── reward-redemption.ts
│   ├── session-lifecycle.ts
│   ├── skill-progress.ts
│   ├── tsconfig.json
│   └── types.ts
├── db/                             # DB docs
│   └── README.md
└── traceability/                   # WP-9.8
    └── traceability-closure.md     (THIS FILE)
```

---

## Canonical V7 Pack — Publication Summary (T-0940)

### STORY-009 Delivery Summary

| Sprint | WP | Deliverables | Files |
|--------|-----|-------------|-------|
| 6 | WP-9.1 | State Machine Registry | 15 |
| 7 | WP-9.2 | Schema Coverage | 5 |
| 8 | WP-9.3 | Scout Contract Pack | 5 |
| 9 | WP-9.4 | AI Agent Pack | 5 |
| 10 | WP-9.5 | Module Contract Packs | 1 |
| 11 | WP-9.6 | Checklist Sync | 1 |
| 12 | WP-9.7 | Readiness & CTO Pack | 1 |
| 13 | WP-9.8 | Traceability & Closure | 1 |
| **Total** | **8 WPs** | **8 categories** | **34 new files** |

### What This Enables

1. **AI agents** can now generate correct code without guessing — DTOs, migrations, events, file paths
2. **CTO** can review module readiness at a glance with quantified metrics
3. **QA** knows exactly which E2E specs exist vs required
4. **DevOps** has migration rollback procedures and canary protocol
5. **New developers** (human or AI) have a complete onboarding pack

### Remaining Work (Post STORY-009)

| Item | Priority | Next Story |
|------|----------|------------|
| Implement RLS at PostgreSQL level | P0 | STORY-001 |
| Wire Enrichment 8D controllers | P1 | STORY-003 |
| Create full E2E Playwright suite | P1 | STORY-010 |
| Implement seed scripts | P1 | STORY-010 |
| Extract inline DTOs to classes | P2 | STORY-011 |
| Build worker app for async events | P2 | STORY-012 |
