# Rewards Module — Known Issues & Operator Runbook

## Module: STORY-020 Rewards (Gamification Engine)

## Date: 2026-04-25

## Status: IMPLEMENTED — Production Ready (with known limitations)

---

## Known Issues

### RWD-001: No auto-award badge engine (P2)

**Severity**: Medium
**Impact**: Badges with `isAutoAward: true` and `triggerEvent` are defined but not auto-triggered
**Workaround**: Admins manually award badges via POST /badges/award
**Plan**: Build worker-backed badge trigger engine that evaluates triggerConfig against event stream

### RWD-002: No EXP level/rank system (P2)

**Severity**: Medium
**Impact**: EXP is accumulated but not converted to levels/ranks
**Workaround**: Manual comparison against leaderboard
**Plan**: Add LevelDefinition model with EXP thresholds and automatic level-up

### RWD-003: Leaderboard snapshot not auto-scheduled (P2)

**Severity**: Low
**Impact**: Snapshots must be manually triggered via API
**Workaround**: Admin takes snapshots at regular intervals
**Plan**: Add cron job for automatic weekly/monthly snapshots

### RWD-004: No redemption rejection/cancel workflow (P2)

**Severity**: Low
**Impact**: Redemptions can be approved but not rejected — no EXP refund path
**Workaround**: Manual database update
**Plan**: Add reject endpoint with EXP restoration

### RWD-005: Peer recognition has no notification (P2)

**Severity**: Low
**Impact**: Recipients don't know they were recognized until they check
**Workaround**: Manual communication
**Plan**: Integrate with notification system when available

### RWD-006: Cap counter uses application-time (P3)

**Severity**: Low
**Impact**: Daily/weekly caps are based on server time, not member timezone
**Workaround**: Accept UTC-based caps
**Plan**: Add timezone-aware cap computation

### RWD-007: No EXP expiry mechanism (P3)

**Severity**: Low
**Impact**: EXP never expires — no incentive to spend
**Workaround**: Admins can manually deduct stale EXP
**Plan**: Add optional EXP expiry config (e.g., expire after 365 days)

---

## Deferred Features

| Feature                        | Priority | Reason                                      |
| ------------------------------ | -------- | ------------------------------------------- |
| Auto-award badge engine        | P2       | Needs worker-backed event stream processing |
| EXP level/rank system          | P2       | Needs LevelDefinition model                 |
| Auto leaderboard snapshots     | P2       | Needs worker scheduler job logic            |
| Redemption rejection           | P2       | Simple but not exposed                      |
| Peer recognition notifications | P2       | Needs notification infra                    |
| Badge showcase / profile       | P2       | FE feature                                  |
| EXP streak bonuses             | P2       | Needs streak tracking                       |
| Cap timezone awareness         | P3       | Low priority edge case                      |
| EXP expiry mechanism           | P3       | Design decision needed                      |
| Achievement chains / quests    | P3       | Complex gamification feature                |

---

## Operator Runbook

### 1. EXP Configuration

```
Admin configures EXP rules → POST /rewards/exp/configs
  { eventType, sourceModule, actionName, expAmount, maxPerDay, maxPerWeek, description }

  Upsert: same orgId + eventType → updates existing config
  Cap defaults: maxPerDay=-1 (unlimited), maxPerWeek=-1 (unlimited)

  Pre-configured event types (via seed):
  - member.activated → 10 EXP (1/day, 1/week)
  - session.attendance_marked → 5 EXP (2/day, 10/week)
  - scout.skill_verified → 20 EXP (5/day, 20/week)
  - lms.lesson_completed → 5 EXP (10/day, 30/week)
  - enrichment.spiritual_log_created → 5 EXP (2/day, 7/week)
```

### 2. Manual EXP Management

```
Award EXP → POST /rewards/exp/award { memberId, amount, notes }
  Validates: amount > 0, cap check
  Creates transaction (type=earn) + updates summary atomically
  Publishes: EXP_AWARDED domain event

Deduct EXP → POST /rewards/exp/deduct { memberId, amount, reason }
  Validates: amount > 0, availableExp >= amount
  Creates transaction (type=deduct) + updates summary atomically
  Publishes: EXP_DEDUCTED domain event

View summary → GET /rewards/exp/summary/:memberId
  Returns: { totalExp, availableExp, penaltyCount, ... }
  Auto-creates summary if member has none (lazy initialization)

View history → GET /rewards/exp/transactions/:memberId?page=1&limit=20
  Returns: { data: [...], meta: { total, page, limit } }
```

