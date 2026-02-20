# STORY-ST-4 Brief: IRT 3PL Calibration

## 0. Lane & Priority

```yaml
story_id: STORY-ST-4
old_id: S-ST-40-2
lane: student
lane_priority: 4
within_lane_order: 4
sprint: 31
size: L
depends_on:
  - STORY-ST-1 (student) — FastAPI Scaffold
  - STORY-F-69 (faculty) — Retired Exam Import (cross-lane)
blocks:
  - STORY-ST-10 — Adaptive Item Selection
personas_served: [system]
epic: E-40 (BKT & IRT Engine)
feature: F-19 (Adaptive Learning Engine)
user_flow: UF-31 (Adaptive Practice Session)
```

## 1. Summary

Build the **IRT 3-Parameter Logistic (3PL) item calibration engine** as a FastAPI endpoint in `packages/python-api`. The 3PL model estimates three parameters per item from historical response data: difficulty (b), discrimination (a), and guessing (c). Calibration uses Marginal Maximum Likelihood Estimation (MMLE) with the EM algorithm, iterated until convergence (parameter change < 0.001 or 100 iterations).

Key constraints:
- **Python-only** — computational psychometrics runs in `packages/python-api` (FastAPI)
- **Minimum 100 responses per item** before calibration is attempted
- **Item fit statistics** — infit and outfit MNSQ computed per item, flagged if outside 0.7-1.3
- **Batch calibration** — single endpoint processes full item response matrix
- **Performance target** — 1000 items x 500 students in < 60 seconds
- **Storage** — calibrated parameters written to Supabase `irt_item_parameters` table with timestamps
- No Neo4j write for this story (parameters are relational data, not graph)

## 2. Task Breakdown

1. **Types** — Create `IrtCalibrationRequest`, `IrtCalibrationResponse`, `IrtItemParameters`, `IrtFitStatistics` in `packages/types/src/student/irt.types.ts`
2. **Python models** — Create Pydantic models mirroring TypeScript types in `packages/python-api/app/models/irt.py`
3. **Migration** — Create `irt_item_parameters` and `irt_calibration_runs` tables in Supabase
4. **3PL Engine** — Implement MMLE+EM calibration in `packages/python-api/app/engines/irt_3pl.py`
5. **Fit Statistics** — Implement infit/outfit MNSQ calculation in `packages/python-api/app/engines/irt_fit.py`
6. **Service** — `IrtCalibrationService` in `packages/python-api/app/services/irt_calibration.py` orchestrating validation, calibration, storage
7. **Repository** — `IrtRepository` in `packages/python-api/app/repositories/irt_repository.py` for Supabase reads/writes
8. **Route** — `POST /api/irt/calibrate` in `packages/python-api/app/routes/irt.py`
9. **API tests** — 16 tests covering calibration, convergence, fit stats, validation, storage
10. **Performance test** — Benchmark 1000x500 matrix under 60s threshold

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/student/irt.types.ts

/**
 * IRT 3PL item parameters after calibration.
 * [ARCHITECTURE v10 SS 13.1 — IRT calibration outputs]
 */
export interface IrtItemParameters {
  readonly item_id: string;
  readonly a: number;              // discrimination (0.2 - 3.0 typical)
  readonly b: number;              // difficulty (-3.0 to 3.0 typical)
  readonly c: number;              // guessing (0.0 to 0.35 typical)
  readonly a_se: number;           // standard error of a
  readonly b_se: number;           // standard error of b
  readonly c_se: number;           // standard error of c
  readonly infit_mnsq: number;     // infit mean-square statistic
  readonly outfit_mnsq: number;    // outfit mean-square statistic
  readonly is_flagged: boolean;    // true if MNSQ outside 0.7-1.3
  readonly response_count: number; // number of responses used
  readonly calibrated_at: string;  // ISO timestamp
  readonly calibration_run_id: string;
}

/**
 * Request body for POST /api/irt/calibrate
 */
export interface IrtCalibrationRequest {
  readonly item_ids?: string[];     // optional filter; if omitted, calibrate all eligible items
  readonly min_responses?: number;  // override minimum (default 100)
  readonly max_iterations?: number; // override max iterations (default 100)
  readonly convergence_threshold?: number; // override threshold (default 0.001)
}

/**
 * Response body for POST /api/irt/calibrate
 */
