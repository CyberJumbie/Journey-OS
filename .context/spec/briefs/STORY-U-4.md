# STORY-U-4: Seed Script Infrastructure

**Epic:** E-16 (Framework Seeding)
**Feature:** F-08 (Framework Management)
**Sprint:** 1
**Lane:** universal (P0)
**Size:** S
**Old ID:** S-U-16-2

---

## User Story
As a **platform engineer**, I need an idempotent MERGE-based seeding scaffold so that framework data can be loaded into Neo4j without creating duplicates on repeated runs.

## Acceptance Criteria
- [ ] `pnpm kg:seed` CLI command registered in root package.json
- [ ] SeedRunner service orchestrates seeding across all frameworks
- [ ] Each framework has a dedicated seeder class implementing a common Seeder interface
- [ ] All Cypher uses MERGE (not CREATE) to ensure idempotency
- [ ] Seed script is re-runnable: running twice produces no duplicates
- [ ] Unique constraints verified before seeding begins
- [ ] Console output logs node counts per framework after completion
- [ ] Error handling: partial failures do not corrupt existing data

## Reference Screens
> **None** -- backend-only story (CLI tooling and seed infrastructure).

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/frameworks/seeder.types.ts` |
| Service | apps/server | `src/services/seed/seed-runner.service.ts`, `src/services/seed/base-seeder.ts` |
| Scripts | apps/server | `scripts/seed-frameworks.ts` |
| Config | root | `package.json` (kg:seed script) |

## Database Schema

**Neo4j (idempotent MERGE pattern):**
```cypher
MERGE (n:USMLE_System {framework_id: $id})
ON CREATE SET n += $props
ON MATCH SET n.updated_at = timestamp()
```

No Supabase schema changes.

## API Endpoints
No API endpoints. This is a CLI script invoked via `pnpm kg:seed`.

## Dependencies
- **Blocked by:** STORY-U-2 (Framework Data Models)
- **Blocks:** STORY-U-7 (USMLE Seed Data), STORY-U-12 (Remaining Framework Seeds)
- **Cross-lane:** none

## Testing Requirements
- 4 API tests: SeedRunner orchestration, BaseSeeder MERGE pattern, idempotency verification, error handling on partial failure
- 0 E2E tests

## Implementation Notes
- Constructor DI for Neo4j driver instance into SeedRunner and each seeder.
- BaseSeeder abstract class with `seed()` and `verify()` methods.
- MERGE pattern: `MERGE (n:USMLE_System {framework_id: $id}) ON CREATE SET n += $props ON MATCH SET n.updated_at = timestamp()`.
- Transaction batching: batch MERGE statements in groups of 50 to avoid memory pressure.
- OOP with private `#fields` (JS private syntax).
- Named exports only.
- SeedRunner should accept an array of Seeder instances and execute them in order.
- Console output should use structured logging with node counts per framework.
