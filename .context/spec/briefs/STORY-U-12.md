# STORY-U-12: Remaining Framework Seeds

**Epic:** E-16 (Framework Seeding)
**Feature:** F-08 (Framework Management)
**Sprint:** 1
**Lane:** universal (P0)
**Size:** M
**Old ID:** S-U-16-4

---

## User Story
As a **platform engineer**, I need the remaining 7 frameworks (LCME, ACGME, AAMC, UME, EPA, Bloom, Miller) seeded with ~265 nodes so that curriculum alignment and accreditation tools have complete reference data.

## Acceptance Criteria
- [ ] LCME: 105 nodes -- Standards + Elements with (LCME_Standard)-[:HAS_ELEMENT]->(LCME_Element)
- [ ] ACGME: 27 nodes -- Core Competencies + Sub-competencies
- [ ] AAMC: 55 nodes -- Domains with hierarchy
- [ ] UME: 55 objectives + 6 bridge nodes linking to other frameworks
- [ ] EPA: 13 Entrustable Professional Activities
- [ ] Bloom: 6 cognitive levels (Remember through Create)
- [ ] Miller: 4 competence levels (Knows, Knows How, Shows How, Does)
- [ ] All use MERGE-based idempotent seeding
- [ ] Each framework seeder class extends BaseSeeder
- [ ] Total node count after full seed: ~492 (227 USMLE + ~265 remaining)
- [ ] 8 API tests: one node-count verification per framework
- [ ] Running `pnpm kg:seed` seeds all 8 frameworks in correct order

## Reference Screens
> **None** -- backend-only story (seed scripts and data files).

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Data | apps/server | `src/services/seed/data/lcme.data.ts`, `src/services/seed/data/acgme.data.ts`, `src/services/seed/data/aamc.data.ts`, `src/services/seed/data/ume.data.ts`, `src/services/seed/data/epa.data.ts`, `src/services/seed/data/bloom.data.ts`, `src/services/seed/data/miller.data.ts` |
| Service | apps/server | `src/services/seed/lcme-seeder.service.ts`, `src/services/seed/acgme-seeder.service.ts`, `src/services/seed/aamc-seeder.service.ts`, `src/services/seed/ume-seeder.service.ts`, `src/services/seed/epa-seeder.service.ts`, `src/services/seed/bloom-seeder.service.ts`, `src/services/seed/miller-seeder.service.ts` |
| Tests | apps/server | `src/services/seed/__tests__/framework-seeders.test.ts` |

## Database Schema

**Neo4j nodes created (per framework):**

```cypher
// LCME: 12 standards + 93 elements = 105 nodes
MERGE (n:LCME_Standard {framework_id: "lcme-std-01"})
ON CREATE SET n.name = "Mission, Planning, Organization, and Integrity", n.framework = "lcme", n.level = 1, n.sort_order = 1
MERGE (e:LCME_Element {framework_id: "lcme-elem-01.1"})
MERGE (n)-[:HAS_ELEMENT]->(e)

// ACGME: 6 core + 21 sub = 27 nodes
MERGE (n:ACGME_Competency {framework_id: "acgme-patient-care"})
ON CREATE SET n.name = "Patient Care", n.framework = "acgme", n.level = 1

// AAMC: 55 domain nodes with hierarchy
MERGE (n:AAMC_Domain {framework_id: "aamc-domain-01"})

// UME: 55 objectives + 6 bridge nodes
MERGE (n:UME_Objective {framework_id: "ume-obj-01"})
MERGE (b:UME_Bridge {framework_id: "ume-bridge-01"})
MERGE (n)-[:MAPS_TO]->(acgme:ACGME_Competency {framework_id: $acgmeId})

// EPA: 13 flat nodes
MERGE (n:EPA_Activity {framework_id: "epa-01"})
ON CREATE SET n.name = "Gather a history and perform a physical examination", n.framework = "epa"

// Bloom: 6 flat nodes
MERGE (n:Bloom_Level {framework_id: "bloom-remember"})
ON CREATE SET n.name = "Remember", n.framework = "bloom", n.sort_order = 1

// Miller: 4 flat nodes
MERGE (n:Miller_Level {framework_id: "miller-knows"})
ON CREATE SET n.name = "Knows", n.framework = "miller", n.sort_order = 1
```

## API Endpoints
No API endpoints. Data is loaded via `pnpm kg:seed` CLI command.

## Dependencies
- **Blocked by:** STORY-U-2 (Framework Data Models), STORY-U-4 (Seed Script Infrastructure), STORY-U-7 (USMLE Seed Data)
- **Blocks:** STORY-IA-6 (Framework List Page needs all frameworks seeded)
- **Cross-lane:** STORY-IA-6 (Framework Browser needs complete framework data)

## Testing Requirements
- 8 API tests (one per framework):
  1. LCME node count: 105
  2. ACGME node count: 27
  3. AAMC node count: 55
  4. UME node count: 61 (55 objectives + 6 bridges)
  5. EPA node count: 13
  6. Bloom node count: 6
  7. Miller node count: 4
  8. Total cross-framework count: ~492
- 0 E2E tests

## Implementation Notes
- UME bridge nodes create cross-framework relationships: (UME_Objective)-[:MAPS_TO]->(ACGME_Competency). ACGME must be seeded before UME.
- Bloom and Miller are flat lists (no hierarchy), simplest seeders.
- LCME standards are numbered (1-12) with sub-elements; maintain official numbering in framework_id.
- Seed order matters: USMLE first (largest), then LCME, ACGME, AAMC, UME (depends on ACGME for bridges), EPA, Bloom, Miller.
- Each seeder extends BaseSeeder with `seed()` and `verify()` implementations.
- Use typed data arrays, not raw JSON, for compile-time safety.
- Constructor DI for Neo4j driver instance.
