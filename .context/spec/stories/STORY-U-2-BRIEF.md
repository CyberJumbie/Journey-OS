# STORY-U-2 Brief: Framework Data Models

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-U-2
old_id: S-U-16-1
epic: E-16 (Framework Seeding)
feature: F-08
sprint: 1
lane: universal
lane_priority: 0
within_lane_order: 2
size: S
depends_on: []
blocks:
  - STORY-U-4 (universal) — Seed Script Infrastructure
  - STORY-U-7 (universal) — USMLE Seed Data
cross_epic_blocks:
  - S-IA-17-1 — Framework browser needs these types
personas_served: [all — infrastructure story]
```

---

## Section 1: Summary

**What to build:** TypeScript interfaces and a domain model class for all 15 Layer 2 (Framework Alignment) Neo4j node types from the canonical NODE_REGISTRY v1.0. This story defines the type system that all downstream seed scripts, repositories, and queries rely on. No database writes, no API endpoints, no UI -- types and model only.

**Parent:** Epic E-16 (Framework Seeding) under Feature F-08 (Medical Education Framework Management).

**User story:** As a platform engineer, I need Neo4j node types defined for all 8 educational frameworks so that seed scripts and queries have a consistent schema to work against.

**User flows:** None directly. This is foundational infrastructure consumed by STORY-U-4 (Seed Script Infrastructure), STORY-U-7 (USMLE Seed Data), and STORY-U-12 (Remaining Framework Seeds).

**Personas:** All (infrastructure story). Directly consumed by platform engineers writing seed scripts and repositories.

### Label Reconciliation

The original story file (S-U-16-1) references some labels that differ from the canonical NODE_REGISTRY v1.0. The NODE_REGISTRY is the single source of truth. Reconciliation:

| Story File Label | Canonical Label (NODE_REGISTRY) | Resolution |
|---|---|---|
| `ACGME_Competency` | `ACGME_Domain` + `ACGME_Subdomain` | Use both canonical labels |
| `AAMC_Domain` | `AAMC_Domain` + `AAMC_Competency` | Use both canonical labels |
| `UME_Objective` | `UME_Competency` | Use canonical label |
| `UME_Bridge` | `UME_Subcompetency` | Use canonical label (bridge relationship is `ALIGNS_WITH`) |
| `EPA_Activity` | `EPA` | Use canonical PascalCase label |
| `Bloom_Level` | `BloomLevel` | Use canonical PascalCase label |
| `Miller_Level` | `MillerLevel` | Use canonical PascalCase label |

**Complete list of 15 node types to define (from NODE_REGISTRY v1.0 Layer 2):**

1. `USMLE_System` -- SCREAMING_SNAKE (acronym prefix)
2. `USMLE_Discipline` -- SCREAMING_SNAKE (acronym prefix)
3. `USMLE_Task` -- SCREAMING_SNAKE (acronym prefix)
4. `USMLE_Topic` -- SCREAMING_SNAKE (acronym prefix)
5. `LCME_Standard` -- SCREAMING_SNAKE (acronym prefix)
6. `LCME_Element` -- SCREAMING_SNAKE (acronym prefix)
7. `ACGME_Domain` -- SCREAMING_SNAKE (acronym prefix)
8. `ACGME_Subdomain` -- SCREAMING_SNAKE (acronym prefix)
9. `AAMC_Domain` -- SCREAMING_SNAKE (acronym prefix)
10. `AAMC_Competency` -- SCREAMING_SNAKE (acronym prefix)
11. `EPA` -- PascalCase (single-concept)
12. `BloomLevel` -- PascalCase (single-concept)
13. `MillerLevel` -- PascalCase (single-concept)
14. `UME_Competency` -- SCREAMING_SNAKE (acronym prefix)
15. `UME_Subcompetency` -- SCREAMING_SNAKE (acronym prefix)

---

## Section 2: Task Breakdown

Implementation order: Types --> Model. No Repository, Service, Controller, or View layers in this story.

### Types Layer (`packages/types`)

1. **Create base framework node interface** -- `packages/types/src/frameworks/framework-node.types.ts`
   - Define `FrameworkId` union type for all 8 frameworks
   - Define `BaseFrameworkNode` interface with shared properties: `id`, `name`, `description`, `framework`, `level`
   - Define `Neo4jFrameworkLabel` union type of all 15 literal label strings
   - Define `FrameworkRelationshipType` union type for Layer 2 relationships

2. **Create USMLE types** -- `packages/types/src/frameworks/usmle.types.ts`
   - `USMLESystem` interface extending `BaseFrameworkNode` with `code` property
   - `USMLEDiscipline` interface extending `BaseFrameworkNode` with `code` property
   - `USMLETask` interface extending `BaseFrameworkNode` with `code` property
   - `USMLETopic` interface extending `BaseFrameworkNode` with `code`, `parent_system` properties

3. **Create LCME types** -- `packages/types/src/frameworks/lcme.types.ts`
   - `LCMEStandard` interface extending `BaseFrameworkNode` with `number`, `title` properties
   - `LCMEElement` interface extending `BaseFrameworkNode` with `number`, `title` properties

4. **Create ACGME types** -- `packages/types/src/frameworks/acgme.types.ts`
   - `ACGMEDomain` interface extending `BaseFrameworkNode` with `code` property
   - `ACGMESubdomain` interface extending `BaseFrameworkNode` with `code`, `parent_domain` properties

5. **Create AAMC types** -- `packages/types/src/frameworks/aamc.types.ts`
   - `AAMCDomain` interface extending `BaseFrameworkNode` with `code` property
   - `AAMCCompetency` interface extending `BaseFrameworkNode` with `code`, `parent_domain` properties

6. **Create UME types** -- `packages/types/src/frameworks/ume.types.ts`
   - `UMECompetency` interface extending `BaseFrameworkNode` with `code` properties
   - `UMESubcompetency` interface extending `BaseFrameworkNode` with `code`, `do_specific` properties

7. **Create EPA types** -- `packages/types/src/frameworks/epa.types.ts`
   - `EPAActivity` interface extending `BaseFrameworkNode` with `number`, `title` properties

8. **Create Bloom types** -- `packages/types/src/frameworks/bloom.types.ts`
   - `BloomLevelNode` interface extending `BaseFrameworkNode` with `level` (1-6), `action_verbs` properties

9. **Create Miller types** -- `packages/types/src/frameworks/miller.types.ts`
   - `MillerLevelNode` interface extending `BaseFrameworkNode` with `level` (1-4) property

10. **Create barrel export** -- `packages/types/src/frameworks/index.ts`
    - Named re-exports from all 9 type files

### Model Layer (`apps/server`)

11. **Create framework node domain model** -- `apps/server/src/models/framework-node.model.ts`
    - `FrameworkNode` class with private fields, public getters
    - Constructor accepts `BaseFrameworkNode` params via DI pattern
    - `toDTO()` method returning the appropriate typed interface
    - `toNeo4jProperties()` method returning a property map for Cypher queries
    - `getNeo4jLabel()` method returning the correct SCREAMING_SNAKE or PascalCase label
    - Validation in constructor: required fields check, framework discriminator validation
    - Custom error class `InvalidFrameworkNodeError` extending `DomainError`

---

## Section 3: Data Model (Inline, Complete)

All interfaces extracted from NODE_REGISTRY v1.0 Layer 2. Property names use `snake_case` per Neo4j property naming convention from NODE_REGISTRY.

### Base Interface

```typescript
/**
 * Union of all 8 framework identifiers used as discriminators.
 * [NODE_REGISTRY v1.0 § Layer 2]
 */
