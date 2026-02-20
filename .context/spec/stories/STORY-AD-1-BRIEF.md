# STORY-AD-1: GNN Risk Model — BRIEF

## 0. Lane & Priority

```yaml
story_id: STORY-AD-1
old_id: S-AD-44-1
lane: advisor
lane_priority: 5
within_lane_order: 1
epic: E-44 (Risk Prediction Engine)
feature: F-21
sprint: 37
size: L
depends_on:
  - STORY-ST-3 (student) — BKT Mastery Estimation (mastery data as input features)
blocks:
  - STORY-AD-2 — Root-Cause Tracing (risk model identifies struggling concepts)
  - STORY-AD-3 — Trajectory Analysis Service (risk model framework)
  - STORY-AD-4 — Risk Flag Generation (GNN model for predictions)
personas_served: [advisor, institutional_admin]
```

## 1. Summary

Build a Graph Neural Network (GNN) model using PyTorch Geometric that classifies student risk levels from mastery graph data. The model ingests student-concept mastery subgraphs from Neo4j, applies a 2-layer GraphSAGE architecture with global mean pooling, and outputs risk classifications (low/moderate/high/critical) with confidence scores. This enables at-risk student identification 2-4 weeks before academic failure.

**Parent epic:** E-44 (Risk Prediction Engine)
**Parent feature:** F-21
**User flows satisfied:** Advisor cohort review, automated risk prediction pipeline
**Personas involved:** System (automated), Advisor (consumer of predictions)

**Architecture context:** This is Tier 3 work. Python FastAPI hosts the ML models. The GNN layer is described in [ARCHITECTURE_v10 §7.5]: "Three applications: Hidden Prerequisites, LCME Gap Prediction, Student Risk Classification. Progressive: GraphSAGE → GAT → Heterogeneous GNN."

**Product context:** From [PRODUCT_BRIEF]: "A 'digital twin' of each student's knowledge state tracks mastery per concept with Bayesian inference. At-risk students are flagged 2–4 weeks before failure with specific remediation paths." Target metrics: precision >= 80%, recall >= 75%, lead time >= 2 weeks.

## 2. Task Breakdown

1. Create `packages/python-api/` scaffold (if not done by STORY-ST-1)
2. Define risk type models in `src/models/risk_types.py`
3. Implement Neo4j-to-PyG data loader in `src/ml/risk_data_loader.py`
4. Implement GraphSAGE model architecture in `src/ml/risk_gnn.py`
5. Implement training pipeline in `src/ml/risk_training.py`
6. Implement risk prediction service in `src/services/risk_prediction_service.py`
7. Implement risk repository (model artifact storage) in `src/repositories/risk_repository.py`
8. Create FastAPI route for inference in `src/routes/risk.py`
9. Write unit tests for GNN model in `tests/test_risk_gnn.py`
10. Write tests for data loader in `tests/test_risk_data_loader.py`
11. Write tests for prediction service in `tests/test_risk_prediction_service.py`

## 3. Data Model (inline, complete)

```python
# src/models/risk_types.py

from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"

class RiskPrediction(BaseModel):
    student_id: str
    risk_level: RiskLevel
    confidence: float = Field(ge=0.0, le=1.0)
    p_fail: float = Field(ge=0.0, le=1.0)
    top_struggling_concepts: list[str] = Field(max_length=10)
    predicted_at: datetime

class RiskThresholds(BaseModel):
    """Risk classification thresholds based on P(fail)"""
    low_max: float = 0.2       # P(fail) < 0.2 = low
    moderate_max: float = 0.4  # 0.2-0.4 = moderate
    high_max: float = 0.7      # 0.4-0.7 = high
    # > 0.7 = critical

class StudentGraphFeatures(BaseModel):
    """Per-student subgraph features extracted from Neo4j"""
    student_id: str
    node_features: list[list[float]]  # [num_concepts x feature_dim]
    edge_index: list[list[int]]       # [2 x num_edges]
    edge_features: list[list[float]]  # [num_edges x edge_feature_dim]
    concept_ids: list[str]            # mapping index -> concept_id

class ModelArtifact(BaseModel):
    id: str
    version: str
    model_path: str  # Supabase Storage path
    metrics: dict    # precision, recall, f1, lead_time
    trained_at: datetime
    training_samples: int
    is_active: bool = False

class BatchPredictionRequest(BaseModel):
    institution_id: Optional[str] = None  # None = all institutions

class SinglePredictionRequest(BaseModel):
    student_id: str
```

