# STORY-AD-1: GNN Risk Model

**Epic:** E-44 (Risk Prediction Engine)
**Feature:** F-21
**Sprint:** 37
**Lane:** advisor (P5)
**Size:** L
**Old ID:** S-AD-44-1

---

## User Story
As a **system**, I need a graph neural network model that classifies student risk levels from mastery graph data so that at-risk students can be identified 2-4 weeks before academic failure.

## Acceptance Criteria
- [ ] PyTorch Geometric GNN model for student risk classification
- [ ] Input: student-concept mastery graph from Neo4j
- [ ] Node features: concept mastery level, trend slope, time since last practice
- [ ] Edge features: prerequisite strength, concept similarity
- [ ] Output: risk classification (low, moderate, high, critical) with confidence score
- [ ] Model architecture: 2-layer GraphSAGE with global mean pooling
- [ ] Training pipeline: labeled historical data (student outcomes)
- [ ] Evaluation metrics: precision >= 80%, recall >= 75%, lead time >= 2 weeks
- [ ] Model versioning: store model artifacts with version and metrics metadata
- [ ] Inference endpoint: POST /api/risk/predict/:studentId
- [ ] Batch inference: predict for all active students in an institution
- [ ] Model retraining scheduled via Inngest (monthly or on-demand)
- [ ] Risk classification thresholds: P(fail) < 0.2 = low, 0.2-0.4 = moderate, 0.4-0.7 = high, > 0.7 = critical

## Reference Screens
> **None** -- backend-only AI/ML story. No UI in this story.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/python-api | `src/models/risk_types.py` |
| Model | packages/python-api | `src/ml/risk_gnn.py` |
| Training | packages/python-api | `src/ml/risk_training.py` |
| Data Loader | packages/python-api | `src/ml/risk_data_loader.py` |
| Service | packages/python-api | `src/services/risk_prediction_service.py` |
| Repository | packages/python-api | `src/repositories/risk_repository.py` |
| Route | packages/python-api | `src/routes/risk.py` |
| Tests | packages/python-api | `tests/test_risk_gnn.py` |
| Tests | packages/python-api | `tests/test_risk_prediction_service.py` |
| Tests | packages/python-api | `tests/test_risk_data_loader.py` |

## Database Schema

**Supabase:**
```sql
CREATE TABLE risk_model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL UNIQUE,
  model_path TEXT NOT NULL,          -- Supabase Storage path to model artifact
  precision_score NUMERIC(5,4),
  recall_score NUMERIC(5,4),
  f1_score NUMERIC(5,4),
  training_samples INTEGER,
  training_date TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT false,   -- only one active model at a time
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE risk_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  model_version_id UUID NOT NULL REFERENCES risk_model_versions(id),
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high', 'critical')),
  confidence NUMERIC(5,4) NOT NULL,
  feature_importance JSONB DEFAULT '{}'::jsonb,  -- top contributing features
  predicted_at TIMESTAMPTZ DEFAULT now(),
  institution_id UUID NOT NULL REFERENCES institutions(id)
);

CREATE INDEX idx_risk_predictions_student ON risk_predictions(student_id, predicted_at DESC);
CREATE INDEX idx_risk_predictions_institution ON risk_predictions(institution_id, predicted_at DESC);
```

**Neo4j:**
```cypher
// Student risk prediction node
(:Student)-[:HAS_PREDICTION]->(:RiskPrediction {
  risk_level: "high",
  confidence: 0.82,
  model_version: "v1.0",
  predicted_at: datetime()
})

// Student-concept mastery edges used as GNN input
(:Student)-[:HAS_MASTERY {level: 0.45, trend_slope: -0.02, last_practiced: datetime()}]->(:Concept)
(:Concept)-[:PREREQUISITE_OF {strength: 0.8}]->(:Concept)
```

**Supabase Storage:**
- Bucket: `risk-models`
- Path: `models/v{version}/model.pt` (PyTorch model checkpoint)
- Path: `models/v{version}/metadata.json` (training metrics, hyperparams)

## API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/risk/predict/:studentId` | Predict risk for single student | advisor, institutional_admin |
| POST | `/api/risk/predict/batch` | Batch predict for all active students | system (Inngest), institutional_admin |
| GET | `/api/risk/predictions/:studentId` | Get prediction history for student | advisor, institutional_admin |
| GET | `/api/risk/model/versions` | List model versions with metrics | superadmin |
| POST | `/api/risk/model/retrain` | Trigger model retraining | superadmin |

## Dependencies
- **Blocked by:** Student BKT mastery data (E-40, S-ST-40-3) -- mastery levels are GNN input features
- **Blocks:** STORY-AD-2 (Root-Cause Tracing), STORY-AD-3 (Trajectory Analysis feeds features), STORY-AD-4 (Risk Flag Generation consumes predictions)
- **Cross-epic:** Reuses FastAPI scaffold from E-40 (packages/python-api)

## Testing Requirements
- 8 API tests: GNN model forward pass shape validation, Neo4j-to-PyG data conversion, batch prediction pipeline, risk threshold classification, model versioning CRUD, inference endpoint auth, prediction storage, feature importance extraction
- 0 E2E tests

## Implementation Notes
- PyTorch Geometric for graph neural networks; GraphSAGE chosen for inductive learning (can generalize to unseen students without retraining).
- Neo4j to PyTorch Geometric conversion: extract student's concept subgraph, convert to `torch_geometric.data.Data` with node/edge feature tensors.
- Initial training data will be synthetic/simulated until real student outcome data accumulates. Generate synthetic data with known risk patterns for model validation.
- Model artifacts stored in Supabase Storage; metadata (version, metrics, hyperparams) in `risk_model_versions` table.
- Risk classification uses softmax output probabilities, not hard thresholds on a single score.
- Inngest scheduled function for monthly retraining: `inngest.create_function(fn_id="risk-model-retrain", trigger=inngest.TriggerCron(cron="0 3 1 * *"))`.
- Batch inference processes students in chunks (100 per batch) to manage memory.
- All embeddings are 1024-dim (Voyage AI voyage-3-large) per architecture rules -- concept embeddings may be used as additional node features.
