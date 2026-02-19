# E-16: Framework Seeding

**Feature:** F-08
**Estimated Sprints:** 1
**Sprint Assignment:** Sprint 1

## Definition of Done
- Idempotent seed script (pnpm kg:seed) creates ~492 framework nodes across 8 frameworks
- USMLE: 227 nodes (Systems, Disciplines, Tasks, Topics)
- LCME: 105 nodes (Standards, Elements)
- ACGME: 27, AAMC: 55, UME: 55 + 6 bridges, EPA: 13, Bloom: 6, Miller: 4
- Unique constraints on framework node IDs
- Seed is re-runnable without duplicates

## User Flows Enabled
- UF-13: Framework Seeding — fully enabled

## Story Preview
- Story: Framework data models — Neo4j node types for all 8 frameworks
- Story: Seed script — idempotent MERGE-based seeding for all frameworks
- Story: USMLE seed data — 227 nodes with proper hierarchy
- Story: Remaining framework seeds — LCME, ACGME, AAMC, UME, EPA, Bloom, Miller

## Source References
- F-08 feature definition
- UF-13 user flow
