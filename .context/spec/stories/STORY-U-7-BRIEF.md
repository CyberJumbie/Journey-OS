# STORY-U-7 Brief: USMLE Seed Data

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-U-7
old_id: S-U-16-3
epic: E-16 (Framework Seeding)
feature: F-08 (Medical Education Framework Management)
sprint: 1
lane: universal
lane_priority: 0
within_lane_order: 7
size: M
depends_on:
  - STORY-U-2 (universal) — Framework Data Models [DONE]
  - STORY-U-4 (universal) — Seed Script Infrastructure [DONE]
blocks:
  - STORY-U-12 (universal) — Remaining Framework Seeds
personas_served: [all — infrastructure story]
```

---

## Section 1: Summary

**What to build:** A USMLE framework seeder that populates Neo4j with 227 nodes across 4 hierarchy levels — 16 organ systems, 7 scientific disciplines, 4 physician tasks, and ~200 detailed topics. The seeder extends `BaseSeeder` (from STORY-U-4), uses typed TypeScript data arrays (not raw JSON), and registers with `SeedRunner` so `pnpm kg:seed` seeds USMLE data automatically.

**Parent epic:** E-16 (Framework Seeding) under F-08 (Medical Education Framework Management).

**User flows affected:** No direct user flows. This seed data enables the Framework Browser (IA lane), USMLE coverage analytics, curriculum mapping, and assessment generation across all personas.

**Personas:** All personas benefit indirectly. USMLE organ systems and disciplines are the primary curriculum-to-framework alignment axes.

**Why this story is seventh:** STORY-U-2 defined the 15 framework node types. STORY-U-4 built the seeding infrastructure (BaseSeeder, SeedRunner, CLI). This story creates the first concrete seeder and data, proving the pattern for STORY-U-12 (remaining 7 frameworks).

---

## Section 2: Task Breakdown

Implementation order follows: **Data → Service → Registration → Tests**

### Task 1: Create USMLE Systems seed data
- **File:** `apps/server/src/services/seed/data/usmle-systems.data.ts`
- **Action:** Export typed array of 16 `USMLESystem` entries with `id`, `code`, `name`, `description`, `framework: "usmle"`, `level: 1`, `sort_order`.

### Task 2: Create USMLE Disciplines seed data
- **File:** `apps/server/src/services/seed/data/usmle-disciplines.data.ts`
- **Action:** Export typed array of 7 `USMLEDiscipline` entries.

### Task 3: Create USMLE Tasks seed data
- **File:** `apps/server/src/services/seed/data/usmle-tasks.data.ts`
- **Action:** Export typed array of 4 `USMLETask` entries.

### Task 4: Create USMLE Topics seed data
- **File:** `apps/server/src/services/seed/data/usmle-topics.data.ts`
- **Action:** Export typed array of ~200 `USMLETopic` entries, each with `parent_system` referencing the parent system's `code`.

### Task 5: Create USMLESeeder service
- **File:** `apps/server/src/services/seed/usmle-seeder.service.ts`
- **Action:** Concrete class extending `BaseSeeder`. Implements `seed()` to MERGE all 4 node types + HAS_TOPIC relationships. Implements `verify()` to check node counts and orphan topics.

### Task 6: Register USMLESeeder in seed CLI script
- **File:** `apps/server/scripts/seed-frameworks.ts`
- **Action:** Import `USMLESeeder`, instantiate with driver, call `runner.registerSeeder()`.

### Task 7: Write API tests
- **File:** `apps/server/src/services/seed/__tests__/usmle-seeder.test.ts`
- **Action:** 5+ test groups covering node counts, hierarchy integrity, idempotency, unique constraints, relationship correctness.

---

## Section 3: Data Model (inline, complete)

All types already exist in `packages/types/src/frameworks/usmle.types.ts`:

```typescript
// BaseFrameworkNode (from framework-node.types.ts)
interface BaseFrameworkNode {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly framework: FrameworkId;  // "usmle"
  readonly level?: number;
}

// USMLE-specific types (from usmle.types.ts)
interface USMLESystem extends BaseFrameworkNode {
  readonly framework: "usmle";
  readonly code: string;          // e.g., "SYS-CARDIO"
}

interface USMLEDiscipline extends BaseFrameworkNode {
  readonly framework: "usmle";
  readonly code: string;          // e.g., "DISC-ANAT"
}

