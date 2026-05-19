# Process/SOP Module — Known Issues & Operator Runbook

## Module: STORY-015 Process/SOP

## Date: 2026-04-25

## Status: IMPLEMENTED — Production Ready (with known limitations)

---

## Known Issues

### PROC-001: React Flow builder not live-synced to backend (P2)

**Severity**: Medium
**Impact**: Users must manually save graph changes; no auto-save
**Workaround**: Click "Save" button explicitly after editing nodes/edges
**Plan**: Add debounced auto-save in P2 frontend polish sprint

### PROC-002: Delay nodes are declarative only (P2)

**Severity**: Medium
**Impact**: Delay nodes store `delayMinutes` but executor does not actually wait — advances immediately
**Workaround**: Use external timer or manual step advancement after delay period
**Plan**: Use existing worker/BullMQ infrastructure and implement real delay job semantics in P2

### PROC-003: Parallel branch execution not supported (P2)

**Severity**: Low
**Impact**: When multiple edges leave a non-condition node, only the first target is followed
**Workaround**: Design workflows as linear chains; use condition nodes for branching
**Plan**: Implement fork/join pattern in executor — deferred P2

### PROC-004: SOP rich text stored as TipTap JSON, no attachment upload (P2)

**Severity**: Low
**Impact**: SOP content supports JSON structure but attachments are URL-only; shared signed upload exists but SOP is not integrated with FileObjectRef/finalize lifecycle
**Workaround**: Use external file hosting and paste URLs into content
**Plan**: Integrate SOP attachments with File Storage finalize/scan flow in P2

### PROC-005: Trigger conditions are exact-match only (P3)

**Severity**: Low
**Impact**: Trigger condition matching uses strict equality, no regex or range operators
**Workaround**: Keep trigger conditions simple (single field exact match)
**Plan**: Add operator support (>, <, contains, regex) in trigger condition evaluator

### PROC-006: No notification delivery backend (P2)

**Severity**: Medium
**Impact**: Notification nodes publish domain events, worker infrastructure exists, but notification processor does not yet send actual emails/SMS
**Workaround**: Subscribe to `workflow.notification.requested` events manually or via logs
**Plan**: Integrate with notification service when available

---

## Deferred Features

| Feature                               | Priority | Reason                                      |
| ------------------------------------- | -------- | ------------------------------------------- |
| Parallel branch execution             | P2       | Requires fork/join state tracking           |
| Delay node timer                      | P2       | Requires worker delay job logic             |
| Auto-save graph builder               | P2       | Frontend UX improvement                     |
| File attachment upload for SOPs       | P2       | Requires File Storage lifecycle integration |
| Rich trigger conditions               | P3       | Current exact-match is sufficient           |
| Workflow versioning (run old version) | P3       | Low demand for now                          |
| SOP read tracking / acknowledgment    | P3       | Track who read which SOP version            |
| PostgreSQL RLS for process tables     | P3       | App-level auth sufficient for now           |

---

## Operator Runbook

### 1. SOP Document Lifecycle

```
Create SOP → Auto-creates version 1 (draft)
Edit version content → Submit for review
Review → Approve or Reject
  If approved → Publish version → Document becomes "published"
  If rejected → Revise → Re-submit
Archive document → No more versions can be added
```

**Key rule**: Only draft documents can have metadata edits. Published documents require new versions.

### 2. Workflow Definition Management

```
Create definition → Add linear steps OR save graph (nodes + edges)
Activate definition → Can now start runs
  Linear runs: POST /process/runs → advance step by step
  Graph runs: POST /process/graph-runs → execute node by node
Deactivate → Existing runs continue, no new runs can start
```

### 3. Trigger-Based Workflow Execution

```
When event occurs (e.g., member.created):
  POST /process/graph-runs/trigger { eventType, payload }
  → Scans ALL active definitions for matching triggers
  → Auto-starts graph runs for each match
```

**Monitoring**: Check `/process/health` for module status and stuck run count.

### 4. Stuck Run Resolution

```
GET /process/graph-runs/stuck?thresholdMinutes=60
  → Lists runs idle for more than threshold minutes

POST /process/graph-runs/:id/retry
  → Flags run for retry at current stuck node

POST /process/auto-resolve-stuck
  → Cancels ALL runs stuck > 24 hours
```

### 5. Template Management

```
GET /process/templates → List available templates
POST /process/templates/:slug/install → Creates definition from template
POST /process/definitions/:id/export → Export as portable JSON
POST /process/definitions/import → Import from JSON
POST /process/templates/seed → Re-seed built-in templates (super_admin only)
```

### 6. Emergency: SOP Locked in Wrong State

If an SOP document is stuck in an incorrect state, an admin can:

1. Check current status: `GET /process/sops/:id`
2. If published and needs revision: Create new version, don't modify published version
3. If needs archival: `POST /process/sops/:id/archive`
4. Direct DB fix (last resort): Update `status` field in `SopDocument` table

---

## Architecture Notes

- **4 service files**: sop.service.ts (459L), process.service.ts (~250L), workflow-executor.service.ts (683L), template.service.ts (~500L)
- **Controller**: 429 lines, 40+ endpoints across SOP, definitions, runs, graph-runs, templates, health
- **State machines**: 4 distinct (SOP doc, SOP version, workflow run, node execution)
- **Domain events**: Published on SOP create/publish, workflow start/complete, notification requests
- **Audit logging**: All state transitions are audit-logged with actor and resource tracking
