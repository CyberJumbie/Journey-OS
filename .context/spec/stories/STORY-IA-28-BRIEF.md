# STORY-IA-28 Brief: Gap Drill-Down UI

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-28
old_id: S-IA-29-1
lane: institutional_admin
lane_priority: 2
within_lane_order: 28
sprint: 8
size: M
depends_on:
  - STORY-IA-13 (institutional_admin) — USMLE Heatmap Component (provides heatmap cells to click from)
blocks:
  - S-IA-29-2 — Gap-Driven Generation Trigger
personas_served: [institutional_admin, faculty]
epic: E-29 (Gap-Driven Generation)
feature: F-13 (USMLE Coverage Analytics)
user_flow: UF-22 (Institutional Coverage Analysis)
```

---

## 1. Summary

Build a **Gap Drill-Down UI** that activates when an admin clicks a heatmap cell. The drill-down reveals the specific USMLE Topics within that system-discipline intersection, each with coverage percentage. Topics are sorted by coverage ascending (worst gaps first). Each topic is expandable to show individual SubConcepts with assessed/unassessed status. Topics with >50% unassessed SubConcepts receive a "Blind Spot" badge. An action button per topic navigates to the generation workbench pre-scoped to that gap.

Key constraints:
- **Dynamic route:** `/coverage/[system]/[discipline]` with URL-encoded segments
- **Breadcrumb navigation:** Heatmap -> System: Discipline -> Topic details
- **Neo4j query** for topic/subconcept data with coverage assessment status
- **"Generate Questions" button** passes scope params to workbench URL
- **Blind spot detection:** topic.blind_spot = (unassessed_subconcepts / total_subconcepts) > 0.5

---

## 2. Task Breakdown

Implementation order follows: **Types -> Atoms -> Molecules -> Hooks -> Organisms -> Page -> Tests**

### Task 1: Create gap drill-down types
- **File:** `packages/types/src/coverage/gap-drilldown.types.ts`
- **Action:** Export `TopicCoverage`, `SubConceptCoverage`, `GapDrilldownData`, `GapDrilldownSummary`

### Task 2: Export types from coverage barrel
- **File:** `packages/types/src/coverage/index.ts`
- **Action:** Edit to re-export from `gap-drilldown.types.ts`

### Task 3: Build CoverageBadge atom
- **File:** `packages/ui/src/atoms/coverage-badge.tsx`
- **Action:** Named export `CoverageBadge`. Renders color-coded percentage badge: red (0-30%), yellow (31-70%), green (71-100%).

### Task 4: Build BlindSpotIndicator atom
- **File:** `packages/ui/src/atoms/blind-spot-indicator.tsx`
- **Action:** Named export `BlindSpotIndicator`. Renders warning icon with "Blind Spot" label for topics with >50% unassessed subconcepts.

### Task 5: Build TopicCoverageRow molecule
- **File:** `packages/ui/src/molecules/topic-coverage-row.tsx`
- **Action:** Named export `TopicCoverageRow`. Expandable row showing topic name, coverage %, blind spot badge, and expand chevron. On expand, renders SubConcept list.

### Task 6: Build useGapDrilldown hook
- **File:** `apps/web/src/hooks/use-gap-drilldown.ts`
- **Action:** Named export `useGapDrilldown(system, discipline)`. Fetches drill-down data from API, returns `{ data, isLoading, error }`.

### Task 7: Build TopicSubconceptList component
- **File:** `apps/web/src/components/coverage/topic-subconcept-list.tsx`
- **Action:** Named export `TopicSubconceptList`. Renders list of SubConcepts within an expanded topic with assessed/unassessed indicator per item.

### Task 8: Build GapDrilldownPanel component
- **File:** `apps/web/src/components/coverage/gap-drilldown-panel.tsx`
- **Action:** Named export `GapDrilldownPanel`. Main organism. Summary stats at top (total topics, topics with gaps, blind spots). Sorted topic list below. "Generate Questions" action button per topic.

### Task 9: Build drill-down page
- **File:** `apps/web/src/app/(protected)/institution/coverage/[system]/[discipline]/page.tsx`
- **Action:** Default export page. Extracts route params, renders breadcrumb and GapDrilldownPanel.

### Task 10: Write component tests
- **File:** `apps/web/src/__tests__/components/gap-drilldown-panel.test.tsx`
- **Action:** 8-10 tests covering rendering, sorting, expansion, blind spot detection, navigation.

---

## 3. Data Model

```typescript
// packages/types/src/coverage/gap-drilldown.types.ts

