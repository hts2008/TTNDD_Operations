# LMS Module — Known Issues & Operator Runbook

## Module: STORY-016 LMS

## Date: 2026-04-25

## Status: IMPLEMENTED — Production Ready (with known limitations)

---

## Known Issues

### LMS-001: Mentor assignment is a stub (P2)

**Severity**: Medium
**Impact**: `assignMentor()` throws `BadRequestException` — not yet implemented
**Workaround**: Use Enrichment module's MentoringRelationship model directly
**Plan**: Create MentorAssignment model and implement in P2

### LMS-002: Delay-based quiz expiration is passive only (P2)

**Severity**: Medium
**Impact**: Quiz timeLimit is checked on submission, but no background timer auto-expires in-progress attempts
**Workaround**: Users must submit before time limit; expired status set on late submission
**Plan**: Add background job (BullMQ/cron) to auto-expire stale attempts

### LMS-003: Battle WebSocket has no auth middleware (P2)

**Severity**: High
**Impact**: WebSocket gateway reads orgId/userId from query params without JWT verification
**Workaround**: Acceptable for internal/trusted networks only
**Plan**: Add WebSocket auth guard with JWT verification in P2

### LMS-004: No file/media upload for lesson content (P2)

**Severity**: Medium
**Impact**: Lesson videoUrl and content images are URL-only; shared signed upload exists but LMS is not integrated with FileObjectRef/finalize lifecycle
**Workaround**: Use external file hosting (GCS, S3) and paste URLs
**Plan**: Integrate LMS media fields with File Storage finalize/scan flow in P2

### LMS-005: PWA offline cache not implemented (P2)

**Severity**: Low
**Impact**: Offline packs generate JSON data but no PWA service worker caches it
**Workaround**: Manual JSON download/save for offline reference
**Plan**: Implement PWA service worker with cache-first strategy in P2

### LMS-006: Battle countdown uses setTimeout (P2)

**Severity**: Low
**Impact**: 3-second countdown uses server-side setTimeout — not reliable at scale
**Workaround**: Works for small-group battles (< 20 players)
**Plan**: Replace with distributed timer or client-side countdown in P2

### LMS-007: Course publish requires manual status update (P3)

**Severity**: Low
**Impact**: No draft→published state machine for courses — status is a free text field
**Workaround**: Admin manually sets status to "published" via PATCH
**Plan**: Add formal course publishing state machine in P3

---

## Deferred Features

| Feature                    | Priority | Reason                                                  |
| -------------------------- | -------- | ------------------------------------------------------- |
| Mentor assignment model    | P2       | Needs MentorAssignment table                            |
| Background quiz expiration | P2       | Requires BullMQ                                         |
| WebSocket JWT auth         | P2       | Security hardening                                      |
| File/media upload          | P2       | Requires module integration with File Storage lifecycle |
| PWA offline caching        | P2       | Frontend feature                                        |
| Battle scalability         | P2       | setTimeout → distributed timer                          |
| Course state machine       | P3       | Low demand                                              |
| Certificate generation     | P3       | PDF/image generation                                    |
| Leaderboards (global)      | P3       | Cross-course ranking                                    |
| PostgreSQL RLS for LMS     | P3       | App-level auth sufficient                               |

---

## Operator Runbook

### 1. Course Management

```
Create course → Set category, difficulty, targetBranches
Add modules → Order by index (drag-drop in UI)
Add lessons → Assign to module or directly to course
Set completion rules → "all_lessons" or "min_score"
Publish → PATCH status to "published"
```

**Key rule**: Deleting a course cascades to all modules, lessons, and progress records.

### 2. Quiz Lifecycle

```
Create quiz → Set timeLimit (seconds), passingScore (0-100), maxRetries
Add questions → MCQ (auto-gradable) or essay (manual grading)
  MCQ: set options + correctAnswer + points
  Essay: set points only (graded manually)
Start attempt → POST /quizzes/:id/attempts/start { memberId }
Submit answers → POST /attempts/:id/submit { answers: [...] }
  Auto-graded: immediate score + pass/fail
  Has essay: status = "submitted" → enters grading queue
Manual grade → POST /attempts/:id/grade { score, passed, feedback }
```

### 3. Battle Arena Hosting

```
Create battle → POST /quizzes/:quizId/battles { maxPlayers }
  Returns gameCode (6-char alphanumeric)
Share gameCode → Players join via POST /battles/:code/join
Start → Host calls POST /battles/:code/start (min 2 players)
  Server broadcasts countdown (3s) then questions via WebSocket
Play → Players submit answers via WebSocket (submitAnswer event)
  Anti-cheat: 2-second minimum interval between answers
  Speed bonus: faster correct answers score higher (100 * speedFactor)
Finish → Host calls POST /battles/:code/finish
  Rankings broadcast to all players
```

**WebSocket namespace**: `/lms-battle`
**Events**: `playerJoined`, `countdown`, `battleStarted`, `scoreUpdate`, `battleEnd`, `playerLeft`

### 4. Competency Mapping

```
Create competency → POST /competencies { competencyCode, name, category }
Map to course → POST /courses/:id/competencies { competencyId }
Set completion rules → POST /courses/:id/completion-rules { ruleType, config }
Check completion → GET /courses/:id/completion-check/:memberId
  Returns { allPassed, results: [{ ruleType, passed }] }
```

### 5. Offline Packs

```
Check size → GET /courses/:id/pack-size
  Returns { estimatedSizeKB, withinLimit }
  Limit: 5MB per pack
Generate → GET /courses/:id/offline-pack
  Returns JSON with all lessons, modules, quizzes (answers stripped)
  Version field for cache invalidation
```

### 6. Grading Queue Management

```
View queue → GET /grading-queue
  Returns all attempts with status="submitted" (pending manual grading)
  Ordered by submittedAt (oldest first)
Grade → POST /attempts/:id/grade { score, passed, feedback }
  Updates status to "graded", publishes QUIZ_PASSED or QUIZ_FAILED event
```

---

## Architecture Notes

- **1,245-line service**: 38 methods across courses, modules, lessons, competencies, quizzes, battles, progress, grading, offline
- **WebSocket gateway**: 145 lines, Socket.IO namespace `/lms-battle`, 4 event handlers
- **Controller**: 308 lines, 35+ endpoints
- **State machines**: 4 distinct (battle, attempt, course progress, lesson progress)
- **Anti-cheat**: 2-second interval + duplicate answer guard + speed-bonus scoring
- **Domain events**: 12+ event types published across all LMS actions
- **Audit logging**: All state transitions logged with actor tracking
