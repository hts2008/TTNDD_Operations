# PM Module — Known Issues

## STORY-011 Release Notes (2026-04-25)

### Open Issues

| ID     | Severity | Description                                                              | Workaround                 | ETA |
| ------ | -------- | ------------------------------------------------------------------------ | -------------------------- | --- |
| PM-001 | LOW      | Plan version history uses audit log (no dedicated PlanVersion table)     | Functional via audit trail | P2  |
| PM-002 | MEDIUM   | Calendar/Gantt FE renderer not yet implemented (API data adapter ready)  | Use task list view         | P2  |
| PM-003 | LOW      | EXP hooks publish event but reward module must consume it                | Manual reward entry        | P2  |
| PM-004 | MEDIUM   | Plan templates admin UI not built (only API + seed)                      | Use API directly           | P2  |
| PM-005 | LOW      | Comments/@mentions UI wired in projects page but plans page is list-only | Navigate to project        | P2  |

### Deferred (by design)

| Item                              | Reason                           | Target             |
| --------------------------------- | -------------------------------- | ------------------ |
| Gantt chart library integration   | FE framework decision pending    | P2 frontend sprint |
| Plan PDF export                   | Low priority, downstream feature | P3                 |
| Multi-org plan sharing            | Not in current scope             | Future             |
| PostgreSQL RLS for plans/projects | Deferred to security sprint      | P3                 |
