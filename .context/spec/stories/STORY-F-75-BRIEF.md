# STORY-F-75 Brief: Exam Lifecycle Management

## 0. Lane & Priority

```yaml
story_id: STORY-F-75
old_id: S-F-27-4
lane: faculty
lane_priority: 3
within_lane_order: 75
sprint: 30
size: M
depends_on:
  - STORY-F-73 (faculty) — Cohort Assignment (assignment creates initial lifecycle entry)
blocks: []
personas_served: [faculty, institutional_admin]
epic: E-27 (Exam Assignment & Export)
feature: F-12 (Exam Assembly & Delivery)
user_flow: UF-20 (Exam Assembly & Assignment)
cross_epic_note: "Auto-transitions use Inngest scheduled jobs"
```

## 1. Summary

Build an **exam lifecycle management** system with a state machine enforcing valid status transitions (`draft -> assigned -> active -> completed -> archived`), an append-only audit trail for every transition, auto-transitions triggered by Inngest cron jobs (assigned -> active at scheduled start, active -> completed at scheduled end), manual admin overrides with reason, and status badge UI components.

This is the final story in E-27 (Exam Assignment & Export): F-73 (assignment) -> F-74 (export) -> **F-75 (lifecycle)**.

Key constraints:
- **Explicit state machine** with transition map and guards
- Invalid transitions rejected (e.g., draft -> completed)
- Inngest cron job checks every minute for time-based transitions
- Audit trail is append-only in `exam_audit_log` table
- Admin can force-transition with reason
- Status badge is a reusable atom component in packages/ui
- Notification stub on status change (connects to E-34)

## 2. Task Breakdown

1. **Types** — Create `ExamLifecycleStatus`, `StatusTransition`, `AuditTrailEntry`, `TransitionRequest`, `AuditTrailResponse` in `packages/types/src/exam/lifecycle.types.ts`
2. **Migration** — Create `exam_audit_log` table in Supabase via MCP
3. **Error classes** — `InvalidTransitionError`, `TransitionGuardError` in `apps/server/src/modules/exam/errors/lifecycle.errors.ts`
4. **Model** — `ExamStatusMachine` with explicit transition map, guards, and `canTransition()` / `transition()` methods
5. **Repository** — `ExamAuditRepository` for append-only audit log operations
6. **Service** — `ExamLifecycleService` with `transition()`, `forceTransition()`, `getAuditTrail()` methods
7. **Controller** — `ExamLifecycleController` with `handleTransition()`, `handleGetAuditTrail()` methods
8. **Routes** — Protected routes `PATCH /api/v1/exams/:examId/status` and `GET /api/v1/exams/:examId/audit-trail` with RBAC
9. **Inngest job** — `ExamStatusTransitionJob` cron (every minute) for auto-transitions
10. **Frontend components** — `ExamStatusBadge` (atom), `AuditTrailTimeline` (organism)
11. **API tests** — 14 tests covering state machine, transitions, audit trail, Inngest job

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/exam/lifecycle.types.ts

/** All possible exam statuses */
export type ExamLifecycleStatus = "draft" | "assigned" | "active" | "completed" | "archived";

/** Valid transition definition */
export interface TransitionDefinition {
  readonly from: ExamLifecycleStatus;
  readonly to: ExamLifecycleStatus;
  readonly auto: boolean;                  // true = triggered by Inngest, false = manual
  readonly requires_reason: boolean;       // true for force transitions
}

/** Request to transition exam status */
export interface TransitionRequest {
  readonly target_status: ExamLifecycleStatus;
  readonly reason?: string;                // required for force transitions
  readonly force?: boolean;                // admin override
}

/** Transition result */
export interface TransitionResult {
  readonly exam_id: string;
  readonly previous_status: ExamLifecycleStatus;
  readonly new_status: ExamLifecycleStatus;
  readonly transitioned_by: string;
  readonly transitioned_at: string;
  readonly auto: boolean;
  readonly reason: string | null;
  readonly audit_log_id: string;
}

