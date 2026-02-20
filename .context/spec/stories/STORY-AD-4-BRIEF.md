# STORY-AD-4: Risk Flag Generation — BRIEF

## 0. Lane & Priority

```yaml
story_id: STORY-AD-4
old_id: S-AD-44-4
lane: advisor
lane_priority: 5
within_lane_order: 4
epic: E-44 (Risk Prediction Engine)
feature: F-21
sprint: 37
size: M
depends_on:
  - STORY-AD-1 (advisor) — GNN Risk Model (predictions)
  - STORY-AD-2 (advisor) — Root-Cause Tracing (root causes for flags)
  - STORY-AD-3 (advisor) — Trajectory Analysis (trajectory data)
blocks:
  - STORY-AD-5 — Advisor Dashboard Page (needs risk flags to display)
  - STORY-AD-6 — Student Alert View (student sees their flags)
personas_served: [advisor, student, institutional_admin]
```

## 1. Summary

Build the risk flag generation pipeline that runs daily via Inngest, executes batch risk predictions for all active students, and generates alert flags for students classified as 'high' or 'critical'. Flags are dual-written to Supabase (`risk_flags` table) and Neo4j (`(Student)-[:HAS_RISK_FLAG]->(RiskFlag)`). The pipeline includes deduplication, severity escalation, and event emission for the notification system.

**Parent epic:** E-44 (Risk Prediction Engine)
**Parent feature:** F-21
**User flows satisfied:** Automated daily risk assessment, advisor alert pipeline
**Personas involved:** System (automated), Advisor (flag consumer), Student (alert recipient)

**Architecture context:** From [ARCHITECTURE_v10 §15.1]: DualWrite pattern — "Supabase INSERT (sync_status: 'pending') → Neo4j CREATE/MERGE → Supabase UPDATE sync_status = 'synced'."

## 2. Task Breakdown

1. Define risk flag types in `src/models/risk_flag_types.py`
2. Create risk flag Supabase migration (`risk_flags` table)
3. Implement risk flag repository (Supabase + Neo4j dual-write) in `src/repositories/risk_flag_repository.py`
4. Implement risk flag domain model in `src/models/risk_flag.py`
5. Implement risk flag service (dedup, escalation) in `src/services/risk_flag_service.py`
6. Implement Inngest scheduled job in `src/jobs/risk_prediction_job.py`
7. Create FastAPI routes in `src/routes/risk_flags.py`
8. Write service tests in `tests/test_risk_flag_service.py`
9. Write job tests in `tests/test_risk_prediction_job.py`

## 3. Data Model (inline, complete)

```python
# src/models/risk_flag_types.py

from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"

class FlagStatus(str, Enum):
    CREATED = "created"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"

class RiskFlagCreate(BaseModel):
    student_id: str
    institution_id: str
    risk_level: RiskLevel
    confidence: float = Field(ge=0.0, le=1.0)
    p_fail: float = Field(ge=0.0, le=1.0)
    top_3_root_causes: list[dict]  # [{concept_id, concept_name, p_mastered, impact_score}]
    trajectory_summary: Optional[dict] = None  # aggregate trend info

class RiskFlag(BaseModel):
    id: str
    student_id: str
    institution_id: str
    risk_level: RiskLevel
    confidence: float
    p_fail: float
    top_3_root_causes: list[dict]
    trajectory_summary: Optional[dict]
    status: FlagStatus = FlagStatus.CREATED
    previous_risk_level: Optional[RiskLevel] = None  # for escalation tracking
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolution_outcome: Optional[str] = None
    graph_node_id: Optional[str] = None
    sync_status: str = "pending"
    created_at: datetime
    updated_at: datetime

class RiskFlagAcknowledge(BaseModel):
    acknowledged_by: str  # advisor user_id

class RiskFlagResolve(BaseModel):
    resolution_outcome: str  # "improved", "no_change", "withdrawn", etc.

class RiskFlagListQuery(BaseModel):
    institution_id: Optional[str] = None
    student_id: Optional[str] = None
    risk_level: Optional[RiskLevel] = None
    status: Optional[FlagStatus] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)

class DailyPredictionResult(BaseModel):
    institution_id: str
    total_students: int
    predictions_made: int
    flags_created: int
    flags_escalated: int
    flags_deduplicated: int
    run_at: datetime
```

## 4. Database Schema (inline, complete)

### Supabase — risk_flags table (new migration)

