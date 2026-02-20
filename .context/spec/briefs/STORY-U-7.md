# STORY-U-7: USMLE Seed Data

**Epic:** E-16 (Framework Seeding)
**Feature:** F-08 (Framework Management)
**Sprint:** 1
**Lane:** universal (P0)
**Size:** M
**Old ID:** S-U-16-3

---

## User Story
As a **platform engineer**, I need the USMLE framework seeded with 227 nodes in correct hierarchy so that curriculum mapping can reference organ systems, disciplines, physician tasks, and topics.

## Acceptance Criteria
- [ ] 227 USMLE nodes created across 4 hierarchy levels
- [ ] USMLE_System nodes seeded (e.g., Cardiovascular, Respiratory, etc.)
- [ ] USMLE_Discipline nodes seeded (e.g., Anatomy, Biochemistry, etc.)
- [ ] USMLE_Task nodes seeded (e.g., Health Promotion, Diagnosis, etc.)
- [ ] USMLE_Topic leaf nodes seeded under appropriate parents
- [ ] Hierarchical relationships: (USMLE_System)-[:CONTAINS]->(child nodes)
- [ ] Each node has: framework_id, name, description, level, sort_order
- [ ] Seed data stored in structured TypeScript data files (not raw JSON)
- [ ] Running `pnpm kg:seed` includes USMLE seeding
- [ ] Node count verification: exactly 227 nodes after seeding
- [ ] 5 API tests: node count, hierarchy integrity, idempotency, unique constraints, relationship correctness

## Reference Screens
> **None** -- backend-only story (seed script and data files).

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Data | apps/server | `src/services/seed/data/usmle-systems.data.ts`, `src/services/seed/data/usmle-disciplines.data.ts`, `src/services/seed/data/usmle-tasks.data.ts`, `src/services/seed/data/usmle-topics.data.ts` |
| Service | apps/server | `src/services/seed/usmle-seeder.service.ts` |
| Tests | apps/server | `src/services/seed/__tests__/usmle-seeder.test.ts` |

## Database Schema

**Neo4j nodes created:**
```cypher
// ~10-15 USMLE_System nodes
MERGE (n:USMLE_System {framework_id: "usmle-sys-cardiovascular"})
ON CREATE SET n.name = "Cardiovascular System", n.description = "...", n.framework = "usmle", n.level = 1, n.sort_order = 1

// ~7-10 USMLE_Discipline nodes
MERGE (n:USMLE_Discipline {framework_id: "usmle-disc-anatomy"})
ON CREATE SET n.name = "Anatomy", ...

// ~8-10 USMLE_Task nodes
MERGE (n:USMLE_Task {framework_id: "usmle-task-diagnosis"})
ON CREATE SET n.name = "Diagnosis", ...

// ~190+ USMLE_Topic leaf nodes
MERGE (n:USMLE_Topic {framework_id: "usmle-topic-..."})
ON CREATE SET n.name = "...", ...

// Hierarchical relationships
MATCH (s:USMLE_System {framework_id: $parentId}), (d:USMLE_Discipline {framework_id: $childId})
MERGE (s)-[:CONTAINS]->(d)
```

## API Endpoints
No API endpoints. Data is loaded via `pnpm kg:seed` CLI command.

## Dependencies
- **Blocked by:** STORY-U-2 (Framework Data Models), STORY-U-4 (Seed Script Infrastructure)
- **Blocks:** STORY-U-12 (Remaining Framework Seeds)
- **Cross-lane:** STORY-IA-6 (Framework Browser queries USMLE hierarchy)

## Testing Requirements
- 5 API tests:
  1. Total node count equals 227 after seeding
  2. Hierarchy integrity (System -> Discipline -> Task -> Topic relationships exist)
  3. Idempotency (running seed twice produces same 227 nodes)
  4. Unique constraints prevent duplicate framework_ids
  5. Relationship correctness (parent-child links verified)
- 0 E2E tests

## Implementation Notes
- USMLE hierarchy: System > Discipline > Task > Topic. Not all branches go 4 levels deep.
- Data sourced from USMLE Step 1/Step 2 CK content outlines.
- Use typed data arrays, not raw JSON, so TypeScript catches structural errors at compile time.
- sort_order field enables consistent display ordering in the Framework Browser UI.
- UsmleSeeder extends BaseSeeder with `seed()` and `verify()` implementations.
- Constructor DI for Neo4j driver instance.
- Transaction batching in groups of 50 per BaseSeeder pattern.
