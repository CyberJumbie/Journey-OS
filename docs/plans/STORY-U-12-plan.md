# Plan: STORY-U-12 — Remaining Framework Seeds

## Brief vs Codebase Discrepancies (MUST RESOLVE)

The brief's data model and node counts conflict with the existing `Neo4jFrameworkLabel` type and `FRAMEWORK_CONSTRAINTS` established in U-2. **The existing codebase types are the source of truth.**

| Brief Label | Existing Label | Brief MERGE Key | Existing Constraint Key |
|-------------|---------------|-----------------|------------------------|
| `ACGME_Competency` | `ACGME_Domain` | `framework_id` | `code` |
| `ACGME_SubCompetency` | `ACGME_Subdomain` | `framework_id` | `code` |
| `AAMC_Domain` | `AAMC_Domain` + `AAMC_Competency` | `framework_id` | `code` |
| `UME_Objective` | `UME_Competency` + `UME_Subcompetency` | `framework_id` | `code` |
| `EPA_Activity` | `EPA` | `framework_id` | `number` |
| `BLOOM_Level` | `BloomLevel` | `framework_id` | `level` |
| `MILLER_Level` | `MillerLevel` | `framework_id` | `level` |

### Actual Node Counts (from source JSON files)

| Framework | Source File | Actual Nodes | Brief Claimed |
|-----------|-----------|-------------|---------------|
| LCME | lcme-standards.json | 105 (12 + 93) | 105 ✅ |
| ACGME | acgme-competencies.json | 36 (6 domains + 30 competencies) | 27 ❌ |
| AAMC | aamc-competencies.json | 8 (flat) | 55 ❌ |
| UME | Ume.json | 81 (8 domains + 13 EPAs + 60 sub) | 61 ❌ |
| EPA | Ume.json (13 EPAs) | 13 | 13 ✅ |
| Bloom | bloom-levels.json | 6 | 6 ✅ |
| Miller | miller-levels.json | 4 | 4 ✅ |

**Decision needed:** Use existing labels + constraints + actual source JSON data, not the brief's proposed types.

### EPA / UME Overlap

The 13 EPAs in `Ume.json` appear to be the same items that map to the `EPA` label. The `epa-ume-competencies.json` file is a separate cross-mapping structure (6 domains + 6 competencies with subcompetencies). Need to clarify:
- Do EPAs come from `Ume.json` competencies (13 items)?
- Does `epa-ume-competencies.json` seed additional nodes, or is it a mapping file only?

**Proposed approach:** Seed EPAs from `Ume.json` competencies (13 items). Seed UME_Competency/UME_Subcompetency from `epa-ume-competencies.json` (6 + ~70 subcompetencies). Skip the 8 UME domains (no matching Neo4j label exists).

---

## Tasks (Implementation Order)

### 1. Seed types (packages/types)
- Create `packages/types/src/frameworks/framework-seed.types.ts` — seed interfaces for all 7 frameworks
- Edit `packages/types/src/frameworks/index.ts` — re-export seed types
- **Must use existing labels from `Neo4jFrameworkLabel`**

### 2. Data files (7 files)
Each exports typed readonly arrays from the source JSON data:

| # | File | Source JSON | Node Count |
|---|------|-----------|------------|
| 2a | `apps/server/src/services/seed/data/lcme.data.ts` | lcme-standards.json | 12 standards + 93 elements |
| 2b | `apps/server/src/services/seed/data/acgme.data.ts` | acgme-competencies.json | 6 domains + 30 subdomains |
| 2c | `apps/server/src/services/seed/data/aamc.data.ts` | aamc-competencies.json | 8 competencies |
| 2d | `apps/server/src/services/seed/data/ume.data.ts` | epa-ume-competencies.json | TBD |
| 2e | `apps/server/src/services/seed/data/epa.data.ts` | Ume.json (competencies) | 13 EPAs |
| 2f | `apps/server/src/services/seed/data/bloom.data.ts` | bloom-levels.json | 6 levels |
| 2g | `apps/server/src/services/seed/data/miller.data.ts` | miller-levels.json | 4 levels |

