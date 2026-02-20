# STORY-AD-5: Advisor Dashboard Page — BRIEF

## 0. Lane & Priority

```yaml
story_id: STORY-AD-5
old_id: S-AD-45-1
lane: advisor
lane_priority: 5
within_lane_order: 5
epic: E-45 (Advisor Cohort Dashboard & Interventions)
feature: F-21
sprint: 38
size: L
depends_on:
  - STORY-AD-4 (advisor) — Risk Flag Generation (flags to display)
blocks:
  - STORY-AD-7 — Intervention Recommendation Engine (dashboard context)
  - STORY-AD-8 — Intervention Logging (dashboard context)
personas_served: [advisor]
```

## 1. Summary

Build the advisor dashboard page at `/dashboard/advisor` showing at-risk students with risk scores, concept-level diagnostics, and prerequisite chain visualizations. The dashboard includes a sortable student list, risk distribution chart, filters/search, expandable concept diagnostic views, unacknowledged flag count badge, quick action buttons, and real-time flag count via SSE. This is the primary interface for academic advisors to monitor their cohort and prioritize interventions.

**Parent epic:** E-45 (Advisor Cohort Dashboard & Interventions)
**Parent feature:** F-21
**User flows satisfied:** Weekly cohort review, ad hoc student drill-down, flag acknowledgment
**Personas involved:** Advisor (primary user)

**Product context:** From [PRODUCT_BRIEF §Fatima Al-Rashid]: "I see that Marcus is flagged 3 weeks before the Organ Systems exam. The system shows he's weak on 4 specific SubConcepts in Renal, all stemming from a gap in acid-base physiology."

