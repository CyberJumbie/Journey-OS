# STORY-U-4 Brief: Seed Script Infrastructure

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-U-4
old_id: S-U-16-2
epic: E-16 (Framework Seeding)
feature: F-08 (Medical Education Framework Management)
sprint: 1
lane: universal
lane_priority: 0
within_lane_order: 4
size: S
depends_on:
  - STORY-U-2 (universal) — Framework Data Models [DONE]
blocks:
  - STORY-U-7 (universal) — USMLE Seed Data
  - STORY-U-12 (universal) — Remaining Framework Seeds
personas_served: [all — infrastructure story]
```

---

## Section 1: Summary

**What to build:** An idempotent MERGE-based seeding scaffold for loading medical education framework data into Neo4j. This includes a `SeedRunner` orchestrator service, a `BaseSeeder` abstract class that framework-specific seeders will extend, Neo4j driver configuration, transaction batching (groups of 50), a CLI command (`pnpm kg:seed`), and verification capabilities to confirm seed data integrity after execution.

**Parent epic:** E-16 (Framework Seeding) under F-08 (Medical Education Framework Management).

**User flows affected:** No direct user flows. This infrastructure enables STORY-U-7 (USMLE Seed Data) and STORY-U-12 (Remaining Framework Seeds), which populate the knowledge graph that all content generation and assessment features depend on.

**Personas:** All personas benefit indirectly. The knowledge graph is the backbone of curriculum mapping, content generation, and assessment creation.

**Why this story is fourth:** STORY-U-2 created the framework type system (15 node types, 8 frameworks). This story builds the seeding infrastructure that uses those types. It does NOT seed actual data — that's STORY-U-7 and U-12.

---

## Section 2: Task Breakdown

Implementation order follows: **Types -> Config -> Service -> Script -> Tests**

### Task 1: Define seeder types and interfaces
- **File:** `packages/types/src/frameworks/seeder.types.ts`
- **Action:** Create `Seeder` interface, `SeedResult`, `VerificationResult`, `SeedRunnerConfig`, `SeedBatch` types.

### Task 2: Update framework types barrel export
- **File:** `packages/types/src/frameworks/index.ts`
- **Action:** Re-export seeder types.

### Task 3: Add Neo4j environment variables to env config
- **File:** `apps/server/src/config/env.config.ts`
- **Action:** Add `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` to Zod schema.

### Task 4: Create Neo4j driver configuration
- **File:** `apps/server/src/config/neo4j.config.ts`
- **Action:** Create `Neo4jClientConfig` singleton class (same OOP pattern as `SupabaseClientConfig`). Constructor creates driver from env config. Public getter for driver and session factory.

### Task 5: Create seed error classes
- **File:** `apps/server/src/errors/seed.errors.ts`
- **Action:** Create `SeedError`, `SeedVerificationError` extending `DomainError`.

### Task 6: Create BaseSeeder abstract class
- **File:** `apps/server/src/services/seed/base-seeder.ts`
- **Action:** Abstract class with `seed()` and `verify()` methods. Includes protected `executeBatch()` method that runs MERGE statements in transaction batches of 50. Constructor DI for Neo4j driver.

### Task 7: Create SeedRunner orchestrator service
- **File:** `apps/server/src/services/seed/seed-runner.service.ts`
- **Action:** Orchestrates seeders in order. Verifies constraints exist before seeding. Logs node counts per framework. Handles partial failures gracefully.

### Task 8: Create seed CLI script
- **File:** `apps/server/scripts/seed-frameworks.ts`
- **Action:** Entrypoint script that creates `SeedRunner`, registers seeders, and runs. Called via `pnpm kg:seed`.

### Task 9: Register `kg:seed` command
- **File:** `package.json` (root)
- **Action:** Add `"kg:seed": "pnpm --filter @journey-os/server run kg:seed"`.
- **File:** `apps/server/package.json`
- **Action:** Add `"kg:seed": "tsx scripts/seed-frameworks.ts"`.

### Task 10: Write unit tests
- **File:** `apps/server/src/services/seed/__tests__/seed-runner.service.test.ts`
- **File:** `apps/server/src/services/seed/__tests__/base-seeder.test.ts`
- **File:** `apps/server/src/config/__tests__/neo4j.config.test.ts`

---

## Section 3: Data Model (inline, complete)

### Seeder Types

```typescript
// packages/types/src/frameworks/seeder.types.ts

