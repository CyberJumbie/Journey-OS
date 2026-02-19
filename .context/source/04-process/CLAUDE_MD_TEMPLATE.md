# Journey OS — Claude Code System Prompt

**Project:** Journey OS  
**Architecture:** v10.0 | **Schema:** NODE_REGISTRY v1.0 | **DDL:** SUPABASE_DDL v1.0  
**Date:** February 19, 2026

---

## Implementation Order

Types → Model → Repository → Service → Controller → View → Tests

Every story cuts the full stack vertically. No horizontal-only stories.

---

## Layer Boundaries (MVC)

| Layer | Directory | Responsibility | Does NOT |
|-------|-----------|---------------|----------|
| Model | `packages/shared-types/` | TypeScript types, Zod schemas, graph schema | Import from apps/ |
| Controller | `apps/server/src/api/` | HTTP handling, auth, validation | Call Neo4j directly |
| Service | `apps/server/src/services/` | Business logic, dual-write | Import from api/ |
| Repository | `apps/server/src/repositories/` | Data access (Neo4j, Supabase) | Contain business logic |
| View | `apps/web/app/`, `packages/ui/` | React components, hooks | Call APIs directly (use services) |

---

## Neo4j Labels — EXACT

**SCREAMING_SNAKE for acronym-prefixed:**
`USMLE_System`, `USMLE_Discipline`, `USMLE_Task`, `USMLE_Topic`, `LCME_Standard`, `LCME_Element`, `ACGME_Domain`, `ACGME_Subdomain`, `AAMC_Domain`, `AAMC_Competency`, `UME_Competency`, `UME_Subcompetency`

**PascalCase for all others:**
`Institution`, `School`, `Program`, `ProgramTrack`, `AcademicYear`, `CurricularPhase`, `Block`, `Course`, `Section`, `AcademicTerm`, `ILO`, `SLO`, `ContentChunk`, `SubConcept`, `ProficiencyVariable`, `MisconceptionCategory`, `StandardTerm`, `TaskShell`, `AssessmentItem`, `Option`, `Student`, `ConceptMastery`, `AttemptRecord`, `EPA`, `BloomLevel`, `MillerLevel`

**NEVER USE these deprecated labels:**
`USMLESystem`, `LCMEStandard`, `ACGMEDomain`, `ACGMECompetency`, `AAMCDomain`, `AAMCCompetency`, `LearningObjective` (split into ILO + SLO)

---

## Relationship Types — EXACT

**Typed, not generic.** Never use bare `ALIGNS_TO`.

| Relationship | From → To |
|---|---|
| `HAS_SCHOOL` | Institution → School |
| `HAS_PROGRAM` | School → Program |
| `HAS_TRACK` | Program → ProgramTrack |
| `HAS_YEAR` | Program → AcademicYear |
| `HAS_PHASE` | AcademicYear → CurricularPhase |
| `HAS_BLOCK` | CurricularPhase → Block |
| `HAS_COURSE` | Block → Course |
| `HAS_SECTION` | Course → Section |
| `OFFERED_IN` | Section → AcademicTerm |
| `HAS_ILO` | Course → ILO |
| `HAS_SLO` | Session → SLO |
| `HAS_TOPIC` | USMLE_System → USMLE_Topic |
| `HAS_ELEMENT` | LCME_Standard → LCME_Element |
| `HAS_SUBDOMAIN` | ACGME_Domain → ACGME_Subdomain |
| `HAS_COMPETENCY` | AAMC_Domain → AAMC_Competency |
| `HAS_SUBCOMPETENCY` | UME_Competency → UME_Subcompetency |
| `ALIGNS_WITH` | UME_Competency → ACGME_Domain |
| `MAPS_TO_COMPETENCY` | ILO → ACGME_Domain |
| `MAPS_TO_EPA` | ILO → EPA |
| `ADDRESSES_LCME` | ILO → LCME_Element |
| `AT_BLOOM` | SLO / AssessmentItem → BloomLevel |
| `AT_MILLER` | AssessmentItem → MillerLevel |
| `MAPS_TO` | SubConcept → USMLE_System / USMLE_Discipline |
| `MAPS_TO_UME` | SLO / ILO → UME_Subcompetency |
| `TEACHES` | ContentChunk → SubConcept (unverified) |
| `TEACHES_VERIFIED` | ContentChunk → SubConcept (faculty confirmed) |
| `FULFILLS` | SLO → ILO |
| `ADDRESSED_BY` | SLO → SubConcept |
| `PREREQUISITE_OF` | SubConcept → SubConcept |
| `RELATED_TO` | SubConcept → SubConcept |
| `GROUNDED_IN` | SubConcept → StandardTerm |
| `MAPPED_TO` | SubConcept → ProficiencyVariable |
| `ASSESSES` | AssessmentItem → SLO (primary, coverage chain) |
| `TARGETS` | AssessmentItem → SubConcept (secondary, analytics) |
| `INSTANTIATES` | AssessmentItem → TaskShell |
| `HAS_OPTION` | AssessmentItem → Option |
| `SOURCED_FROM` | AssessmentItem → ContentChunk |
| `TARGETS_MISCONCEPTION` | Option → MisconceptionCategory |
| `HAS_MASTERY` | Student → ConceptMastery |
| `FOR_CONCEPT` | ConceptMastery → SubConcept |

