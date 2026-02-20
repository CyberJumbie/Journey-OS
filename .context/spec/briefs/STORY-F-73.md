# STORY-F-73: Cohort Assignment

**Epic:** E-27 (Exam Assignment & Export)
**Feature:** F-12
**Sprint:** 30
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-27-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need to assign a completed exam to a student cohort with a schedule so that students can take the exam at the designated time.

## Acceptance Criteria
- [ ] Course selection dropdown (faculty's courses via `course_members`)
- [ ] Section/cohort selection checkboxes (sections from `sections` table for selected course)
- [ ] Schedule configuration: start date/time, end date/time, time window
- [ ] Exam must be in `'ready'` or `'draft'` status to assign
- [ ] Assignment transitions exam status to `'active'` (or `'ready'` if scheduled for future)
- [ ] Confirmation dialog before assignment (warns about irreversibility for active exams)
- [ ] Notification trigger to assigned cohort via existing notification service (stub event emission)
- [ ] Assignment record stored with audit trail (who assigned, when, to which sections)
- [ ] Validation: end time must be after start time, minimum 30 min window
- [ ] Additional settings: time limit, attempts allowed, randomize questions, show results after submission
- [ ] 8-12 API tests: assignment creation, status transition, validation, notification trigger, audit trail

## Reference Screens
> Refactor the prototype for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/exams/ExamAssignment.tsx` | `apps/web/src/app/(protected)/exams/[examId]/assign/page.tsx` | Replace embedded sidebar with shared layout; extract exam selection list into `ExamSelectionList` molecule (or receive examId from route param); extract assignment settings form into `AssignmentSettingsForm` organism; replace inline `style={{}}` with Tailwind design tokens; replace `C.*` constants with CSS custom properties; convert course/section selection to shadcn/ui `Select` and `Checkbox`; use `@web/*` path alias; time limit slider -> shadcn/ui `Slider` |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/exam/assignment.types.ts` |
| Model | apps/server | `src/models/exam/exam-assignment.model.ts` |
| Repository | apps/server | `src/repositories/exam/exam-assignment.repository.ts` |
| Service | apps/server | `src/services/exam/exam-assignment.service.ts` |
| Controller | apps/server | `src/controllers/exam/exam-assignment.controller.ts` |
| Routes | apps/server | `src/routes/exam/exam-assignment.routes.ts` |
| View | apps/web | `src/app/(protected)/exams/[examId]/assign/page.tsx` |
| Components | apps/web | `src/components/exam/assignment-settings-form.tsx`, `src/components/exam/section-selector.tsx`, `src/components/exam/assignment-confirmation-dialog.tsx` |
| Tests | apps/server | `src/services/exam/__tests__/exam-assignment.service.test.ts` |

## Database Schema
```sql
CREATE TABLE exam_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams(id),
  section_id uuid NOT NULL REFERENCES sections(id),
  assigned_by uuid NOT NULL REFERENCES profiles(id),
  available_from timestamptz NOT NULL,
  available_until timestamptz NOT NULL,
  time_limit_minutes integer NOT NULL DEFAULT 120,
  attempts_allowed integer NOT NULL DEFAULT 1 CHECK (attempts_allowed > 0),
  randomize_questions boolean NOT NULL DEFAULT false,
  show_results boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (available_until > available_from),
  CHECK (available_until - available_from >= interval '30 minutes')
);

CREATE INDEX idx_exam_assignments_exam ON exam_assignments(exam_id);
CREATE INDEX idx_exam_assignments_section ON exam_assignments(section_id);
```

DualWriteService: `(Exam)-[:ASSIGNED_TO {available_from, available_until}]->(Section)` in Neo4j.

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/exams/:examId/assign` | Create assignment for one or more sections |
| GET | `/api/exams/:examId/assignments` | List assignments for an exam |
| GET | `/api/assignments/:assignmentId` | Get assignment detail |
| PUT | `/api/assignments/:assignmentId` | Update assignment settings |
| DELETE | `/api/assignments/:assignmentId` | Cancel assignment |

## Dependencies
- **Blocks:** none
- **Blocked by:** STORY-F-71 (exam must be built)
- **Cross-lane:** Notification stub connects to notification system. Cohort/section data comes from institution management.

## Testing Requirements
- 8-12 API tests: create assignment for single section, create for multiple sections (batch), invalid exam status (expect 409), end time before start time (expect 400), window < 30 min (expect 400), assignment creates audit log entry, notification event emitted, exam status transitions to active, cancel assignment, get assignments by exam, faculty can only assign own courses
- 0 E2E tests

## Implementation Notes
- DualWriteService: Supabase `exam_assignments` table first, then Neo4j `(Exam)-[:ASSIGNED_TO]->(Section)`.
- Section data comes from existing `sections` table (FK to `courses`). Faculty sees sections for courses they are a member of via `course_members`.
- Notification is a stub event emission via the existing notification service: create a `notifications` row with type `'system'` for each student in the assigned section(s). Actual delivery (email, push) handled by future notification epic.
- Student list for notification: join `sections` -> `courses` -> `student_enrollments` (or `course_members` with role `'student'`).
- Multi-section assignment: POST body accepts array of `section_ids`. Create one `exam_assignments` row per section (not one row with array). Use transactional RPC for atomicity.
- Exam status transition: use the status machine from STORY-F-75. Assignment triggers `draft` -> `ready` -> `active` (or scheduled).
- Use `#private` fields in the `ExamAssignment` model class.
