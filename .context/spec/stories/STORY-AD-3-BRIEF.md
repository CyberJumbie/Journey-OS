# STORY-AD-3: Trajectory Analysis Service — BRIEF

## 0. Lane & Priority

```yaml
story_id: STORY-AD-3
old_id: S-AD-44-2
lane: advisor
lane_priority: 5
within_lane_order: 3
epic: E-44 (Risk Prediction Engine)
feature: F-21
sprint: 37
size: M
depends_on:
  - STORY-AD-1 (advisor) — GNN Risk Model (risk model framework)
  - STORY-ST-3 (student) — BKT Mastery Estimation (mastery history data)
blocks:
  - STORY-AD-4 — Risk Flag Generation (trajectory data feeds into flags)
personas_served: [advisor, system]
```

## 1. Summary

Build a trajectory analysis service that computes mastery trends over time using linear regression on sliding windows. For each concept a student is learning, the service calculates the slope of mastery change, classifies it as improving/stable/declining, detects acceleration (second derivative), and flags inactivity. The trajectory data feeds into the GNN model as node features and provides temporal context beyond point-in-time mastery snapshots.

**Parent epic:** E-44 (Risk Prediction Engine)
**Parent feature:** F-21
**User flows satisfied:** Automated trend detection, risk model feature engineering
**Personas involved:** System (automated), Advisor (indirect consumer via dashboard)

**Architecture context:** From [ARCHITECTURE_v10 §15.2]: Event-driven mastery updates flow from Supabase attempt records through BKT engine to ConceptMastery nodes. Trajectory analysis runs on the time-series history of these updates.

## 2. Task Breakdown

1. Define trajectory types in `src/models/trajectory_types.py`
2. Implement trajectory analysis algorithm in `src/algorithms/trajectory_analysis.py`
3. Implement trajectory service in `src/services/trajectory_service.py`
4. Create FastAPI route in `src/routes/trajectory.py`
5. Implement Inngest batch job in `src/jobs/trajectory_batch_job.py`
6. Write algorithm tests in `tests/test_trajectory_analysis.py`
7. Write service tests in `tests/test_trajectory_service.py`

## 3. Data Model (inline, complete)

```python
# src/models/trajectory_types.py

from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class TrendDirection(str, Enum):
    IMPROVING = "improving"    # slope > 0.01
    STABLE = "stable"          # -0.01 to 0.01
    DECLINING = "declining"    # slope < -0.01

class ConceptTrajectory(BaseModel):
    concept_id: str
    concept_name: str
    current_mastery: float = Field(ge=0.0, le=1.0)
    slope: float  # linear regression slope
    trend: TrendDirection
    acceleration: float  # second derivative (change in slope)
    is_accelerating_decline: bool  # declining faster than previous window
    days_since_last_practice: int
    is_inactive: bool  # > 7 days no practice
    data_points: int  # number of mastery snapshots in window
    window_start: datetime
    window_end: datetime

class StudentTrajectory(BaseModel):
    student_id: str
    concept_trajectories: list[ConceptTrajectory]
    aggregate_slope: float  # overall student trend
    aggregate_trend: TrendDirection
    declining_count: int
    inactive_count: int
    computed_at: datetime

class TrajectoryConfig(BaseModel):
    window_days: int = Field(default=14, ge=3, le=90)
    slope_improving_threshold: float = 0.01
    slope_declining_threshold: float = -0.01
    inactivity_days: int = 7

class MasterySnapshot(BaseModel):
    """Single point in mastery time series"""
    concept_id: str
    p_mastered: float
    timestamp: datetime
```

**Data source:** Supabase `mastery_history` table (time-series of BKT mastery updates per student per concept). This table is created by STORY-ST-3.

## 4. Database Schema (inline, complete)

### Supabase — mastery_history (created by STORY-ST-3, consumed here)

