# PSUPP-007: Generate Questions from Syllabus Week (/courses/:courseId/week/:weekId/generate)
**Group:** Course Depth
**Component:** `GenerateQuestionsSyllabus` | `pages/courses/GenerateQuestionsSyllabus.tsx`
**Priority:** P0 — a core pathway into the workbench
**Depends:** PSUPP-006 (WeekView), P1-016 (workbench)
**Specialist:** @frontend-specialist

**As a** faculty member
**I want** a focused generation launcher for a specific syllabus week
**So that** I can fill coverage gaps for that week without manually specifying context

## Acceptance Criteria
- Route: `/courses/:courseId/week/:weekId/generate`
- This is NOT its own generation UI — it is a pre-fill launcher that:
  1. Loads week detail (same as PSUPP-006 endpoint)
  2. Presents a lightweight "confirm context" screen showing which SubConcepts will be targeted
  3. Lets faculty pick: Bloom level target, quantity (1–10), difficulty preference
  4. On "Start Generating" → redirects to `/workbench` with query params:
     - `?courseId=X&weekNumber=N&subConceptIds=A,B,C&bloom=3&quantity=5&difficulty=Medium`
  5. Workbench auto-sends the first generation message using these params (via P3-010 gap pre-fill pattern)
- SubConcept checklist: all week SubConcepts pre-selected, faculty can deselect any
- "Gap only" toggle: pre-selects only SubConcepts with 0 approved items
- No new backend endpoint needed — uses `GET /courses/:courseId/weeks/:weekId` from PSUPP-006

## Files to Create
- `frontend/src/app/(faculty)/courses/[courseId]/week/[weekId]/generate/page.tsx`
- `frontend/src/hooks/useWeekGenerationLauncher.ts`

## Notes
- `/courses/:courseId/week/:weekId/generate-test` and `/generate-quiz` and `/generate-handout` remain deferred — generation is unified in the workbench