/** Coverage status of a single SubConcept */
export interface SubConceptCoverage {
  readonly subconcept_id: string;
  readonly subconcept_name: string;
  readonly is_assessed: boolean;
  readonly question_count: number;
}

/** Coverage data for a single USMLE Topic */
export interface TopicCoverage {
  readonly topic_id: string;
  readonly topic_name: string;
  readonly coverage_percentage: number;   // 0-100
  readonly assessed_subconcepts: number;
  readonly total_subconcepts: number;
  readonly is_blind_spot: boolean;        // >50% unassessed
  readonly subconcepts: readonly SubConceptCoverage[];
}

/** Summary statistics for the drill-down view */
export interface GapDrilldownSummary {
  readonly total_topics: number;
  readonly topics_with_gaps: number;
  readonly total_blind_spots: number;
}

/** Complete drill-down response */
export interface GapDrilldownData {
  readonly system: string;
  readonly discipline: string;
  readonly summary: GapDrilldownSummary;
  readonly topics: readonly TopicCoverage[];  // sorted by coverage ascending
}
```

---

## 4. Database Schema

No new tables. Drill-down data is computed from Neo4j graph queries:

**Neo4j query:**
```cypher
MATCH (t:USMLE_Topic)-[:IN_SYSTEM]->(s:USMLE_System {name: $system}),
      (t)-[:IN_DISCIPLINE]->(d:USMLE_Discipline {name: $discipline})
OPTIONAL MATCH (sc:SubConcept)-[:BELONGS_TO]->(t)
OPTIONAL MATCH (q:Question)-[:ASSESSES]->(sc)
WHERE q.institution_id = $institutionId
RETURN t.id AS topic_id,
       t.name AS topic_name,
       sc.id AS subconcept_id,
       sc.name AS subconcept_name,
       COUNT(q) AS question_count
