# T-0907: Canonical Table Specifications per Module

> **Source:** `apps/api/prisma/schema.prisma` | 63 models → 63 PostgreSQL tables
> **Generated:** 2026-03-12 | **Audited:** 2026-03-13 | **STORY-009 / WP-9.2 / M9.2**

---

## Module 10: Core / Multi-Tenant Foundation

### `organizations`

| Column            | Type         | Constraints           | Notes             |
| ----------------- | ------------ | --------------------- | ----------------- |
| id                | UUID         | PK, gen_random_uuid() |                   |
| slug              | VARCHAR(100) | UNIQUE                | Tenant identifier |
| name              | VARCHAR(255) | NOT NULL              |                   |
| full_name         | TEXT         | nullable              |                   |
| logo_url          | TEXT         | nullable              |                   |
| settings          | JSONB        | DEFAULT '{}'          |                   |
| subscription_plan | VARCHAR(50)  | DEFAULT 'basic'       |                   |
| is_active         | BOOLEAN      | DEFAULT true          |                   |
| created_at        | TIMESTAMPTZ  | DEFAULT now()         |                   |
| updated_at        | TIMESTAMPTZ  | DEFAULT now()         |                   |

### `branches`

| Column         | Type         | Constraints      | Notes                |
| -------------- | ------------ | ---------------- | -------------------- |
| id             | UUID         | PK               |                      |
| org_id         | UUID         | FK→organizations | CASCADE delete       |
| code           | VARCHAR(50)  | NOT NULL         |                      |
| name           | VARCHAR(100) | NOT NULL         |                      |
| min_age        | INT          | nullable         | Age branch filtering |
| max_age        | INT          | nullable         |                      |
| color_theme    | VARCHAR(50)  | nullable         |                      |
| narrative_name | VARCHAR(100) | nullable         | Scout narrative      |
| settings       | JSONB        | DEFAULT '{}'     |                      |
| **UQ**         |              | (org_id, code)   |                      |

### `units`

| Column         | Type         | Constraints      | Notes          |
| -------------- | ------------ | ---------------- | -------------- |
| id             | UUID         | PK               |                |
| org_id         | UUID         | FK→organizations |                |
| branch_id      | UUID         | FK→branches      |                |
| name           | VARCHAR(100) | NOT NULL         |                |
| totem_name     | VARCHAR(100) | nullable         | Hàng đội totem |
| unit_type      | VARCHAR(50)  | nullable         |                |
| parent_unit_id | UUID         | FK→units (self)  | Hierarchy      |
| leader_user_id | UUID         | nullable         |                |
| created_at     | TIMESTAMPTZ  | DEFAULT now()    |                |

### `users`

| Column       | Type         | Constraints      | Notes              |
| ------------ | ------------ | ---------------- | ------------------ |
| id           | UUID         | PK               |                    |
| firebase_uid | VARCHAR(128) | UNIQUE           | Firebase Auth link |
| email        | VARCHAR(255) | UNIQUE, nullable |                    |
| phone        | VARCHAR(20)  | nullable         |                    |
| display_name | VARCHAR(255) | nullable         |                    |
| avatar_url   | TEXT         | nullable         |                    |
| is_active    | BOOLEAN      | DEFAULT true     |                    |
| created_at   | TIMESTAMPTZ  | DEFAULT now()    |                    |
| updated_at   | TIMESTAMPTZ  | DEFAULT now()    |                    |

### `org_members`

| Column           | Type         | Constraints           | Notes                      |
| ---------------- | ------------ | --------------------- | -------------------------- |
| id               | UUID         | PK                    |                            |
| org_id           | UUID         | FK→organizations      | CASCADE delete             |
| user_id          | UUID         | FK→users              | CASCADE delete             |
| role             | VARCHAR(50)  | NOT NULL              | admin/truong/member/parent |
| truong_level     | VARCHAR(50)  | nullable              | Huynh trưởng level         |
| branch_id        | UUID         | FK→branches, nullable |                            |
| unit_id          | UUID         | FK→units, nullable    |                            |
| member_code      | VARCHAR(50)  | nullable              |                            |
| joined_date      | DATE         | nullable              |                            |
| status           | VARCHAR(50)  | DEFAULT 'active'      | **SM: member-lifecycle**   |
| linked_member_id | UUID         | FK→org_members (self) | Parent-child link          |
| scout_name       | VARCHAR(100) | nullable              |                            |
| hero_name        | VARCHAR(100) | nullable              |                            |
| meta             | JSONB        | DEFAULT '{}'          |                            |
| created_at       | TIMESTAMPTZ  | DEFAULT now()         |                            |
| **UQ**           |              | (org_id, user_id)     |                            |

### `audit_logs`