---

## Pipeline Nodes — 14 Total

**Generation (11):** init → context_compiler → vignette_builder → stem_writer → distractor_generator → tagger → dedup_detector → validator → critic_agent → **graph_writer** → review_router

**Review (3):** load_review_question, apply_edit, revalidate

Every node receives `emit: IUIEventEmitter` and uses explicit event emission (not auto-detection).

Agent ID: `journey_generation`. Inngest namespace: `journey/*`. Endpoint: `POST /generate`.

---

## Design Tokens

| Token | Value |
|-------|-------|
| cream (page bg) | `#f5f3ef` |
| parchment (nested) | `#faf9f6` |
| white (cards) | `#ffffff` |
| navy-deep (primary) | `#002c76` |
| blue-mid (accents) | `#2b71b9` |
| green (success) | `#69a338` |
| heading font | Lora |
| body font | Source Sans 3 |
| label font | DM Mono (uppercase) |
| header bg | white (not dark) |

---

## Embedding & Vector Config

| Setting | Value |
|---------|-------|
| Model | Voyage AI voyage-large-2 |
| Dimensions | 1024 |
| Chunk size | 800 tokens, 100-token overlap |
| Index type | HNSW |
| SubConcept dedup | 0.92 single threshold |
| Question dedup | 0.85 flag / 0.95 auto-reject |

---

## Supabase Dual-Write Pattern

```typescript
// 1. Write to Supabase (sync_status: "pending")
const row = await supabase.from('content_chunks').insert({ ...data, sync_status: 'pending' });
// 2. Write to Neo4j
await neo4j.run('CREATE (n:ContentChunk {id: $id, ...})', params);
// 3. Update sync_status
await supabase.from('content_chunks').update({ sync_status: 'synced', graph_node_id: neoId }).eq('id', row.id);
```

---

## OOP Rules

- Classes for services, repositories, pipeline nodes. DI via constructor.
- `BasePipelineNode` abstract class: all nodes extend it, implement `execute(state, emit)`.
- No bare functions as exports for business logic. Utilities are the exception.
- Atomic Design: atoms (Button, Badge) → molecules (StatCard) → organisms (KPIStrip) → templates → pages.

---

## Verification Checklist (run before every /compound)

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds
- [ ] No `TODO` stubs in committed code
- [ ] No hardcoded hex values (use design tokens)
- [ ] No `any` types
- [ ] No deprecated Neo4j labels (grep for USMLESystem, LCMEStandard, LearningObjective, ALIGNS_TO)
- [ ] Embedding dimensions: 1024 (not 1536)
- [ ] All framework relationships typed (not ALIGNS_TO)

---

## Things Claude Gets Wrong

*(Updated during /compound. Start empty, append as patterns emerge.)*

1. _[empty — populate after Sprint 1]_

---

## Source of Truth Priority

1. **NODE_REGISTRY v1.0** — labels, relationships, properties
2. **SUPABASE_DDL v1.0** — tables, columns, indexes
3. **Architecture v10.0** — system design, pipeline, data flow
4. **DESIGN_SPEC.md** — visual design, hex values, typography
5. **Roadmap v2.3** — sprint scope, exit criteria
6. **Delivery Framework v2.2** — process, decomposition, commands
7. **Story brief** — specific deliverables for current work
