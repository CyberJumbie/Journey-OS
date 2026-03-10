# PSUPP-009: Course Roster (/faculty/courses/:id/roster)
**Group:** Course Depth
**Component:** `CourseRoster` | `pages/faculty/CourseRoster.tsx`
**Priority:** P1 — needed by Phase 5 (faculty needs to see which students are in their course)
**Depends:** Phase 5 student registration
**Specialist:** @frontend-specialist + @backend-specialist

**As a** faculty member or course director
**I want** to see the list of enrolled students in my course
**So that** I can assign exams, monitor participation, and view per-student progress

## Acceptance Criteria
- Route: `/faculty/courses/:id/roster`
- Endpoint: `GET /api/v1/courses/:courseId/roster`
- Response:
```typescript
interface RosterResponse {
  course: { id: string; name: string; code: string };
  students: {
    id: string;
    name: string;
    email: string;
    yearLevel: string;          // M1, M2
    enrolledAt: string;
    practiceSessionCount: number;   // Phase 5: 0 until student screens ship
    lastActivity: string | null;
    overallMastery: number | null;  // Phase 5 BKT value: 0-1
    examSessionCount: number;
  }[];
  total: number;
}
```
- Search by student name/email
- Sort by: name (default), last activity, mastery (Phase 5)
- "Assign Exam" button → `/exams/new?courseId=X` (bulk selection pre-populated with all roster students)
- Export roster as CSV
- Per-student "View Progress" link → `/advisor/students/:id` (Phase 5; disabled until Phase 5 ships)

## Files to Create
- `frontend/src/app/(faculty)/faculty/courses/[id]/roster/page.tsx`
- `frontend/src/hooks/useCourseRoster.ts`
- `backend/src/controllers/roster.controller.ts`
- `backend/src/routes/roster.routes.ts`

## Smoke Test
```bash
curl "localhost:3001/api/v1/courses/medi-531/roster" -H "Authorization: Bearer $JWT"
# Expected: { total: N, students: [...] }
# Phase 1-4: students array may be empty (no students enrolled yet)
# Phase 5: populated after student registration
```
