# T-0915: Story S8-x → WP-3.x → State Machine Mapping

> **Purpose:** Traceability from KANBAN stories to code-level state machines and work packages
> **Generated:** 2026-03-12 | **STORY-009 / WP-9.3 / M9.3**

---

## Story-to-SM Traceability Matrix

| KANBAN Story | Work Package | State Machine | Controller | Endpoint(s) |
|-------------|-------------|--------------|------------|-------------|
| S8-ProgramSetup | WP-3.1 | `program-version` | ScoutController | `POST /scout/program-versions` |
| S8-SkillTree | WP-3.1 | — (CRUD only) | ScoutController | Domains, SkillGroups, Skills, Criteria |
| S8-SkillProgress | WP-3.2 | `skill-progress` | ScoutController | `/progress/:memberId/*` |
| S8-Evidence | WP-3.2 | `skill-progress` | ScoutController | `/progress/:progressId/evidence`, `/verify-decision` |
| S8-RankSetup | WP-3.1 | — (CRUD only) | ScoutController | `POST /scout/ranks` |
| S8-RankProgress | WP-3.2 | `rank-progression` | ScoutController | `/member-ranks/:memberId/*` |
| S8-SessionPlan | WP-3.4 | `session-lifecycle` | SessionsController | `POST /sessions`, `PATCH /sessions/:id` |
| S8-SessionRun | WP-3.4 | `session-lifecycle` | SessionsController | `/sessions/:id/transition` |
| S8-Attendance | WP-3.4 | — (bulk write) | SessionsController | `/sessions/:id/attendance` |
| S8-AnnualProgram | WP-3.4 | — (no SM yet) | SessionsController | `/sessions/annual-programs/*` |
| S8-EventPlan | WP-3.5 | `event-lifecycle` | EventsCampController | `POST /events` |
| S8-EventRun | WP-3.5 | `event-lifecycle` | EventsCampController | `/events/:id/transition` |
| S8-EventRegister | WP-3.5 | — (write only) | EventsCampController | `/events/:id/register` |
| S8-Consent | WP-3.5 | — (write only) | EventsCampController | `/events/:id/consent` |
| S8-HabitTrack | WP-3.3 | — (no SM) | ScoutController | `/scout/habits/*` |
| S8-Achievements | WP-3.3 | — (no SM) | ScoutController | `/scout/achievements/*` |
| S8-ActivityLog | WP-3.3 | — (no SM) | ScoutController | `/scout/activities/*` |
| S8-PersonalDash | WP-3.3 | — (read-only) | ScoutController | `/scout/dashboard/:memberId` |
| S8-LeaderDash | WP-3.3 | — (read-only) | ScoutController | `/scout/leader-dashboard` |
| S8-Spiritual | WP-3.6 | — (no SM) | EnrichmentController | TBD |
| S8-NguGioi | WP-3.6 | — (no SM) | EnrichmentController | TBD |
| S8-Evaluation | WP-3.6 | — (status, no SM) | EnrichmentController | TBD |
| S8-Mentoring | WP-3.6 | — (status, no SM) | EnrichmentController | TBD |

---

## State Machine → Event → Reward Chain

| State Machine | Trigger Event | Reward Engine Action |
|--------------|---------------|---------------------|
| skill-progress → `verified` | `skill.verified` | Award EXP per skill level |
| rank-progression → `awarded` | `rank.awarded` | Award badge + EXP bonus |
| session-lifecycle → `completed` | `session.completed` | Award attendance EXP |
| event-lifecycle → `completed` | `event.completed` | Award event participation EXP |
| program-version → `active` | `program.activated` | — (admin event only) |

---

## Work Package Coverage Summary

| Work Package | Stories | With SM | Without SM | Implementation % |
|-------------|---------|---------|-----------|-----------------|
| WP-3.1 Program & Skill Tree Setup | 3 | 1 (program-version) | 2 | 100% CRUD |
| WP-3.2 Skill & Rank Progress | 3 | 2 (skill-progress, rank-progression) | 1 | 95% (missing PATCH) |
| WP-3.3 Habits, Achievements, Dashboards | 4 | 0 | 4 | 90% |
| WP-3.4 Sessions & Annual Program | 3 | 1 (session-lifecycle) | 2 | 95% |
| WP-3.5 Events & Camps | 4 | 1 (event-lifecycle) | 3 | 85% (missing cancel) |
| WP-3.6 Enrichment (Spiritual, Mentoring) | 4 | 0 | 4 | 50% (controller TBD) |

---

## Gaps & Recommendations

| Gap | Impact | Priority | Recommended Story |
|-----|--------|----------|-------------------|
| No SM for `AnnualProgram.status` | draft→planned→active→archive flows unguarded | P2 | S8-AnnualProgram |
| No SM for `Evaluation.status` | Evaluation workflow unguarded | P2 | S8-Evaluation |
| No SM for `MentoringRelationship.status` | Mentor assignment unguarded | P3 | S8-Mentoring |
| Missing `PATCH /scout/skills/:id` | Can't edit skills after creation | P1 | S8-SkillTree |
| Missing `POST /events/:id/cancel` | No explicit cancel endpoint (uses transition) | P2 | S8-EventRun |
| Enrichment controllers not wired | 8D flows exist in schema but no API | P1 | S8-Spiritual |
| No `export` endpoints | Reports require manual DB queries | P3 | S8-reporting |
