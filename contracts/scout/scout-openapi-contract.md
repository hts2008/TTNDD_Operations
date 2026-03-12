# T-0911: Scout Core OpenAPI Contract — Sub-Modules 8A–8E

> **Source:** `modules/scout/`, `modules/sessions/`, `modules/events/`, `modules/enrichment/`, `modules/spiritual/`
> **Generated:** 2026-03-12 | **STORY-009 / WP-9.3 / M9.3**

---

## API Surface Summary

| Sub-Module | Controller | Base Path | Endpoints | CRUD | Transitions | Queries |
|-----------|------------|-----------|-----------|------|-------------|---------|
| **8A** Scout Core | `ScoutController` | `/scout` | 26 | 8 | 2 | 16 |
| **8B** Sessions | `SessionsController` | `/sessions` | 10 | 3 | 1 | 6 |
| **8C** Events & Camps | `EventsCampController` | `/events` | 8 | 2 | 1 | 5 |
| **8D** Enrichment | `EnrichmentController` | Spiritual/Ngũ Giới | TBD | — | — | — |
| **8E** Evaluations | _Part of Scout/Enrichment_ | Various | TBD | — | — | — |
| **Total** | 3 controllers active | — | **44** | 13 | 4 | 27 |

---

## 8A: Scout Core — `/scout/*`

### Program Versions
| Method | Path | Auth | Summary | SM |
|--------|------|------|---------|-----|
| GET | `/scout/program-versions` | Bearer | List program versions | — |
| POST | `/scout/program-versions` | admin+ | Create program version | program-version SM |

### Domains (SPICES)
| Method | Path | Auth | Summary |
|--------|------|------|---------|
| GET | `/scout/domains?versionId` | Bearer | List domains |
| POST | `/scout/domains` | admin+ | Create domain |

### Skill Criteria
| Method | Path | Auth | Summary |
|--------|------|------|---------|
| GET | `/scout/skills/:skillId/criteria` | Bearer | List criteria for skill |
| POST | `/scout/skills/:skillId/criteria` | admin+ | Create skill criteria |

### Rank Definitions
| Method | Path | Auth | Summary |
|--------|------|------|---------|
| GET | `/scout/ranks?branchId` | Bearer | List rank definitions |
| POST | `/scout/ranks` | admin+ | Create rank definition |

### Skill Groups & Skills
| Method | Path | Auth | Summary |
|--------|------|------|---------|
| GET | `/scout/skill-groups?branchId` | Bearer | List skill groups (tree) |
| POST | `/scout/skill-groups` | admin+ | Create skill group |
| POST | `/scout/skills` | admin+ | Create skill |

### Skill Progress (SM: skill-progress)
| Method | Path | Auth | Summary | SM Transition |
|--------|------|------|---------|--------------|
| GET | `/scout/progress/:memberId` | Bearer | Get member progress | — |
| POST | `/scout/progress/:memberId/start` | Bearer | Start a skill | not_started→in_progress |
| POST | `/scout/progress/:memberId/verify` | admin+ | Verify skill level (legacy) | → verified |
| POST | `/scout/progress/:progressId/evidence` | Bearer | Submit evidence | → submitted |
| GET | `/scout/verify-queue` | admin+ | Pending verification queue | — |
| POST | `/scout/progress/:progressId/verify-decision` | admin+ | Approve/reject evidence | submitted→verified/rejected |

### Rank Progression (SM: rank-progression)
| Method | Path | Auth | Summary | SM Transition |
|--------|------|------|---------|--------------|
| GET | `/scout/member-ranks/:memberId` | Bearer | Get rank progression | — |
| POST | `/scout/member-ranks/:memberId/start` | Bearer | Start working on rank | →in_progress |
| POST | `/scout/member-ranks/:memberId/transition` | admin+ | Transition rank (SM-11) | Any legal transition |

