# STORY-ST-10 Brief: Adaptive Item Selection

## 0. Lane & Priority

```yaml
story_id: STORY-ST-10
old_id: S-ST-40-4
lane: student
lane_priority: 4
within_lane_order: 10
sprint: 31
size: M
depends_on:
  - STORY-ST-1 (student) — FastAPI Setup
  - STORY-ST-3 (student) — BKT Engine
  - STORY-ST-4 (student) — IRT Engine
blocks:
  - STORY-ST-12 — Practice Launcher
personas_served: [student]
epic: E-40 (BKT & IRT Engine)
feature: F-19 (Adaptive Practice)
user_flow: UF-31 (Student Adaptive Practice)
```

## 1. Summary

Build the **adaptive item selection engine** in the Python API service (`packages/python-api`) that selects the next practice item for a student by targeting their weakest concepts while respecting prerequisite chains. The algorithm combines **BKT mastery estimates** (weakest-concept-first), **Neo4j prerequisite graph traversal** (prerequisite awareness), and **IRT Fisher information maximization** (optimal difficulty within a concept). Includes exposure control (no repeat within 20 items) and concept diversity rotation.

Key constraints:
- **Python FastAPI** service — lives in `packages/python-api`
- **Neo4j prerequisite traversal** — `(Concept)-[:PREREQUISITE_OF]->(Concept)` up to 3 hops
- **Fisher information** — `I(theta) = a^2 * P * Q` where `P = 1 / (1 + exp(-a * (theta - b)))`, `Q = 1 - P`
- **Performance** — < 200ms including Neo4j round-trip
- **Fallback** — random selection if all concepts mastered or item pool exhausted

## 2. Task Breakdown

1. **Types** — Create `AdaptiveSelectionRequest`, `AdaptiveSelectionResponse`, `ItemCandidate`, `SelectionRationale` Pydantic models in `packages/python-api/app/models/adaptive.py`
2. **Prerequisite Service** — `PrerequisiteService` in `packages/python-api/app/services/prerequisite_service.py` — Neo4j graph traversal for prerequisite chains
3. **Fisher Information Calculator** — `FisherCalculator` in `packages/python-api/app/services/fisher_calculator.py` — IRT-based optimal item selection within a concept
4. **Item Selection Service** — `AdaptiveItemSelector` in `packages/python-api/app/services/item_selector.py` — orchestrates weakest-concept, prerequisite awareness, exposure control, diversity rotation
5. **API Endpoint** — `GET /api/adaptive/next-item/{session_id}` in `packages/python-api/app/routes/adaptive.py`
6. **Repository** — `ItemPoolRepository` in `packages/python-api/app/repositories/item_pool_repository.py` — queries Supabase `item_parameters` and `student_attempts` tables
7. **Mastery Repository** — `MasteryRepository` in `packages/python-api/app/repositories/mastery_repository.py` — queries Supabase `mastery_estimates` table
8. **API tests** — 18 tests covering selection logic, prerequisite awareness, Fisher info, exposure control, fallback

## 3. Data Model

