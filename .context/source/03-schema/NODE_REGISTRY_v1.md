# Journey OS — Node Type & Relationship Registry v1.0

**Date:** February 19, 2026  
**Purpose:** Canonical registry of every Neo4j node type, relationship type, and their properties. This is the single source of truth for the graph schema. When Cypher scripts, TypeScript types, or seed fixtures reference a label or relationship, they must match this document exactly.  
**Reference:** Architecture v10.0 §7

---

## Naming Conventions

| Category | Convention | Examples |
|----------|-----------|---------|
| Multi-word acronym-prefixed labels | SCREAMING_SNAKE | `USMLE_System`, `LCME_Element`, `UME_Competency` |
| Single-concept labels | PascalCase | `SubConcept`, `ContentChunk`, `AssessmentItem` |
| Relationship types | SCREAMING_SNAKE (Neo4j convention) | `TEACHES_VERIFIED`, `MAPS_TO_COMPETENCY`, `HAS_MASTERY` |
| Properties | snake_case | `umls_cui`, `bloom_level`, `sync_status` |

---

## Layer 1 — Institutional Structure

### Node Types

| Label | Properties | Created By | Tier | Est. Count |
|-------|-----------|-----------|------|------------|
| `Institution` | `id`, `name`, `domain`, `status` | Admin (one-time) | 0 | 1 |
| `School` | `id`, `name` | Admin | 0 | 1 |
| `Program` | `id`, `name`, `degree_type` | Admin | 0 | 1 |
| `ProgramTrack` | `id`, `name` | Admin | 0 | 2 |
| `AcademicYear` | `id`, `name` (M1, M2, M3, M4) | Admin | 0 | 4 |
| `CurricularPhase` | `id`, `name` (Pre-clerkship, Clerkship, Post-clerkship) | Admin | 0 | 3–4 |
| `Block` | `id`, `name` | Admin | 0 | ~6 |
| `Course` | `id`, `code`, `name`, `credits`, `type`, `description` | Admin | 0 | ~14–22 |
| `Section` | `id`, `term`, `year`, `status` | Admin | 0 | ~28 |
| `AcademicTerm` | `id`, `name`, `start_date`, `end_date` | Admin | 0 | 4+ |
| `ILO` | `id`, `description`, `source`, `created_by` | Admin (HUMAN_ONLY) | 0 | ~70–140 |

### Relationships

| Type | From → To | Authority | Properties |
|------|-----------|-----------|------------|
| `HAS_SCHOOL` | Institution → School | HUMAN_ONLY | — |
| `HAS_PROGRAM` | School → Program | HUMAN_ONLY | — |
| `HAS_TRACK` | Program → ProgramTrack | HUMAN_ONLY | — |
| `HAS_YEAR` | Program → AcademicYear | HUMAN_ONLY | — |
| `HAS_PHASE` | AcademicYear → CurricularPhase | HUMAN_ONLY | — |
| `HAS_BLOCK` | CurricularPhase → Block | HUMAN_ONLY | — |
| `HAS_COURSE` | Block → Course | HUMAN_ONLY | — |
| `HAS_SECTION` | Course → Section | HUMAN_ONLY | — |
| `OFFERED_IN` | Section → AcademicTerm | HUMAN_ONLY | — |
| `HAS_ILO` | Course → ILO | HUMAN_ONLY | — |

---

## Layer 2 — Framework Alignment

### Node Types

| Label | Properties | Source Authority | Tier | Est. Count |
|-------|-----------|-----------------|------|------------|
| `USMLE_System` | `id`, `code`, `name` | USMLE Step 1 Content Description | 0 | 16 |
| `USMLE_Discipline` | `id`, `code`, `name` | USMLE Step 1 Content Description | 0 | 7 |
| `USMLE_Task` | `id`, `code`, `name` | USMLE Physician Tasks | 0 | 4 |
| `USMLE_Topic` | `id`, `code`, `name`, `parent_system` | USMLE Step 1 detailed outline | 0 | ~200 |
| `LCME_Standard` | `id`, `number`, `title` | LCME Functions & Structure 2024–25 | 0 | 12 |
| `LCME_Element` | `id`, `number`, `title`, `description` | LCME Functions & Structure | 0 | 93 |
| `ACGME_Domain` | `id`, `code`, `name` | ACGME Common Program Req. | 0 | 6 |
| `ACGME_Subdomain` | `id`, `code`, `name`, `parent_domain` | ACGME Milestones 2.0 | 0 | 21 |
| `AAMC_Domain` | `id`, `code`, `name` | AAMC Framework for UME | 0 | 6 |
| `AAMC_Competency` | `id`, `code`, `name`, `parent_domain` | AAMC Framework | 0 | 49 |
| `EPA` | `id`, `number`, `title`, `description` | AAMC Core EPAs | 0 | 13 |
| `BloomLevel` | `id`, `level` (1–6), `name`, `action_verbs[]` | Anderson & Krathwohl (2001) | 0 | 6 |
| `MillerLevel` | `id`, `level` (1–4), `name`, `description` | Miller (1990) | 0 | 4 |
| `UME_Competency` | `id`, `code`, `name`, `description` | AAMC UME Objectives | 0 | 6 |
| `UME_Subcompetency` | `id`, `code`, `name`, `description`, `do_specific` | AAMC UME Objectives | 0 | 49 |

