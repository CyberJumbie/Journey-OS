# STORY-AD-2: Root-Cause Tracing — BRIEF

## 0. Lane & Priority

```yaml
story_id: STORY-AD-2
old_id: S-AD-44-3
lane: advisor
lane_priority: 5
within_lane_order: 2
epic: E-44 (Risk Prediction Engine)
feature: F-21
sprint: 37
size: M
depends_on:
  - STORY-AD-1 (advisor) — GNN Risk Model (identifies struggling concepts)
  - STORY-ST-3 (student) — BKT Mastery Estimation (mastery data)
blocks:
  - STORY-AD-4 — Risk Flag Generation (root causes included in flags)
  - STORY-AD-7 — Intervention Recommendation Engine (recommendations based on root causes)
personas_served: [advisor]
```

## 1. Summary

Build a root-cause tracing algorithm that traverses the Neo4j prerequisite graph to identify unmastered prerequisite concepts underlying a student's struggles. Given a set of struggling concepts (identified by the GNN risk model), the tracer follows `PREREQUISITE_OF` chains up to 5 levels deep, filters by the student's mastery state, and returns an ordered list of root causes ranked by downstream impact. This enables advisors to recommend targeted remediation rather than generic "study more" advice.

**Parent epic:** E-44 (Risk Prediction Engine)
**Parent feature:** F-21
**User flows satisfied:** Advisor concept-level diagnostic, targeted remediation path
**Personas involved:** System (automated), Advisor (consumer of root causes)

**Product context:** From [PRODUCT_BRIEF §Fatima Al-Rashid]: "The system shows he's weak on 4 specific SubConcepts in Renal, all stemming from a gap in acid-base physiology. I send him targeted practice and a tutoring referral for that specific topic."

## 2. Task Breakdown

1. Define root cause types in `src/models/root_cause_types.py`
2. Implement prerequisite graph traversal algorithm in `src/algorithms/root_cause_tracer.py`
3. Implement root cause service with caching in `src/services/root_cause_service.py`
4. Create FastAPI route in `src/routes/root_cause.py`
5. Write algorithm tests in `tests/test_root_cause_tracer.py`
6. Write service tests in `tests/test_root_cause_service.py`

## 3. Data Model (inline, complete)

```python
# src/models/root_cause_types.py

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class RootCause(BaseModel):
    concept_id: str
    concept_name: str
    p_mastered: float = Field(ge=0.0, le=1.0)
    depth: int = Field(ge=1, le=5)
    impact_score: int  # count of downstream concepts blocked
    downstream_concepts: list[str]  # IDs of concepts blocked by this root cause

class PrerequisiteChainLink(BaseModel):
    """Single link in a prerequisite chain for visualization"""
    source_id: str
    source_name: str
    source_mastery: float
    target_id: str
    target_name: str
    target_mastery: float
    confidence: float  # PREREQUISITE_OF confidence

class RootCauseAnalysis(BaseModel):
    student_id: str
    struggling_concepts: list[str]
    root_causes: list[RootCause]  # ordered by impact_score desc
    chains: list[list[PrerequisiteChainLink]]  # for UI visualization
    computed_at: datetime
    cache_ttl_seconds: int = 3600  # 1 hour

class RootCauseRequest(BaseModel):
    max_depth: int = Field(default=5, ge=1, le=10)
    min_mastery_threshold: float = Field(default=0.5, ge=0.0, le=1.0)
```

**Neo4j source relationships** [NODE_REGISTRY §Layer 3]:
```
(SubConcept)-[:PREREQUISITE_OF {confidence, validated_by}]->(SubConcept)
```

**Student mastery join** [NODE_REGISTRY §Layer 5]:
```
(Student)-[:HAS_MASTERY]->(ConceptMastery)-[:FOR_CONCEPT]->(SubConcept)
```

## 4. Database Schema (inline, complete)

### Neo4j — Existing (no new schema)

Uses existing Layer 3 prerequisite graph and Layer 5 mastery data. No new nodes or relationships created.

### Cypher — Root-Cause Traversal

