# Plan: STORY-U-2 — Framework Data Models

## Status: AWAITING APPROVAL

## Codebase State
Depends on `packages/types` and `apps/server` workspaces existing. If STORY-U-1 runs first, Phase 0 scaffolding is already done. If U-2 runs first or in parallel, the frameworks directory is the only new structure needed.

---

## Tasks (implementation order)

### Phase 1: Types — Base + Union Types
| # | Task | File Path |
|---|------|-----------|
| 1 | FrameworkId union, Neo4jFrameworkLabel union (15), FrameworkRelationshipType union, BaseFrameworkNode interface | `packages/types/src/frameworks/framework-node.types.ts` |

### Phase 2: Types — Framework-Specific Interfaces (8 files)
| # | Task | File Path |
|---|------|-----------|
| 2 | USMLESystem, USMLEDiscipline, USMLETask, USMLETopic | `packages/types/src/frameworks/usmle.types.ts` |
| 3 | LCMEStandard, LCMEElement | `packages/types/src/frameworks/lcme.types.ts` |
| 4 | ACGMEDomain, ACGMESubdomain | `packages/types/src/frameworks/acgme.types.ts` |
| 5 | AAMCDomain, AAMCCompetency | `packages/types/src/frameworks/aamc.types.ts` |
| 6 | UMECompetency, UMESubcompetency | `packages/types/src/frameworks/ume.types.ts` |
| 7 | EPAActivity | `packages/types/src/frameworks/epa.types.ts` |
| 8 | BloomLevelNode | `packages/types/src/frameworks/bloom.types.ts` |
| 9 | MillerLevelNode | `packages/types/src/frameworks/miller.types.ts` |

### Phase 3: Types — Aggregation
| # | Task | File Path |
|---|------|-----------|
| 10 | FrameworkNode discriminated union, FrameworkLabelMap interface | `packages/types/src/frameworks/framework-node.types.ts` (append) |
| 11 | Barrel re-export from all 9 type files | `packages/types/src/frameworks/index.ts` |
| 12 | Add `export * from './frameworks'` to root barrel | `packages/types/src/index.ts` (edit) |

### Phase 4: Model Layer
| # | Task | File Path |
|---|------|-----------|
| 13 | InvalidFrameworkNodeError extending DomainError | `apps/server/src/errors/framework.errors.ts` |
| 14 | FrameworkNodeModel class — private fields, public getters, toDTO(), toNeo4jProperties(), neo4jLabel getter, constructor validation | `apps/server/src/models/framework-node.model.ts` |

### Phase 5: Tests
| # | Task | File Path |
|---|------|-----------|
| 15 | Test fixtures for all 15 node types | `packages/types/src/frameworks/__tests__/framework-nodes.fixtures.ts` |
| 16 | Framework type validation tests | `packages/types/src/frameworks/__tests__/framework-types.test.ts` |
| 17 | FrameworkNodeModel tests (construction, toDTO, toNeo4jProperties, labels, validation errors) | `apps/server/src/models/__tests__/framework-node.model.test.ts` |

---

## Implementation Order
Types (base → specific → union/barrel) → Error class → Model → Tests

## Patterns to Follow
- OOP: private fields, public getters, constructor DI (CODE_STANDARDS SS 3.1)
- Custom errors extend DomainError (CODE_STANDARDS SS 3.4)
- Named exports only (CODE_STANDARDS SS 4.4)
- SCREAMING_SNAKE_CASE for Neo4j labels with acronym prefix; PascalCase for single-concept labels (CLAUDE.md)
- If STORY-U-1 has already created `base.errors.ts` with `DomainError`, reuse it. Otherwise create it here.

## Testing Strategy
- **API tests (vitest):** 2 test suites
  - `framework-types.test.ts` — 15 fixtures satisfy interfaces, union counts, BaseFrameworkNode props, FrameworkLabelMap compile-time checks
  - `framework-node.model.test.ts` — construction for all 15 types, toDTO(), toNeo4jProperties() (no undefined values, array serialization), neo4jLabel (SCREAMING_SNAKE vs PascalCase), InvalidFrameworkNodeError throws
- **E2E:** None (types + model only, no UI or API)

## Figma Make
- [x] Code directly (no UI)

## Risks / Edge Cases
- **Fixture path in tests** — The brief's test imports reference `../../../../test/fixtures/...` but it's cleaner to co-locate fixtures in `__tests__/`. Plan uses `__tests__/framework-nodes.fixtures.ts` instead.
- **DomainError dependency** — If U-1 hasn't run yet, we need to create `base.errors.ts` ourselves. The plan includes `InvalidFrameworkNodeError` extending `DomainError` in its own error file.
- **neo4j-driver types** — `toNeo4jProperties()` returns `Record<string, unknown>` (no neo4j-driver dependency needed at this stage). Neo4j driver import can be deferred to the repository layer (STORY-U-4).
- **FrameworkNode union vs FrameworkNodeModel class** — The union type (`FrameworkNode`) is the interface-level discriminated union. The `FrameworkNodeModel` class is the domain model that wraps any framework node. These are different things — the union is in `packages/types`, the class is in `apps/server`.

## Acceptance Criteria (verbatim from brief)
- AC-1: BaseFrameworkNode with id, name, description?, framework, level?
- AC-2: All 4 USMLE interfaces matching NODE_REGISTRY
- AC-3: Both LCME interfaces with number, title
- AC-4: ACGME interfaces with code, parent_domain
- AC-5: AAMC interfaces with code, parent_domain
- AC-6: UME interfaces with code, do_specific
- AC-7: EPAActivity with number: number, title: string
- AC-8: BloomLevelNode with level: 1|2|3|4|5|6, action_verbs
- AC-9: MillerLevelNode with level: 1|2|3|4
- AC-10: Neo4jFrameworkLabel with all 15 canonical labels
- AC-11: FrameworkLabelMap maps all 15 labels to interfaces
- AC-12: FrameworkNodeModel with OOP pattern
- AC-13: toDTO() returns plain object
- AC-14: toNeo4jProperties() returns flat Record with no undefined
- AC-15: neo4jLabel returns correct casing
- AC-16: Constructor throws InvalidFrameworkNodeError for invalid input
- AC-17: Named exports only
- AC-18: Barrel file re-exports all 9 type files
- AC-19: pnpm typecheck passes
- AC-20: 15 idempotent unique constraints documented