### 3. Badge System

```
Create definition → POST /rewards/badges/definitions (admin)
  { badgeCode, name, description, badgeType, imageUrl, rarity, triggerEvent, triggerConfig, expReward, isAutoAward }

  Rarity tiers: common, uncommon, rare, epic, legendary
  Badge types: milestone, achievement, social, skill, special

Award badge → POST /rewards/badges/award (admin)
  { memberId, badgeId, notes }
  Idempotent: duplicate awards return existing record
  Publishes: BADGE_AWARDED domain event
```

### 4. Reward Shop

```
Create item → POST /rewards/shop/items (admin)
  { name, description, costExp, category, imageUrl, quantityAvailable, validUntil }
  quantityAvailable: -1 = unlimited stock

Redeem → POST /rewards/shop/redeem (member)
  { rewardId }
  Validates: item active, in stock, not expired, member has enough EXP
  Creates redemption (status=pending), decrements stock, deducts EXP
  Publishes: REDEMPTION_REQUESTED

Approve → POST /rewards/shop/redemptions/:id/approve (admin)
  Updates status to 'approved'
  Publishes: ITEM_REDEEMED
```

### 5. Penalties

```
Apply penalty → POST /rewards/penalties (admin)
  { memberId, amount, reason, deductionItem?, correctionTask? }
  Delegates to deductExp for balance check + transaction
  Publishes: PENALTY_APPLIED

Correct penalty → POST /rewards/penalties/:txId/correct (admin)
  Awards back deducted EXP, marks isCorrected=true, decrements penaltyCount
  Prevents double-correction (throws if already corrected)
  Publishes: PENALTY_CORRECTED
```

### 6. Leaderboard

```
Live leaderboard → GET /rewards/leaderboard?scope=org&limit=20
  Scopes: org (all), branch (by branchId), unit (by unitId)
  Includes: scoutName, heroName, memberCode, displayName, avatarUrl, branch

Take snapshot → POST /rewards/leaderboard/snapshot (admin)
  { scope?, scopeId?, period? }
  Captures top 100 rankings for historical tracking

View snapshots → GET /rewards/leaderboard/snapshots?scope=org&period=weekly
  Paginated: { data, meta: { total, page, limit } }
```

### 7. Peer Recognition

```
Give recognition → POST /rewards/peer-recognition (member)
  { toMemberId, category, message? }
  Categories: teamwork, leadership, helpfulness, creativity, bravery
  Limits: 3 recognitions per day per giver
  Blocks: self-recognition
  Auto-awards: 2 EXP to recipient
  Publishes: PEER_RECOGNIZED

View received → GET /rewards/peer-recognition/received/:memberId
  Paginated: { data, meta: { total, page, limit } }
```

### 8. Event-Driven EXP (Automatic)

```
RewardEventSubscriber listens to 12 events from 7 modules:
  HRM:         member.activated → 10 EXP
  Session:     attendance_marked → 5 EXP, debriefed → 3 EXP
  Scout:       skill_verified → 20 EXP
  Event:       checked_in → 10 EXP
  LMS:         lesson_completed → 5 EXP, quiz_passed → 15 EXP, course_completed → 30 EXP
  Project:     task_completed → 5 EXP, project_completed → 25 EXP
  Enrichment:  spiritual_log_created → 5 EXP, ngu_gioi_assessed → 10 EXP

All handlers are try/catch wrapped — individual failures don't cascade.
Cap enforcement applies to all automatic awards.
```

---

## Architecture Notes

- **7 services + 1 subscriber**: ~1,100 lines across 15 files
- **312-line controller**: 22 endpoints with Swagger + role guards
- **Transactional EXP**: All award/deduct use `$transaction` for consistency
- **Cap enforcement**: Configurable per event type via ExpConfig
- **Event-driven integration**: 12 @OnEvent handlers connecting all modules
- **Penalty audit trail**: Corrections tracked with isCorrected, correctedAt, correctedBy
- **Idempotent badges**: Duplicate awards return existing record
- **Peer recognition**: Self-block + daily limit + category validation
