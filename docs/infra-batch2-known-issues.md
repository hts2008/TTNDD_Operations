# Infrastructure Modules Batch 2 — Known Issues & Runbook

## Modules: notifications, file-storage, data-import, system
## Date: 2026-04-25
## Status: IMPLEMENTED — Production Ready (with known limitations)

---

## Notifications (STORY-025)

### NF-001: No push notification delivery backend (P2)
**Impact**: Notifications are stored in DB but not delivered via push/email/SMS
**Workaround**: Users check in-app notifications manually
**Plan**: Integrate Firebase Cloud Messaging + SendGrid

### NF-002: No real-time WebSocket notification (P2)
**Impact**: Users must refresh to see new notifications
**Workaround**: Poll unread-count endpoint
**Plan**: Add Socket.IO gateway for real-time push

### NF-003: Template variables not validated (P3)
**Impact**: Invalid {{variable}} references fail silently
**Plan**: Add template validation on upsert

---

## File Storage (STORY-026)

### FS-001: GCS adapter requires service account credentials (P1)
**Impact**: File upload/download fails without GOOGLE_APPLICATION_CREDENTIALS
**Workaround**: Use local storage adapter in dev
**Plan**: Document GCS setup in deployment guide

### FS-002: No file size limits enforced at API level (P2)
**Impact**: Large files could exhaust storage quota
**Plan**: Add configurable maxFileSizeBytes per org

### FS-003: No virus/malware scanning (P2)
**Impact**: Uploaded files are not scanned
**Plan**: Integrate Cloud DLP or ClamAV

---

## Data Import (STORY-027)

### DI-001: Only member import type implemented (P2)
**Impact**: Sessions, attendance, finance import not available
**Plan**: Add importSessions, importAttendance handlers

### DI-002: No progress tracking for large imports (P2)
**Impact**: Large CSV imports block the request
**Plan**: Move to background job with progress polling

### DI-003: No duplicate detection (P2)
**Impact**: Re-importing same CSV creates duplicate records
**Plan**: Add dedup by email/memberCode

---

## System (STORY-028)

### SYS-001: Synthetic probes are in-process only (P2)
**Impact**: Probes stop when API restarts
**Plan**: Add external uptime monitoring (Cloud Monitoring)

### SYS-002: Release gate reports have no retention policy (P3)
**Impact**: Reports accumulate indefinitely
**Plan**: Add auto-cleanup after 90 days

---

## Operator Runbook

### Notifications
```
My inbox → GET /notifications?page=1&limit=20&unreadOnly=false
Unread count → GET /notifications/unread-count
Mark read → PATCH /notifications/:id/read
Mark all read → PATCH /notifications/read-all
Preferences → GET /notifications/preferences
  Update → PATCH /notifications/preferences { channel, eventType, enabled }
Templates (admin) → GET /notifications/templates
  Upsert → POST /notifications/templates { eventType, channel, titleTemplate, bodyTemplate }
```

### File Storage
```
Upload request → POST /file-storage/upload-request { fileName, mimeType, fileSizeBytes, entityType?, entityId? }
  Returns: { signedUrl, fileRefId, expiresAt }
Download → GET /file-storage/:fileRefId/download-url
List files → GET /file-storage?entityType=member&entityId=...
Delete → DELETE /file-storage/:fileRefId (soft-delete, 204)
```

### Data Import
```
Get template → GET /data-import/template/:importType
  Returns: { csv: "header,row", importType }
Import (dry-run) → POST /data-import/members { csvContent, isDryRun: true }
  Returns: { totalRows, validRows, errors[] }
Import (commit) → POST /data-import/members { csvContent, isDryRun: false }
  Returns: { imported, skipped, errors[] }
History → GET /data-import/history?importType=members
```

### System
```
Health → GET /system/health (public, no auth)
Canary → GET /system/health/canary (public)
  Returns: { status, api, buildId, timestamp }
Probes → GET /system/health/probes (public)
  Returns: { overall, probes[] }
Module health → GET /system/module-health (auth required)
Seed health → GET /system/seed-health (auth required)
Release gates → GET /system/release-gates/latest (auth required)
  Save → POST /system/release-gates/report { version, environment, gates[], overallStatus }
```
