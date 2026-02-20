# STORY-IA-36 Brief: Golden Dataset Service

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-36
old_id: S-IA-37-2
lane: institutional_admin
lane_priority: 2
within_lane_order: 36
sprint: 15
size: M
depends_on:
  - STORY-IA-12 (institutional_admin) — Lint Engine Infrastructure
blocks: []
personas_served: [institutional_admin, superadmin]
epic: E-37 (KaizenML Linting & Golden Dataset)
feature: F-17 (Platform Quality & Admin)
user_flow: UF-27 (Generation Quality Regression Testing)
```

---

## 1. Summary

Build a **Golden Dataset Service** that maintains a regression suite of 50 curated question-answer pairs with expected quality scores. The service runs the generation pipeline on golden prompts, compares output quality against baselines, and detects drift (composite score drop > 0.5 from baseline or individual metric degradation > 1.0). Results are stored with timestamps for trend analysis. An Inngest scheduled function runs regression weekly.

Key constraints:
- **50 curated items** covering diversity: question types, Bloom levels, difficulty, clinical domains
- **Drift detection:** average composite score drop > 0.5 OR individual metric drop > 1.0
- **Baseline snapshot** captured when golden items are first curated ("known good")
- **Inngest scheduled function** for weekly regression (configurable)
- **Custom error class:** `GoldenDatasetError`
- **CRUD operations** for golden dataset items (superadmin/institutional_admin only)
- **Emits `kaizen.drift.detected` event** on drift detection (consumed by STORY-IA-35 alerts)

---

## 2. Task Breakdown

Implementation order follows: **Types -> Model -> Repository -> Service -> Inngest -> Tests**

### Task 1: Create golden dataset types
- **File:** `packages/types/src/kaizen/golden-dataset.types.ts`
- **Action:** Export `GoldenDatasetItem`, `RegressionResult`, `DriftResult`, `DriftMetric`, `GoldenDatasetCreateRequest`, `GoldenDatasetUpdateRequest`

### Task 2: Export types from kaizen barrel
- **File:** `packages/types/src/kaizen/index.ts`
- **Action:** Edit to re-export from `golden-dataset.types.ts`

### Task 3: Build GoldenDatasetItem model
- **File:** `apps/server/src/models/golden-dataset-item.model.ts`
- **Action:** Class with `#id`, `#prompt`, `#expectedAnswer`, `#baselineScores`, `#metadata` private fields. Public getters. Method: `toJSON()`.

### Task 4: Build GoldenDatasetRepository
- **File:** `apps/server/src/repositories/golden-dataset.repository.ts`
- **Action:** Class with `#supabase` private field. Methods: `findAll(institutionId)`, `findById(id)`, `create(item)`, `update(id, item)`, `delete(id)`, `saveRegressionResult(result)`, `getRegressionTrend(institutionId, limit)`.

### Task 5: Build GoldenDatasetError
- **File:** `apps/server/src/services/kaizen/errors/golden-dataset.error.ts`
- **Action:** Export `GoldenDatasetError` extending base app error class.

### Task 6: Build GoldenDatasetService
- **File:** `apps/server/src/services/kaizen/golden-dataset.service.ts`
- **Action:** Class with `#repository`, `#generationPipeline` private fields (constructor DI). Methods:
  - `runRegression(institutionId)` -- runs all 50 items through generation, compares scores
  - `detectDrift(currentScores, baselineScores)` -- evaluates composite and per-metric drift
  - `addItem(item)` -- adds curated item with baseline snapshot
  - `updateItem(id, updates)` -- updates item, optionally re-baselines
  - `removeItem(id)` -- soft delete
  - `getItems(institutionId)` -- list all golden items
  - `getTrend(institutionId)` -- regression result trend over time

### Task 7: Build DriftDetectionService
- **File:** `apps/server/src/services/kaizen/drift-detection.service.ts`
- **Action:** Class with `#goldenDatasetService` private field. Methods:
  - `evaluateDrift(regressionResult)` -- checks composite and per-metric thresholds
  - `emitDriftEvent(institutionId, driftResult)` -- emits `kaizen.drift.detected` event

### Task 8: Build Inngest regression function
- **File:** `apps/server/src/inngest/functions/kaizen-regression.fn.ts`
- **Action:** Inngest function scheduled weekly (cron). Calls `goldenDatasetService.runRegression()`, then `driftDetectionService.evaluateDrift()`. On drift, emits event.