interface USMLETask extends BaseFrameworkNode {
  readonly framework: "usmle";
  readonly code: string;          // e.g., "TASK-DIAG"
}

interface USMLETopic extends BaseFrameworkNode {
  readonly framework: "usmle";
  readonly code: string;          // e.g., "TOP-CARDIO-001"
  readonly parent_system: string; // references parent USMLESystem.code
}
```

**Source JSON shape** (from `.context/source/05-reference/seed/`):

```typescript
// Shape of the authoritative JSON seed files
interface USMLESeedJsonEntry {
  readonly id: string;     // e.g., "usmle-sys-07"
  readonly name: string;   // e.g., "Cardiovascular System"
  readonly order: number;  // display ordering
}

// Topics don't have a source JSON file — they must be authored.
// Use this shape for the typed TS data file:
interface USMLETopicSeedEntry {
  readonly id: string;           // e.g., "usmle-top-cardio-001"
  readonly code: string;         // e.g., "TOP-CARDIO-001"
  readonly name: string;         // e.g., "Congestive Heart Failure"
  readonly description: string;
  readonly framework: "usmle";
  readonly level: number;        // 2 (topics are children of systems)
  readonly sort_order: number;
  readonly parent_system: string; // references parent system id, e.g., "usmle-sys-07"
}
```

**Note:** The source JSON uses `id` + `name` + `order` (minimal). The seeder must enrich each entry with `code` (derived from id), `description`, `framework: "usmle"`, and `level` before MERGE. The `order` field maps to Neo4j `sort_order` property.

---

## Section 4: Database Schema (Neo4j Cypher)

### Constraints (already created by SeedRunner)
```cypher
CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_System) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_Discipline) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_Task) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_Topic) REQUIRE n.code IS UNIQUE;
```

### MERGE Queries (used in seed())

**Systems:**
```cypher
MERGE (n:USMLE_System {code: $code})
SET n.id = $id, n.name = $name, n.description = $description,
    n.framework = $framework, n.level = $level, n.sort_order = $sort_order
```

**Disciplines:**
```cypher
MERGE (n:USMLE_Discipline {code: $code})
SET n.id = $id, n.name = $name, n.description = $description,
    n.framework = $framework, n.level = $level, n.sort_order = $sort_order
```

**Tasks:**
```cypher
MERGE (n:USMLE_Task {code: $code})
SET n.id = $id, n.name = $name, n.description = $description,
    n.framework = $framework, n.level = $level, n.sort_order = $sort_order
```

**Topics (with relationship):**
```cypher
MERGE (t:USMLE_Topic {code: $code})
SET t.id = $id, t.name = $name, t.description = $description,
    t.framework = $framework, t.level = $level, t.sort_order = $sort_order,
    t.parent_system = $parent_system
WITH t
MATCH (s:USMLE_System {code: $parent_system})
MERGE (s)-[:HAS_TOPIC]->(t)
```

### Verification Queries
```cypher
-- Count per label
MATCH (n:USMLE_System) RETURN count(n) AS count
MATCH (n:USMLE_Discipline) RETURN count(n) AS count
MATCH (n:USMLE_Task) RETURN count(n) AS count
MATCH (n:USMLE_Topic) RETURN count(n) AS count

