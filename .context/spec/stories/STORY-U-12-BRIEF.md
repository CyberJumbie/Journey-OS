# STORY-U-12 Brief: Remaining Framework Seeds

## 0. Lane & Priority

```yaml
story_id: STORY-U-12
old_id: S-U-16-4
lane: universal
lane_priority: 0
within_lane_order: 12
sprint: 1
size: M
depends_on:
  - STORY-U-2 (universal) — Framework Data Models ✅ DONE
  - STORY-U-4 (universal) — Seed Script Infrastructure ✅ DONE
  - STORY-U-7 (universal) — USMLE Seed Data ✅ DONE
blocks:
  - STORY-IA-3 — Framework Browser
  - STORY-IA-6 — Curriculum Alignment Tool
  - STORY-IA-9 — Accreditation Dashboard
  - STORY-IA-10 — Program Outcomes Mapping
personas_served: [platform_engineer]
epic: E-16 (Framework Seeding)
feature: F-08 (Medical Education Frameworks)
user_flow: UF-08 (Framework Management)
```

## 1. Summary

Seed the **remaining 7 medical education frameworks** (LCME, ACGME, AAMC, UME, EPA, Bloom, Miller) into Neo4j with approximately 265 nodes total. Each framework has its own seeder class extending `BaseSeeder` (from U-4) and its own data file. After this story, running `pnpm kg:seed` seeds all 8 frameworks (USMLE + 7 new) in the correct dependency order, producing approximately 492 total nodes.

This is the final story in the E-16 Framework Seeding epic: U-2 (models) → U-4 (infrastructure) → U-7 (USMLE) → **U-12 (remaining 7)**.

Key constraints:
- All seeders use MERGE-based idempotent seeding (safe to run multiple times)
- Each seeder extends `BaseSeeder` and uses `protected get driver()` for Neo4j access
- UME bridge nodes create cross-framework relationships to ACGME (seed order matters)
- LCME maintains official numbering (1-12 standards with sub-elements)
- Bloom (6 nodes) and Miller (4 nodes) are flat lists — simplest seeders
- Node labels use SCREAMING_SNAKE_CASE with framework prefix (e.g., `LCME_Standard`, `ACGME_Competency`)

## 2. Task Breakdown

1. **Data files** — Create 7 data files with official framework content:
   - `lcme.data.ts` (105 nodes: 12 standards + 93 elements)
   - `acgme.data.ts` (27 nodes: 6 competencies + 21 sub-competencies)
   - `aamc.data.ts` (55 nodes: domains with hierarchy)
   - `ume.data.ts` (55 objectives + 6 bridge nodes)
   - `epa.data.ts` (13 EPAs)
   - `bloom.data.ts` (6 cognitive levels)
   - `miller.data.ts` (4 competence levels)
2. **Seeder classes** — Create 7 seeder classes extending `BaseSeeder`
3. **Register seeders** — Add all 7 to `SeedRunner` in correct order
4. **API tests** — 8 tests (one node-count verification per framework)

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/framework/framework-seed.types.ts
// Extends existing framework types from U-2

/** LCME Standard node */
export interface LCMEStandardSeed {
  readonly framework_id: string;    // e.g., "LCME-STD-01"
  readonly name: string;            // e.g., "Mission, Planning, Organization, and Integrity"
  readonly standard_number: number;  // 1-12
  readonly description: string;
}

/** LCME Element node */
export interface LCMEElementSeed {
  readonly framework_id: string;    // e.g., "LCME-EL-01.1"
  readonly name: string;
  readonly standard_number: number;  // parent standard
  readonly element_number: string;   // e.g., "1.1"
  readonly description: string;
}

/** ACGME Competency node */
export interface ACGMECompetencySeed {
  readonly framework_id: string;    // e.g., "ACGME-COMP-01"
  readonly name: string;            // e.g., "Patient Care"
  readonly description: string;
}

/** ACGME Sub-competency node */
export interface ACGMESubCompetencySeed {
  readonly framework_id: string;    // e.g., "ACGME-SUB-01.1"
  readonly name: string;
  readonly competency_id: string;   // parent competency framework_id
  readonly description: string;
}

/** AAMC Domain node */
export interface AAMCDomainSeed {
  readonly framework_id: string;    // e.g., "AAMC-DOM-01"
  readonly name: string;
  readonly level: number;           // hierarchy depth
  readonly parent_id: string | null;
  readonly description: string;
}

