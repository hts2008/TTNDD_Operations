# Process Module — Operational Runbook

> T-1119: Runbook for operating the Process/SOP module in production

## 1. Module Overview

The Process module manages **SOP documents**, **workflow definitions**, **graph-based workflow execution**, and **workflow templates**. It serves DTNDD organizations with automated operational processes.

### Key Components

| Component        | Service                   | Purpose                                    |
| ---------------- | ------------------------- | ------------------------------------------ |
| SOP Library      | `SopService`              | Document versioning, approvals, tagging    |
| Workflow Engine  | `WorkflowExecutorService` | Graph execution, triggers, run history     |
| Template Library | `TemplateService`         | Built-in templates, install, import/export |

## 2. Health Check

```bash
# Check module health
GET /api/process/health
Authorization: Bearer <token>

# Expected response
{
  "module": "process",
  "status": "healthy",  # or "degraded" if stuck runs exist
  "metrics": {
    "totalDefinitions": 12,
    "stuckRuns": 0
  },
  "timestamp": "2026-03-14T..."
}
```

**Action thresholds:**

- `status: healthy` → No action needed
- `status: degraded` → Check stuck runs immediately

## 3. Stuck Run Management

### Detect stuck runs

```bash
GET /api/process/graph-runs/stuck?thresholdMinutes=60
```

### Auto-resolve stuck runs (>24h)

```bash
POST /api/process/auto-resolve-stuck
```

### Manual retry

```bash
POST /api/process/graph-runs/:runId/retry
```

### Escalation procedure

1. Check `/process/health` — if `stuckRuns > 0`, investigate
2. Run `GET /graph-runs/stuck?thresholdMinutes=30` for details
3. For runs < 24h: retry individually via `/retry`
4. For runs > 24h: use auto-resolve endpoint
5. If auto-resolve fails: check DB directly, may need manual status update

## 4. Template Seeding

When deploying to a new org or after migration:

```bash
POST /api/process/templates/seed
# Seeds 5 built-in templates: onboarding, fee-reminder, consent, incident, camp-checklist
```

## 5. Common Operations

### Export/Import Workflows

```bash
# Export
POST /api/process/definitions/:id/export
# → Returns JSON with nodes, edges, triggers

# Import
POST /api/process/definitions/import
Content-Type: application/json
{ "name": "...", "nodes": [...], "edges": [...] }
```

### Trigger Workflow

```bash
POST /api/process/trigger-event
{
  "eventType": "incident.reported",
  "payload": { ... }
}
```

## 6. Database Tables

| Table                | Count estimate      | Notes                 |
| -------------------- | ------------------- | --------------------- |
| `WorkflowDefinition` | 10-50 per org       | Main definitions      |
| `WorkflowRun`        | 100-1000+ per org   | Active/completed runs |
| `WorkflowRunLog`     | 5-20 per run        | Audit trail           |
| `WorkflowTemplate`   | 5 built-in + custom | Template catalog      |
| `SopDocument`        | 10-100 per org      | SOP documents         |
| `SopVersion`         | 1-10 per SOP        | Version history       |
| `SopApproval`        | 1 per version       | Approval records      |

## 7. Monitoring Alerts

| Alert                 | Condition           | Action                        |
| --------------------- | ------------------- | ----------------------------- |
| Stuck runs            | `stuckRuns > 0`     | Investigate and retry/resolve |
| Failed runs           | Run status `failed` | Check logs for error details  |
| Template seed failure | Seed returns error  | Check DB connectivity         |
| High run volume       | >100 active runs    | Scale considerations          |

## 8. Rollback Procedure

1. Revert the Process module migration
2. Restore `WorkflowDefinition` table from backup
3. Template data will be re-seeded on next deployment
4. SOP documents are versioned — rollback version if needed