```sql
-- Expected schema from BKT story (STORY-ST-3)
-- This story reads from it, does not create it
CREATE TABLE IF NOT EXISTS mastery_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id),
    concept_id TEXT NOT NULL,
    p_mastered FLOAT NOT NULL,
    evidence_count INTEGER NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT mastery_history_range CHECK (p_mastered >= 0 AND p_mastered <= 1)
);

CREATE INDEX idx_mastery_history_student_concept
    ON mastery_history (student_id, concept_id, recorded_at DESC);
```

### Supabase — trajectory_cache (optional, new migration)

```sql
-- Migration: create_trajectory_cache_table
CREATE TABLE IF NOT EXISTS trajectory_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id),
    trajectory_data JSONB NOT NULL,
    window_days INTEGER NOT NULL DEFAULT 14,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE (student_id, window_days)
);

CREATE INDEX idx_trajectory_cache_expiry ON trajectory_cache (expires_at);
```

### Cypher — Read Mastery Trend from Neo4j (alternative data source)

```cypher
-- If reading trend directly from ConceptMastery nodes
MATCH (s:Student {id: $studentId})-[:HAS_MASTERY]->(cm:ConceptMastery)
MATCH (cm)-[:FOR_CONCEPT]->(sc:SubConcept)
RETURN sc.id AS concept_id,
       sc.name AS concept_name,
       cm.p_mastered AS current_mastery,
       cm.trend AS trend,
       cm.evidence_count AS evidence_count,
       cm.last_updated AS last_updated
```

## 5. API Contract (complete request/response)

### GET /api/risk/trajectory/:studentId

**Role access:** advisor (own cohort), superadmin, institutional_admin
**Auth:** Bearer token

**Query params:**
- `window_days` (int, optional, default=14): Sliding window size in days

**Response (200):**
```json
{
    "data": {
        "student_id": "student-uuid-123",
        "concept_trajectories": [
            {
                "concept_id": "acid-base-physiology",
                "concept_name": "Acid-Base Physiology",
                "current_mastery": 0.35,
                "slope": -0.032,
                "trend": "declining",
                "acceleration": -0.008,
                "is_accelerating_decline": true,
                "days_since_last_practice": 3,
                "is_inactive": false,
                "data_points": 8,
                "window_start": "2026-02-05T00:00:00Z",
                "window_end": "2026-02-19T00:00:00Z"
            },
            {
                "concept_id": "cardiovascular-anatomy",
                "concept_name": "Cardiovascular Anatomy",
                "current_mastery": 0.78,
                "slope": 0.015,
                "trend": "improving",
                "acceleration": 0.002,
                "is_accelerating_decline": false,
                "days_since_last_practice": 1,
                "is_inactive": false,
                "data_points": 12,
                "window_start": "2026-02-05T00:00:00Z",
                "window_end": "2026-02-19T00:00:00Z"
            },
            {
                "concept_id": "hepatic-metabolism",
                "concept_name": "Hepatic Metabolism",
                "current_mastery": 0.42,
                "slope": 0.0,
                "trend": "stable",
                "acceleration": 0.0,
                "is_accelerating_decline": false,
                "days_since_last_practice": 12,
                "is_inactive": true,
                "data_points": 2,
                "window_start": "2026-02-05T00:00:00Z",
                "window_end": "2026-02-19T00:00:00Z"
            }
        ],
        "aggregate_slope": -0.006,
        "aggregate_trend": "declining",
        "declining_count": 1,
        "inactive_count": 1,
        "computed_at": "2026-02-19T14:30:00Z"
    },
    "error": null
}
```

**Error responses:**
- 404: Student not found
- 400: Invalid window_days

## 6. Frontend Spec

No frontend in this story. Trajectory data is consumed by:
- STORY-AD-1 (GNN model) — trend slope as node feature
- STORY-AD-5 (Advisor Dashboard) — trend indicators on student cards

## 7. Files to Create (exact paths, implementation order)

