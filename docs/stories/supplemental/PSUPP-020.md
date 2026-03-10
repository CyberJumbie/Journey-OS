# PSUPP-020: Faculty vs Target Coverage (/institution/faculty-coverage)
**Group:** New Institutional Screens
**Component:** `FacultyUSMLECoverage` | `pages/institution/FacultyUSMLECoverage.tsx`
**Priority:** P1 — NEW screen added this session
**Depends:** PSUPP-019 (institution coverage), P3-007 (per-faculty data)
**Specialist:** @frontend-specialist

**As an** Institution Admin
**I want** to compare each faculty member's coverage contribution against targets
**So that** I can identify faculty who are over-generating in narrow areas and those under-contributing to key systems

## Acceptance Criteria
- Route: `/institution/faculty-coverage`
- Endpoint: `GET /api/v1/institution/faculty-coverage`
```typescript
interface FacultyCoverageResponse {
  faculty: {
    id: string;
    name: string;
    department: string;
    courses: string[];
    totalItemsApproved: number;
    systemsContributed: number;        // unique USMLE systems with ≥1 item
    topSystem: string;                 // system with most items from this faculty
    concentrationScore: number;        // 0-1; 1 = all items in one system (bad)
    targetMet: boolean;                // institution-level target for faculty contribution
    itemsBySystem: Record<string, number>;  // system → count
  }[];
  institutionTargets: {
    minSystemsPerFaculty: number;       // default: 3
    minItemsPerFaculty: number;         // default: 20
  };
}
```
- Table view: faculty name, dept, total items, systems covered, concentration score badge
- Concentration score: green < 0.4 (diverse), amber 0.4–0.7, red > 0.7 (over-concentrated)
- "Below target" row highlight for faculty not meeting institution minimums
- Per-faculty mini heatmap on row expand (16×7 cells, their items only)
- Sort by: concentration score (desc = most concentrated first), total items, name
- Export CSV of full faculty coverage report

## Files to Create
- `frontend/src/app/(institution)/institution/faculty-coverage/page.tsx`
- `frontend/src/hooks/useFacultyCoverage.ts`
- `backend/src/controllers/faculty-coverage.controller.ts` (add endpoint to institution-coverage.controller.ts)

## Smoke Test
```bash
curl "localhost:3001/api/v1/institution/faculty-coverage" \
  -H "Authorization: Bearer $INST_ADMIN_JWT" | \
  jq '[.faculty[] | {name, concentrationScore, targetMet}]'
# Expected: array with concentration scores between 0-1
```
