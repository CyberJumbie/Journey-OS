# STORY-AD-4: Risk Flag Generation

**Epic:** E-44 (Risk Prediction Engine)
**Feature:** F-21
**Sprint:** 37
**Lane:** advisor (P5)
**Size:** M
**Old ID:** S-AD-44-4

---

## User Story
As a **system**, I need to run scheduled risk predictions and generate alert flags for at-risk students so that advisors are notified proactively before students reach academic failure.

## Acceptance Criteria
- [ ] Scheduled prediction job via Inngest: runs daily at 2:00 AM UTC
- [ ] Batch predict risk for all active students in each institution
- [ ] Generate risk flags for students classified as 'high' or 'critical'
- [ ] Flag record: student_id, risk_level, confidence, top_3_root_causes, created_at
- [ ] Flag deduplication: don't create duplicate flag if existing unresolved flag at same or higher severity exists
- [ ] Flag escalation: upgrade flag severity if risk level increased since last flag
- [ ] Store flags in Supabase `risk_flags` table with dual-write to Neo4j
- [ ] Neo4j: (Student)-[:HAS_RISK_FLAG]->(RiskFlag) with properties
- [ ] Emit event for notification system (stub for E-34 integration)
- [ ] API endpoint: GET /api/risk/flags (list flags for advisor), PATCH /api/risk/flags/:id (acknowledge)
- [ ] Dashboard count: number of new/unacknowledged flags per advisor
- [ ] Flag lifecycle: created -> acknowledged -> resolved (with outcome tracking)

## Reference Screens
> **None** -- backend service story. Flags consumed by STORY-AD-5 (Advisor Dashboard) and STORY-AD-6 (Student Alert View).

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/advisor/risk-flag.types.ts`, `src/advisor/index.ts` |
| Types (Python) | packages/python-api | `src/models/risk_flag_types.py` |
| Model | packages/python-api | `src/models/risk_flag.py` |
| Repository | packages/python-api | `src/repositories/risk_flag_repository.py` |
| Service | packages/python-api | `src/services/risk_flag_service.py` |
| Job | packages/python-api | `src/jobs/risk_prediction_job.py` |
| Route | packages/python-api | `src/routes/risk_flags.py` |
| Express Route | apps/server | `src/modules/advisor/routes/risk-flags.routes.ts` |
| Express Controller | apps/server | `src/modules/advisor/controllers/risk-flags.controller.ts` |
| Express Service | apps/server | `src/modules/advisor/services/risk-flags.service.ts` |
| Tests | packages/python-api | `tests/test_risk_flag_service.py` |
| Tests | packages/python-api | `tests/test_risk_prediction_job.py` |
| Tests | apps/server | `src/modules/advisor/__tests__/risk-flags.service.test.ts` |

## Database Schema

**Supabase:**
```sql
CREATE TABLE risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  advisor_id UUID REFERENCES profiles(id),           -- assigned advisor (NULL if unassigned)
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high', 'critical')),
  confidence NUMERIC(5,4) NOT NULL,
  top_root_causes JSONB DEFAULT '[]'::jsonb,          -- [{concept_id, concept_name, impact_score}]
  status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'acknowledged', 'resolved')),
  outcome VARCHAR(20) CHECK (outcome IN ('improved', 'no_change', 'declined', 'withdrawn')),
  prediction_id UUID REFERENCES risk_predictions(id),
  escalated_from UUID REFERENCES risk_flags(id),      -- previous flag if escalated
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  institution_id UUID NOT NULL REFERENCES institutions(id),
  graph_node_id VARCHAR(255),
  sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_risk_flags_student ON risk_flags(student_id, status, created_at DESC);
CREATE INDEX idx_risk_flags_advisor ON risk_flags(advisor_id, status, created_at DESC);
CREATE INDEX idx_risk_flags_institution ON risk_flags(institution_id, status);
CREATE INDEX idx_risk_flags_unresolved ON risk_flags(institution_id) WHERE status != 'resolved';

-- Enable RLS
ALTER TABLE risk_flags ENABLE ROW LEVEL SECURITY;

-- Advisors see flags for students in their institution
CREATE POLICY "advisors_view_institution_flags" ON risk_flags
  FOR SELECT USING (
    institution_id IN (
      SELECT institution_id FROM profiles WHERE id = auth.uid() AND role IN ('advisor', 'institutional_admin')
    )
  );
```

**Neo4j:**
```cypher
(:Student)-[:HAS_RISK_FLAG]->(:RiskFlag {
  id: $flag_id,
  risk_level: "high",
  confidence: 0.82,
  status: "created",
  created_at: datetime()
})

(:RiskFlag)-[:CAUSED_BY]->(:Concept {id: $root_cause_concept_id})
```

## API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/risk/flags` | List risk flags (filtered by advisor's institution) | advisor, institutional_admin |
| GET | `/api/risk/flags/count` | Unacknowledged flag count for navigation badge | advisor |
| GET | `/api/risk/flags/:studentId` | Get flags for specific student | advisor, institutional_admin |
| PATCH | `/api/risk/flags/:id` | Update flag (acknowledge, resolve, add notes) | advisor |
| POST | `/api/risk/flags/generate` | Trigger flag generation job (system/admin) | system (Inngest), superadmin |

## Dependencies
- **Blocked by:** STORY-AD-1 (GNN model for predictions), STORY-AD-2 (root causes for flag detail), STORY-AD-3 (trajectory data)
- **Blocks:** STORY-AD-5 (Advisor Dashboard needs flags to display), STORY-AD-6 (Student Alert View)
- **Cross-epic:** Notification event connects to E-34 (notification system)

## Testing Requirements
- 8 API tests: flag creation from prediction, deduplication logic (same student + unresolved), escalation logic (severity upgrade), acknowledge flow, resolve flow with outcome, flag listing with institution filter, unacknowledged count endpoint, dual-write to Neo4j
- 0 E2E tests

## Implementation Notes
- DualWriteService pattern: Supabase `risk_flags` insert first, then Neo4j `RiskFlag` node + relationships, then update `sync_status = 'synced'`.
- Inngest scheduled function: `inngest.create_function(fn_id="risk-prediction-daily", trigger=inngest.TriggerCron(cron="0 2 * * *"))`.
- Flag lifecycle: `created` -> `acknowledged` (advisor sees it) -> `resolved` (advisor closes with outcome).
- Deduplication: before creating a new flag, check for existing unresolved flag for same student. If exists at same or higher severity, skip. If exists at lower severity, escalate (update existing flag's severity and link via `escalated_from`).
- Notification stub: emit `risk_flag.created` event that E-34 notification system will consume. For now, log the event.
- Rate limiting: max 1 flag per student per day to prevent advisor alert fatigue.
- Express server proxies to Python API for flag listing/updating, providing unified API surface for the web app.
- Use `supabase.rpc()` for atomic multi-table writes if flag creation involves updating related records.