```sql
-- Migration: create_risk_flags_table
CREATE TABLE IF NOT EXISTS risk_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high', 'critical')),
    confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    p_fail FLOAT NOT NULL CHECK (p_fail >= 0 AND p_fail <= 1),
    top_3_root_causes JSONB NOT NULL DEFAULT '[]',
    trajectory_summary JSONB,
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'acknowledged', 'resolved')),
    previous_risk_level TEXT CHECK (previous_risk_level IN ('low', 'moderate', 'high', 'critical')),
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolution_outcome TEXT,
    graph_node_id TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_risk_flags_student ON risk_flags (student_id, status, created_at DESC);
CREATE INDEX idx_risk_flags_institution ON risk_flags (institution_id, status);
CREATE INDEX idx_risk_flags_sync ON risk_flags (sync_status) WHERE sync_status != 'synced';

-- RLS policies
ALTER TABLE risk_flags ENABLE ROW LEVEL SECURITY;

-- Advisors see flags for students in their institution
CREATE POLICY "risk_flags_advisor_read" ON risk_flags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.institution_id = risk_flags.institution_id
            AND user_profiles.role IN ('advisor', 'institutional_admin', 'superadmin')
        )
    );

-- Students see only their own flags
CREATE POLICY "risk_flags_student_read" ON risk_flags
    FOR SELECT USING (
        risk_flags.student_id = auth.uid()
    );

-- System/advisor can update (acknowledge)
CREATE POLICY "risk_flags_advisor_update" ON risk_flags
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.institution_id = risk_flags.institution_id
            AND user_profiles.role IN ('advisor', 'institutional_admin', 'superadmin')
        )
    );

-- Only system can insert (via service role)
CREATE POLICY "risk_flags_system_insert" ON risk_flags
    FOR INSERT WITH CHECK (true);
```

### Neo4j — RiskFlag node (new)

```
Node: RiskFlag
Properties: id, risk_level, confidence, p_fail, status, created_at
Relationship: (Student)-[:HAS_RISK_FLAG]->(RiskFlag)
```

```cypher
-- Create RiskFlag node with dual-write
CREATE (rf:RiskFlag {
    id: $id,
    risk_level: $risk_level,
    confidence: $confidence,
    p_fail: $p_fail,
    status: 'created',
    created_at: datetime()
})
WITH rf
MATCH (s:Student {supabase_auth_id: $student_id})
CREATE (s)-[:HAS_RISK_FLAG]->(rf)
RETURN rf.id AS graph_node_id
```

## 5. API Contract (complete request/response)

### GET /api/risk/flags

**Role access:** advisor (own institution), superadmin, institutional_admin
**Auth:** Bearer token

**Query params:**
- `institution_id` (string, optional): Filter by institution
- `student_id` (string, optional): Filter by student
- `risk_level` (string, optional): Filter by level
- `status` (string, optional): Filter by status
- `page` (int, default=1), `limit` (int, default=20)

**Response (200):**
```json
{
    "data": {
        "flags": [
            {
                "id": "flag-uuid-001",
                "student_id": "student-uuid-123",
                "student_name": "Marcus Williams",
                "institution_id": "inst-uuid-001",
                "risk_level": "critical",
                "confidence": 0.91,
                "p_fail": 0.78,
                "top_3_root_causes": [
                    {"concept_id": "acid-base", "concept_name": "Acid-Base Physiology", "p_mastered": 0.15, "impact_score": 5},
                    {"concept_id": "renal-tubular", "concept_name": "Renal Tubular Function", "p_mastered": 0.22, "impact_score": 3},
                    {"concept_id": "electrolytes", "concept_name": "Electrolyte Balance", "p_mastered": 0.28, "impact_score": 2}
                ],
                "status": "created",
                "created_at": "2026-02-19T02:00:00Z"
            }
        ],
        "meta": {
            "page": 1,
            "limit": 20,
            "total": 6,
            "total_pages": 1
        }
    },
    "error": null
}
```

### PATCH /api/risk/flags/:id

**Role access:** advisor (own institution), superadmin
**Auth:** Bearer token

**Request body (acknowledge):**
```json
{
    "status": "acknowledged",
    "acknowledged_by": "advisor-uuid-456"
}
```

**Request body (resolve):**
```json
{
    "status": "resolved",
    "resolution_outcome": "improved"
}
```

**Response (200):**
```json
{
    "data": {
        "id": "flag-uuid-001",
        "status": "acknowledged",
        "acknowledged_by": "advisor-uuid-456",
        "acknowledged_at": "2026-02-19T10:15:00Z"
    },
    "error": null
}
```

**Error responses:**
- 404: Flag not found
- 403: Not authorized for this institution
- 400: Invalid status transition