import { Neo4jFrameworkLabel } from './framework-node.types';

/**
 * Result of a single seeder's execution.
 */
export interface SeedResult {
  readonly framework: string;
  readonly label: Neo4jFrameworkLabel;
  readonly nodesCreated: number;
  readonly nodesUpdated: number;
  readonly relationshipsCreated: number;
  readonly durationMs: number;
  readonly errors: readonly SeedNodeError[];
}

/**
 * Error for a single node that failed to seed.
 */
export interface SeedNodeError {
  readonly nodeId: string;
  readonly label: Neo4jFrameworkLabel;
  readonly message: string;
}

/**
 * Result of verification after seeding.
 */
export interface VerificationResult {
  readonly framework: string;
  readonly label: Neo4jFrameworkLabel;
  readonly expectedCount: number;
  readonly actualCount: number;
  readonly passed: boolean;
  readonly orphanCount: number;
  readonly details: string;
}

/**
 * Interface that all framework seeders must implement.
 */
export interface Seeder {
  readonly name: string;
  readonly label: Neo4jFrameworkLabel;
  seed(): Promise<SeedResult>;
  verify(): Promise<VerificationResult>;
}

/**
 * Configuration for SeedRunner.
 */
export interface SeedRunnerConfig {
  readonly batchSize: number;          // default: 50
  readonly dryRun: boolean;            // log queries without executing
  readonly frameworks?: string[];      // filter: only seed these frameworks
}

/**
 * A batch of MERGE operations to execute in a single transaction.
 */
export interface SeedBatch<T> {
  readonly label: Neo4jFrameworkLabel;
  readonly items: readonly T[];
  readonly mergeQuery: string;          // Parameterized Cypher template
}

/**
 * Aggregate result from SeedRunner.
 */
export interface SeedRunReport {
  readonly results: readonly SeedResult[];
  readonly verifications: readonly VerificationResult[];
  readonly totalNodes: number;
  readonly totalRelationships: number;
  readonly totalDurationMs: number;
  readonly allPassed: boolean;
}
```

### Existing Framework Types (from STORY-U-2 — DO NOT MODIFY)

The following types define the 15 node types across 8 frameworks:

```typescript
// Key types from packages/types/src/frameworks/framework-node.types.ts

export type FrameworkId = 'usmle' | 'lcme' | 'acgme' | 'aamc' | 'ume' | 'epa' | 'bloom' | 'miller';

export type Neo4jFrameworkLabel =
  | 'USMLE_System' | 'USMLE_Discipline' | 'USMLE_Task' | 'USMLE_Topic'
  | 'LCME_Standard' | 'LCME_Element'
  | 'ACGME_Domain' | 'ACGME_Subdomain'
  | 'AAMC_Domain' | 'AAMC_Competency'
  | 'UME_Competency' | 'UME_Subcompetency'
  | 'EPA'
  | 'BloomLevel' | 'MillerLevel';

export interface BaseFrameworkNode {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly framework: FrameworkId;
}
```

---

## Section 4: Database Schema (inline, complete)

### Neo4j Constraints (Layer 2 — Framework Alignment)

These constraints MUST be created before seeding. The `SeedRunner` verifies they exist.

```cypher
-- Layer 2 constraints — all use IF NOT EXISTS for idempotency
CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_System) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_Discipline) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_Task) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_Topic) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:LCME_Standard) REQUIRE n.number IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:LCME_Element) REQUIRE n.number IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:ACGME_Domain) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:ACGME_Subdomain) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:AAMC_Domain) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:AAMC_Competency) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:EPA) REQUIRE n.number IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:BloomLevel) REQUIRE n.level IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:MillerLevel) REQUIRE n.level IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:UME_Competency) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:UME_Subcompetency) REQUIRE n.code IS UNIQUE;
```

### MERGE Pattern (idempotent upsert)

```cypher
-- Standard MERGE pattern for all framework nodes:
MERGE (n:USMLE_System {code: $code})
  ON CREATE SET
    n.id = $id,
    n.name = $name,
    n.description = $description,
    n.framework = $framework,
    n.created_at = timestamp()
  ON MATCH SET
    n.name = $name,
    n.description = $description,
    n.updated_at = timestamp()
