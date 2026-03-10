# PSUPP-019: Institutional USMLE Coverage (/institution/usmle-coverage)
**Group:** New Institutional Screens
**Component:** `InstitutionalUSMLECoverage` | `pages/institution/InstitutionalUSMLECoverage.tsx`
**Priority:** P0 — marked as NEW in routes.ts; one of the 3 new screens added this session
**Depends:** P3-007 (USMLE heatmap per course exists), P3-015 (LCME compliance)
**Specialist:** @frontend-specialist + @coverage-specialist

**As an** Associate Dean / Institution Admin
**I want** to see USMLE blueprint coverage aggregated across ALL courses institution-wide
**So that** I can identify systemic gaps that no single course is covering

## Acceptance Criteria
- Route: `/institution/usmle-coverage`
- This is the INSTITUTION-WIDE version of `/analytics/usmle-heatmap` (which is per-faculty)
- Endpoint: `GET /api/v1/institution/usmle-coverage`
```typescript
interface InstitutionalUSMLECoverage {
  cells: {
    system: string;           // one of 16 USMLE Systems
    discipline: string;       // one of 7 Disciplines
    itemCount: number;        // total approved items across ALL courses
    courseCount: number;      // how many courses contribute items to this cell
    uniqueConceptCount: number;
    coverageStatus: 'strong' | 'adequate' | 'weak' | 'gap';
    // strong ≥ 10 items, adequate 4-9, weak 1-3, gap 0
  }[];
  summary: {
    totalCells: 112;
    strongCells: number;
    adequateCells: number;
    weakCells: number;
    gapCells: number;
    topGaps: { system: string; discipline: string }[];
  };
  courseBreakdown: {       // per course contribution to heatmap
    courseId: string;
    courseName: string;
    itemsContributed: number;
    primarySystems: string[];
  }[];
}
```
- 16×7 heatmap (same visual as P3-007 but institution-wide, 4-tier coloring: strong/adequate/weak/gap)
- Course filter: toggle individual courses on/off to see their contribution to the heatmap
- "Download Coverage Report" → CSV with all 112 cells
- Side panel on cell click: which courses contribute items to this cell, top concepts covered
- LCME Standard correlation: toggle to overlay LCME element coverage on top of heatmap cells
- Backend Cypher:
```cypher
MATCH (sys:USMLE_System)<-[:MAPS_TO]-(sc:SubConcept)<-[:TARGETS]-(ai:AssessmentItem {status:'approved'})
WHERE ai.institution_id = $institutionId
RETURN sys.name AS system, sc.discipline AS discipline,
       count(DISTINCT ai) AS itemCount,
       count(DISTINCT ai.course_id) AS courseCount
```

## Files to Create
- `frontend/src/app/(institution)/institution/usmle-coverage/page.tsx`
- `frontend/src/hooks/useInstitutionalUSMLECoverage.ts`
- `backend/src/controllers/institution-coverage.controller.ts` (new endpoint)

## Smoke Test
```bash
curl "localhost:3001/api/v1/institution/usmle-coverage" \
  -H "Authorization: Bearer $INST_ADMIN_JWT" | \
  jq '{gapCells: .summary.gapCells, topGap: .summary.topGaps[0]}'
# Expected: gapCells < 112, topGap has system + discipline
```