## 6. Frontend Spec

No frontend in this story. Flags are consumed by:
- STORY-AD-5 (Advisor Dashboard) — flag list and badge count
- STORY-AD-6 (Student Alert View) — student-facing alert banner

## 7. Files to Create (exact paths, implementation order)

| # | Path | Layer | Purpose |
|---|------|-------|---------|
| 1 | `packages/python-api/src/models/risk_flag_types.py` | Types | Risk flag Pydantic models |
| 2 | `packages/python-api/src/models/risk_flag.py` | Model | Risk flag domain model |
| 3 | `packages/python-api/src/repositories/risk_flag_repository.py` | Repository | Dual-write Supabase + Neo4j |
| 4 | `packages/python-api/src/services/risk_flag_service.py` | Service | Dedup, escalation, CRUD |
| 5 | `packages/python-api/src/jobs/risk_prediction_job.py` | Job | Inngest daily cron |
| 6 | `packages/python-api/src/routes/risk_flags.py` | Route | GET list, PATCH acknowledge |
| 7 | `packages/python-api/tests/test_risk_flag_service.py` | Test | Service tests |
| 8 | `packages/python-api/tests/test_risk_prediction_job.py` | Test | Job tests |

**Supabase migration (via MCP):**
- `create_risk_flags_table` — creates risk_flags table with RLS

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | What It Provides |
|-------|------|--------|-----------------|
| STORY-AD-1 (GNN Risk Model) | advisor | NOT STARTED | Risk predictions |
| STORY-AD-2 (Root-Cause Tracing) | advisor | NOT STARTED | Root cause data for flags |
| STORY-AD-3 (Trajectory Analysis) | advisor | NOT STARTED | Trajectory data for flags |
| STORY-ST-1 (FastAPI Scaffold) | student | NOT STARTED | packages/python-api base |

### Python Packages
- `neo4j` (Python driver)
- `supabase` (Python client)
- `inngest` (Python SDK — scheduled functions)
- `fastapi`, `pydantic` >= 2.0

### Existing Files Needed
- Risk prediction service (STORY-AD-1)
- Root cause service (STORY-AD-2)
- Trajectory service (STORY-AD-3)
- DualWrite pattern implementation
- Supabase notifications table (for event emission stub)

## 9. Test Fixtures (inline)

```python
MOCK_RISK_FLAG = {
    "id": "flag-001",
    "student_id": "student-001",
    "institution_id": "inst-001",
    "risk_level": "high",
    "confidence": 0.85,
    "p_fail": 0.62,
    "top_3_root_causes": [
        {"concept_id": "c-001", "concept_name": "Acid-Base", "p_mastered": 0.15, "impact_score": 5},
        {"concept_id": "c-002", "concept_name": "Renal Tubular", "p_mastered": 0.22, "impact_score": 3},
        {"concept_id": "c-003", "concept_name": "Electrolytes", "p_mastered": 0.28, "impact_score": 2},
    ],
    "status": "created",
    "sync_status": "synced",
    "created_at": "2026-02-19T02:00:00Z",
    "updated_at": "2026-02-19T02:00:00Z"
}

# Existing unresolved flag (for deduplication test)
MOCK_EXISTING_FLAG = {
    "id": "flag-existing",
    "student_id": "student-001",
    "risk_level": "moderate",
    "status": "created",
    "created_at": "2026-02-18T02:00:00Z"
}

# Escalation: risk increased from moderate to critical
MOCK_ESCALATION = {
    "existing_flag": {"risk_level": "moderate", "status": "created"},
    "new_prediction": {"risk_level": "critical", "confidence": 0.92, "p_fail": 0.81},
    "expected_flag": {"risk_level": "critical", "previous_risk_level": "moderate"}
}

# Deduplication: same student, same risk level, unresolved
MOCK_DUPLICATE = {
    "existing_flag": {"student_id": "student-002", "risk_level": "high", "status": "created"},
    "new_prediction": {"risk_level": "high"},
    "expected": "skip_flag_creation"
}

# Batch prediction results for job test
MOCK_BATCH_STUDENTS = [
    {"student_id": "s-001", "risk_level": "low", "p_fail": 0.10},
    {"student_id": "s-002", "risk_level": "moderate", "p_fail": 0.35},
    {"student_id": "s-003", "risk_level": "high", "p_fail": 0.55},
    {"student_id": "s-004", "risk_level": "critical", "p_fail": 0.85},
    {"student_id": "s-005", "risk_level": "low", "p_fail": 0.08},
]
# Expected: 2 flags created (high + critical only)

# Acknowledge request
MOCK_ACKNOWLEDGE = {
    "flag_id": "flag-001",
    "acknowledged_by": "advisor-001"
}
```