export type FrameworkId =
  | 'usmle'
  | 'lcme'
  | 'acgme'
  | 'aamc'
  | 'ume'
  | 'epa'
  | 'bloom'
  | 'miller';

/**
 * All 15 canonical Neo4j labels for Layer 2 framework nodes.
 * SCREAMING_SNAKE for acronym-prefixed, PascalCase for single-concept.
 * [NODE_REGISTRY v1.0 § Naming Conventions]
 */
export type Neo4jFrameworkLabel =
  | 'USMLE_System'
  | 'USMLE_Discipline'
  | 'USMLE_Task'
  | 'USMLE_Topic'
  | 'LCME_Standard'
  | 'LCME_Element'
  | 'ACGME_Domain'
  | 'ACGME_Subdomain'
  | 'AAMC_Domain'
  | 'AAMC_Competency'
  | 'EPA'
  | 'BloomLevel'
  | 'MillerLevel'
  | 'UME_Competency'
  | 'UME_Subcompetency';

/**
 * Layer 2 intra-framework and cross-framework relationships.
 * [NODE_REGISTRY v1.0 § Layer 2 Relationships]
 */
export type FrameworkRelationshipType =
  | 'HAS_TOPIC'
  | 'HAS_ELEMENT'
  | 'HAS_SUBDOMAIN'
  | 'HAS_COMPETENCY'
  | 'HAS_SUBCOMPETENCY'
  | 'ALIGNS_WITH'
  | 'NEXT_LEVEL';

/**
 * Base properties shared by ALL Layer 2 framework nodes.
 * [NODE_REGISTRY v1.0 § Layer 2 — all node types carry id + name]
 * [S-U-16-1 AC: "All nodes share base properties: id, name, description, framework, level"]
 */
export interface BaseFrameworkNode {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly framework: FrameworkId;
  readonly level?: number;
}
```

### USMLE Types

```typescript
/**
 * USMLE organ systems (e.g., Cardiovascular, Respiratory).
 * Neo4j label: USMLE_System | Unique constraint on: code
 * [NODE_REGISTRY v1.0 § Layer 2: 16 nodes, Tier 0]
 */
export interface USMLESystem extends BaseFrameworkNode {
  readonly framework: 'usmle';
  readonly code: string;
}

/**
 * USMLE scientific disciplines (e.g., Anatomy, Pathology).
 * Neo4j label: USMLE_Discipline | Unique constraint on: code
 * [NODE_REGISTRY v1.0 § Layer 2: 7 nodes, Tier 0]
 */
export interface USMLEDiscipline extends BaseFrameworkNode {
  readonly framework: 'usmle';
  readonly code: string;
}

/**
 * USMLE physician tasks (e.g., Diagnosis, Management).
 * Neo4j label: USMLE_Task | Unique constraint on: code
 * [NODE_REGISTRY v1.0 § Layer 2: 4 nodes, Tier 0]
 */
export interface USMLETask extends BaseFrameworkNode {
  readonly framework: 'usmle';
  readonly code: string;
}

/**
 * USMLE detailed topic from Step 1 outline.
 * Neo4j label: USMLE_Topic | Unique constraint on: code
 * (USMLE_System)-[:HAS_TOPIC]->(USMLE_Topic)
 * [NODE_REGISTRY v1.0 § Layer 2: ~200 nodes, Tier 0]
 */
export interface USMLETopic extends BaseFrameworkNode {
  readonly framework: 'usmle';
  readonly code: string;
  readonly parent_system: string;
}
```

### LCME Types

```typescript
/**
 * LCME accreditation standards (12 functional areas).
 * Neo4j label: LCME_Standard | Unique constraint on: number
 * [NODE_REGISTRY v1.0 § Layer 2: 12 nodes, Tier 0]
 */
export interface LCMEStandard extends BaseFrameworkNode {
  readonly framework: 'lcme';
  readonly number: string;
  readonly title: string;
}

/**
 * LCME sub-elements within standards.
 * Neo4j label: LCME_Element | Unique constraint on: number
 * (LCME_Standard)-[:HAS_ELEMENT]->(LCME_Element)
 * [NODE_REGISTRY v1.0 § Layer 2: 93 nodes, Tier 0]
 */
export interface LCMEElement extends BaseFrameworkNode {
  readonly framework: 'lcme';
  readonly number: string;
  readonly title: string;
}
```

### ACGME Types

```typescript
/**
 * ACGME core competency domains (6 domains).
 * Neo4j label: ACGME_Domain | Unique constraint on: code
 * [NODE_REGISTRY v1.0 § Layer 2: 6 nodes, Tier 0]
 */
