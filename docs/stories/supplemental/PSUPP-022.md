# PSUPP-022: Institution Students List (/institution/students)
**Group:** New Institutional Screens
**Component:** `InstitutionalAdminDashboard` (currently placeholder) → new `InstitutionStudentList`
**Priority:** P1 — currently routes to placeholder dashboard; needs real content
**Depends:** Phase 5 student registration, P4-011 (institution admin screens)
**Specialist:** @frontend-specialist

**As an** Institution Admin
**I want** to see all students enrolled at my institution
**So that** I can monitor enrollment, assign advisors, and view aggregate performance

## Acceptance Criteria
- Route: `/institution/students`
- Endpoint: `GET /api/v1/institution/students`
- Response: paginated list of all students at this institution
```typescript
interface InstitutionStudentListResponse {
  students: {
    id: string;
    name: string;
    email: string;
    studentId: string;
    yearLevel: string;          // M1, M2
    enrolledCourses: string[];  // course codes
    assignedAdvisor: string | null;
    practiceSessionCount: number;
    overallMastery: number | null;
    lastActivity: string | null;
    status: 'active' | 'on_leave' | 'withdrawn';
  }[];
  total: number;
  summary: {
    m1Count: number;
    m2Count: number;
    avgMastery: number | null;
    atRiskCount: number;    // Phase 5: mastery trajectory declining
  };
}
```
- Filter by year level (M1/M2), status, advisor assignment
- Search by name, email, student ID
- "Assign Advisor" dropdown per student
- Export: "Download Roster CSV"
- "View Progress" per student → `/advisor/students/:id` (enabled in Phase 5)
- Phase 4: most fields show "—" or 0 until Phase 5 student data flows

## Files to Create
- `frontend/src/app/(institution)/institution/students/page.tsx`
- `frontend/src/hooks/useInstitutionStudents.ts`
- `backend/src/controllers/institution-students.controller.ts`

## Smoke Test
```bash
curl "localhost:3001/api/v1/institution/students" -H "Authorization: Bearer $INST_ADMIN_JWT"
# Expected: { total: N, students: [...], summary: { m1Count, m2Count } }
# Phase 4: total may be 0 until Phase 5 student registration ships
```