RETURN n
```

### Layer 2 Relationships

```cypher
-- Parent-child relationships created after nodes exist
MATCH (parent:USMLE_System {code: $parentCode}), (child:USMLE_Topic {code: $childCode})
MERGE (parent)-[:HAS_TOPIC]->(child);

MATCH (parent:LCME_Standard {number: $parentNumber}), (child:LCME_Element {number: $childNumber})
MERGE (parent)-[:HAS_ELEMENT]->(child);

MATCH (parent:ACGME_Domain {code: $parentCode}), (child:ACGME_Subdomain {code: $childCode})
MERGE (parent)-[:HAS_SUBDOMAIN]->(child);

MATCH (parent:AAMC_Domain {code: $parentCode}), (child:AAMC_Competency {code: $childCode})
MERGE (parent)-[:HAS_COMPETENCY]->(child);

MATCH (parent:UME_Competency {code: $parentCode}), (child:UME_Subcompetency {code: $childCode})
MERGE (parent)-[:HAS_SUBCOMPETENCY]->(child);

-- UME → ACGME bridge (6 edges)
MATCH (ume:UME_Competency {code: $umeCode}), (acgme:ACGME_Domain {code: $acgmeCode})
MERGE (ume)-[:ALIGNS_WITH]->(acgme);

-- Bloom ordering (5 edges: 1→2, 2→3, 3→4, 4→5, 5→6)
MATCH (b1:BloomLevel {level: $level1}), (b2:BloomLevel {level: $level2})
MERGE (b1)-[:NEXT_LEVEL]->(b2);

-- Miller ordering (3 edges: 1→2, 2→3, 3→4)
MATCH (m1:MillerLevel {level: $level1}), (m2:MillerLevel {level: $level2})
MERGE (m1)-[:NEXT_LEVEL]->(m2);
```

### Expected Node Counts (Phase 2 — Framework Alignment)

| Label | Expected | Unique Key | Tolerance |
|-------|----------|-----------|-----------|
| USMLE_System | 16 | code | +/-0 |
| USMLE_Discipline | 7 | code | +/-0 |
| USMLE_Task | 4 | code | +/-0 |
| USMLE_Topic | ~200 | code | +/-20 |
| LCME_Standard | 12 | number | +/-0 |
| LCME_Element | 93 | number | +/-0 |
| ACGME_Domain | 6 | code | +/-0 |
| ACGME_Subdomain | 21 | code | +/-0 |
| AAMC_Domain | 6 | code | +/-0 |
| AAMC_Competency | 49 | code | +/-0 |
| EPA | 13 | number | +/-0 |
| BloomLevel | 6 | level | +/-0 |
| MillerLevel | 4 | level | +/-0 |
| UME_Competency | 6 | code | +/-0 |
| UME_Subcompetency | 49 | code | +/-0 |
| **Total** | **~492** | | +/-20 |

---

## Section 5: API Contract (complete request/response)

No HTTP API endpoints. This story creates a CLI script (`pnpm kg:seed`) and service classes only. The seeding infrastructure is invoked via the command line, not via API.

### CLI Interface

```bash
# Seed all frameworks
pnpm kg:seed

# Output format:
# [SeedRunner] Starting seed run...
# [SeedRunner] Verifying constraints...
# [SeedRunner] ✓ 15 constraints verified
# [USMLESeeder] Seeding USMLE_System... 16 nodes (0 created, 16 updated)
# [USMLESeeder] Seeding USMLE_Discipline... 7 nodes (0 created, 7 updated)
# ...
# [SeedRunner] Seed run complete:
#   Total nodes: 492
#   Total relationships: 47
#   Duration: 3.2s
#   All verifications: PASSED
```

---

## Section 6: Frontend Spec

Not applicable. This story creates no UI components.

---

## Section 7: Files to Create (exact paths, implementation order)

```
# 1. Shared Types (packages/types)
packages/types/src/frameworks/seeder.types.ts      # Seeder interface, SeedResult, VerificationResult
packages/types/src/frameworks/index.ts             # UPDATE: add seeder type exports

# 2. Server Config (apps/server)
apps/server/src/config/env.config.ts               # UPDATE: add NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD
apps/server/src/config/neo4j.config.ts             # Neo4jClientConfig singleton

# 3. Error Classes (apps/server)
apps/server/src/errors/seed.errors.ts              # SeedError, SeedVerificationError