### Habit Tracking (WP-3.3)
| Method | Path | Auth | Summary |
|--------|------|------|---------|
| GET | `/scout/habits` | Bearer | List active habits |
| POST | `/scout/habits` | admin+ | Create habit definition |
| POST | `/scout/habits/:habitDefId/log` | Bearer | Log habit check-in |
| GET | `/scout/habits/:personId/logs?habitDefId` | Bearer | Get habit logs |
| GET | `/scout/habits/:personId/streak/:habitDefId` | Bearer | Get current streak |

### Achievements (WP-3.3)
| Method | Path | Auth | Summary |
|--------|------|------|---------|
| GET | `/scout/achievements` | Bearer | List achievement defs |
| POST | `/scout/achievements` | admin+ | Create achievement |
| POST | `/scout/achievements/:achievementDefId/award` | admin+ | Award to member |
| GET | `/scout/achievements/:personId/awards` | Bearer | Get member awards |

### Activity & Service Log (WP-3.3)
| Method | Path | Auth | Summary |
|--------|------|------|---------|
| POST | `/scout/activities` | Bearer | Log activity |
| GET | `/scout/activities/:personId` | Bearer | Get activity logs |
| GET | `/scout/activities/:personId/service-hours` | Bearer | Get service hours |

### Dashboards (WP-3.3)
| Method | Path | Auth | Summary |
|--------|------|------|---------|
| GET | `/scout/dashboard/:memberId` | Bearer | Personal progress |
| GET | `/scout/leader-dashboard` | admin+ | Leader aggregate |

---

## 8B: Sessions & Attendance — `/sessions/*`

| Method | Path | Auth | Summary | SM |
|--------|------|------|---------|-----|
| POST | `/sessions` | admin+ | Create session | — |
| GET | `/sessions?branchId&status&from&to&page&limit` | Bearer | List (paginated) | — |
| GET | `/sessions/:id` | Bearer | Detail + attendance | — |
| PATCH | `/sessions/:id` | admin+ | Update (debrief, energy) | — |
| POST | `/sessions/:id/transition` | admin+ | SM-12 transition | session-lifecycle |
| POST | `/sessions/:id/attendance` | admin+ | Bulk attendance (idempotent) | — |
| GET | `/sessions/attendance/report/:memberId` | Bearer | Attendance report | — |
| POST | `/sessions/annual-programs` | admin+ | Create annual program | — |
| GET | `/sessions/annual-programs?branchId&year` | Bearer | List annual programs | — |
| PATCH | `/sessions/annual-programs/:id` | admin+ | Update annual program | — |
| POST | `/sessions/annual-programs/:id/approve` | admin+ | Approve program | AnnualProgram SM |

---

## 8C: Events & Camps — `/events/*`

| Method | Path | Auth | Summary | SM |
|--------|------|------|---------|-----|
| POST | `/events` | admin+ | Create event/camp | — |
| GET | `/events?status&from&to&page&limit` | Bearer | List (paginated) | — |
| GET | `/events/:id` | Bearer | Detail + registrations | — |
| PATCH | `/events/:id` | admin+ | Update (RACI, safety) | — |
| POST | `/events/:id/transition` | admin+ | SM-13 transition (safety gates) | event-lifecycle |
| POST | `/events/:id/register` | Bearer | Self-register | — |
| POST | `/events/:id/consent` | Bearer | Parent consent sign | — |
| POST | `/events/:id/check-in/:memberId` | admin+ | Check in participant | — |

---

## Missing Endpoints (Spec vs Reality)

> Endpoints required by `TTNDD_OPS_V3.md` but NOT yet implemented:

| Sub-Module | Missing Endpoint | Priority |
|-----------|-----------------|----------|
| 8A | `DELETE /scout/skills/:id` | P2 |
| 8A | `PATCH /scout/skills/:id` | P1 |
| 8A | `DELETE /scout/skill-groups/:id` | P2 |
| 8A | `PATCH /scout/ranks/:id` | P1 |
| 8A | `DELETE /scout/ranks/:id` | P2 |
| 8B | `DELETE /sessions/:id` (soft) | P2 |
| 8C | `DELETE /events/:id` (soft) | P2 |
| 8C | `POST /events/:id/cancel` | P1 |
| All | `GET */export` (CSV/Excel) | P3 |
| All | `POST */import` (bulk) | P3 |
