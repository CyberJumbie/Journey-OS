# STORY-ST-3: BKT Mastery Estimation

**Epic:** E-40 (BKT & IRT Engine)
**Feature:** F-19
**Sprint:** 31
**Lane:** student (P4)
**Size:** L
**Old ID:** S-ST-40-3

---

## User Story
As a **Student (Marcus Williams)**, I need the system to track my per-concept mastery using Bayesian Knowledge Tracing so that I can see which concepts I have mastered and which need more practice.

## Acceptance Criteria
- [ ] BKT model with 4 parameters per concept: P(L0), P(T), P(G), P(S)
- [ ] P(L0): prior probability of knowing concept before practice (default 0.1)
- [ ] P(T): probability of transitioning from unlearned to learned (default 0.2)
- [ ] P(G): probability of guessing correctly without knowing (default 0.25)
- [ ] P(S): probability of slipping — incorrect despite knowing (default 0.1)
- [ ] Real-time mastery update after each student response (< 100ms)
- [ ] Mastery threshold: P(L) >= 0.95 considered "mastered"
- [ ] Per-concept mastery state stored per student in Supabase `student_mastery` table
- [ ] Neo4j dual-write: `(Student)-[:HAS_MASTERY {level: float}]->(Concept)`
- [ ] Batch parameter fitting from historical response data (EM algorithm)
- [ ] Mastery history log for trend analysis (append-only `mastery_history` table)
- [ ] Performance: mastery update in < 100ms per response

## Reference Screens
> No UI screens. This is a Python AI/ML backend service.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/python-api | `src/models/bkt_types.py` |
| Algorithm | packages/python-api | `src/algorithms/bkt.py` |
| Algorithm | packages/python-api | `src/algorithms/bkt_parameter_fitting.py` |
| Service | packages/python-api | `src/services/bkt_mastery_service.py` |
| Repository | packages/python-api | `src/repositories/mastery_repository.py` |
| Route | packages/python-api | `src/routes/bkt.py` |
| Tests | packages/python-api | `tests/test_bkt.py` |
| Tests | packages/python-api | `tests/test_bkt_mastery_service.py` |
| Tests | packages/python-api | `tests/test_mastery_repository.py` |

## Database Schema
**Supabase tables:**

```sql
-- mastery_history: append-only log of mastery changes for trend analysis
CREATE TABLE mastery_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id),
  concept_id UUID NOT NULL,
  mastery_before FLOAT NOT NULL,
  mastery_after FLOAT NOT NULL,
  response_correct BOOLEAN NOT NULL,
  session_id UUID REFERENCES practice_sessions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mastery_history_student ON mastery_history(student_id, created_at DESC);
CREATE INDEX idx_mastery_history_concept ON mastery_history(student_id, concept_id, created_at DESC);

-- bkt_parameters: per-concept BKT parameters (fitted from data)
CREATE TABLE bkt_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id UUID NOT NULL UNIQUE,
  p_l0 FLOAT NOT NULL DEFAULT 0.1,
  p_t FLOAT NOT NULL DEFAULT 0.2,
  p_g FLOAT NOT NULL DEFAULT 0.25,
  p_s FLOAT NOT NULL DEFAULT 0.1,
  fitted_at TIMESTAMPTZ,
  sample_size INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Neo4j relationships:**
- `(Student)-[:HAS_MASTERY {level: float, updated_at: datetime}]->(Concept)` (upsert on each update)

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/bkt/update` | Internal (service-to-service) | Update mastery after a single response |
| GET | `/api/bkt/mastery/{student_id}` | Internal | Get all concept mastery levels for a student |
| GET | `/api/bkt/mastery/{student_id}/{concept_id}` | Internal | Get mastery for a specific concept |
| POST | `/api/bkt/fit` | Internal (admin) | Batch parameter fitting from historical data |

## Dependencies
- **Blocks:** STORY-ST-6 (replaces mock mastery), STORY-ST-10 (adaptive selection needs mastery state)
- **Blocked by:** STORY-ST-1 (FastAPI scaffold)
- **Cross-epic:** Feeds into student dashboard (E-42), risk prediction (E-44)

## Testing Requirements
- **API Tests (70%):** BKT update correctly computes P(L_n) given correct/incorrect response. Mastery reaches 0.95 threshold after sufficient correct responses. Parameter fitting converges within 100 iterations. Default parameters produce reasonable mastery trajectories. DualWrite updates both Supabase and Neo4j.
- **E2E (0%):** No E2E for backend algorithm.

## Implementation Notes
- BKT is a Hidden Markov Model; the forward algorithm computes P(L_n | observations_1..n).
- Update formula: P(L_n | correct) = P(L_{n-1}) * (1 - P(S)) / [P(L_{n-1}) * (1 - P(S)) + (1 - P(L_{n-1})) * P(G)], then P(L_n) = P(L_n|obs) + (1 - P(L_n|obs)) * P(T).
- DualWriteService pattern in Python: Supabase first, Neo4j second. If Neo4j fails, log warning but don't fail the request.
- Use numpy/scipy for EM parameter fitting. No deep learning needed — BKT is classical.
- Parameter fitting uses EM; initial parameters seeded from literature defaults above.
- Mastery history enables trend analysis for STORY-ST-8 (trend charts) and risk prediction for E-44.
- All internal endpoints are service-to-service calls from Express. Express validates student JWT, then calls Python service with trusted internal auth.