# 4. Service Layer (apps/server)
apps/server/src/services/seed/base-seeder.ts       # BaseSeeder abstract class
apps/server/src/services/seed/seed-runner.service.ts # SeedRunner orchestrator

# 5. CLI Script (apps/server)
apps/server/scripts/seed-frameworks.ts             # Entrypoint for pnpm kg:seed

# 6. Package Config
apps/server/package.json                           # UPDATE: add kg:seed script, neo4j-driver dep
package.json                                       # UPDATE: add root kg:seed script

# 7. Tests
apps/server/src/config/__tests__/neo4j.config.test.ts
apps/server/src/services/seed/__tests__/base-seeder.test.ts
apps/server/src/services/seed/__tests__/seed-runner.service.test.ts
```

---

## Section 8: Dependencies

### Stories

| Story | Lane | Status | Relationship |
|-------|------|--------|-------------|
| STORY-U-2 | universal | DONE | Provides framework types (15 node types, `Neo4jFrameworkLabel`) |
| STORY-U-7 | universal | pending | Blocked by this story (USMLE Seed Data) |
| STORY-U-12 | universal | pending | Blocked by this story (Remaining Framework Seeds) |

### NPM Packages

| Package | Version | Location | Purpose | Status |
|---------|---------|----------|---------|--------|
| `neo4j-driver` | `^5.x` | `apps/server` | Neo4j Bolt driver | **NEW — must install** |
| `@journey-os/types` | workspace | `apps/server` | Framework types | Existing |
| `tsx` | dev | `apps/server` | Script runner | Existing |
| `vitest` | dev | `apps/server` | Test runner | Existing |

### Existing Files (consumed by this story)

| File | Purpose |
|------|---------|
| `packages/types/src/frameworks/framework-node.types.ts` | `Neo4jFrameworkLabel`, `BaseFrameworkNode`, `FrameworkId` |
| `packages/types/src/frameworks/index.ts` | Barrel exports to update |
| `apps/server/src/config/env.config.ts` | Env validation to extend with Neo4j vars |
| `apps/server/src/errors/base.errors.ts` | `DomainError` base class |
| `apps/server/src/models/framework-node.model.ts` | Reference for OOP pattern |

---

## Section 9: Test Fixtures (inline)

### Mock Neo4j Driver

```typescript
// Mock neo4j-driver for unit tests
const mockSession = {
  run: vi.fn().mockResolvedValue({
    records: [],
    summary: {
      counters: {
        updates: () => ({
          nodesCreated: 0,
          nodesDeleted: 0,
          relationshipsCreated: 0,
          propertiesSet: 0,
        }),
      },
    },
  }),
  close: vi.fn().mockResolvedValue(undefined),
  executeWrite: vi.fn().mockImplementation(async (fn) => fn({
    run: vi.fn().mockResolvedValue({
      records: [],
      summary: { counters: { updates: () => ({ nodesCreated: 1 }) } },
    }),
  })),
};

const mockDriver = {
  session: vi.fn().mockReturnValue(mockSession),
  close: vi.fn().mockResolvedValue(undefined),
  verifyConnectivity: vi.fn().mockResolvedValue(undefined),
};
```

### Mock Seeder (for SeedRunner tests)

```typescript
class MockSeeder implements Seeder {
  readonly name = 'MockFramework';
  readonly label: Neo4jFrameworkLabel = 'BloomLevel';

  async seed(): Promise<SeedResult> {
    return {
      framework: 'bloom',
      label: 'BloomLevel',
      nodesCreated: 6,
      nodesUpdated: 0,
      relationshipsCreated: 5,
      durationMs: 100,
      errors: [],
    };
  }