export interface ACGMEDomain extends BaseFrameworkNode {
  readonly framework: 'acgme';
  readonly code: string;
}

/**
 * ACGME subdomains within competency domains.
 * Neo4j label: ACGME_Subdomain | Unique constraint on: code
 * (ACGME_Domain)-[:HAS_SUBDOMAIN]->(ACGME_Subdomain)
 * [NODE_REGISTRY v1.0 § Layer 2: 21 nodes, Tier 0]
 */
export interface ACGMESubdomain extends BaseFrameworkNode {
  readonly framework: 'acgme';
  readonly code: string;
  readonly parent_domain: string;
}
```

### AAMC Types

```typescript
/**
 * AAMC Framework for UME domains (6 domains).
 * Neo4j label: AAMC_Domain | Unique constraint on: code
 * [NODE_REGISTRY v1.0 § Layer 2: 6 nodes, Tier 0]
 */
export interface AAMCDomain extends BaseFrameworkNode {
  readonly framework: 'aamc';
  readonly code: string;
}

/**
 * AAMC competencies within domains.
 * Neo4j label: AAMC_Competency | Unique constraint on: code
 * (AAMC_Domain)-[:HAS_COMPETENCY]->(AAMC_Competency)
 * [NODE_REGISTRY v1.0 § Layer 2: 49 nodes, Tier 0]
 */
export interface AAMCCompetency extends BaseFrameworkNode {
  readonly framework: 'aamc';
  readonly code: string;
  readonly parent_domain: string;
}
```

### UME Types

```typescript
/**
 * AAMC UME Objectives competency areas (6 competencies).
 * Neo4j label: UME_Competency | Unique constraint on: code
 * (UME_Competency)-[:ALIGNS_WITH]->(ACGME_Domain) -- 6 bridge edges
 * [NODE_REGISTRY v1.0 § Layer 2: 6 nodes, Tier 0]
 */
export interface UMECompetency extends BaseFrameworkNode {
  readonly framework: 'ume';
  readonly code: string;
}

/**
 * UME subcompetency objectives.
 * Neo4j label: UME_Subcompetency | Unique constraint on: code
 * (UME_Competency)-[:HAS_SUBCOMPETENCY]->(UME_Subcompetency)
 * [NODE_REGISTRY v1.0 § Layer 2: 49 nodes, Tier 0]
 */
export interface UMESubcompetency extends BaseFrameworkNode {
  readonly framework: 'ume';
  readonly code: string;
  readonly do_specific?: boolean;
}
```

### EPA Types

```typescript
/**
 * AAMC Core Entrustable Professional Activities.
 * Neo4j label: EPA | Unique constraint on: number
 * [NODE_REGISTRY v1.0 § Layer 2: 13 nodes, Tier 0]
 */
export interface EPAActivity extends BaseFrameworkNode {
  readonly framework: 'epa';
  readonly number: number;
  readonly title: string;
}
```

### Bloom Types

```typescript
/**
 * Revised Bloom's Taxonomy cognitive levels.
 * Neo4j label: BloomLevel | Unique constraint on: level
 * (BloomLevel)-[:NEXT_LEVEL]->(BloomLevel) -- ordering chain
 * [NODE_REGISTRY v1.0 § Layer 2: 6 nodes, Tier 0]
 */
export interface BloomLevelNode extends BaseFrameworkNode {
  readonly framework: 'bloom';
  readonly level: 1 | 2 | 3 | 4 | 5 | 6;
  readonly action_verbs: readonly string[];
}
```

### Miller Types

```typescript
/**
 * Miller's Pyramid clinical competence levels.
 * Neo4j label: MillerLevel | Unique constraint on: level
 * (MillerLevel)-[:NEXT_LEVEL]->(MillerLevel) -- ordering chain
 * [NODE_REGISTRY v1.0 § Layer 2: 4 nodes, Tier 0]
 */
export interface MillerLevelNode extends BaseFrameworkNode {
  readonly framework: 'miller';
  readonly level: 1 | 2 | 3 | 4;
}
```

### Discriminated Union

```typescript
/**
 * Union of all framework node types.
 * Use the `framework` discriminator to narrow.
 */
export type FrameworkNode =
  | USMLESystem
  | USMLEDiscipline
  | USMLETask
  | USMLETopic
  | LCMEStandard
  | LCMEElement
  | ACGMEDomain
  | ACGMESubdomain
  | AAMCDomain
  | AAMCCompetency
  | UMECompetency
  | UMESubcompetency
  | EPAActivity
  | BloomLevelNode
  | MillerLevelNode;
```

### Label-to-Interface Map

```typescript
/**
 * Maps Neo4j labels to their TypeScript interfaces.
 * Used by repositories and seed scripts for type-safe node creation.
 */
export interface FrameworkLabelMap {
  USMLE_System: USMLESystem;
  USMLE_Discipline: USMLEDiscipline;
  USMLE_Task: USMLETask;
  USMLE_Topic: USMLETopic;
  LCME_Standard: LCMEStandard;
  LCME_Element: LCMEElement;
  ACGME_Domain: ACGMEDomain;
  ACGME_Subdomain: ACGMESubdomain;
  AAMC_Domain: AAMCDomain;
  AAMC_Competency: AAMCCompetency;
  EPA: EPAActivity;
  BloomLevel: BloomLevelNode;
  MillerLevel: MillerLevelNode;
  UME_Competency: UMECompetency;
  UME_Subcompetency: UMESubcompetency;
}
```

---

## Section 4: Database Schema (Inline, Complete)

### Neo4j Unique Constraints (Layer 2)

All constraints are idempotent (`IF NOT EXISTS`). Extracted from NODE_REGISTRY v1.0 Section "Neo4j Constraints (Idempotent)".

```cypher
-- USMLE framework constraints
CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_System) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_Discipline) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_Task) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_Topic) REQUIRE n.code IS UNIQUE;

-- LCME framework constraints
CREATE CONSTRAINT IF NOT EXISTS FOR (n:LCME_Standard) REQUIRE n.number IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:LCME_Element) REQUIRE n.number IS UNIQUE;

