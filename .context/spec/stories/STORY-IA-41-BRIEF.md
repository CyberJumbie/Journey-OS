# STORY-IA-41 Brief: Element Drill-Down View

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-IA-41
old_id: S-IA-30-3
epic: E-30 (LCME Compliance Engine)
feature: F-14 (LCME Compliance & Reporting)
sprint: 39
lane: institutional_admin
lane_priority: 2
within_lane_order: 41
size: M
depends_on:
  - STORY-IA-27 (institutional_admin) — Compliance computation with evidence chains
blocks: []
personas_served: [institutional_admin]
```

---

## Section 1: Summary

**What to build:** A drill-down page at `/admin/compliance/elements/:elementId` showing the full evidence chain for a specific LCME element. The page displays the element header with compliance status, a collapsible evidence chain tree (Element -> ILOs -> SLOs -> Courses), gap indicators highlighting missing links, and filters by course or program. Each node in the chain is a clickable link to its detail page. The page includes a breadcrumb, evidence count stats, and an export-as-PDF button.

**Parent epic:** E-30 (LCME Compliance Engine) under F-14 (LCME Compliance & Reporting). This is the detailed view accessed from the compliance heatmap (STORY-IA-40).

**User story:** As an institutional admin, I need to drill down into a specific LCME element to see the full evidence chain with direct links so that I can verify compliance and identify gaps.

**Key constraints:**
- Evidence chain tree: Element -> ILOs -> SLOs -> Courses (collapsible, recursive)
- Gap indicators highlight missing links (e.g., ILO with no SLO mapping)
- Each node is a clickable deep link to its detail page
- Filter chain by course or program
- Breadcrumb: Compliance > Standard N > Element N.N
- Loading skeleton matching tree layout
- PDF export for individual element evidence chains

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Evidence chain types | `packages/types/src/compliance/evidence-chain.types.ts` | 1h |
| 2 | Types barrel export | `packages/types/src/compliance/index.ts` | 10m |
| 3 | ElementDrilldownService | `apps/server/src/modules/compliance/services/element-drilldown.service.ts` | 2.5h |
| 4 | ElementDrilldownController | `apps/server/src/modules/compliance/controllers/element-drilldown.controller.ts` | 1.5h |
| 5 | Extend compliance routes | `apps/server/src/modules/compliance/routes/compliance.routes.ts` | 15m |
| 6 | EvidenceChainTree component | `apps/web/src/components/compliance/evidence-chain-tree.tsx` | 2.5h |
| 7 | ChainNode component | `apps/web/src/components/compliance/chain-node.tsx` | 1h |
| 8 | GapIndicator component | `apps/web/src/components/compliance/gap-indicator.tsx` | 45m |
| 9 | Element drill-down page | `apps/web/src/app/(dashboard)/admin/compliance/elements/[elementId]/page.tsx` | 2h |
| 10 | Service tests | `apps/server/src/modules/compliance/__tests__/element-drilldown.service.test.ts` | 2h |
| 11 | Controller tests | `apps/server/src/modules/compliance/__tests__/element-drilldown.controller.test.ts` | 1.5h |

**Total estimate:** ~15h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/compliance/evidence-chain.types.ts

/** Node types in the evidence chain */
export type ChainNodeType = "element" | "ilo" | "slo" | "course";

/** Single node in the evidence chain tree */
export interface EvidenceChainNode {
  readonly id: string;
  readonly type: ChainNodeType;
  readonly label: string;
  readonly description: string;
  readonly link: string;
  readonly has_gap: boolean;
  readonly gap_message: string | null;
  readonly children: readonly EvidenceChainNode[];
}

/** Element detail with evidence chain */
export interface ElementDrilldownData {
  readonly element_id: string;
  readonly element_number: string;
  readonly element_description: string;
  readonly standard_id: string;
  readonly standard_name: string;
  readonly standard_number: number;
  readonly compliance_score: number;
  readonly compliance_status: ComplianceStatus;
  readonly evidence_count: number;
  readonly total_expected: number;
  readonly evidence_chain: readonly EvidenceChainNode[];
}

/** Compliance status (reused from compliance.types.ts) */
export type ComplianceStatus = "met" | "partial_high" | "partial_low" | "unmet";

/** Drill-down query params */
export interface ElementDrilldownQuery {
  readonly course_id?: string;
  readonly program_id?: string;
}

/** Evidence chain stats */
export interface EvidenceChainStats {
  readonly complete_chains: number;
  readonly total_chains: number;
  readonly gaps_by_level: {
    readonly ilo_gaps: number;
    readonly slo_gaps: number;
    readonly course_gaps: number;
  };
}
```

