---
name: seed-infrastructure-pattern
tags: [neo4j, seeding, base-seeder, seed-runner, graph, framework]
story: STORY-U-4, STORY-U-7, STORY-U-12
date: 2026-02-20
---
# Seed Infrastructure Pattern

## Problem
Each medical education framework (USMLE, ACGME, AAMC, etc.) needs to be seeded into Neo4j as graph nodes. Without a standard pattern, each seeder would implement its own batching, error handling, verification, and orchestration logic.

## Solution
Two-layer architecture: `BaseSeeder` (abstract class) handles transaction batching and node counting; `SeedRunner` orchestrates multiple seeders with ordering, progress reporting, and rollback-safe error collection.

### Creating a New Seeder (proven pattern from STORY-U-7)
```typescript
import type { SeedResult, SeedNodeError, VerificationResult, Neo4jFrameworkLabel } from "@journey-os/types";
import { BaseSeeder } from "./base-seeder";
import { MY_DATA } from "./data/my-data.data";

export class MySeeder extends BaseSeeder {
  readonly name = "my-framework";
  readonly label: Neo4jFrameworkLabel = "USMLE_System"; // primary label for registration

  async seed(): Promise<SeedResult> {
    const startTime = Date.now();
    let totalCreated = 0;
    let totalUpdated = 0;
    // IMPORTANT: Use SeedNodeError[] (mutable), NOT SeedResult["errors"] (readonly)
    const allErrors: SeedNodeError[] = [];

    const result = await this.executeBatch({
      label: "USMLE_System",
      items: MY_DATA,
      mergeQuery: `
        MERGE (n:USMLE_System {code: $code})
        SET n.id = $id, n.name = $name, n.description = $description,
            n.framework = $framework, n.level = $level, n.sort_order = $sort_order
      `,
    });
    totalCreated += result.nodesCreated;
    totalUpdated += result.nodesUpdated;
    allErrors.push(...result.errors);

    return {
      framework: "my-framework",
      label: this.label,
      nodesCreated: totalCreated,
      nodesUpdated: totalUpdated,
      relationshipsCreated: 0,
      durationMs: Date.now() - startTime,
      errors: allErrors,
    };
  }

  async verify(): Promise<VerificationResult> {
    const count = await this.countNodes("USMLE_System");
    return {
      framework: "my-framework",
      label: this.label,
      expectedCount: 16,
      actualCount: count,
      passed: count === 16,
      orphanCount: 0,
      details: `${count}/16 nodes verified`,
    };
  }
}
```

### Data File Pattern (typed TS arrays, not raw JSON)
```typescript
import type { USMLESystem } from "@journey-os/types";

interface USMLESystemSeed extends USMLESystem {
  readonly sort_order: number; // extra property for Neo4j, not in base type
}

export const USMLE_SYSTEMS: readonly USMLESystemSeed[] = [
  { id: "usmle-sys-01", code: "usmle-sys-01", name: "General Principles",
    description: "General Principles", framework: "usmle", level: 1, sort_order: 1 },
  // ...
] as const;
```

### Custom Queries (accessing driver in subclass)
```typescript
// BaseSeeder exposes: protected get driver(): Driver
// Use it for queries not covered by executeBatch/countNodes:
async #countOrphans(): Promise<number> {
  const session = this.driver.session();
  try {
    const result = await session.run(`
      MATCH (t:USMLE_Topic) WHERE NOT (:USMLE_System)-[:HAS_TOPIC]->(t)
      RETURN count(t) AS orphan_count
    `);
    return result.records[0]?.get("orphan_count").toNumber() ?? 0;
  } finally {
    await session.close();
  }
}
```

### Relationship Creation (parent-child via MERGE)
```cypher
-- Seed the child node AND create the relationship in one query:
MERGE (t:USMLE_Topic {code: $code})
SET t.id = $id, t.name = $name, t.parent_system = $parent_system
WITH t
MATCH (s:USMLE_System {code: $parent_system})
MERGE (s)-[:HAS_TOPIC]->(t)
```
**IMPORTANT:** Parent nodes must be seeded BEFORE children. Order `executeBatch()` calls accordingly.

### Registering in SeedRunner
```typescript
// apps/server/scripts/seed-frameworks.ts
import { USMLESeeder } from "../src/services/seed/usmle-seeder.service";
runner.registerSeeder(new USMLESeeder(neo4j.driver));
```

### Key Behaviors
- **MERGE (not CREATE)** — idempotent by design, safe to re-run
- **MERGE on `code`** — not `id`. The `code` field is the unique constraint key
- **Transaction batching** — `executeBatch()` chunks items (default 50) into separate write transactions
- **Error collection** — individual node failures don't abort the batch; errors are collected with nodeId + label
- **Verification** — `countNodes()` helper compares expected vs actual counts; add orphan checks for relationships
- **Ordering** — SeedRunner runs seeders in registration order (put dependencies first)

### Files
| File | Purpose |
|------|---------|
| `packages/types/src/frameworks/seeder.types.ts` | Seeder, SeedResult, SeedBatch, VerificationResult, Neo4jFrameworkLabel |
| `apps/server/src/services/seed/base-seeder.ts` | BaseSeeder abstract class (executeBatch, countNodes, driver getter) |
| `apps/server/src/services/seed/seed-runner.service.ts` | SeedRunner orchestrator |
| `apps/server/src/services/seed/usmle-seeder.service.ts` | USMLESeeder — reference implementation |
| `apps/server/src/services/seed/data/*.data.ts` | Typed seed data arrays |
| `apps/server/scripts/seed-frameworks.ts` | CLI entry point (`pnpm kg:seed`) |

### Environment
Neo4j env vars (`NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`) are **optional** in the global zod env schema. They are validated at `Neo4jClientConfig` instantiation instead, because zod validates at import time before Neo4j is needed.

## Pitfalls
1. **Don't use `SeedResult["errors"]` as accumulator type** — it's `readonly`. Import `SeedNodeError` and use `SeedNodeError[]`.
2. **Seed parents before children** — relationship MATCH clauses fail silently if parent doesn't exist yet.
3. **MERGE on `code`, not `id`** — the unique constraint is on `code`, so MERGE must key on it.

## Completed Seeders (all 8 frameworks — U-12 done)
| Seeder | Label(s) | Nodes | Relationships |
|--------|----------|-------|---------------|
| USMLESeeder | USMLE_System/Discipline/Task/Topic | 227 | HAS_TOPIC |
| LCMESeeder | LCME_Standard/Element | 105 | HAS_ELEMENT |
| ACGMESeeder | ACGME_Domain/Subdomain | 36 | HAS_SUBCOMPETENCY |
| AAMCSeeder | AAMC_Domain/Competency | 55 | HAS_SUBDOMAIN |
| UMESeeder | UME_Competency/Subcompetency | 55 | ALIGNS_WITH (cross-framework to ACGME) |
| EPASeeder | EPA | 13 | — |
| BloomSeeder | BloomLevel | 6 | — |
| MillerSeeder | MillerLevel | 4 | — |

**Total: ~498 nodes, 15 uniqueness constraints, 116 tests**

## When to Use
- Any new framework that needs graph seeding
- Run with `pnpm kg:seed`

## When Not to Use
- Supabase-only data (use Supabase migrations instead)
- Dynamic user-generated data (use DualWriteService)

## Source Reference
- [SEED_VALIDATION_SPEC_v1 § Phase 2] — framework seed counts and validation queries
- [NODE_REGISTRY_v1 § Layer 2] — framework node labels and properties