export interface IrtCalibrationResponse {
  readonly calibration_run_id: string;
  readonly items_calibrated: number;
  readonly items_skipped: number;       // below min_responses threshold
  readonly items_flagged: number;       // MNSQ outside acceptable range
  readonly convergence_achieved: boolean;
  readonly iterations_used: number;
  readonly elapsed_seconds: number;
  readonly parameters: IrtItemParameters[];
  readonly skipped_items: IrtSkippedItem[];
}

/**
 * Items that were skipped during calibration.
 */
export interface IrtSkippedItem {
  readonly item_id: string;
  readonly reason: string;           // e.g., "insufficient_responses"
  readonly response_count: number;
}

/**
 * Calibration run metadata for audit trail.
 */
export interface IrtCalibrationRun {
  readonly id: string;
  readonly started_at: string;
  readonly completed_at: string | null;
  readonly status: "running" | "completed" | "failed";
  readonly items_calibrated: number;
  readonly items_skipped: number;
  readonly items_flagged: number;
  readonly convergence_achieved: boolean;
  readonly iterations_used: number;
  readonly elapsed_seconds: number;
  readonly config: IrtCalibrationConfig;
}

/**
 * Configuration snapshot stored with each calibration run.
 */
export interface IrtCalibrationConfig {
  readonly min_responses: number;
  readonly max_iterations: number;
  readonly convergence_threshold: number;
  readonly model: "3pl";
}
```

```python
# packages/python-api/app/models/irt.py

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class IrtCalibrationRequest(BaseModel):
    item_ids: Optional[list[str]] = None
    min_responses: int = Field(default=100, ge=1)
    max_iterations: int = Field(default=100, ge=1, le=500)
    convergence_threshold: float = Field(default=0.001, gt=0, lt=1)

class IrtItemParameters(BaseModel):
    item_id: str
    a: float = Field(description="Discrimination parameter")
    b: float = Field(description="Difficulty parameter")
    c: float = Field(description="Guessing parameter")
    a_se: float = Field(description="Standard error of a")
    b_se: float = Field(description="Standard error of b")
    c_se: float = Field(description="Standard error of c")
    infit_mnsq: float
    outfit_mnsq: float
    is_flagged: bool
    response_count: int
    calibrated_at: datetime
    calibration_run_id: str

class IrtSkippedItem(BaseModel):
    item_id: str
    reason: str
    response_count: int

class IrtCalibrationResponse(BaseModel):
    calibration_run_id: str
    items_calibrated: int
    items_skipped: int
    items_flagged: int
    convergence_achieved: bool
    iterations_used: int
    elapsed_seconds: float
    parameters: list[IrtItemParameters]
    skipped_items: list[IrtSkippedItem]

class IrtCalibrationConfig(BaseModel):
    min_responses: int
    max_iterations: int
    convergence_threshold: float
    model: str = "3pl"

class IrtCalibrationRun(BaseModel):
    id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str  # "running" | "completed" | "failed"
    items_calibrated: int
    items_skipped: int
    items_flagged: int
    convergence_achieved: bool
    iterations_used: int
    elapsed_seconds: float
    config: IrtCalibrationConfig
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_irt_calibration_tables
-- IRT 3PL item parameter storage and calibration run audit trail

CREATE TABLE irt_calibration_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  items_calibrated INT NOT NULL DEFAULT 0,
  items_skipped INT NOT NULL DEFAULT 0,
  items_flagged INT NOT NULL DEFAULT 0,
  convergence_achieved BOOLEAN NOT NULL DEFAULT false,
  iterations_used INT NOT NULL DEFAULT 0,
  elapsed_seconds FLOAT NOT NULL DEFAULT 0,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE irt_item_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  calibration_run_id UUID NOT NULL REFERENCES irt_calibration_runs(id) ON DELETE CASCADE,
  a FLOAT NOT NULL,                -- discrimination
  b FLOAT NOT NULL,                -- difficulty
  c FLOAT NOT NULL,                -- guessing
  a_se FLOAT NOT NULL,             -- standard error of a
  b_se FLOAT NOT NULL,             -- standard error of b
  c_se FLOAT NOT NULL,             -- standard error of c
  infit_mnsq FLOAT NOT NULL,
  outfit_mnsq FLOAT NOT NULL,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  response_count INT NOT NULL,
  calibrated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient lookups