/** UME Objective node */
export interface UMEObjectiveSeed {
  readonly framework_id: string;    // e.g., "UME-OBJ-01"
  readonly name: string;
  readonly description: string;
  readonly maps_to?: string[];      // ACGME framework_ids for bridge nodes
}

/** EPA node */
export interface EPASeed {
  readonly framework_id: string;    // e.g., "EPA-01"
  readonly name: string;            // e.g., "Gather a History and Perform a Physical Examination"
  readonly epa_number: number;      // 1-13
  readonly description: string;
}

/** Bloom cognitive level node */
export interface BloomLevelSeed {
  readonly framework_id: string;    // e.g., "BLOOM-01"
  readonly name: string;            // e.g., "Remember"
  readonly level: number;           // 1-6 (ascending complexity)
  readonly description: string;
  readonly verbs: readonly string[]; // e.g., ["define", "list", "recall"]
}

/** Miller competence level node */
export interface MillerLevelSeed {
  readonly framework_id: string;    // e.g., "MILLER-01"
  readonly name: string;            // e.g., "Knows"
  readonly level: number;           // 1-4
  readonly description: string;
}
```

## 4. Database Schema (inline, complete)

No Supabase schema changes. All data is stored in Neo4j.

```cypher
// Neo4j node labels and relationships per framework:

// LCME (105 nodes)
(:LCME_Standard {framework_id, name, standard_number, description, framework: "LCME"})
(:LCME_Element {framework_id, name, standard_number, element_number, description, framework: "LCME"})
(:LCME_Standard)-[:HAS_ELEMENT]->(:LCME_Element)

// ACGME (27 nodes)
(:ACGME_Competency {framework_id, name, description, framework: "ACGME"})
(:ACGME_SubCompetency {framework_id, name, description, framework: "ACGME"})
(:ACGME_Competency)-[:HAS_SUBCOMPETENCY]->(:ACGME_SubCompetency)

// AAMC (55 nodes)
(:AAMC_Domain {framework_id, name, level, description, framework: "AAMC"})
(:AAMC_Domain)-[:HAS_SUBDOMAIN]->(:AAMC_Domain)

// UME (55 objectives + 6 bridge relationships)
(:UME_Objective {framework_id, name, description, framework: "UME"})
(:UME_Objective)-[:MAPS_TO]->(:ACGME_Competency)  // cross-framework bridges

// EPA (13 nodes)
(:EPA_Activity {framework_id, name, epa_number, description, framework: "EPA"})

// Bloom (6 nodes)
(:BLOOM_Level {framework_id, name, level, description, verbs, framework: "BLOOM"})

// Miller (4 nodes)
(:MILLER_Level {framework_id, name, level, description, framework: "MILLER"})

// All nodes use MERGE on framework_id for idempotency
```

## 5. API Contract (complete request/response)

No new HTTP API endpoints. Framework data is seeded via CLI command `pnpm kg:seed`.

**CLI Interface:**
```bash
# Seed all frameworks (USMLE + 7 new)
pnpm kg:seed

# Expected output:
# [SeedRunner] Starting seed: USMLE → LCME → ACGME → AAMC → UME → EPA → Bloom → Miller
# [USMLESeeder] Seeded 227 nodes ✓
# [LCMESeeder] Seeded 105 nodes ✓
# [ACGMESeeder] Seeded 27 nodes ✓
# [AAMCSeeder] Seeded 55 nodes ✓
# [UMESeeder] Seeded 61 nodes (55 objectives + 6 bridge rels) ✓
# [EPASeeder] Seeded 13 nodes ✓
# [BloomSeeder] Seeded 6 nodes ✓
# [MillerSeeder] Seeded 4 nodes ✓
# [SeedRunner] Complete: 498 total nodes
```

## 6. Frontend Spec

No frontend changes for this story. Framework data is consumed by downstream stories (IA-3 Framework Browser, etc.).

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `apps/server/src/services/seed/data/lcme.data.ts` | Data | Create |
| 2 | `apps/server/src/services/seed/data/acgme.data.ts` | Data | Create |
| 3 | `apps/server/src/services/seed/data/aamc.data.ts` | Data | Create |
| 4 | `apps/server/src/services/seed/data/ume.data.ts` | Data | Create |
| 5 | `apps/server/src/services/seed/data/epa.data.ts` | Data | Create |
| 6 | `apps/server/src/services/seed/data/bloom.data.ts` | Data | Create |
| 7 | `apps/server/src/services/seed/data/miller.data.ts` | Data | Create |
| 8 | `apps/server/src/services/seed/lcme-seeder.service.ts` | Service | Create |
| 9 | `apps/server/src/services/seed/acgme-seeder.service.ts` | Service | Create |
| 10 | `apps/server/src/services/seed/aamc-seeder.service.ts` | Service | Create |
| 11 | `apps/server/src/services/seed/ume-seeder.service.ts` | Service | Create |
| 12 | `apps/server/src/services/seed/epa-seeder.service.ts` | Service | Create |
| 13 | `apps/server/src/services/seed/bloom-seeder.service.ts` | Service | Create |
| 14 | `apps/server/src/services/seed/miller-seeder.service.ts` | Service | Create |
| 15 | `apps/server/src/services/seed/seed-runner.service.ts` | Service | Edit (register 7 new seeders) |
| 16 | `packages/types/src/framework/framework-seed.types.ts` | Types | Create |
| 17 | `packages/types/src/framework/index.ts` | Types | Edit (add seed types export) |
| 18 | `apps/server/src/services/seed/__tests__/framework-seeders.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-U-2 | universal | **DONE** | Framework data models and types |
| STORY-U-4 | universal | **DONE** | BaseSeeder, SeedRunner, `pnpm kg:seed` CLI |
| STORY-U-7 | universal | **DONE** | USMLE seeder pattern (reference implementation) |

