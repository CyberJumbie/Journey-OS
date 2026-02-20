# STORY-F-70 Brief: Item Recommendation Engine

## 0. Lane & Priority

```yaml
story_id: STORY-F-70
old_id: S-F-26-2
lane: faculty
lane_priority: 3
within_lane_order: 70
sprint: 29
size: L
depends_on:
  - STORY-F-65 (faculty) — Blueprint Definition Model (blueprint model exists)
blocks:
  - STORY-F-71 — Exam Builder UI
  - STORY-F-72 — Gap Flagging
personas_served: [faculty]
epic: E-26 (Blueprint & Assembly Engine)
feature: F-12 (Exam Assembly & Delivery)
user_flow: UF-20 (Exam Assembly & Assignment)
```

## 1. Summary

Build an **item recommendation engine** that accepts an exam blueprint and item bank, then returns a ranked list of items that maximizes blueprint coverage across multiple dimensions (USMLE system, discipline, Bloom level). The engine uses a weighted greedy algorithm to prioritize items filling the largest coverage gaps, respects difficulty distribution constraints, prevents duplicate concepts, and supports manual overrides (lock/exclude items). Output includes a coverage score (0-100%) and gap analysis per dimension.

This is the second story in E-26 (Blueprint & Assembly Engine): F-65 (blueprint model) -> **F-70 (recommendation engine)** -> F-71 (builder UI) / F-72 (gap flagging).

Key constraints:
- **Weighted greedy algorithm** — exact optimization is NP-hard, greedy is acceptable
- Multi-dimensional coverage: simultaneously optimize USMLE system, discipline, Bloom level
- Performance: recommend from 5000-item bank in < 3 seconds
- Support locked items (must include) and excluded items (must skip)
- Paginated results with coverage improvement per additional item
- No duplicate concepts in selected set (configurable)

## 2. Task Breakdown

1. **Types** — Create `RecommendationRequest`, `RecommendationResult`, `RecommendedItem`, `CoverageScore`, `CoverageGap`, `DimensionCoverage` in `packages/types/src/exam/recommendation.types.ts`
2. **Algorithm** — `CoverageOptimizer` class with weighted greedy selection algorithm
3. **Service** — `ItemRecommendationService` with `recommend()` method that orchestrates algorithm + data fetching
4. **Controller** — `ItemRecommendationController` with `handleRecommend()` method
5. **Routes** — Protected route `POST /api/v1/exams/blueprints/:blueprintId/recommend` with RBAC
6. **Wire up** — Register routes in exam module router
7. **Algorithm tests** — 10 tests for coverage optimizer correctness with known inputs/outputs
8. **Service tests** — 6 tests for recommendation flow, pagination, overrides
9. **Controller tests** — 4 tests for endpoint auth, validation

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/exam/recommendation.types.ts

/** Request body for item recommendations */
export interface RecommendationRequest {
  readonly blueprint_id: string;
  readonly target_count: number;                    // desired number of items
  readonly locked_item_ids?: readonly string[];     // must include these items
  readonly excluded_item_ids?: readonly string[];   // must skip these items
  readonly allow_duplicate_concepts?: boolean;      // default: false
  readonly difficulty_ratio?: DifficultyRatio;      // override default ratio
  readonly page?: number;                           // default: 1
  readonly limit?: number;                          // default: 50
}

/** Target difficulty distribution */
export interface DifficultyRatio {
  readonly easy: number;    // percentage, e.g., 30
  readonly medium: number;  // percentage, e.g., 50
  readonly hard: number;    // percentage, e.g., 20
}

/** Single recommended item with coverage contribution */
export interface RecommendedItem {
  readonly item_id: string;
  readonly stem_preview: string;                    // first 100 chars
  readonly usmle_system: string;
  readonly discipline: string;
  readonly bloom_level: string;
  readonly difficulty: string;
  readonly concept_tags: readonly string[];
  readonly composite_score: number;
  readonly coverage_improvement: number;            // how much this item improves total coverage
  readonly rank: number;
}

/** Coverage score for a single dimension */
export interface DimensionCoverage {
  readonly dimension: string;                       // "usmle_system", "discipline", "bloom_level"
  readonly targets: readonly DimensionTarget[];
  readonly overall_percentage: number;              // 0-100
}

/** Target within a dimension */
export interface DimensionTarget {
  readonly label: string;                           // e.g., "Cardiovascular"
  readonly target_percentage: number;               // from blueprint
  readonly actual_percentage: number;               // current selection
  readonly target_count: number;
  readonly actual_count: number;
  readonly gap: number;                             // target_count - actual_count
}