CREATE INDEX idx_irt_params_item_id ON irt_item_parameters(item_id);
CREATE INDEX idx_irt_params_calibration_run ON irt_item_parameters(calibration_run_id);
CREATE INDEX idx_irt_params_flagged ON irt_item_parameters(is_flagged) WHERE is_flagged = true;

-- Unique constraint: one parameter set per item per calibration run
CREATE UNIQUE INDEX idx_irt_params_item_run ON irt_item_parameters(item_id, calibration_run_id);

-- Latest parameters view helper
CREATE INDEX idx_irt_params_item_calibrated ON irt_item_parameters(item_id, calibrated_at DESC);

-- Calibration run status index
CREATE INDEX idx_irt_runs_status ON irt_calibration_runs(status);

-- RLS policies
ALTER TABLE irt_calibration_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE irt_item_parameters ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write calibration data (system-level operation)
CREATE POLICY "Service role full access on irt_calibration_runs"
  ON irt_calibration_runs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on irt_item_parameters"
  ON irt_item_parameters
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

No Neo4j schema changes for this story.

## 5. API Contract (complete request/response)

### POST /api/irt/calibrate (Auth: service-level, internal only)

This endpoint is called by the system scheduler or admin trigger. It runs in the Python FastAPI service (`packages/python-api`), not in the Express server.

**Request Body:**
```json
{
  "item_ids": ["uuid-1", "uuid-2"],
  "min_responses": 100,
  "max_iterations": 100,
  "convergence_threshold": 0.001
}
```

All fields are optional. Omitting `item_ids` calibrates all eligible items.

**Success Response (200):**
```json
{
  "data": {
    "calibration_run_id": "run-uuid-1",
    "items_calibrated": 847,
    "items_skipped": 153,
    "items_flagged": 12,
    "convergence_achieved": true,
    "iterations_used": 42,
    "elapsed_seconds": 38.7,
    "parameters": [
      {
        "item_id": "uuid-1",
        "a": 1.24,
        "b": -0.56,
        "c": 0.18,
        "a_se": 0.12,
        "b_se": 0.08,
        "c_se": 0.03,
        "infit_mnsq": 1.02,
        "outfit_mnsq": 0.98,
        "is_flagged": false,
        "response_count": 312,
        "calibrated_at": "2026-02-19T10:30:00Z",
        "calibration_run_id": "run-uuid-1"
      }
    ],
    "skipped_items": [
      {
        "item_id": "uuid-skip-1",
        "reason": "insufficient_responses",
        "response_count": 42
      }
    ]
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid request body (negative min_responses, etc.) |
| 400 | `INSUFFICIENT_DATA` | No items meet the minimum response threshold |
| 409 | `CALIBRATION_IN_PROGRESS` | Another calibration run is already running |
| 500 | `CALIBRATION_FAILED` | EM algorithm failed to converge or internal error |

### GET /api/irt/parameters/:item_id (Auth: service-level)

Returns the latest calibrated parameters for a single item.

**Success Response (200):**
```json
{
  "data": {
    "item_id": "uuid-1",
    "a": 1.24,
    "b": -0.56,
    "c": 0.18,
    "a_se": 0.12,
    "b_se": 0.08,
    "c_se": 0.03,
    "infit_mnsq": 1.02,
    "outfit_mnsq": 0.98,
    "is_flagged": false,
    "response_count": 312,
    "calibrated_at": "2026-02-19T10:30:00Z",
    "calibration_run_id": "run-uuid-1"
  },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 404 | `ITEM_NOT_FOUND` | No calibrated parameters exist for this item |

## 6. Frontend Spec

**N/A.** This is a backend-only Python service. No UI components. Calibration results are consumed by downstream stories (ST-10 Adaptive Item Selection) and displayed via the student dashboard (ST-2, ST-6).

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/student/irt.types.ts` | Types | Create |
| 2 | `packages/types/src/student/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add student export) |
| 4 | Supabase migration via MCP (irt tables) | Database | Apply |
| 5 | `packages/python-api/app/models/irt.py` | Models | Create |
| 6 | `packages/python-api/app/engines/irt_3pl.py` | Engine | Create |
| 7 | `packages/python-api/app/engines/irt_fit.py` | Engine | Create |
| 8 | `packages/python-api/app/repositories/irt_repository.py` | Repository | Create |
| 9 | `packages/python-api/app/services/irt_calibration.py` | Service | Create |
| 10 | `packages/python-api/app/routes/irt.py` | Route | Create |
| 11 | `packages/python-api/app/main.py` | App | Edit (register IRT router) |
| 12 | `packages/python-api/tests/test_irt_3pl.py` | Tests | Create |
| 13 | `packages/python-api/tests/test_irt_calibration.py` | Tests | Create |
| 14 | `packages/python-api/tests/test_irt_routes.py` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-ST-1 | student | NOT STARTED | FastAPI scaffold — app structure, Supabase client, auth middleware |
| STORY-F-69 | faculty | NOT STARTED | Retired Exam Import — provides historical item response data in `student_attempts` |