/** Single audit trail entry */
export interface AuditTrailEntry {
  readonly id: string;
  readonly exam_id: string;
  readonly previous_status: ExamLifecycleStatus;
  readonly new_status: ExamLifecycleStatus;
  readonly transitioned_by: string;
  readonly transitioned_by_name: string;
  readonly reason: string | null;
  readonly auto: boolean;
  readonly created_at: string;
}

/** Audit trail response */
export interface AuditTrailResponse {
  readonly exam_id: string;
  readonly exam_title: string;
  readonly current_status: ExamLifecycleStatus;
  readonly entries: readonly AuditTrailEntry[];
}

/** Transition map: explicit valid transitions */
export const EXAM_TRANSITION_MAP: readonly TransitionDefinition[] = [
  { from: "draft", to: "assigned", auto: false, requires_reason: false },
  { from: "assigned", to: "active", auto: true, requires_reason: false },
  { from: "active", to: "completed", auto: true, requires_reason: false },
  { from: "completed", to: "archived", auto: false, requires_reason: false },
  // Force transitions (admin only)
  { from: "assigned", to: "draft", auto: false, requires_reason: true },
  { from: "active", to: "completed", auto: false, requires_reason: true },
  { from: "assigned", to: "archived", auto: false, requires_reason: true },
] as const;

/** Status badge display configuration */
export interface StatusBadgeConfig {
  readonly status: ExamLifecycleStatus;
  readonly label: string;
  readonly color: string;
  readonly icon: string;
}

/** Status badge color mapping */
export const STATUS_BADGE_MAP: Record<ExamLifecycleStatus, StatusBadgeConfig> = {
  draft: { status: "draft", label: "Draft", color: "gray", icon: "pencil" },
  assigned: { status: "assigned", label: "Assigned", color: "blue", icon: "calendar" },
  active: { status: "active", label: "Active", color: "green", icon: "play" },
  completed: { status: "completed", label: "Completed", color: "purple", icon: "check" },
  archived: { status: "archived", label: "Archived", color: "gray", icon: "archive" },
};
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_exam_audit_log

CREATE TABLE IF NOT EXISTS exam_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL
    CHECK (previous_status IN ('draft', 'assigned', 'active', 'completed', 'archived')),
  new_status TEXT NOT NULL
    CHECK (new_status IN ('draft', 'assigned', 'active', 'completed', 'archived')),
  transitioned_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT,
  auto BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only: no UPDATE or DELETE policies
CREATE INDEX IF NOT EXISTS idx_exam_audit_log_exam
  ON exam_audit_log(exam_id);

CREATE INDEX IF NOT EXISTS idx_exam_audit_log_created
  ON exam_audit_log(exam_id, created_at DESC);

-- RLS
ALTER TABLE exam_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can read audit log for own exams"
  ON exam_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exams WHERE exams.id = exam_audit_log.exam_id AND exams.created_by = auth.uid()
    )
  );

CREATE POLICY "System can insert audit entries"
  ON exam_audit_log FOR INSERT
  WITH CHECK (true);