/** Gap analysis for under-represented categories */
export interface CoverageGap {
  readonly dimension: string;
  readonly label: string;
  readonly target_count: number;
  readonly actual_count: number;
  readonly deficit: number;
  readonly severity: "warning" | "critical";        // warning: 60-80%, critical: <60%
}

/** Full recommendation result */
export interface RecommendationResult {
  readonly blueprint_id: string;
  readonly total_coverage_score: number;            // 0-100
  readonly dimension_coverage: readonly DimensionCoverage[];
  readonly gaps: readonly CoverageGap[];
  readonly recommended_items: readonly RecommendedItem[];
  readonly locked_items_count: number;
  readonly excluded_items_count: number;
  readonly available_items_total: number;
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}

/** Internal: Item metadata used by coverage optimizer */
export interface ItemMetadata {
  readonly id: string;
  readonly usmle_system: string;
  readonly discipline: string;
  readonly bloom_level: string;
  readonly difficulty: string;
  readonly concept_ids: readonly string[];
  readonly composite_score: number;
  readonly stem_preview: string;
}

/** Blueprint target distribution (per dimension) */
export interface BlueprintTarget {
  readonly dimension: string;
  readonly entries: readonly {
    readonly label: string;
    readonly percentage: number;
  }[];
}
```

## 4. Database Schema (inline, complete)

No new tables needed. Reads from existing tables:

```sql
-- Existing tables used:

-- blueprints (from F-65)
-- blueprints.id UUID PK
-- blueprints.name TEXT
-- blueprints.total_question_count INTEGER
-- blueprints.targets JSONB (dimension distributions)

-- questions / items (from item bank, F-64)
-- items with: usmle_system, discipline, bloom_level, difficulty, concept_tags, composite_score

