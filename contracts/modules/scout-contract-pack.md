# Scout Core Module Contract Pack (Appendix B)
# Module 8 — Scout Core: Skillbook, Sessions, Events, Spiritual, Mentoring
# Ref: STORY-009 / WP-9.3 / T-0911→T-0915

## Module Identity

| Field | Value |
|---|---|
| **Module ID** | 8 |
| **Module Name** | Scout Core (Skills & Ranks) |
| **Owner Service** | `apps/api/src/modules/scout/` |
| **OpenAPI Tag** | `Scout` |
| **State Machines** | SM-004 (skill_progress), SM-005 (rank_progression) |
| **Domain Events** | 8 events (see below) |
| **DB Tables** | 6 tables (see below) |
| **Sub-modules** | 8A: Skillbook, 8B: Ranks, 8C: Evidence, 8D: Enrichment, 8E: Mentoring |

## Repo Boundary

```
apps/api/src/modules/scout/
├── index.ts                      # Module barrel export
├── scout.module.ts               # NestJS module definition
├── scout.controller.ts           # REST controller (6.6KB)
├── scout.service.ts              # Core business logic (13.3KB)
└── rank-progression.service.ts   # Rank progression logic (1.8KB)
```

**Related modules:**
- `apps/api/src/modules/enrichment/` — spiritual logs, evaluations, mentoring
- `apps/api/src/modules/rewards/` — EXP engine, badges
- `apps/api/src/modules/sessions/` — training sessions
- `apps/api/src/modules/events/` — camps & events

## API Surface

### Scout Endpoints (from module-readiness.yaml)

| Method | Route | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/skills` | List all skills (with tree structure) | MEMBER+ |
| GET | `/api/v1/skills/:skillId` | Skill detail | MEMBER+ |
| POST | `/api/v1/scout/evidence/:memberId` | Submit skill evidence | MEMBER (self) |
| PATCH | `/api/v1/scout/evidence/:evidenceId/review` | Review evidence | LEADER+ |
| POST | `/api/v1/scout/progress/:memberId/award` | Award EXP for skill | LEADER+ |
| GET | `/api/v1/scout/member-ranks/:memberId/check-eligibility` | Check rank eligibility | MEMBER+ |
| GET | `/api/v1/scout/dashboard/:memberId` | Member scout dashboard | MEMBER (self/guardian) |

### OpenAPI Tags
- `Scout` — primary tag for all skill/rank endpoints

## Database Schema

| Table | Model | Columns | RLS | PII | Owner |
|---|---|---|---|---|---|
| `rank_definitions` | RankDefinition | 10 | ✅ orgId | rankName, narrativeName | Scout |
| `skill_groups` | SkillGroup | 9 | ✅ orgId | name, narrativeName | Scout |
| `skills` | Skill | 14 | ✅ orgId | name, narrativeName | Scout |
| `member_skill_progress` | MemberSkillProgress | 5 | ✅ orgId | — | Scout |
| `member_ranks` | MemberRank | 10 | ✅ orgId | — | Scout |
| `skill_evidences` | SkillEvidence | 12 | ✅ orgId | — | Scout |

### Key Indexes
- `@@unique([orgId, branchId, rankCode])` on RankDefinition
- `@@unique([orgMemberId, branchId, rankId])` on MemberRank
- `@@unique([orgMemberId, skillId, level])` on SkillEvidence

### RLS Guards
- All tables require `orgId` filtering
- Evidence: write access = MEMBER (own) or LEADER (review)
- Rank progression: write access = LEADER (propose) → COUNCIL (approve) → ADMIN (award)

## State Machines

### SM-004: Skill Progress
```
NOT_STARTED → IN_PROGRESS → EVIDENCE_SUBMITTED → VERIFIED → AWARDED
                                    ↓ (reject)
                              IN_PROGRESS
```

### SM-005: Rank Progression
```
ELIGIBLE → PROPOSED → APPROVED → AWARDED
              ↓ (reject)
           ELIGIBLE
```

## Domain Events

| Event | Trigger | Consumers | EXP Impact |
|---|---|---|---|
| `scout.skill_started` | Member begins skill | notifications | — |
| `scout.evidence_submitted` | Evidence uploaded | notifications | — |
| `scout.skill_verified` | Assessor verifies | rewards, notifications | +EXP |
| `scout.skill_awarded` | Skill badge awarded | rewards, notifications | — |
| `scout.rank_eligible` | Requirements met | notifications | — |
| `scout.rank_proposed` | Leader proposes | notifications | — |
| `scout.rank_approved` | Council approves | notifications, rewards | — |
| `scout.rank_awarded` | Ceremony conferred | rewards, notifications | +EXP |

## Worker Subscriptions

| Queue | Subscribed Events |
|---|---|
| `rewards` | `scout.skill_verified`, `scout.rank_awarded` |
| `notifications` | `scout.*` |

## Seed/Demo Data Requirements

- `scout_program_minimal`: 3 skill groups, 9 skills (3 per group), 4 rank definitions
- `skills_minimal`: prefilled skill tree for "Ngành Ấu" branch
- Demo scenario: 1 member progresses through 3 skills → submits evidence → verified → rank eligible

## File Evidence Flow

```
Member → uploads file (FileStorage) → gets fileObjectRef.id
       → calls POST /scout/evidence/:memberId { fileId, skillId, level }
       → Leader reviews with evidence file link
       → PATCH /scout/evidence/:evidenceId/review { status: "approved" }
       → System awards EXP via rewards worker
```

## Dependencies

| Depends On | Direction | Why |
|---|---|---|
| HRM | → | Member identity (OrgMember) |
| FileStorage | → | Evidence file uploads |
| Rewards | ← | EXP/badge awards on skill/rank events |
| Notifications | ← | Activity alerts |
| Sessions | ↔ | Session participation earns EXP |

## Known Issues & Backlog

- [ ] `scout.yaml` OpenAPI spec not yet extracted as standalone file
- [ ] RLS at PostgreSQL level not implemented (app-level only)
- [ ] AI-agent playbook per flow not yet formalized
- [ ] Seed data coverage is minimal

## Cost Impact

- Storage: Low (evidence files via GCS, metadata in PostgreSQL)
- Compute: Medium (skill tree queries, rank eligibility checks)
- Network: Low (internal event processing)
