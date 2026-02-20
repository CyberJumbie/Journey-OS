# STORY-ST-3 Brief: BKT Mastery Estimation

## 0. Lane & Priority

```yaml
story_id: STORY-ST-3
old_id: S-ST-40-3
lane: student
lane_priority: 4
within_lane_order: 3
sprint: 31
size: L
depends_on:
  - STORY-ST-1 (student) — FastAPI Service Scaffold
blocks:
  - STORY-ST-10 — Adaptive Item Selection
  - STORY-AD-1 — GNN Risk Model
  - STORY-AD-2 — Root-Cause Tracing
  - STORY-AD-3 — Trajectory Analysis
personas_served: [student, advisor, system]
epic: E-40 (BKT & IRT Engine)
feature: F-19 (Adaptive Practice)
user_flow: UF-32 (Adaptive Practice Session)
```

## 1. Summary

Implement **Bayesian Knowledge Tracing (BKT)** as the core mastery estimation engine in the Python FastAPI service. BKT is a Hidden Markov Model that tracks per-concept mastery probability for each student by processing sequential response data. After each student response, the system updates P(L_n) — the probability the student has learned the concept — using the forward algorithm with four parameters per concept: P(L0) initial knowledge, P(T) transition/learning rate, P(G) guess probability, and P(S) slip probability.

Key constraints:
- **DualWriteService pattern** — Supabase first (mastery_estimates), Neo4j second (HAS_MASTERY relationship)
- **Performance** — Single mastery update in < 100ms
- **Mastery threshold** — P(L) >= 0.95 considered mastered
- **Batch fitting** — EM algorithm for parameter estimation from historical data
- **This is THE gate** for all 9 advisor lane stories (AD-1 through AD-9)

## 2. Task Breakdown

1. **Types/models** — Create `BKTParams`, `MasteryState`, `StudentResponse`, `MasteryUpdateResult` Pydantic models in `packages/python-api/src/models/bkt.py`
2. **BKT engine** — Pure computation class `BKTEngine` in `packages/python-api/src/services/bkt/engine.py` implementing forward algorithm
3. **Parameter store** — `BKTParameterService` in `packages/python-api/src/services/bkt/parameter_service.py` loading/caching per-concept BKT parameters
4. **Mastery service** — `MasteryService` in `packages/python-api/src/services/bkt/mastery_service.py` orchestrating update flow with DualWrite
5. **Dual write service** — `DualWriteService` in `packages/python-api/src/services/dual_write.py` handling Supabase-first, Neo4j-second pattern
6. **EM batch fitting** — `BKTFitter` in `packages/python-api/src/services/bkt/fitter.py` implementing EM algorithm for parameter estimation
7. **Update endpoint** — `POST /api/bkt/update` in `packages/python-api/src/routes/bkt.py`
8. **Mastery query endpoint** — `GET /api/bkt/mastery/{student_id}` in `packages/python-api/src/routes/bkt.py`
9. **Batch fit endpoint** — `POST /api/bkt/fit` in `packages/python-api/src/routes/bkt.py` (admin-only)
10. **Mastery history** — Store update log for trend analysis in `mastery_history` table
11. **pytest tests** — 28+ tests covering BKT math, service layer, endpoints, dual write

## 3. Data Model