**Node features (per concept):**
- `p_mastered` (float): BKT mastery probability from ConceptMastery node
- `trend` (float): slope from trajectory analysis (AD-3)
- `evidence_count` (int): number of attempts
- `time_since_last_practice` (float): days since last AttemptRecord

**Edge features (per prerequisite edge):**
- `confidence` (float): PREREQUISITE_OF confidence from Neo4j
- `concept_similarity` (float): embedding cosine similarity (if available)

**Neo4j source nodes** [NODE_REGISTRY §Layer 5]:
```
Student: id, supabase_auth_id, cohort, status
ConceptMastery: id, p_mastered, trend, evidence_count, last_updated
AttemptRecord: id, response, correct, time_ms, timestamp
```

**Neo4j relationships** [NODE_REGISTRY §Layer 5]:
```
(Student)-[:HAS_MASTERY]->(ConceptMastery)
(ConceptMastery)-[:FOR_CONCEPT]->(SubConcept)
(SubConcept)-[:PREREQUISITE_OF]->(SubConcept)  # Layer 3, AI_VERIFIED
```

## 4. Database Schema (inline, complete)

### Supabase — Model Artifacts Table (new migration)

```sql
-- Migration: create_model_artifacts_table
CREATE TABLE IF NOT EXISTS model_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_type TEXT NOT NULL CHECK (model_type IN ('risk_gnn', 'irt', 'bkt')),
    version TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}',
    trained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    training_samples INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (model_type, version)
);

-- RLS: only system/superadmin can access
ALTER TABLE model_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "model_artifacts_read" ON model_artifacts
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "model_artifacts_write" ON model_artifacts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role = 'superadmin'
        )
    );
```

### Neo4j — No new node types for this story

Reads existing Layer 5 nodes (Student, ConceptMastery, AttemptRecord) and Layer 3 relationships (PREREQUISITE_OF). RiskFlag node is created in STORY-AD-4.

### Cypher — Extract Student Subgraph

```cypher
-- Per-student concept mastery subgraph
MATCH (s:Student {id: $studentId})-[:HAS_MASTERY]->(cm:ConceptMastery)
MATCH (cm)-[:FOR_CONCEPT]->(sc:SubConcept)
OPTIONAL MATCH (sc)-[p:PREREQUISITE_OF]->(sc2:SubConcept)
WHERE EXISTS {
    MATCH (s)-[:HAS_MASTERY]->(cm2:ConceptMastery)-[:FOR_CONCEPT]->(sc2)
}
RETURN s.id AS student_id,
       collect(DISTINCT {
           concept_id: sc.id,
           p_mastered: cm.p_mastered,
           trend: cm.trend,
           evidence_count: cm.evidence_count,
           last_updated: cm.last_updated
       }) AS nodes,
       collect(DISTINCT {
           source: sc.id,
           target: sc2.id,
           confidence: p.confidence
       }) AS edges
```

## 5. API Contract (complete request/response)

### POST /api/risk/predict/:studentId

**Role access:** system, superadmin, advisor (own cohort students)
**Auth:** Bearer token (FastAPI dependency)

**Request:**
```
POST /api/risk/predict/student-uuid-123
Authorization: Bearer <token>
```

**Response (200):**
```json
{
    "data": {
        "student_id": "student-uuid-123",
        "risk_level": "high",
        "confidence": 0.87,
        "p_fail": 0.62,
        "top_struggling_concepts": [
            "acid-base-physiology",
            "renal-tubular-function",
            "electrolyte-balance"
        ],
        "predicted_at": "2026-02-19T14:30:00Z"
    },
    "error": null
}
```

**Error responses:**
- 404: Student not found or no mastery data
- 503: Model not loaded / no active model artifact

### POST /api/risk/predict/batch

**Role access:** system only (Inngest job)

**Request:**
```json
{
    "institution_id": "inst-uuid-123"
}
```

**Response (200):**
```json
{
    "data": {
        "total_students": 150,
        "predictions": 148,
        "skipped": 2,
        "risk_distribution": {
            "low": 89,
            "moderate": 35,
            "high": 18,
            "critical": 6
        }
    },
    "error": null
}
```

## 6. Frontend Spec

No frontend for this story. This is a backend ML model + API. The predictions are consumed by STORY-AD-4 (Risk Flag Generation) and STORY-AD-5 (Advisor Dashboard).

## 7. Files to Create (exact paths, implementation order)

