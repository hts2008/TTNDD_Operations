# Infrastructure Modules Batch 1 — Known Issues & Runbook

## Modules: child-safety, org-config, dashboards, sessions

## Date: 2026-04-25

## Status: IMPLEMENTED — Production Ready (with known limitations)

---

## Child Safety (STORY-021)

### CS-001: No notification on incident creation (P2)

**Impact**: Designated personnel not alerted when new incidents are reported
**Workaround**: Admins check incidents list regularly
**Plan**: Integrate with notification system

### CS-002: No incident timeline visualization (P2)

**Impact**: Escalation history only available via raw customFields
**Plan**: Build incident timeline component for frontend

### CS-003: Retention policy requires manual trigger (P2)

**Impact**: Admins must call POST /retention-policy
**Plan**: Add cron job for automatic weekly retention sweep

---

## Org Config (STORY-022)

### OC-001: No org deactivation/archival workflow (P2)

**Impact**: Organizations can only be created, not retired
**Plan**: Add soft-delete with cascading member status updates

### OC-002: Module toggle is boolean only (P2)

**Impact**: No per-module configuration (just on/off)
**Plan**: Add moduleConfig JSONB per enabled module

### OC-003: No branch merge capability (P3)

**Impact**: Cannot merge two branches when restructuring
**Plan**: Build branch merge with member reassignment

---

## Dashboards (STORY-023)

### DB-001: Real-time aggregation may be slow at scale (P2)

**Impact**: Org dashboard queries multiple tables simultaneously
**Workaround**: Acceptable for < 10,000 members
**Plan**: Add materialized views or caching layer

### DB-002: No dashboard customization (P2)

**Impact**: Fixed dashboard layout, no widget configuration
**Plan**: Add widget-based dashboard with drag-drop

### DB-003: Export format is TSV not true XLSX (P2)

**Impact**: Limited Excel compatibility (no formatting/formulas)
**Plan**: Add proper xlsx library (exceljs) for production exports

---

## Sessions (STORY-024)

### SS-001: No session template system (P2)

**Impact**: Cannot create recurring session templates
**Plan**: Add SessionTemplate model with cloning

### SS-002: No attendance notification (P2)

**Impact**: Members not notified about upcoming sessions
**Plan**: Integrate with notification + calendar systems

### SS-003: No session cancellation notification (P2)

**Impact**: Cancellation only updates status, no member notification
**Plan**: Integrate with notification system

---

## Operator Runbook

### Child Safety

```
Report incident → POST /child-safety/incidents { title, isAnonymous? }
  Creates ticket with isSensitive=true, priority=critical

View incidents → GET /child-safety/incidents (admin only)
Escalate → POST /child-safety/incidents/:id/escalate
Add evidence → POST /child-safety/incidents/:id/evidence { urls[] }
Export for council → GET /child-safety/incidents/:id/export

Safety checks:
  2-adult rule → GET /child-safety/validate-2-adult?staffCount=N
  Quiet hours → GET /child-safety/quiet-hours (22:00-07:00)
  Retention → POST /child-safety/retention-policy (super_admin, 90-day)
```

### Org Config

```
Create org → POST /organizations { slug, name }
Get org → GET /organizations/:slug
Update info → PATCH /organizations/:id/info
Update settings → PATCH /organizations/:id/settings (JSONB merge)
Toggle module → PATCH /organizations/:id/modules/:name { enabled }

Branches:
  List → GET /organizations/:id/branches
  Create → POST /organizations/:id/branches { code, name, minAge, maxAge }
  Delete → DELETE /organizations/:id/branches/:branchId (safety check)

Units:
  List → GET /organizations/:id/units?branchId=
  Create → POST /organizations/:id/units { branchId, name, totemName }
  Delete → DELETE /organizations/:id/units/:unitId (safety check)

Audit → GET /organizations/:id/audit-log?action=&resource=&from=&to=
```

### Dashboards

```
Org overview → GET /dashboards/org (admin)
SPICES → GET /dashboards/spices (admin)
Personal → GET /dashboards/my (member)
Member report → GET /dashboards/members/:id/report (admin)
Finance → GET /dashboards/finance?from=&to= (admin)
Attendance → GET /dashboards/attendance?from=&to=&branchId= (admin)
Search → GET /dashboards/search?q= (min 2 chars)
Export CSV → GET /dashboards/export/csv?resource=[members|attendance|finance|skills]
Export Excel → GET /dashboards/export/excel?resource=...
```

### Sessions

```
Create → POST /sessions { branchId, title, sessionDate, pillar* }
List → GET /sessions?branchId=&status=&from=&to=&page=&limit=
Detail → GET /sessions/:id
Update → PATCH /sessions/:id { debriefNotes, energyRating }
Transition → POST /sessions/:id/transition { action: publish|start|complete|archive|cancel }
Attendance → POST /sessions/:id/attendance { records: [{ memberId, status }] }
Report → GET /sessions/attendance/report/:memberId
```