```cypher
-- Find unmastered prerequisites of struggling concepts
MATCH (s:Student {id: $studentId})-[:HAS_MASTERY]->(cm:ConceptMastery)-[:FOR_CONCEPT]->(sc:SubConcept)
WHERE sc.id IN $strugglingConceptIds AND cm.p_mastered < $masteryThreshold
WITH s, collect(sc) AS targets
UNWIND targets AS target
MATCH path = (root:SubConcept)-[:PREREQUISITE_OF*1..5]->(target)
WHERE ALL(node IN nodes(path) WHERE
    EXISTS {
        MATCH (s)-[:HAS_MASTERY]->(rcm:ConceptMastery)-[:FOR_CONCEPT]->(node)
        WHERE rcm.p_mastered < $masteryThreshold
    }
    OR node = target
)
WITH root, path, target,
     length(path) AS depth
MATCH (s)-[:HAS_MASTERY]->(rootCm:ConceptMastery)-[:FOR_CONCEPT]->(root)
WHERE rootCm.p_mastered < $masteryThreshold
RETURN root.id AS root_cause_id,
       root.name AS root_cause_name,
       rootCm.p_mastered AS root_mastery,
       depth,
       collect(DISTINCT target.id) AS downstream_concepts,
       count(DISTINCT target) AS impact_score,
       [n IN nodes(path) | {id: n.id, name: n.name}] AS chain_nodes
ORDER BY impact_score DESC, root_mastery ASC
```

### Cache

Redis or in-memory cache with 1-hour TTL per `(student_id, struggling_concept_set)` key. Root causes shift slowly as mastery changes.

## 5. API Contract (complete request/response)

### GET /api/risk/root-cause/:studentId

**Role access:** advisor (own cohort), superadmin, institutional_admin
**Auth:** Bearer token

**Query params:**
- `max_depth` (int, optional, default=5): Max prerequisite chain depth
- `min_mastery_threshold` (float, optional, default=0.5): Concepts below this are "unmastered"

**Response (200):**
```json
{
    "data": {
        "student_id": "student-uuid-123",
        "struggling_concepts": ["renal-tubular-function", "electrolyte-balance"],
        "root_causes": [
            {
                "concept_id": "acid-base-physiology",
                "concept_name": "Acid-Base Physiology",
                "p_mastered": 0.18,
                "depth": 3,
                "impact_score": 5,
                "downstream_concepts": ["renal-tubular-function", "electrolyte-balance", "fluid-regulation", "nephron-function", "diuretics"]
            },
            {
                "concept_id": "cell-membrane-transport",
                "concept_name": "Cell Membrane Transport",
                "p_mastered": 0.25,
                "depth": 4,
                "impact_score": 3,
                "downstream_concepts": ["renal-tubular-function", "electrolyte-balance", "ion-channels"]
            }
        ],
        "chains": [
            [
                {
                    "source_id": "acid-base-physiology",
                    "source_name": "Acid-Base Physiology",
                    "source_mastery": 0.18,
                    "target_id": "nephron-function",
                    "target_name": "Nephron Function",
                    "target_mastery": 0.35,
                    "confidence": 0.92
                }
            ]
        ],
        "computed_at": "2026-02-19T14:30:00Z",
        "cache_ttl_seconds": 3600
    },
    "error": null
}
```

**Error responses:**
- 404: Student not found or no mastery data
- 400: Invalid max_depth or threshold

## 6. Frontend Spec

No frontend in this story. The root cause data is consumed by:
- STORY-AD-5 (Advisor Dashboard) — prerequisite chain visualization
- STORY-AD-7 (Intervention Recommendations) — root causes drive recommendations

## 7. Files to Create (exact paths, implementation order)