```python
# packages/python-api/src/models/bkt.py

from pydantic import BaseModel, Field
from enum import StrEnum
from datetime import datetime


class MasteryTrend(StrEnum):
    IMPROVING = "improving"
    STABLE = "stable"
    DECLINING = "declining"


class BKTParams(BaseModel):
    """Four BKT parameters per concept.
    P(L0): prior probability of initial knowledge
    P(T):  probability of transitioning from unlearned to learned
    P(G):  probability of guessing correctly when not learned
    P(S):  probability of slipping (incorrect when learned)
    """
    concept_id: str
    p_l0: float = Field(default=0.1, ge=0.0, le=1.0, description="P(L0) — initial knowledge")
    p_t: float = Field(default=0.2, ge=0.0, le=1.0, description="P(T) — learning/transition rate")
    p_g: float = Field(default=0.25, ge=0.0, le=1.0, description="P(G) — guess probability")
    p_s: float = Field(default=0.1, ge=0.0, le=1.0, description="P(S) — slip probability")


class MasteryState(BaseModel):
    """Current mastery state for a student-concept pair."""
    student_id: str
    concept_id: str
    p_mastered: float = Field(ge=0.0, le=1.0, description="P(L_n) — current mastery probability")
    is_mastered: bool = Field(description="True if p_mastered >= 0.95")
    evidence_count: int = Field(ge=0, description="Number of responses processed")
    trend: MasteryTrend
    last_updated: datetime
    sync_status: str = Field(default="synced", description="'synced' | 'pending' | 'error'")


class StudentResponse(BaseModel):
    """A single student response to an assessment item."""
    student_id: str
    concept_id: str
    item_id: str
    correct: bool
    latency_ms: int = Field(ge=0, description="Response time in milliseconds")
    timestamp: datetime


class MasteryUpdateResult(BaseModel):
    """Result of processing a single student response through BKT."""
    student_id: str
    concept_id: str
    previous_p_mastered: float
    new_p_mastered: float
    is_mastered: bool
    delta: float = Field(description="Change in mastery: new - previous")
    evidence_count: int
    trend: MasteryTrend
    sync_status: str


class MasteryHistoryEntry(BaseModel):
    """Single entry in the mastery history log for trend analysis."""
    student_id: str
    concept_id: str
    p_mastered: float
    evidence_count: int
    response_correct: bool
    timestamp: datetime


class BatchFitRequest(BaseModel):
    """Request to fit BKT parameters from historical data."""
    concept_id: str
    max_iterations: int = Field(default=100, ge=1, le=1000)
    convergence_threshold: float = Field(default=0.001, ge=0.0001, le=0.1)


class BatchFitResult(BaseModel):
    """Result of EM parameter fitting."""
    concept_id: str
    params: BKTParams
    iterations: int
    log_likelihood: float
    converged: bool
    sample_size: int


class StudentMasterySummary(BaseModel):
    """All mastery states for a single student."""
    student_id: str
    total_concepts: int
    mastered_count: int
    states: list[MasteryState]
```

## 4. Database Schema

### Supabase Tables

```sql
-- Migration: create_bkt_mastery_tables

-- Per-concept mastery estimates (primary store)
CREATE TABLE IF NOT EXISTS mastery_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    concept_id TEXT NOT NULL,
    p_mastered DOUBLE PRECISION NOT NULL DEFAULT 0.1 CHECK (p_mastered >= 0.0 AND p_mastered <= 1.0),
    is_mastered BOOLEAN NOT NULL DEFAULT false,
    evidence_count INTEGER NOT NULL DEFAULT 0,
    trend TEXT NOT NULL DEFAULT 'stable' CHECK (trend IN ('improving', 'stable', 'declining')),
    sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, concept_id)
);

-- Student attempt records
CREATE TABLE IF NOT EXISTS student_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    concept_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    response TEXT,
    correct BOOLEAN NOT NULL,
    latency_ms INTEGER NOT NULL CHECK (latency_ms >= 0),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mastery history log for trend analysis
CREATE TABLE IF NOT EXISTS mastery_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    concept_id TEXT NOT NULL,
    p_mastered DOUBLE PRECISION NOT NULL,
    evidence_count INTEGER NOT NULL,
    response_correct BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BKT parameters per concept (fitted via EM)
CREATE TABLE IF NOT EXISTS bkt_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id TEXT NOT NULL UNIQUE,
    p_l0 DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    p_t DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    p_g DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    p_s DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    sample_size INTEGER NOT NULL DEFAULT 0,
    last_fitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mastery_estimates_student ON mastery_estimates(student_id);
CREATE INDEX IF NOT EXISTS idx_mastery_estimates_concept ON mastery_estimates(concept_id);
CREATE INDEX IF NOT EXISTS idx_mastery_estimates_student_concept ON mastery_estimates(student_id, concept_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_student ON student_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_concept ON student_attempts(concept_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_student_concept ON student_attempts(student_id, concept_id);
CREATE INDEX IF NOT EXISTS idx_mastery_history_student_concept ON mastery_history(student_id, concept_id);
CREATE INDEX IF NOT EXISTS idx_bkt_parameters_concept ON bkt_parameters(concept_id);
```

### Neo4j Schema