### Task 9: Write golden dataset tests
- **File:** `apps/server/src/tests/kaizen/golden-dataset.test.ts`
- **Action:** 10-14 tests covering CRUD, regression run, baseline comparison.

### Task 10: Write drift detection tests
- **File:** `apps/server/src/tests/kaizen/drift-detection.test.ts`
- **Action:** 5-7 tests covering drift thresholds, per-metric drift, event emission.

---

## 3. Data Model

```typescript
// packages/types/src/kaizen/golden-dataset.types.ts

/** A curated question-answer pair in the golden dataset */
export interface GoldenDatasetItem {
  readonly id: string;
  readonly institution_id: string;
  readonly prompt: string;                // generation prompt/input
  readonly expected_answer: string;       // expected output
  readonly question_type: string;         // MCQ, case-based, etc.
  readonly bloom_level: string;           // Remember, Understand, Apply, etc.
  readonly difficulty: string;            // easy, medium, hard
  readonly clinical_domain: string;       // Cardiology, Neurology, etc.
  readonly baseline_scores: BaselineScores;
  readonly version: number;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Baseline quality scores captured at curation time */
export interface BaselineScores {
  readonly composite: number;             // 0-5
  readonly relevance: number;
  readonly accuracy: number;
  readonly bloom_alignment: number;
  readonly difficulty_alignment: number;
  readonly distractor_quality: number;
}

/** Result of a single regression run */
export interface RegressionResult {
  readonly id: string;
  readonly institution_id: string;
  readonly run_at: string;                // ISO timestamp
  readonly items_tested: number;
  readonly average_composite: number;
  readonly per_metric_averages: BaselineScores;
  readonly drift_detected: boolean;
  readonly drift_details?: DriftResult;
  readonly duration_ms: number;
}

/** Drift detection result */
export interface DriftResult {
  readonly composite_delta: number;       // negative = degradation
  readonly composite_drifted: boolean;    // |delta| > 0.5
  readonly metrics_drifted: readonly DriftMetric[];
}

/** Per-metric drift detail */
export interface DriftMetric {
  readonly metric_name: string;
  readonly baseline_value: number;
  readonly current_value: number;
  readonly delta: number;
  readonly drifted: boolean;              // |delta| > 1.0
}

/** Request to create a golden dataset item */
export interface GoldenDatasetCreateRequest {
  readonly prompt: string;
  readonly expected_answer: string;
  readonly question_type: string;
  readonly bloom_level: string;
  readonly difficulty: string;
  readonly clinical_domain: string;
}

/** Request to update a golden dataset item */
export interface GoldenDatasetUpdateRequest {
  readonly prompt?: string;
  readonly expected_answer?: string;
  readonly question_type?: string;
  readonly bloom_level?: string;
  readonly difficulty?: string;
  readonly clinical_domain?: string;
  readonly re_baseline?: boolean;         // if true, re-capture baseline scores
}
```

---

## 4. Database Schema

### New table: `golden_dataset_items`

```sql
CREATE TABLE golden_dataset_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  prompt TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  question_type TEXT NOT NULL,
  bloom_level TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  clinical_domain TEXT NOT NULL,
  baseline_scores JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_golden_dataset_institution
  ON golden_dataset_items(institution_id, is_active);

ALTER TABLE golden_dataset_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage own institution golden dataset"
  ON golden_dataset_items FOR ALL
  USING (institution_id = (auth.jwt() ->> 'institution_id')::uuid);
```

### New table: `regression_results`

```sql
CREATE TABLE regression_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  items_tested INTEGER NOT NULL,
  average_composite NUMERIC(4,2) NOT NULL,
  per_metric_averages JSONB NOT NULL,
  drift_detected BOOLEAN NOT NULL DEFAULT false,
  drift_details JSONB,
  duration_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_regression_results_institution
  ON regression_results(institution_id, run_at DESC);

ALTER TABLE regression_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view own institution regression results"
  ON regression_results FOR SELECT
  USING (institution_id = (auth.jwt() ->> 'institution_id')::uuid);
```

---

## 5. API Contract

No public API endpoints in this story. The Golden Dataset Service is used internally by:
1. **Inngest scheduled function** (weekly regression run)
2. **Admin CRUD** (future endpoint story, or exposed via existing admin routes)