| # | Path | Layer | Purpose |
|---|------|-------|---------|
| 1 | `packages/python-api/src/models/root_cause_types.py` | Types | Root cause Pydantic models |
| 2 | `packages/python-api/src/algorithms/root_cause_tracer.py` | Algorithm | Prerequisite graph traversal |
| 3 | `packages/python-api/src/services/root_cause_service.py` | Service | Caching + orchestration |
| 4 | `packages/python-api/src/routes/root_cause.py` | Route | FastAPI GET endpoint |
| 5 | `packages/python-api/tests/test_root_cause_tracer.py` | Test | Algorithm tests |
| 6 | `packages/python-api/tests/test_root_cause_service.py` | Test | Service tests |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | What It Provides |
|-------|------|--------|-----------------|
| STORY-AD-1 (GNN Risk Model) | advisor | NOT STARTED | Identifies struggling concepts |
| STORY-ST-3 (BKT Mastery) | student | NOT STARTED | ConceptMastery data in Neo4j |
| STORY-ST-1 (FastAPI Scaffold) | student | NOT STARTED | packages/python-api base |

### Python Packages
- `neo4j` (Python driver)
- `redis` or `cachetools` (for TTL cache)
- `fastapi`
- `pydantic` >= 2.0

### Existing Files Needed
- Neo4j connection config from FastAPI scaffold
- PREREQUISITE_OF relationships seeded in Neo4j (from curriculum mapping E-09)
- ConceptMastery nodes populated by BKT engine (STORY-ST-3)

## 9. Test Fixtures (inline)

```python
# Simple prerequisite chain: A -> B -> C -> D (struggling)
MOCK_PREREQUISITE_CHAIN = {
    "student_id": "student-001",
    "struggling_concepts": ["concept-d"],
    "graph": {
        "nodes": [
            {"id": "concept-a", "name": "Cell Biology", "p_mastered": 0.15},
            {"id": "concept-b", "name": "Membrane Transport", "p_mastered": 0.28},
            {"id": "concept-c", "name": "Acid-Base Chemistry", "p_mastered": 0.35},
            {"id": "concept-d", "name": "Renal Tubular Function", "p_mastered": 0.12},
        ],
        "edges": [
            {"source": "concept-a", "target": "concept-b", "confidence": 0.95},
            {"source": "concept-b", "target": "concept-c", "confidence": 0.88},
            {"source": "concept-c", "target": "concept-d", "confidence": 0.92},
        ]
    },
    "expected_root_cause": {
        "concept_id": "concept-a",
        "depth": 3,
        "impact_score": 3,
        "downstream_concepts": ["concept-b", "concept-c", "concept-d"]
    }
}

# Diamond prerequisite graph: A -> B, A -> C, B -> D, C -> D
MOCK_DIAMOND_GRAPH = {
    "student_id": "student-002",
    "struggling_concepts": ["concept-d"],
    "graph": {
        "nodes": [
            {"id": "concept-a", "name": "Foundations", "p_mastered": 0.20},
            {"id": "concept-b", "name": "Pathway 1", "p_mastered": 0.30},
            {"id": "concept-c", "name": "Pathway 2", "p_mastered": 0.45},
            {"id": "concept-d", "name": "Target", "p_mastered": 0.10},
        ],
        "edges": [
            {"source": "concept-a", "target": "concept-b", "confidence": 0.9},
            {"source": "concept-a", "target": "concept-c", "confidence": 0.85},
            {"source": "concept-b", "target": "concept-d", "confidence": 0.8},
            {"source": "concept-c", "target": "concept-d", "confidence": 0.75},
        ]
    }
}

# No prerequisites (leaf concept)
MOCK_NO_PREREQUISITES = {
    "student_id": "student-003",
    "struggling_concepts": ["concept-leaf"],
    "graph": {
        "nodes": [{"id": "concept-leaf", "name": "Orphan Topic", "p_mastered": 0.20}],
        "edges": []
    },
    "expected": {"root_causes": []}
}

# Mastered prerequisite chain (should NOT appear as root cause)
MOCK_MASTERED_CHAIN = {
    "student_id": "student-004",
    "struggling_concepts": ["concept-d"],
    "graph": {
        "nodes": [
            {"id": "concept-a", "name": "Mastered Root", "p_mastered": 0.92},
            {"id": "concept-b", "name": "Mastered Middle", "p_mastered": 0.88},
            {"id": "concept-d", "name": "Struggling Target", "p_mastered": 0.25},
        ],
        "edges": [
            {"source": "concept-a", "target": "concept-b", "confidence": 0.9},
            {"source": "concept-b", "target": "concept-d", "confidence": 0.85},
        ]
    },
    "expected": {"root_causes": []}
}
```