-- ACGME framework constraints
CREATE CONSTRAINT IF NOT EXISTS FOR (n:ACGME_Domain) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:ACGME_Subdomain) REQUIRE n.code IS UNIQUE;

-- AAMC framework constraints
CREATE CONSTRAINT IF NOT EXISTS FOR (n:AAMC_Domain) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:AAMC_Competency) REQUIRE n.code IS UNIQUE;

-- EPA constraint
CREATE CONSTRAINT IF NOT EXISTS FOR (n:EPA) REQUIRE n.number IS UNIQUE;

-- Taxonomy level constraints
CREATE CONSTRAINT IF NOT EXISTS FOR (n:BloomLevel) REQUIRE n.level IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:MillerLevel) REQUIRE n.level IS UNIQUE;

-- UME framework constraints
CREATE CONSTRAINT IF NOT EXISTS FOR (n:UME_Competency) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:UME_Subcompetency) REQUIRE n.code IS UNIQUE;
```

**Important note on constraint fields:** The NODE_REGISTRY uses `code` (not `id` or `framework_id`) as the unique key for most framework nodes. LCME uses `number`. BloomLevel and MillerLevel use `level`. The story's acceptance criteria mentions "framework_id" but the canonical NODE_REGISTRY takes precedence -- constraints are on the natural key for each type as shown above.

### Layer 2 Intra-Framework Relationships

```cypher
-- USMLE hierarchy
-- (USMLE_System)-[:HAS_TOPIC]->(USMLE_Topic)

-- LCME hierarchy
-- (LCME_Standard)-[:HAS_ELEMENT]->(LCME_Element)

-- ACGME hierarchy
-- (ACGME_Domain)-[:HAS_SUBDOMAIN]->(ACGME_Subdomain)

-- AAMC hierarchy
-- (AAMC_Domain)-[:HAS_COMPETENCY]->(AAMC_Competency)

-- UME hierarchy + bridge
-- (UME_Competency)-[:HAS_SUBCOMPETENCY]->(UME_Subcompetency)
-- (UME_Competency)-[:ALIGNS_WITH]->(ACGME_Domain)  -- 6 bridge edges

-- Taxonomy ordering
-- (BloomLevel)-[:NEXT_LEVEL]->(BloomLevel)  -- 5 edges: 1->2, 2->3, 3->4, 4->5, 5->6
-- (MillerLevel)-[:NEXT_LEVEL]->(MillerLevel)  -- 3 edges: 1->2, 2->3, 3->4
```

### Cross-Layer Relationships (Layer 1 <-> Layer 2)

These relationships are NOT created by this story but are documented here so types account for them:

```cypher
-- Created during ILO framework mapping (Phase 3 of seeding)
-- (ILO)-[:MAPS_TO_COMPETENCY]->(ACGME_Domain)
-- (ILO)-[:MAPS_TO_EPA]->(EPA)
-- (ILO)-[:ADDRESSES_LCME]->(LCME_Element)
-- (ILO)-[:MAPS_TO_UME]->(UME_Subcompetency)
-- (SLO)-[:MAPS_TO_UME]->(UME_Subcompetency)
```

### Expected Node Counts (from SEED_VALIDATION_SPEC v1.0 Phase 2)

| Label | Expected Count | Tolerance |
|---|---|---|
| `USMLE_System` | 16 | +/-0 |
| `USMLE_Discipline` | 7 | +/-0 |
| `USMLE_Task` | 4 | +/-0 |
| `USMLE_Topic` | ~200 | +/-20 |
| `LCME_Standard` | 12 | +/-0 |
| `LCME_Element` | 93 | +/-0 |
| `ACGME_Domain` | 6 | +/-0 |
| `ACGME_Subdomain` | 21 | +/-0 |
| `AAMC_Domain` | 6 | +/-0 |
| `AAMC_Competency` | 49 | +/-0 |
| `EPA` | 13 | +/-0 |
| `BloomLevel` | 6 | +/-0 |
| `MillerLevel` | 4 | +/-0 |
| `UME_Competency` | 6 | +/-0 |
| `UME_Subcompetency` | 49 | +/-0 |
| **Total Layer 2** | **~492** | +/-20 (from USMLE_Topic) |

---

## Section 5: API Contract

Not applicable. This story defines TypeScript interfaces and a domain model only. No HTTP endpoints, no Express routes, no controller layer.

---

## Section 6: Frontend Spec

Not applicable. No UI components in this story.

---

## Section 7: Files to Create (Exact Paths, Implementation Order)

```
1.  packages/types/src/frameworks/framework-node.types.ts   (base interface, unions, shared types)
2.  packages/types/src/frameworks/usmle.types.ts            (USMLESystem, USMLEDiscipline, USMLETask, USMLETopic)
3.  packages/types/src/frameworks/lcme.types.ts             (LCMEStandard, LCMEElement)
4.  packages/types/src/frameworks/acgme.types.ts            (ACGMEDomain, ACGMESubdomain)
5.  packages/types/src/frameworks/aamc.types.ts             (AAMCDomain, AAMCCompetency)
6.  packages/types/src/frameworks/ume.types.ts              (UMECompetency, UMESubcompetency)
7.  packages/types/src/frameworks/epa.types.ts              (EPAActivity)
8.  packages/types/src/frameworks/bloom.types.ts            (BloomLevelNode)
9.  packages/types/src/frameworks/miller.types.ts           (MillerLevelNode)
10. packages/types/src/frameworks/index.ts                  (barrel re-exports)
11. apps/server/src/models/framework-node.model.ts          (FrameworkNode domain model class)
```

**Directory creation required:**
- `packages/types/src/frameworks/` (new directory)

---

## Section 8: Dependencies

### NPM Packages

| Package | Purpose | Already Installed? |
|---|---|---|
| `typescript` | TypeScript compiler | Yes (monorepo root) |
| `neo4j-driver` | Neo4j driver types (used by model for property maps) | Needed by `apps/server` |

### Existing Files (to be aware of, not modified)

| File | Relevance |
|---|---|
| `apps/server/src/errors/index.ts` | Custom error classes -- `DomainError` base class that `InvalidFrameworkNodeError` should extend. If not yet created, create `DomainError` following CODE_STANDARDS pattern. |
| `packages/types/src/index.ts` | Root barrel export -- add `export * from './frameworks'` after creating framework types. |
| `apps/server/tsconfig.json` | Ensure `packages/types` is in `references` or path aliases. |

### Internal Dependencies

- None (this story has zero dependencies -- it is a starting point).

---

## Section 9: Test Fixtures (Inline)

JSON examples for each of the 15 framework node types with all required properties. These fixtures are used in Section 10 tests.

```typescript
// test/fixtures/framework-nodes.fixtures.ts

