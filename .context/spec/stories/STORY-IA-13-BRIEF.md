# STORY-IA-13 Brief: USMLE Heatmap Component

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-13
old_id: S-IA-28-2
lane: institutional_admin
lane_priority: 2
within_lane_order: 13
sprint: 8
size: L
depends_on:
  - STORY-IA-3 (institutional_admin) — Coverage Computation Service
blocks:
  - STORY-IA-28 — Gap Drill-Down UI
personas_served: [institutional_admin, faculty]
epic: E-28 (Coverage Computation & Heatmap)
feature: F-13 (USMLE Coverage Analytics)
user_flow: UF-22 (Institutional Coverage Analysis)
```

---

## 1. Summary

Build an **interactive 16x7 USMLE coverage heatmap** visualization using D3.js. The heatmap displays coverage scores for each combination of 16 USMLE Systems (rows) and 7 USMLE Disciplines (columns). Each cell is color-coded: red (0-0.3, low coverage) -> yellow (0.3-0.7, partial coverage) -> green (0.7-1.0, strong coverage). The component includes hover tooltips with detailed metrics, click-to-drill-down navigation, filter controls for institution/program/course/academic year, export to PNG/SVG, and a color-blind-friendly accessible palette.

The heatmap consumes data from the Coverage Computation Service (STORY-IA-3) and is rendered on the coverage page at `/institution/coverage`.

Key constraints:
- **D3.js** for SVG rendering (not recharts -- custom grid layout required)
- **16 rows** (USMLE Systems): Cardiovascular, Respiratory, Renal/Urinary, Gastrointestinal, Endocrine, Reproductive, Musculoskeletal, Skin/Subcutaneous, Nervous/Special Senses, Hematopoietic/Lymphoreticular, Immune, Behavioral/Emotional, Biostatistics/Epidemiology, Multisystem, Nutrition, Pharmacology
- **7 columns** (USMLE Disciplines): Anatomy, Biochemistry, Pathology, Pharmacology, Physiology, Microbiology, Behavioral Science
- **Color-blind-friendly palette**: Blue-to-Orange diverging scale as alternative
- **InstitutionalAdmin + Faculty** -- RBAC enforced via route guard
- Export capability: PNG (via canvas) and SVG (direct download)

---

## 2. Task Breakdown

Implementation order follows: **Types -> Utilities -> Hooks -> Components -> Page -> Tests**

### Task 1: Create heatmap types
- **File:** `packages/types/src/coverage/heatmap.types.ts`
- **Action:** Export `HeatmapCell`, `HeatmapData`, `HeatmapFilters`

### Task 2: Export heatmap types from coverage barrel
- **File:** `packages/types/src/coverage/index.ts`
- **Action:** Edit to re-export from `heatmap.types.ts`

### Task 3: Build heatmap color scale utilities
- **File:** `apps/web/src/utils/heatmap-scales.ts`
- **Action:** Named exports: `createCoverageColorScale()` (red-yellow-green), `createColorBlindScale()` (blue-orange), `getTextColor(bgColor)` for contrast. Uses D3 `scaleLinear` with color interpolation.

### Task 4: Build heatmap export utilities
- **File:** `apps/web/src/utils/heatmap-export.ts`
- **Action:** Named exports: `exportAsPNG(svgElement, filename)`, `exportAsSVG(svgElement, filename)`. PNG export renders SVG to canvas then downloads.

### Task 5: Build useCoverageData hook
- **File:** `apps/web/src/hooks/use-coverage-data.ts`
- **Action:** Named export `useCoverageData(filters)`. Fetches heatmap data from API, manages loading/error states, returns `{ data, isLoading, error, refetch }`.

### Task 6: Build HeatmapCell component
- **File:** `apps/web/src/components/coverage/heatmap-cell.tsx`
- **Action:** Named export `HeatmapCell`. Renders a single SVG `<rect>` with fill color from scale. Handles mouse enter/leave for tooltip, click for drill-down. Includes ARIA label with coverage score.

### Task 7: Build HeatmapTooltip component
- **File:** `apps/web/src/components/coverage/heatmap-tooltip.tsx`
- **Action:** Named export `HeatmapTooltip`. Positioned absolutely near hovered cell. Shows system name, discipline name, coverage %, assessed count / total count, gap count.

### Task 8: Build ColorLegend component
- **File:** `apps/web/src/components/coverage/color-legend.tsx`
- **Action:** Named export `ColorLegend`. Horizontal gradient bar with threshold markers at 0.3 and 0.7. Labels: "Low Coverage", "Partial", "Strong Coverage". Toggle for color-blind mode.

### Task 9: Build CoverageFilters component
- **File:** `apps/web/src/components/coverage/coverage-filters.tsx`
- **Action:** Named export `CoverageFilters`. Four dropdowns: institution (superadmin only), program, course, academic year. Emits filter changes via callback.

### Task 10: Build USMLEHeatmap component
- **File:** `apps/web/src/components/coverage/usmle-heatmap.tsx`
- **Action:** Named export `USMLEHeatmap`. Main D3-powered component. Renders 16x7 SVG grid with row/column labels, cells, tooltip overlay. Responsive: recalculates cell size on resize. Includes export buttons and color-blind toggle.

### Task 11: Build coverage page
- **File:** `apps/web/src/app/(protected)/institution/coverage/page.tsx`
- **Action:** Default export page component. Renders `CoverageFilters` and `USMLEHeatmap`. Page title, description, loading skeleton.

### Task 12: Write heatmap scale tests
- **File:** `apps/web/src/__tests__/utils/heatmap-scales.test.ts`
- **Action:** 6 tests covering color scale output at boundary values, color-blind scale, text contrast

### Task 13: Write heatmap export tests
- **File:** `apps/web/src/__tests__/utils/heatmap-export.test.ts`
- **Action:** 3 tests covering SVG download, PNG canvas rendering, filename formatting

### Task 14: Write component tests
- **File:** `apps/web/src/__tests__/components/usmle-heatmap.test.ts`
- **Action:** 6 tests covering rendering, tooltip display, cell click, empty state, accessibility

---

## 3. Data Model

```typescript
// packages/types/src/coverage/heatmap.types.ts