### Python Packages (to install in packages/python-api)
- `numpy` >= 1.26 — matrix operations for EM algorithm
- `scipy` >= 1.12 — optimization routines, special functions (logistic, log-likelihood)
- `supabase` >= 2.0 — Supabase Python client
- `fastapi` >= 0.110 — API framework (from ST-1)
- `pydantic` >= 2.6 — request/response models (from ST-1)
- `pytest` >= 8.0 — testing

### Existing Tables Needed
- `items` — item bank table (from F-69) with item_id PK
- `student_attempts` — response records (student_id, item_id, correct BOOLEAN) used to build response matrix

## 9. Test Fixtures (inline)

```python
# packages/python-api/tests/fixtures/irt_fixtures.py

import numpy as np

# 10 students x 5 items binary response matrix (small, for unit tests)
SMALL_RESPONSE_MATRIX = np.array([
    [1, 1, 0, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [1, 1, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0],
    [1, 1, 1, 0, 1],
    [1, 0, 1, 1, 0],
    [0, 1, 0, 0, 0],
])

SMALL_ITEM_IDS = [
    "item-001", "item-002", "item-003", "item-004", "item-005"
]

SMALL_STUDENT_IDS = [
    f"student-{i:03d}" for i in range(1, 11)
]

# Known 3PL parameters for validation (from psychometrics textbook examples)
KNOWN_PARAMS = [
    {"item_id": "item-001", "a": 1.5, "b": -1.0, "c": 0.2},
    {"item_id": "item-002", "a": 1.0, "b": 0.0, "c": 0.15},
    {"item_id": "item-003", "a": 0.8, "b": 0.5, "c": 0.25},
    {"item_id": "item-004", "a": 2.0, "b": -0.5, "c": 0.1},
    {"item_id": "item-005", "a": 1.2, "b": 1.0, "c": 0.2},
]

# Simulated large matrix for performance tests (generated at test time)
def generate_large_response_matrix(
    n_students: int = 500,
    n_items: int = 1000,
    seed: int = 42,
) -> np.ndarray:
    """Generate a realistic binary response matrix using known 3PL parameters."""
    rng = np.random.default_rng(seed)
    theta = rng.normal(0, 1, n_students)  # student abilities
    a = rng.uniform(0.5, 2.5, n_items)    # discrimination
    b = rng.normal(0, 1, n_items)          # difficulty
    c = rng.uniform(0.05, 0.3, n_items)   # guessing

    # 3PL probability: P(X=1|theta) = c + (1-c) / (1 + exp(-a*(theta - b)))
    theta_matrix = theta[:, np.newaxis]  # (n_students, 1)
    prob = c + (1 - c) / (1 + np.exp(-a * (theta_matrix - b)))
    responses = (rng.random((n_students, n_items)) < prob).astype(int)
    return responses

# Item with insufficient responses (below threshold)
INSUFFICIENT_ITEM = {
    "item_id": "item-low-001",
    "response_count": 42,
}

# Poorly fitting item (MNSQ outside 0.7-1.3)
MISFIT_ITEM_PARAMS = {
    "item_id": "item-misfit-001",
    "a": 0.3,
    "b": 2.5,
    "c": 0.4,
    "infit_mnsq": 1.45,
    "outfit_mnsq": 1.62,
    "is_flagged": True,
}

# Calibration request fixtures
VALID_CALIBRATION_REQUEST = {
    "min_responses": 100,
    "max_iterations": 100,
    "convergence_threshold": 0.001,
}

CUSTOM_CALIBRATION_REQUEST = {
    "item_ids": ["item-001", "item-002"],
    "min_responses": 50,
    "max_iterations": 200,
    "convergence_threshold": 0.0001,
}
```

