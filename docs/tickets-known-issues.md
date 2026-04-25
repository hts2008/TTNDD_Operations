# Tickets Module — Known Issues

## STORY-012 Release Notes (2026-04-25)

### Open Issues

| ID     | Severity | Description                                                     | Workaround                          | ETA |
| ------ | -------- | --------------------------------------------------------------- | ----------------------------------- | --- |
| TK-001 | LOW      | Approval uses customFields (no dedicated ApprovalRequest table) | Functional via JSON field           | P2  |
| TK-002 | MEDIUM   | Multi-step approval chain not implemented (single-level only)   | Escalate manually for complex flows | P2  |
| TK-003 | LOW      | Category routing returns static map (not configurable per org)  | Edit code for new categories        | P2  |
| TK-004 | LOW      | Consent templates not admin-editable (hardcoded)                | Use API directly                    | P2  |
| TK-005 | MEDIUM   | SLA timers are calculation-only (no background job for alerts)  | Dashboard shows overdue count       | P2  |

### Deferred (by design)

| Item                                | Reason                                         | Target |
| ----------------------------------- | ---------------------------------------------- | ------ |
| Multi-step approval workflow engine | Complexity; single-level sufficient for launch | P2     |
| SLA background alert jobs           | Requires BullMQ worker infrastructure          | P2     |
| Ticket PDF export                   | Low priority downstream feature                | P3     |
| PostgreSQL RLS for tickets          | Deferred to security sprint                    | P3     |
