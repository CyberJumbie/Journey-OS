# STORY-F-72 Brief: Gap Flagging

## 0. Lane & Priority

```yaml
story_id: STORY-F-72
old_id: S-F-26-4
lane: faculty
lane_priority: 3
within_lane_order: 72
sprint: 29
size: S
depends_on:
  - STORY-F-65 (faculty) — Blueprint Definition Model (blueprint targets)
  - STORY-F-70 (faculty) — Item Recommendation Engine (auto-fill uses recommendations)
blocks: []
personas_served: [faculty]
epic: E-26 (Blueprint & Assembly Engine)
feature: F-12 (Exam Assembly & Delivery)
user_flow: UF-20 (Exam Assembly & Assignment)
```

## 1. Summary

Build a **gap flagging** feature that highlights under-represented categories in an exam being assembled. The system compares current exam composition against blueprint targets, flags categories below threshold (configurable, default 80%), assigns severity levels (warning 60-80%, critical <60%), displays a gap summary panel in the exam builder, and provides one-click auto-fill actions that use the recommendation engine to select optimal items for each gap.

This is an extension of the recommendation engine (F-70) integrated into the exam builder (F-71): F-65 (blueprint) -> F-70 (recommendations) -> **F-72 (gap flagging)**.

Key constraints:
- Gap flagging reuses coverage computation logic from F-70
- Auto-fill triggers recommendation engine with gap-specific constraints
- Real-time gap updates computed client-side for responsiveness
- Server validation on save
- Size S — primarily extends existing services and UI

## 2. Task Breakdown

1. **Types** — Extend `packages/types/src/exam/recommendation.types.ts` with `GapFlag`, `GapSummary`, `AutoFillRequest`, `AutoFillResult`
2. **Service** — `GapFlaggingService` with `analyzeGaps()` and `autoFill()` methods
3. **Controller** — Extend `ExamBuilderController` with `handleGetGaps()` and `handleAutoFill()` endpoints
4. **Routes** — Add `GET /api/v1/exams/:examId/gaps` and `POST /api/v1/exams/:examId/gaps/auto-fill` to exam builder routes
5. **Frontend component** — `GapSummaryPanel` integrated into exam builder
6. **API tests** — 8 tests covering gap analysis, severity levels, auto-fill

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/exam/recommendation.types.ts (extend with gap types)

/** Severity of a coverage gap */
export type GapSeverity = "warning" | "critical";

/** Single flagged gap */
export interface GapFlag {
  readonly dimension: string;                // "usmle_system", "discipline", "bloom_level"
  readonly label: string;                    // e.g., "Cardiovascular"
  readonly target_count: number;
  readonly actual_count: number;
  readonly deficit: number;                  // target_count - actual_count
  readonly target_percentage: number;
  readonly actual_percentage: number;
  readonly severity: GapSeverity;
  readonly suggestion: string;               // "Add 3 more Cardiovascular items"
}

/** Complete gap summary for an exam */
export interface GapSummary {
  readonly exam_id: string;
  readonly blueprint_id: string;
  readonly total_gaps: number;
  readonly critical_gaps: number;
  readonly warning_gaps: number;
  readonly gaps: readonly GapFlag[];
  readonly overall_compliance: number;       // 0-100%
  readonly threshold: number;                // configured threshold (default 80%)
}

/** Request to auto-fill a specific gap */
export interface AutoFillRequest {
  readonly dimension: string;
  readonly label: string;
  readonly count: number;                    // how many items to add
}

/** Result of auto-fill operation */
export interface AutoFillResult {
  readonly items_added: readonly string[];   // item IDs added
  readonly gaps_remaining: number;
  readonly new_compliance: number;           // updated 0-100%
}

/** Gap threshold configuration */
export interface GapThresholdConfig {
  readonly warning_threshold: number;        // default: 80 (60-80% of target = warning)
  readonly critical_threshold: number;       // default: 60 (<60% of target = critical)
}
```

## 4. Database Schema (inline, complete)

No new tables needed. Gap flagging reads from existing tables:

```sql
-- Existing tables used:

-- exams (from F-71)
-- exam_items (from F-71) — current exam composition
-- blueprints (from F-65) — target distributions
-- items/questions (from item bank, F-64) — item metadata for gap analysis
```

## 5. API Contract (complete request/response)

### GET /api/v1/exams/:examId/gaps (Auth: Faculty)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `warning_threshold` | number | 80 | Percentage of target below which = warning |
| `critical_threshold` | number | 60 | Percentage of target below which = critical |

**Success Response (200):**
```json
{
  "data": {
    "exam_id": "exam-uuid-1",
    "blueprint_id": "bp-uuid-1",
    "total_gaps": 4,
    "critical_gaps": 1,
    "warning_gaps": 3,
    "gaps": [
      {
        "dimension": "usmle_system",
        "label": "Cardiovascular",
        "target_count": 20,
        "actual_count": 10,
        "deficit": 10,
        "target_percentage": 20,
        "actual_percentage": 10,
        "severity": "critical",
        "suggestion": "Add 10 more Cardiovascular items"
      },
      {
        "dimension": "bloom_level",
        "label": "Evaluate",
        "target_count": 15,
        "actual_count": 11,
        "deficit": 4,
        "target_percentage": 15,
        "actual_percentage": 11,
        "severity": "warning",
        "suggestion": "Add 4 more Evaluate items"
      }
    ],
    "overall_compliance": 72.5,
    "threshold": 80
  },
  "error": null
}
```

### POST /api/v1/exams/:examId/gaps/auto-fill (Auth: Faculty)

**Request Body:**
```json
{
  "dimension": "usmle_system",
  "label": "Cardiovascular",
  "count": 5
}
```

**Success Response (200):**
```json
{
  "data": {
    "items_added": ["item-uuid-20", "item-uuid-21", "item-uuid-22", "item-uuid-23", "item-uuid-24"],
    "gaps_remaining": 3,
    "new_compliance": 82.0
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role or not exam owner |
| 404 | `NOT_FOUND` | Exam ID not found |
| 400 | `VALIDATION_ERROR` | Invalid dimension, label, or count |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Component: Gap Summary Panel (integrated into Exam Builder)

**Location:** Embedded in `ExamBuilderTemplate` from F-71, below the compliance meter or as a collapsible side panel.

**Component hierarchy:**
```
GapSummaryPanel (client component)
  ├── GapSummaryHeader
  │     ├── TotalGapsBadge ("4 gaps found")
  │     ├── CriticalCountBadge (red: "1 critical")
  │     └── WarningCountBadge (yellow: "3 warnings")
  ├── GapList
  │     └── GapItem (per gap)
  │           ├── DimensionLabel ("USMLE System: Cardiovascular")
  │           ├── SeverityBadge (warning / critical)
  │           ├── DeficitText ("10 items below target")
  │           ├── ProgressBar (actual vs target, colored by severity)
  │           └── AutoFillButton ("Add 5 items" — one-click)
  └── ThresholdConfig (collapsible — customize warning/critical thresholds)
```

**States:**
1. **No Gaps** — "All categories meet targets" with green checkmark
2. **Gaps Found** — List of flagged gaps with severity indicators
3. **Auto-Filling** — Spinner on auto-fill button, disabled during operation
4. **Updated** — Gap list refreshes after auto-fill, toast confirmation

**Design tokens:**
- Critical gap: Red `#d32f2f` badge and progress bar
- Warning gap: Yellow `#f5a623` badge and progress bar
- No gaps: Green `#69a338` checkmark
- Surface: White `#ffffff` card
- Auto-fill button: Navy Deep `#002c76` outline

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/exam/recommendation.types.ts` | Types | Edit (add gap types) |
| 2 | `apps/server/src/modules/exam/services/gap-flagging.service.ts` | Service | Create |
| 3 | `apps/server/src/modules/exam/controllers/exam-builder.controller.ts` | Controller | Edit (add gap endpoints) |
| 4 | `apps/server/src/modules/exam/routes/exam-builder.routes.ts` | Routes | Edit (add gap routes) |
| 5 | `apps/web/src/components/exam/gap-summary-panel.tsx` | Component | Create |
| 6 | `apps/web/src/components/templates/exam-builder-template.tsx` | Template | Edit (integrate gap panel) |
| 7 | `apps/server/src/modules/exam/__tests__/gap-flagging.service.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-65 | faculty | pending | Blueprint Definition Model — target distributions for gap analysis |
| STORY-F-70 | faculty | pending | Item Recommendation Engine — auto-fill uses recommendation algorithm |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client
- `express` — Server framework
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/modules/exam/algorithms/coverage-optimizer.ts` — Reuse coverage computation from F-70
- `apps/server/src/modules/exam/services/item-recommendation.service.ts` — Auto-fill delegates to recommendation engine
- `apps/server/src/modules/exam/controllers/exam-builder.controller.ts` — Extend with gap endpoints
- `apps/server/src/modules/exam/routes/exam-builder.routes.ts` — Add gap routes
- `apps/web/src/components/templates/exam-builder-template.tsx` — Integrate gap panel

## 9. Test Fixtures (inline)

```typescript
// Mock Faculty user
export const FACULTY_USER = {
  sub: "faculty-uuid-1",
  email: "faculty@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: true,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock exam with partial coverage (gaps expected)
export const MOCK_EXAM_WITH_GAPS = {
  id: "exam-uuid-1",
  blueprint_id: "bp-uuid-1",
  status: "draft" as const,
  items: [
    { item_id: "item-1", usmle_system: "Cardiovascular", discipline: "Pathology", bloom_level: "Apply" },
    { item_id: "item-2", usmle_system: "Cardiovascular", discipline: "Pathology", bloom_level: "Apply" },
    { item_id: "item-3", usmle_system: "Respiratory", discipline: "Physiology", bloom_level: "Analyze" },
  ],
};

// Mock blueprint with targets (10 items total)
export const MOCK_BLUEPRINT_TARGETS = {
  id: "bp-uuid-1",
  total_question_count: 10,
  targets: {
    usmle_system: [
      { label: "Cardiovascular", percentage: 30 },
      { label: "Respiratory", percentage: 20 },
      { label: "Renal", percentage: 20 },
      { label: "Gastrointestinal", percentage: 30 },
    ],
    bloom_level: [
      { label: "Apply", percentage: 50 },
      { label: "Analyze", percentage: 30 },
      { label: "Evaluate", percentage: 20 },
    ],
  },
};

// Expected gaps with 3 items out of 10 target:
// Renal: 0/2 = 0% -> critical (<60%)
// Gastrointestinal: 0/3 = 0% -> critical (<60%)
// Evaluate: 0/2 = 0% -> critical (<60%)

// Mock auto-fill result
export const MOCK_AUTOFILL_RESULT = {
  items_added: ["item-uuid-20", "item-uuid-21"],
  gaps_remaining: 2,
  new_compliance: 65.0,
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/modules/exam/__tests__/gap-flagging.service.test.ts`

```
describe("GapFlaggingService")
  describe("analyzeGaps")
    - returns no gaps when all dimensions meet targets
    - identifies critical gaps (below 60% of target)
    - identifies warning gaps (60-80% of target)
    - returns correct deficit count per gap
    - generates human-readable suggestion text
    - computes overall compliance percentage
    - respects custom threshold configuration
    - returns gaps sorted by severity (critical first)
  describe("autoFill")
    - calls recommendation engine with gap-specific constraints
    - adds recommended items to exam
    - returns updated compliance after auto-fill
    - returns empty items_added when no items match gap criteria
```

**Total: ~12 tests** (8 analyzeGaps + 4 autoFill)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Gap flagging E2E will be covered as part of the exam builder E2E tests in F-71.

## 12. Acceptance Criteria

1. Gap analysis runs on current exam composition vs blueprint targets
2. Categories below 80% of target are flagged (configurable threshold)
3. Severity levels: warning (60-80% of target), critical (< 60% of target)
4. Gap summary panel in exam builder shows all flagged categories
5. Suggested actions displayed: "Add N more X items" with one-click auto-fill
6. Auto-fill uses recommendation engine to select best items for gap
7. Gaps update in real-time as items are added/removed
8. API endpoint: GET /api/v1/exams/:examId/gaps returns gap analysis
9. All ~12 API tests pass
10. TypeScript strict, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| Highlight under-represented categories | S-F-26-4 § User Story |
| Threshold default 80% | S-F-26-4 § Acceptance Criteria |
| Severity: warning 60-80%, critical <60% | S-F-26-4 § Acceptance Criteria |
| One-click auto-fill | S-F-26-4 § Acceptance Criteria |
| Reuses coverage computation from recommendation engine | S-F-26-4 § Notes |
| Real-time client-side, server validation on save | S-F-26-4 § Notes |
| Extension of recommendation engine | S-F-26-4 § Notes |

## 14. Environment Prerequisites

- **Supabase:** Project running, `exams`, `exam_items` (from F-71), `blueprints` (from F-65), item bank tables (from F-64)
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story

## 15. Figma / Make Prototype

No Figma designs available. Gap summary panel integrates into the exam builder layout from F-71. Use shadcn/ui Card, Badge, Progress, Button components. Severity colors follow the design token system (red/yellow/green).