## 10. API Test Spec (pytest -- PRIMARY)

**File:** `packages/python-api/tests/test_irt_routes.py`

```
describe POST /api/irt/calibrate
  - returns 200 with calibrated parameters for eligible items
  - returns correct calibration_run_id in response
  - skips items below min_responses threshold with reason
  - flags items with MNSQ outside 0.7-1.3
  - stores parameters in irt_item_parameters table
  - stores calibration run in irt_calibration_runs table
  - returns 400 for negative min_responses
  - returns 400 for convergence_threshold >= 1
  - returns 400 when no items meet minimum response threshold
  - returns 409 when calibration is already in progress
  - uses default config when body is empty
  - filters to specific item_ids when provided

describe GET /api/irt/parameters/:item_id
  - returns 200 with latest parameters for calibrated item
  - returns 404 for uncalibrated item
```

**File:** `packages/python-api/tests/test_irt_3pl.py`

```
describe IRT3PLEngine
  - converges on known parameters within tolerance
  - respects max_iterations limit
  - reports convergence_achieved=false when max iterations exceeded
  - computes standard errors for each parameter
  - handles all-correct response vectors gracefully
  - handles all-incorrect response vectors gracefully
  - constrains c parameter to [0, 0.35] range
  - constrains a parameter to [0.2, 3.0] range
```

**File:** `packages/python-api/tests/test_irt_calibration.py`

```
describe IrtCalibrationService
  - builds response matrix from student_attempts table
  - excludes items below min_responses from matrix
  - computes infit and outfit MNSQ per item
  - flags items with MNSQ outside 0.7-1.3
  - writes all parameters in single batch insert
  - updates calibration run status to "completed"
  - updates calibration run status to "failed" on error
  - 1000x500 matrix calibrates in < 60 seconds (performance)
```

**Total: ~30 tests** (14 route + 8 engine + 8 service)

## 11. E2E Test Spec (Playwright)

Not required. System-level batch operation with no user-facing UI. Not part of the 5 critical user journeys.

## 12. Acceptance Criteria

1. 3PL model estimates difficulty (b), discrimination (a), and guessing (c) for each item
2. Calibration uses MMLE with EM algorithm
3. Input is item response matrix (student x item binary matrix) built from `student_attempts`
4. Output includes calibrated parameters per item with standard errors (a_se, b_se, c_se)
5. Items with fewer than 100 responses are skipped with reason
6. Convergence: parameter change < 0.001 or max 100 iterations (configurable)
7. Infit and outfit MNSQ computed per item
8. Items with MNSQ outside 0.7-1.3 are flagged (`is_flagged = true`)
9. `POST /api/irt/calibrate` endpoint triggers batch calibration
10. Parameters stored in Supabase `irt_item_parameters` with timestamps
11. Calibration run audit trail stored in `irt_calibration_runs`
12. 1000 items x 500 students matrix calibrates in < 60 seconds
13. All 30 tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| IRT 3PL model specification | ARCHITECTURE_v10 SS 13.1 — Adaptive Testing Engine |
| MMLE+EM calibration method | ARCHITECTURE_v10 SS 13.2 — Parameter Estimation |
| Item fit statistics (MNSQ) | ARCHITECTURE_v10 SS 13.1 — Item Quality Metrics |
| Python API tier | ROADMAP_v2_3 SS Sprint 31 — Tier 2 Python services |
| student_attempts table | SUPABASE_DDL_v1 SS Student Performance Tables |
| Performance target 60s | PRODUCT_BRIEF SS Marcus Williams — "real-time adaptive" |
| Item parameter storage | NODE_REGISTRY_v1 SS Layer 5 — ConceptMastery adjacency |
| Minimum 100 responses | ARCHITECTURE_v10 SS 13.2 — Statistical reliability threshold |

## 14. Environment Prerequisites

- **Python:** 3.11+ with numpy, scipy, fastapi, pydantic, supabase-py
- **Supabase:** Project running, `items` and `student_attempts` tables populated (from F-69)
- **FastAPI:** Scaffold running from STORY-ST-1 on port 8000
- **No Neo4j needed** for this story
- **No Express needed** — this is a standalone Python service endpoint

## 15. Figma Make Prototype

**Not applicable.** Backend-only Python service with no UI components.