```python
# packages/python-api/app/models/adaptive.py

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class SelectionStrategy(str, Enum):
    WEAKEST_CONCEPT = "weakest_concept"
    PREREQUISITE_PRIORITY = "prerequisite_priority"
    DIVERSITY_ROTATION = "diversity_rotation"
    FALLBACK_RANDOM = "fallback_random"


class ItemCandidate(BaseModel):
    """An item from the item pool with IRT parameters."""
    item_id: str
    concept_id: str
    concept_name: str
    discrimination: float = Field(alias="a", description="IRT discrimination parameter")
    difficulty: float = Field(alias="b", description="IRT difficulty parameter")
    guessing: float = Field(alias="c", default=0.25, description="IRT guessing parameter")


class SelectionRationale(BaseModel):
    """Explains why the selected item was chosen."""
    strategy: SelectionStrategy
    concept_mastery: float = Field(ge=0.0, le=1.0, description="BKT P(L) for selected concept")
    fisher_information: float = Field(ge=0.0, description="I(theta) for selected item")
    prerequisite_unmastered: Optional[str] = Field(
        default=None,
        description="If set, the prerequisite concept that forced prioritization",
    )
    concepts_considered: int = Field(ge=1, description="Number of weak concepts evaluated")
    items_evaluated: int = Field(ge=1, description="Number of candidate items scored")


class AdaptiveSelectionRequest(BaseModel):
    """Internal request context built from session_id lookup."""
    session_id: str
    student_id: str
    scope_concept_ids: list[str] = Field(description="Concept IDs in scope for the session")
    recent_item_ids: list[str] = Field(
        default_factory=list,
        max_length=20,
        description="Last 20 items shown (exposure control)",
    )
    concepts_seen_order: list[str] = Field(
        default_factory=list,
        description="Order in which concepts were last practiced (diversity rotation)",
    )


class AdaptiveSelectionResponse(BaseModel):
    """Response returned by GET /api/adaptive/next-item/{session_id}."""
    item_id: str
    concept_id: str
    expected_difficulty: float = Field(description="Item difficulty parameter b")
    rationale: SelectionRationale


class ConceptMasteryRecord(BaseModel):
    """BKT mastery estimate for a student-concept pair."""
    concept_id: str
    concept_name: str
    p_mastery: float = Field(ge=0.0, le=1.0, description="P(L) from BKT")
    mastery_threshold: float = Field(default=0.85, description="Threshold for 'mastered'")

    @property
    def is_mastered(self) -> bool:
        return self.p_mastery >= self.mastery_threshold


class PrerequisiteChain(BaseModel):
    """A chain of prerequisite concepts from Neo4j traversal."""
    target_concept_id: str
    prerequisites: list[str] = Field(description="Ordered list: deepest prerequisite first")
    unmastered_prerequisites: list[str] = Field(
        default_factory=list,
        description="Subset of prerequisites where P(L) < threshold",
    )
```

```typescript
// packages/types/src/student/adaptive.types.ts
// TypeScript mirror for Express gateway (if proxying/validating)

export interface AdaptiveNextItemResponse {
  readonly item_id: string;
  readonly concept_id: string;
  readonly expected_difficulty: number;
  readonly rationale: {
    readonly strategy: "weakest_concept" | "prerequisite_priority" | "diversity_rotation" | "fallback_random";
    readonly concept_mastery: number;
    readonly fisher_information: number;
    readonly prerequisite_unmastered: string | null;
    readonly concepts_considered: number;
    readonly items_evaluated: number;
  };
}
```

## 4. Database Schema

**Supabase tables (already exist from ST-3/ST-4 dependencies):**

```sql
-- mastery_estimates (from ST-3: BKT Engine)
-- Used read-only by this story
CREATE TABLE IF NOT EXISTS mastery_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id),
  concept_id TEXT NOT NULL,
  concept_name TEXT NOT NULL,
  p_mastery DOUBLE PRECISION NOT NULL DEFAULT 0.1,
  p_transit DOUBLE PRECISION NOT NULL DEFAULT 0.1,
  p_slip DOUBLE PRECISION NOT NULL DEFAULT 0.1,
  p_guess DOUBLE PRECISION NOT NULL DEFAULT 0.25,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, concept_id)
);

-- item_parameters (from ST-4: IRT Engine)
-- Used read-only by this story
CREATE TABLE IF NOT EXISTS item_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id TEXT NOT NULL UNIQUE,
  concept_id TEXT NOT NULL,
  discrimination DOUBLE PRECISION NOT NULL DEFAULT 1.0,  -- a parameter
  difficulty DOUBLE PRECISION NOT NULL DEFAULT 0.0,       -- b parameter
  guessing DOUBLE PRECISION NOT NULL DEFAULT 0.25,        -- c parameter
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- student_attempts (from ST-3: BKT Engine)
-- Used read-only for recent item exposure check
CREATE TABLE IF NOT EXISTS student_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id),
  session_id UUID NOT NULL,
  item_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- practice_sessions (from ST-5: Session History)
-- Used read-only for session context lookup
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id),
  scope_concept_ids TEXT[] NOT NULL,
  question_count INTEGER NOT NULL,
  time_mode TEXT NOT NULL CHECK (time_mode IN ('timed', 'untimed')),
  timer_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**New index for exposure control query performance:**

```sql
-- Migration: add_student_attempts_session_index
CREATE INDEX IF NOT EXISTS idx_student_attempts_session_recent
  ON student_attempts(session_id, created_at DESC);
