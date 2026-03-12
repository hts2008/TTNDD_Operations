# T-0920: Runbook — Troubleshoot, Import, Rebuild

> **Purpose:** AI agents (and humans) can diagnose, fix, and rebuild the platform
> **Generated:** 2026-03-12 | **STORY-009 / WP-9.4 / M9.4**

---

## Section 1: Common Error Troubleshooting

### P0 — Build Fails

| Error | Root Cause | Fix |
|-------|-----------|-----|
| `Cannot find module '@prisma/client'` | Prisma client not generated | `cd apps/api && npx prisma generate` |
| `Type 'X' is not assignable to 'Y'` | Schema drift | Re-run `npx prisma generate` after schema change |
| `P1001: Can't reach database` | DB not running or wrong URL | Check `DATABASE_URL` in `.env` |
| `P2002: Unique constraint failed` | Duplicate insert | Check unique fields in constraint-matrix.md |
| `P2003: Foreign key constraint failed` | Missing parent record | Ensure parent exists before child insert |
| `husky: command not found` | Husky not installed | `npx husky install` (or skip in CI with `HUSKY=0`) |

### P1 — Runtime Errors

| Error | Root Cause | Fix |
|-------|-----------|-----|
| `Migration not found` | Migration file deleted/renamed | `npx prisma migrate reset` (dev only) |
| `Port 3000 already in use` | Zombie node process | `npx kill-port 3000` or PowerShell: `Stop-Process -Name node -Force` |
| `401 Unauthorized` | Missing/expired token | Check Firebase token, ensure `Authorization: Bearer <token>` |
| `403 Forbidden` | Role not authorized | Check `@Roles()` decorator on endpoint |
| `org_id mismatch` | Multi-tenant isolation | Ensure `orgId` from JWT matches request scope |

### P2 — Data Issues

| Symptom | Check | Fix |
|---------|-------|-----|
| Missing member data | `org_members` table | Verify `orgId` + `userId` unique pair |
| Stale leaderboard | `leaderboard_snapshots` | Re-run snapshot job |
| SM stuck in wrong state | Status field value | Manual DB update + audit log |

---

## Section 2: Data Import Procedures

### CSV Import Flow
```
1. Upload CSV via /data-import endpoint
2. System creates ImportBatch record
3. Validate rows (schema, required fields, unique constraints)
4. Insert valid rows, collect errors
5. Return import summary
```

### Bulk Member Import Template
```csv
full_name,email,phone,role,branch_code,unit_name,birth_date,gender
"Nguyễn Văn A",a@demo.org,0901234567,member,KHA,"Đội Sao Mai",2012-05-15,male
```

### Import Rules
- Always validate `org_id` context
- Use transaction: all-or-nothing per batch
- Log every import in `import_batches` table
- Max batch size: 500 rows

---

## Section 3: Full Rebuild Procedure

### Dev Environment Reset
```bash
cd platform/apps/api

# 1. Reset database (WARNING: destroys all data)
npx prisma migrate reset --force

# 2. Re-generate client
npx prisma generate

# 3. Run seed (when available)
npx prisma db seed

# 4. Restart dev server
npm run dev
```

### Production Rebuild (Disaster Recovery)
```bash
# 1. Restore DB from backup
pg_restore -d $DATABASE_URL backup.dump

# 2. Check migration status
npx prisma migrate status

# 3. Apply any pending migrations
npx prisma migrate deploy

# 4. Re-generate Prisma client
npx prisma generate

# 5. Restart Cloud Run service
gcloud run services update ttndd-ops --region=asia-southeast1
```

---

## Section 4: Health Checks

### API Health
```bash
curl https://<host>/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Database Health
```bash
npx prisma db execute --stdin <<< "SELECT 1 as health;"
# Expected: health = 1
```

### Migration Status
```bash
npx prisma migrate status
# Expected: "Database schema is up to date!"
```

---

## Section 5: Environment Variables

| Variable | Required | Dev Default | Purpose |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ | `postgresql://...` | Prisma connection |
| `DIRECT_URL` | ✅ | Same as DATABASE_URL | Prisma migrations |
| `FIREBASE_PROJECT_ID` | ✅ | `ttndd-ops-dev` | Auth validation |
| `PORT` | ✅ | `3000` (dev), `8080` (Cloud Run) | Server port |
| `NODE_ENV` | ✅ | `development` | Environment mode |
| `GCP_PROJECT_ID` | For deploy | — | Cloud Run project |
| `GCS_BUCKET` | For files | — | File storage bucket |

---

## Section 6: Emergency Contacts

| Scenario | Action |
|----------|--------|
| DB corrupted | Restore from Cloud SQL backup (auto daily) |
| API crash loop | Check Cloud Run logs: `gcloud run services logs read` |
| Auth broken | Verify Firebase project config, check service account |
| Data leak suspected | Enable RLS immediately, audit `child_data_access_logs` |