**Internal service interface:**
```typescript
// Weekly regression (called by Inngest)
const result = await goldenDatasetService.runRegression(institutionId);
const drift = await driftDetectionService.evaluateDrift(result);
if (drift.composite_drifted || drift.metrics_drifted.length > 0) {
  await driftDetectionService.emitDriftEvent(institutionId, drift);
}

// CRUD (called internally or by admin endpoints)
await goldenDatasetService.addItem({ prompt, expected_answer, ... });
await goldenDatasetService.updateItem(id, { prompt: "updated" });
await goldenDatasetService.removeItem(id);
const items = await goldenDatasetService.getItems(institutionId);
const trend = await goldenDatasetService.getTrend(institutionId);
```

**Inngest function:**
```typescript
// Scheduled: every Monday at 2:00 AM UTC
export const kaizenRegression = inngest.createFunction(
  { id: "kaizen-regression" },
  { cron: "0 2 * * 1" },
  async ({ step }) => { ... }
);
```

---

## 6. Frontend Spec

No frontend components in this story. The Golden Dataset Service is backend-only. A future story may add a golden dataset management UI.

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/kaizen/golden-dataset.types.ts` | Types | Create |
| 2 | `packages/types/src/kaizen/index.ts` | Types | Edit (add export) |
| 3 | `apps/server/src/models/golden-dataset-item.model.ts` | Model | Create |
| 4 | `apps/server/src/repositories/golden-dataset.repository.ts` | Repository | Create |
| 5 | `apps/server/src/services/kaizen/errors/golden-dataset.error.ts` | Error | Create |
| 6 | `apps/server/src/services/kaizen/golden-dataset.service.ts` | Service | Create |
| 7 | `apps/server/src/services/kaizen/drift-detection.service.ts` | Service | Create |
| 8 | `apps/server/src/inngest/functions/kaizen-regression.fn.ts` | Inngest | Create |
| 9 | `apps/server/src/tests/kaizen/golden-dataset.test.ts` | Tests | Create |
| 10 | `apps/server/src/tests/kaizen/drift-detection.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-12 | institutional_admin | **PENDING** | Lint engine infrastructure provides the base KaizenML patterns |

### NPM Packages
- `inngest` -- already installed for scheduled functions
- No new packages expected

### Existing Files Needed
- `apps/server/src/config/supabase-client.config.ts` -- Supabase client
- `apps/server/src/inngest/client.ts` -- Inngest client configuration
- `apps/server/src/errors/base.error.ts` -- Base error class for GoldenDatasetError
- Generation pipeline service (for running prompts through generation -- may need mock initially)

---

## 9. Test Fixtures

```typescript
export const MOCK_GOLDEN_ITEMS: GoldenDatasetItem[] = [
  {
    id: "golden-uuid-1",
    institution_id: "inst-uuid-1",
    prompt: "Generate a Step 1 MCQ about coronary artery disease pathophysiology at Bloom level 4",
    expected_answer: "A 55-year-old male presents with...",
    question_type: "MCQ",
    bloom_level: "Analyze",
    difficulty: "medium",
    clinical_domain: "Cardiology",
    baseline_scores: {
      composite: 4.2,
      relevance: 4.5,
      accuracy: 4.0,
      bloom_alignment: 4.3,
      difficulty_alignment: 4.0,
      distractor_quality: 4.2,
    },
    version: 1,
    is_active: true,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
  },
  {
    id: "golden-uuid-2",
    institution_id: "inst-uuid-1",
    prompt: "Generate a case-based question about Type 2 Diabetes management",
    expected_answer: "A patient with newly diagnosed...",
    question_type: "Case-Based",
    bloom_level: "Apply",
    difficulty: "hard",
    clinical_domain: "Endocrinology",
    baseline_scores: {
      composite: 4.5,
      relevance: 4.8,
      accuracy: 4.3,
      bloom_alignment: 4.5,
      difficulty_alignment: 4.5,
      distractor_quality: 4.4,
    },
    version: 1,
    is_active: true,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
  },
];

export const MOCK_BASELINE_SCORES: BaselineScores = {
  composite: 4.2,
  relevance: 4.5,
  accuracy: 4.0,
  bloom_alignment: 4.3,
  difficulty_alignment: 4.0,
  distractor_quality: 4.2,
};

export const MOCK_REGRESSION_RESULT: RegressionResult = {
  id: "regression-uuid-1",
  institution_id: "inst-uuid-1",
  run_at: "2026-02-19T02:00:00Z",
  items_tested: 50,
  average_composite: 3.6,
  per_metric_averages: {
    composite: 3.6,
    relevance: 4.0,
    accuracy: 3.2,
    bloom_alignment: 3.8,
    difficulty_alignment: 3.5,
    distractor_quality: 3.5,
  },
  drift_detected: true,
  drift_details: {
    composite_delta: -0.6,
    composite_drifted: true,
    metrics_drifted: [
      { metric_name: "accuracy", baseline_value: 4.0, current_value: 3.2, delta: -0.8, drifted: false },
    ],
  },
  duration_ms: 180000,
};

export const MOCK_NO_DRIFT_RESULT: RegressionResult = {
  id: "regression-uuid-2",
  institution_id: "inst-uuid-1",
  run_at: "2026-02-12T02:00:00Z",
  items_tested: 50,
  average_composite: 4.1,
  per_metric_averages: MOCK_BASELINE_SCORES,
  drift_detected: false,
  duration_ms: 175000,
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

**File:** `apps/server/src/tests/kaizen/golden-dataset.test.ts`

```
describe("GoldenDatasetService")
  describe("CRUD operations")
    it("adds a golden dataset item with baseline scores")
    it("updates an existing item and preserves version history")
    it("re-baselines scores when re_baseline flag is true")
    it("soft-deletes item by setting is_active to false")
    it("returns all active items for institution")
  describe("runRegression")
    it("runs all active golden items through generation pipeline")
    it("computes average composite and per-metric scores")
    it("stores regression result with duration_ms")
    it("handles generation pipeline errors gracefully")
  describe("getTrend")
    it("returns regression results ordered by run_at descending")
    it("limits results to specified count")

