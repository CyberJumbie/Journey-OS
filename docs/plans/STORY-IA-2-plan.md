# Plan: STORY-IA-2 — SLO Model & Repository

## Context

SLO is the course-scoped sibling of ILO (STORY-IA-4). Both share the `student_learning_objectives` table, differentiated by `scope` column (`'session'` for SLO, `'institutional'` for ILO). The ILO implementation is the exact pattern to mirror, with key differences:

- **Scope:** `scope='session'` (not `'institutional'`)
- **Scoping entity:** `course_id` (not `institution_id`)
- **Neo4j relationship:** `(Course)-[:HAS_SLO]->(SLO)` (not `(Institution)-[:DEFINES]->(ILO)`)
- **SLO interface adds `course_id`** field

Shared types (`BloomLevel`, `ObjectiveStatus`, `SyncStatus`, `VALID_BLOOM_LEVELS`) already exist in `packages/types/src/objective/objective-common.types.ts`. Error classes (`ObjectiveNotFoundError`, `DuplicateObjectiveCodeError`, `InvalidBloomLevelError`) already exist in `apps/server/src/errors/objective.error.ts`.

## Tasks (implementation order)

### 1. Create SLO types
- **File:** `packages/types/src/objective/slo.types.ts` (Create)
- Import `BloomLevel`, `ObjectiveStatus`, `SyncStatus` from `./objective-common.types`
- Export: `SLO`, `CreateSLORequest`, `UpdateSLORequest`, `SLOListQuery`, `SLOListResponse`
- `SLO` adds `course_id: string` field (ILO has no course_id)
- `CreateSLORequest` includes `course_id` (ILO doesn't — ILO is institution-scoped)
- `SLOListQuery` scopes by `course_id` (ILO scopes by `institution_id`)

### 2. Update objective barrel export
- **File:** `packages/types/src/objective/index.ts` (Edit)
- Add `export * from "./slo.types"` line
- CRITICAL: Re-read file after edit to verify exports aren't stripped by eslint hook

### 3. Rebuild types package
- Run `tsc -b packages/types/tsconfig.json` to emit `.d.ts` files

### 4. Apply Supabase migration (indexes)
- Via Supabase MCP `apply_migration`
- Name: `add_slo_indexes`
- 4 partial indexes filtered by `scope='session'`:
  - `idx_slo_code_per_course` — UNIQUE on `(course_id, code)`
  - `idx_slo_course_id_status` — on `(course_id, status)`
  - `idx_slo_institution_id` — on `(institution_id)`
  - `idx_slo_bloom_level` — on `(bloom_level)`

### 5. Update DuplicateObjectiveCodeError constructor
- **File:** `apps/server/src/errors/objective.error.ts` (Edit)
- Current constructor takes `(code: string, institutionId: string)` — designed for ILO only
- Change to `(code: string, scopeId: string)` with generic message: `Objective code "${code}" already exists in scope ${scopeId}`
- This allows both ILO (passing institutionId) and SLO (passing courseId) to use same error class
- Also update ILO service test if message assertion changes (it uses `.toThrow(DuplicateObjectiveCodeError)` class check — no message check, so safe)

### 6. Build SLO model class
- **File:** `apps/server/src/models/slo.model.ts` (Create)
- Mirror `ILOModel` exactly but add `#courseId` private field + getter
- `static fromRow()`, `toDTO()`, `toNeo4jProperties()`
- Constructor takes `SLO` interface

### 7. Build SLO repository
- **File:** `apps/server/src/repositories/slo.repository.ts` (Create)
- Mirror `ILORepository` with `SCOPE = "session"`
- `create(data, createdBy, institutionId)` — inserts with `scope='session'`, `course_id` from request
- `findById(id)` — filter by `scope='session'`
- `findByCourseId(query: SLOListQuery)` — paginated, scoped by `course_id` + `scope='session'`
- `update(id, data)` — scope-filtered
- `archive(id)` — scope-filtered
- `updateSyncStatus(id, syncStatus, graphNodeId)` — scope-filtered
- `existsByCode(code, courseId)` — uniqueness within course scope

### 8. Build SLO service with DualWrite
- **File:** `apps/server/src/services/objective/slo.service.ts` (Create)
- Mirror `ILOService` pattern
- `create(request, createdBy, institutionId)` — validate bloom, check code uniqueness within course, Supabase write, Neo4j DualWrite with `(Course)-[:HAS_SLO]->(SLO)` relationship
- `findById(id)` — repo call, throw `ObjectiveNotFoundError` if null
- `findByCourseId(query)` — delegate to repo
- `update(id, request)` — validate bloom if present, repo update, Neo4j update
- `archive(id)` — verify exists, repo archive, Neo4j archive

### 9. Write SLO service tests
- **File:** `apps/server/src/services/objective/__tests__/slo.service.test.ts` (Create)
- Mirror `ilo.service.test.ts` structure (~15 tests):
  - `create`: Supabase write, Neo4j HAS_SLO relationship, sync_status synced, sync_status failed, DuplicateObjectiveCodeError, InvalidBloomLevelError
  - `findById`: returns SLO, throws ObjectiveNotFoundError
  - `findByCourseId`: paginated, filters by status, filters by bloom_level
  - `update`: updates + Neo4j, throws ObjectiveNotFoundError
  - `archive`: sets archived + Neo4j, throws ObjectiveNotFoundError

### 10. Write SLO repository tests
- **File:** `apps/server/src/repositories/__tests__/slo.repository.test.ts` (Create)
- Mirror `ilo.repository.test.ts` structure (~5 tests):
  - `create`: inserts with `scope='session'` and `course_id`
  - `findByCourseId`: filters by `course_id` + `scope='session'`, pagination
  - `existsByCode`: true when exists, false when not, false for different course

### 11. Run tests
- `cd apps/server && npx vitest run src/services/objective/__tests__/slo.service.test.ts src/repositories/__tests__/slo.repository.test.ts`
- Verify all ~20 tests pass
- Run existing ILO tests to confirm no regressions: `npx vitest run src/services/objective/__tests__/ilo.service.test.ts src/repositories/__tests__/ilo.repository.test.ts`

### 12. Type check
- `cd apps/server && npx tsc --noEmit`

## Implementation Order

Types (1-3) → Migration (4) → Error update (5) → Model (6) → Repository (7) → Service (8) → Service Tests (9) → Repository Tests (10) → Run Tests (11) → Type Check (12)

## Patterns to Follow

- `docs/solutions/repository-pattern.md` — scope filtering, `updateSyncStatus()`, `.single()` on writes
- `docs/solutions/supabase-mock-factory.md` — separate chain mocks per operation
- ILO implementation (STORY-IA-4) — exact sibling pattern across all layers

## Testing Strategy

- **API tests (100%):** ~20 tests across service (15) + repository (5)
- **E2E:** No — backend-only story, no UI
- **Regression:** Re-run ILO tests after error class update

## Figma Make

- [x] Code directly (no UI in this story)

## Risks / Edge Cases

1. **DuplicateObjectiveCodeError constructor change** — ILO tests use `.toThrow(DuplicateObjectiveCodeError)` (class check, not message), so the constructor signature change is safe. Verify anyway.
2. **Barrel file export stripping** — eslint hook may strip exports from `objective/index.ts`. Re-read after edit.
3. **Shared table scope leakage** — every repository query MUST include `scope='session'` filter. Miss this and ILOs become visible as SLOs.
4. **Types package rebuild** — must run `tsc -b packages/types/tsconfig.json` before server can see new SLO types.

## Acceptance Criteria (verbatim from brief)

1. SLO types are exported from `@journey-os/types`
2. SLO model class uses `#field` JS private syntax with public getters
3. Repository filters by `scope='session'` on all queries (to exclude ILOs)
4. `create()` performs DualWrite: Supabase first, Neo4j second
5. Neo4j node has label `SLO` (not `StudentLearningObjective`)
6. Neo4j relationship `(Course)-[:HAS_SLO]->(SLO)` is created correctly
7. `sync_status` tracks DualWrite result: `'synced'` or `'failed'`
8. Code uniqueness is enforced within course scope
9. Bloom level is validated against 6 allowed values
10. Soft-delete via `archive()` sets `status='archived'`
11. All 19 API tests pass