  async verify(): Promise<VerificationResult> {
    return {
      framework: 'bloom',
      label: 'BloomLevel',
      expectedCount: 6,
      actualCount: 6,
      passed: true,
      orphanCount: 0,
      details: '6/6 BloomLevel nodes verified',
    };
  }
}
```

### Seed Data Fixture (Bloom Levels — simplest framework)

```json
{
  "BLOOM_LEVELS": [
    { "level": 1, "name": "Remember", "description": "Recall facts and basic concepts", "framework": "bloom" },
    { "level": 2, "name": "Understand", "description": "Explain ideas or concepts", "framework": "bloom" },
    { "level": 3, "name": "Apply", "description": "Use information in new situations", "framework": "bloom" },
    { "level": 4, "name": "Analyze", "description": "Draw connections among ideas", "framework": "bloom" },
    { "level": 5, "name": "Evaluate", "description": "Justify a stand or decision", "framework": "bloom" },
    { "level": 6, "name": "Create", "description": "Produce new or original work", "framework": "bloom" }
  ],
  "MILLER_LEVELS": [
    { "level": 1, "name": "Knows", "description": "Factual recall (knowledge)", "framework": "miller" },
    { "level": 2, "name": "Knows How", "description": "Applied knowledge (competence)", "framework": "miller" },
    { "level": 3, "name": "Shows How", "description": "Demonstrates in controlled setting (performance)", "framework": "miller" },
    { "level": 4, "name": "Does", "description": "Independent practice (action)", "framework": "miller" }
  ]
}
```

### Environment Fixtures

```json
{
  "VALID_NEO4J_ENV": {
    "NEO4J_URI": "bolt://localhost:7687",
    "NEO4J_USERNAME": "neo4j",
    "NEO4J_PASSWORD": "test-password-123"
  },
  "MISSING_NEO4J_URI": {
    "NEO4J_USERNAME": "neo4j",
    "NEO4J_PASSWORD": "test-password-123"
  }
}
```

---

## Section 10: API Test Spec (vitest)

### Test Suite: `neo4j.config.test.ts`

```
describe('Neo4jClientConfig')
  it('should create a Neo4j driver with URI from environment config')
  it('should return the same instance on repeated calls (singleton)')
  it('should expose driver via public getter')
  it('should throw MissingEnvironmentError if NEO4J_URI is missing')
  it('should use neo4j credentials from env config')
```

### Test Suite: `base-seeder.test.ts`

```
describe('BaseSeeder')
  describe('executeBatch')
    it('should execute MERGE queries in batches of 50')
    it('should handle batch with fewer than 50 items')
    it('should return aggregate SeedResult with node counts')
    it('should collect errors without stopping the batch')
    it('should use executeWrite for transactional safety')
    it('should close the session after batch completes')

  describe('seed (abstract)')
    it('should enforce implementation by subclass')

  describe('verify (abstract)')
    it('should enforce implementation by subclass')
```

### Test Suite: `seed-runner.service.test.ts`

```
describe('SeedRunner')
  describe('run')
    it('should execute all registered seeders in order')
    it('should verify constraints before seeding')
    it('should return SeedRunReport with aggregate results')
    it('should continue to next seeder if one fails (partial failure)')
    it('should log node counts per framework to console')
    it('should run verification after all seeders complete')

  describe('registerSeeder')
    it('should add a seeder to the runner')
    it('should prevent duplicate seeder registration')

  describe('verifyConstraints')
    it('should check all 15 framework constraints exist')
    it('should create missing constraints if needed')

  describe('idempotency')
    it('should produce identical results when run twice')