**Design context:** Advisor persona color is `blueLight` (#00a8e1). Uses Template A (Dashboard Shell): sidebar 240px, topbar 64px, cream content bg, KPI strip (navyDeep with WovenField). No dedicated advisor screens in DESIGN_SPEC — use dashboard template with advisor-specific organisms.

## 2. Task Breakdown

1. Define dashboard types in `packages/types/src/advisor/dashboard.types.ts`
2. Create advisor dashboard model in `apps/server/src/modules/advisor/models/advisor-dashboard.model.ts`
3. Create advisor dashboard repository in `apps/server/src/modules/advisor/repositories/advisor-dashboard.repository.ts`
4. Create advisor dashboard service in `apps/server/src/modules/advisor/services/advisor-dashboard.service.ts`
5. Create advisor dashboard controller in `apps/server/src/modules/advisor/controllers/advisor-dashboard.controller.ts`
6. Create advisor dashboard routes in `apps/server/src/modules/advisor/routes/advisor-dashboard.routes.ts`
7. Create advisor dashboard template in `apps/web/src/components/templates/advisor-dashboard-template.tsx`
8. Create at-risk student card component in `apps/web/src/components/advisor/at-risk-student-card.tsx`
9. Create risk distribution chart component in `apps/web/src/components/advisor/risk-distribution-chart.tsx`
10. Create concept diagnostic view in `apps/web/src/components/advisor/concept-diagnostic-view.tsx`
11. Create prerequisite chain visualization in `apps/web/src/components/advisor/prerequisite-chain-viz.tsx`
12. Update advisor dashboard page in `apps/web/src/app/(dashboard)/advisor/page.tsx`
13. Write service tests
14. Write controller tests
15. Write E2E test

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/advisor/dashboard.types.ts

export interface AtRiskStudent {
  readonly id: string;
  readonly student_id: string;
  readonly student_name: string;
  readonly email: string;
  readonly cohort: string;
  readonly risk_level: RiskLevel;
  readonly confidence: number;
  readonly p_fail: number;
  readonly top_struggling_concepts: readonly StrugglingConcept[];
  readonly flag_id: string;
  readonly flag_status: FlagStatus;
  readonly flag_created_at: string;
}

export interface StrugglingConcept {
  readonly concept_id: string;
  readonly concept_name: string;
  readonly p_mastered: number;
  readonly impact_score: number;
}

export type RiskLevel = "low" | "moderate" | "high" | "critical";
export type FlagStatus = "created" | "acknowledged" | "resolved";

export interface RiskDistribution {
  readonly low: number;
  readonly moderate: number;
  readonly high: number;
  readonly critical: number;
}

export interface AdvisorDashboardData {
  readonly students: readonly AtRiskStudent[];
  readonly risk_distribution: RiskDistribution;
  readonly total_students: number;
  readonly unacknowledged_count: number;
}

export interface AdvisorDashboardQuery {
  readonly risk_level?: RiskLevel;
  readonly cohort?: string;
  readonly course_id?: string;
  readonly search?: string;
  readonly page?: number;
  readonly limit?: number;
  readonly sort_by?: "risk_level" | "confidence" | "created_at" | "student_name";
  readonly sort_dir?: "asc" | "desc";
}

export interface ConceptDiagnostic {
  readonly student_id: string;
  readonly root_causes: readonly RootCause[];
  readonly chains: readonly PrerequisiteChain[];
}

export interface RootCause {
  readonly concept_id: string;
  readonly concept_name: string;
  readonly p_mastered: number;
  readonly depth: number;
  readonly impact_score: number;
  readonly downstream_concepts: readonly string[];
}

export interface PrerequisiteChain {
  readonly links: readonly ChainLink[];
}

export interface ChainLink {
  readonly source_id: string;
  readonly source_name: string;
  readonly source_mastery: number;
  readonly target_id: string;
  readonly target_name: string;
  readonly target_mastery: number;
  readonly confidence: number;
}

export interface AdvisorKPIData {
  readonly total_assigned_students: number;
  readonly at_risk_count: number;
  readonly critical_count: number;
  readonly unacknowledged_flags: number;
  readonly avg_resolution_time_days: number | null;
}
```

## 4. Database Schema (inline, complete)

### Supabase — Reads from existing tables

```sql
-- Primary query: join risk_flags with user profiles for student list
SELECT
    rf.id AS flag_id,
    rf.student_id,
    up.display_name AS student_name,
    au.email,
    s.cohort,
    rf.risk_level,
    rf.confidence,
    rf.p_fail,
    rf.top_3_root_causes,
    rf.status AS flag_status,
    rf.created_at AS flag_created_at
FROM risk_flags rf
JOIN user_profiles up ON up.id = rf.student_id
JOIN auth.users au ON au.id = rf.student_id
LEFT JOIN students s ON s.supabase_auth_id = rf.student_id
WHERE rf.institution_id = $institutionId
  AND rf.status IN ('created', 'acknowledged')
ORDER BY
    CASE rf.risk_level
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'moderate' THEN 3
        WHEN 'low' THEN 4
    END ASC,
    rf.created_at DESC
LIMIT $limit OFFSET $offset;

-- Risk distribution count
SELECT risk_level, COUNT(*) AS count
FROM risk_flags
WHERE institution_id = $institutionId
  AND status IN ('created', 'acknowledged')
GROUP BY risk_level;

-- Unacknowledged flag count (for badge)
SELECT COUNT(*) AS unacknowledged_count
FROM risk_flags
WHERE institution_id = $institutionId
  AND status = 'created';
```

### Neo4j — Concept diagnostic queries

```cypher
-- Root causes for a student (calls root-cause API from STORY-AD-2)
-- Prerequisite chain visualization data
MATCH (s:Student {supabase_auth_id: $studentId})-[:HAS_MASTERY]->(cm:ConceptMastery)
MATCH (cm)-[:FOR_CONCEPT]->(sc:SubConcept)
WHERE cm.p_mastered < 0.5
OPTIONAL MATCH path = (root:SubConcept)-[:PREREQUISITE_OF*1..5]->(sc)
RETURN sc.id, sc.name, cm.p_mastered,
       [n IN nodes(path) | {id: n.id, name: n.name}] AS chain
```

## 5. API Contract (complete request/response)

### GET /api/v1/advisor/dashboard

**Role access:** advisor (own institution), superadmin, institutional_admin
**Auth:** Bearer token
**RBAC:** `rbac.require(AuthRole.ADVISOR, AuthRole.INSTITUTIONAL_ADMIN, AuthRole.SUPERADMIN)`

**Query params:**
- `risk_level` (string, optional): Filter by risk level
- `cohort` (string, optional): Filter by cohort
- `course_id` (string, optional): Filter by course
- `search` (string, optional): Search by student name/ID
- `page` (int, default=1), `limit` (int, default=20)
- `sort_by` (string, default="risk_level"), `sort_dir` (string, default="desc")

**Response (200):**
```json
{
    "data": {
        "students": [
            {
                "id": "entry-001",
                "student_id": "student-uuid-123",
                "student_name": "Marcus Williams",
                "email": "marcus.williams@msm.edu",
                "cohort": "M2-2026",
                "risk_level": "critical",
                "confidence": 0.91,
                "p_fail": 0.78,
                "top_struggling_concepts": [
                    {"concept_id": "acid-base", "concept_name": "Acid-Base Physiology", "p_mastered": 0.15, "impact_score": 5},
                    {"concept_id": "renal-tubular", "concept_name": "Renal Tubular Function", "p_mastered": 0.22, "impact_score": 3},
                    {"concept_id": "electrolytes", "concept_name": "Electrolyte Balance", "p_mastered": 0.28, "impact_score": 2}
                ],
                "flag_id": "flag-uuid-001",
                "flag_status": "created",
                "flag_created_at": "2026-02-19T02:00:00Z"
            }
        ],
        "risk_distribution": {"low": 89, "moderate": 35, "high": 18, "critical": 6},
        "total_students": 148,
        "unacknowledged_count": 24
    },
    "error": null,
    "meta": {"page": 1, "limit": 20, "total": 24, "total_pages": 2}
}
```

### GET /api/v1/advisor/dashboard/kpi

**Role access:** advisor, superadmin, institutional_admin

**Response (200):**
```json
{
    "data": {
        "total_assigned_students": 40,
        "at_risk_count": 8,
        "critical_count": 2,
        "unacknowledged_flags": 5,
        "avg_resolution_time_days": 4.2
    },
    "error": null
}
```

### GET /api/v1/advisor/students/:studentId/diagnostic

**Role access:** advisor (own institution), superadmin

**Response (200):**
```json
{
    "data": {
        "student_id": "student-uuid-123",
        "root_causes": [
            {
                "concept_id": "acid-base",
                "concept_name": "Acid-Base Physiology",
                "p_mastered": 0.15,
                "depth": 3,
                "impact_score": 5,
                "downstream_concepts": ["renal-tubular", "electrolytes", "fluid-reg", "nephron", "diuretics"]
            }
        ],
        "chains": [
            {
                "links": [
                    {"source_id": "acid-base", "source_name": "Acid-Base Physiology", "source_mastery": 0.15, "target_id": "nephron", "target_name": "Nephron Function", "target_mastery": 0.35, "confidence": 0.92}
                ]
            }
        ]
    },
    "error": null
}
```

### GET /api/v1/advisor/dashboard/sse

**Role access:** advisor
**Transport:** Server-Sent Events
**Events:**
```
event: flag_count_update
data: {"unacknowledged_count": 25, "new_flag_id": "flag-uuid-new"}
```

## 6. Frontend Spec

### Component Hierarchy (Atomic Design)

```
Page: AdvisorDashboardPage (apps/web/src/app/(dashboard)/advisor/page.tsx)
  └── Template: AdvisorDashboardTemplate
        ├── Organism: KPI Strip (navyDeep inverted bookmark)
        │     ├── Molecule: KPI Card (total students)
        │     ├── Molecule: KPI Card (at-risk count)
        │     ├── Molecule: KPI Card (critical count)
        │     └── Molecule: KPI Card (unacknowledged flags)
        ├── Organism: Student Risk List
        │     ├── Molecule: Search + Filter Bar
        │     │     ├── Atom: SearchInput
        │     │     ├── Atom: RiskLevelFilter (dropdown)
        │     │     ├── Atom: CohortFilter (dropdown)
        │     │     └── Atom: CourseFilter (dropdown)
        │     └── Molecule: AtRiskStudentCard (repeating)
        │           ├── Atom: RiskLevelBadge
        │           ├── Atom: ConfidenceScore
        │           ├── Molecule: StrugglingConceptPills
        │           └── Molecule: QuickActionButtons
        ├── Organism: RiskDistributionChart (donut/pie)
        └── Organism: ConceptDiagnosticView (expandable panel)
              ├── Molecule: RootCauseList
              └── Organism: PrerequisiteChainViz (D3.js tree/force)
```

### Props Interfaces

```typescript
// AtRiskStudentCard
interface AtRiskStudentCardProps {
  readonly student: AtRiskStudent;
  readonly onAcknowledge: (flagId: string) => void;
  readonly onExpand: (studentId: string) => void;
  readonly isExpanded: boolean;
}

// RiskDistributionChart
interface RiskDistributionChartProps {
  readonly distribution: RiskDistribution;
}

// ConceptDiagnosticView
interface ConceptDiagnosticViewProps {
  readonly studentId: string;
  readonly diagnostic: ConceptDiagnostic | null;
  readonly isLoading: boolean;
}

// PrerequisiteChainViz
interface PrerequisiteChainVizProps {
  readonly chains: readonly PrerequisiteChain[];
  readonly width?: number;
  readonly height?: number;
}
```

### States

- **Loading:** Skeleton cards (3 placeholder cards with shimmer)
- **Empty:** "No at-risk students in your cohort" with serif heading, centered icon
- **Error:** Toast notification with danger accent
- **Expanded student:** Concept diagnostic panel slides open below the card
- **SSE connected:** Green dot indicator in topbar
- **SSE disconnected:** Orange dot with "Reconnecting..." tooltip

### Design Tokens

- **Risk level badges:**
  - Low: `green/10%` bg, `greenDark` text
  - Moderate: `warning/10%` bg, `warning` text
  - High: `warning` bg, `white` text
  - Critical: `danger` bg, `white` text, pulsing animation
- **Student card:** white bg on cream, `borderLight` border, `radius-2xl` (12px), `padding 20px 24px`
- **KPI strip:** `navyDeep` bg, frosted glass stat cards (`rgba(255,255,255,0.06)` bg)
- **Advisor persona accent:** `blueLight` (#00a8e1) for active tab, persona indicator bar
- **Mastery cell colors:** >70% green, 40-70% blueMid, 15-40% bluePale, <15% borderLight

## 7. Files to Create (exact paths, implementation order)

| # | Path | Layer | Purpose |
|---|------|-------|---------|
| 1 | `packages/types/src/advisor/dashboard.types.ts` | Types | Dashboard type interfaces |
| 2 | `packages/types/src/advisor/index.ts` | Types | Barrel export |
| 3 | `apps/server/src/modules/advisor/models/advisor-dashboard.model.ts` | Model | Dashboard domain model |
| 4 | `apps/server/src/modules/advisor/repositories/advisor-dashboard.repository.ts` | Repository | Supabase + Neo4j queries |
| 5 | `apps/server/src/modules/advisor/services/advisor-dashboard.service.ts` | Service | Dashboard business logic |
| 6 | `apps/server/src/modules/advisor/controllers/advisor-dashboard.controller.ts` | Controller | HTTP handlers |
| 7 | `apps/server/src/modules/advisor/routes/advisor-dashboard.routes.ts` | Route | Express routes + RBAC |
| 8 | `apps/web/src/components/templates/advisor-dashboard-template.tsx` | Template | Dashboard layout |
| 9 | `apps/web/src/components/advisor/at-risk-student-card.tsx` | Component | Student card organism |
| 10 | `apps/web/src/components/advisor/risk-distribution-chart.tsx` | Component | Donut chart organism |
| 11 | `apps/web/src/components/advisor/concept-diagnostic-view.tsx` | Component | Expandable diagnostic |
| 12 | `apps/web/src/components/advisor/prerequisite-chain-viz.tsx` | Component | D3.js visualization |
| 13 | `apps/web/src/app/(dashboard)/advisor/page.tsx` | Page | Replace placeholder |
| 14 | `apps/server/src/modules/advisor/__tests__/advisor-dashboard.service.test.ts` | Test | Service tests |
| 15 | `apps/server/src/modules/advisor/__tests__/advisor-dashboard.controller.test.ts` | Test | Controller tests |
| 16 | `e2e/advisor-dashboard.spec.ts` | E2E | Critical journey test |

**Existing file to modify:**
- `packages/types/src/index.ts` — add advisor exports

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | What It Provides |
|-------|------|--------|-----------------|
| STORY-AD-4 (Risk Flags) | advisor | NOT STARTED | risk_flags table + data |
| STORY-U-6 (RBAC) | universal | DONE | rbac.require() middleware |
| STORY-U-10 (Dashboard Routing) | universal | DONE | Dashboard layout, route guards |

### NPM Packages
- `d3` or `@visx/visx` (for prerequisite chain visualization)
- `recharts` or `@visx/visx` (for risk distribution chart)
- `eventsource` or native EventSource (for SSE)

### Existing Files Needed
- `apps/server/src/middleware/auth.middleware.ts` — authentication
- `apps/server/src/middleware/rbac.middleware.ts` — role-based access
- `apps/web/src/lib/supabase.ts` — browser client
- `apps/web/src/app/(dashboard)/layout.tsx` — dashboard layout
- `packages/types/src/auth/roles.types.ts` — AuthRole.ADVISOR

## 9. Test Fixtures (inline)

```typescript
// Service test fixtures
export const MOCK_AT_RISK_STUDENTS: AtRiskStudent[] = [
  {
    id: "entry-001",
    student_id: "student-001",
    student_name: "Marcus Williams",
    email: "marcus.williams@msm.edu",
    cohort: "M2-2026",
    risk_level: "critical",
    confidence: 0.91,
    p_fail: 0.78,
    top_struggling_concepts: [
      { concept_id: "acid-base", concept_name: "Acid-Base Physiology", p_mastered: 0.15, impact_score: 5 },
      { concept_id: "renal-tubular", concept_name: "Renal Tubular Function", p_mastered: 0.22, impact_score: 3 },
    ],
    flag_id: "flag-001",
    flag_status: "created",
    flag_created_at: "2026-02-19T02:00:00Z",
  },
  {
    id: "entry-002",
    student_id: "student-002",
    student_name: "Sarah Chen",
    email: "sarah.chen@msm.edu",
    cohort: "M2-2026",
    risk_level: "high",
    confidence: 0.82,
    p_fail: 0.55,
    top_struggling_concepts: [
      { concept_id: "hepatic-meta", concept_name: "Hepatic Metabolism", p_mastered: 0.30, impact_score: 3 },
    ],
    flag_id: "flag-002",
    flag_status: "acknowledged",
    flag_created_at: "2026-02-18T02:00:00Z",
  },
];

export const MOCK_RISK_DISTRIBUTION: RiskDistribution = {
  low: 89,
  moderate: 35,
  high: 18,
  critical: 6,
};

export const MOCK_KPI_DATA: AdvisorKPIData = {
  total_assigned_students: 40,
  at_risk_count: 8,
  critical_count: 2,
  unacknowledged_flags: 5,
  avg_resolution_time_days: 4.2,
};

export const MOCK_CONCEPT_DIAGNOSTIC: ConceptDiagnostic = {
  student_id: "student-001",
  root_causes: [
    {
      concept_id: "acid-base",
      concept_name: "Acid-Base Physiology",
      p_mastered: 0.15,
      depth: 3,
      impact_score: 5,
      downstream_concepts: ["renal-tubular", "electrolytes", "fluid-reg", "nephron", "diuretics"],
    },
  ],
  chains: [
    {
      links: [
        {
          source_id: "acid-base",
          source_name: "Acid-Base Physiology",
          source_mastery: 0.15,
          target_id: "nephron",
          target_name: "Nephron Function",
          target_mastery: 0.35,
          confidence: 0.92,
        },
      ],
    },
  ],
};

// Invalid query
export const MOCK_INVALID_QUERY = {
  page: -1,
  limit: 500,
  risk_level: "invalid_level",
};
```

## 10. API Test Spec (vitest — PRIMARY)

```typescript
// apps/server/src/modules/advisor/__tests__/advisor-dashboard.service.test.ts
describe("AdvisorDashboardService", () => {
  it("returns at-risk students sorted by severity (critical first)");
  it("filters students by risk level");
  it("filters students by cohort");
  it("filters students by course");
  it("searches students by name");
  it("searches students by student ID");
  it("returns risk distribution counts");
  it("returns unacknowledged flag count");
  it("paginates results correctly");
  it("returns KPI data with aggregate stats");
  it("returns empty list when no at-risk students");
  it("advisor only sees students in their institution");
});

// apps/server/src/modules/advisor/__tests__/advisor-dashboard.controller.test.ts
describe("AdvisorDashboardController", () => {
  it("GET /api/v1/advisor/dashboard returns 200 with dashboard data");
  it("GET /api/v1/advisor/dashboard returns 401 without auth");
  it("GET /api/v1/advisor/dashboard returns 403 for student role");
  it("GET /api/v1/advisor/dashboard/kpi returns KPI stats");
  it("GET /api/v1/advisor/students/:id/diagnostic returns concept diagnostic");
  it("validates query parameters (page, limit, risk_level)");
});
```

## 11. E2E Test Spec (Playwright — YES, critical journey)

```typescript
// e2e/advisor-dashboard.spec.ts
test.describe("Advisor Dashboard", () => {
  test("advisor can view at-risk student list sorted by severity", async ({ page }) => {
    // Login as advisor
    // Navigate to /dashboard/advisor
    // Verify KPI strip shows correct counts
    // Verify student cards displayed with risk badges
    // Verify critical students appear first
  });

  test("advisor can expand student to see concept diagnostic", async ({ page }) => {
    // Click on student card
    // Verify concept diagnostic view expands
    // Verify root causes displayed
    // Verify prerequisite chain visualization renders
  });

  test("advisor can acknowledge a risk flag", async ({ page }) => {
    // Click acknowledge button on student card
    // Verify flag status updates to acknowledged
    // Verify unacknowledged count decrements
  });

  test("advisor can filter by risk level", async ({ page }) => {
    // Select "Critical" from risk level filter
    // Verify only critical students shown
  });

  test("advisor can search for student by name", async ({ page }) => {
    // Type student name in search
    // Verify filtered results
  });
});
```

## 12. Acceptance Criteria

1. Dashboard page at `/dashboard/advisor` with role-based route guard (advisor, institutional_admin, superadmin)
2. At-risk student list sorted by risk severity (critical first)
3. Per student card shows: name, risk level badge, confidence score, top 3 struggling concepts
4. Risk distribution chart (donut/pie) showing low/moderate/high/critical counts
5. Filter by risk level, cohort, and course
6. Search by student name or ID
7. Click student to expand full concept diagnostic view
8. Concept diagnostic shows prerequisite chain visualization with root causes
9. Unacknowledged flag count badge in navigation
10. Quick action buttons: acknowledge flag, schedule meeting, view history
11. Responsive layout with card grid
12. Loading skeletons and empty states
13. Real-time flag count via SSE (new flags during session)
14. Advisor sees only students in their assigned institution (RBAC filter)
15. All API tests pass, E2E critical journey passes

## 13. Source References

| Claim | Source |
|-------|--------|
| Advisor dashboard spec | [ARCHITECTURE_v10 §13.4] |
| Dashboard Template A | [DESIGN_SPEC §Template A] |
| KPI strip design | [DESIGN_SPEC §Inverted Bookmark] |
| Card design tokens | [DESIGN_SPEC §Card, radius-2xl, borderLight] |
| Risk level badge colors | [DESIGN_SPEC §Badge variants] |
| Advisor persona color blueLight | [DESIGN_SPEC §Persona identifiers] |
| SSE for real-time updates | [ARCHITECTURE_v10 §3.5, S-AD-45-1 §AC] |
| D3.js for prerequisite viz | [S-AD-45-1 §Notes] |
| Advisor RBAC permissions | [RBAC_MIDDLEWARE_PATTERN §students.read] |
| Advisor sees own institution only | [S-AD-45-1 §Notes] |
| Empty state design | [DESIGN_SPEC §Empty States] |
| Mastery cell color thresholds | [DESIGN_SPEC §Mastery Cell] |
| Fatima success scenario | [PRODUCT_BRIEF §Fatima Al-Rashid] |

## 14. Environment Prerequisites

- Express server running with auth + RBAC middleware
- Supabase with risk_flags table populated (from STORY-AD-4)
- Neo4j with ConceptMastery + PREREQUISITE_OF data
- Root-cause API accessible (STORY-AD-2)
- D3.js or Visx installed for visualizations
- SSE endpoint configured

## 15. Figma Make Prototype (Optional)

**Recommended:** Prototype the advisor dashboard layout before coding. Key screens to prototype:
1. Main dashboard with KPI strip + student list
2. Expanded concept diagnostic view
3. Prerequisite chain visualization

Use Template A (Dashboard Shell) as the base layout.