**Layer 2 Total: 15 node types, ~492 nodes**

### Relationships

| Type | From → To | Properties |
|------|-----------|------------|
| `HAS_TOPIC` | USMLE_System → USMLE_Topic | — |
| `HAS_ELEMENT` | LCME_Standard → LCME_Element | — |
| `HAS_SUBDOMAIN` | ACGME_Domain → ACGME_Subdomain | — |
| `HAS_COMPETENCY` | AAMC_Domain → AAMC_Competency | — |
| `HAS_SUBCOMPETENCY` | UME_Competency → UME_Subcompetency | — |
| `ALIGNS_WITH` | UME_Competency → ACGME_Domain | 6 bridge edges |
| `NEXT_LEVEL` | BloomLevel → BloomLevel | ordering |
| `NEXT_LEVEL` | MillerLevel → MillerLevel | ordering |

### Cross-Layer Framework Relationships (Layer 1 ↔ Layer 2)

| Type | From → To | Authority | Properties |
|------|-----------|-----------|------------|
| `MAPS_TO_COMPETENCY` | ILO → ACGME_Domain | HUMAN_APPROVED | `confidence`, `mapped_by`, `verified_by` |
| `MAPS_TO_EPA` | ILO → EPA | HUMAN_APPROVED | `confidence`, `mapped_by`, `verified_by` |
| `ADDRESSES_LCME` | ILO → LCME_Element | HUMAN_APPROVED | `confidence`, `mapped_by`, `verified_by` |
| `MAPS_TO_UME` | ILO → UME_Subcompetency | HUMAN_APPROVED | `confidence`, `mapped_by` |
| `MAPS_TO_UME` | SLO → UME_Subcompetency | AI_VERIFIED | `confidence` |

---

## Layer 3 — Concepts & Content

### Node Types

| Label | Properties | Created By | Authority | Tier | Est. Count |
|-------|-----------|-----------|-----------|------|------------|
| `ContentChunk` | `id`, `source_type`, `chunk_index`, `lecture_id`, `word_count` | Pipeline (auto) | SYSTEM_AUTO | 0 | ~65,000+ |
| `SubConcept` | `id`, `name`, `description`, `umls_cui`, `lod_enriched`, `semantic_type`, `source_course` | Claude extracts → Faculty reviews | AI_VERIFIED | 0 | ~8,000–15,000 |
| `SLO` | `id`, `text`, `bloom_verb`, `confidence`, `session_id` | Claude extracts → Faculty reviews | HUMAN_APPROVED | 0 | ~3,000–6,000 |
| `ProficiencyVariable` | `id`, `name`, `subconcept_id` | System (1:1 with SubConcept) | SYSTEM_AUTO | 0 | ~8,000–15,000 |
| `MisconceptionCategory` | `id`, `name`, `description`, `frequency` | Claude identifies | AI_VERIFIED | 0 | ~500–2,000 |
| `StandardTerm` | `id`, `cui`, `preferred_name`, `snomed_id`, `mesh_id`, `source_vocabulary` | LOD pipeline (auto) | AI_AUTO | 1 | ~1,000–5,000 |

### Relationships