```

---

## Section 11: E2E Test Spec

Not applicable. This is a CLI infrastructure story with no user-facing UI.

---

## Section 12: Acceptance Criteria

1. **AC-1:** `pnpm kg:seed` CLI command is registered in root `package.json` and delegates to `apps/server`. Verified by: running `pnpm kg:seed --help` or inspecting package.json.

2. **AC-2:** `SeedRunner` service orchestrates seeding across all registered framework seeders. Verified by: unit test registers mock seeders and confirms ordered execution.

3. **AC-3:** Each framework has a dedicated seeder class implementing the `Seeder` interface with `seed()` and `verify()` methods. Verified by: `BaseSeeder` abstract class enforces the contract.

4. **AC-4:** All Cypher uses MERGE (not CREATE) to ensure idempotency. Verified by: grep for `CREATE (` returns zero results in seed files; MERGE pattern confirmed in all queries.

5. **AC-5:** Seed script is re-runnable: running twice produces no duplicates. Verified by: unit test runs mock seeder twice and confirms same node counts.

6. **AC-6:** Unique constraints verified before seeding begins. Verified by: `SeedRunner.verifyConstraints()` runs first and throws `SeedError` if constraints missing.

7. **AC-7:** Console output logs node counts per framework after completion. Verified by: unit test captures console.log and confirms format.

8. **AC-8:** Error handling: partial failures do not corrupt existing data — seeder errors are collected and reported without stopping the run. Verified by: unit test with failing seeder confirms others still execute.

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| MERGE-based idempotent seeding pattern | [Seeding Blueprint v1.1 SS Phase 2] |
| 15 framework node types across 8 frameworks | [NODE_REGISTRY v1 SS Layer 2] |
| Unique constraints per label | [NODE_REGISTRY v1 SS Constraints] |
| Expected node counts (492 total) | [SEED_VALIDATION_SPEC v1 SS Phase 2] |
| Layer 2 relationships (HAS_TOPIC, HAS_ELEMENT, etc.) | [NODE_REGISTRY v1 SS Relationships] |
| Transaction batching in groups of 50 | [Story S-U-16-2 Notes] |
| UME→ACGME bridge (6 edges) | [NODE_REGISTRY v1 SS Layer 2 Relationships] |
| Bloom NEXT_LEVEL chain (5 edges) | [NODE_REGISTRY v1 SS Layer 2 Relationships] |
| Miller NEXT_LEVEL chain (3 edges) | [NODE_REGISTRY v1 SS Layer 2 Relationships] |
| Phase 2 validation queries | [SEED_VALIDATION_SPEC v1 SS Phase 2 Validation] |
| OOP: Private fields, public getters, constructor DI | [CODE_STANDARDS SS 3.1] |
| Named exports only | [CODE_STANDARDS SS 4.4] |
| Custom error classes, no raw `throw new Error()` | [CODE_STANDARDS SS 3.4] |
| SCREAMING_SNAKE_CASE for Neo4j labels with acronym prefix | [CLAUDE.md SS Architecture Rules] |

---

## Section 14: Environment Prerequisites

### Services Required

- **Neo4j** — either Neo4j Aura (cloud) or local Neo4j instance via Docker
- No Supabase needed for this story (Neo4j only)

### New Environment Variables

```bash
# apps/server/.env — ADD these (alongside existing Supabase vars)
NEO4J_URI=bolt://localhost:7687       # or neo4j+s://xxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<password>
```

### Local Neo4j Setup (Docker)

```bash
# Start Neo4j locally for development
docker run -d \
  --name neo4j-journey \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/journey-dev-password \
  -e NEO4J_PLUGINS='["apoc"]' \
  neo4j:5-community

# Verify connection
# Browser: http://localhost:7474
# Bolt: bolt://localhost:7687
```

### Install neo4j-driver

```bash
pnpm --filter @journey-os/server add neo4j-driver
```

### Dev Setup

```bash
pnpm install
docker start neo4j-journey             # ensure Neo4j is running
pnpm --filter @journey-os/server test   # run tests (mocked, no real Neo4j needed)
pnpm kg:seed                            # run seed script (requires real Neo4j)
```

---

## Section 15: Figma / Make Prototype

Not applicable. This story creates no UI components.

---

## Implementation Notes

### Neo4j Config Pattern

```typescript
// apps/server/src/config/neo4j.config.ts

import neo4j, { Driver, Session } from 'neo4j-driver';
import { envConfig } from './env.config';

export class Neo4jClientConfig {
  static #instance: Neo4jClientConfig | null = null;
  readonly #driver: Driver;

  private constructor() {
    this.#driver = neo4j.driver(
      envConfig.NEO4J_URI,
      neo4j.auth.basic(envConfig.NEO4J_USERNAME, envConfig.NEO4J_PASSWORD),
    );
  }

  static getInstance(): Neo4jClientConfig {
    if (!Neo4jClientConfig.#instance) {
      Neo4jClientConfig.#instance = new Neo4jClientConfig();
    }
    return Neo4jClientConfig.#instance;
  }

  get driver(): Driver {
    return this.#driver;
  }

  createSession(): Session {
    return this.#driver.session();
  }

  async verifyConnectivity(): Promise<void> {
    await this.#driver.verifyConnectivity();
  }

  async close(): Promise<void> {
    await this.#driver.close();
  }

  static resetInstance(): void {
    Neo4jClientConfig.#instance = null;
  }
}

export function getNeo4jDriver(): Driver {
  return Neo4jClientConfig.getInstance().driver;
}
```

### BaseSeeder Pattern

```typescript
// apps/server/src/services/seed/base-seeder.ts

import { Driver, Session } from 'neo4j-driver';
import { Seeder, SeedResult, SeedBatch, SeedNodeError, Neo4jFrameworkLabel } from '@journey-os/types';
import { SeedError } from '../../errors/seed.errors';

