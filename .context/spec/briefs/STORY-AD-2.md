# STORY-AD-2: Root-Cause Tracing

**Epic:** E-44 (Risk Prediction Engine)
**Feature:** F-21
**Sprint:** 37
**Lane:** advisor (P5)
**Size:** M
**Old ID:** S-AD-44-3

---

## User Story
As a **system**, I need to traverse the prerequisite graph to identify root-cause concepts behind a student's struggles so that advisors can recommend targeted remediation instead of generic study advice.

## Acceptance Criteria
- [ ] Given a struggling concept, traverse prerequisite chain to find unmastered prerequisites
- [ ] Neo4j Cypher query: follow (Concept)-[:PREREQUISITE_OF]->(Concept) relationships
- [ ] Depth limit: 5 levels to prevent unbounded traversal
- [ ] Root cause = deepest unmastered concept in the prerequisite chain
- [ ] Support multiple struggling concepts: return unified root-cause set (deduplicated)
- [ ] Output: ordered list of root causes ranked by impact (number of downstream concepts affected)
- [ ] Impact score: count of downstream concepts blocked by this root cause
- [ ] API endpoint: GET /api/risk/root-cause/:studentId
- [ ] Visualization data: return chain paths for UI rendering (node-link format)
- [ ] Cache results with 1-hour TTL (root causes don't change rapidly)
- [ ] Performance: root-cause trace for a single student completes in < 2 seconds

## Reference Screens
> **None** -- backend service story. Output consumed by STORY-AD-5 (Advisor Dashboard) and STORY-AD-7 (Intervention Recommendations).

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/python-api | `src/models/root_cause_types.py` |
| Algorithm | packages/python-api | `src/algorithms/root_cause_tracer.py` |
| Service | packages/python-api | `src/services/root_cause_service.py` |
| Route | packages/python-api | `src/routes/root_cause.py` |
| Tests | packages/python-api | `tests/test_root_cause_tracer.py` |
| Tests | packages/python-api | `tests/test_root_cause_service.py` |

## Database Schema

**Neo4j (read-only queries -- no new schema):**
```cypher
// Prerequisite graph traversal query
MATCH path = (root:Concept)-[:PREREQUISITE_OF*1..5]->(target:Concept)
WHERE target.id IN $struggling_concept_ids
WITH root, target, path, length(path) AS depth
// Join with student mastery to filter unmastered roots
MATCH (student:Student {id: $student_id})-[:HAS_MASTERY]->(root)
WHERE root.mastery_level < $mastery_threshold
RETURN root, collect(DISTINCT target) AS affected_concepts,
       count(DISTINCT target) AS impact_score
ORDER BY impact_score DESC
```

**Supabase (cache table):**
```sql
CREATE TABLE root_cause_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  root_causes JSONB NOT NULL,        -- array of {concept_id, name, impact_score, chain_paths}
  struggling_concepts JSONB NOT NULL, -- input concepts used for this trace
  computed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,    -- computed_at + 1 hour
  institution_id UUID NOT NULL REFERENCES institutions(id)
);

CREATE INDEX idx_root_cause_cache_student ON root_cause_cache(student_id, expires_at DESC);
```

## API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/risk/root-cause/:studentId` | Get root-cause analysis for student | advisor, institutional_admin |
| GET | `/api/risk/root-cause/:studentId/chain` | Get full prerequisite chain paths (for visualization) | advisor, institutional_admin |

## Dependencies
- **Blocked by:** STORY-AD-1 (GNN risk model identifies struggling concepts), Student BKT mastery data (E-40, S-ST-40-3)
- **Blocks:** STORY-AD-7 (Intervention Recommendation Engine needs root causes)
- **Cross-epic:** Reuses prerequisite graph from curriculum mapping (E-09)

## Testing Requirements
- 6 API tests: prerequisite chain traversal with depth limit, root-cause ranking by impact score, multiple struggling concepts deduplication, cache hit/miss behavior, empty prerequisite chain handling, auth guard on endpoint
- 0 E2E tests

## Implementation Notes
- Neo4j Cypher variable-length path pattern `[:PREREQUISITE_OF*1..5]` enforces depth limit at the query level.
- Join mastery data from BKT: filter traversal results by student's mastery state. A concept is "unmastered" if mastery_level < 0.4 (configurable threshold).
- Root cause may be a foundational science concept (e.g., cell biology) affecting multiple clinical topics -- this is the primary insight for advisors.
- Cache in Supabase with TTL; root causes shift slowly as mastery changes. Cache key is (student_id + sorted struggling_concept_ids hash).
- Chain path visualization data uses node-link format: `{ nodes: [{id, name, mastery}], edges: [{source, target, strength}] }` suitable for D3.js rendering.
- Impact score is the count of distinct downstream concepts that are blocked by the unmastered root concept. Higher impact = higher priority for remediation.