```cypher
// Student node (created on first mastery update)
// Label: Student
// Properties: id (UUID), supabase_auth_id (UUID), status ("active")
CREATE CONSTRAINT student_supabase_id IF NOT EXISTS
FOR (s:Student) REQUIRE s.supabase_auth_id IS UNIQUE;

// ConceptMastery node (one per student-concept pair)
// Label: ConceptMastery
// Properties: id (UUID), p_mastered (float), trend (string), evidence_count (int), last_updated (datetime)
CREATE CONSTRAINT concept_mastery_id IF NOT EXISTS
FOR (cm:ConceptMastery) REQUIRE cm.id IS UNIQUE;

// Relationships:
// (Student)-[:HAS_MASTERY]->(ConceptMastery)
// (ConceptMastery)-[:FOR_CONCEPT]->(SubConcept)

// Mastery update query:
MATCH (s:Student {supabase_auth_id: $studentId})
MERGE (cm:ConceptMastery {id: $masteryId})
SET cm.p_mastered = $pMastered,
    cm.trend = $trend,
    cm.evidence_count = $evidenceCount,
    cm.last_updated = datetime()
MERGE (s)-[:HAS_MASTERY]->(cm)
WITH cm
MATCH (sc:SubConcept {code: $conceptId})
MERGE (cm)-[:FOR_CONCEPT]->(sc)

// Mastery query for dashboard:
MATCH (s:Student {supabase_auth_id: $studentId})-[:HAS_MASTERY]->(cm:ConceptMastery)-[:FOR_CONCEPT]->(sc:SubConcept)-[:MAPS_TO]->(us:USMLE_System)
RETURN sc.code AS concept_id, sc.name AS concept_name,
       cm.p_mastered AS p_mastered, cm.evidence_count AS evidence_count,
       cm.trend AS trend, us.name AS system_name
ORDER BY cm.p_mastered ASC
```

## 5. API Contract

### POST /api/bkt/update (Auth: Student+)

Process a single student response and update mastery.

**Request Body:**
```json
{
  "student_id": "student-uuid-1",
  "concept_id": "usmle-topic-042",
  "item_id": "item-uuid-1",
  "correct": true,
  "latency_ms": 12340,
  "timestamp": "2026-02-19T10:05:30Z"
}
```

**Success Response (200):**
```json
{
  "data": {
    "student_id": "student-uuid-1",
    "concept_id": "usmle-topic-042",
    "previous_p_mastered": 0.72,
    "new_p_mastered": 0.81,
    "is_mastered": false,
    "delta": 0.09,
    "evidence_count": 15,
    "trend": "improving",
    "sync_status": "synced"
  },
  "error": null
}
```

### GET /api/bkt/mastery/{student_id} (Auth: Student+ or Advisor/Faculty for their students)

Retrieve all mastery states for a student.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `concept_id` | string | -- | Filter to a single concept |
| `min_mastery` | float | -- | Filter: P(L) >= threshold |
| `max_mastery` | float | -- | Filter: P(L) <= threshold |
| `limit` | int | 100 | Max results |
| `offset` | int | 0 | Pagination offset |

**Success Response (200):**
```json
{
  "data": {
    "student_id": "student-uuid-1",
    "total_concepts": 227,
    "mastered_count": 45,
    "states": [
      {
        "student_id": "student-uuid-1",
        "concept_id": "usmle-topic-042",
        "p_mastered": 0.81,
        "is_mastered": false,
        "evidence_count": 15,
        "trend": "improving",
        "last_updated": "2026-02-19T10:05:30Z",
        "sync_status": "synced"
      }
    ]
  },
  "error": null
}
```

### POST /api/bkt/fit (Auth: SuperAdmin only)

Batch fit BKT parameters for a concept using EM algorithm.

**Request Body:**
```json
{
  "concept_id": "usmle-topic-042",
  "max_iterations": 100,
  "convergence_threshold": 0.001
}
```

**Success Response (200):**
```json
{
  "data": {
    "concept_id": "usmle-topic-042",
    "params": {
      "concept_id": "usmle-topic-042",
      "p_l0": 0.12,
      "p_t": 0.18,
      "p_g": 0.22,
      "p_s": 0.08
    },
    "iterations": 47,
    "log_likelihood": -1234.56,
    "converged": true,
    "sample_size": 3420
  },
  "error": null
}
```

**Error Responses (all endpoints):**

| Status | Code | When |
|--------|------|------|
| 401 | `AUTHENTICATION_ERROR` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role insufficient |
| 404 | `NOT_FOUND` | Student or concept not found |
| 422 | `VALIDATION_ERROR` | Invalid request body |
| 500 | `INTERNAL_ERROR` | Unexpected error |
| 503 | `SYNC_ERROR` | Neo4j write failed (Supabase succeeded, sync_status = 'error') |

## 6. Frontend Spec