-- Orphan check: topics without a parent system
MATCH (t:USMLE_Topic) WHERE NOT (:USMLE_System)-[:HAS_TOPIC]->(t)
RETURN count(t) AS orphan_count
```

---

## Section 5: API Contract

No REST endpoints in this story. This is a CLI-only seeding operation invoked via `pnpm kg:seed`. The seed script writes directly to Neo4j through the driver.

---

## Section 6: Frontend Spec

No frontend components in this story. The seeded data will be consumed by the Framework Browser (STORY-IA-6) and Coverage Analytics (STORY-IA-3) in future stories.

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Action |
|---|------|--------|
| 1 | `apps/server/src/services/seed/data/usmle-systems.data.ts` | CREATE — 16 system entries |
| 2 | `apps/server/src/services/seed/data/usmle-disciplines.data.ts` | CREATE — 7 discipline entries |
| 3 | `apps/server/src/services/seed/data/usmle-tasks.data.ts` | CREATE — 4 task entries |
| 4 | `apps/server/src/services/seed/data/usmle-topics.data.ts` | CREATE — ~200 topic entries |
| 5 | `apps/server/src/services/seed/usmle-seeder.service.ts` | CREATE — seeder class |
| 6 | `apps/server/scripts/seed-frameworks.ts` | EDIT — register USMLESeeder |
| 7 | `apps/server/src/services/seed/__tests__/usmle-seeder.test.ts` | CREATE — test suite |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | What it provides |
|-------|------|--------|------------------|
| STORY-U-2 | universal | DONE | Framework type system (USMLESystem, USMLETopic, etc.) |
| STORY-U-4 | universal | DONE | BaseSeeder, SeedRunner, SeedBatch, CLI script, Neo4j config |

### NPM Packages (already installed)
- `neo4j-driver` — Neo4j bolt driver
- `uuid` or `crypto.randomUUID()` — generate node IDs
- `vitest` — testing

### Existing Files Needed
| File | Purpose |
|------|---------|
| `packages/types/src/frameworks/usmle.types.ts` | USMLESystem, USMLEDiscipline, USMLETask, USMLETopic interfaces |
| `packages/types/src/frameworks/framework-node.types.ts` | BaseFrameworkNode, Neo4jFrameworkLabel, FrameworkRelationshipType |
| `packages/types/src/frameworks/seeder.types.ts` | Seeder, SeedResult, SeedBatch, VerificationResult |
| `apps/server/src/services/seed/base-seeder.ts` | BaseSeeder abstract class |
| `apps/server/src/services/seed/seed-runner.service.ts` | SeedRunner orchestrator + FRAMEWORK_CONSTRAINTS |
| `apps/server/scripts/seed-frameworks.ts` | CLI entrypoint (edit to register USMLESeeder) |
| `apps/server/src/config/neo4j.config.ts` | Neo4jClientConfig singleton |
| `apps/server/src/errors/seed.errors.ts` | SeedError, SeedVerificationError |

---

## Section 9: Test Fixtures (inline)

### Valid USMLE System (1 of 16) — matches source JSON
```json
{
  "id": "usmle-sys-07",
  "name": "Cardiovascular System",
  "order": 7
}
```
After enrichment by seeder → Neo4j properties:
```json
{
  "id": "usmle-sys-07",
  "code": "usmle-sys-07",
  "name": "Cardiovascular System",
  "description": "Cardiovascular System",
  "framework": "usmle",
  "level": 1,
  "sort_order": 7
}
```

### Valid USMLE Discipline (1 of 7) — matches source JSON
```json
{
  "id": "usmle-disc-01",
  "name": "Anatomy",
  "order": 1
}
```

### Valid USMLE Task (1 of 4) — matches source JSON
```json
{
  "id": "usmle-task-01",
  "name": "Diagnosis",
  "order": 1
}
```

### Valid USMLE Topic (1 of ~200) — authored in TS data file
```json
{
  "id": "usmle-top-sys07-001",
  "code": "usmle-top-sys07-001",
  "name": "Congestive Heart Failure",
  "description": "Pathophysiology, diagnosis, and management of CHF",
  "framework": "usmle",
  "level": 2,
  "sort_order": 1,
  "parent_system": "usmle-sys-07"
}
```

### Expected Node Counts
```json
{
  "USMLE_System": 16,
  "USMLE_Discipline": 7,
  "USMLE_Task": 4,
  "USMLE_Topic": 200,
  "total": 227
}
```

### Authoritative Source: `.context/source/05-reference/seed/`

**IMPORTANT:** Use the JSON files below as the single source of truth for IDs, names, and ordering. Do NOT invent new IDs — import directly from these files into typed TypeScript arrays.

### Canonical USMLE Systems (all 16) — from `usmle-systems.json`
1. General Principles (usmle-sys-01)
2. Blood & Lymphoreticular System (usmle-sys-02)
3. Behavioral Health (usmle-sys-03)
4. Nervous System & Special Senses (usmle-sys-04)
5. Skin & Subcutaneous Tissue (usmle-sys-05)
6. Musculoskeletal System (usmle-sys-06)
7. Cardiovascular System (usmle-sys-07)
8. Respiratory System (usmle-sys-08)
9. Gastrointestinal System (usmle-sys-09)
10. Renal & Urinary System (usmle-sys-10)
11. Pregnancy, Childbirth & Puerperium (usmle-sys-11)
12. Female Reproductive & Breast (usmle-sys-12)
13. Male Reproductive (usmle-sys-13)
14. Endocrine System (usmle-sys-14)
15. Immune System (usmle-sys-15)
16. Biostatistics & Epidemiology / Population Health (usmle-sys-16)

### Canonical USMLE Disciplines (all 7) — from `usmle-disciplines.json`
1. Anatomy (usmle-disc-01)
2. Biochemistry & Nutrition (usmle-disc-02)
3. Microbiology (usmle-disc-03)
4. Pathology (usmle-disc-04)
5. Pharmacology (usmle-disc-05)
6. Physiology (usmle-disc-06)
7. Behavioral Science (usmle-disc-07)

### Canonical USMLE Tasks (all 4) — from `usmle-tasks.json`
1. Diagnosis (usmle-task-01)
2. Management / Treatment (usmle-task-02)
3. Health Maintenance / Disease Prevention (usmle-task-03)
4. Mechanisms of Disease / Basic Science Concepts (usmle-task-04)

### Topic Distribution by System (~200 total)
Each system has 10-15 topics. Topics represent granular content outline entries from the USMLE Step 1 Content Description. Examples per system:

**Cardiovascular (13 topics):**
- Congestive Heart Failure, Coronary Artery Disease, Valvular Heart Disease, Cardiomyopathy, Arrhythmias, Hypertension, Peripheral Vascular Disease, Congenital Heart Disease, Pericardial Disease, Aortic Aneurysm/Dissection, Endocarditis, Myocarditis, Shock

**Respiratory (13 topics):**
- Pneumonia, COPD, Asthma, Pulmonary Embolism, Pneumothorax, Lung Cancer, Pleural Effusion, Tuberculosis, Interstitial Lung Disease, Acute Respiratory Distress Syndrome, Cystic Fibrosis, Pulmonary Hypertension, Sleep Apnea

**Gastrointestinal (13 topics):**
- GERD, Peptic Ulcer Disease, IBD, IBS, Cirrhosis, Hepatitis, Pancreatitis, Cholecystitis, Colorectal Cancer, Appendicitis, GI Bleeding, Celiac Disease, Diverticular Disease

*(Remaining systems follow similar pattern — 10-15 topics each, totaling ~200)*

---

## Section 10: API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/services/seed/__tests__/usmle-seeder.test.ts`