| # | Path | Layer | Purpose |
|---|------|-------|---------|
| 1 | `packages/python-api/src/models/trajectory_types.py` | Types | Trajectory Pydantic models |
| 2 | `packages/python-api/src/algorithms/trajectory_analysis.py` | Algorithm | Linear regression + trend classification |
| 3 | `packages/python-api/src/services/trajectory_service.py` | Service | Orchestration + caching |
| 4 | `packages/python-api/src/routes/trajectory.py` | Route | FastAPI GET endpoint |
| 5 | `packages/python-api/src/jobs/trajectory_batch_job.py` | Job | Inngest batch computation |
| 6 | `packages/python-api/tests/test_trajectory_analysis.py` | Test | Algorithm tests |
| 7 | `packages/python-api/tests/test_trajectory_service.py` | Test | Service tests |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | What It Provides |
|-------|------|--------|-----------------|
| STORY-AD-1 (GNN Risk Model) | advisor | NOT STARTED | Risk model framework |
| STORY-ST-3 (BKT Mastery) | student | NOT STARTED | mastery_history time-series data |
| STORY-ST-1 (FastAPI Scaffold) | student | NOT STARTED | packages/python-api base |

### Python Packages
- `numpy` (polyfit for linear regression)
- `scipy` (optional: statistical tests)
- `neo4j` (Python driver)
- `supabase` (Python client)
- `fastapi`, `pydantic` >= 2.0
- `inngest` (Python SDK for batch job)

### Existing Files Needed
- FastAPI scaffold configuration
- Supabase `mastery_history` table (from STORY-ST-3)
- Neo4j ConceptMastery nodes (from STORY-ST-3)

## 9. Test Fixtures (inline)

```python
from datetime import datetime, timedelta

# Declining trend: mastery dropping over 14 days
MOCK_DECLINING_HISTORY = [
    {"concept_id": "c-001", "p_mastered": 0.65, "recorded_at": datetime(2026, 2, 5)},
    {"concept_id": "c-001", "p_mastered": 0.58, "recorded_at": datetime(2026, 2, 8)},
    {"concept_id": "c-001", "p_mastered": 0.50, "recorded_at": datetime(2026, 2, 11)},
    {"concept_id": "c-001", "p_mastered": 0.42, "recorded_at": datetime(2026, 2, 14)},
    {"concept_id": "c-001", "p_mastered": 0.35, "recorded_at": datetime(2026, 2, 17)},
]
# Expected slope: approximately -0.025 per day

# Improving trend
MOCK_IMPROVING_HISTORY = [
    {"concept_id": "c-002", "p_mastered": 0.40, "recorded_at": datetime(2026, 2, 5)},
    {"concept_id": "c-002", "p_mastered": 0.48, "recorded_at": datetime(2026, 2, 8)},
    {"concept_id": "c-002", "p_mastered": 0.55, "recorded_at": datetime(2026, 2, 11)},
    {"concept_id": "c-002", "p_mastered": 0.65, "recorded_at": datetime(2026, 2, 14)},
    {"concept_id": "c-002", "p_mastered": 0.78, "recorded_at": datetime(2026, 2, 17)},
]

# Stable trend
MOCK_STABLE_HISTORY = [
    {"concept_id": "c-003", "p_mastered": 0.60, "recorded_at": datetime(2026, 2, 5)},
    {"concept_id": "c-003", "p_mastered": 0.61, "recorded_at": datetime(2026, 2, 8)},
    {"concept_id": "c-003", "p_mastered": 0.59, "recorded_at": datetime(2026, 2, 11)},
    {"concept_id": "c-003", "p_mastered": 0.60, "recorded_at": datetime(2026, 2, 14)},
]

# Inactive: last practice > 7 days ago
MOCK_INACTIVE = {
    "concept_id": "c-004",
    "last_practice": datetime(2026, 2, 1),  # 18 days ago
    "current_date": datetime(2026, 2, 19),
    "expected_inactive": True,
    "expected_days": 18
}

# Accelerating decline (second derivative negative)
MOCK_ACCELERATING_DECLINE = {
    "previous_window_slope": -0.01,
    "current_window_slope": -0.04,
    "expected_acceleration": -0.03,
    "expected_is_accelerating": True
}

# Insufficient data (< 2 points)
MOCK_INSUFFICIENT_DATA = [
    {"concept_id": "c-005", "p_mastered": 0.50, "recorded_at": datetime(2026, 2, 15)},
]
# Expected: slope = 0, trend = stable, data_points = 1
```

