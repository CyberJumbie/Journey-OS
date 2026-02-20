# STORY-ST-4: IRT 3PL Calibration

**Epic:** E-40 (BKT & IRT Engine)
**Feature:** F-19
**Sprint:** 31
**Lane:** student (P4)
**Size:** L
**Old ID:** S-ST-40-2

---

## User Story
As a **Student (Marcus Williams)**, I need the system to calibrate item difficulty, discrimination, and guessing parameters using IRT so that adaptive practice selects questions at the right difficulty level for my ability.

## Acceptance Criteria
- [ ] 3PL model implementation: difficulty (b), discrimination (a), guessing (c) parameters
- [ ] Calibration algorithm: Marginal Maximum Likelihood Estimation (MMLE) via EM algorithm
- [ ] Input: item response matrix (student x item binary matrix)
- [ ] Output: calibrated parameters per item with standard errors
- [ ] Minimum response threshold: 100 responses per item before calibration
- [ ] Convergence criteria: parameter change < 0.001 or max 100 iterations
- [ ] Item fit statistics: infit, outfit MNSQ for quality assessment
- [ ] Flag poorly-fitting items (MNSQ outside 0.7-1.3 range)
- [ ] Store calibrated parameters in Supabase `item_parameters` table with timestamp
- [ ] Recalibration scheduling via Inngest (weekly or on-demand)
- [ ] Performance: calibrate 1000 items x 500 students in < 60 seconds
- [ ] Guessing parameter (c) constrained to [0, 0.35] for MCQs

## Reference Screens
> No UI screens. This is a Python AI/ML backend service.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/python-api | `src/models/irt_types.py` |
| Algorithm | packages/python-api | `src/algorithms/irt_3pl.py` |
| Algorithm | packages/python-api | `src/algorithms/irt_calibration.py` |
| Algorithm | packages/python-api | `src/algorithms/item_fit.py` |
| Service | packages/python-api | `src/services/irt_calibration_service.py` |
| Repository | packages/python-api | `src/repositories/item_parameter_repository.py` |
| Route | packages/python-api | `src/routes/irt.py` |
| Job | packages/python-api | `src/jobs/calibration_job.py` |
| Tests | packages/python-api | `tests/test_irt_3pl.py` |
| Tests | packages/python-api | `tests/test_irt_calibration_service.py` |
| Tests | packages/python-api | `tests/test_item_fit.py` |

## Database Schema
**Supabase tables:**

```sql
-- item_parameters: IRT 3PL calibrated parameters per assessment item
CREATE TABLE item_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES assessment_items(id),
  discrimination FLOAT NOT NULL DEFAULT 1.0,  -- a parameter
  difficulty FLOAT NOT NULL DEFAULT 0.0,       -- b parameter
  guessing FLOAT NOT NULL DEFAULT 0.2,         -- c parameter, constrained [0, 0.35]
  discrimination_se FLOAT,
  difficulty_se FLOAT,
  guessing_se FLOAT,
  infit_mnsq FLOAT,
  outfit_mnsq FLOAT,
  response_count INT DEFAULT 0,
  calibrated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(item_id)
);

-- student_responses: individual response records for calibration input
CREATE TABLE student_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id),
  student_id UUID NOT NULL REFERENCES auth.users(id),
  item_id UUID NOT NULL REFERENCES assessment_items(id),
  selected_option TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_responses_item ON student_responses(item_id);
CREATE INDEX idx_student_responses_student ON student_responses(student_id, created_at DESC);
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/irt/calibrate` | Internal (admin) | Batch calibration of item parameters |
| GET | `/api/irt/parameters/{item_id}` | Internal | Get calibrated parameters for an item |
| GET | `/api/irt/parameters` | Internal | Get parameters for multiple items (batch) |
| GET | `/api/irt/fit-report` | Internal (admin) | Item fit statistics report |

## Dependencies
- **Blocks:** STORY-ST-10 (item selection needs calibrated parameters)
- **Blocked by:** STORY-ST-1 (FastAPI scaffold), item bank with historical response data
- **Cross-epic:** Item parameters used by STORY-ST-7 (readiness calculation refinement)

## Testing Requirements
- **API Tests (70%):** 3PL probability function computes correctly for known inputs. MMLE-EM converges on synthetic data with known parameters. Item fit statistics flag known bad items. Guessing parameter stays within [0, 0.35] constraint. Calibration service correctly reads response matrix from Supabase.
- **E2E (0%):** No E2E for backend algorithm.

## Implementation Notes
- Use numpy/scipy for numerical computation; avoid PyTorch for this (not neural).
- MMLE-EM is the standard approach. Consider `py-irt` library or custom implementation for finer control.
- Item bank requirement: >= 500 calibrated items before adaptive testing activates for a concept area.
- 3PL item response function: P(correct | theta) = c + (1-c) / (1 + exp(-a*(theta-b))).
- Fisher information function for item selection: I(theta) = a^2 * P * Q * ((P-c)/(1-c))^2 / (P*Q).
- All embeddings are unrelated here; IRT is classical psychometrics, not embedding-based.
- Inngest job for weekly recalibration: trigger `irt/calibrate.requested`, process in background.
