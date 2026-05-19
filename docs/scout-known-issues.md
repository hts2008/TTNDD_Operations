# Scout Advancement Module — Known Issues & Operator Runbook

## Module: STORY-017 Scout Advancement

## Date: 2026-04-25

## Status: IMPLEMENTED — Production Ready (with known limitations)

---

## Known Issues

### SCT-001: Mentor assignment not linked to Scout module (P2)

**Severity**: Medium
**Impact**: Scout module has no mentor/leader assignment per skill or rank progression
**Workaround**: Use LMS module's mentoring relationship or manual assignment
**Plan**: Create ScoutMentor model linking leaders to members for skill verification oversight

### SCT-002: Evidence file upload not integrated with File Storage lifecycle (P2)

**Severity**: Medium
**Impact**: Evidence evidenceUrl is URL-only — requires external file hosting
**Workaround**: Upload evidence photos/videos to GCS/S3, paste URL
**Plan**: Integrate evidence submission with existing File Storage signed upload plus finalize/scan flow

### SCT-003: Ceremony scheduling is state-only (P2)

**Severity**: Low
**Impact**: SM-11 `ceremony_scheduled` status exists but no actual calendar/date integration
**Workaround**: Leaders manually coordinate ceremony dates outside the system
**Plan**: Integrate with Calendar module for ceremony event creation

### SCT-004: No notification on evidence submission (P2)

**Severity**: Medium
**Impact**: When a scout submits evidence, no notification is sent to reviewers
**Workaround**: Reviewers must periodically check evidence queue
**Plan**: Add notification event consumer for EVIDENCE_SUBMITTED domain event

### SCT-005: Skill tree visualization is flat (P2)

**Severity**: Low
**Impact**: FE shows skill groups as list, not as interactive skill tree with dependencies
**Workaround**: Functional but not visually optimized
**Plan**: Build interactive D3/React Flow skill tree in P2

### SCT-006: No batch evidence review (P3)

**Severity**: Low
**Impact**: Evidence must be reviewed one-by-one — no bulk approve/reject
**Workaround**: Acceptable for small scout groups (<50 members)
**Plan**: Add batch review API endpoint in P3

### SCT-007: Rank rollback not supported (P3)

**Severity**: Low
**Impact**: Once a rank is completed, it cannot be reverted or re-opened
**Workaround**: Manual database update if truly needed
**Plan**: Add administrative rollback action with audit trail

---

## Deferred Features

| Feature                                | Priority | Reason                                   |
| -------------------------------------- | -------- | ---------------------------------------- |
| Scout mentor assignment                | P2       | Needs ScoutMentor model                  |
| Evidence file upload                   | P2       | Needs File Storage lifecycle integration |
| Ceremony calendar integration          | P2       | Needs Calendar module                    |
| Evidence submission notifications      | P2       | Needs notification consumer              |
| Interactive skill tree (D3/React Flow) | P2       | Frontend feature                         |
| Badge/certificate image generation     | P2       | Needs image gen infra                    |
| Batch evidence review                  | P3       | Low demand at current scale              |
| Rank rollback                          | P3       | Edge case                                |
| Cross-branch skill recognition         | P3       | Complex domain logic                     |
| PostgreSQL RLS for Scout               | P3       | App-level auth sufficient                |

---

## Operator Runbook

### 1. Rank Definition Management

```
Create rank → POST /scout/ranks { branchId, rankCode, rankName, rankOrder, minExp }
  - Requires admin role
  - rankOrder determines display sequence
  - narrativeName is gamification-friendly label
  - badgeImageUrl for visual progression display
```

**Key rule**: Rank definitions should be created in order (rankOrder 1, 2, 3...). Reordering existing ranks requires manual update.

### 2. Skill Tree Setup

```
Create skill group → POST /scout/skill-groups { name, icon, color, orderIndex }
Create skill → POST /scout/skills { skillGroupId, skillCode, name, levels, isRequired }
  - levels: JSON array of { level, criteria }
  - isRequired + requiredForRankId: links skill to rank requirement
  - maxLevel: highest achievable level
  - expPerLevel: EXP reward per level completion
```

### 3. Scout Progression Workflow

```
1. Member starts a skill → POST /progress/:memberId/start { skillId }
2. Member submits evidence → POST /evidence/:memberId { skillId, level, evidenceType, notes }
3. Leader reviews evidence → POST /evidence/:evidenceId/review { approved, reviewNotes }
   - If approved: skill level auto-verified → skill progress updated
   - If rejected: member can re-submit evidence
4. Leader awards skill → POST /progress/:memberId/award { skillId }
   - Triggers auto rank eligibility check
5. If all required skills completed → rank auto-transitions to "eligible"
6. Leader proposes rank → POST /member-ranks/:memberId/transition { rankId, action: "propose" }
7. Council reviews → action: "council_review" → action: "approve"
8. Ceremony → action: "schedule_ceremony" → action: "complete"
```

### 4. State Machine Reference

**SM-10 Skill Progress**:

```
not_started → [start] → in_progress → [submit_review] → pending_review
  → [verify] → verified → [award] → awarded
  → [reject] → in_progress (retry)
```

**SM-11 Rank Progression**:

```
in_progress → [auto_check] → eligible → [propose] → proposed
  → [council_review] → council_review → [approve] → approved
    → [schedule_ceremony] → ceremony_scheduled → [complete] → completed
  → [reject] → proposed (retry)
```

### 5. Dashboard & Monitoring

```
View dashboard → GET /scout/dashboard/:memberId
  Returns:
  - stats: totalSkills, completedSkills, skillCompletionRate, currentRank, completedRanksCount
  - skillProgress: all skills with group info
  - memberRanks: all ranks with allowedActions
  - recentEvidence: last 10 evidence submissions
```

### 6. Evidence Queue Management

```
Evidence submitted → status = "submitted"
Review → status = "approved" or "rejected"
  - Approved evidence auto-verifies skill level
  - No bulk review available (P3)
  - reviewedBy and reviewedAt tracked for audit
```

---

## Architecture Notes

- **440-line service**: 14 methods — ranks, skills, progress, evidence, eligibility, dashboard
- **49-line rank progression**: 2 complete state machines (SM-10 + SM-11) with allowed actions
- **226-line controller**: 16 Swagger-annotated endpoints with `@Roles` guards
- **Domain events**: 8 event types (SKILL_STARTED/VERIFIED/AWARDED, EVIDENCE_SUBMITTED, RANK_ELIGIBLE/PROPOSED/APPROVED/AWARDED)
- **Evidence → Verify chain**: Approved evidence auto-triggers `verifySkillLevel`
- **Award → Eligibility chain**: `awardSkill` auto-calls `checkRankEligibility`