Tests use mocked Neo4j driver (same pattern as `base-seeder.test.ts` and `seed-runner.service.test.ts`). Use `vi.hoisted()` for the neo4j mock.

### Test Group 1: USMLESeeder construction
```
- has correct name ("usmle")
- has correct label ("USMLE_System")
- accepts custom batch size
```

### Test Group 2: seed() — node creation
```
- calls executeBatch for systems (16 items)
- calls executeBatch for disciplines (7 items)
- calls executeBatch for tasks (4 items)
- calls executeBatch for topics (~200 items with HAS_TOPIC relationship query)
- returns SeedResult with correct nodesCreated count
- returns SeedResult with correct relationshipsCreated count
- records durationMs > 0
- returns empty errors array on success
```

### Test Group 3: seed() — MERGE queries
```
- system MERGE query includes SET for all properties (id, name, description, framework, level, sort_order)
- topic MERGE query includes MATCH + MERGE for HAS_TOPIC relationship
- topic query references parent_system parameter
```

### Test Group 4: verify() — count validation
```
- passes when all 4 label counts match expected
- fails when system count is wrong
- fails when topic count is wrong
- reports orphan topics (topics without HAS_TOPIC relationship)
- returns passed: true when orphan_count is 0
- returns passed: false when orphan_count > 0
```

### Test Group 5: Idempotency
```
- running seed() twice produces same node count (MERGE doesn't duplicate)
- second run shows nodesUpdated > 0, nodesCreated = 0
```

### Test Group 6: Data integrity
```
- all 16 system codes are unique
- all 7 discipline codes are unique
- all 4 task codes are unique
- all ~200 topic codes are unique
- every topic's parent_system references a valid system code
- sort_order is sequential within each node type
- all nodes have framework = "usmle"
```

### Test Group 7: Error handling
```
- propagates Neo4j connection errors
- records individual node errors in SeedResult.errors
- partial failure doesn't prevent remaining batches
```

**Estimated test count: ~30 tests**

---

## Section 11: E2E Test Spec (Playwright — CONDITIONAL)

Not applicable. This is a CLI seeding operation with no UI. E2E tests for the Framework Browser (STORY-IA-6) will verify the seeded data is visible in the UI.

---

## Section 12: Acceptance Criteria