### NPM Packages (already installed)
- `neo4j-driver` — Neo4j client
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/services/seed/base-seeder.service.ts` — `BaseSeeder` class with `protected get driver()`
- `apps/server/src/services/seed/seed-runner.service.ts` — `SeedRunner` to register new seeders
- `apps/server/src/services/seed/usmle-seeder.service.ts` — Reference implementation pattern
- `apps/server/src/services/seed/data/usmle-*.data.ts` — Reference data file format
- `apps/server/src/config/neo4j.config.ts` — `Neo4jClientConfig`
- `packages/types/src/framework/framework.types.ts` — `FrameworkNode`, `FrameworkRelationship`

## 9. Test Fixtures (inline)

```typescript
// Expected node counts per framework (for verification tests)
export const EXPECTED_NODE_COUNTS = {
  LCME_Standard: 12,
  LCME_Element: 93,
  ACGME_Competency: 6,
  ACGME_SubCompetency: 21,
  AAMC_Domain: 55,
  UME_Objective: 55,
  EPA_Activity: 13,
  BLOOM_Level: 6,
  MILLER_Level: 4,
} as const;

// Expected relationship counts
export const EXPECTED_REL_COUNTS = {
  HAS_ELEMENT: 93,       // LCME standards → elements
  HAS_SUBCOMPETENCY: 21, // ACGME competency → sub
  HAS_SUBDOMAIN: 47,     // AAMC domain hierarchy (55 - 8 root domains)
  MAPS_TO: 6,            // UME → ACGME bridges
} as const;

// Total across all 8 frameworks (including USMLE from U-7)
export const TOTAL_FRAMEWORK_NODES = 492; // 227 USMLE + 265 remaining

// Sample data for LCME Standard 1
export const SAMPLE_LCME_STANDARD = {
  framework_id: "LCME-STD-01",
  name: "Mission, Planning, Organization, and Integrity",
  standard_number: 1,
  description: "A medical school has a written statement of mission and goals...",
};

// Sample ACGME competency
export const SAMPLE_ACGME_COMPETENCY = {
  framework_id: "ACGME-COMP-PC",
  name: "Patient Care",
  description: "Residents must be able to provide patient care that is compassionate, appropriate, and effective...",
};