export const FIXTURES = {
  usmleSystem: {
    id: 'usmle-sys-001',
    code: 'SYS-CVS',
    name: 'Cardiovascular System',
    description: 'Heart and vascular system',
    framework: 'usmle' as const,
  },

  usmleDiscipline: {
    id: 'usmle-disc-001',
    code: 'DISC-PATH',
    name: 'Pathology',
    description: 'Study of disease processes',
    framework: 'usmle' as const,
  },

  usmleTask: {
    id: 'usmle-task-001',
    code: 'TASK-DX',
    name: 'Diagnosis',
    description: 'Establishing a diagnosis',
    framework: 'usmle' as const,
  },

  usmleTopic: {
    id: 'usmle-topic-001',
    code: 'TOPIC-CVS-001',
    name: 'Atherosclerosis',
    description: 'Chronic inflammatory disease of arterial walls',
    framework: 'usmle' as const,
    parent_system: 'SYS-CVS',
  },

  lcmeStandard: {
    id: 'lcme-std-001',
    number: '7',
    name: 'Curricular Content',
    title: 'Curricular Content',
    description: 'The faculty of a medical school ensure that the medical curriculum...',
    framework: 'lcme' as const,
  },

  lcmeElement: {
    id: 'lcme-elem-001',
    number: '7.1',
    name: 'Biomedical Sciences',
    title: 'Biomedical Sciences',
    description: 'The faculty ensure the curriculum includes content from biomedical sciences',
    framework: 'lcme' as const,
  },

  acgmeDomain: {
    id: 'acgme-dom-001',
    code: 'MK',
    name: 'Medical Knowledge',
    description: 'Residents must demonstrate knowledge of established and evolving biomedical...',
    framework: 'acgme' as const,
  },

  acgmeSubdomain: {
    id: 'acgme-sub-001',
    code: 'MK-1',
    name: 'Clinical Sciences',
    description: 'Application of clinical sciences to patient care',
    framework: 'acgme' as const,
    parent_domain: 'MK',
  },

  aamcDomain: {
    id: 'aamc-dom-001',
    code: 'KP',
    name: 'Knowledge for Practice',
    description: 'Demonstrate knowledge of established and evolving biomedical sciences...',
    framework: 'aamc' as const,
  },

  aamcCompetency: {
    id: 'aamc-comp-001',
    code: 'KP-1',
    name: 'Apply established and emerging bio-scientific principles',
    description: 'Apply knowledge of molecular, cellular, biochemical mechanisms...',
    framework: 'aamc' as const,
    parent_domain: 'KP',
  },

  umeCompetency: {
    id: 'ume-comp-001',
    code: 'UME-MK',
    name: 'Medical Knowledge',
    description: 'Demonstrate knowledge of established and evolving biomedical sciences',
    framework: 'ume' as const,
  },

  umeSubcompetency: {
    id: 'ume-sub-001',
    code: 'UME-MK-1',
    name: 'Apply Foundational Sciences',
    description: 'Apply foundational science knowledge to clinical scenarios',
    framework: 'ume' as const,
    do_specific: true,
  },

  epa: {
    id: 'epa-001',
    number: 1,
    name: 'Gather a History and Perform a Physical Examination',
    title: 'Gather a History and Perform a Physical Examination',
    description: 'Gather an accurate and prioritized history and perform a physical exam...',
    framework: 'epa' as const,
  },

  bloomLevel: {
    id: 'bloom-001',
    level: 1 as const,
    name: 'Remember',
    description: 'Retrieve relevant knowledge from long-term memory',
    framework: 'bloom' as const,
    action_verbs: ['define', 'list', 'recall', 'recognize', 'identify', 'name'],
  },

  millerLevel: {
    id: 'miller-001',
    level: 1 as const,
    name: 'Knows',
    description: 'Factual recall of knowledge',
    framework: 'miller' as const,
  },
} as const;
```

---

## Section 10: API Test Spec (Vitest)

File: `packages/types/src/frameworks/__tests__/framework-types.test.ts`
File: `apps/server/src/models/__tests__/framework-node.model.test.ts`

### Type Validation Tests

```typescript
// packages/types/src/frameworks/__tests__/framework-types.test.ts

import { describe, it, expect } from 'vitest';
import type {
  BaseFrameworkNode,
  FrameworkId,
  Neo4jFrameworkLabel,
  USMLESystem,
  USMLETopic,
  LCMEStandard,
  LCMEElement,
  ACGMEDomain,
  ACGMESubdomain,
  AAMCDomain,
  AAMCCompetency,
  UMECompetency,
  UMESubcompetency,
  EPAActivity,
  BloomLevelNode,
  MillerLevelNode,
  FrameworkLabelMap,
} from '../index';
import { FIXTURES } from '../../../../test/fixtures/framework-nodes.fixtures';