| # | Path | Layer | Purpose |
|---|------|-------|---------|
| 1 | `packages/python-api/src/models/risk_types.py` | Types | Risk prediction Pydantic models |
| 2 | `packages/python-api/src/ml/risk_data_loader.py` | Data | Neo4j → PyG data conversion |
| 3 | `packages/python-api/src/ml/risk_gnn.py` | Model | GraphSAGE model architecture |
| 4 | `packages/python-api/src/ml/risk_training.py` | Training | Training pipeline + evaluation |
| 5 | `packages/python-api/src/repositories/risk_repository.py` | Repository | Model artifact CRUD |
| 6 | `packages/python-api/src/services/risk_prediction_service.py` | Service | Prediction orchestration |
| 7 | `packages/python-api/src/routes/risk.py` | Route | FastAPI endpoints |
| 8 | `packages/python-api/tests/test_risk_data_loader.py` | Test | Data loader tests |
| 9 | `packages/python-api/tests/test_risk_gnn.py` | Test | Model architecture tests |
| 10 | `packages/python-api/tests/test_risk_prediction_service.py` | Test | Service tests |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | What It Provides |
|-------|------|--------|-----------------|
| STORY-ST-3 (BKT Mastery) | student | NOT STARTED | ConceptMastery data in Neo4j |
| STORY-ST-1 (FastAPI Scaffold) | student | NOT STARTED | packages/python-api base setup |

### NPM/Python Packages
- `torch` >= 2.0
- `torch-geometric` >= 2.4
- `numpy`
- `scikit-learn` (metrics)
- `neo4j` (Python driver)
- `supabase` (Python client)
- `fastapi`, `uvicorn`
- `pydantic` >= 2.0
- `inngest` (Python SDK)

### Existing Files Needed
- Neo4j connection config (from FastAPI scaffold)
- Supabase client config (from FastAPI scaffold)
- Student, ConceptMastery, SubConcept nodes in Neo4j (from BKT)

## 9. Test Fixtures (inline)

```python
# Valid student graph data
MOCK_STUDENT_GRAPH = {
    "student_id": "student-001",
    "nodes": [
        {"concept_id": "c-001", "p_mastered": 0.85, "trend": 0.02, "evidence_count": 15, "last_updated": "2026-02-10T00:00:00Z"},
        {"concept_id": "c-002", "p_mastered": 0.32, "trend": -0.05, "evidence_count": 8, "last_updated": "2026-02-12T00:00:00Z"},
        {"concept_id": "c-003", "p_mastered": 0.15, "trend": -0.08, "evidence_count": 3, "last_updated": "2026-01-28T00:00:00Z"},
        {"concept_id": "c-004", "p_mastered": 0.92, "trend": 0.01, "evidence_count": 22, "last_updated": "2026-02-15T00:00:00Z"},
    ],
    "edges": [
        {"source": "c-001", "target": "c-002", "confidence": 0.9},
        {"source": "c-001", "target": "c-003", "confidence": 0.85},
        {"source": "c-002", "target": "c-004", "confidence": 0.7},
    ]
}

# Expected prediction for high-risk student
MOCK_HIGH_RISK_PREDICTION = {
    "student_id": "student-001",
    "risk_level": "high",
    "confidence": 0.82,
    "p_fail": 0.58,
    "top_struggling_concepts": ["c-003", "c-002"],
    "predicted_at": "2026-02-19T14:30:00Z"
}

# Student with no mastery data (edge case)
MOCK_EMPTY_GRAPH = {
    "student_id": "student-new",
    "nodes": [],
    "edges": []
}

# Model artifact fixture
MOCK_MODEL_ARTIFACT = {
    "id": "artifact-001",
    "model_type": "risk_gnn",
    "version": "1.0.0",
    "storage_path": "models/risk_gnn/v1.0.0/model.pt",
    "metrics": {"precision": 0.83, "recall": 0.78, "f1": 0.80, "lead_time_weeks": 3.2},
    "trained_at": "2026-02-01T00:00:00Z",
    "training_samples": 500,
    "is_active": True
}

# Batch prediction result
MOCK_BATCH_RESULT = {
    "total_students": 5,
    "predictions": 5,
    "skipped": 0,
    "risk_distribution": {"low": 2, "moderate": 1, "high": 1, "critical": 1}
}
```

## 10. API Test Spec (pytest — PRIMARY)

