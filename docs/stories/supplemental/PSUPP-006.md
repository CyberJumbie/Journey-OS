# PSUPP-006: Week View (/courses/:courseId/week/:weekId)
**Group:** Course Depth
**Component:** `WeekView` | `pages/courses/WeekView.tsx`
**Priority:** P0 — core course navigation unit; every "Generate for this week" CTA lands here
**Depends:** P1-015 (syllabus mapped), P3-013 (course detail dashboard)
**Specialist:** @frontend-specialist

**As a** faculty member
**I want** a per-week detail view showing that week's topics, learning objectives, existing questions, and coverage gaps
**So that** I can understand what's been covered and immediately generate questions for the gaps

## Acceptance Criteria
- Route: `/courses/:courseId/week/:weekId`
- Endpoint: `GET /api/v1/courses/:courseId/weeks/:weekId`
- Response shape:
```typescript
interface WeekDetail {
  weekId: number;
  title: string;                   // e.g. "Week 3 — Cardiac Physiology"
  topics: string[];                // extracted from syllabus
  learningObjectives: string[];    // SLOs mapped to this week (if P3-005 ran)
  subConcepts: {
    id: string;
    name: string;
    usmleSystem: string;
    questionCount: number;         // approved items targeting this SubConcept
    targetCount: number;           // default 5 per SubConcept
    coverageStatus: 'covered' | 'partial' | 'gap';
    verificationStatus: 'verified' | 'unverified';
  }[];
  summary: {
    totalSubConcepts: number;
    coveredSubConcepts: number;
    totalQuestions: number;
    targetQuestions: number;
    coveragePct: number;
  };
  recentQuestions: {               // last 5 generated this week
    id: string; stem: string; status: string; criticScore: number;
  }[];
}
```
- Top: week title + coverage gauge + "Generate Questions" CTA
- SubConcepts table: name, USMLE system, question count vs target, coverage badge, verification badge
- Click SubConcept row → `/workbench?courseId=X&subConceptId=Y` (pre-fills concept context)
- "Generate for this week" button → `/workbench?courseId=X&weekNumber=N` (context: entire week)
- Breadcrumb: Courses → [Course Name] → Week N
- "Upload Materials" button → `/courses/:courseId/week/:weekId/upload-materials`

## Files to Create
- `frontend/src/app/(faculty)/courses/[courseId]/week/[weekId]/page.tsx`
- `frontend/src/hooks/useWeekDetail.ts`
- `backend/src/controllers/week.controller.ts`
- `backend/src/routes/week.routes.ts`

## Smoke Test
```bash
curl "localhost:3001/api/v1/courses/medi-531/weeks/3" -H "Authorization: Bearer $JWT" | \
  jq '{title, totalSubConcepts: .summary.totalSubConcepts, coveragePct: .summary.coveragePct}'
# Expected: title present, coveragePct 0-100
```