describe('Framework Type Definitions', () => {
  it('FrameworkId covers all 8 frameworks', () => {
    const frameworks: FrameworkId[] = [
      'usmle', 'lcme', 'acgme', 'aamc', 'ume', 'epa', 'bloom', 'miller',
    ];
    expect(frameworks).toHaveLength(8);
  });

  it('Neo4jFrameworkLabel covers all 15 labels', () => {
    const labels: Neo4jFrameworkLabel[] = [
      'USMLE_System', 'USMLE_Discipline', 'USMLE_Task', 'USMLE_Topic',
      'LCME_Standard', 'LCME_Element',
      'ACGME_Domain', 'ACGME_Subdomain',
      'AAMC_Domain', 'AAMC_Competency',
      'EPA', 'BloomLevel', 'MillerLevel',
      'UME_Competency', 'UME_Subcompetency',
    ];
    expect(labels).toHaveLength(15);
  });

  it('USMLE_System fixture satisfies USMLESystem interface', () => {
    const node: USMLESystem = FIXTURES.usmleSystem;
    expect(node.framework).toBe('usmle');
    expect(node.code).toBeDefined();
    expect(node.name).toBeDefined();
    expect(node.id).toBeDefined();
  });

  it('USMLE_Topic fixture includes parent_system', () => {
    const node: USMLETopic = FIXTURES.usmleTopic;
    expect(node.parent_system).toBe('SYS-CVS');
  });

  it('LCME_Standard fixture has number field', () => {
    const node: LCMEStandard = FIXTURES.lcmeStandard;
    expect(node.number).toBe('7');
    expect(node.title).toBeDefined();
  });

  it('LCME_Element fixture has number field', () => {
    const node: LCMEElement = FIXTURES.lcmeElement;
    expect(node.number).toBe('7.1');
  });

  it('ACGME_Subdomain has parent_domain', () => {
    const node: ACGMESubdomain = FIXTURES.acgmeSubdomain;
    expect(node.parent_domain).toBe('MK');
  });

  it('AAMC_Competency has parent_domain', () => {
    const node: AAMCCompetency = FIXTURES.aamcCompetency;
    expect(node.parent_domain).toBe('KP');
  });

  it('UME_Subcompetency has do_specific flag', () => {
    const node: UMESubcompetency = FIXTURES.umeSubcompetency;
    expect(node.do_specific).toBe(true);
  });

  it('EPA fixture has numeric number field', () => {
    const node: EPAActivity = FIXTURES.epa;
    expect(typeof node.number).toBe('number');
    expect(node.number).toBe(1);
  });

  it('BloomLevel fixture has level 1-6 and action_verbs array', () => {
    const node: BloomLevelNode = FIXTURES.bloomLevel;
    expect(node.level).toBeGreaterThanOrEqual(1);
    expect(node.level).toBeLessThanOrEqual(6);
    expect(Array.isArray(node.action_verbs)).toBe(true);
    expect(node.action_verbs.length).toBeGreaterThan(0);
  });

  it('MillerLevel fixture has level 1-4', () => {
    const node: MillerLevelNode = FIXTURES.millerLevel;
    expect(node.level).toBeGreaterThanOrEqual(1);
    expect(node.level).toBeLessThanOrEqual(4);
  });

  it('FrameworkLabelMap maps all 15 labels to correct interfaces', () => {
    // Compile-time check: this would fail to compile if mapping is incorrect
    const _check: FrameworkLabelMap['USMLE_System'] = FIXTURES.usmleSystem;
    const _check2: FrameworkLabelMap['BloomLevel'] = FIXTURES.bloomLevel;
    const _check3: FrameworkLabelMap['EPA'] = FIXTURES.epa;
    expect(_check).toBeDefined();
    expect(_check2).toBeDefined();
    expect(_check3).toBeDefined();
  });

  it('all fixtures have required BaseFrameworkNode properties', () => {
    const allFixtures = Object.values(FIXTURES);
    for (const fixture of allFixtures) {
      expect(fixture.id).toBeDefined();
      expect(typeof fixture.id).toBe('string');
      expect(fixture.name).toBeDefined();
      expect(typeof fixture.name).toBe('string');
      expect(fixture.framework).toBeDefined();
    }
  });
});
```

### Model Class Tests

```typescript
// apps/server/src/models/__tests__/framework-node.model.test.ts

import { describe, it, expect } from 'vitest';
import { FrameworkNodeModel } from '../framework-node.model';
import { FIXTURES } from '../../../../../test/fixtures/framework-nodes.fixtures';