// Sample Bloom level
export const SAMPLE_BLOOM_LEVEL = {
  framework_id: "BLOOM-01",
  name: "Remember",
  level: 1,
  description: "Retrieve relevant knowledge from long-term memory",
  verbs: ["define", "duplicate", "list", "memorize", "recall", "repeat", "state"],
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/services/seed/__tests__/framework-seeders.test.ts`

```
describe("Framework Seeders")
  describe("LCMESeeder")
    ✓ seeds 12 LCME_Standard nodes
    ✓ seeds 93 LCME_Element nodes with HAS_ELEMENT relationships
    ✓ maintains official standard numbering (1-12)

  describe("ACGMESeeder")
    ✓ seeds 6 ACGME_Competency nodes
    ✓ seeds 21 ACGME_SubCompetency nodes with HAS_SUBCOMPETENCY relationships

  describe("AAMCSeeder")
    ✓ seeds 55 AAMC_Domain nodes with HAS_SUBDOMAIN hierarchy

  describe("UMESeeder")
    ✓ seeds 55 UME_Objective nodes
    ✓ creates 6 MAPS_TO bridge relationships to ACGME_Competency nodes

  describe("EPASeeder")
    ✓ seeds 13 EPA_Activity nodes with correct epa_number (1-13)

  describe("BloomSeeder")
    ✓ seeds 6 BLOOM_Level nodes in ascending complexity order

  describe("MillerSeeder")
    ✓ seeds 4 MILLER_Level nodes (Knows, Knows How, Shows How, Does)

  describe("SeedRunner integration")
    ✓ runs all 8 seeders in correct dependency order
    ✓ all seeders are idempotent (running twice produces same node counts)
```

**Total: ~14 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not applicable. Seed scripts are CLI-only, no UI to test.

## 12. Acceptance Criteria

1. LCME: 105 nodes seeded (12 standards + 93 elements) with `HAS_ELEMENT` relationships
2. ACGME: 27 nodes seeded (6 competencies + 21 sub-competencies) with `HAS_SUBCOMPETENCY` relationships
3. AAMC: 55 nodes seeded with `HAS_SUBDOMAIN` hierarchy
4. UME: 55 objectives + 6 bridge `MAPS_TO` relationships to ACGME competencies
5. EPA: 13 Entrustable Professional Activities seeded
6. Bloom: 6 cognitive levels seeded (Remember through Create)
7. Miller: 4 competence levels seeded (Knows, Knows How, Shows How, Does)
8. All seeders use MERGE-based idempotent operations
9. Each seeder extends `BaseSeeder` and uses `protected get driver()`
10. `pnpm kg:seed` seeds all 8 frameworks in correct order (USMLE first, then LCME → ACGME → AAMC → UME → EPA → Bloom → Miller)
11. Total node count after full seed: ~492
12. All ~14 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| 7 remaining frameworks | S-U-16-4 § User Story |
| LCME 105 nodes | S-U-16-4 § Acceptance Criteria |
| ACGME 27 nodes | S-U-16-4 § Acceptance Criteria |
| UME bridge nodes | S-U-16-4 § Notes: "UME_Objective MAPS_TO ACGME_Competency" |
| Bloom 6 levels, Miller 4 levels | S-U-16-4 § Acceptance Criteria |
| Seed order matters | S-U-16-4 § Notes: "USMLE first, then LCME, ACGME, AAMC, UME (depends on ACGME), EPA, Bloom, Miller" |
| BaseSeeder pattern | STORY-U-4 Brief (Seed Script Infrastructure) |
| USMLE reference implementation | STORY-U-7 Brief (USMLE Seed Data) |
| SCREAMING_SNAKE_CASE for Neo4j labels | CLAUDE.md § Architecture Rules |

## 14. Environment Prerequisites

- **Neo4j:** Running instance with connectivity via `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` env vars
- **Node.js:** pnpm available, `@journey-os/server` buildable
- **USMLE data already seeded** (from U-7) — UME bridge nodes reference USMLE is not required, but ACGME must seed before UME
- **No Supabase needed** for this story

## 15. Implementation Notes

- **Follow USMLE seeder pattern:** Each seeder follows the same structure as `USMLESeeder` — constructor receives `Neo4jClientConfig`, `seed()` method runs MERGE queries.
- **Data file format:** Export typed arrays (e.g., `export const LCME_STANDARDS: readonly LCMEStandardSeed[]`). Keep data files pure — no Neo4j logic.
- **MERGE idempotency:** All Cypher queries use `MERGE (n:Label {framework_id: $id}) SET n.name = $name, ...` pattern.
- **Seed order in SeedRunner:** Register in order: USMLE, LCME, ACGME, AAMC, UME, EPA, Bloom, Miller. UME must come after ACGME because its bridge `MAPS_TO` relationships reference ACGME nodes.
- **UME bridges:** After seeding UME objectives, run a second pass to create `MATCH (u:UME_Objective), (a:ACGME_Competency) WHERE u.maps_to_id = a.framework_id MERGE (u)-[:MAPS_TO]->(a)`.
- **Bloom verbs:** Store as a string array property on the Neo4j node: `SET n.verbs = $verbs`.
- **LCME numbering:** Use `framework_id` format `LCME-STD-{NN}` for standards and `LCME-EL-{NN.M}` for elements to preserve official LCME element numbering.