```

**Neo4j (existing from STORY-U-7 seed + Layer 5 schema):**

```cypher
// Prerequisite relationship between concepts
// (Concept)-[:PREREQUISITE_OF]->(Concept)
// Query: find all prerequisites up to 3 hops for a target concept

MATCH path = (prereq:Concept)-[:PREREQUISITE_OF*1..3]->(target:Concept)
WHERE target.id = $conceptId
RETURN prereq.id AS prerequisite_id,
       prereq.name AS prerequisite_name,
       length(path) AS depth
ORDER BY depth DESC

// Batch query: prerequisites for multiple concepts
UNWIND $conceptIds AS cid
MATCH path = (prereq:Concept)-[:PREREQUISITE_OF*1..3]->(target:Concept {id: cid})
RETURN target.id AS target_concept_id,
       collect({
         prerequisite_id: prereq.id,
         prerequisite_name: prereq.name,
         depth: length(path)
       }) AS prerequisites
```

## 5. API Contract

### GET /api/adaptive/next-item/{session_id} (Auth: Student)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `session_id` | UUID | Active practice session ID |

**Headers:**
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer {jwt}` | Yes |

**Success Response (200):**
```json
{
  "item_id": "item-cardio-042",
  "concept_id": "concept-cardiac-output",
  "expected_difficulty": 0.45,
  "rationale": {
    "strategy": "prerequisite_priority",
    "concept_mastery": 0.32,
    "fisher_information": 1.87,
    "prerequisite_unmastered": "concept-starling-law",
    "concepts_considered": 5,
    "items_evaluated": 12
  }
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Student does not own this session |
| 404 | `SESSION_NOT_FOUND` | Session ID does not exist |
| 409 | `SESSION_COMPLETED` | Session is already completed |
| 422 | `POOL_EXHAUSTED` | No items remain after exposure filtering (triggers fallback first) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

**Algorithm (pseudocode):**
```
1. Load session context (scope, recent items, concept order)
2. Fetch mastery estimates for all in-scope concepts
3. Filter to unmastered concepts (P(L) < 0.85)
4. If all mastered → fallback random selection
5. Sort unmastered by P(L) ascending (weakest first)
6. For top-K weakest concepts (K=5):
   a. Query Neo4j for prerequisite chains
   b. If any prerequisite is unmastered, prioritize it instead
7. Apply diversity rotation: skip concepts practiced in last 3 items
8. For selected concept, fetch item pool
9. Exclude recent 20 items (exposure control)
10. Score remaining items by Fisher information: I(theta) = a^2 * P * Q
11. Select item with maximum Fisher information
12. If no items remain → fallback random from full pool
13. Return item + rationale
```

## 6. Frontend Spec

N/A — This is a Python API backend-only story. The Practice Launcher (ST-12) will consume this endpoint.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/student/adaptive.types.ts` | Types | Create |
| 2 | `packages/types/src/student/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add student export) |
| 4 | `packages/python-api/app/models/adaptive.py` | Models | Create |
| 5 | `packages/python-api/app/repositories/mastery_repository.py` | Repository | Create |
| 6 | `packages/python-api/app/repositories/item_pool_repository.py` | Repository | Create |
| 7 | `packages/python-api/app/services/prerequisite_service.py` | Service | Create |
| 8 | `packages/python-api/app/services/fisher_calculator.py` | Service | Create |
| 9 | `packages/python-api/app/services/item_selector.py` | Service | Create |
| 10 | `packages/python-api/app/routes/adaptive.py` | Controller | Create |
| 11 | `packages/python-api/app/main.py` | Routes | Edit (register adaptive router) |
| 12 | Supabase migration via MCP (index) | Database | Apply |
| 13 | `packages/python-api/tests/test_fisher_calculator.py` | Tests | Create |
| 14 | `packages/python-api/tests/test_prerequisite_service.py` | Tests | Create |
| 15 | `packages/python-api/tests/test_item_selector.py` | Tests | Create |
| 16 | `packages/python-api/tests/test_adaptive_route.py` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-ST-1 | student | Not started | FastAPI service scaffold, Supabase + Neo4j clients |
| STORY-ST-3 | student | Not started | BKT engine produces `mastery_estimates` table |
| STORY-ST-4 | student | Not started | IRT engine produces `item_parameters` table |

### Python Packages
- `fastapi` — API framework
- `neo4j` — Neo4j Python driver (async)
- `supabase` — Supabase Python client (or `httpx` + REST)
- `pydantic>=2.0` — Data validation
- `numpy` — Fisher information calculation
- `pytest` + `pytest-asyncio` — Testing

### Existing Files Needed
- `packages/python-api/app/config/supabase_client.py` — from ST-1
- `packages/python-api/app/config/neo4j_client.py` — from ST-1
- `packages/python-api/app/middleware/auth.py` — JWT validation from ST-1

## 9. Test Fixtures

```python
# packages/python-api/tests/fixtures/adaptive_fixtures.py