const DEFAULT_BATCH_SIZE = 50;

export abstract class BaseSeeder implements Seeder {
  abstract readonly name: string;
  abstract readonly label: Neo4jFrameworkLabel;

  readonly #driver: Driver;
  readonly #batchSize: number;

  constructor(driver: Driver, batchSize: number = DEFAULT_BATCH_SIZE) {
    this.#driver = driver;
    this.#batchSize = batchSize;
  }

  abstract seed(): Promise<SeedResult>;
  abstract verify(): Promise<VerificationResult>;

  /**
   * Execute MERGE queries in transaction batches.
   * Batches items into groups of batchSize and runs each group
   * in a separate write transaction.
   */
  protected async executeBatch<T>(batch: SeedBatch<T>): Promise<{
    nodesCreated: number;
    nodesUpdated: number;
    errors: SeedNodeError[];
  }> {
    let nodesCreated = 0;
    let nodesUpdated = 0;
    const errors: SeedNodeError[] = [];

    const chunks = this.#chunkArray(batch.items, this.#batchSize);

    for (const chunk of chunks) {
      const session = this.#driver.session();
      try {
        await session.executeWrite(async (tx) => {
          for (const item of chunk) {
            try {
              const result = await tx.run(batch.mergeQuery, item as Record<string, unknown>);
              const counters = result.summary.counters.updates();
              nodesCreated += counters.nodesCreated;
              // If node wasn't created but properties were set, it was updated
              if (counters.nodesCreated === 0 && counters.propertiesSet > 0) {
                nodesUpdated += 1;
              }
            } catch (err) {
              errors.push({
                nodeId: String((item as Record<string, unknown>).id ?? 'unknown'),
                label: batch.label,
                message: err instanceof Error ? err.message : String(err),
              });
            }
          }
        });
      } finally {
        await session.close();
      }
    }

    return { nodesCreated, nodesUpdated, errors };
  }

  /**
   * Count nodes of a specific label in Neo4j.
   */
  protected async countNodes(label: Neo4jFrameworkLabel): Promise<number> {
    const session = this.#driver.session();
    try {
      const result = await session.run(
        `MATCH (n:${label}) RETURN count(n) AS count`,
      );
      return result.records[0]?.get('count').toNumber() ?? 0;
    } finally {
      await session.close();
    }
  }

  #chunkArray<T>(items: readonly T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size) as T[]);
    }
    return chunks;
  }
}
```

### SeedRunner Pattern

```typescript
// apps/server/src/services/seed/seed-runner.service.ts

import { Driver } from 'neo4j-driver';
import { Seeder, SeedRunReport, SeedResult, VerificationResult } from '@journey-os/types';
import { SeedError } from '../../errors/seed.errors';

const FRAMEWORK_CONSTRAINTS = [
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_System) REQUIRE n.code IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_Discipline) REQUIRE n.code IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_Task) REQUIRE n.code IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_Topic) REQUIRE n.code IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:LCME_Standard) REQUIRE n.number IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:LCME_Element) REQUIRE n.number IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:ACGME_Domain) REQUIRE n.code IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:ACGME_Subdomain) REQUIRE n.code IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:AAMC_Domain) REQUIRE n.code IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:AAMC_Competency) REQUIRE n.code IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:EPA) REQUIRE n.number IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:BloomLevel) REQUIRE n.level IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:MillerLevel) REQUIRE n.level IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:UME_Competency) REQUIRE n.code IS UNIQUE',
  'CREATE CONSTRAINT IF NOT EXISTS FOR (n:UME_Subcompetency) REQUIRE n.code IS UNIQUE',
];

export class SeedRunner {
  readonly #driver: Driver;
  readonly #seeders: Seeder[] = [];

  constructor(driver: Driver) {
    this.#driver = driver;
  }

  registerSeeder(seeder: Seeder): void {
    const exists = this.#seeders.some((s) => s.label === seeder.label);
    if (exists) {
      throw new SeedError(`Seeder for ${seeder.label} already registered`);
    }
    this.#seeders.push(seeder);
  }