---

## Section 4: Database Schema (inline, complete)

No new tables needed. Reads from existing compliance and curriculum mapping data:

```sql
-- Existing tables used:
-- lcme_elements (id, standard_id, number, name, description)
-- lcme_standards (id, number, name)
-- compliance_results (institution_id, element_id, compliance_score, evidence_count, total_expected)
-- ilo_element_mappings (ilo_id, element_id) -- ILOs mapped to LCME elements
-- slo_ilo_mappings (slo_id, ilo_id) -- SLOs mapped to ILOs
-- course_slo_mappings (course_id, slo_id) -- Courses mapped to SLOs

-- Neo4j is also used for chain traversal queries:
-- (Element)<-[:MAPS_TO]-(ILO)<-[:MAPS_TO]-(SLO)<-[:OFFERS]-(Course)
```

---

## Section 5: API Contract (complete request/response)

### GET /api/v1/compliance/elements/:elementId (Auth: institutional_admin)

**Query params:** `?course_id=uuid&program_id=uuid`

**Success Response (200):**
```json
{
  "data": {
    "element_id": "elem-1-1",
    "element_number": "1.1",
    "element_description": "Strategic Planning and Continuous Quality Improvement",
    "standard_id": "std-1",
    "standard_name": "Mission, Planning, and Integration",
    "standard_number": 1,
    "compliance_score": 80,
    "compliance_status": "partial_high",
    "evidence_count": 4,
    "total_expected": 5,
    "evidence_chain": [
      {
        "id": "ilo-uuid-1",
        "type": "ilo",
        "label": "ILO: Understand cardiovascular system physiology",
        "description": "Students will demonstrate understanding of...",
        "link": "/curriculum/ilos/ilo-uuid-1",
        "has_gap": false,
        "gap_message": null,
        "children": [
          {
            "id": "slo-uuid-1",
            "type": "slo",
            "label": "SLO: Describe cardiac cycle phases",
            "description": "Students can identify and describe...",
            "link": "/curriculum/slos/slo-uuid-1",
            "has_gap": false,
            "gap_message": null,
            "children": [
              {
                "id": "course-uuid-1",
                "type": "course",
                "label": "PHARM-101: Pharmacology I",
                "description": "Introduction to pharmacological principles",
                "link": "/courses/course-uuid-1",
                "has_gap": false,
                "gap_message": null,
                "children": []
              }
            ]
          }
        ]
      },
      {
        "id": "ilo-uuid-2",
        "type": "ilo",
        "label": "ILO: Analyze cardiac pathophysiology",
        "description": "Students will analyze...",
        "link": "/curriculum/ilos/ilo-uuid-2",
        "has_gap": true,
        "gap_message": "This ILO has no mapped SLOs",
        "children": []
      }
    ]
  },
  "error": null
}
```

### GET /api/v1/compliance/elements/:elementId/stats (Auth: institutional_admin)