| Type | From → To | Authority | Properties |
|------|-----------|-----------|------------|
| `EXTRACTED_FROM` | ContentChunk → Lecture / Syllabus | SYSTEM_AUTO | — |
| `TEACHES` | ContentChunk → SubConcept | AI_VERIFIED | `confidence`, `coverage_type` |
| `TEACHES_VERIFIED` | ContentChunk → SubConcept | HUMAN_APPROVED | `verified_by`, `verified_at` |
| `PREREQUISITE_OF` | SubConcept → SubConcept | AI_VERIFIED | `confidence`, `validated_by` |
| `RELATED_TO` | SubConcept → SubConcept | AI_AUTO | `type` (same_system, commonly_confused, differential) |
| `HAS_MISCONCEPTION` | SubConcept → MisconceptionCategory | AI_VERIFIED | — |
| `MAPPED_TO` | SubConcept → ProficiencyVariable | SYSTEM_AUTO | — |
| `GROUNDED_IN` | SubConcept → StandardTerm | AI_AUTO | `primary` (boolean) |
| `SAME_AS` | StandardTerm → StandardTerm | AI_AUTO | cross-ontology |
| `FULFILLS` | SLO → ILO | HUMAN_APPROVED | `mapped_by`, `verified_by`, `ai_confidence`, `mapped_at`, `verified_at` |
| `ADDRESSED_BY` | SLO → SubConcept | AI_VERIFIED | `confidence` |
| `HAS_SLO` | Session → SLO | HUMAN_APPROVED | — |
| `AT_BLOOM` | SLO → BloomLevel | AI_VERIFIED | — |
| `MAPS_TO` | SubConcept → USMLE_System | AI_VERIFIED | `confidence` |
| `MAPS_TO` | SubConcept → USMLE_Discipline | AI_VERIFIED | `confidence` |

---

## Layer 4 — Assessment & ECD

### Node Types

| Label | Properties | Created By | Tier | Est. Count |
|-------|-----------|-----------|------|------------|
| `TaskShell` | `id`, `name`, `bloom_range`, `concept_family`, `constraints`, `format` | Engineer + Claude | 0 | ~50–200 |
| `AssessmentItem` | `id`, `vignette`, `stem`, `status`, `bloom`, `difficulty`, `quality_score` | Claude generates → Faculty validates | 0 | ~50,000+ |
| `Option` | `id`, `letter`, `text`, `correct`, `misconception`, `evidence_rule` | Claude generates | 0 | ~250,000+ |

**Supabase-only fields on AssessmentItem:** `toulmin` (JSONB, 6 fields), `generation_reasoning`, `critic_scores`, `sync_status`

### Relationships

| Type | From → To | Authority | Properties |
|------|-----------|-----------|------------|
| `ASSESSED_BY` | ProficiencyVariable → TaskShell | SYSTEM_AUTO | — |
| `ASSESSES` | AssessmentItem → SLO | HUMAN_APPROVED | primary coverage chain link |
| `TARGETS` | AssessmentItem → SubConcept | AI_VERIFIED | primary/secondary concept target |
| `INSTANTIATES` | AssessmentItem → TaskShell | SYSTEM_AUTO | — |
| `HAS_OPTION` | AssessmentItem → Option | SYSTEM_AUTO | — |
| `SOURCED_FROM` | AssessmentItem → ContentChunk | SYSTEM_AUTO | provenance |
| `SUPERSEDES` | AssessmentItem → AssessmentItem | HUMAN_APPROVED | version chain |
| `TARGETS_MISCONCEPTION` | Option → MisconceptionCategory | AI_VERIFIED | — |
| `AT_BLOOM` | AssessmentItem → BloomLevel | AI_VERIFIED | — |
| `AT_MILLER` | AssessmentItem → MillerLevel | AI_VERIFIED | — |

---

## Layer 5 — Student Mastery

### Node Types

| Label | Properties | Created By | Tier | Est. Count |
|-------|-----------|-----------|------|------------|
| `Student` | `id`, `supabase_auth_id`, `cohort`, `status` | System sync from SIS | 1 | ~600 |
| `ConceptMastery` | `id`, `p_mastered`, `trend`, `evidence_count`, `last_updated` | BKT/IRT engine | 1 | ~120,000 |
| `AttemptRecord` | `id`, `response`, `correct`, `time_ms`, `timestamp` | Assessment delivery | 1 | ~500,000+ |

### Relationships

| Type | From → To | Authority | Properties |
|------|-----------|-----------|------------|
| `HAS_MASTERY` | Student → ConceptMastery | SYSTEM_AUTO | — |
| `FOR_CONCEPT` | ConceptMastery → SubConcept | SYSTEM_AUTO | — |
| `ON_ITEM` | AttemptRecord → AssessmentItem | SYSTEM_AUTO | — |
| `NEXT` | AttemptRecord → AttemptRecord | SYSTEM_AUTO | linked list |

---

## Tier 2+ Node Types (not in Tier 0–1 graph)

