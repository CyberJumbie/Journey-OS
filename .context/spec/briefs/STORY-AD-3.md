# STORY-AD-3: Trajectory Analysis Service

**Epic:** E-44 (Risk Prediction Engine)
**Feature:** F-21
**Sprint:** 37
**Lane:** advisor (P5)
**Size:** M
**Old ID:** S-AD-44-2

---

## User Story
As a **system**, I need to analyze mastery trajectories over time to detect declining trends so that risk predictions incorporate temporal patterns beyond point-in-time snapshots.

## Acceptance Criteria
- [ ] Trajectory computation: linear regression slope per concept over sliding window
- [ ] Configurable window size: default 14 days, adjustable per institution
- [ ] Trend classification: improving (slope > 0.01), stable (-0.01 to 0.01), declining (slope < -0.01)
- [ ] Aggregate trajectory: overall student trend across all concepts (weighted average)
- [ ] Acceleration detection: declining faster than previous window (second derivative)
- [ ] Inactivity detection: no practice in > 7 days flagged as risk signal
- [ ] API endpoint: GET /api/risk/trajectory/:studentId
- [ ] Batch computation for all active students (Inngest job, runs nightly)
- [ ] Output feeds into GNN model as node features (trend_slope, acceleration, days_inactive)
- [ ] Performance: compute trajectory for 1000 students in < 30 seconds

## Reference Screens
> **None** -- backend service story. Output consumed by STORY-AD-1 (GNN features) and STORY-AD-5 (Advisor Dashboard sparklines).

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/python-api | `src/models/trajectory_types.py` |
| Algorithm | packages/python-api | `src/algorithms/trajectory_analysis.py` |
| Service | packages/python-api | `src/services/trajectory_service.py` |
| Route | packages/python-api | `src/routes/trajectory.py` |
| Job | packages/python-api | `src/jobs/trajectory_batch_job.py` |
| Tests | packages/python-api | `tests/test_trajectory_analysis.py` |
| Tests | packages/python-api | `tests/test_trajectory_service.py` |

## Database Schema

**Supabase (read from mastery_history, write to trajectory_snapshots):**
```sql
-- Read: mastery_history table (created by BKT service, E-40)
-- Contains: student_id, concept_id, mastery_level, recorded_at

CREATE TABLE trajectory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  concept_id UUID,                    -- NULL for aggregate trajectory
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  slope NUMERIC(8,6) NOT NULL,        -- linear regression slope
  trend VARCHAR(20) NOT NULL CHECK (trend IN ('improving', 'stable', 'declining')),
  acceleration NUMERIC(8,6),          -- second derivative (change in slope)
  days_inactive INTEGER DEFAULT 0,
  data_points INTEGER NOT NULL,       -- number of observations in window
  computed_at TIMESTAMPTZ DEFAULT now(),
  institution_id UUID NOT NULL REFERENCES institutions(id)
);

CREATE INDEX idx_trajectory_student ON trajectory_snapshots(student_id, computed_at DESC);
CREATE INDEX idx_trajectory_concept ON trajectory_snapshots(student_id, concept_id, computed_at DESC);
CREATE INDEX idx_trajectory_institution ON trajectory_snapshots(institution_id, computed_at DESC);
```

**No new Neo4j schema.** Trajectory data is fed to the GNN model (STORY-AD-1) as node features during graph construction.

## API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/risk/trajectory/:studentId` | Get trajectory analysis for student (all concepts + aggregate) | advisor, institutional_admin |
| GET | `/api/risk/trajectory/:studentId/:conceptId` | Get trajectory for specific concept | advisor, institutional_admin |
| POST | `/api/risk/trajectory/batch` | Trigger batch trajectory computation | system (Inngest) |

## Dependencies
- **Blocked by:** Student BKT mastery history data (E-40, S-ST-40-3) -- time-series mastery data is the input
- **Blocks:** None directly, but feeds into STORY-AD-1 (GNN model uses trajectory features)
- **Cross-epic:** Mastery history from BKT service (E-40)

## Testing Requirements
- 7 API tests: linear regression slope calculation, trend classification thresholds, acceleration (second derivative) detection, inactivity flagging (>7 days), aggregate trajectory computation, batch job chunking, insufficient data points handling (< 3 observations)
- 0 E2E tests

## Implementation Notes
- Uses numpy `polyfit(degree=1)` for linear regression and scipy for statistical significance testing.
- Trajectory data fetched from Supabase `mastery_history` table (time series of mastery level observations).
- Inactivity is a strong predictor of academic risk in medical education literature -- it gets its own feature column.
- Second derivative (acceleration) catches students whose decline is accelerating, enabling earlier intervention.
- Sliding window: compute slope over [now - window_size, now] and [now - 2*window_size, now - window_size] to get acceleration.
- Batch job runs via Inngest nightly: `inngest.create_function(fn_id="trajectory-batch-compute", trigger=inngest.TriggerCron(cron="0 1 * * *"))`.
- Minimum data points: require >= 3 observations in a window to compute slope. Fewer than 3 = "insufficient_data" status.
- Batch processes students in chunks of 100 with concurrent concept-level computations per student.
