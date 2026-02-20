# STORY-ST-10: Adaptive Item Selection

**Epic:** E-40 (BKT & IRT Engine)
**Feature:** F-19
**Sprint:** 31
**Lane:** student (P4)
**Size:** M
**Old ID:** S-ST-40-4

---

## User Story
As a **Student (Marcus Williams)**, I need the system to select the next practice item by targeting my weakest concepts while respecting prerequisite chains so that my practice sessions are maximally efficient for learning.

## Acceptance Criteria
- [ ] Item selection algorithm: weakest-concept-first with prerequisite awareness
- [ ] Query Neo4j prerequisite graph: `(Concept)-[:PREREQUISITE_OF]->(Concept)`
- [ ] If prerequisite concept not mastered, prioritize it over dependent concept
- [ ] Within a concept, select item with optimal difficulty (IRT Fisher information maximization)
- [ ] Fisher information function: I(theta) = a^2 * P * Q for item information
- [ ] Avoid recently shown items (exposure control: no repeat within 20 items)
- [ ] Concept diversity: rotate across weak concepts, don't over-drill one concept
- [ ] Response includes: item_id, concept_id, expected_difficulty, selection_rationale
- [ ] Performance: item selection in < 200ms including Neo4j traversal
- [ ] Fallback: random selection if all concepts mastered or item pool exhausted
- [ ] Prerequisite depth limit: 3 levels to prevent deep chain traversal

## Reference Screens
> No UI screens. This is a Python AI backend service.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/python-api | `src/models/adaptive_types.py` |
| Algorithm | packages/python-api | `src/algorithms/adaptive_selector.py` |
| Algorithm | packages/python-api | `src/algorithms/prerequisite_traversal.py` |
| Algorithm | packages/python-api | `src/algorithms/exposure_control.py` |
| Service | packages/python-api | `src/services/adaptive_selection_service.py` |
| Route | packages/python-api | `src/routes/adaptive.py` |
| Tests | packages/python-api | `tests/test_adaptive_selector.py` |
| Tests | packages/python-api | `tests/test_prerequisite_traversal.py` |
| Tests | packages/python-api | `tests/test_adaptive_selection_service.py` |
| Tests | packages/python-api | `tests/test_exposure_control.py` |

## Database Schema
No additional tables. Reads from:
- `student_mastery` (Supabase) — current mastery levels
- `item_parameters` (Supabase) — IRT calibrated parameters
- `student_responses` (Supabase) — recent items for exposure control
- Neo4j `(Concept)-[:PREREQUISITE_OF]->(Concept)` — prerequisite graph

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/adaptive/next-item/{session_id}` | Internal | Select next item for a session |
| POST | `/api/adaptive/precompute/{session_id}` | Internal | Precompute initial item queue for a session |

**Response shape:**
```typescript
{
  item_id: string;
  concept_id: string;
  expected_difficulty: number;
  rationale: string;  // e.g., "Weakest concept: Renal Pharmacology (mastery: 0.42)"
}
```

## Dependencies
- **Blocks:** STORY-ST-12 (practice launcher needs item selection)
- **Blocked by:** STORY-ST-1 (scaffold), STORY-ST-3 (mastery state), STORY-ST-4 (calibrated parameters)
- **Cross-epic:** None

## Testing Requirements
- **API Tests (70%):** Selects item from weakest concept when no prerequisites unmastered. Prioritizes prerequisite concept over dependent concept. Fisher information maximization selects item at correct difficulty. Exposure control prevents repeat within 20-item window. Concept diversity rotates across 3+ concepts. Fallback to random selection when all concepts mastered. Prerequisite traversal respects 3-level depth limit.
- **E2E (0%):** No E2E for backend algorithm.

## Implementation Notes
- Neo4j Cypher for prerequisite traversal: `MATCH path=(c:Concept)-[:PREREQUISITE_OF*1..3]->(target) WHERE target.id = $conceptId RETURN path`.
- Fisher information maximization: select item where student's estimated theta matches item difficulty (maximizes information gain).
- Exposure control: track shown items per session in-memory (Redis or session state). Query last 20 items from `student_responses` for cross-session control.
- Concept diversity: maintain a round-robin index across the top-N weakest concepts (N=3-5).
- Selection algorithm priority: (1) unmastered prerequisites, (2) weakest concept from scope, (3) max Fisher information within concept, (4) exposure control filter.
- All calls are internal service-to-service from Express. Express handles student auth.
