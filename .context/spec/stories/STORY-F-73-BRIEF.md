# STORY-F-73 Brief: Cohort Assignment

## 0. Lane & Priority

```yaml
story_id: STORY-F-73
old_id: S-F-27-1
lane: faculty
lane_priority: 3
within_lane_order: 73
sprint: 30
size: M
depends_on:
  - STORY-F-71 (faculty) — Exam Builder UI (exam must be built before assignment)
blocks:
  - STORY-F-74 — Exam Export
  - STORY-F-75 — Exam Lifecycle Management
personas_served: [faculty]
epic: E-27 (Exam Assignment & Export)
feature: F-12 (Exam Assembly & Delivery)
user_flow: UF-20 (Exam Assembly & Assignment)
cross_epic_note: "Notification stub connects to E-34 (notification system)"
```

## 1. Summary

Build a **cohort assignment** feature that allows faculty to assign a completed exam to a student cohort with a schedule. Faculty select a cohort, configure start/end date/time, and assign the exam. Assignment transitions the exam status from 'draft' to 'assigned', creates an audit trail, and emits a notification event (stub for E-34 notification service). The feature is accessible as a modal in the exam builder.

This is the first story in E-27 (Exam Assignment & Export): **F-73 (assignment)** -> F-74 (export) / F-75 (lifecycle).

Key constraints:
- **DualWriteService** — Supabase `exam_assignments` table, then Neo4j `(Exam)-[:ASSIGNED_TO]->(Cohort)`
- Exam must be in 'draft' or 'ready' status to assign
- Assignment transitions exam status from 'draft' to 'assigned'
- Confirmation dialog before assignment (irreversible for draft exams)
- Schedule validation: end > start, minimum 30-minute window
- Notification is a stub/event emission — actual delivery handled by E-34
- Cohort data comes from institution management (E-06)

## 2. Task Breakdown

1. **Types** — Create `ExamAssignment`, `AssignmentRequest`, `AssignmentResult`, `CohortSummary` in `packages/types/src/exam/assignment.types.ts`
2. **Migration** — Create `exam_assignments` table in Supabase via MCP
3. **Error classes** — `ExamAssignmentError`, `InvalidExamStatusError`, `InvalidScheduleError` in `apps/server/src/modules/exam/errors/assignment.errors.ts`
4. **Model** — `ExamAssignmentModel` with validation logic
5. **Repository** — `ExamAssignmentRepository` for Supabase CRUD
6. **Service** — `ExamAssignmentService` with `assign()` method handling status transition + DualWrite
7. **Controller** — `ExamAssignmentController` with `handleAssign()` method
8. **Routes** — Protected route `POST /api/v1/exams/:examId/assign` with RBAC
9. **Frontend component** — `CohortAssignmentModal` in exam builder
10. **API tests** — 12 tests covering assignment, status transition, validation, auth

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/exam/assignment.types.ts

/** Assignment schedule */
export interface AssignmentSchedule {
  readonly start_at: string;               // ISO datetime
  readonly end_at: string;                 // ISO datetime
  readonly time_window_minutes: number;    // computed: end - start in minutes
}

/** Request body for exam assignment */
export interface AssignmentRequest {
  readonly cohort_id: string;
  readonly start_at: string;               // ISO datetime
  readonly end_at: string;                 // ISO datetime
}

/** Assignment record */
export interface ExamAssignment {
  readonly id: string;
  readonly exam_id: string;
  readonly cohort_id: string;
  readonly cohort_name: string;
  readonly assigned_by: string;
  readonly schedule: AssignmentSchedule;
  readonly status: "scheduled" | "active" | "completed";
  readonly student_count: number;
  readonly created_at: string;
}

/** Result returned after successful assignment */
export interface AssignmentResult {
  readonly assignment_id: string;
  readonly exam_id: string;
  readonly exam_title: string;
  readonly cohort_id: string;
  readonly cohort_name: string;
  readonly student_count: number;
  readonly schedule: AssignmentSchedule;
  readonly exam_status: string;            // "assigned"
  readonly assigned_by: string;
  readonly assigned_at: string;
}

