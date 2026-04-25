# Events/Camp Module — Known Issues & Operator Runbook

## Module: STORY-018 Events/Camp
## Date: 2026-04-25
## Status: IMPLEMENTED — Production Ready (with known limitations)

---

## Known Issues

### EVT-001: No calendar/iCal integration (P2)
**Severity**: Medium
**Impact**: Events are system-only — no export to Google Calendar, Outlook, or iCal
**Workaround**: Manual calendar entries based on event dates
**Plan**: Add iCal export endpoint and Google Calendar API integration

### EVT-002: Weather backup is text-only (P2)
**Severity**: Low
**Impact**: `weatherBackup` field is a string — no weather API integration
**Workaround**: Event organizers manually check weather forecasts
**Plan**: Integrate weather API for automatic alerts before outdoor events

### EVT-003: No waitlist for full events (P2)
**Severity**: Medium
**Impact**: When maxParticipants reached, registration returns error — no waitlist
**Workaround**: Manually increase maxParticipants or create overflow event
**Plan**: Add waitlist queue with auto-promote on cancellation

### EVT-004: No email/SMS notifications for event updates (P2)
**Severity**: Medium
**Impact**: Status transitions and registration changes don't trigger notifications
**Workaround**: Manual communication via chat/phone
**Plan**: Add notification event consumers for key transitions

### EVT-005: Emergency plan is not structured (P3)
**Severity**: Low
**Impact**: `emergencyPlan` is a free-text field — no structured template
**Workaround**: Use text-based emergency procedures
**Plan**: Create structured emergency plan template with required fields

### EVT-006: Post-event report has no template (P3)
**Severity**: Low
**Impact**: `postEventReport` is freeform JSON — no standardized structure
**Workaround**: Admins create consistent reports manually
**Plan**: Define report template with required metrics (attendance, budget, feedback)

### EVT-007: No recurring events support (P3)
**Severity**: Low
**Impact**: Each event must be created individually — no recurrence rules
**Workaround**: Manual duplication for recurring meetings
**Plan**: Add RRULE-based recurrence with auto-generation

---

## Deferred Features

| Feature | Priority | Reason |
|---------|----------|--------|
| Calendar/iCal integration | P2 | Needs external API |
| Weather API integration | P2 | Needs API key + cron |
| Waitlist queue | P2 | Medium complexity |
| Event notifications | P2 | Needs notification consumer |
| Structured emergency plan | P3 | Low demand |
| Report template | P3 | Low demand |
| Recurring events | P3 | Complex domain logic |
| Event photos/media gallery | P3 | Needs file upload |
| Attendance analytics | P3 | Dashboard feature |
| PostgreSQL RLS for Events | P3 | App-level auth sufficient |

---

## Operator Runbook

### 1. Event Creation & Setup

```
Create event → POST /events { title, eventType, startDate, endDate, location, maxParticipants }
  - eventType: "camp", "meeting", "service", "training", "ceremony"
  - targetBranches: optional filter for branch-specific events
  - schedule: JSON day-by-day activity plan
  - raciMatrix: { responsible: [], accountable: "", consulted: [], informed: [] }
  - riskAssessment: { category: { risk, mitigation } }
  - expReward: EXP points awarded on completion
```

### 2. SM-13 Event Lifecycle

```
planning → [propose] → proposed → [approve] → approved
  → [open_registration] → registration_open → [go_live] → go_live
  → [start] → in_progress → [complete] → completed → [submit_report] → reported

Special transitions:
  - proposed → [reject] → planning (send back for revision)
  - registration_open → [close_registration] → approved (close early)

Safety gate (before go_live):
  ⚠️ RACI matrix must be set (raciMatrix != null)
  ⚠️ Safety checklist must have two_adult_rule = true
  → If either missing: BadRequestException thrown
```

### 3. Registration Flow

```
1. Admin opens registration → POST /events/:id/transition { action: "open_registration" }
2. Members register → POST /events/:id/register
   - Checks: event status must be registration_open or approved
   - Checks: current registrations < maxParticipants
3. Guardian signs consent → POST /events/:id/consent { consentBy: "parent-name" }
   - Records: consentSigned=true, consentDate, consentBy
4. Check-in on event day → POST /events/:id/check-in/:memberId
   - Records: checkInTime, status=checked_in
   - Requires admin role
```

### 4. Safety Compliance

```
Before go_live, ensure:
  ✅ RACI matrix assigned (POST /events/:id with raciMatrix)
  ✅ Safety checklist completed with two_adult_rule=true
  ✅ Risk assessment documented (riskAssessment field)

Optional but recommended:
  - weatherBackup plan for outdoor events
  - emergencyPlan documented
  - All guardians have signed consent
```

### 5. Post-Event Reporting

```
After event completes:
1. Transition to completed → POST /events/:id/transition { action: "complete" }
2. Submit report → PATCH /events/:id { postEventReport: { ... } }
3. Transition to reported → POST /events/:id/transition { action: "submit_report" }
```

---

## Architecture Notes

- **206-line service**: 9 methods — create, findMany, findById, update, transition, register, signConsent, checkIn, validateSafetyGates
- **103-line controller**: 7 endpoints with Swagger + role guards
- **SM-13**: 8 states with 2 reject/close loops
- **Safety gate**: Hard-coded 2-adult rule check before go_live
- **Domain events**: 5 event types (CREATED, REGISTRATION_OPENED, CONSENT_RECEIVED, CHECKED_IN, COMPLETED)
- **Audit**: Event updates logged with actor tracking
- **Child safety**: 2-adult rule is non-negotiable gate