N/A — Backend only (Python service). The student dashboard (STORY-ST-2) will consume these endpoints when swapping mock data for live BKT data.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/python-api/src/models/bkt.py` | Models | Create |
| 2 | `packages/python-api/src/services/__init__.py` | Package | Create |
| 3 | `packages/python-api/src/services/bkt/__init__.py` | Package | Create |
| 4 | `packages/python-api/src/services/bkt/engine.py` | Service | Create |
| 5 | `packages/python-api/src/services/bkt/parameter_service.py` | Service | Create |
| 6 | `packages/python-api/src/services/dual_write.py` | Service | Create |
| 7 | `packages/python-api/src/services/bkt/mastery_service.py` | Service | Create |
| 8 | `packages/python-api/src/services/bkt/fitter.py` | Service | Create |
| 9 | `packages/python-api/src/routes/bkt.py` | Routes | Create |
| 10 | `packages/python-api/src/main.py` | App | Edit (register BKT router) |
| 11 | Supabase migration via MCP (mastery tables) | Database | Apply |
| 12 | `packages/python-api/tests/test_bkt_engine.py` | Tests | Create |
| 13 | `packages/python-api/tests/test_mastery_service.py` | Tests | Create |
| 14 | `packages/python-api/tests/test_dual_write.py` | Tests | Create |
| 15 | `packages/python-api/tests/test_bkt_endpoints.py` | Tests | Create |
| 16 | `packages/python-api/tests/test_bkt_fitter.py` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-ST-1 | student | **NOT STARTED** | FastAPI scaffold with auth, Neo4j, Supabase clients |
| STORY-U-6 | universal | **DONE** | JWT format and RBAC pattern |
| STORY-U-7 | universal | **DONE** | USMLE seed data (concepts to track mastery for) |

### Pip Packages (already in ST-1 scaffold)
- `fastapi` — Web framework
- `pydantic` — Data validation
- `neo4j` — Neo4j async driver
- `supabase` — Supabase client
- `structlog` — Structured logging

### Additional Pip Packages
- `numpy>=2.2.0` — Numerical computation for BKT forward algorithm and EM fitting
- `scipy>=1.15.0` — Optimization utilities for EM convergence (optional, for advanced fitting)

### Existing Files Needed (from ST-1 scaffold)
- `packages/python-api/src/config/settings.py` — Environment configuration
- `packages/python-api/src/config/neo4j.py` — Neo4j async driver
- `packages/python-api/src/config/supabase.py` — Supabase client
- `packages/python-api/src/middleware/auth.py` — JWT authentication
- `packages/python-api/src/errors/base.py` — Custom error classes
- `packages/python-api/src/models/auth.py` — AuthRole, AuthTokenPayload
- `packages/python-api/tests/conftest.py` — Auth fixtures, mock clients

## 9. Test Fixtures (inline)

```python
# packages/python-api/tests/fixtures/bkt_fixtures.py

from datetime import datetime, timezone

# Default BKT parameters
DEFAULT_BKT_PARAMS = {
    "concept_id": "usmle-topic-042",
    "p_l0": 0.1,
    "p_t": 0.2,
    "p_g": 0.25,
    "p_s": 0.1,
}

# Custom-fitted BKT parameters
FITTED_BKT_PARAMS = {
    "concept_id": "usmle-topic-042",
    "p_l0": 0.12,
    "p_t": 0.18,
    "p_g": 0.22,
    "p_s": 0.08,
}

# Student response — correct
CORRECT_RESPONSE = {
    "student_id": "student-uuid-1",
    "concept_id": "usmle-topic-042",
    "item_id": "item-uuid-1",
    "correct": True,
    "latency_ms": 12340,
    "timestamp": "2026-02-19T10:05:30Z",
}

# Student response — incorrect
INCORRECT_RESPONSE = {
    **CORRECT_RESPONSE,
    "item_id": "item-uuid-2",
    "correct": False,
    "latency_ms": 8200,
    "timestamp": "2026-02-19T10:06:15Z",
}