  async run(): Promise<SeedRunReport> {
    const startTime = Date.now();
    const results: SeedResult[] = [];
    const verifications: VerificationResult[] = [];

    // 1. Verify/create constraints
    await this.#ensureConstraints();

    // 2. Run each seeder
    for (const seeder of this.#seeders) {
      try {
        console.log(`[${seeder.name}] Seeding ${seeder.label}...`);
        const result = await seeder.seed();
        results.push(result);
        console.log(
          `[${seeder.name}] ${seeder.label}: ${result.nodesCreated} created, ${result.nodesUpdated} updated (${result.durationMs}ms)`,
        );
      } catch (err) {
        console.error(`[${seeder.name}] FAILED: ${err instanceof Error ? err.message : String(err)}`);
        results.push({
          framework: seeder.name,
          label: seeder.label,
          nodesCreated: 0,
          nodesUpdated: 0,
          relationshipsCreated: 0,
          durationMs: 0,
          errors: [{ nodeId: 'runner', label: seeder.label, message: String(err) }],
        });
      }
    }

    // 3. Verify all
    for (const seeder of this.#seeders) {
      try {
        const verification = await seeder.verify();
        verifications.push(verification);
      } catch (err) {
        verifications.push({
          framework: seeder.name,
          label: seeder.label,
          expectedCount: -1,
          actualCount: -1,
          passed: false,
          orphanCount: -1,
          details: `Verification failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    const totalDurationMs = Date.now() - startTime;
    const totalNodes = results.reduce((sum, r) => sum + r.nodesCreated + r.nodesUpdated, 0);
    const totalRelationships = results.reduce((sum, r) => sum + r.relationshipsCreated, 0);
    const allPassed = verifications.every((v) => v.passed);

    console.log(`\n[SeedRunner] Complete: ${totalNodes} nodes, ${totalRelationships} relationships (${totalDurationMs}ms)`);
    console.log(`[SeedRunner] Verifications: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);

    return { results, verifications, totalNodes, totalRelationships, totalDurationMs, allPassed };
  }

  async #ensureConstraints(): Promise<void> {
    console.log('[SeedRunner] Ensuring constraints...');
    const session = this.#driver.session();
    try {
      for (const constraint of FRAMEWORK_CONSTRAINTS) {
        await session.run(constraint);
      }
      console.log(`[SeedRunner] ✓ ${FRAMEWORK_CONSTRAINTS.length} constraints verified`);
    } finally {
      await session.close();
    }
  }
}
```

### Seed CLI Script

```typescript
// apps/server/scripts/seed-frameworks.ts

import 'dotenv/config';
import { Neo4jClientConfig } from '../src/config/neo4j.config';

async function main(): Promise<void> {
  const neo4j = Neo4jClientConfig.getInstance();

  try {
    await neo4j.verifyConnectivity();
    console.log('[seed] Connected to Neo4j');

    const { SeedRunner } = await import('../src/services/seed/seed-runner.service');
    const runner = new SeedRunner(neo4j.driver);

    // Future stories (U-7, U-12) will register seeders here:
    // runner.registerSeeder(new USMLESeeder(neo4j.driver));
    // runner.registerSeeder(new LCMESeeder(neo4j.driver));
    // ...

    const report = await runner.run();

    if (!report.allPassed) {
      process.exit(1);
    }
  } catch (err) {
    console.error('[seed] Fatal error:', err);
    process.exit(1);
  } finally {
    await neo4j.close();
  }
}

main();
```

### Seed Error Classes

```typescript
// apps/server/src/errors/seed.errors.ts

import { DomainError } from './base.errors';

export class SeedError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class SeedVerificationError extends DomainError {
  constructor(
    public readonly label: string,
    public readonly expected: number,
    public readonly actual: number,
  ) {
    super(`Verification failed for ${label}: expected ${expected}, got ${actual}`);
  }
}
```

### Updated Env Config

```typescript
// apps/server/src/config/env.config.ts — ADD to existing Zod schema:

const envSchema = z.object({
  // ... existing Supabase vars ...
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_JWT_SECRET: z.string().min(32, 'SUPABASE_JWT_SECRET must be at least 32 characters'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Neo4j — NEW
  NEO4J_URI: z.string().min(1, 'NEO4J_URI is required'),
  NEO4J_USERNAME: z.string().min(1, 'NEO4J_USERNAME is required'),
  NEO4J_PASSWORD: z.string().min(1, 'NEO4J_PASSWORD is required'),
});
```

---

*Brief generated: 2026-02-19. This document is self-contained. All source data is inlined. No external lookups required for implementation.*
