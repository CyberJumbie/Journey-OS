# STORY-U-2: Framework Data Models

**Epic:** E-16 (Framework Seeding)
**Feature:** F-08 (Framework Management)
**Sprint:** 1
**Lane:** universal (P0)
**Size:** S
**Old ID:** S-U-16-1

---

## User Story
As a **platform engineer**, I need Neo4j node types defined for all 8 educational frameworks so that seed scripts and queries have a consistent schema to work against.

## Acceptance Criteria
- [ ] Neo4j node labels defined: USMLE_System, USMLE_Discipline, USMLE_Task, USMLE_Topic
- [ ] Neo4j node labels defined: LCME_Standard, LCME_Element
- [ ] Neo4j node labels defined: ACGME_Competency, AAMC_Domain, UME_Objective, UME_Bridge
- [ ] Neo4j node labels defined: EPA_Activity, Bloom_Level, Miller_Level
- [ ] TypeScript interfaces for all framework node types in packages/types
- [ ] Unique constraints created on framework_id for each node label
- [ ] SCREAMING_SNAKE_CASE used for acronym-prefixed labels (USMLE_System)
- [ ] PascalCase used for non-acronym labels (SubConcept pattern)
- [ ] All nodes share base properties: id, name, description, framework, level

## Reference Screens
> **None** -- backend-only story (database types and Neo4j schema).

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/frameworks/framework-node.types.ts`, `src/frameworks/usmle.types.ts`, `src/frameworks/lcme.types.ts`, `src/frameworks/acgme.types.ts`, `src/frameworks/aamc.types.ts`, `src/frameworks/ume.types.ts`, `src/frameworks/epa.types.ts`, `src/frameworks/bloom.types.ts`, `src/frameworks/miller.types.ts`, `src/frameworks/index.ts` |
| Model | apps/server | `src/models/framework-node.model.ts` |

## Database Schema

**Neo4j Node Labels and Relationships:**

```cypher
// USMLE hierarchy
(:USMLE_System {framework_id, name, description, framework: "usmle", level: 1, sort_order})
(:USMLE_Discipline {framework_id, name, description, framework: "usmle", level: 2, sort_order})
(:USMLE_Task {framework_id, name, description, framework: "usmle", level: 3, sort_order})
(:USMLE_Topic {framework_id, name, description, framework: "usmle", level: 4, sort_order})
(USMLE_System)-[:CONTAINS]->(USMLE_Discipline)

// LCME hierarchy
(:LCME_Standard {framework_id, name, description, framework: "lcme", level: 1, sort_order})
(:LCME_Element {framework_id, name, description, framework: "lcme", level: 2, sort_order})
(LCME_Standard)-[:HAS_ELEMENT]->(LCME_Element)

// ACGME
(:ACGME_Competency {framework_id, name, description, framework: "acgme", level, sort_order})

// AAMC
(:AAMC_Domain {framework_id, name, description, framework: "aamc", level, sort_order})

// UME + Bridge nodes
(:UME_Objective {framework_id, name, description, framework: "ume", level, sort_order})
(:UME_Bridge {framework_id, name, description, framework: "ume_bridge", level, sort_order})
(UME_Objective)-[:MAPS_TO]->(ACGME_Competency)

// Flat frameworks
(:EPA_Activity {framework_id, name, description, framework: "epa", level: 1, sort_order})
(:Bloom_Level {framework_id, name, description, framework: "bloom", level: 1, sort_order})
(:Miller_Level {framework_id, name, description, framework: "miller", level: 1, sort_order})

// Unique constraints
CREATE CONSTRAINT FOR (n:USMLE_System) REQUIRE n.framework_id IS UNIQUE;
CREATE CONSTRAINT FOR (n:USMLE_Discipline) REQUIRE n.framework_id IS UNIQUE;
// ... one per label
```

**No Supabase tables in this story.**

## API Endpoints
No API endpoints. This story defines types and Neo4j schema only.

## Dependencies
- **Blocked by:** none (first story in Sprint 1)
- **Blocks:** STORY-U-4 (Seed Script Infrastructure), STORY-U-7 (USMLE Seed Data), STORY-U-12 (Remaining Framework Seeds)
- **Cross-lane:** STORY-IA-6 (Framework List Page needs these types)

## Testing Requirements
- 3 API tests: type completeness (all 8 frameworks have interfaces), base property inheritance, framework discriminator field presence
- 0 E2E tests

## Implementation Notes
- Use SCREAMING_SNAKE_CASE for Neo4j labels with acronym prefix (USMLE_System, LCME_Standard).
- Bloom_Level follows the acronym rule since Bloom is a proper name used as taxonomy prefix.
- Each framework node must carry a `framework` discriminator field for cross-framework queries.
- After adding/editing files in `packages/types`, rebuild with `tsc -b packages/types/tsconfig.json` before type-checking downstream packages.
- Typed relationships with direction per architecture rules.