/** Cohort summary for dropdown selection */
export interface CohortSummary {
  readonly id: string;
  readonly name: string;
  readonly student_count: number;
  readonly program: string;
  readonly year: number;
}

/** Audit trail entry for assignment */
export interface AssignmentAuditEntry {
  readonly action: "exam_assigned";
  readonly exam_id: string;
  readonly cohort_id: string;
  readonly assigned_by: string;
  readonly previous_status: string;
  readonly new_status: "assigned";
  readonly schedule: AssignmentSchedule;
  readonly timestamp: string;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_exam_assignments

CREATE TABLE IF NOT EXISTS exam_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id),
  cohort_id UUID NOT NULL,                   -- references cohorts table (E-06)
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'active', 'completed')),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_schedule CHECK (end_at > start_at),
  CONSTRAINT min_window CHECK (EXTRACT(EPOCH FROM (end_at - start_at)) >= 1800)  -- 30 min
);

CREATE INDEX IF NOT EXISTS idx_exam_assignments_exam
  ON exam_assignments(exam_id);

CREATE INDEX IF NOT EXISTS idx_exam_assignments_cohort
  ON exam_assignments(cohort_id);

CREATE INDEX IF NOT EXISTS idx_exam_assignments_status
  ON exam_assignments(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_assignments_exam_cohort
  ON exam_assignments(exam_id, cohort_id);

-- Audit log for assignments
CREATE TABLE IF NOT EXISTS exam_assignment_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES exam_assignments(id),
  action TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES profiles(id),
  previous_status TEXT,
  new_status TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_assignment_audit_assignment
  ON exam_assignment_audit(assignment_id);

-- RLS
ALTER TABLE exam_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_assignment_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can manage own exam assignments"
  ON exam_assignments FOR ALL
  USING (auth.uid() = assigned_by);

CREATE POLICY "Faculty can read assignment audit"
  ON exam_assignment_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exam_assignments
      WHERE exam_assignments.id = exam_assignment_audit.assignment_id
      AND exam_assignments.assigned_by = auth.uid()
    )
  );
```

## 5. API Contract (complete request/response)

### POST /api/v1/exams/:examId/assign (Auth: Faculty)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `examId` | string (UUID) | The exam to assign |

**Request Body:**
```json
{
  "cohort_id": "cohort-uuid-1",
  "start_at": "2026-03-15T09:00:00Z",
  "end_at": "2026-03-15T12:00:00Z"
}
```

**Success Response (201):**
```json
{
  "data": {
    "assignment_id": "assign-uuid-1",
    "exam_id": "exam-uuid-1",
    "exam_title": "USMLE Step 1 Practice Exam",
    "cohort_id": "cohort-uuid-1",
    "cohort_name": "Class of 2028 - Section A",
    "student_count": 120,
    "schedule": {
      "start_at": "2026-03-15T09:00:00Z",
      "end_at": "2026-03-15T12:00:00Z",
      "time_window_minutes": 180
    },
    "exam_status": "assigned",
    "assigned_by": "faculty-uuid-1",
    "assigned_at": "2026-02-19T14:00:00Z"
  },
  "error": null
}
```

### GET /api/v1/cohorts (Auth: Faculty) -- List available cohorts

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "cohort-uuid-1",
      "name": "Class of 2028 - Section A",
      "student_count": 120,
      "program": "MD",
      "year": 2
    }
  ],
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role or not exam owner |
| 400 | `INVALID_EXAM_STATUS` | Exam is not in 'draft' or 'ready' status |
| 400 | `INVALID_SCHEDULE` | End time before start time, or window < 30 min |
| 400 | `VALIDATION_ERROR` | Missing cohort_id, invalid dates |
| 404 | `NOT_FOUND` | Exam or cohort not found |
| 409 | `CONFLICT` | Exam already assigned to this cohort |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Component: Cohort Assignment Modal (in Exam Builder)

**Trigger:** "Assign to Cohort" button in exam builder toolbar (enabled when exam has items)

**Component hierarchy:**
```
CohortAssignmentModal (organism — client component)
  ├── ExamSummaryCard
  │     ├── ExamTitle
  │     ├── ItemCount
  │     ├── ComplianceScore
  │     └── EstimatedTime
  ├── CohortSelector (dropdown — existing cohorts from institution)
  │     └── CohortOption (name, student count, program, year)
  ├── ScheduleForm
  │     ├── StartDateTimePicker
  │     ├── EndDateTimePicker
  │     └── TimeWindowDisplay (computed, "3 hours")
  ├── ValidationMessages
  │     ├── "End time must be after start time"
  │     └── "Minimum 30-minute window required"
  ├── ConfirmationWarning
  │     └── "This action will change the exam status to 'assigned'. This is irreversible for draft exams."
  ├── AssignButton ("Assign Exam" — primary, with confirmation dialog)
  └── CancelButton