```python
# tests/test_risk_gnn.py
class TestRiskGNN:
    def test_model_forward_pass_produces_4_class_output(self):
        """GraphSAGE forward pass outputs [batch_size, 4] logits"""
    def test_model_handles_single_node_graph(self):
        """Student with 1 concept still produces valid prediction"""
    def test_model_handles_disconnected_graph(self):
        """Concepts with no prerequisite edges still classified"""
    def test_global_mean_pooling_aggregates_node_embeddings(self):
        """Pooling reduces variable-size graph to fixed vector"""

# tests/test_risk_data_loader.py
class TestRiskDataLoader:
    def test_neo4j_to_pyg_conversion_correct_shapes(self):
        """Node features: [N, 4], edge_index: [2, E], edge_attr: [E, 2]"""
    def test_empty_graph_returns_none(self):
        """Student with no mastery data returns None (skip)"""
    def test_concept_id_mapping_preserved(self):
        """Index-to-concept-id mapping matches node order"""
    def test_batch_loading_all_students(self):
        """Batch loader returns DataLoader with all student subgraphs"""

# tests/test_risk_prediction_service.py
class TestRiskPredictionService:
    def test_predict_returns_risk_level_with_confidence(self):
        """Single student prediction returns RiskPrediction"""
    def test_risk_thresholds_classify_correctly(self):
        """p_fail 0.1=low, 0.3=moderate, 0.5=high, 0.8=critical"""
    def test_predict_with_no_active_model_raises_error(self):
        """ServiceUnavailableError when no model artifact is active"""
    def test_predict_student_not_found_raises_404(self):
        """NotFoundError for unknown student_id"""
    def test_batch_predict_processes_all_students(self):
        """Batch prediction returns distribution counts"""
    def test_batch_predict_skips_students_without_data(self):
        """Students with no mastery data are skipped, not errored"""
    def test_top_struggling_concepts_sorted_by_mastery_asc(self):
        """Lowest mastery concepts appear first"""
```

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not applicable. This is a backend ML model with no UI. E2E testing for the advisor flow is covered in STORY-AD-5 (Advisor Dashboard).

## 12. Acceptance Criteria

1. PyTorch Geometric GNN model compiles and runs forward pass with GraphSAGE architecture
2. Model accepts variable-size student-concept subgraphs from Neo4j
3. Node features include: concept mastery level, trend slope, evidence count, time since last practice
4. Edge features include: prerequisite strength (confidence)
5. Output is 4-class risk classification (low, moderate, high, critical) with confidence score
6. Risk thresholds: P(fail) < 0.2 = low, 0.2-0.4 = moderate, 0.4-0.7 = high, > 0.7 = critical
7. Training pipeline accepts labeled historical data and reports precision, recall, F1
8. Target metrics: precision >= 80%, recall >= 75%, lead time >= 2 weeks
9. Model artifacts stored in Supabase Storage with version and metrics metadata
10. POST /api/risk/predict/:studentId returns prediction in < 2 seconds
11. Batch inference endpoint processes all active students per institution
12. Model retraining schedulable via Inngest (monthly default)
13. All tests pass with >= 80% coverage

## 13. Source References

| Claim | Source |
|-------|--------|
| GraphSAGE architecture, 3 GNN applications | [ARCHITECTURE_v10 §7.5] |
| Precision advising, 2-4 week lead time | [ARCHITECTURE_v10 §1, PRODUCT_BRIEF §Job 3] |
| Student, ConceptMastery, AttemptRecord nodes | [NODE_REGISTRY §Layer 5] |
| PREREQUISITE_OF relationship | [NODE_REGISTRY §Layer 3] |
| Python FastAPI for GNN/IRT | [ARCHITECTURE_v10 §3.2] |
| Risk thresholds | [S-AD-44-1 §Notes] |
| Precision >= 80%, recall >= 75% | [S-AD-44-1 §AC, PRODUCT_BRIEF §Tier 2 Metrics] |
| Inngest for scheduled jobs | [ARCHITECTURE_v10 §3.5] |
| DualWrite pattern | [ARCHITECTURE_v10 §15.1] |

## 14. Environment Prerequisites

- Python 3.11+ with PyTorch, PyTorch Geometric installed
- Neo4j Aura connection (with BKT mastery data seeded — from STORY-ST-3)
- Supabase project running (for model artifact storage)
- FastAPI scaffold set up (from STORY-ST-1)
- Inngest dev server for scheduled job testing

## 15. Figma Make Prototype (Optional)

Not applicable — no UI in this story.