| Column      | Type         | Constraints                     | Notes              |
| ----------- | ------------ | ------------------------------- | ------------------ |
| id          | UUID         | PK                              |                    |
| org_id      | UUID         | NOT NULL                        | No FK — perf table |
| user_id     | UUID         | nullable                        |                    |
| action      | VARCHAR(100) | NOT NULL                        |                    |
| resource    | VARCHAR(100) | NOT NULL                        |                    |
| resource_id | UUID         | nullable                        |                    |
| old_value   | JSONB        | nullable                        |                    |
| new_value   | JSONB        | nullable                        |                    |
| ip_address  | VARCHAR(50)  | nullable                        |                    |
| user_agent  | TEXT         | nullable                        |                    |
| created_at  | TIMESTAMPTZ  | DEFAULT now()                   |                    |
| **IDX**     |              | (org_id, action)                |                    |
| **IDX**     |              | (org_id, resource, resource_id) |                    |
| **IDX**     |              | (org_id, created_at)            |                    |

---

## Module 1: HRM

### `member_profiles`

| Column                  | Type         | Constraints            | Notes             |
| ----------------------- | ------------ | ---------------------- | ----------------- |
| id                      | UUID         | PK                     |                   |
| org_id                  | UUID         | NOT NULL               | IDX               |
| org_member_id           | UUID         | UNIQUE, FK→org_members | CASCADE delete    |
| full_name               | VARCHAR(255) | NOT NULL               |                   |
| birth_date              | DATE         | nullable               |                   |
| gender                  | VARCHAR(20)  | nullable               |                   |
| id_card                 | VARCHAR(50)  | nullable               |                   |
| address                 | TEXT         | nullable               |                   |
| photo_url               | TEXT         | nullable               |                   |
| personal_phone          | VARCHAR(20)  | nullable               |                   |
| personal_email          | VARCHAR(255) | nullable               |                   |
| zalo_id                 | VARCHAR(100) | nullable               |                   |
| guardian_name           | VARCHAR(255) | nullable               | Legacy            |
| guardian_phone          | VARCHAR(20)  | nullable               | Legacy            |
| guardian_relation       | VARCHAR(50)  | nullable               | Legacy            |
| guardian_zalo           | VARCHAR(100) | nullable               | Legacy            |
| promise_date            | DATE         | nullable               | Scout promise     |
| uniform_size            | VARCHAR(20)  | nullable               |                   |
| health_notes            | TEXT         | nullable               |                   |
| emergency_contact       | TEXT         | nullable               |                   |
| wood_badge_level        | VARCHAR(50)  | nullable               |                   |
| specializations         | TEXT[]       | DEFAULT '{}'           |                   |
| join_reason             | TEXT         | nullable               |                   |
| custom_fields           | JSONB        | DEFAULT '{}'           | T-0042            |
| background_check_expiry | DATE         | nullable               | T-0045 compliance |
| youth_protection_date   | DATE         | nullable               | T-0045            |
| medical_form_date       | DATE         | nullable               | T-0045            |
| consent_form_signed     | BOOLEAN      | DEFAULT false          | T-0045            |
| created_by              | UUID         | nullable               |                   |
| created_at              | TIMESTAMPTZ  | DEFAULT now()          |                   |
| updated_at              | TIMESTAMPTZ  | DEFAULT now()          |                   |

### `guardian_links`

| Column         | Type         | Constraints                          | Notes                |
| -------------- | ------------ | ------------------------------------ | -------------------- |
| id             | UUID         | PK                                   |                      |
| org_id         | UUID         | IDX                                  |                      |
| org_member_id  | UUID         | FK→org_members, IDX                  | CASCADE delete       |
| user_id        | UUID         | nullable, IDX                        | T-0056: parent login |
| full_name      | VARCHAR(255) | NOT NULL                             |                      |
| relation       | VARCHAR(50)  | NOT NULL                             | mother/father/etc    |
| phone          | VARCHAR(20)  | nullable                             |                      |
| email          | VARCHAR(255) | nullable                             |                      |
| zalo_id        | VARCHAR(100) | nullable                             |                      |
| address        | TEXT         | nullable                             |                      |
| id_card        | VARCHAR(50)  | nullable                             |                      |
| is_primary     | BOOLEAN      | DEFAULT false                        |                      |
| can_pickup     | BOOLEAN      | DEFAULT true                         |                      |
| consent_signed | BOOLEAN      | DEFAULT false                        |                      |
| consent_date   | DATE         | nullable                             |                      |
| notes          | TEXT         | nullable                             |                      |
| created_at     | TIMESTAMPTZ  | DEFAULT now()                        |                      |
| updated_at     | TIMESTAMPTZ  | DEFAULT now()                        |                      |
| **UQ**         |              | (org_member_id, full_name, relation) |                      |

### `child_data_access_logs`