## 10. API Test Spec (pytest — PRIMARY)

```python
# tests/test_trajectory_analysis.py
class TestTrajectoryAnalysis:
    def test_declining_slope_classified_correctly(self):
        """Slope < -0.01 returns TrendDirection.DECLINING"""
    def test_improving_slope_classified_correctly(self):
        """Slope > 0.01 returns TrendDirection.IMPROVING"""
    def test_stable_slope_classified_correctly(self):
        """Slope between -0.01 and 0.01 returns TrendDirection.STABLE"""
    def test_linear_regression_slope_accuracy(self):
        """Computed slope within 0.005 of expected value"""
    def test_acceleration_detects_worsening_decline(self):
        """Current slope more negative than previous = accelerating decline"""
    def test_inactivity_detected_after_7_days(self):
        """No practice for > 7 days flags is_inactive=True"""
    def test_inactivity_not_flagged_within_7_days(self):
        """Practice within 7 days keeps is_inactive=False"""
    def test_insufficient_data_returns_stable(self):
        """< 2 data points returns slope=0, trend=stable"""
    def test_configurable_window_size(self):
        """window_days=7 only uses last 7 days of data"""
    def test_aggregate_trend_averages_all_concepts(self):
        """Aggregate slope is mean of all concept slopes"""

# tests/test_trajectory_service.py
class TestTrajectoryService:
    def test_get_trajectory_returns_student_trajectory(self):
        """Happy path returns StudentTrajectory"""
    def test_student_not_found_raises_404(self):
        """Unknown student_id raises NotFoundError"""
    def test_no_history_returns_empty_trajectories(self):
        """Student with no mastery_history returns empty list"""
    def test_batch_compute_processes_all_students(self):
        """Batch job computes trajectories for all active students"""
    def test_performance_1000_students_under_30_seconds(self):
        """Batch computation for 1000 students completes within 30s"""
```

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not applicable — backend service with no UI.

## 12. Acceptance Criteria

1. Linear regression slope computed per concept over configurable sliding window (default 14 days)
2. Trend classification: improving (slope > 0.01), stable (-0.01 to 0.01), declining (< -0.01)
3. Aggregate trajectory computed across all concepts per student
4. Acceleration detection: second derivative identifies worsening decline
5. Inactivity detection: no practice in > 7 days flagged as risk signal
6. GET /api/risk/trajectory/:studentId returns StudentTrajectory with all concept trends
7. Batch computation via Inngest for all active students
8. Performance: compute trajectory for 1000 students in < 30 seconds
9. Output feeds into GNN model as node features (slope, inactivity flag)
10. All tests pass with >= 80% coverage

## 13. Source References

| Claim | Source |
|-------|--------|
| Trajectory analysis for risk features | [S-AD-44-2 §AC] |
| Linear regression slope, sliding window | [S-AD-44-2 §AC] |
| Inactivity as risk signal | [S-AD-44-2 §Notes "strong predictor in medical education"] |
| Second derivative acceleration | [S-AD-44-2 §AC] |
| Event-driven mastery updates | [ARCHITECTURE_v10 §15.2] |
| Inngest for batch jobs | [ARCHITECTURE_v10 §3.5] |
| numpy polyfit | [S-AD-44-2 §Notes] |
| mastery_history table | [S-AD-44-2 §Notes "Supabase mastery_history table"] |

## 14. Environment Prerequisites

- Python 3.11+ with numpy, scipy
- Supabase with mastery_history table populated (from STORY-ST-3)
- Neo4j with ConceptMastery nodes (from STORY-ST-3)
- FastAPI scaffold running (STORY-ST-1)
- Inngest dev server for batch job testing

## 15. Figma Make Prototype (Optional)

Not applicable — no UI in this story.