## 10. API Test Spec (pytest — PRIMARY)

```python
# tests/test_risk_flag_service.py
class TestRiskFlagService:
    def test_create_flag_for_high_risk_student(self):
        """Creates flag for risk_level='high' with dual-write"""
    def test_create_flag_for_critical_risk_student(self):
        """Creates flag for risk_level='critical'"""
    def test_skip_flag_for_low_risk_student(self):
        """Does NOT create flag for risk_level='low'"""
    def test_skip_flag_for_moderate_risk_student(self):
        """Does NOT create flag for risk_level='moderate'"""
    def test_deduplication_same_risk_level(self):
        """Skip if unresolved flag with same risk level exists"""
    def test_escalation_upgrades_severity(self):
        """Existing moderate flag upgraded to critical when prediction escalates"""
    def test_escalation_records_previous_level(self):
        """Escalated flag stores previous_risk_level"""
    def test_acknowledge_flag(self):
        """PATCH sets status=acknowledged, acknowledged_by, acknowledged_at"""
    def test_resolve_flag(self):
        """PATCH sets status=resolved, resolution_outcome, resolved_at"""
    def test_invalid_status_transition_rejected(self):
        """Cannot go from resolved back to created"""
    def test_dual_write_supabase_then_neo4j(self):
        """Flag inserted in Supabase first, then Neo4j node created"""
    def test_neo4j_failure_keeps_sync_pending(self):
        """sync_status stays 'pending' if Neo4j write fails"""
    def test_list_flags_with_pagination(self):
        """GET returns paginated flag list with meta"""
    def test_list_flags_filtered_by_institution(self):
        """Advisor only sees flags for their institution"""
    def test_notification_event_emitted(self):
        """at_risk_alert notification event emitted for new flags"""

# tests/test_risk_prediction_job.py
class TestRiskPredictionJob:
    def test_daily_job_processes_all_institutions(self):
        """Batch prediction runs for each institution's active students"""
    def test_daily_job_creates_flags_for_high_critical(self):
        """Only high/critical predictions generate flags"""
    def test_daily_job_skips_duplicate_flags(self):
        """Existing unresolved flags are not duplicated"""
    def test_daily_job_reports_summary(self):
        """Job returns DailyPredictionResult with counts"""
```

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not applicable — backend pipeline with no UI.

## 12. Acceptance Criteria

1. Scheduled Inngest job runs daily at 2:00 AM UTC
2. Batch predicts risk for all active students per institution
3. Generates risk flags only for 'high' or 'critical' classifications
4. Flag record includes: student_id, risk_level, confidence, top_3_root_causes, created_at
5. Flag deduplication: no duplicate flag if unresolved flag exists at same level
6. Flag escalation: upgrades severity if risk level increased, stores previous_risk_level
7. Dual-write: Supabase risk_flags first → Neo4j (Student)-[:HAS_RISK_FLAG]->(RiskFlag) second
8. sync_status follows DualWrite pattern (pending → synced/failed)
9. Emits at_risk_alert event for notification system (stub)
10. GET /api/risk/flags returns paginated, filterable flag list
11. PATCH /api/risk/flags/:id allows acknowledge and resolve transitions
12. Flag lifecycle: created → acknowledged → resolved
13. All tests pass with >= 80% coverage

## 13. Source References

| Claim | Source |
|-------|--------|
| DualWrite pattern | [ARCHITECTURE_v10 §15.1] |
| Inngest scheduled functions | [ARCHITECTURE_v10 §3.5] |
| at_risk_alert notification type | [SUPABASE_DDL §notifications table, ARCHITECTURE_v10 §11.2] |
| Risk thresholds (P(fail) bands) | [S-AD-44-1 §Notes] |
| Flag lifecycle: created→acknowledged→resolved | [S-AD-44-4 §Notes] |
| Deduplication and escalation | [S-AD-44-4 §AC] |
| Neo4j HAS_RISK_FLAG relationship | [S-AD-44-4 §AC] |

## 14. Environment Prerequisites

- Python 3.11+ with inngest SDK
- Supabase project running (risk_flags migration applied)
- Neo4j Aura connection
- Risk prediction service (STORY-AD-1), root cause service (STORY-AD-2), trajectory service (STORY-AD-3) all operational
- Inngest dev server for cron job testing

## 15. Figma Make Prototype (Optional)

Not applicable — no UI in this story.