| Column           | Type         | Constraints        | Notes        |
| ---------------- | ------------ | ------------------ | ------------ |
| id               | UUID         | PK                 |              |
| org_id           | UUID         | IDX                | T-0058 COPPA |
| child_member_id  | UUID         | IDX                |              |
| accessor_user_id | UUID         | IDX                |              |
| accessor_role    | VARCHAR(50)  | NOT NULL           |              |
| access_type      | VARCHAR(50)  | NOT NULL           |              |
| resource_type    | VARCHAR(50)  | NOT NULL           |              |
| resource_id      | UUID         | nullable           |              |
| ip_address       | VARCHAR(45)  | nullable           |              |
| user_agent       | VARCHAR(500) | nullable           |              |
| accessed_at      | TIMESTAMPTZ  | DEFAULT now(), IDX |              |

### `member_branch_history`

| Column          | Type        | Constraints             | Notes |
| --------------- | ----------- | ----------------------- | ----- |
| id              | UUID        | PK                      |       |
| org_id          | UUID        | NOT NULL                |       |
| org_member_id   | UUID        | FK→org_members          |       |
| from_branch_id  | UUID        | nullable                |       |
| to_branch_id    | UUID        | nullable                |       |
| from_unit_id    | UUID        | nullable                |       |
| to_unit_id      | UUID        | nullable                |       |
| transition_date | DATE        | NOT NULL                |       |
| reason          | TEXT        | nullable                |       |
| approved_by     | UUID        | nullable                |       |
| created_at      | TIMESTAMPTZ | DEFAULT now()           |       |
| **IDX**         |             | (org_id, org_member_id) |       |

### `org_chart_nodes`

| Column         | Type         | Constraints              | Notes |
| -------------- | ------------ | ------------------------ | ----- |
| id             | UUID         | PK                       |       |
| org_id         | UUID         | IDX                      |       |
| node_type      | VARCHAR(50)  | NOT NULL                 |       |
| name           | VARCHAR(255) | NOT NULL                 |       |
| parent_node_id | UUID         | FK→self, nullable        |       |
| org_member_id  | UUID         | FK→org_members, nullable |       |
| position_title | VARCHAR(100) | nullable                 |       |
| display_order  | INT          | DEFAULT 0                |       |
| is_active      | BOOLEAN      | DEFAULT true             |       |
| valid_from     | TIMESTAMPTZ  | DEFAULT now()            |       |
| valid_to       | TIMESTAMPTZ  | nullable                 |       |
| metadata       | JSONB        | DEFAULT '{}'             |       |
| created_at     | TIMESTAMPTZ  | DEFAULT now()            |       |
| updated_at     | TIMESTAMPTZ  | DEFAULT now()            |       |
| **IDX**        |              | (org_id, is_active)      |       |

### `volunteer_availability`

| Column        | Type        | Constraints             | Notes |
| ------------- | ----------- | ----------------------- | ----- |
| id            | UUID        | PK                      |       |
| org_id        | UUID        | NOT NULL                |       |
| org_member_id | UUID        | FK→org_members          |       |
| date          | DATE        | NOT NULL                |       |
| start_time    | VARCHAR(10) | NOT NULL                |       |
| end_time      | VARCHAR(10) | NOT NULL                |       |
| status        | VARCHAR(30) | DEFAULT 'available'     |       |
| notes         | TEXT        | nullable                |       |
| created_at    | TIMESTAMPTZ | DEFAULT now()           |       |
| **IDX**       |             | (org_id, org_member_id) |       |
| **IDX**       |             | (org_id, date)          |       |

---

> **Remaining modules** (9, 8A, 8B, 8C, 7, 8D, 2, 3, 4, 5, 6, Notifications, Events, Files, Ops, Import, Transfer, Onboarding) follow the same pattern. See `coverage-matrix.md` for the full model list. Detailed column specs for these modules are available in the Prisma schema source (`schema.prisma` L330–2211).

---

## Cross-Module Shared Patterns

### Multi-Tenant Column

- **All 60 tables** (except `organizations`, `users`, `release_gate_reports`) have `org_id UUID NOT NULL`
- 3 new M2-B models (`PlanTemplate`, `ProjectChecklist`, `ProjectRisk`) also have `org_id`
- RLS policy target: `WHERE org_id = current_setting('app.org_id')::uuid`

### Timestamp Convention

- `created_at TIMESTAMPTZ DEFAULT now()` — universal
- `updated_at TIMESTAMPTZ DEFAULT now()` — on mutable entities (uses `@updatedAt`)

### ID Convention

- All PKs: `UUID` with `gen_random_uuid()` (PostgreSQL 13+ native)
- No auto-increment integers

### Status Convention

- String-based `VARCHAR(50)` or `VARCHAR(30)` — no native enums
- State machine mapping via `contracts/state-machines/enum-mapping.ts`