ORDER BY t.name
```

**Blind spot computation (server-side):**
```
topic.is_blind_spot = (unassessed_subconcepts / total_subconcepts) > 0.5
topic.coverage_percentage = (assessed_subconcepts / total_subconcepts) * 100
```

---

## 5. API Contract

### GET /api/v1/coverage/drilldown (Auth: InstitutionalAdmin or Faculty)

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `system` | string | Yes | USMLE System name (URL decoded) |
| `discipline` | string | Yes | USMLE Discipline name (URL decoded) |

**Success Response (200):**
```json
{
  "data": {
    "system": "Cardiovascular",
    "discipline": "Pathology",
    "summary": {
      "total_topics": 12,
      "topics_with_gaps": 8,
      "total_blind_spots": 3
    },
    "topics": [
      {
        "topic_id": "topic-uuid-1",
        "topic_name": "Coronary Artery Disease",
        "coverage_percentage": 20,
        "assessed_subconcepts": 1,
        "total_subconcepts": 5,
        "is_blind_spot": true,
        "subconcepts": [
          {
            "subconcept_id": "sc-uuid-1",
            "subconcept_name": "Atherosclerosis pathogenesis",
            "is_assessed": true,
            "question_count": 3
          },
          {
            "subconcept_id": "sc-uuid-2",
            "subconcept_name": "Risk factor modification",
            "is_assessed": false,
            "question_count": 0
          }
        ]
      }
    ]
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role not InstitutionalAdmin or Faculty |
| 400 | `VALIDATION_ERROR` | Missing system or discipline parameter |
| 404 | `NOT_FOUND` | System or discipline not found |

---

## 6. Frontend Spec

### Page: `/institution/coverage/[system]/[discipline]`

**Component hierarchy:**
```
GapDrilldownPage (page.tsx -- default export)
  ├── Breadcrumb ("Coverage Heatmap" > "{System}: {Discipline}")
  ├── PageHeader ("{System} x {Discipline} Coverage")
  └── GapDrilldownPanel (Organism)
        ├── SummaryStats
        │     ├── StatCard ("Total Topics": N)
        │     ├── StatCard ("Topics with Gaps": N)
        │     └── StatCard ("Blind Spots": N, red highlight)
        └── TopicList (sorted by coverage ascending)
              └── TopicCoverageRow × N (Molecule)
                    ├── CoverageBadge (Atom, color-coded %)
                    ├── BlindSpotIndicator (Atom, conditional)
                    ├── GenerateButton ("Generate Questions")
                    └── (expanded) TopicSubconceptList
                          └── SubConceptRow × N
                                ├── Name
                                └── Status (assessed checkmark / unassessed dash)
```

**States:**
1. **Loading** -- Skeleton rows with pulsing placeholders
2. **Data** -- Full topic list with coverage sorted ascending
3. **Expanded** -- Topic row expanded showing subconcept details
4. **Empty** -- "No topics found for this intersection"
5. **Error** -- Error message with retry and back navigation

**Design tokens:**
- Surface: `--color-surface-primary` (#ffffff)
- Blind spot badge: `#dc2626` background, white text
- Coverage red: `#dc2626` (0-30%), yellow: `#eab308` (31-70%), green: `#69a338` (71-100%)
- Assessed indicator: `#69a338` checkmark
- Unassessed indicator: `#9ca3af` dash
- Summary stats cards: `--color-surface-secondary`, `--radius-md`
- Spacing: `--spacing-6` between sections

**Navigation:**
- "Generate Questions" button: navigates to `/workbench?mode=generate&system={system}&discipline={discipline}&topic={topicId}`
- Breadcrumb "Coverage Heatmap" links back to `/institution/coverage`

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/coverage/gap-drilldown.types.ts` | Types | Create |
| 2 | `packages/types/src/coverage/index.ts` | Types | Edit (add export) |
| 3 | `packages/ui/src/atoms/coverage-badge.tsx` | Atom | Create |
| 4 | `packages/ui/src/atoms/blind-spot-indicator.tsx` | Atom | Create |
| 5 | `packages/ui/src/molecules/topic-coverage-row.tsx` | Molecule | Create |
| 6 | `apps/web/src/hooks/use-gap-drilldown.ts` | Hook | Create |
| 7 | `apps/web/src/components/coverage/topic-subconcept-list.tsx` | Component | Create |
| 8 | `apps/web/src/components/coverage/gap-drilldown-panel.tsx` | Component | Create |
| 9 | `apps/web/src/app/(protected)/institution/coverage/[system]/[discipline]/page.tsx` | Page | Create |
| 10 | `apps/web/src/__tests__/components/gap-drilldown-panel.test.tsx` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-13 | institutional_admin | **PENDING** | USMLE Heatmap provides the cells to click from for drill-down |

### NPM Packages
- No new packages expected

### Existing Files Needed
- `apps/web/src/lib/api-client.ts` -- authenticated fetch wrapper
- `apps/web/src/components/ui/button.tsx` -- shadcn/ui Button
- `apps/web/src/components/ui/skeleton.tsx` -- shadcn/ui Skeleton
- `apps/web/src/components/ui/card.tsx` -- shadcn/ui Card for summary stats
- Lucide icons: `ChevronDown`, `ChevronRight`, `AlertTriangle`, `CheckCircle`, `Minus`

---

## 9. Test Fixtures

```typescript
export const MOCK_SUBCONCEPTS: SubConceptCoverage[] = [
  { subconcept_id: "sc-uuid-1", subconcept_name: "Atherosclerosis pathogenesis", is_assessed: true, question_count: 3 },
  { subconcept_id: "sc-uuid-2", subconcept_name: "Risk factor modification", is_assessed: false, question_count: 0 },
  { subconcept_id: "sc-uuid-3", subconcept_name: "Coronary stent types", is_assessed: false, question_count: 0 },
  { subconcept_id: "sc-uuid-4", subconcept_name: "Angina classification", is_assessed: true, question_count: 2 },
  { subconcept_id: "sc-uuid-5", subconcept_name: "Myocardial infarction types", is_assessed: false, question_count: 0 },
];

export const MOCK_TOPICS: TopicCoverage[] = [
  {
    topic_id: "topic-uuid-1",
    topic_name: "Coronary Artery Disease",
    coverage_percentage: 20,
    assessed_subconcepts: 1,
    total_subconcepts: 5,
    is_blind_spot: true,
    subconcepts: MOCK_SUBCONCEPTS,
  },
  {
    topic_id: "topic-uuid-2",
    topic_name: "Heart Failure",
    coverage_percentage: 60,
    assessed_subconcepts: 3,
    total_subconcepts: 5,
    is_blind_spot: false,
    subconcepts: [],
  },
  {
    topic_id: "topic-uuid-3",
    topic_name: "Valvular Heart Disease",
    coverage_percentage: 100,
    assessed_subconcepts: 4,
    total_subconcepts: 4,
    is_blind_spot: false,
    subconcepts: [],
  },
];

export const MOCK_DRILLDOWN_DATA: GapDrilldownData = {
  system: "Cardiovascular",
  discipline: "Pathology",
  summary: {
    total_topics: 3,
    topics_with_gaps: 2,
    total_blind_spots: 1,
  },
  topics: MOCK_TOPICS,
};

export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};
```

---

## 10. API Test Spec

**File:** `apps/web/src/__tests__/components/gap-drilldown-panel.test.tsx`

```
describe("GapDrilldownPanel")
  it("renders summary stats: total topics, topics with gaps, blind spots")
  it("renders topics sorted by coverage percentage ascending")
  it("shows CoverageBadge with correct color for each coverage level")
  it("shows BlindSpotIndicator for topics with >50% unassessed subconcepts")
  it("expands topic to show subconcept list on click")
  it("shows assessed/unassessed status for each subconcept")
  it("Generate Questions button navigates to workbench with correct scope params")
  it("renders empty state when no topics exist")
  it("renders loading skeleton while data is fetching")
  it("renders breadcrumb with correct system and discipline names")
```

**Total: 10 component tests**

---

## 11. E2E Test Spec (Playwright)

No E2E tests for this story. The drill-down flow from heatmap click will be tested in the heatmap E2E test.

---

## 12. Acceptance Criteria

1. Clicking a heatmap cell opens the drill-down page for that system-discipline intersection
2. Drill-down shows list of USMLE Topics with coverage percentage per topic
3. Topics sorted by coverage ascending (worst gaps first)
4. Each topic expandable to show SubConcepts with assessed/unassessed status
5. "Blind Spot" badge shown on topics with >50% unassessed SubConcepts
6. Summary stats at top: total topics, topics with gaps, total blind spots
7. "Generate Questions" button navigates to workbench with gap scope params
8. Breadcrumb navigation: Heatmap -> System: Discipline -> Topic details
9. All 10 component tests pass
10. Named exports only, TypeScript strict, design tokens only

---

## 13. Source References

| Claim | Source |
|-------|--------|
| Gap drill-down concept | S-IA-29-1 User Story |
| Topic sorting by coverage ascending | S-IA-29-1 Acceptance Criteria |
| Blind spot threshold >50% | S-IA-29-1 Notes |
| Generate Questions navigation URL | S-IA-29-1 Notes |
| Neo4j query for topics/subconcepts | S-IA-29-1 Notes |
| Route pattern /coverage/[system]/[discipline] | S-IA-29-1 Notes |
| Blocked by heatmap component | S-IA-29-1 Dependencies |

---

## 14. Environment Prerequisites

- **Next.js:** Web app running on port 3000
- **Coverage API:** `GET /api/v1/coverage/drilldown` endpoint must exist (from coverage service)
- **Neo4j:** USMLE taxonomy nodes seeded (from STORY-U-7)
- **Auth:** InstitutionalAdmin or Faculty JWT

---

## 15. Figma Make Prototype

No Figma prototype for this story. Follow existing coverage page patterns from STORY-IA-13 heatmap. Use consistent card/list layout with expandable rows.