## 10. API Test Spec (pytest — PRIMARY)

```python
# tests/test_root_cause_tracer.py
class TestRootCauseTracer:
    def test_linear_chain_finds_deepest_unmastered_root(self):
        """A->B->C->D chain with all unmastered returns A as root"""
    def test_diamond_graph_deduplicates_root_causes(self):
        """Two paths to same root produce one root cause entry"""
    def test_depth_limit_respected(self):
        """Chain longer than max_depth=3 stops at depth 3"""
    def test_mastered_prerequisites_excluded(self):
        """Prerequisite with p_mastered > threshold not returned"""
    def test_impact_score_counts_downstream_concepts(self):
        """Root cause blocking 5 concepts has impact_score=5"""
    def test_root_causes_sorted_by_impact_desc(self):
        """Highest impact root cause appears first"""
    def test_no_prerequisites_returns_empty(self):
        """Concept with no PREREQUISITE_OF edges returns empty root causes"""
    def test_multiple_struggling_concepts_unified(self):
        """Two struggling concepts with shared root produce unified set"""
    def test_chain_paths_returned_for_visualization(self):
        """PrerequisiteChainLink list matches traversed path"""

# tests/test_root_cause_service.py
class TestRootCauseService:
    def test_get_root_causes_returns_analysis(self):
        """Happy path: returns RootCauseAnalysis with root causes and chains"""
    def test_cache_hit_returns_cached_result(self):
        """Second call within TTL returns cached result"""
    def test_cache_miss_computes_fresh(self):
        """Call after TTL expiry recomputes"""
    def test_student_not_found_raises_404(self):
        """Unknown student_id raises NotFoundError"""
    def test_no_mastery_data_returns_empty_analysis(self):
        """Student with no ConceptMastery returns empty root causes"""
```

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not applicable — backend service with no UI.

## 12. Acceptance Criteria

1. Given a struggling concept, traverses prerequisite chain up to 5 levels deep in Neo4j
2. Filters traversal results by student's mastery state (only unmastered prerequisites)
3. Root cause = deepest unmastered concept in the prerequisite chain
4. Supports multiple struggling concepts with unified root-cause set (deduplication)
5. Output ordered by impact score (number of downstream concepts affected)
6. Returns prerequisite chain paths for UI visualization
7. Cache results with 1-hour TTL per student
8. GET /api/risk/root-cause/:studentId returns valid RootCauseAnalysis
9. Performance: root cause computation for single student < 500ms
10. All tests pass with >= 80% coverage

## 13. Source References

| Claim | Source |
|-------|--------|
| Prerequisite graph traversal for root causes | [ARCHITECTURE_v10 §1 "prerequisite graph identifies root-cause gaps"] |
| PREREQUISITE_OF relationship, AI_VERIFIED | [NODE_REGISTRY §Layer 3] |
| ConceptMastery, HAS_MASTERY, FOR_CONCEPT | [NODE_REGISTRY §Layer 5] |
| Depth limit 5 levels | [S-AD-44-3 §AC] |
| Cache with 1-hour TTL | [S-AD-44-3 §AC] |
| Advisor pain: no concept-level data | [PRODUCT_BRIEF §Fatima Al-Rashid] |
| Root cause example: acid-base physiology | [PRODUCT_BRIEF §Fatima success scenario] |

## 14. Environment Prerequisites

- Python 3.11+ with neo4j driver
- Neo4j Aura with prerequisite graph seeded (PREREQUISITE_OF relationships)
- BKT mastery data populated (STORY-ST-3)
- FastAPI scaffold running (STORY-ST-1)
- Redis or in-memory cache for TTL caching

## 15. Figma Make Prototype (Optional)

Not applicable — no UI in this story.