import pytest
from app.models.adaptive import (
    ItemCandidate,
    ConceptMasteryRecord,
    PrerequisiteChain,
)

# --- Student & Session ---

STUDENT_ID = "student-uuid-001"
SESSION_ID = "session-uuid-001"
SCOPE_CONCEPT_IDS = [
    "concept-cardiac-output",
    "concept-starling-law",
    "concept-blood-pressure",
    "concept-renal-perfusion",
    "concept-acid-base",
]

# --- Mastery Estimates ---

MASTERY_RECORDS = [
    ConceptMasteryRecord(
        concept_id="concept-cardiac-output",
        concept_name="Cardiac Output",
        p_mastery=0.32,
    ),
    ConceptMasteryRecord(
        concept_id="concept-starling-law",
        concept_name="Frank-Starling Law",
        p_mastery=0.18,  # Weakest — prerequisite of cardiac-output
    ),
    ConceptMasteryRecord(
        concept_id="concept-blood-pressure",
        concept_name="Blood Pressure Regulation",
        p_mastery=0.65,
    ),
    ConceptMasteryRecord(
        concept_id="concept-renal-perfusion",
        concept_name="Renal Perfusion",
        p_mastery=0.88,  # Mastered (above 0.85)
    ),
    ConceptMasteryRecord(
        concept_id="concept-acid-base",
        concept_name="Acid-Base Balance",
        p_mastery=0.45,
    ),
]

ALL_MASTERED_RECORDS = [
    ConceptMasteryRecord(
        concept_id=cid,
        concept_name=f"Concept {cid}",
        p_mastery=0.92,
    )
    for cid in SCOPE_CONCEPT_IDS
]

# --- Prerequisite Chains ---

PREREQUISITE_CHAIN_CARDIAC = PrerequisiteChain(
    target_concept_id="concept-cardiac-output",
    prerequisites=["concept-starling-law"],
    unmastered_prerequisites=["concept-starling-law"],
)

PREREQUISITE_CHAIN_RENAL = PrerequisiteChain(
    target_concept_id="concept-renal-perfusion",
    prerequisites=["concept-blood-pressure", "concept-cardiac-output"],
    unmastered_prerequisites=["concept-blood-pressure", "concept-cardiac-output"],
)

PREREQUISITE_CHAIN_EMPTY = PrerequisiteChain(
    target_concept_id="concept-acid-base",
    prerequisites=[],
    unmastered_prerequisites=[],
)

# --- Item Pool ---

ITEM_POOL_STARLING = [
    ItemCandidate(
        item_id="item-starling-001",
        concept_id="concept-starling-law",
        a=1.5,
        b=-0.3,
        c=0.25,
    ),
    ItemCandidate(
        item_id="item-starling-002",
        concept_id="concept-starling-law",
        a=2.1,
        b=0.1,
        c=0.20,
    ),
    ItemCandidate(
        item_id="item-starling-003",
        concept_id="concept-starling-law",
        a=0.8,
        b=0.5,
        c=0.25,
    ),
]

ITEM_POOL_CARDIAC = [
    ItemCandidate(
        item_id="item-cardio-041",
        concept_id="concept-cardiac-output",
        a=1.8,
        b=0.45,
        c=0.25,
    ),
    ItemCandidate(
        item_id="item-cardio-042",
        concept_id="concept-cardiac-output",
        a=1.2,
        b=-0.1,
        c=0.20,
    ),
]

# --- Recent Items (exposure control) ---