```

## 5. API Contract (complete request/response)

### PATCH /api/v1/exams/:examId/status (Auth: Faculty, Admin for force)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `examId` | string (UUID) | The exam to transition |

**Request Body:**
```json
{
  "target_status": "archived",
  "reason": "Exam retired after semester end",
  "force": false
}
```

**Success Response (200):**
```json
{
  "data": {
    "exam_id": "exam-uuid-1",
    "previous_status": "completed",
    "new_status": "archived",
    "transitioned_by": "faculty-uuid-1",
    "transitioned_at": "2026-06-01T10:00:00Z",
    "auto": false,
    "reason": "Exam retired after semester end",
    "audit_log_id": "audit-uuid-1"
  },
  "error": null
}
```

### GET /api/v1/exams/:examId/audit-trail (Auth: Faculty)

**Success Response (200):**
```json
{
  "data": {
    "exam_id": "exam-uuid-1",
    "exam_title": "USMLE Step 1 Practice Exam",
    "current_status": "archived",
    "entries": [
      {
        "id": "audit-4",
        "exam_id": "exam-uuid-1",
        "previous_status": "completed",
        "new_status": "archived",
        "transitioned_by": "faculty-uuid-1",
        "transitioned_by_name": "Dr. Jane Smith",
        "reason": "Exam retired after semester end",
        "auto": false,
        "created_at": "2026-06-01T10:00:00Z"
      },
      {
        "id": "audit-3",
        "exam_id": "exam-uuid-1",
        "previous_status": "active",
        "new_status": "completed",
        "transitioned_by": "system",
        "transitioned_by_name": "System (Auto)",
        "reason": null,
        "auto": true,
        "created_at": "2026-03-15T12:00:00Z"
      },
      {
        "id": "audit-2",
        "exam_id": "exam-uuid-1",
        "previous_status": "assigned",
        "new_status": "active",
        "transitioned_by": "system",
        "transitioned_by_name": "System (Auto)",
        "reason": null,
        "auto": true,
        "created_at": "2026-03-15T09:00:00Z"
      },
      {
        "id": "audit-1",
        "exam_id": "exam-uuid-1",
        "previous_status": "draft",
        "new_status": "assigned",
        "transitioned_by": "faculty-uuid-1",
        "transitioned_by_name": "Dr. Jane Smith",
        "reason": null,
        "auto": false,
        "created_at": "2026-02-20T14:00:00Z"
      }
    ]
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role or not exam owner (force requires admin) |
| 400 | `INVALID_TRANSITION` | Transition not allowed (e.g., draft -> completed) |
| 400 | `REASON_REQUIRED` | Force transition without reason |
| 404 | `NOT_FOUND` | Exam not found |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Component 1: Exam Status Badge (Atom — reusable)

**Location:** `packages/ui` or `apps/web/src/components/ui/exam-status-badge.tsx`

```
ExamStatusBadge (atom)
  ├── Icon (Lucide icon per status)
  └── Label ("Draft", "Assigned", "Active", "Completed", "Archived")
```

**Props:** `{ status: ExamLifecycleStatus }`

**Colors:**
- Draft: Gray background, gray text
- Assigned: Blue `#002c76` background, white text
- Active: Green `#69a338` background, white text
- Completed: Purple background, white text
- Archived: Gray background, gray text

### Component 2: Audit Trail Timeline (Organism)

**Location:** `apps/web/src/components/exam/audit-trail-timeline.tsx`

**Component hierarchy:**
```
AuditTrailTimeline (organism — client component)
  ├── TimelineHeader (exam title, current status badge)
  └── TimelineList
        └── TimelineEntry (per audit entry)
              ├── StatusTransitionBadge (from -> to with arrow)
              ├── TransitionerName (user name or "System (Auto)")
              ├── ReasonText (if provided)
              ├── Timestamp (relative: "2 hours ago")
              └── TimelineConnector (vertical line between entries)
```

**States:**
1. **Loading** — Skeleton timeline
2. **Data** — Timeline with all entries, newest first
3. **Empty** — "No transitions recorded" (edge case)
4. **Error** — Error message with retry

**Design tokens:**
- Timeline connector: Navy Deep `#002c76` vertical line
- Auto transition: Italic text, system icon
- Manual transition: User avatar, bold name
- Surface: White `#ffffff` card on Cream `#f5f3ef`

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/exam/lifecycle.types.ts` | Types | Create |
| 2 | `packages/types/src/exam/index.ts` | Types | Edit (add lifecycle export) |
| 3 | Supabase migration via MCP (exam_audit_log table) | Database | Apply |
| 4 | `apps/server/src/modules/exam/errors/lifecycle.errors.ts` | Errors | Create |
| 5 | `apps/server/src/modules/exam/models/exam-status-machine.ts` | Model | Create |
| 6 | `apps/server/src/modules/exam/repositories/exam-audit.repository.ts` | Repository | Create |
| 7 | `apps/server/src/modules/exam/services/exam-lifecycle.service.ts` | Service | Create |
| 8 | `apps/server/src/modules/exam/controllers/exam-lifecycle.controller.ts` | Controller | Create |
| 9 | `apps/server/src/modules/exam/routes/exam-lifecycle.routes.ts` | Routes | Create |
| 10 | `apps/server/src/modules/exam/jobs/exam-status-transition.job.ts` | Job | Create |
| 11 | `apps/web/src/components/exam/exam-status-badge.tsx` | Component | Create |
| 12 | `apps/web/src/components/exam/audit-trail-timeline.tsx` | Component | Create |
| 13 | `apps/server/src/modules/exam/__tests__/exam-status-machine.test.ts` | Tests | Create |
| 14 | `apps/server/src/modules/exam/__tests__/exam-lifecycle.service.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-73 | faculty | pending | Cohort Assignment — creates the initial lifecycle entry (draft -> assigned) |

### NPM Packages
- `inngest` — Background job framework — **verify if installed, likely needed**
- `@supabase/supabase-js` — Supabase client (installed)
- `express` — Server framework (installed)
- `vitest` — Testing (installed)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.FACULTY)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`
- `apps/server/src/modules/exam/services/exam-assignment.service.ts` — Read assignment schedule for auto-transitions

## 9. Test Fixtures (inline)

```typescript
// Mock Faculty user
export const FACULTY_USER = {
  sub: "faculty-uuid-1",
  email: "faculty@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: true,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock admin user (for force transitions)
export const ADMIN_USER = {
  ...FACULTY_USER,
  sub: "admin-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
};

// Mock system user (for auto transitions)
export const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

// Mock exams at various statuses
export const MOCK_DRAFT_EXAM = {
  id: "exam-uuid-1",
  title: "Spring 2026 Practice Exam",
  status: "draft" as const,
  created_by: "faculty-uuid-1",
};

export const MOCK_ASSIGNED_EXAM = {
  ...MOCK_DRAFT_EXAM,
  id: "exam-uuid-2",
  status: "assigned" as const,
};

export const MOCK_ACTIVE_EXAM = {
  ...MOCK_DRAFT_EXAM,
  id: "exam-uuid-3",
  status: "active" as const,
};

export const MOCK_COMPLETED_EXAM = {
  ...MOCK_DRAFT_EXAM,
  id: "exam-uuid-4",
  status: "completed" as const,
};

// Mock assignment with schedule (for auto-transition job)
export const MOCK_ASSIGNMENT_DUE_TO_START = {
  id: "assign-uuid-1",
  exam_id: "exam-uuid-2",
  start_at: new Date(Date.now() - 60000).toISOString(), // 1 min ago
  end_at: new Date(Date.now() + 10800000).toISOString(), // 3 hours from now
  status: "scheduled" as const,
};

export const MOCK_ASSIGNMENT_DUE_TO_END = {
  id: "assign-uuid-2",
  exam_id: "exam-uuid-3",
  start_at: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
  end_at: new Date(Date.now() - 60000).toISOString(), // 1 min ago
  status: "active" as const,
};

// Mock audit trail entries
export const MOCK_AUDIT_ENTRIES = [
  {
    id: "audit-1",
    exam_id: "exam-uuid-1",
    previous_status: "draft",
    new_status: "assigned",
    transitioned_by: "faculty-uuid-1",
    reason: null,
    auto: false,
    created_at: "2026-02-20T14:00:00Z",
  },
  {
    id: "audit-2",
    exam_id: "exam-uuid-1",
    previous_status: "assigned",
    new_status: "active",
    transitioned_by: SYSTEM_USER_ID,
    reason: null,
    auto: true,
    created_at: "2026-03-15T09:00:00Z",
  },
];

// Valid transition request
export const VALID_TRANSITION = {
  target_status: "archived" as const,
  reason: "Exam retired after semester",
};

// Invalid transition: draft -> completed (skip states)
export const INVALID_TRANSITION = {
  target_status: "completed" as const,
};

// Force transition
export const FORCE_TRANSITION = {
  target_status: "draft" as const,
  reason: "Exam needs revision after review",
  force: true,
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/modules/exam/__tests__/exam-status-machine.test.ts`

```
describe("ExamStatusMachine")
  describe("canTransition")
    - allows draft -> assigned
    - allows assigned -> active
    - allows active -> completed
    - allows completed -> archived
    - rejects draft -> completed (skip)
    - rejects draft -> active (skip)
    - rejects completed -> draft (backwards)
    - rejects archived -> any (terminal state)
  describe("canForceTransition")
    - allows assigned -> draft with force flag
    - allows active -> completed with force flag
    - rejects force without reason
```

**File:** `apps/server/src/modules/exam/__tests__/exam-lifecycle.service.test.ts`

```
describe("ExamLifecycleService")
  describe("transition")
    - transitions exam status and updates exams table
    - creates audit trail entry with user and timestamp
    - emits notification event on transition (stub)
    - rejects invalid transition (InvalidTransitionError)
  describe("forceTransition")
    - allows admin to force-transition with reason
    - rejects force transition without reason
  describe("getAuditTrail")
    - returns audit entries ordered by created_at desc
    - includes transitioned_by_name from profiles join
    - returns empty entries for exam with no transitions
  describe("autoTransition (Inngest)")
    - transitions assigned -> active when start_at is past
    - transitions active -> completed when end_at is past
    - skips exams not due for transition
```

**Total: ~21 tests** (10 state machine + 11 service)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Lifecycle management E2E will be covered when the full exam lifecycle flow is testable end-to-end.

## 12. Acceptance Criteria

1. State machine enforces valid transitions: draft -> assigned -> active -> completed -> archived
2. Invalid transitions rejected (e.g., draft -> completed)
3. Each transition records: user, timestamp, previous status, new status, reason
4. Audit trail viewable per exam in timeline view
5. Auto-transition: assigned -> active at scheduled start time (Inngest cron)
6. Auto-transition: active -> completed at scheduled end time
7. Manual override: admin can force transition with reason
8. Status badge displayed on exam cards and detail pages
9. Notification stub emitted on status change
10. Inngest cron job runs every minute to check for due transitions
11. All ~21 API tests pass
12. TypeScript strict, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| Status machine: draft -> assigned -> active -> completed -> archived | S-F-27-4 § Acceptance Criteria |
| Valid transitions enforced | S-F-27-4 § Acceptance Criteria |
| Audit trail with user, timestamp, reason | S-F-27-4 § Acceptance Criteria |
| Auto-transition via Inngest cron | S-F-27-4 § Acceptance Criteria: "Inngest cron" |
| Cron checks every minute | S-F-27-4 § Notes |
| Manual admin override with reason | S-F-27-4 § Acceptance Criteria |
| Audit log append-only | S-F-27-4 § Notes: "append-only" |
| Status badge reusable atom | S-F-27-4 § Notes: "reusable atom component" |
| Notification stub on status change | S-F-27-4 § Acceptance Criteria: "connects to E-34" |
| State machine pattern with transition map | S-F-27-4 § Notes |

## 14. Environment Prerequisites

- **Supabase:** Project running, `exams` table (from F-71), `exam_assignments` table (from F-73), `exam_audit_log` table created by migration
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **Inngest:** Dev server running for local cron job testing
- **No Neo4j needed** for this story

## 15. Figma / Make Prototype

No Figma designs available. Build from component hierarchy above:
- Status badge: shadcn/ui Badge component with Lucide icons, colored per status map
- Audit trail timeline: vertical timeline layout with connector lines, use shadcn/ui Card for each entry
- Reference existing badge patterns in the codebase for consistency
