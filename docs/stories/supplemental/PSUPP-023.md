# PSUPP-023: Institution Courses List (/institution/courses)
**Group:** New Institutional Screens
**Component:** `InstitutionalAdminDashboard` (currently placeholder) → new `InstitutionCourseList`
**Priority:** P1 — currently routes to placeholder
**Depends:** P1-025 (courses exist), P4-011 (institution admin)
**Specialist:** @frontend-specialist

**As an** Institution Admin
**I want** to see all courses across my institution with quality and coverage metrics
**So that** I can identify which courses need attention and which faculty need support

## Acceptance Criteria
- Route: `/institution/courses`
- Endpoint: `GET /api/v1/institution/courses` (institution-scoped version of admin courses)
- Response:
```typescript
interface InstitutionCourseListResponse {
  courses: {
    id: string;
    code: string;
    name: string;
    term: string;
    status: 'active' | 'draft' | 'archived';
    faculty: { id: string; name: string }[];
    studentCount: number;
    approvedItemCount: number;
    coveragePct: number;
    avgCriticScore: number;
    lcmeCompliancePct: number;    // from Phase 3 LCME evidence chain
    lastActivity: string;
    health: 'healthy' | 'at_risk' | 'critical';
    // healthy: coverage ≥ 70% AND ≥ 50 items
    // at_risk: coverage 40-69% OR 20-49 items
    // critical: coverage < 40% OR < 20 items
  }[];
  total: number;
}
```
- Health badge per course (green/amber/red)
- Filter by status, health, faculty member
- Sort by: coverage (asc = worst first), item count, last activity
- "View Course" → `/courses/:id`
- "Create Course" button (institution admin can create courses and assign faculty)
- Course creation: name, code, term, assign faculty (multi-select from institution faculty)
- `POST /api/v1/institution/courses` — create course (if institution admin has permission)

## Files to Create
- `frontend/src/app/(institution)/institution/courses/page.tsx`
- `frontend/src/hooks/useInstitutionCourses.ts`
- `backend/src/controllers/institution-courses.controller.ts`

## Smoke Test
```bash
curl "localhost:3001/api/v1/institution/courses" -H "Authorization: Bearer $INST_ADMIN_JWT" | \
  jq '[.courses[] | {code, coveragePct, health}] | sort_by(.coveragePct)'
# Expected: courses sorted by coverage, health badges consistent with thresholds
```