-- concept_tags (from F-54)
-- Used for duplicate concept detection
```

## 5. API Contract (complete request/response)

### POST /api/v1/exams/blueprints/:blueprintId/recommend (Auth: Faculty)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `blueprintId` | string (UUID) | The blueprint to recommend items for |

**Request Body:**
```json
{
  "target_count": 100,
  "locked_item_ids": ["item-uuid-1", "item-uuid-2"],
  "excluded_item_ids": ["item-uuid-10"],
  "allow_duplicate_concepts": false,
  "difficulty_ratio": { "easy": 30, "medium": 50, "hard": 20 },
  "page": 1,
  "limit": 50
}
```

**Success Response (200):**
```json
{
  "data": {
    "blueprint_id": "bp-uuid-1",
    "total_coverage_score": 87.5,
    "dimension_coverage": [
      {
        "dimension": "usmle_system",
        "targets": [
          {
            "label": "Cardiovascular",
            "target_percentage": 20,
            "actual_percentage": 18,
            "target_count": 20,
            "actual_count": 18,
            "gap": 2
          }
        ],
        "overall_percentage": 90.0
      },
      {
        "dimension": "discipline",
        "targets": [],
        "overall_percentage": 85.0
      },
      {
        "dimension": "bloom_level",
        "targets": [],
        "overall_percentage": 87.5
      }
    ],
    "gaps": [
      {
        "dimension": "usmle_system",
        "label": "Cardiovascular",
        "target_count": 20,
        "actual_count": 18,
        "deficit": 2,
        "severity": "warning"
      }
    ],
    "recommended_items": [
      {
        "item_id": "item-uuid-5",
        "stem_preview": "A 65-year-old man presents with chest pain and dyspnea on exertion...",
        "usmle_system": "Cardiovascular",
        "discipline": "Pathology",
        "bloom_level": "Apply",
        "difficulty": "medium",
        "concept_tags": ["heart-failure", "valvular-disease"],
        "composite_score": 8.2,
        "coverage_improvement": 1.5,
        "rank": 1
      }
    ],
    "locked_items_count": 2,
    "excluded_items_count": 1,
    "available_items_total": 842,
    "meta": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "total_pages": 2
    }
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role |
| 400 | `VALIDATION_ERROR` | Invalid target_count, difficulty ratio not summing to 100 |
| 404 | `NOT_FOUND` | Blueprint ID does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

No dedicated frontend page for this story. The recommendation engine is consumed by the Exam Builder UI (F-71) and Gap Flagging (F-72). The API is backend-only in this story.

Frontend integration happens in:
- F-71: Left panel recommendation list calls this endpoint
- F-72: Auto-fill calls this endpoint with gap-specific constraints

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/exam/recommendation.types.ts` | Types | Create |
| 2 | `packages/types/src/exam/index.ts` | Types | Edit (add recommendation export) |
| 3 | `apps/server/src/modules/exam/algorithms/coverage-optimizer.ts` | Algorithm | Create |
| 4 | `apps/server/src/modules/exam/services/item-recommendation.service.ts` | Service | Create |
| 5 | `apps/server/src/modules/exam/controllers/item-recommendation.controller.ts` | Controller | Create |
| 6 | `apps/server/src/modules/exam/routes/item-recommendation.routes.ts` | Routes | Create |
| 7 | `apps/server/src/modules/exam/__tests__/coverage-optimizer.test.ts` | Tests | Create |
| 8 | `apps/server/src/modules/exam/__tests__/item-recommendation.service.test.ts` | Tests | Create |
| 9 | `apps/server/src/modules/exam/__tests__/item-recommendation.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-65 | faculty | pending | Blueprint Definition Model — blueprint with target distributions must exist |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client
- `express` — Server framework
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.FACULTY)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`
- Blueprint model and repository from F-65
- Item bank tables from F-64

### Neo4j (optional)
- Neo4j graph queries may be used to find items by concept relationships for richer recommendations. If Neo4j is unavailable, fall back to Supabase concept_tags array matching.

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

// Mock blueprint with target distributions
export const MOCK_BLUEPRINT = {
  id: "bp-uuid-1",
  name: "USMLE Step 1 Exam",
  total_question_count: 10,
  targets: {
    usmle_system: [
      { label: "Cardiovascular", percentage: 30 },
      { label: "Respiratory", percentage: 20 },
      { label: "Renal", percentage: 20 },
      { label: "Gastrointestinal", percentage: 30 },
    ],
    discipline: [
      { label: "Pathology", percentage: 40 },
      { label: "Pharmacology", percentage: 30 },
      { label: "Physiology", percentage: 30 },
    ],
    bloom_level: [
      { label: "Apply", percentage: 50 },
      { label: "Analyze", percentage: 30 },
      { label: "Evaluate", percentage: 20 },
    ],
  },
};

// Mock item bank (small set for algorithm testing)
export const MOCK_ITEMS: ItemMetadata[] = [
  { id: "item-1", usmle_system: "Cardiovascular", discipline: "Pathology", bloom_level: "Apply", difficulty: "medium", concept_ids: ["c-1"], composite_score: 8.0, stem_preview: "A 65-year-old man..." },
  { id: "item-2", usmle_system: "Cardiovascular", discipline: "Pharmacology", bloom_level: "Analyze", difficulty: "hard", concept_ids: ["c-2"], composite_score: 7.5, stem_preview: "A patient on metoprolol..." },
  { id: "item-3", usmle_system: "Respiratory", discipline: "Physiology", bloom_level: "Apply", difficulty: "easy", concept_ids: ["c-3"], composite_score: 7.0, stem_preview: "A 25-year-old woman..." },
  { id: "item-4", usmle_system: "Renal", discipline: "Pathology", bloom_level: "Evaluate", difficulty: "hard", concept_ids: ["c-4"], composite_score: 8.5, stem_preview: "A 50-year-old diabetic..." },
  { id: "item-5", usmle_system: "Gastrointestinal", discipline: "Pharmacology", bloom_level: "Apply", difficulty: "medium", concept_ids: ["c-5"], composite_score: 6.5, stem_preview: "A patient with GERD..." },
  { id: "item-6", usmle_system: "Cardiovascular", discipline: "Physiology", bloom_level: "Analyze", difficulty: "medium", concept_ids: ["c-1"], composite_score: 7.8, stem_preview: "Cardiac output increases..." },  // duplicate concept c-1
  { id: "item-7", usmle_system: "Respiratory", discipline: "Pathology", bloom_level: "Apply", difficulty: "easy", concept_ids: ["c-6"], composite_score: 7.2, stem_preview: "A patient with COPD..." },
  { id: "item-8", usmle_system: "Renal", discipline: "Pharmacology", bloom_level: "Apply", difficulty: "medium", concept_ids: ["c-7"], composite_score: 8.1, stem_preview: "A patient on ACE..." },
  { id: "item-9", usmle_system: "Gastrointestinal", discipline: "Pathology", bloom_level: "Analyze", difficulty: "hard", concept_ids: ["c-8"], composite_score: 7.9, stem_preview: "A 40-year-old with..." },
  { id: "item-10", usmle_system: "Gastrointestinal", discipline: "Physiology", bloom_level: "Evaluate", difficulty: "medium", concept_ids: ["c-9"], composite_score: 6.8, stem_preview: "The migrating motor..." },
];

// Expected: algorithm should select items that maximize coverage across all 3 dimensions
// With target_count=10 and 10 items available, all should be selected
// With allow_duplicate_concepts=false, item-6 (duplicate c-1) should be deprioritized

// Valid recommendation request
export const VALID_REQUEST = {
  target_count: 10,
  locked_item_ids: [],
  excluded_item_ids: [],
  allow_duplicate_concepts: false,
  page: 1,
  limit: 50,
};

// Request with locked and excluded items
export const OVERRIDE_REQUEST = {
  target_count: 5,
  locked_item_ids: ["item-1", "item-4"],
  excluded_item_ids: ["item-6"],
  allow_duplicate_concepts: false,
  page: 1,
  limit: 50,
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/modules/exam/__tests__/coverage-optimizer.test.ts`

