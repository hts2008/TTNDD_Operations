# Enrichment Module — Known Issues & Operator Runbook

## Module: STORY-019 Enrichment (Spiritual Development)
## Date: 2026-04-25
## Status: IMPLEMENTED — Production Ready (with known limitations)

---

## Known Issues

### ENR-001: No aggregate spiritual progress dashboard (P2)
**Severity**: Medium
**Impact**: Individual logs exist but no aggregated view (streaks, trends, total hours)
**Workaround**: Members review log history manually
**Plan**: Build spiritual progress dashboard with streak counter and emotion trend chart

### ENR-002: No emotion analytics or trend visualization (P2)
**Severity**: Low
**Impact**: emotionBefore/After captured but not analyzed for patterns
**Workaround**: Raw data available via API
**Plan**: Add emotion trend analytics endpoint + FE chart

### ENR-003: Ngũ Giới has no scoring analytics (P2)
**Severity**: Low
**Impact**: Weekly scores captured but no trend or average computation
**Workaround**: Manual review of weekly assessments
**Plan**: Add Ngũ Giới trend endpoint with averages and improvement tracking

### ENR-004: Evaluation cycle management not implemented (P2)
**Severity**: Medium
**Impact**: No scheduled evaluation cycles — evaluations are ad-hoc
**Workaround**: Admins manually create evaluations at agreed intervals
**Plan**: Add EvaluationCycle model with templates and scheduling

### ENR-005: Mentoring relationship deactivation not exposed (P2)
**Severity**: Low
**Impact**: No API to deactivate/end a mentoring relationship
**Workaround**: Direct database update to set status=inactive
**Plan**: Add PATCH /mentoring/:id/deactivate endpoint

### ENR-006: No mentoring goal tracking (P3)
**Severity**: Low
**Impact**: Mentoring logs exist but no structured goal/milestone tracking
**Workaround**: Use log topic/followUp fields informally
**Plan**: Add MentoringGoal model with progress tracking

### ENR-007: ThanhNgon reference not validated (P3)
**Severity**: Low
**Impact**: thanhNgonRef is freeform text — no validation against known references
**Workaround**: Members enter references manually
**Plan**: Create ThanhNgon reference catalog for autocomplete

---

## Deferred Features

| Feature | Priority | Reason |
|---------|----------|--------|
| Spiritual progress dashboard | P2 | FE feature |
| Emotion trend analytics | P2 | Needs analytics endpoint |
| Ngũ Giới trend analysis | P2 | Needs analytics endpoint |
| Evaluation cycle management | P2 | Needs EvaluationCycle model |
| Mentoring deactivation API | P2 | Simple but not exposed yet |
| Mentoring goal tracking | P3 | Complex domain model |
| ThanhNgon reference catalog | P3 | Requires content curation |
| Peer-to-peer spiritual sharing | P3 | Privacy implications |
| Spiritual log reminder notifications | P3 | Needs notification infra |
| PostgreSQL RLS for Enrichment | P3 | App-level auth sufficient |

---

## Operator Runbook

### 1. Spiritual Journal Management

```
Member creates log → POST /enrichment/spiritual-logs
  { logDate, logType, durationMinutes, notes, thanhNgonRef, emotionBefore, emotionAfter }
  
  Privacy: ONLY the member can create and view their own logs
  Other users (including admins) get ForbiddenException
  
Member views logs → GET /enrichment/spiritual-logs/my
  Returns: all logs ordered by logDate DESC
  
logType options: "meditation", "prayer", "study", "service", "reflection"
emotionBefore/After: 1-10 scale (1=very low, 10=very high)
thanhNgonRef: free-text reference to Thánh Ngôn Hiệp Tuyển
```

### 2. Ngũ Giới (Five Precepts) Self-Assessment

```
Member self-assesses → POST /enrichment/ngu-gioi
  { weekStart, batSatSinh, batDuDao, batTaDam, batTuuNhuc, batVongNgu, reflection }
  
  Privacy: HIDDEN from leaders — only the member can self-assess
  Upsert: same weekStart for same member → updates existing record
  
  Five Precepts (1-10 scale):
  1. Bất Sát Sinh — Do not kill / harm living beings
  2. Bất Dũ Đạo — Do not steal / take what is not given
  3. Bất Tà Dâm — Do not engage in sexual misconduct
  4. Bất Tửu Nhục — Do not consume intoxicants
  5. Bất Vọng Ngữ — Do not speak falsely

Member views history → GET /enrichment/ngu-gioi/my
  Returns: all assessments ordered by weekStart DESC
```

### 3. Five-Dimension Evaluation

```
Admin creates evaluation → POST /enrichment/evaluations (requires admin role)
  { orgMemberId, branchId, evaluationType, evaluationDate,
    scoreDaoDuc, scoreKyNang, scoreTheChat, scoreLanhDao, scorePhungSu,
    strengths, areasToImprove, recommendations, selfAssessment }
    
  Five Dimensions:
  1. Đạo Đức — Moral character
  2. Kỹ Năng — Skills
  3. Thể Chất — Physical fitness
  4. Lãnh Đạo — Leadership
  5. Phụng Sự — Service

Admin views by member → GET /enrichment/evaluations/:memberId (requires admin role)
  Returns: all evaluations ordered by evaluationDate DESC
```

### 4. Mentoring Relationships

```
Admin creates relationship → POST /enrichment/mentoring (requires admin role)
  { mentorId, menteeId, startDate? }
  
Mentor views mentees → GET /enrichment/mentoring/as-mentor
  Returns: active relationships with 5 most recent logs

Mentee views mentors → GET /enrichment/mentoring/as-mentee
  Returns: active relationships with 5 most recent logs

Log session → POST /enrichment/mentoring/:relationshipId/logs
  { sessionDate, topic, outcome, followUp }
  Validates relationship exists before creating log

View logs → GET /enrichment/mentoring/:relationshipId/logs
  Returns: all logs ordered by sessionDate DESC
```

---

## Architecture Notes

- **260-line service**: 12 methods across 4 domains (spiritual, ngũ giới, evaluation, mentoring)
- **141-line controller**: 10 endpoints with Swagger + role guards
- **Privacy-first design**: ForbiddenException enforced at service layer, not middleware
- **Domain events**: 4 event types (SPIRITUAL_LOG_CREATED, NGU_GIOI_ASSESSED, EVALUATION_CREATED, MENTORING_STARTED)
- **Cao Đài doctrine**: thanhNgonRef links to Thánh Ngôn Hiệp Tuyển, Ngũ Giới maps to Five Precepts
- **Upsert pattern**: Ngũ Giới uses (orgMemberId, weekStart) compound unique for idempotent weekly updates
