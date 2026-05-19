# Assets Module — Known Issues & Operator Runbook

## STORY-014 Release Notes (2026-04-25)

### Open Issues

| ID      | Severity | Description                                                                                 | Workaround                              | ETA |
| ------- | -------- | ------------------------------------------------------------------------------------------- | --------------------------------------- | --- |
| AST-001 | LOW      | Kit pack checklist state is in-memory only                                                  | Regenerate from template each session   | P2  |
| AST-002 | LOW      | QR code requires `qrcode` npm package installed                                             | Falls back to error if missing          | —   |
| AST-003 | MEDIUM   | No notification for overdue loans                                                           | Manual check via GET /loans/overdue     | P2  |
| AST-004 | LOW      | Maintenance completion resets to 'completed' but no 'pending' auto-re-create                | Manual re-create or auto-reset via cron | P2  |
| AST-005 | LOW      | Asset photos stored as URLs only; module not integrated with FileObjectRef upload lifecycle | Upload to external storage, paste URL   | P2  |

### Deferred (by design)

| Item                           | Reason                                     | Target |
| ------------------------------ | ------------------------------------------ | ------ |
| Barcode/QR scanner integration | Requires mobile app or camera API          | P2     |
| Depreciation tracking          | Financial complexity beyond scouting needs | P3     |
| Multi-location transfers       | Single-location model sufficient for now   | P2     |
| PostgreSQL RLS for assets      | Deferred to security sprint                | P3     |
| Push notifications for overdue | Requires notification service (BullMQ)     | P2     |

### Operator Runbook (T-1100)

#### Asset Loan Flow

1. Member requests loan → status `pending`
2. If minor → `guardianAcceptanceStatus = 'pending'` → guardian must accept first
3. Admin approves → `approved`
4. Admin checks out → `checked_out` → `availableQty` decremented
5. Asset returned → `returned` → `availableQty` incremented
6. If lost → `lost` → manual follow-up needed

#### Stock Alert Check

1. Call `GET /assets/stock-alerts?threshold=5`
2. Severity levels: `critical` (0 available), `high` (≤2), `low` (≤5)
3. FE shows yellow banner automatically when alerts exist

#### Maintenance Completion

1. Admin calls `POST /assets/maintenance/:id/complete`
2. System sets `status: completed`, `lastPerformed: now`
3. Auto-calculates `nextDue` based on frequency (daily/weekly/monthly/quarterly/yearly)

#### Uniform Issue/Return

1. Admin issues via `POST /assets/uniform/issue` with member, type, size
2. On return: `POST /assets/uniform/:id/return` with status (returned/lost/damaged)
3. Filter by member or status via `GET /assets/uniform`

#### Kit Checklist Generation

1. Create kit template with items via `POST /assets/kits`
2. Generate checklist via `POST /assets/kits/:templateId/checklist`
3. Checklist is ephemeral — regenerate per event/session

#### CSV Export

1. Assets: `GET /assets/export/csv` → returns `{ csv, filename }`
2. Loans: `GET /assets/loans/export/csv` → returns `{ csv, filename }`
3. FE auto-triggers browser download via Blob URL
