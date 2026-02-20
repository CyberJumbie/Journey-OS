# STORY-F-70: Item Recommendation Engine

**Epic:** E-26 (Blueprint & Assembly Engine)
**Feature:** F-12
**Sprint:** 29
**Lane:** faculty (P3)
**Size:** L
**Old ID:** S-F-26-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need the system to recommend items that maximize blueprint coverage so that I can efficiently build exams that meet all distribution targets.

## Acceptance Criteria
- [ ] Algorithm accepts blueprint + item bank and returns ranked item list
- [ ] Coverage-maximizing greedy selection: prioritize items filling largest dimension gaps
- [ ] Multi-dimensional coverage: simultaneously optimize across USMLE system, discipline, and Bloom level
- [ ] Constraint: no duplicate concepts in selected set (configurable via `allowDuplicateConcepts` flag)
- [ ] Constraint: respect item difficulty distribution from blueprint (easy/medium/hard ratio)
- [ ] Output includes overall coverage score (0-100%) and per-dimension gap analysis
- [ ] Support for manual overrides: lock specific items (must include), exclude others (must not include)
- [ ] Performance: recommend from 5000-item bank in < 3 seconds
- [ ] Results paginated with coverage improvement score per additional item
- [ ] Unit tests for algorithm correctness with known inputs/outputs
- [ ] 12-16 API tests: algorithm correctness, lock/exclude, performance, edge cases (empty bank, full coverage)

## Reference Screens
No UI screen. Backend algorithm and API only. Results consumed by Exam Builder UI (STORY-F-71).

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | N/A |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/exam/recommendation.types.ts` |
| Algorithm | apps/server | `src/services/exam/algorithms/coverage-optimizer.ts` |
| Service | apps/server | `src/services/exam/item-recommendation.service.ts` |
| Controller | apps/server | `src/controllers/exam/item-recommendation.controller.ts` |
| Routes | apps/server | `src/routes/exam/item-recommendation.routes.ts` |
| Tests | apps/server | `src/services/exam/__tests__/coverage-optimizer.test.ts`, `src/services/exam/__tests__/item-recommendation.service.test.ts` |

## Database Schema
No new tables. Reads from:
- `blueprints` -- target distributions (system_targets, discipline_targets, bloom_targets, difficulty_targets)
- `assessment_items` -- candidate items with their metadata (difficulty, bloom_level, tags for system/discipline, course_id)

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/blueprints/:id/recommend` | Get recommended items for blueprint |

Request body:
```json
{
  "lockedItemIds": ["uuid1", "uuid2"],
  "excludedItemIds": ["uuid3"],
  "allowDuplicateConcepts": false,
  "maxResults": 50
}
```

Response:
```json
{
  "recommendations": [
    { "itemId": "uuid", "coverageGain": 2.5, "dimensions": { "system": "Cardiovascular", "bloom": "Apply", "difficulty": "Medium" } }
  ],
  "overallCoverage": 85.2,
  "dimensionCoverage": {
    "system": [{ "name": "Cardiovascular", "actual": 28, "target": 25, "status": "pass" }],
    "bloom": [...],
    "difficulty": [...]
  },
  "gaps": [{ "dimension": "system", "category": "Respiratory", "deficit": 3, "severity": "warning" }]
}
```

## Dependencies
- **Blocks:** STORY-F-71 (exam builder consumes recommendations), STORY-F-72 (gap flagging reuses coverage computation)
- **Blocked by:** STORY-F-65 (blueprint model exists)
- **Cross-lane:** Reads from item bank (E-25)

## Testing Requirements
- 12-16 API tests: greedy selection picks highest-gap item first, multi-dimensional scoring correctness, locked items always included in coverage, excluded items never selected, difficulty ratio respected, no duplicate concepts when flag is false, duplicate concepts allowed when flag is true, empty item bank returns empty recommendations, already-full coverage returns no recommendations, performance test with 5000 mock items < 3s, coverage score calculation accuracy, pagination of results, gap analysis severity thresholds
- 0 E2E tests

## Implementation Notes
- Coverage optimizer uses a weighted greedy algorithm. Exact multi-dimensional set cover is NP-hard; greedy approximation is acceptable and performant.
- Multi-dimensional scoring: for each candidate item, compute the weighted sum of per-dimension coverage improvements. Weights from blueprint targets.
- Algorithm pseudocode:
  1. Initialize selected set with locked items
  2. Compute current coverage per dimension
  3. For each remaining candidate: score = sum(dimension_weight * coverage_gain_if_added)
  4. Select highest-scoring candidate, add to selected, update coverage
  5. Repeat until target count reached or no improvement possible
- Item metadata needed: USMLE system (from `tags` array), discipline (from `tags`), `bloom_level`, `difficulty`. Parse tags to extract system/discipline classification.
- Cache item metadata in memory for the duration of the recommendation request (avoid repeated DB reads).
- Neo4j graph queries may supplement item metadata: `(AssessmentItem)-[:TESTS]->(SubConcept)-[:BELONGS_TO]->(USMLE_System)`.
- Use `#private` fields in `CoverageOptimizer` class for internal state.