```

**States:**
1. **Idle** — Modal open, cohort dropdown populated, no selection
2. **Configured** — Cohort selected, schedule set, validation passed
3. **Confirming** — Confirmation dialog active
4. **Assigning** — Loading spinner on assign button, form disabled
5. **Success** — Success toast, modal closes, exam status badge updates
6. **Error** — Error message inline (invalid schedule, exam not draft, etc.)

**Design tokens:**
- Confirmation warning: Yellow `#f5a623` background card
- Assign button: Green `#69a338` primary
- Surface: White `#ffffff` modal on overlay
- Typography: Source Sans 3

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/exam/assignment.types.ts` | Types | Create |
| 2 | `packages/types/src/exam/index.ts` | Types | Edit (add assignment export) |
| 3 | Supabase migration via MCP (exam_assignments + exam_assignment_audit) | Database | Apply |
| 4 | `apps/server/src/modules/exam/errors/assignment.errors.ts` | Errors | Create |
| 5 | `apps/server/src/modules/exam/models/exam-assignment.model.ts` | Model | Create |
| 6 | `apps/server/src/modules/exam/repositories/exam-assignment.repository.ts` | Repository | Create |
| 7 | `apps/server/src/modules/exam/services/exam-assignment.service.ts` | Service | Create |
| 8 | `apps/server/src/modules/exam/controllers/exam-assignment.controller.ts` | Controller | Create |
| 9 | `apps/server/src/modules/exam/routes/exam-assignment.routes.ts` | Routes | Create |
| 10 | `apps/web/src/components/exam/cohort-assignment-modal.tsx` | Component | Create |
| 11 | `apps/server/src/modules/exam/__tests__/exam-assignment.service.test.ts` | Tests | Create |
| 12 | `apps/server/src/modules/exam/__tests__/exam-assignment.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-71 | faculty | pending | Exam Builder UI — exam must be built before it can be assigned |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client
- `express` — Server framework
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.FACULTY)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`
- `apps/server/src/modules/exam/services/exam-builder.service.ts` — Read exam status, update status on assignment
- Cohort data from institution management (E-06) — may need to read from `cohorts` table

### Neo4j
- DualWriteService creates `(Exam)-[:ASSIGNED_TO]->(Cohort)` relationship in Neo4j after Supabase write.

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

// Mock student user (should be denied)
export const STUDENT_USER = {
  ...FACULTY_USER,
  sub: "student-uuid-1",
  email: "student@msm.edu",
  role: "student" as const,
  is_course_director: false,
};

// Mock exam in draft status
export const MOCK_DRAFT_EXAM = {
  id: "exam-uuid-1",
  blueprint_id: "bp-uuid-1",
  created_by: "faculty-uuid-1",
  title: "Spring 2026 Practice Exam",
  status: "draft" as const,
  item_count: 100,
  institution_id: "inst-uuid-1",
};

// Mock exam already assigned
export const MOCK_ASSIGNED_EXAM = {
  ...MOCK_DRAFT_EXAM,
  id: "exam-uuid-2",
  status: "assigned" as const,
};

// Mock exam already completed (cannot assign)
export const MOCK_COMPLETED_EXAM = {
  ...MOCK_DRAFT_EXAM,
  id: "exam-uuid-3",
  status: "completed" as const,
};

// Mock cohort
export const MOCK_COHORT = {
  id: "cohort-uuid-1",
  name: "Class of 2028 - Section A",
  student_count: 120,
  program: "MD",
  year: 2,
};

// Valid assignment request
export const VALID_ASSIGNMENT = {
  cohort_id: "cohort-uuid-1",
  start_at: "2026-03-15T09:00:00Z",
  end_at: "2026-03-15T12:00:00Z",
};

// Invalid: end before start
export const INVALID_SCHEDULE = {
  cohort_id: "cohort-uuid-1",
  start_at: "2026-03-15T12:00:00Z",
  end_at: "2026-03-15T09:00:00Z",
};

// Invalid: less than 30 minutes
export const SHORT_WINDOW = {
  cohort_id: "cohort-uuid-1",
  start_at: "2026-03-15T09:00:00Z",
  end_at: "2026-03-15T09:15:00Z",
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/modules/exam/__tests__/exam-assignment.service.test.ts`

