# T-0919: Repo Paths & Service Boundaries — AI Agent Pack

> **Purpose:** AI agents know exactly where to find and create files for each module
> **Generated:** 2026-03-12 | **STORY-009 / WP-9.4 / M9.4**

---

## Repository Structure

```
platform/                          # Git root
├── apps/
│   ├── api/                       # NestJS backend (main)
│   │   ├── src/
│   │   │   ├── app.module.ts      # Root module (imports all modules)
│   │   │   ├── main.ts            # Entry point
│   │   │   ├── core/              # Health, auth, guards
│   │   │   ├── common/            # Decorators, interceptors, filters
│   │   │   └── modules/           # ← ALL business modules here
│   │   │       ├── hrm/           # Module 1: People & Org
│   │   │       ├── scout/         # Module 8A: Skills & Ranks
│   │   │       ├── sessions/      # Module 8B: Sessions & Attendance
│   │   │       ├── events/        # Module 8C: Events & Camps
│   │   │       ├── enrichment/    # Module 8D: Spiritual, Evaluation
│   │   │       ├── spiritual/     # Module 8D (sub): Spiritual logs
│   │   │       ├── rewards/       # Module 9: EXP, Badges, Shop
│   │   │       ├── lms/           # Module 7: Courses, Quizzes
│   │   │       ├── projects/      # Module 2: Plans, Projects, Tasks
│   │   │       ├── tickets/       # Module 3: Support tickets
│   │   │       ├── finance/       # Module 4: Fees, Transactions
│   │   │       ├── assets/        # Module 5: Inventory, Loans
│   │   │       ├── process/       # Module 6: Workflows, SOPs
│   │   │       ├── notifications/ # Cross-cutting: Push, Email
│   │   │       ├── org-config/    # Module 10: Org settings
│   │   │       ├── child-safety/  # COPPA compliance
│   │   │       ├── file-storage/  # File uploads
│   │   │       ├── data-import/   # CSV/Excel import
│   │   │       ├── dashboards/    # Dashboard aggregations
│   │   │       ├── approvals/     # Approval engine
│   │   │       ├── system/        # System admin
│   │   │       └── warehouse/     # Data warehouse
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # ← DB SSOT (63 models)
│   │   │   └── migrations/        # 7 migration dirs
│   │   └── test/                  # E2E tests
│   ├── web/                       # Next.js frontend
│   │   ├── app/                   # App Router pages
│   │   └── components/            # UI components
│   └── worker/                    # ⚡ NOT YET CREATED
├── contracts/                     # ← CONTRACT ARTIFACTS
│   ├── openapi/                   # OpenAPI spec + codegen
│   ├── events/                    # Event catalog
│   ├── state-machines/            # SM definitions (WP-9.1)
│   ├── schemas/                   # DB coverage docs (WP-9.2)
│   ├── scout/                     # Scout contract pack (WP-9.3)
│   ├── agent-pack/                # AI agent pack (WP-9.4)
│   ├── release/                   # Readiness manifests
│   └── db/                        # DB docs
├── packages/                      # Shared packages
│   ├── constants/                 # Shared enums, events
│   └── shared/                    # Shared utilities
└── scripts/                       # Build/deploy scripts
```

---

## Module → File Mapping

| Module      | Controller                         | Service                         | Module File                    | Test             |
| ----------- | ---------------------------------- | ------------------------------- | ------------------------------ | ---------------- |
| HRM         | `hrm/*.controller.ts`              | `hrm/*.service.ts`              | `hrm/hrm.module.ts`            | `test/hrm/`      |
| Scout 8A    | `scout/scout.controller.ts`        | `scout/scout.service.ts`        | `scout/scout.module.ts`        | `test/scout/`    |
| Sessions 8B | `sessions/sessions.controller.ts`  | `sessions/sessions.service.ts`  | `sessions/sessions.module.ts`  | `test/sessions/` |
| Events 8C   | `events/events-camp.controller.ts` | `events/events-camp.service.ts` | `events/events-camp.module.ts` | `test/events/`   |
| Rewards 9   | `rewards/*.controller.ts`          | `rewards/*.service.ts`          | `rewards/rewards.module.ts`    | `test/rewards/`  |
| LMS 7       | `lms/*.controller.ts`              | `lms/*.service.ts`              | `lms/lms.module.ts`            | `test/lms/`      |
| Projects 2  | `projects/*.controller.ts`         | `projects/*.service.ts`         | `projects/projects.module.ts`  | `test/projects/` |
| Tickets 3   | `tickets/*.controller.ts`          | `tickets/*.service.ts`          | `tickets/tickets.module.ts`    | `test/tickets/`  |
| Finance 4   | `finance/*.controller.ts`          | `finance/*.service.ts`          | `finance/finance.module.ts`    | `test/finance/`  |
| Assets 5    | `assets/*.controller.ts`           | `assets/*.service.ts`           | `assets/assets.module.ts`      | `test/assets/`   |
| Process 6   | `process/*.controller.ts`          | `process/*.service.ts`          | `process/process.module.ts`    | `test/process/`  |

---

## Service Boundaries

### What Each Module OWNS

| Module        | Prisma Models Owned                                             | Events Produced      | State Machines                                    |
| ------------- | --------------------------------------------------------------- | -------------------- | ------------------------------------------------- |
| HRM           | OrgMember, MemberProfile, GuardianLink, etc. (9)                | `hrm.*` (7)          | member-lifecycle                                  |
| Scout         | ProgramVersion, Domain, Skill\*, MemberSkillProgress, etc. (15) | `scout.*` (8)        | skill-progress, rank-progression, program-version |
| Sessions      | Session, SessionAttendance, AnnualProgram (3)                   | `session.*` (5)      | session-lifecycle                                 |
| Events        | Event, EventRegistration (2)                                    | `event.*` (6)        | event-lifecycle                                   |
| Rewards       | ExpConfig, ExpTransaction, BadgeDefinition, etc. (8)            | `rewards.*` (5)      | reward-redemption                                 |
| LMS           | Course, Lesson, Quiz, QuizBattle, etc. (8)                      | `lms.*` (5)          | course-progress, quiz-battle                      |
| Notifications | Notification\*, NotificationDeliveryLog (4)                     | `notification.*` (3) | —                                                 |

### Cross-Module Consumption Rules

```
Rule: A module MAY read another module's data but MUST NOT write directly.
Instead: Emit a DomainEvent → Consumer module reacts.

Example:
  Scout verifies skill → emits `scout.skill_verified`
  Rewards module listens → awards EXP
  Notifications module listens → sends push
```

---

## AI Agent File Creation Rules

1. **New controller** → `modules/{module-name}/{module-name}.controller.ts`
2. **New service** → `modules/{module-name}/{module-name}.service.ts`
3. **New module** → `modules/{module-name}/{module-name}.module.ts` + register in `app.module.ts`
4. **New contract** → `contracts/{category}/{filename}`
5. **New migration** → `npx prisma migrate dev --name {name}` (auto-creates dir)
6. **New test** → `test/{module-name}/{test-name}.spec.ts`
7. **New DTO** → `modules/{module-name}/dto/{dto-name}.dto.ts`