# Sequence of responses for testing mastery progression
RESPONSE_SEQUENCE = [
    {"correct": True, "expected_p_mastered_approx": 0.19},   # After 1 correct
    {"correct": True, "expected_p_mastered_approx": 0.32},   # After 2 correct
    {"correct": False, "expected_p_mastered_approx": 0.30},  # After 1 incorrect
    {"correct": True, "expected_p_mastered_approx": 0.43},   # After 3 correct
    {"correct": True, "expected_p_mastered_approx": 0.55},   # After 4 correct
    {"correct": True, "expected_p_mastered_approx": 0.66},   # After 5 correct
    {"correct": True, "expected_p_mastered_approx": 0.75},   # After 6 correct
    {"correct": True, "expected_p_mastered_approx": 0.82},   # After 7 correct
    {"correct": True, "expected_p_mastered_approx": 0.88},   # After 8 correct
    {"correct": True, "expected_p_mastered_approx": 0.92},   # After 9 correct
    {"correct": True, "expected_p_mastered_approx": 0.95},   # After 10 correct — MASTERED
]

# Existing mastery state (mid-learning)
EXISTING_MASTERY_STATE = {
    "student_id": "student-uuid-1",
    "concept_id": "usmle-topic-042",
    "p_mastered": 0.72,
    "is_mastered": False,
    "evidence_count": 14,
    "trend": "improving",
    "last_updated": "2026-02-19T09:00:00Z",
    "sync_status": "synced",
}

# Empty mastery (new student-concept pair)
NEW_MASTERY_STATE = {
    "student_id": "student-uuid-1",
    "concept_id": "usmle-topic-100",
    "p_mastered": 0.1,
    "is_mastered": False,
    "evidence_count": 0,
    "trend": "stable",
    "last_updated": None,
    "sync_status": "synced",
}

# Historical response data for EM fitting
EM_FITTING_DATA = [
    # Student A — 10 responses on concept-042
    {"student_id": "student-a", "correct": True},
    {"student_id": "student-a", "correct": True},
    {"student_id": "student-a", "correct": False},
    {"student_id": "student-a", "correct": True},
    {"student_id": "student-a", "correct": True},
    {"student_id": "student-a", "correct": True},
    {"student_id": "student-a", "correct": True},
    {"student_id": "student-a", "correct": True},
    {"student_id": "student-a", "correct": True},
    {"student_id": "student-a", "correct": True},
    # Student B — 8 responses on concept-042
    {"student_id": "student-b", "correct": False},
    {"student_id": "student-b", "correct": False},
    {"student_id": "student-b", "correct": True},
    {"student_id": "student-b", "correct": False},
    {"student_id": "student-b", "correct": True},
    {"student_id": "student-b", "correct": True},
    {"student_id": "student-b", "correct": True},
    {"student_id": "student-b", "correct": True},
]

# Mock Supabase mastery_estimates row
SUPABASE_MASTERY_ROW = {
    "id": "mastery-uuid-1",
    "student_id": "student-uuid-1",
    "concept_id": "usmle-topic-042",
    "p_mastered": 0.72,
    "is_mastered": False,
    "evidence_count": 14,
    "trend": "improving",
    "sync_status": "synced",
    "created_at": "2026-02-01T00:00:00Z",
    "updated_at": "2026-02-19T09:00:00Z",
}
```

## 10. API Test Spec (pytest)

**File:** `packages/python-api/tests/test_bkt_engine.py`

```
describe "BKTEngine"
    test_update_mastery_correct_response_increases_p_mastered
    test_update_mastery_incorrect_response_may_decrease_p_mastered
    test_initial_mastery_uses_p_l0_from_params
    test_mastery_converges_to_1_with_consecutive_correct_responses
    test_mastery_converges_to_0_with_consecutive_incorrect_responses
    test_p_mastered_stays_in_0_1_range
    test_mastered_threshold_at_0_95
    test_guess_parameter_affects_correct_response_update
    test_slip_parameter_affects_incorrect_response_update
    test_custom_parameters_produce_different_trajectories
    test_forward_algorithm_matches_known_hand_calculation
```

**File:** `packages/python-api/tests/test_mastery_service.py`

```
describe "MasteryService"
    test_update_creates_new_mastery_state_for_new_concept
    test_update_modifies_existing_mastery_state
    test_update_writes_to_supabase_first
    test_update_writes_to_neo4j_second
    test_update_records_attempt_in_student_attempts
    test_update_logs_history_entry
    test_get_mastery_returns_all_states_for_student
    test_get_mastery_filters_by_concept_id
    test_get_mastery_filters_by_min_max_mastery
    test_trend_calculation_improving_when_last_3_increasing
    test_trend_calculation_declining_when_last_3_decreasing
    test_trend_calculation_stable_otherwise