```
describe("ExamAssignmentService")
  describe("assign")
    - assigns exam to cohort with valid schedule
    - transitions exam status from 'draft' to 'assigned'
    - creates assignment record in exam_assignments table
    - creates audit trail entry
    - emits notification event (stub)
    - rejects assignment of non-draft exam (InvalidExamStatusError)
    - rejects invalid schedule: end before start (InvalidScheduleError)
    - rejects schedule with window < 30 minutes (InvalidScheduleError)
    - rejects duplicate assignment to same cohort (409 CONFLICT)
    - throws NotFoundError for non-existent cohort
```

**File:** `apps/server/src/modules/exam/__tests__/exam-assignment.controller.test.ts`

```
describe("ExamAssignmentController")
  describe("handleAssign")
    - assigns exam and returns 201
    - rejects unauthenticated request (401)
    - rejects non-faculty role (403)
    - rejects assignment by non-owner (403)
    - rejects missing cohort_id (400)
    - returns 404 for non-existent exam
```

**Total: ~16 tests** (10 service + 6 controller)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Cohort assignment E2E will be covered when the full exam lifecycle flow is testable.

## 12. Acceptance Criteria

1. Faculty can select a cohort from a dropdown of existing cohorts
2. Schedule configuration: start date/time, end date/time with time window display
3. Exam must be in 'draft' or 'ready' status to assign
4. Assignment transitions exam status from 'draft' to 'assigned'
5. Confirmation dialog before assignment (irreversible warning)
6. Notification event emitted to assigned cohort (stub)
7. Assignment record stored with audit trail (who, when)
8. Validation: end > start, minimum 30-minute window
9. Cannot assign same exam to same cohort twice
10. All ~16 API tests pass
11. TypeScript strict, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| Assign exam to cohort with schedule | S-F-27-1 § User Story |
| Status transition: draft -> assigned | S-F-27-1 § Acceptance Criteria |
| Confirmation dialog | S-F-27-1 § Acceptance Criteria: "irreversible for draft exams" |
| 30-minute minimum window | S-F-27-1 § Acceptance Criteria |
| DualWriteService for ASSIGNED_TO | S-F-27-1 § Notes: "(Exam)-[:ASSIGNED_TO]->(Cohort)" |
| Notification stub | S-F-27-1 § Notes: "actual delivery handled by E-34" |
| Cohort data from E-06 | S-F-27-1 § Notes |
| Blocks F-74 and F-75 | BACKLOG-FACULTY.md |

## 14. Environment Prerequisites

- **Supabase:** Project running, `exams` table (from F-71), `exam_assignments` and `exam_assignment_audit` tables created by migration, cohorts table from E-06
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **Neo4j:** Optional — DualWrite creates Exam-Cohort relationships if available

## 15. Figma / Make Prototype

No Figma designs available. Build modal from component hierarchy above using shadcn/ui Dialog, Select, DatePicker (or Input type="datetime-local"), Button, Alert components. Reference existing modal patterns in the codebase.