| Label | Purpose | Tier | Trigger |
|-------|---------|------|---------|
| `ExternalEntity` | Hetionet biomedical entities | 2 | LOD enrichment + CUI match |
| `TopicCluster` | BERTopic clusters | 3 | Topic modeling pipeline |
| `TopicProfile` | Course/institution topic distributions | 3 | Topic aggregation |
| `Cohort` | Student class groupings | 2 | Student app |
| `EPAEntrustmentStatus` | Clinical evaluation tracking | 2 | Clinical education |

---

## Deprecated Labels (do not use)

| Label | Reason | Replacement |
|-------|--------|-------------|
| `LearningObjective` | Split into ILO + SLO (R-019) | Use `ILO` and `SLO` |
| `Slide` | Collapsed into ContentChunk | `ContentChunk` with `source_type: "slide"` |
| `Resource` | Collapsed into Supabase | Supabase `uploads` table |
| `CurriculumUnit` | MSM-specific | `Block` + Course properties |
| `StudentModelVariable` | Renamed | `ConceptMastery` |
| `USMLESystem` (PascalCase) | R-004 | `USMLE_System` (SCREAMING_SNAKE) |
| `ALIGNS_TO` (generic) | R-010 | Use typed relationships |

---

## Authority Levels Reference

| Level | Meaning | Trust | Used For |
|-------|---------|-------|----------|
| **HUMAN_ONLY** | Only a human can create | 100% | Institutional structure, ILO creation |
| **HUMAN_APPROVED** | Claude suggests, human must approve | 90% | SLO extraction, FULFILLS, framework mappings |
| **AI_VERIFIED** | Claude creates, human can override | 80% | TEACHES, USMLE mapping, prerequisite inference |
| **AI_AUTO** | Claude creates, no human review needed | 70% | LOD enrichment, cross-ontology links |
| **SYSTEM_AUTO** | System creates from user actions | 100% | Mastery updates, dual-write, sync status |

---

## Neo4j Constraints (Idempotent)

```cypher
-- Layer 1
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Institution) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:School) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Program) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Course) REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Section) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:ILO) REQUIRE n.id IS UNIQUE;

-- Layer 2
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

-- Layer 3
CREATE CONSTRAINT IF NOT EXISTS FOR (n:ContentChunk) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:SubConcept) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:SLO) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:ProficiencyVariable) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:MisconceptionCategory) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:StandardTerm) REQUIRE n.cui IS UNIQUE;

-- Layer 4
CREATE CONSTRAINT IF NOT EXISTS FOR (n:TaskShell) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:AssessmentItem) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Option) REQUIRE n.id IS UNIQUE;

-- Layer 5
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Student) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:ConceptMastery) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:AttemptRecord) REQUIRE n.id IS UNIQUE;
```

---

## Canonical Coverage Chain Queries

**Full chain for an assessment item (accreditation):**
```cypher
MATCH (item:AssessmentItem {id: $itemId})
MATCH (item)-[:ASSESSES]->(slo:SLO)-[:FULFILLS]->(ilo:ILO)
MATCH (ilo)-[:ADDRESSES_LCME]->(lcme:LCME_Element)
MATCH (item)-[:TARGETS]->(sc:SubConcept)-[:MAPS_TO]->(us:USMLE_System)
RETURN item.stem, slo.text, ilo.description, lcme.number, us.name
```

**Full chain for an assessment item (competency):**
```cypher
MATCH (item:AssessmentItem {id: $itemId})
MATCH (item)-[:ASSESSES]->(slo:SLO)-[:FULFILLS]->(ilo:ILO)
MATCH (ilo)-[:MAPS_TO_COMPETENCY]->(acgme:ACGME_Domain)
OPTIONAL MATCH (slo)-[:MAPS_TO_UME]->(ume:UME_Subcompetency)
RETURN item.stem, slo.text, ilo.description, acgme.name, ume.name
```

**Student's weakest USMLE systems:**
```cypher
MATCH (s:Student {id: $studentId})-[:HAS_MASTERY]->(cm:ConceptMastery)
MATCH (cm)-[:FOR_CONCEPT]->(sc:SubConcept)
MATCH (sc)-[:MAPS_TO]->(us:USMLE_System)
WHERE cm.p_mastered < 0.5 AND cm.evidence_count >= 5
RETURN us.name, avg(cm.p_mastered) AS avg_mastery, count(sc) AS weak_concepts
ORDER BY avg_mastery ASC
```

---

*This registry is the single source of truth for graph schema. All Cypher scripts, TypeScript types, and seed fixtures must match these labels, relationship types, and property names exactly.*