describe("GoldenDatasetRepository")
  it("persists golden dataset item to Supabase")
  it("persists regression result to Supabase")
  it("scopes queries to institution_id")
```

**File:** `apps/server/src/tests/kaizen/drift-detection.test.ts`

```
describe("DriftDetectionService")
  describe("evaluateDrift")
    it("detects composite drift when average drops > 0.5")
    it("does not flag drift when drop is <= 0.5")
    it("detects per-metric drift when individual metric drops > 1.0")
    it("returns multiple drifted metrics when multiple degrade")
  describe("emitDriftEvent")
    it("emits kaizen.drift.detected event with drift result")
```

**Total: ~17 API tests**

---

## 11. E2E Test Spec (Playwright)

No E2E tests for this story. Backend service only with no UI. Inngest function tested via unit tests with mocked pipeline.

---

## 12. Acceptance Criteria

1. Golden dataset contains 50 curated question-answer pairs with expected scores
2. Regression test runs generation pipeline on golden prompts and compares output quality
3. Drift detection flags composite score drop > 0.5 from baseline
4. Per-metric drift flags individual metrics degrading > 1.0 from baseline
5. Regression results stored with timestamp for trend analysis
6. Golden dataset CRUD: add, remove, update items (superadmin/institutional_admin only)
7. Inngest scheduled function runs weekly regression (configurable cron)
8. Drift detection emits `kaizen.drift.detected` event
9. Custom `GoldenDatasetError` class for error handling
10. All ~17 API tests pass
11. TypeScript strict, named exports only

---

## 13. Source References

| Claim | Source |
|-------|--------|
| Golden dataset concept | S-IA-37-2 User Story |
| 50 curated items | S-IA-37-2 Acceptance Criteria |
| Drift thresholds (0.5 composite, 1.0 per-metric) | S-IA-37-2 Acceptance Criteria |
| Weekly Inngest schedule | S-IA-37-2 Notes |
| GoldenDatasetError custom class | S-IA-37-2 Acceptance Criteria |
| kaizen.drift.detected event | S-IA-37-2 Acceptance Criteria |
| Diversity: question types, Bloom levels | S-IA-37-2 Notes |
| Versioning golden dataset | S-IA-37-2 Notes |
| Results feed dashboard KPIs | S-IA-37-2 Notes |

---

## 14. Environment Prerequisites

- **Express:** Server running with kaizen services
- **Supabase:** golden_dataset_items and regression_results tables created
- **Inngest:** Inngest dev server or cloud connected for scheduled function
- **Generation pipeline:** Must be available (or mocked) for regression runs
- **Auth:** InstitutionalAdmin or SuperAdmin JWT for CRUD operations

---

## 15. Figma Make Prototype

No Figma prototype for this story. Backend service only.
