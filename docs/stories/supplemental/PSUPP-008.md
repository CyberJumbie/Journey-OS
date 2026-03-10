# PSUPP-008: Course Ready Confirmation (/courses/:courseId/ready)
**Group:** Course Depth
**Component:** `CourseReady` | `pages/courses/CourseReady.tsx`
**Priority:** P1 — end of the ingestion → review → confirm flow
**Depends:** P1-015 (review-mapping complete)
**Specialist:** @frontend-specialist

**As a** faculty member
**I want** a confirmation screen after completing concept review
**So that** I know my course is set up and ready for question generation

## Acceptance Criteria
- Route: `/courses/:courseId/ready`
- Shown after faculty completes `/courses/:courseId/review-mapping` and submits
- Displays a summary of the completed ingestion:
  - Course name + code
  - SubConcepts extracted count
  - Topics accepted vs rejected
  - SLOs extracted (if Phase 3 ran)
  - Estimated questions needed to reach 80% coverage
- Three CTA buttons:
  1. **"Start Generating"** → `/workbench?courseId=X` (most prominent)
  2. **"Review Concept Map"** → `/analytics/coverage-map?courseId=X`
  3. **"Go to Course Dashboard"** → `/courses/:courseId`
- Endpoint: `GET /api/v1/courses/:courseId/ingestion-summary`
```typescript
interface IngestionSummary {
  courseId: string;
  courseName: string;
  subConceptsAccepted: number;
  subConceptsRejected: number;
  slosExtracted: number;
  estimatedQuestionsNeeded: number;  // to reach 80% coverage
  ingestionJobId: string;
  completedAt: string;
}
```
- No backend write — read-only summary from existing ingestion data

## Files to Create
- `frontend/src/app/(faculty)/courses/[courseId]/ready/page.tsx`
- `backend/src/controllers/ingestion-summary.controller.ts` (1 GET endpoint)

## Smoke Test
```bash
curl "localhost:3001/api/v1/courses/medi-531/ingestion-summary" -H "Authorization: Bearer $JWT"
# Expected: { subConceptsAccepted: N, estimatedQuestionsNeeded: M }
```