1. Running `pnpm kg:seed` creates exactly 16 `USMLE_System` nodes in Neo4j.
2. Running `pnpm kg:seed` creates exactly 7 `USMLE_Discipline` nodes in Neo4j.
3. Running `pnpm kg:seed` creates exactly 4 `USMLE_Task` nodes in Neo4j.
4. Running `pnpm kg:seed` creates exactly 200 `USMLE_Topic` nodes in Neo4j.
5. Total USMLE node count is exactly 227.
6. Every `USMLE_Topic` has exactly one `(:USMLE_System)-[:HAS_TOPIC]->(:USMLE_Topic)` relationship.
7. Zero orphan topics (topics without a parent system).
8. Each node has: `id`, `code`, `name`, `description`, `framework`, `level`, `sort_order`.
9. Seed data is stored in typed TypeScript data files (compile-time type checking).
10. Seeding is idempotent — running twice produces no duplicates (MERGE pattern).
11. Unique constraints on `code` for all 4 USMLE labels are enforced.
12. All vitest tests pass (~30 tests).

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| 227 USMLE nodes across 4 levels | [S-U-16-3 § Acceptance Criteria] |
| 16 organ systems list | [NODE_REGISTRY v1.0 § Layer 2], [USMLE Step 1 Content Description] |
| 7 scientific disciplines list | [NODE_REGISTRY v1.0 § Layer 2], [USMLE Step 1 Content Description] |
| 4 physician tasks | [NODE_REGISTRY v1.0 § Layer 2] |
| ~200 topics | [NODE_REGISTRY v1.0 § Layer 2], [SEED_VALIDATION_SPEC v1.0 § Phase 2] |
| SCREAMING_SNAKE_CASE labels | [CLAUDE.md § Architecture Rules] |
| HAS_TOPIC relationship type | [NODE_REGISTRY v1.0 § Layer 2 Relationships] |
| MERGE-based idempotent seeding | [S-U-16-2 § BaseSeeder design] |
| code uniqueness constraints | [SeedRunner § FRAMEWORK_CONSTRAINTS] |
| Typed data arrays, not JSON | [S-U-16-3 § Notes] |
| sort_order for display ordering | [S-U-16-3 § Notes] |
| SubConcept → MAPS_TO → USMLE_System | [Seeding Blueprint v1.1 § 5] |
| Topic tolerance ±20 | [SEED_VALIDATION_SPEC v1.0 § Phase 2] |

---

## Section 14: Environment Prerequisites

| Requirement | Details |
|-------------|---------|
| Neo4j | Running instance with bolt:// URI. Set `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` in `.env`. |
| Node.js | 18+ (already in monorepo) |
| pnpm | Workspace manager (already configured) |
| `@journey-os/types` | Must be built (`pnpm --filter @journey-os/types build`) for server to resolve framework types. |

**No Supabase required** for this story — it's Neo4j-only.

---

## Section 15: Figma Make Prototype

Not applicable. No UI in this story. Code directly.

---

## Implementation Notes

### Pattern to Follow
The `USMLESeeder` follows the exact same pattern that `BaseSeeder` was designed for. Look at the base class's `executeBatch()` method — it accepts a `SeedBatch<T>` with a `mergeQuery` string and an `items` array. The seeder should call `executeBatch()` once per node type (4 calls), then create the HAS_TOPIC relationships.

### Seeder Registration
The seed CLI script (`apps/server/scripts/seed-frameworks.ts`) already has a comment placeholder:
```typescript
// Future stories (U-7, U-12) will register seeders here:
// runner.registerSeeder(new USMLESeeder(neo4j.driver));
```
Uncomment and import the USMLESeeder.

### Topic Data Strategy
The ~200 topics are the most labor-intensive data file. Use the USMLE Step 1 Content Description outline structure. Each system has 10-15 topics representing major conditions/concepts tested. The `parent_system` field links each topic to its system via the system's `code` field.

### ID Generation
Use deterministic IDs based on the code (e.g., `usmle-sys-cardio`, `usmle-top-cardio-001`) rather than random UUIDs. This makes MERGE idempotent and debugging easier.

### Test Mock Pattern
Use `vi.hoisted()` for the neo4j-driver mock (same pattern as existing seed tests):
```typescript
const mockDriver = vi.hoisted(() => ({
  session: vi.fn(() => ({
    executeWrite: vi.fn(),
    run: vi.fn(),
    close: vi.fn(),
  })),
}));
```