```
describe("CoverageOptimizer")
  describe("optimize")
    - selects items that maximize multi-dimensional coverage
    - respects target_count limit
    - prioritizes items filling largest gaps first
    - excludes duplicate concepts when allow_duplicate_concepts=false
    - includes duplicate concepts when allow_duplicate_concepts=true
    - respects difficulty distribution ratio (easy/medium/hard)
    - includes locked items regardless of coverage contribution
    - excludes excluded items from selection
    - returns items ranked by coverage improvement
    - computes correct total coverage score (0-100)
  describe("computeCoverage")
    - computes dimension coverage percentages correctly
    - identifies gaps with correct severity (warning vs critical)
```

**File:** `apps/server/src/modules/exam/__tests__/item-recommendation.service.test.ts`

```
describe("ItemRecommendationService")
  describe("recommend")
    - fetches blueprint and item bank, returns ranked recommendations
    - returns paginated results with correct meta
    - returns empty recommendations when item bank is empty
    - throws NotFoundError for non-existent blueprint
    - caches item metadata for performance
    - includes coverage improvement per item in results
```

**File:** `apps/server/src/modules/exam/__tests__/item-recommendation.controller.test.ts`

```
describe("ItemRecommendationController")
  describe("handleRecommend")
    - returns recommendations for valid request (200)
    - rejects unauthenticated request (401)
    - rejects non-faculty role (403)
    - rejects invalid target_count (400)
```

**Total: ~22 tests** (12 algorithm + 6 service + 4 controller)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. The recommendation engine is a backend-only API consumed by F-71 (Exam Builder UI). E2E coverage will be added with F-71.

## 12. Acceptance Criteria

1. Algorithm accepts blueprint + item bank and returns ranked item list
2. Coverage-maximizing greedy selection prioritizes items filling largest gaps
3. Multi-dimensional coverage simultaneously optimizes USMLE system, discipline, and Bloom level
4. No duplicate concepts in selected set when configured
5. Difficulty distribution respects easy/medium/hard ratio
6. Output includes coverage score (0-100%) and gap analysis
7. Support for manual overrides: lock specific items, exclude others
8. Performance: recommend from 5000-item bank in < 3 seconds
9. Results paginated with coverage improvement per additional item
10. All ~22 API tests pass
11. TypeScript strict, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| Recommend items maximizing blueprint coverage | S-F-26-2 § User Story |
| Weighted greedy algorithm | S-F-26-2 § Notes: "exact optimization is NP-hard, greedy is acceptable" |
| Multi-dimensional scoring | S-F-26-2 § Notes: "weighted sum of per-dimension coverage percentages" |
| 5000-item performance target | S-F-26-2 § Acceptance Criteria |
| Lock/exclude overrides | S-F-26-2 § Acceptance Criteria |
| Item metadata needed | S-F-26-2 § Notes: "USMLE system, discipline, Bloom level, difficulty, concept tags" |
| Neo4j for concept relationships | S-F-26-2 § Notes: "Neo4j graph queries may be used" |
| Blocks F-71 and F-72 | S-F-26-2 § Dependencies |

## 14. Environment Prerequisites

- **Supabase:** Project running, blueprint table (from F-65), item bank tables (from F-64) with items to recommend
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Neo4j:** Optional — used for concept relationship queries if available
- **No frontend needed** for this story (backend API only)

## 15. Figma / Make Prototype

No Figma designs needed. This is a backend-only API story. Frontend consumption happens in F-71 (Exam Builder UI).