```

**File:** `packages/python-api/tests/test_dual_write.py`

```
describe "DualWriteService"
    test_writes_to_supabase_first_then_neo4j
    test_sets_sync_status_synced_on_success
    test_sets_sync_status_error_when_neo4j_fails
    test_supabase_failure_raises_error_without_neo4j_write
    test_neo4j_failure_does_not_rollback_supabase
```

**File:** `packages/python-api/tests/test_bkt_endpoints.py`

```
describe "BKT Endpoints"
    describe "POST /api/bkt/update"
        test_authenticated_student_can_update_mastery
        test_returns_mastery_update_result
        test_rejects_unauthenticated_request
        test_validates_request_body
        test_update_completes_in_under_100ms
    describe "GET /api/bkt/mastery/{student_id}"
        test_returns_all_mastery_states_for_student
        test_filters_by_concept_id
        test_returns_404_for_unknown_student
        test_students_can_only_view_own_mastery
    describe "POST /api/bkt/fit"
        test_superadmin_can_trigger_batch_fit
        test_non_superadmin_rejected_with_403
        test_returns_fitted_parameters_and_convergence_info
```

**File:** `packages/python-api/tests/test_bkt_fitter.py`

```
describe "BKTFitter (EM Algorithm)"
    test_em_converges_with_sufficient_data
    test_em_returns_reasonable_parameters
    test_em_respects_max_iterations
    test_em_respects_convergence_threshold
    test_em_handles_single_student_data
    test_em_handles_all_correct_responses
    test_em_handles_all_incorrect_responses
```

**Total: ~42 tests**

## 11. E2E Test Spec

Not required for this story. BKT is a backend computation engine — its effects are validated through the student dashboard E2E test (STORY-ST-2) when mock data is swapped for live BKT data.

## 12. Acceptance Criteria

1. BKT model uses 4 parameters per concept: P(L0)=0.1, P(T)=0.2, P(G)=0.25, P(S)=0.1 as defaults
2. Real-time mastery update after each student response via `POST /api/bkt/update`
3. Mastery threshold: P(L) >= 0.95 is considered mastered (`is_mastered = true`)
4. Per-concept mastery state stored in Supabase `mastery_estimates` table
5. Neo4j updated with `(Student)-[:HAS_MASTERY {p_mastered}]->(ConceptMastery)-[:FOR_CONCEPT]->(SubConcept)`
6. DualWriteService pattern: Supabase written first, Neo4j second, `sync_status` tracked
7. Batch parameter fitting via EM algorithm at `POST /api/bkt/fit` (SuperAdmin only)
8. `GET /api/bkt/mastery/{student_id}` returns all mastery states with filtering
9. Single mastery update completes in < 100ms
10. Mastery history logged in `mastery_history` table for trend analysis
11. Trend calculated from last 3 updates: improving if increasing, declining if decreasing, stable otherwise
12. All 42 pytest tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| BKT as Hidden Markov Model | ARCHITECTURE_v10 SS 10.3: Adaptive Practice |
| 4 BKT parameters (P(L0), P(T), P(G), P(S)) | ARCHITECTURE_v10 SS 10.3: BKT specification |
| Default parameters P(L0)=0.1, P(T)=0.2, P(G)=0.25, P(S)=0.1 | NODE_REGISTRY_v1 SS Layer 5: Student mastery |
| Mastery threshold 0.95 | ARCHITECTURE_v10 SS 10.3: Mastery criteria |
| DualWriteService pattern | CLAUDE.md SS Database Rules |
| Student-ConceptMastery-SubConcept graph | NODE_REGISTRY_v1 SS Layer 5: Student mastery nodes |
| mastery_estimates, student_attempts tables | SUPABASE_DDL_v1 SS Student tables |
| EM algorithm for parameter fitting | ARCHITECTURE_v10 SS 10.3: Parameter estimation |
| Gate for advisor lane (AD-1/2/3) | ROADMAP_v2_3 SS Sprint 31-32 dependencies |
| Performance < 100ms per update | ARCHITECTURE_v10 SS 10.3: Performance requirements |

## 14. Environment Prerequisites

- **STORY-ST-1 scaffold** completed — FastAPI app running on port 8000
- **Supabase** running with migration applied (mastery_estimates, student_attempts, mastery_history, bkt_parameters tables)
- **Neo4j** running with Student/ConceptMastery/SubConcept constraints created
- **USMLE seed data** loaded (STORY-U-7) — SubConcept nodes exist for FOR_CONCEPT relationships
- **Python 3.11+** with numpy and scipy installed
- **Environment variables:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`

## 15. Figma Make Prototype

N/A — Backend only.