RECENT_20_ITEMS = [f"item-recent-{i:03d}" for i in range(20)]
RECENT_5_ITEMS = [f"item-recent-{i:03d}" for i in range(5)]
```

## 10. API Test Spec (pytest — PRIMARY)

**File:** `packages/python-api/tests/test_item_selector.py`

```
describe AdaptiveItemSelector
  test selects item from weakest concept when no prerequisites
  test prioritizes unmastered prerequisite over dependent concept
  test respects deep prerequisite chains (3 hops)
  test skips mastered concepts (P(L) >= 0.85)
  test applies diversity rotation (skips last 3 concepts)
  test excludes recent 20 items (exposure control)
  test selects item with maximum Fisher information
  test falls back to random when all concepts mastered
  test falls back to random when item pool exhausted after exposure filter
  test handles empty scope (returns 422)

describe FisherCalculator
  test computes I(theta) = a^2 * P * Q correctly at theta=0
  test Fisher info maximized when theta near difficulty b
  test Fisher info near zero for extreme theta-difficulty mismatch
  test handles edge case a=0 (zero discrimination)

describe PrerequisiteService
  test returns prerequisite chain from Neo4j
  test returns empty chain when no prerequisites exist
  test limits traversal to 3 hops
  test batch-queries prerequisites for multiple concepts

describe GET /api/adaptive/next-item/{session_id}
  test returns 200 with item selection for valid session
  test returns 401 without auth token
  test returns 403 when student does not own session
  test returns 404 for nonexistent session
  test returns 409 for completed session
  test response time under 200ms (performance)
```

**Total: ~20 tests** (10 selector + 4 fisher + 4 prerequisite + 6 route = 24)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. The adaptive item selection is a backend-only API consumed by ST-12 (Practice Launcher). E2E coverage will be part of the full adaptive practice critical journey test.

## 12. Acceptance Criteria

1. `GET /api/adaptive/next-item/{session_id}` returns a valid item selection within 200ms
2. Weakest concept (lowest P(L)) is prioritized when no prerequisite conflicts
3. If a prerequisite concept is unmastered, the algorithm prioritizes the prerequisite instead
4. Neo4j prerequisite graph traversal respects 3-hop limit
5. Fisher information `I(theta) = a^2 * P * Q` is computed correctly and the highest-information item is selected
6. No item is repeated within the last 20 items shown (exposure control)
7. Concepts rotate across weak concepts to ensure diversity (skip last 3 practiced)
8. When all concepts are mastered (P(L) >= 0.85), fallback random selection is used
9. When item pool is exhausted after exposure filtering, fallback random from full pool is used
10. Response includes `item_id`, `concept_id`, `expected_difficulty`, and `rationale` explaining the selection strategy
11. 403 returned when student does not own the session
12. 404 returned for nonexistent session, 409 for completed session
13. All 24 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Adaptive item selection algorithm | ARCHITECTURE_v10 SS 10.3: Adaptive Practice |
| Fisher information formula | ARCHITECTURE_v10 SS 10.3: `I(theta) = a^2 * P * Q` |
| Prerequisite graph traversal | NODE_REGISTRY_v1 SS Layer 5: `(Concept)-[:PREREQUISITE_OF]->(Concept)` |
| API endpoint path | F-19 SS Adaptive Practice: `GET /api/adaptive/next-item/:sessionId` |
| Exposure control (20 items) | S-ST-40-4 SS Acceptance Criteria |
| BKT mastery estimates | ARCHITECTURE_v10 SS 10.2: BKT model P(L) |
| IRT 3PL parameters (a, b, c) | ARCHITECTURE_v10 SS 10.1: IRT model |
| Performance requirement < 200ms | S-ST-40-4 SS Acceptance Criteria |
| Practice sessions table | SUPABASE_DDL_v1 SS Practice module |

## 14. Environment Prerequisites

- **Python 3.11+** with FastAPI running (from ST-1)
- **Supabase:** `mastery_estimates`, `item_parameters`, `student_attempts`, `practice_sessions` tables exist (from ST-3/ST-4/ST-5)
- **Neo4j:** Running with `Concept` nodes and `PREREQUISITE_OF` relationships seeded
- **No Express changes needed** — this is a Python-only story
- **No Next.js changes needed** — backend only

## 15. Figma / Make Prototype

N/A — Backend-only story. No UI components.
