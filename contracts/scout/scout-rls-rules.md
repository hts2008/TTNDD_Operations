# T-0913: Scout Core RLS & Write Rules — Leader / Member / Guardian

> **Source:** Controller analysis (`@Roles` decorators) + TTNDD_OPS_V3.md
> **Generated:** 2026-03-12 | **STORY-009 / WP-9.3 / M9.3**

---

## Actor Roles in Scout Context

| Role | DB Value | Can Read | Can Write | SM Transitions |
|------|----------|----------|-----------|----------------|
| **super_admin** | `super_admin` | All org data | All | All |
| **admin** (Huynh Trưởng) | `admin` | Branch-scoped | Definition CRUD, verify, transition | All SM transitions |
| **truong** (Trưởng) | `truong` | Unit-scoped | Own unit members | Limited |
| **member** (Đoàn sinh) | `member` | Own progress | Self: start skill, submit evidence, log habit | start, submit only |
| **parent** (Phụ huynh) | `parent` | Own child data | Consent sign, view progress | consent only |
| **guardian** (Bảo hộ) | `guardian` | Linked children | View only | None |

---

## RLS Policy Matrix

### Row-Level Security Rules (PostgreSQL)

| Table | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE |
|-------|---------------|---------------|---------------|--------|
| program_versions | `org_id = current_org()` | admin+ | admin+ | admin+ |
| domains | `org_id = current_org()` | admin+ | admin+ | admin+ |
| skill_groups | `org_id = current_org()` | admin+ | admin+ | admin+ |
| skills | `org_id = current_org()` | admin+ | admin+ | admin+ |
| skill_criteria | `org_id = current_org()` | admin+ | admin+ | admin+ |
| rank_definitions | `org_id = current_org()` | admin+ | admin+ | admin+ |
| member_skill_progress | `org_id = current_org() AND (is_admin() OR owner_member())`| member+ | owner or admin | ✗ |
| skill_evidence | `org_id = current_org()` | owner | ✗ | ✗ |
| skill_verifications | `org_id = current_org()` | admin+ | ✗ | ✗ |
| member_ranks | `org_id = current_org() AND (is_admin() OR owner_member())` | admin+ | admin+ | ✗ |
| habit_defs | `org_id = current_org()` | admin+ | admin+ | admin+ |
| habit_logs | `org_id = current_org() AND (is_admin() OR person_id = current_member())` | member+ | owner | ✗ |
| achievement_defs | `org_id = current_org()` | admin+ | admin+ | admin+ |
| achievement_awards | `org_id = current_org()` | admin+ | ✗ | ✗ |
| activity_logs | `org_id = current_org()` | member+ | ✗ | ✗ |
| sessions | `org_id = current_org()` | admin+ | admin+ | admin+ |
| session_attendance | `org_id = current_org()` | admin+ | admin+ | ✗ |
| annual_programs | `org_id = current_org()` | admin+ | admin+ | ✗ |
| events | `org_id = current_org()` | admin+ | admin+ | admin+ |
| event_registrations | `org_id = current_org()` | member+ | ✗ | ✗ |
| spiritual_logs | `org_id = current_org() AND owner()` | member+ | owner | ✗ |
| ngu_gioi_assessments | `org_id = current_org() AND owner()` | member+ | owner | ✗ |
| evaluations | `org_id = current_org()` | admin+ | admin+ | ✗ |
| mentoring_relationships | `org_id = current_org()` | admin+ | admin+ | admin+ |
| mentoring_logs | `org_id = current_org()` | mentor/mentee | mentor | ✗ |

---

## Write Rule Guards (Application Layer)

### Evidence Submission
```
GUARD: member can only submit evidence for own skill progress
WHERE member_skill_progress.org_member_id = linked to current user's org_member_id
```

### Habit Logging
```
GUARD: member can only log habits for self
WHERE habit_logs.person_id = current user's org_member_id
```

### Event Registration
```
GUARD: member can only register self (or parent registers child)
WHERE event_registrations.org_member_id = current user OR linked_member
```

### Parent Consent
```
GUARD: parent can only sign consent for linked children
WHERE guardian_links.org_member_id = target member AND guardian_links.user_id = current user
```

### SM Transitions
```
GUARD: only actors listed in SM transition.actors[] can invoke
Enforcement: via contracts/state-machines/*.ts actor arrays
```

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| `@Roles()` decorators | ✅ Implemented | All controllers use |
| `org_id` filtering | ✅ Implemented | Service layer filters |
| PostgreSQL RLS policies | ⚠️ NOT IMPLEMENTED | App-layer only |
| `CurrentUser` injection | ✅ Implemented | Provides orgId, userId, memberId |
| Branch-scoping for truong | ⚠️ PARTIAL | Some services check, others skip |
| Parent → child data access | ⚠️ PARTIAL | `guardian_links` exists, access log exists |
| COPPA compliance logging | ✅ Implemented | `child_data_access_logs` table |

> **Blocker:** PostgreSQL RLS policies not yet created — all security is app-layer only. This is tracked in STORY-001 WP-1.2.