/** A single cell in the 16x7 heatmap grid */
export interface HeatmapCell {
  readonly system: string;           // USMLE System name (row label)
  readonly discipline: string;       // USMLE Discipline name (column label)
  readonly score: number;            // Coverage score 0.0-1.0
  readonly assessed_count: number;   // Number of items assessed in this cell
  readonly total_count: number;      // Total expected items for this cell
  readonly gap_count: number;        // Number of coverage gaps
  readonly row: number;              // 0-based row index
  readonly col: number;              // 0-based column index
}

/** Complete heatmap dataset */
export interface HeatmapData {
  readonly cells: readonly HeatmapCell[];
  readonly systems: readonly string[];       // 16 USMLE Systems in display order
  readonly disciplines: readonly string[];   // 7 USMLE Disciplines in display order
  readonly computed_at: string;              // ISO timestamp of last computation
}

/** Filter parameters for heatmap data */
export interface HeatmapFilters {
  readonly institution_id?: string;
  readonly program_id?: string;
  readonly course_id?: string;
  readonly academic_year?: string;
}
```

---

## 4. Database Schema

No new tables. The heatmap reads from the Coverage Computation Service (STORY-IA-3) which queries existing tables.

**Data source:** The coverage service computes scores by cross-referencing:
- `assessment_items` (tagged with `usmle_system` and `usmle_discipline`)
- `slos` and `ilos` (curriculum mappings)
- Neo4j knowledge graph (USMLE taxonomy nodes from STORY-U-7)

**API data flow:**
```
Client → GET /api/v1/coverage/heatmap?filters
       → CoverageService.computeHeatmap(filters)
       → Supabase: aggregate item counts per system×discipline
       → Neo4j: total expected nodes per system×discipline
       → Compute: score = assessed_count / total_count per cell
       → Return HeatmapData with 112 cells (16 × 7)
