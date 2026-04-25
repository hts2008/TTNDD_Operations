# Finance Module — Known Issues

## STORY-013 Release Notes (2026-04-25)

### Open Issues

| ID      | Severity | Description                                                         | Workaround                         | ETA |
| ------- | -------- | ------------------------------------------------------------------- | ---------------------------------- | --- |
| FIN-001 | LOW      | Cost centers stored in org.settings JSON (not dedicated table)      | Functional, limited to ~50 centers | P2  |
| FIN-002 | MEDIUM   | Fee plan auto-generation not implemented (template only)            | Manually create fees per member    | P2  |
| FIN-003 | LOW      | Sponsor records in org.settings (no relational model)               | Functional, limited queries        | P2  |
| FIN-004 | MEDIUM   | Balance projection is point-in-time (no recurring pattern analysis) | Shows pending + expected only      | P2  |
| FIN-005 | LOW      | Export returns JSON (no actual CSV/Excel file generation)           | Client-side conversion needed      | P2  |
| FIN-006 | MEDIUM   | No double-entry ledger (debit/credit columns)                       | Single-amount with type flag       | P2  |

### Deferred (by design)

| Item                            | Reason                                                 | Target |
| ------------------------------- | ------------------------------------------------------ | ------ |
| Double-entry ledger             | Complexity exceeds scouting org needs at current scale | P2     |
| Fee plan auto-generation (cron) | Requires BullMQ worker infrastructure                  | P2     |
| PDF/Excel file export           | Requires server-side file generation library           | P2     |
| PostgreSQL RLS for finance      | Deferred to security sprint                            | P3     |
| Multi-currency support          | VND-only at current scale                              | P3     |

### Operator Runbook (T-1080)

#### Transaction Reversal

1. Admin navigates to transaction detail
2. Clicks "Reverse" → confirms
3. System auto-adjusts account balance (adds back for expense, removes for income)
4. Audit trail records the reversal with actor + timestamp

#### Fee Correction

1. Admin cannot edit fee amount after creation
2. To correct: waive incorrect fee (with reason) → create new fee with correct amount
3. All waivers logged in audit trail

#### Budget Over-run Alert

1. Check `GET /finance/budget-variance`
2. Status field shows: `on_track` | `warning` (>90%) | `over_budget`
3. No automatic notification yet (P2: email/in-app alerts)

#### Reconciliation Check

1. Call `GET /finance/reconciliation`
2. Compares stored balance vs sum of completed transactions
3. If `isReconciled: false` → investigate missing/duplicate transactions
4. Difference field shows exact variance amount
