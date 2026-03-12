# T-0916: OpenAPI + DTO/Codegen Rules — AI Agent Pack

> **Purpose:** Complete input pack so AI agents can generate type-safe code without guessing
> **Generated:** 2026-03-12 | **STORY-009 / WP-9.4 / M9.4**

---

## OpenAPI Specification

| Item | Path | Status |
|------|------|--------|
| **Master spec** | `contracts/openapi/ttndd-ops-api.json` | ✅ Exists |
| **TypeScript types** | `contracts/openapi/api-types.d.ts` | ✅ Generated |
| **Codegen script** | `contracts/openapi/codegen.js` | ✅ Exists |
| **Generate script** | `contracts/openapi/generate.ts` | ✅ Exists |

### How to Regenerate Types

```bash
cd platform
node contracts/openapi/codegen.js
```

**Output:** `contracts/openapi/api-types.d.ts` — full typed paths/operations.

---

## DTO Conventions

### Naming Rules
| Pattern | Example | Usage |
|---------|---------|-------|
| `Create{Entity}Dto` | `CreateMemberDto` | POST body |
| `Update{Entity}Dto` | `UpdateMemberDto` | PATCH body |
| `{Entity}ResponseDto` | `MemberResponseDto` | Response shape |
| `{Entity}QueryDto` | `MemberQueryDto` | GET query params |
| `{Entity}FilterDto` | `MemberFilterDto` | Complex filters |

### Current Reality
> DTOs are currently **inline `@Body()` types** in controllers, not separate DTO classes.
> This is a known tech debt — see KANBAN for DTO extraction task.

```typescript
// Current pattern (inline):
@Body() body: { branchId: string; title: string; sessionDate: string }

// Target pattern (DTO class):
@Body() body: CreateSessionDto
```

### Codegen Rules for AI Agents

1. **Always use `@ApiProperty()`** on DTO fields for Swagger documentation
2. **Use `class-validator`** decorators: `@IsString()`, `@IsUUID()`, `@IsOptional()`
3. **Status fields** MUST use string literals matching SM state names (see `enum-mapping.ts`)
4. **`orgId`** is NEVER in DTOs — always extracted from `@CurrentUser()` decorator
5. **Date fields** use ISO 8601 strings, parsed server-side
6. **JSONB fields** use `Prisma.InputJsonValue` type

---

## Event Catalog Reference

| Item | Path | Coverage |
|------|------|----------|
| **Full catalog** | `contracts/events/catalog.json` | 61 events across 14 modules |
| **Envelope schema** | See `catalog.json → envelope` | Standard DomainEvent shape |
| **Worker queues** | 4 queues: notifications, rewards, reports, cleanup | |

### Event Naming Convention
```
{module}.{entity}_{action}_{past_tense}

Examples:
  scout.skill_verified
  session.attendance_marked
  event.event_completed
  hrm.member_created
```

### Event Envelope (DomainEvent table)
```typescript
interface DomainEvent {
  id: string;          // UUID auto-gen
  orgId: string;       // Tenant key
  eventType: string;   // From catalog
  aggregateId: string; // Entity UUID
  aggregateType: string; // Entity name
  payload: object;     // Event-specific data
  actorUserId: string; // Who triggered
  createdAt: Date;
  processedAt?: Date;
}
```

---

## Module → OpenAPI Tag Mapping

| Module | API Tag | Controller | Base Path |
|--------|---------|------------|-----------|
| Core | Org | OrgConfigController | `/org-config` |
| HRM | HRM | HrmController | `/hrm` |
| Scout | Scout | ScoutController | `/scout` |
| Sessions | Sessions | SessionsController | `/sessions` |
| Events | Events & Camps | EventsCampController | `/events` |
| Rewards | Rewards | RewardsController | `/rewards` |
| LMS | LMS | LmsController | `/lms` |
| Projects | Projects | ProjectsController | `/projects` |
| Tickets | Tickets | TicketsController | `/tickets` |
| Finance | Finance | FinanceController | `/finance` |
| Assets | Assets | AssetsController | `/assets` |
| Process | Process | ProcessController | `/process` |
| Notifications | Notifications | NotificationsController | `/notifications` |
| File Storage | FileStorage | FileStorageController | `/file-storage` |
| Child Safety | ChildSafety | ChildSafetyController | `/child-safety` |
| Data Import | DataImport | DataImportController | `/data-import` |

---

## State Machine → API → Event Linkage

| State Machine | Transition Endpoint | Events Emitted |
|--------------|-------------------|----------------|
| member-lifecycle | `POST /hrm/members/:id/transition` | `hrm.member_*` |
| session-lifecycle | `POST /sessions/:id/transition` | `session.session_*` |
| event-lifecycle | `POST /events/:id/transition` | `event.event_*` |
| skill-progress | `POST /scout/progress/:progressId/verify-decision` | `scout.skill_*` |
| rank-progression | `POST /scout/member-ranks/:memberId/transition` | `scout.rank_*` |
| course-progress | `POST /lms/courses/:courseId/enroll/:memberId` | `lms.*` |
| reward-redemption | `POST /rewards/redemptions/:id/approve` | `rewards.item_redeemed` |
| quiz-battle | `POST /lms/quiz-battles/:id/transition` | `lms.quiz_*` |
| program-version | `POST /scout/program-versions` (via status field) | — |