describe('FrameworkNodeModel', () => {
  describe('construction', () => {
    it('creates a model from USMLESystem fixture', () => {
      const model = new FrameworkNodeModel(FIXTURES.usmleSystem, 'USMLE_System');
      expect(model.id).toBe('usmle-sys-001');
      expect(model.name).toBe('Cardiovascular System');
      expect(model.framework).toBe('usmle');
      expect(model.neo4jLabel).toBe('USMLE_System');
    });

    it('creates a model from BloomLevel fixture', () => {
      const model = new FrameworkNodeModel(FIXTURES.bloomLevel, 'BloomLevel');
      expect(model.neo4jLabel).toBe('BloomLevel');
      expect(model.framework).toBe('bloom');
    });

    it('throws InvalidFrameworkNodeError when id is missing', () => {
      expect(() => {
        new FrameworkNodeModel({ ...FIXTURES.usmleSystem, id: '' }, 'USMLE_System');
      }).toThrow('InvalidFrameworkNodeError');
    });

    it('throws InvalidFrameworkNodeError when name is missing', () => {
      expect(() => {
        new FrameworkNodeModel({ ...FIXTURES.usmleSystem, name: '' }, 'USMLE_System');
      }).toThrow('InvalidFrameworkNodeError');
    });

    it('throws InvalidFrameworkNodeError for invalid framework', () => {
      expect(() => {
        new FrameworkNodeModel(
          { ...FIXTURES.usmleSystem, framework: 'invalid' as any },
          'USMLE_System',
        );
      }).toThrow('InvalidFrameworkNodeError');
    });
  });

  describe('toDTO', () => {
    it('returns a plain object matching the input fixture', () => {
      const model = new FrameworkNodeModel(FIXTURES.acgmeDomain, 'ACGME_Domain');
      const dto = model.toDTO();
      expect(dto.id).toBe('acgme-dom-001');
      expect(dto.code).toBe('MK');
      expect(dto.framework).toBe('acgme');
    });
  });

  describe('toNeo4jProperties', () => {
    it('returns a flat property map suitable for Cypher params', () => {
      const model = new FrameworkNodeModel(FIXTURES.lcmeElement, 'LCME_Element');
      const props = model.toNeo4jProperties();
      expect(props.id).toBe('lcme-elem-001');
      expect(props.number).toBe('7.1');
      expect(props.name).toBe('Biomedical Sciences');
      // Should not include undefined/null values
      expect(Object.values(props).every(v => v !== undefined)).toBe(true);
    });

    it('serializes action_verbs array for BloomLevel', () => {
      const model = new FrameworkNodeModel(FIXTURES.bloomLevel, 'BloomLevel');
      const props = model.toNeo4jProperties();
      expect(Array.isArray(props.action_verbs)).toBe(true);
    });
  });

  describe('getNeo4jLabel', () => {
    it('returns SCREAMING_SNAKE for acronym-prefixed labels', () => {
      const model = new FrameworkNodeModel(FIXTURES.usmleSystem, 'USMLE_System');
      expect(model.neo4jLabel).toBe('USMLE_System');
    });

    it('returns PascalCase for single-concept labels', () => {
      const model = new FrameworkNodeModel(FIXTURES.bloomLevel, 'BloomLevel');
      expect(model.neo4jLabel).toBe('BloomLevel');
    });

    it('returns PascalCase for EPA', () => {
      const model = new FrameworkNodeModel(FIXTURES.epa, 'EPA');
      expect(model.neo4jLabel).toBe('EPA');
    });
  });

  describe('all 15 node types instantiate correctly', () => {
    const cases: Array<[string, Record<string, unknown>, string]> = [
      ['USMLE_System', FIXTURES.usmleSystem, 'USMLE_System'],
      ['USMLE_Discipline', FIXTURES.usmleDiscipline, 'USMLE_Discipline'],
      ['USMLE_Task', FIXTURES.usmleTask, 'USMLE_Task'],
      ['USMLE_Topic', FIXTURES.usmleTopic, 'USMLE_Topic'],
      ['LCME_Standard', FIXTURES.lcmeStandard, 'LCME_Standard'],
      ['LCME_Element', FIXTURES.lcmeElement, 'LCME_Element'],
      ['ACGME_Domain', FIXTURES.acgmeDomain, 'ACGME_Domain'],
      ['ACGME_Subdomain', FIXTURES.acgmeSubdomain, 'ACGME_Subdomain'],
      ['AAMC_Domain', FIXTURES.aamcDomain, 'AAMC_Domain'],
      ['AAMC_Competency', FIXTURES.aamcCompetency, 'AAMC_Competency'],
      ['UME_Competency', FIXTURES.umeCompetency, 'UME_Competency'],
      ['UME_Subcompetency', FIXTURES.umeSubcompetency, 'UME_Subcompetency'],
      ['EPA', FIXTURES.epa, 'EPA'],
      ['BloomLevel', FIXTURES.bloomLevel, 'BloomLevel'],
      ['MillerLevel', FIXTURES.millerLevel, 'MillerLevel'],
    ];

    it.each(cases)('%s instantiates without error', (label, fixture, neo4jLabel) => {
      expect(() => new FrameworkNodeModel(fixture as any, neo4jLabel as any)).not.toThrow();
    });
  });
});
```

---

## Section 11: E2E Test Spec

Not applicable. This is a pure infrastructure story (types + model). No UI, no API endpoints, no user-facing behavior to test end-to-end.

---

## Section 12: Acceptance Criteria

Numbered, testable, specific. Reconciled against NODE_REGISTRY v1.0 as the canonical source.

1. **AC-1:** TypeScript interface `BaseFrameworkNode` exists in `packages/types/src/frameworks/framework-node.types.ts` with properties `id: string`, `name: string`, `description?: string`, `framework: FrameworkId`, `level?: number`.

2. **AC-2:** TypeScript interfaces exist for all 4 USMLE node types: `USMLESystem`, `USMLEDiscipline`, `USMLETask`, `USMLETopic` -- each extending `BaseFrameworkNode` and matching NODE_REGISTRY properties exactly.

3. **AC-3:** TypeScript interfaces exist for both LCME node types: `LCMEStandard` (with `number`, `title`) and `LCMEElement` (with `number`, `title`) -- matching NODE_REGISTRY properties.

4. **AC-4:** TypeScript interfaces exist for ACGME: `ACGMEDomain` (with `code`) and `ACGMESubdomain` (with `code`, `parent_domain`).

5. **AC-5:** TypeScript interfaces exist for AAMC: `AAMCDomain` (with `code`) and `AAMCCompetency` (with `code`, `parent_domain`).

6. **AC-6:** TypeScript interfaces exist for UME: `UMECompetency` (with `code`) and `UMESubcompetency` (with `code`, `do_specific`).

7. **AC-7:** TypeScript interface `EPAActivity` exists with `number: number` and `title: string`.

8. **AC-8:** TypeScript interface `BloomLevelNode` exists with `level: 1|2|3|4|5|6` and `action_verbs: readonly string[]`.

9. **AC-9:** TypeScript interface `MillerLevelNode` exists with `level: 1|2|3|4`.

10. **AC-10:** `Neo4jFrameworkLabel` union type contains all 15 canonical label strings matching NODE_REGISTRY exactly: `USMLE_System`, `USMLE_Discipline`, `USMLE_Task`, `USMLE_Topic`, `LCME_Standard`, `LCME_Element`, `ACGME_Domain`, `ACGME_Subdomain`, `AAMC_Domain`, `AAMC_Competency`, `EPA`, `BloomLevel`, `MillerLevel`, `UME_Competency`, `UME_Subcompetency`.

11. **AC-11:** `FrameworkLabelMap` type maps each of the 15 Neo4j labels to its corresponding TypeScript interface.

12. **AC-12:** `FrameworkNodeModel` class in `apps/server/src/models/framework-node.model.ts` follows OOP rules: private fields, public getters, constructor DI.

13. **AC-13:** `FrameworkNodeModel.toDTO()` returns a plain object matching the source interface.

14. **AC-14:** `FrameworkNodeModel.toNeo4jProperties()` returns a flat `Record<string, unknown>` with no undefined values, suitable for Cypher query parameters.

15. **AC-15:** `FrameworkNodeModel.neo4jLabel` returns the correct SCREAMING_SNAKE or PascalCase label string.

16. **AC-16:** Constructor validation throws `InvalidFrameworkNodeError` (extending `DomainError`) for missing `id`, missing `name`, or invalid `framework` value.

17. **AC-17:** All exports are named exports. No default exports anywhere.

18. **AC-18:** Barrel file `packages/types/src/frameworks/index.ts` re-exports all types from all 9 framework type files.

19. **AC-19:** `pnpm typecheck` passes with no errors.

20. **AC-20:** All 15 idempotent unique constraints are documented in the Cypher section (to be applied by STORY-U-4 seed infrastructure). Constraints match NODE_REGISTRY exactly: `code` for USMLE/ACGME/AAMC/UME, `number` for LCME/EPA, `level` for Bloom/Miller.

---

## Section 13: Source References

Every claim in this brief is traced to its source document and section.

| Claim | Source |
|---|---|
| 15 framework node types in Layer 2 | NODE_REGISTRY v1.0 Section "Layer 2 -- Framework Alignment" |
| SCREAMING_SNAKE for acronym-prefixed labels | NODE_REGISTRY v1.0 Section "Naming Conventions" |
| PascalCase for single-concept labels | NODE_REGISTRY v1.0 Section "Naming Conventions" |
| Property names use snake_case | NODE_REGISTRY v1.0 Section "Naming Conventions" |
| USMLE_System properties: id, code, name | NODE_REGISTRY v1.0 Layer 2 table row 1 |
| USMLE_Discipline properties: id, code, name | NODE_REGISTRY v1.0 Layer 2 table row 2 |
| USMLE_Task properties: id, code, name | NODE_REGISTRY v1.0 Layer 2 table row 3 |
| USMLE_Topic properties: id, code, name, parent_system | NODE_REGISTRY v1.0 Layer 2 table row 4 |
| LCME_Standard properties: id, number, title | NODE_REGISTRY v1.0 Layer 2 table row 5 |
| LCME_Element properties: id, number, title, description | NODE_REGISTRY v1.0 Layer 2 table row 6 |
| ACGME_Domain properties: id, code, name | NODE_REGISTRY v1.0 Layer 2 table row 7 |
| ACGME_Subdomain properties: id, code, name, parent_domain | NODE_REGISTRY v1.0 Layer 2 table row 8 |
| AAMC_Domain properties: id, code, name | NODE_REGISTRY v1.0 Layer 2 table row 9 |
| AAMC_Competency properties: id, code, name, parent_domain | NODE_REGISTRY v1.0 Layer 2 table row 10 |
| EPA properties: id, number, title, description | NODE_REGISTRY v1.0 Layer 2 table row 11 |
| BloomLevel properties: id, level (1-6), name, action_verbs[] | NODE_REGISTRY v1.0 Layer 2 table row 12 |
| MillerLevel properties: id, level (1-4), name, description | NODE_REGISTRY v1.0 Layer 2 table row 13 |
| UME_Competency properties: id, code, name, description | NODE_REGISTRY v1.0 Layer 2 table row 14 |
| UME_Subcompetency properties: id, code, name, description, do_specific | NODE_REGISTRY v1.0 Layer 2 table row 15 |
| Unique constraints on code/number/level | NODE_REGISTRY v1.0 Section "Neo4j Constraints (Idempotent)" |
| Expected node counts (exact) | SEED_VALIDATION_SPEC v1.0 Section "Phase 2: Framework Alignment" |
| Layer 2 relationships: HAS_TOPIC, HAS_ELEMENT, etc. | NODE_REGISTRY v1.0 Section "Layer 2 Relationships" |
| ALIGNS_WITH bridge: 6 edges UME_Competency -> ACGME_Domain | NODE_REGISTRY v1.0 Layer 2 Relationships table |
| NEXT_LEVEL ordering for Bloom and Miller | NODE_REGISTRY v1.0 Layer 2 Relationships table |
| Bloom ordering validation: 5 edges | SEED_VALIDATION_SPEC v1.0 validation query #5 |
| Layer 2 total: ~492 nodes | NODE_REGISTRY v1.0 "Layer 2 Total: 15 node types, ~492 nodes" |
| 5-layer ontology structure | Seeding Blueprint v1.1 Section 1 "The Ontology at a Glance" |
| Framework nodes are quasi-static, seeded once | Seeding Blueprint v1.1 Section 2 Layer 2 |
| Frameworks seeded by engineer seed scripts | Seeding Blueprint v1.1 Section 10 Phase 2 |
| OOP: private fields, public getters, constructor DI | CODE_STANDARDS Section 3 "OOP Standards" |
| Custom error classes, no raw throw new Error() | CODE_STANDARDS Section 3.4 "Error Handling" |
| Named exports only, no default exports | CLAUDE_MD_TEMPLATE "OOP Rules" section |
| Implementation order: Types -> Model | CLAUDE_MD_TEMPLATE "Implementation Order" section |
| Deprecated labels list | NODE_REGISTRY v1.0 "Deprecated Labels" + CLAUDE_MD_TEMPLATE "NEVER USE" |
| Domain model pattern (class with toDTO) | CODE_STANDARDS Section 2.3 "Model Layer" |

---

## Section 14: Environment Prerequisites

| Requirement | Details |
|---|---|
| **Node.js** | v20+ (monorepo requirement) |
| **TypeScript** | 5.3+ with `strict: true` |
| **pnpm** | Monorepo package manager |
| **Neo4j instance** | Not required for this story (types/model only). Required by STORY-U-4 for constraint creation. |
| **neo4j-driver** | Needed in `apps/server` dependencies for `neo4j-driver` types used by model's `toNeo4jProperties()`. |

### Environment Variables

None required for this story. The following will be needed by downstream stories (U-4, U-7):

```env
NEO4J_URI=neo4j+s://<instance>.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=<password>
```

---

## Section 15: Figma / Make Prototype

Not applicable. No UI in this story.