```

---

## 5. API Contract

### GET /api/v1/coverage/heatmap (Auth: InstitutionalAdmin or Faculty)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `institution_id` | UUID | req.user.institution_id | Institution to analyze |
| `program_id` | UUID | -- | Filter by specific program |
| `course_id` | UUID | -- | Filter by specific course |
| `academic_year` | string | current year | Academic year (e.g., "2025-2026") |

**Success Response (200):**
```json
{
  "data": {
    "cells": [
      {
        "system": "Cardiovascular",
        "discipline": "Anatomy",
        "score": 0.85,
        "assessed_count": 17,
        "total_count": 20,
        "gap_count": 3,
        "row": 0,
        "col": 0
      },
      {
        "system": "Cardiovascular",
        "discipline": "Biochemistry",
        "score": 0.42,
        "assessed_count": 5,
        "total_count": 12,
        "gap_count": 7,
        "row": 0,
        "col": 1
      },
      {
        "system": "Respiratory",
        "discipline": "Anatomy",
        "score": 0.15,
        "assessed_count": 3,
        "total_count": 20,
        "gap_count": 17,
        "row": 1,
        "col": 0
      }
    ],
    "systems": [
      "Cardiovascular", "Respiratory", "Renal/Urinary", "Gastrointestinal",
      "Endocrine", "Reproductive", "Musculoskeletal", "Skin/Subcutaneous",
      "Nervous/Special Senses", "Hematopoietic/Lymphoreticular", "Immune",
      "Behavioral/Emotional", "Biostatistics/Epidemiology", "Multisystem",
      "Nutrition", "Pharmacology"
    ],
    "disciplines": [
      "Anatomy", "Biochemistry", "Pathology", "Pharmacology",
      "Physiology", "Microbiology", "Behavioral Science"
    ],
    "computed_at": "2026-02-19T12:00:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role not InstitutionalAdmin or Faculty |
| 400 | `VALIDATION_ERROR` | Invalid UUID format for filter params |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 6. Frontend Spec

### Page: `/institution/coverage` (InstitutionalAdmin layout)

**Route:** `apps/web/src/app/(protected)/institution/coverage/page.tsx`

**Component hierarchy:**
```
CoveragePage (page.tsx -- default export)
  ├── PageHeader ("USMLE Coverage Heatmap")
  ├── CoverageFilters (client component)
  │     ├── InstitutionSelect (superadmin only, hidden for IA)
  │     ├── ProgramSelect
  │     ├── CourseSelect
  │     └── AcademicYearSelect
  └── USMLEHeatmap (client component)
        ├── HeatmapToolbar
        │     ├── ColorBlindToggle (switch between palettes)
        │     └── ExportMenu (PNG / SVG buttons)
        ├── SVG container (responsive)
        │     ├── ColumnHeaders (7 discipline labels, rotated 45deg)
        │     ├── RowLabels (16 system labels, right-aligned)
        │     └── CellGrid (16 rows × 7 columns)
        │           └── HeatmapCell × 112
        ├── HeatmapTooltip (positioned on hover)
        └── ColorLegend (gradient bar with thresholds)
```

**States:**
1. **Loading** -- Skeleton grid with pulsing rectangles matching 16x7 layout
2. **Data** -- Full heatmap rendered with color-coded cells
3. **Hover** -- Tooltip appears near hovered cell with metrics
4. **Empty** -- "No coverage data available" with suggestion to run coverage computation
5. **Error** -- Error message with retry button
6. **Exporting** -- Brief "Generating..." spinner on export button

**Design tokens:**
- Surface: `--color-surface-primary` (white card behind heatmap)
- Cell gap: 2px (CSS gap or SVG offset for grid lines)
- Cell size: responsive, min 40px, max 64px per cell
- Default palette: red (#dc2626) -> yellow (#eab308) -> green (#16a34a) via D3 interpolateRgb
- Color-blind palette: blue (#2563eb) -> light gray (#d1d5db) -> orange (#ea580c) via D3 interpolateRgb
- Row labels: Source Sans 3, `--font-size-sm`, right-aligned, 180px max width
- Column labels: Source Sans 3, `--font-size-sm`, rotated -45deg
- Tooltip: `--color-surface-secondary`, `--shadow-md`, `--radius-sm`, max-width 240px
- Legend: 200px wide gradient, `--font-size-xs` labels
- Spacing: `--spacing-6` between filters and heatmap, `--spacing-4` internal padding

**SVG Layout Dimensions:**
```
Total width: labelWidth(180px) + 7 * cellSize + 7 * gap(2px) + padding(32px)
Total height: headerHeight(80px) + 16 * cellSize + 16 * gap(2px) + legendHeight(48px) + padding(32px)
```

**Responsive behavior:**
- Desktop (>1024px): Full 16x7 grid, cellSize = 56px
- Tablet (768-1024px): Full grid, cellSize = 44px, labels truncated
- Mobile (<768px): Horizontal scroll enabled, cellSize = 40px

**Accessibility:**
- Each cell has `role="gridcell"` and `aria-label` with format: "{System} x {Discipline}: {score}% coverage"
- Grid has `role="grid"` and `aria-label="USMLE Coverage Heatmap"`
- Color-blind toggle persists in localStorage
- Tooltip content is also available via `aria-describedby`
- Keyboard navigation: arrow keys move between cells, Enter triggers drill-down
- Focus ring visible on keyboard navigation

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/coverage/heatmap.types.ts` | Types | Create |
| 2 | `packages/types/src/coverage/index.ts` | Types | Edit (add heatmap export) |
| 3 | `apps/web/src/utils/heatmap-scales.ts` | Utility | Create |
| 4 | `apps/web/src/utils/heatmap-export.ts` | Utility | Create |
| 5 | `apps/web/src/hooks/use-coverage-data.ts` | Hook | Create |
| 6 | `apps/web/src/components/coverage/heatmap-cell.tsx` | Component | Create |
| 7 | `apps/web/src/components/coverage/heatmap-tooltip.tsx` | Component | Create |
| 8 | `apps/web/src/components/coverage/color-legend.tsx` | Component | Create |
| 9 | `apps/web/src/components/coverage/coverage-filters.tsx` | Component | Create |
| 10 | `apps/web/src/components/coverage/usmle-heatmap.tsx` | Component | Create |
| 11 | `apps/web/src/app/(protected)/institution/coverage/page.tsx` | View | Create |
| 12 | `apps/web/src/__tests__/utils/heatmap-scales.test.ts` | Tests | Create |
| 13 | `apps/web/src/__tests__/utils/heatmap-export.test.ts` | Tests | Create |
| 14 | `apps/web/src/__tests__/components/usmle-heatmap.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-3 | institutional_admin | **PENDING** | Coverage Computation Service provides the heatmap data via API |

### NPM Packages
- `d3` -- D3.js for SVG rendering and color scales (**needs install** in apps/web)
- `@types/d3` -- TypeScript definitions for D3 (**needs install** as devDep in apps/web)
- `html-to-image` -- PNG export from SVG/DOM (**needs install** in apps/web, alternative to manual canvas approach)

### Existing Files Needed
- `packages/types/src/coverage/index.ts` -- coverage type barrel (may need creation if IA-3 hasn't created it)
- `apps/web/src/lib/api-client.ts` -- authenticated fetch wrapper
- `apps/web/src/components/ui/select.tsx` -- shadcn/ui Select for filter dropdowns
- `apps/web/src/components/ui/button.tsx` -- shadcn/ui Button for export actions
- `apps/web/src/components/ui/skeleton.tsx` -- shadcn/ui Skeleton for loading state

---

## 9. Test Fixtures

```typescript
// 16 USMLE Systems in display order
export const USMLE_SYSTEMS = [
  "Cardiovascular", "Respiratory", "Renal/Urinary", "Gastrointestinal",
  "Endocrine", "Reproductive", "Musculoskeletal", "Skin/Subcutaneous",
  "Nervous/Special Senses", "Hematopoietic/Lymphoreticular", "Immune",
  "Behavioral/Emotional", "Biostatistics/Epidemiology", "Multisystem",
  "Nutrition", "Pharmacology",
];

// 7 USMLE Disciplines in display order
export const USMLE_DISCIPLINES = [
  "Anatomy", "Biochemistry", "Pathology", "Pharmacology",
  "Physiology", "Microbiology", "Behavioral Science",
];

// Generate mock cells for full 16x7 grid
function generateMockCells(): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 7; col++) {
      const score = Math.round(Math.random() * 100) / 100;
      const total = Math.floor(Math.random() * 20) + 5;
      const assessed = Math.floor(score * total);
      cells.push({
        system: USMLE_SYSTEMS[row]!,
        discipline: USMLE_DISCIPLINES[col]!,
        score,
        assessed_count: assessed,
        total_count: total,
        gap_count: total - assessed,
        row,
        col,
      });
    }
  }
  return cells;
}

// Mock full heatmap data
export const MOCK_HEATMAP_DATA = {
  cells: generateMockCells(),
  systems: USMLE_SYSTEMS,
  disciplines: USMLE_DISCIPLINES,
  computed_at: "2026-02-19T12:00:00Z",
};

// Mock specific cells for targeted tests
export const MOCK_HIGH_COVERAGE_CELL = {
  system: "Cardiovascular",
  discipline: "Anatomy",
  score: 0.92,
  assessed_count: 23,
  total_count: 25,
  gap_count: 2,
  row: 0,
  col: 0,
};

export const MOCK_LOW_COVERAGE_CELL = {
  system: "Nutrition",
  discipline: "Microbiology",
  score: 0.12,
  assessed_count: 2,
  total_count: 16,
  gap_count: 14,
  row: 14,
  col: 5,
};

export const MOCK_MEDIUM_COVERAGE_CELL = {
  system: "Endocrine",
  discipline: "Biochemistry",
  score: 0.55,
  assessed_count: 11,
  total_count: 20,
  gap_count: 9,
  row: 4,
  col: 1,
};

// Mock empty heatmap (no data)
export const MOCK_EMPTY_HEATMAP = {
  cells: [],
  systems: USMLE_SYSTEMS,
  disciplines: USMLE_DISCIPLINES,
  computed_at: "2026-02-19T12:00:00Z",
};

// Mock filters
export const MOCK_FILTERS = {
  institution_id: "inst-uuid-1",
  program_id: undefined,
  course_id: "course-uuid-1",
  academic_year: "2025-2026",
};

// Mock InstitutionalAdmin user
export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};
```

---

## 10. API Test Spec

**File:** `apps/web/src/__tests__/utils/heatmap-scales.test.ts`

```
describe("heatmap-scales")
  describe("createCoverageColorScale")
    it("returns red color for score 0.0")
    it("returns red-ish color for score 0.2")
    it("returns yellow color for score 0.5")
    it("returns green color for score 0.85")
    it("returns green color for score 1.0")
  describe("createColorBlindScale")
    it("returns blue for score 0.0 and orange for score 1.0")
  describe("getTextColor")
    it("returns white for dark backgrounds")
    it("returns black for light backgrounds")
```

**File:** `apps/web/src/__tests__/utils/heatmap-export.test.ts`

```
describe("heatmap-export")
  describe("exportAsSVG")
    it("creates a downloadable SVG blob with correct filename")
    it("includes all SVG content in the exported file")
  describe("exportAsPNG")
    it("renders SVG to canvas and triggers PNG download")
```

**File:** `apps/web/src/__tests__/components/usmle-heatmap.test.ts`

```
describe("USMLEHeatmap")
  it("renders 112 cells (16 rows x 7 columns)")
  it("displays system labels for all 16 rows")
  it("displays discipline labels for all 7 columns")
  it("shows tooltip on cell hover with correct metrics")
  it("navigates to gap drill-down on cell click")
  it("renders loading skeleton when data is loading")
  it("renders empty state when no cells are provided")
  it("toggles between default and color-blind palette")
  it("cells have correct ARIA labels for accessibility")
```

**Total: ~17 tests** (8 scale + 3 export + 9 component = 20, targeting 15-17 meaningful tests)

---

## 11. E2E Test Spec (Playwright)

**File:** `apps/web/e2e/usmle-heatmap.spec.ts`

```
describe("USMLE Coverage Heatmap")
  it("InstitutionalAdmin can view and interact with the coverage heatmap")
    1. Login as InstitutionalAdmin demo account
    2. Navigate to /institution/coverage
    3. Verify 16x7 heatmap grid is visible
    4. Hover over a cell and verify tooltip appears
    5. Toggle color-blind mode and verify palette changes
    6. Click export PNG button and verify download triggers
    7. Select a course filter and verify heatmap updates
```

**Total: 1 E2E test**

---

## 12. Acceptance Criteria

1. Heatmap renders a 16x7 grid with all USMLE Systems as rows and all Disciplines as columns
2. Cells are color-coded: red (0-0.3), yellow (0.3-0.7), green (0.7-1.0)
3. Hovering a cell shows a tooltip with: system name, discipline name, coverage %, assessed/total count, gap count
4. Clicking a cell navigates to the gap drill-down page (STORY-IA-28) with system and discipline pre-selected
5. Filter controls allow filtering by institution, program, course, and academic year
6. Color legend displays the gradient with threshold markers at 0.3 and 0.7
7. Color-blind toggle switches to blue-orange diverging palette
8. Color-blind preference persists in localStorage
9. Export PNG button downloads a PNG image of the heatmap
10. Export SVG button downloads an SVG file of the heatmap
11. Heatmap is responsive: full grid on desktop, horizontally scrollable on mobile
12. Loading skeleton matches the 16x7 grid shape
13. Empty state shown when no coverage data is available
14. All cells have ARIA labels with coverage score for screen readers
15. Grid supports keyboard navigation (arrow keys between cells)
16. All ~17 tests pass
17. 1 E2E test passes

---

## 13. Source References

| Claim | Source |
|-------|--------|
| 16x7 USMLE heatmap concept | UF-22 Institutional Coverage Analysis |
| 16 USMLE Systems list | USMLE_CONTENT_OUTLINE + STORY-U-7 seed data |
| 7 USMLE Disciplines list | USMLE_CONTENT_OUTLINE + STORY-U-7 seed data |
| Coverage score computation | STORY-IA-3 Coverage Computation Service |
| Red-yellow-green color scale | S-IA-28-2 Acceptance Criteria |
| Color-blind accessibility | S-IA-28-2 Non-Functional Requirements |
| Hover tooltip content | S-IA-28-2 Task Breakdown |
| Gap drill-down navigation | STORY-IA-28 Gap Drill-Down UI |
| Export PNG/SVG | S-IA-28-2 Acceptance Criteria |

---

## 14. Environment Prerequisites

- **Next.js:** Web app running on port 3000
- **Coverage API:** `GET /api/v1/coverage/heatmap` endpoint must exist (from STORY-IA-3)
- **D3.js:** Must be installed in apps/web (`pnpm add d3 && pnpm add -D @types/d3`)
- **No Supabase direct access** from frontend -- all data via API
- **No Neo4j direct access** from frontend -- coverage service handles graph queries

---

## 15. Implementation Notes

- **D3 in React:** Use `useRef` to get the SVG container element, and `useEffect` to run D3 rendering. D3 manages the SVG children (cells, labels, axes). React manages the outer container, toolbar, tooltip, and filters. This hybrid approach avoids D3-React conflicts.
- **Color scale:** Use `d3.scaleLinear().domain([0, 0.3, 0.7, 1.0]).range(["#dc2626", "#eab308", "#16a34a"])` for the default palette. The color-blind scale uses `d3.scaleLinear().domain([0, 0.5, 1.0]).range(["#2563eb", "#d1d5db", "#ea580c"])`.
- **Cell size calculation:** Compute cell size dynamically from container width: `cellSize = (containerWidth - labelWidth - padding) / 7`. Enforce min 40px and max 64px. If container is too narrow, enable horizontal scroll.
- **Tooltip positioning:** Position tooltip relative to the hovered cell using D3 event coordinates. Flip tooltip to left side when cell is near right edge of viewport. Use a React portal for the tooltip to avoid SVG clipping.
- **Export PNG:** Create an offscreen `<canvas>`, serialize SVG to a data URL via `XMLSerializer`, draw to canvas via `Image.onload`, then `canvas.toBlob()` to trigger download. Use 2x resolution for retina displays.
- **Export SVG:** Serialize the SVG element via `XMLSerializer`, create a Blob with MIME type `image/svg+xml`, trigger download via anchor click.
- **Keyboard navigation:** Track focused cell with state (row, col). Arrow keys increment/decrement. Wrap around edges. Enter key triggers drill-down. Tab key exits the grid.
- **112 cells, not sparse:** Always render all 112 cells (16x7). If a cell has no data, render it with score 0 and a distinct "no data" pattern (hatched fill or gray).
- **Private fields pattern:** Hook and utility functions are functional (no class). Components use named exports per architecture rules.
- **Web path alias:** All imports in apps/web use `@web/*` prefix (e.g., `@web/utils/heatmap-scales`, `@web/hooks/use-coverage-data`).