**Success Response (200):**
```json
{
  "data": {
    "complete_chains": 4,
    "total_chains": 5,
    "gaps_by_level": {
      "ilo_gaps": 0,
      "slo_gaps": 1,
      "course_gaps": 0
    }
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-institutional_admin role |
| 404 | `ELEMENT_NOT_FOUND` | Element ID does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Section 6: Frontend Spec

### Page: `/admin/compliance/elements/[elementId]`

**Route:** `apps/web/src/app/(dashboard)/admin/compliance/elements/[elementId]/page.tsx`

**Component hierarchy:**
```
ElementDrilldownPage (page.tsx -- default export)
  +-- Breadcrumb (Compliance > Standard {N} > Element {N.N})
  +-- ElementHeader
  |     +-- ElementTitle (number + description)
  |     +-- ComplianceStatusBadge (met/partial/unmet with %)
  |     +-- EvidenceStats (complete chains / total, gaps by level)
  |     +-- ExportPdfButton (export this element's evidence chain)
  +-- FilterBar
  |     +-- CourseFilter (dropdown)
  |     +-- ProgramFilter (dropdown)
  +-- EvidenceChainTree (organism)
        +-- ChainNode (recursive, collapsible)
        |     +-- NodeIcon (based on type: element/ilo/slo/course)
        |     +-- NodeLabel (clickable link to detail page)
        |     +-- GapIndicator (warning icon + message if has_gap)
        |     +-- CollapseToggle (expand/collapse children)
        |     +-- ChildNodes (recursive ChainNode)
```

**States:**
1. **Loading** -- Skeleton matching tree layout (indented lines with circles)
2. **Data** -- Full evidence chain tree with collapsible nodes
3. **Filtered** -- Tree pruned to show only chains matching course/program filter
4. **Empty chain** -- "No evidence chains found for this element" with action CTA
5. **Error** -- Error message with retry button

**Design tokens:**
- Status badge: met = Green `#69a338`, partial = warning-amber, unmet = error-red
- Gap indicator: error-red icon + text
- Node icons: Lucide icons per type (BookOpen for ILO, Target for SLO, GraduationCap for Course)
- Tree indentation: 24px per level
- Collapse/expand: ChevronRight / ChevronDown
- Surface: White card on Cream `#f5f3ef`

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/compliance/evidence-chain.types.ts` | Types | Create |
| 2 | `packages/types/src/compliance/index.ts` | Types | Edit (add evidence chain export) |
| 3 | `apps/server/src/modules/compliance/services/element-drilldown.service.ts` | Service | Create |
| 4 | `apps/server/src/modules/compliance/controllers/element-drilldown.controller.ts` | Controller | Create |
| 5 | `apps/server/src/modules/compliance/routes/compliance.routes.ts` | Routes | Edit (add element endpoints) |
| 6 | `apps/web/src/components/compliance/gap-indicator.tsx` | Atom | Create |
| 7 | `apps/web/src/components/compliance/chain-node.tsx` | Molecule | Create |
| 8 | `apps/web/src/components/compliance/evidence-chain-tree.tsx` | Organism | Create |
| 9 | `apps/web/src/app/(dashboard)/admin/compliance/elements/[elementId]/page.tsx` | Page | Create |
| 10 | `apps/server/src/modules/compliance/__tests__/element-drilldown.service.test.ts` | Tests | Create |
| 11 | `apps/server/src/modules/compliance/__tests__/element-drilldown.controller.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-27 | institutional_admin | **NOT YET** | Compliance computation with evidence chain data |

### Cross-Epic Links (navigation targets, not blockers)
- ILO detail pages (E-14)
- SLO detail pages (E-09)
- Course detail pages (E-08, STORY-F-1)

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `neo4j-driver` -- Neo4j for chain traversal queries
- `lucide-react` -- Node type icons, gap indicator icon
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` -- `Neo4jClientConfig`
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>`

---

## Section 9: Test Fixtures (inline)

```typescript
// Mock Institutional Admin
export const INST_ADMIN_USER = {
  sub: "admin-uuid-1",
  email: "admin@med.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock element drilldown data (complete chain)
export const MOCK_ELEMENT_DRILLDOWN = {
  element_id: "elem-1-1",
  element_number: "1.1",
  element_description: "Strategic Planning and Continuous Quality Improvement",
  standard_id: "std-1",
  standard_name: "Mission, Planning, and Integration",
  standard_number: 1,
  compliance_score: 80,
  compliance_status: "partial_high" as const,
  evidence_count: 4,
  total_expected: 5,
  evidence_chain: [
    {
      id: "ilo-1",
      type: "ilo" as const,
      label: "ILO: Understand cardiac physiology",
      description: "Students will demonstrate understanding...",
      link: "/curriculum/ilos/ilo-1",
      has_gap: false,
      gap_message: null,
      children: [
        {
          id: "slo-1",
          type: "slo" as const,
          label: "SLO: Describe cardiac cycle",
          description: "Students can identify...",
          link: "/curriculum/slos/slo-1",
          has_gap: false,
          gap_message: null,
          children: [
            {
              id: "course-1",
              type: "course" as const,
              label: "PHARM-101: Pharmacology I",
              description: "Intro to pharmacology",
              link: "/courses/course-1",
              has_gap: false,
              gap_message: null,
              children: [],
            },
          ],
        },
      ],
    },
    {
      id: "ilo-2",
      type: "ilo" as const,
      label: "ILO: Analyze cardiac pathophysiology",
      description: "Students will analyze...",
      link: "/curriculum/ilos/ilo-2",
      has_gap: true,
      gap_message: "This ILO has no mapped SLOs",
      children: [],
    },
  ],
};

// Mock element with no evidence chains
export const MOCK_EMPTY_ELEMENT = {
  ...MOCK_ELEMENT_DRILLDOWN,
  element_id: "elem-2-1",
  compliance_score: 0,
  compliance_status: "unmet" as const,
  evidence_count: 0,
  total_expected: 3,
  evidence_chain: [],
};

// Mock stats
export const MOCK_CHAIN_STATS = {
  complete_chains: 4,
  total_chains: 5,
  gaps_by_level: { ilo_gaps: 0, slo_gaps: 1, course_gaps: 0 },
};
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/modules/compliance/__tests__/element-drilldown.service.test.ts`

```
describe("ElementDrilldownService")
  describe("getDrilldown")
    + returns element with full evidence chain tree
    + builds tree: Element -> ILOs -> SLOs -> Courses
    + marks nodes with has_gap=true when children are missing
    + gap_message describes the missing link (e.g., "ILO has no mapped SLOs")
    + each node includes correct link to its detail page
    + filters chain by course_id when provided
    + filters chain by program_id when provided
    + returns empty evidence_chain when element has no ILO mappings
    + scopes to user's institution
    + returns null for non-existent element_id

  describe("getStats")
    + returns correct complete_chains count
    + returns correct gaps_by_level breakdown
    + returns all zeros when no chains exist
```

**File:** `apps/server/src/modules/compliance/__tests__/element-drilldown.controller.test.ts`

```
describe("ElementDrilldownController")
  describe("GET /api/v1/compliance/elements/:elementId")
    + returns 200 with element drilldown data
    + returns 404 for non-existent element
    + rejects non-institutional_admin (403)
    + rejects unauthenticated request (401)
    + narrows req.params.elementId with typeof check

  describe("GET /api/v1/compliance/elements/:elementId/stats")
    + returns 200 with chain stats
    + returns 404 for non-existent element
```

**Total: ~19 tests**

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. E2E coverage will be part of the full LCME compliance journey: heatmap click -> drill-down -> verify evidence chain.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | Drill-down page shows element header with compliance status | Manual |
| 2 | Evidence chain tree displays Element -> ILO -> SLO -> Course hierarchy | API test + manual |
| 3 | Tree nodes are collapsible | Manual |
| 4 | Gap indicators highlight missing links with descriptive messages | API test |
| 5 | Each node is a clickable link to its detail page | Manual |
| 6 | Evidence stats show complete chains vs total | API test |
| 7 | Filter by course or program works | API test |
| 8 | Breadcrumb navigation: Compliance > Standard N > Element N.N | Manual |
| 9 | Loading skeleton matches tree layout | Manual |
| 10 | Non-institutional_admin roles receive 403 | API test |
| 11 | req.params.elementId narrowed with typeof check | Code review |
| 12 | All ~19 API tests pass | CI |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| Drill-down page at /admin/compliance/elements/:elementId | S-IA-30-3 SS Acceptance Criteria |
| Evidence chain tree: Element -> ILOs -> SLOs -> Courses | S-IA-30-3 SS Acceptance Criteria |
| Gap indicators for missing links | S-IA-30-3 SS Acceptance Criteria |
| Clickable node links | S-IA-30-3 SS Acceptance Criteria |
| Filter by course or program | S-IA-30-3 SS Acceptance Criteria |
| Breadcrumb navigation | S-IA-30-3 SS Acceptance Criteria |
| PDF export for individual elements | S-IA-30-3 SS Acceptance Criteria |
| Recursive tree component | S-IA-30-3 SS Notes |
| Deep links to ILO/SLO/Course pages | S-IA-30-3 SS Notes |

---

## Section 14: Environment Prerequisites

- **Supabase:** Project running, LCME standards/elements seeded, compliance results computed (STORY-IA-27), ILO/SLO/Course mapping tables exist
- **Neo4j:** Running with evidence chain relationships (Element-ILO-SLO-Course mappings)
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000

---

## Section 15: Figma Make Prototype

Recommended: Create a wireframe for the evidence chain tree showing collapsible nodes at multiple indentation levels, gap indicators with warning styling, and the element header with compliance badge. This is a visually complex tree component that benefits from design review before coding.