### 3. Seeder classes (7 files)
Each extends `BaseSeeder`, follows USMLE pattern:

| # | File | Label | Key Pattern |
|---|------|-------|------------|
| 3a | `lcme-seeder.service.ts` | `LCME_Standard` | MERGE on `number`, HAS_ELEMENT rels |
| 3b | `acgme-seeder.service.ts` | `ACGME_Domain` | MERGE on `code`, HAS_SUBDOMAIN rels |
| 3c | `aamc-seeder.service.ts` | `AAMC_Competency` | MERGE on `code`, flat |
| 3d | `ume-seeder.service.ts` | `UME_Competency` | MERGE on `code`, HAS_SUBCOMPETENCY rels + MAPS_TO bridges |
| 3e | `epa-seeder.service.ts` | `EPA` | MERGE on `number`, flat |
| 3f | `bloom-seeder.service.ts` | `BloomLevel` | MERGE on `level`, flat |
| 3g | `miller-seeder.service.ts` | `MillerLevel` | MERGE on `level`, flat |

### 4. Register seeders
- Edit `apps/server/scripts/seed-frameworks.ts` — register 7 new seeders in order
- Order: USMLE → LCME → ACGME → AAMC → UME → EPA → Bloom → Miller
- UME must come after ACGME (MAPS_TO bridge)

### 5. API tests
- Create `apps/server/src/services/seed/__tests__/framework-seeders.test.ts`
- ~14 tests following USMLE test pattern (mock driver, verify node counts, MERGE queries)

## Implementation Order

Types → Data Files → Seeder Classes → Register in SeedRunner → API Tests

## Patterns to Follow

- `docs/solutions/seed-infrastructure-pattern.md` — BaseSeeder, executeBatch, verify, countNodes
- `apps/server/src/services/seed/usmle-seeder.service.ts` — reference implementation
- MERGE on constraint key (not `framework_id`) per existing `FRAMEWORK_CONSTRAINTS`
- `SeedNodeError[]` for mutable error accumulator (not `SeedResult["errors"]`)
- `vi.hoisted()` if needed for neo4j mocks

## Testing Strategy

- **API tests (~14):** One describe block per framework seeder, verifying:
  - Correct node count per label
  - Relationship creation (LCME HAS_ELEMENT, ACGME HAS_SUBDOMAIN, UME MAPS_TO)
  - MERGE query structure
  - SeedRunner registration order
  - Idempotency (running twice = same counts)
- **E2E:** None (CLI-only, no UI)

## Figma Make
- [ ] Not applicable (no UI)

## Risks / Edge Cases

1. **EPA/UME data overlap** — source files have overlapping data, need clear mapping
2. **AAMC has only 8 items** — brief expected 55, actual is 8 flat competencies
3. **ACGME has 36 items** — brief expected 27, actual is 6 domains + 30 subdomains
4. **UME MAPS_TO bridges** — require ACGME to be seeded first; verify ACGME node codes match
5. **Bloom verbs as array property** — Neo4j stores as native list, needs `SET n.verbs = $verbs`
6. **Miller assessment_methods** — source JSON has this array, store same as Bloom verbs

## Acceptance Criteria (adapted from brief, corrected for actual data)

1. LCME: 105 nodes seeded (12 standards + 93 elements) with `HAS_ELEMENT` relationships
2. ACGME: 36 nodes seeded (6 domains + 30 subdomains) with `HAS_SUBDOMAIN` relationships
3. AAMC: 8 competencies seeded (flat)
4. UME: competencies + subcompetencies seeded with `MAPS_TO` bridges to ACGME
5. EPA: 13 Entrustable Professional Activities seeded
6. Bloom: 6 cognitive levels seeded (Remember through Create) with verbs array
7. Miller: 4 competence levels seeded (Knows, Knows How, Shows How, Does)
8. All seeders use MERGE-based idempotent operations
9. Each seeder extends `BaseSeeder` and uses `protected get driver()`
10. `pnpm kg:seed` seeds all 8 frameworks in correct order
11. All API tests pass
