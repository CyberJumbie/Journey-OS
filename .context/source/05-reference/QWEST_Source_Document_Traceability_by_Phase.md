# QWEST Knowledge Graph — Source Document Traceability by Phase

**Product:** QWEST (Quality Workbench for Educational Standards & Testing)  
**Institution:** Morehouse School of Medicine (MSM)  
**Date:** February 2026  
**Purpose:** Every node type traced to its authoritative source document, organized by seeding phase.

---

## How to Read This Document

Each phase lists every node type introduced, the source document(s) that populate it, the ingestion method (manual seed, semi-automated parse, AI extraction, or system-generated), and the data owner at MSM. Nodes marked "system-generated" are created by the pipeline itself — they derive from other nodes rather than from an external source.

---

## Phase 1: Institutional Structure (~40 nodes)

The skeleton of MSM's MD program. Everything here comes from the academic catalog and registrar.

| Node Type | Count | Source Document(s) | Location / Access | Ingestion Method | Data Owner |
|-----------|-------|--------------------|-------------------|------------------|------------|
| **Program** | 1 | MSM Academic Catalog 2023–2025 | msm.edu / Registrar | Manual Cypher seed | Curriculum Office |
| **ProgramTrack** | 2 | MSM Academic Catalog (standard + 5-yr decelerated) | Registrar | Manual Cypher seed | Curriculum Office |
| **AcademicYear** | 4 | MSM Academic Catalog | Registrar | Manual Cypher seed | Curriculum Office |
| **AcademicTerm** | 8 | MSM Academic Calendar | Registrar | Manual Cypher seed | Registrar |
| **CurricularPhase** | 3 | MSM Curriculum Map (Pre-clerkship, Clerkship, Advanced Clinical) | Curriculum Committee | Manual Cypher seed | Curriculum Office |
| **Block** | 4 | MSM Curriculum Map (MSM, Mechanisms of Disease, Core Clerkships, Senior Selective) | Curriculum Committee | Manual Cypher seed | Curriculum Office |
| **Course** | 22 | MSM Course Catalog + Canvas LMS | Catalog PDF / Canvas API | Semi-automated parse of `msm-catalog.json` | Registrar |
| **CurriculumUnit** | 14 | MSM Course Catalog (10 within MEDI 530–533 + 4 FOM components) | Catalog Chapter 4 | Semi-automated parse | Course Directors |
| **Clerkship** | ~8 | MSM Clerkship Guide | Clinical Education Office | Manual Cypher seed | Clinical Ed |
| **LearningCommunity** | 8 | MSM Student Affairs Directory | Student Affairs | Manual Cypher seed | Student Affairs |
| **PromotionGate** | 4 | MSM Academic Catalog, Chapter 8 (Policies) | Registrar / Promotions Committee | Manual Cypher seed | Promotions Committee |
| **ClinicalSite** | ~12 | MSM Academic Catalog, Chapter 3 (Affiliations) | Catalog | Manual Cypher seed | Clinical Ed |
| **Prerequisite** (relationship) | 10 | MSM Course Catalog (explicit dependencies) | Catalog | Semi-automated parse | Registrar |
| **ILO** (Institutional Learning Objective) | 8 | MSM Academic Catalog, pp. 2–3 | Catalog | Manual Cypher seed | Curriculum Office |

**Key source file:** `msm-catalog.json` — the structured JSON extraction of the MSM course catalog validated at 22 courses, 14 curriculum units, 8 academic terms, 9 session types, 4 promotion gates.

---

## Phase 2: Framework Layer (~350 nodes)

External accreditation and competency frameworks. All are publicly available. You structure them once; they rarely change.

### 2A. USMLE Content Outline (~250 nodes)

| Node Type | Count | Source Document(s) | Location / Access | Ingestion Method | Data Owner |
|-----------|-------|--------------------|-------------------|------------------|------------|
| **USMLE_System** | 18 | USMLE Step 1 Content Description and General Information | usmle.org | Manual JSON structuring → Cypher seed | NBME/FSMB (external) |
| **USMLE_Discipline** | 16 | USMLE Step 1 Content Description | usmle.org | Manual JSON structuring → Cypher seed | NBME/FSMB (external) |
| **USMLE_Task** | ~7 | USMLE Physician Tasks/Competencies | usmle.org | Manual Cypher seed | NBME/FSMB (external) |
| **USMLE_Topic** | ~200 | USMLE Step 1 Content Outline (detailed topic list) | usmle.org PDF | Semi-automated extraction → `usmle-content-outline.json` | NBME/FSMB (external) |

**Key source file:** `usmle-content-outline.json` — structured extraction from the USMLE Step 1 content description PDF.

### 2B. LCME Standards (~105 nodes)

| Node Type | Count | Source Document(s) | Location / Access | Ingestion Method | Data Owner |
|-----------|-------|--------------------|-------------------|------------------|------------|
| **LCMEStandard** | 12 | LCME Functions and Structure of a Medical School 2024–2025 | lcme.org/publications | Manual JSON structuring → `lcme-standards.json` | LCME (external) |
| **LCMEElement** | 93 | LCME Functions and Structure (elements within each standard) | lcme.org/publications | Manual JSON structuring → Cypher seed | LCME (external) |

**Key source file:** `lcme-standards.json` — 12 standards with all 93 elements. Standards 6, 7, 8 are the most critical for curriculum mapping.

### 2C. ACGME Competencies (~27 nodes)

| Node Type | Count | Source Document(s) | Location / Access | Ingestion Method | Data Owner |
|-----------|-------|--------------------|-------------------|------------------|------------|
| **ACGME_Domain** | 6 | ACGME Common Program Requirements | acgme.org | Manual Cypher seed | ACGME (external) |
| **ACGME_Subdomain** | 21 | ACGME Milestones 2.0 (subcompetencies per domain) | acgme.org/milestones | Manual JSON structuring → `acgme-competencies.json` | ACGME (external) |

**Key source file:** `acgme-competencies.json` — 6 domains (Patient Care, Medical Knowledge, SBP, PBLI, Professionalism, ICS) with 21 subdomains.

### 2D. EPAs (~15 nodes)

| Node Type | Count | Source Document(s) | Location / Access | Ingestion Method | Data Owner |
|-----------|-------|--------------------|-------------------|------------------|------------|
| **EPA** | 13 | AAMC Core EPAs for Entering Residency | aamc.org/cepaer | Manual Cypher seed | AAMC (external) |
| **EPAGroup** | 2 | AAMC EPA Implementation Guide | aamc.org | Manual Cypher seed | AAMC (external) |

### 2E. Bloom's & Miller's (~10 nodes)

| Node Type | Count | Source Document(s) | Location / Access | Ingestion Method | Data Owner |
|-----------|-------|--------------------|-------------------|------------------|------------|
| **BloomLevel** | 6 | Anderson & Krathwohl (2001) — Revised Bloom's Taxonomy | Published taxonomy (public domain) | Manual Cypher seed | Internal definition |
| **MillerLevel** | 4 | Miller (1990) — Clinical Competence Pyramid | Published taxonomy | Manual Cypher seed | Internal definition |

### 2F. MSM-Specific Competency Codes (~11 nodes)

| Node Type | Count | Source Document(s) | Location / Access | Ingestion Method | Data Owner |
|-----------|-------|--------------------|-------------------|------------------|------------|
| **MSM_LearningObjectiveCode** | 11 | MEDI 611 IPC Syllabus (the only syllabus with explicit codes: 1.a–1.c, 2.a–2.c, etc.) | Course Director / Canvas | Parsed from Type 3 syllabus | Curriculum Office |

---

## Phase 3: Curriculum Content & Concept Hierarchy (~500–2,000 nodes)

This is where the two syllabus types converge. The LO syllabus provides the learning objectives; the Session Schedule syllabus provides the sessions. Together they populate the operational curriculum layer.

### 3A. Session & Learning Objective Nodes

| Node Type | Est. Count | Source Document(s) | Location / Access | Ingestion Method | Data Owner |
|-----------|------------|---------------------|-------------------|------------------|------------|
| **Session** | ~500 total | **Session Schedule Syllabi** (the new document type we just created) | Course Directors / Canvas | AI extraction pipeline (Type 1→7 parsers) | Course Directors |
| **SLO** (Session-level Learning Objective) | ~450 (OS series alone) | **Learning Objectives Syllabi** (Type 1: MEDI 531, 532, 533) | Course Directors | AI extraction pipeline (Type 1 parser) | Course Directors |
| **SessionType** | 9 | MSM Academic Catalog (session type definitions) | `msm-catalog.json` | Manual Cypher seed (Phase 1) | Curriculum Office |

**Source document pairing for the Organ Systems series:**

| Course | LO Source (Type 1 — "What") | Schedule Source (Session Schedule — "When/How/Who") |
|--------|---------------------------|------------------------------------------------------|
| MEDI 531 | `MEDI531_LEARNING_OBJECTIVES-OS1-2018.docx` | `MEDI531_SESSION_SCHEDULE_SYLLABUS.docx` |
| MEDI 532 | MEDI 532 LO Syllabus (same template) | MEDI 532 Session Schedule (to be created) |
| MEDI 533 | MEDI 533 LO Syllabus (same template) | MEDI 533 Session Schedule (to be created) |

**Source documents for other syllabus types:**

| Syllabus Type | Course(s) | Source Document | Yields Nodes |
|---------------|-----------|-----------------|--------------|
| Type 2: Course Overview | MEDI 611 Overall / FoM2 | FoM2 combined syllabus | Course-level LOs, sub-course references |
| Type 3: Skills-Based (ACGME-Coded) | MEDI 611 IPC | IPC syllabus with explicit ACGME codes | SLOs with direct competency tags, MSM codes |
| Type 4: Thematic / Clinical Dense | MEDI 611 HV II | Human Values II syllabus | Thematic SLOs requiring heavy AI extraction |
| Type 5: Hybrid | MEDI 600, MEDI 606 | Pathophysiology, Pathology syllabi | Mixed overview + detailed LOs, partial MSM codes |
| Type 6: Tentative / Minimal | MEDI 511 / FoM1 | FoM1 syllabus (under 1k words) | Minimal — flagged for manual review |

### 3B. Concept Hierarchy Nodes

| Node Type | Est. Count | Source Document(s) | Location / Access | Ingestion Method | Data Owner |
|-----------|------------|---------------------|-------------------|------------------|------------|
| **Domain** | ~20 | Derived from USMLE Systems + MSM Curriculum Map | Combination of `usmle-content-outline.json` + `msm-catalog.json` | System-generated (inferred from USMLE_System → CurriculumUnit alignment) | Internal |
| **Concept** | ~200 | Derived from SLOs + USMLE Topics | Parsed from syllabi + USMLE content outline | AI-assisted extraction with faculty validation | Course Directors |
| **SubConcept** | ~1,500 | **Lecture slides (PPTX/PDF)** + **Syllabi LOs** | Faculty uploads / Canvas | AI extraction pipeline (deep concept extraction) | Faculty |

**The SubConcept extraction chain:**

```
Lecture PPTX → Slide-level parsing → ContentChunk nodes
                                        ↓
                              AI concept extraction
                                        ↓
                              SubConcept nodes
                                        ↓
                              Grounded to StandardTerm (LOD)
```

**Reference implementation:** The Atherosclerosis lecture (MEDI 531, Unit 2, Week 6) is the SEED-011 fixture. This single lecture produces:
- 1 Session node (the teaching event)
- ~10 ContentChunk nodes (per slide/section)
- ~15 SubConcept nodes (plaque formation, foam cells, lipid accumulation, endothelial dysfunction, etc.)
- ContentChunk → TEACHES → SubConcept relationships
- SubConcept → GROUNDED_IN → StandardTerm (LOD anchoring)

### 3C. Linked Open Data (LOD) Anchoring

| Node Type | Est. Count | Source Document(s) | Location / Access | Ingestion Method | Data Owner |
|-----------|------------|---------------------|-------------------|------------------|------------|
| **StandardTerm** | ~500 | SNOMED CT + MeSH + UMLS Metathesaurus | NLM UMLS license (free for academic use) / `snomed-mesh-seed.json` | Semi-automated: seed core terms, expand via API | NLM (external) |

**Key source file:** `snomed-mesh-seed.json` — initial seed of ~200 core medical terms with SNOMED CUI, MeSH descriptor, and preferred term. Expanded incrementally as SubConcepts are extracted.

---

## Phase 4: Content Ingestion Pipeline (~5,000+ nodes)

When faculty upload lectures and syllabi, the pipeline creates granular content nodes.

| Node Type | Est. Count | Source Document(s) | Location / Access | Ingestion Method | Data Owner |
|-----------|------------|---------------------|-------------------|------------------|------------|
| **ContentChunk** | ~5,000 | Faculty lecture slides (PPTX, PDF), textbook sections, handouts | Faculty uploads via Canvas or QWEST UI | AI extraction pipeline (slide-level parsing → chunking → embedding) | Faculty |
| **SlideSection** | ~1,000 | Lecture PPTX files (slide-level granularity above ContentChunk) | Faculty uploads | Automated PPTX parsing | Faculty |
| **MediaAsset** | ~200 | Images, diagrams, videos embedded in lectures | Extracted from PPTX / linked from Canvas | Automated extraction | Faculty |

**Dual-write pattern:** ContentChunks are stored in both Neo4j (graph relationships) and Supabase (vector embeddings for RAG retrieval). The Neo4j node carries `chunk_text`, `embedding_id` (foreign key to Supabase), `source_lecture`, and `slide_number`. The Supabase record carries the pgvector embedding for similarity search.

---

## Phase 5: ECD Layer — Assessment Architecture (~80 nodes)

Evidence-Centered Design components. These are internally defined based on the v2 pipeline design.

| Node Type | Est. Count | Source Document(s) | Location / Access | Ingestion Method | Data Owner |
|-----------|------------|---------------------|-------------------|------------------|------------|
| **ProficiencyVariable** | ~30 | Derived from SubConcept hierarchy + Bloom levels | Internal design — maps 1:1 to measurable student knowledge states | System-generated from concept hierarchy | Assessment Team |
| **TaskShell** | ~50 | NBME Item-Writing Workshop principles + internal design | Internal — templates like "Diagnose from biomarker," "Select management step" | Manual creation based on NBME frameworks | Assessment Team |
| **EvidenceRuleTemplate** | ~12 | Internal design — distractor strategy patterns | Internal | Manual creation | Assessment Team |
| **DifficultyLevel** | 5 | Internal definition (1–5 scale) | Internal | Manual Cypher seed | Internal |
| **ClinicalSetting** | ~8 | Internal definition (ED, ICU, outpatient, etc.) | Internal | Manual Cypher seed | Internal |
| **PatientDemographic** | ~6 | Internal definition (age/sex profiles) | Internal | Manual Cypher seed | Internal |

**Key dependency:** ProficiencyVariables are derived FROM the SubConcept hierarchy (Phase 3) crossed with Bloom levels (Phase 2). They don't exist until the concept layer is populated.

---

## Phase 6: Content Linkage & Coverage Analysis (relationship-heavy)

This phase creates few new node types but massive numbers of relationships.

| Relationship Type | Est. Count | Source(s) | Ingestion Method |
|-------------------|------------|-----------|------------------|
| **TEACHES** (ContentChunk → SubConcept) | ~25,000 | AI extraction from lecture content | Pipeline Stage 3 |
| **ADDRESSES** (Session → SLO) | ~2,000 | Session Schedule syllabi (LO Cross-Ref column) | Semi-automated parse |
| **FULFILLS** (SLO → ILO) | ~200 | AI-suggested + faculty-validated | AI suggestion → human review |
| **MAPS_TO_USMLE** (SubConcept → USMLE_Topic) | ~3,000 | AI mapping + faculty validation | AI suggestion → human review |
| **MAPS_TO_LCME** (Course → LCMEElement) | ~50 | Manual mapping by curriculum office | Manual | 
| **AT_BLOOM** (SLO → BloomLevel) | ~450 | Bloom's column in Session Schedule syllabus + AI inference | Semi-automated |
| **GROUNDED_IN** (SubConcept → StandardTerm) | ~1,500 | SNOMED/MeSH lookup | API-assisted |
| **PREREQUISITE_OF** (SubConcept → SubConcept) | ~500 | AI inference from curriculum sequence | AI suggestion → faculty validation |

**Coverage analysis outputs:**

| Analysis | Source Data | Output |
|----------|------------|--------|
| USMLE Blueprint Coverage | MAPS_TO_USMLE edges | Gap report: which USMLE topics have no SubConcepts |
| LCME 6.1 Compliance | FULFILLS + MAPS_TO_LCME edges | Evidence that ILOs map to courses and sessions |
| Bloom Distribution | AT_BLOOM edges | Histogram: are we over-indexing on "Remember"? |
| Temporal Sequencing | Session dates + PREREQUISITE_OF | Are concepts taught before they're assessed? |

---

## Phase 7: Assessment Item Layer (~50,000+ nodes at scale)

| Node Type | Est. Count | Source Document(s) | Location / Access | Ingestion Method | Data Owner |
|-----------|------------|---------------------|-------------------|------------------|------------|
| **AssessmentItem** | ~5,000 (legacy) + ~50,000 (generated) | ExamSoft item bank (legacy import) OR AI generation pipeline | ExamSoft export / QWEST generation pipeline | Legacy: CSV/XML import; Generated: 10-stage ECD pipeline | Assessment Team |
| **Option** | ~250,000 | Derived from AssessmentItem (5 options per item) | Created alongside items | System-generated (promoted from embedded JSON to first-class nodes) | Assessment Team |
| **EvidenceRule** | ~250,000 | Generated by pipeline Stage 8 (5 per question — 1 correct + 4 diagnostic) | QWEST generation pipeline | System-generated | Assessment Team |
| **AssessmentArgument** | ~50,000 | Generated by pipeline Stage 8 (Toulmin validity chain per item) | QWEST generation pipeline | System-generated | Assessment Team |
| **Rationale** | ~50,000 | Generated by pipeline + faculty review | QWEST pipeline → faculty validation | System-generated → human-reviewed | Assessment Team |

**Legacy import source:** If MSM has an ExamSoft item bank, those ~5,000 existing questions are imported, tagged with concept mappings and framework codes, and linked into the graph. This gives immediate coverage data before AI generation starts.

**Generation pipeline source chain:**
```
TaskShell (Phase 5) + SubConcept (Phase 3) + ContentChunk (Phase 4)
    → 10-Stage ECD Pipeline (Stages 1–10)
    → AssessmentItem + Options + EvidenceRules + AssessmentArgument
```

---

## Phase 8: Student Mastery Layer (~120,000+ nodes at scale)

| Node Type | Est. Count | Source Document(s) | Location / Access | Ingestion Method | Data Owner |
|-----------|------------|---------------------|-------------------|------------------|------------|
| **Student** | ~600 | MSM Student Information System (SIS) + Canvas LMS | SIS API / Canvas API | Automated sync | Registrar |
| **Cohort** | ~4 | MSM Registrar (class years) | SIS | Manual seed | Registrar |
| **AttemptRecord** | ~500,000 | QWEST assessment delivery + ExamSoft import | Runtime system | System-generated per student response | Runtime |
| **StudentModelVariable** | ~120,000 | Hybrid BKT-IRT engine output (per-student × per-concept) | Runtime system | System-generated by measurement engine | Runtime |
| **EPAEntrustmentStatus** | ~7,800 | Clinical evaluation forms + preceptor ratings | MedHub / New Innovations / QWEST | Semi-automated import | Clinical Ed |
| **ConceptMastery** | ~120,000 | Derived from AttemptRecords + BKT-IRT updates | Runtime system | System-generated (θ estimates per student per concept) | Runtime |

**Source chain:**
```
Student takes assessment → AttemptRecord created → BKT-IRT engine updates →
StudentModelVariable and ConceptMastery nodes updated →
Adaptive engine uses updated θ for next item selection
```

---

## Phase 9: Reporting & Compliance Layer (derived nodes)

| Node Type | Est. Count | Source Document(s) | Location / Access | Ingestion Method | Data Owner |
|-----------|------------|---------------------|-------------------|------------------|------------|
| **CoverageReport** | ~20/year | Generated from graph traversals across all layers | QWEST analytics | System-generated snapshot | Curriculum Office |
| **CoverageGap** | Variable | Identified by coverage analysis queries | QWEST analytics | System-generated | Curriculum Office |
| **RemediationPlan** | Variable | Faculty response to identified gaps | QWEST UI | Manual creation | Course Directors |
| **VerificationEvent** | ~500/year | Faculty review of AI-generated content | QWEST review interface | System-generated per review action | Faculty |

---

## Phase 10: External Integration (bridge nodes)

| Node Type | Est. Count | Source Document(s) | Location / Access | Ingestion Method | Data Owner |
|-----------|------------|---------------------|-------------------|------------------|------------|
| **ExternalEntity** | ~1,000 | Hetionet biomedical knowledge graph | hetio.org | API import (disease–gene–drug relationships) | External |
| **ExternalIdentifier** | Variable | Cross-system IDs (ExamSoft item ID, Canvas course ID, SIS student ID) | Multiple systems | Automated sync | Multiple |

---

## Summary: Source Document Master List

| # | Source Document | Publicly Available? | Feeds Phase(s) | Node Types Fed |
|---|----------------|--------------------|-----------------|--------------------|
| 1 | MSM Academic Catalog 2023–2025 | No (institutional) | 1, 3 | Program, ProgramTrack, AcademicYear, AcademicTerm, Block, Course, CurriculumUnit, Clerkship, PromotionGate, ClinicalSite, ILO, Prerequisite, SessionType |
| 2 | MSM Curriculum Map | No (institutional) | 1 | CurricularPhase, Block |
| 3 | MSM Academic Calendar | No (institutional) | 1 | AcademicTerm |
| 4 | MEDI 531 LO Syllabus (Type 1) | No (institutional) | 3 | SLO (~70+ objectives) |
| 5 | MEDI 531 Session Schedule Syllabus | No (institutional) | 3, 6 | Session (~85 sessions), AT_BLOOM, ADDRESSES relationships |
| 6 | MEDI 532 LO Syllabus (Type 1) | No (institutional) | 3 | SLO |
| 7 | MEDI 533 LO Syllabus (Type 1) | No (institutional) | 3 | SLO |
| 8 | MEDI 611 IPC Syllabus (Type 3) | No (institutional) | 2F, 3 | MSM_LearningObjectiveCode, SLO with ACGME tags |
| 9 | MEDI 611 HV II Syllabus (Type 4) | No (institutional) | 3 | SLO (thematic, AI-extracted) |
| 10 | MEDI 600 Pathophys Syllabus (Type 5) | No (institutional) | 3 | SLO (hybrid) |
| 11 | MEDI 606 Pathology Syllabus (Type 5) | No (institutional) | 3 | SLO (hybrid) |
| 12 | MEDI 511 FoM1 Syllabus (Type 6) | No (institutional) | 3 | Minimal — manual review |
| 13 | Atherosclerosis Lecture PPTX | No (institutional) | 3, 4 | Session, ContentChunk, SubConcept (SEED-011 reference fixture) |
| 14 | Faculty Lecture Slides (all courses) | No (institutional) | 4 | ContentChunk, SlideSection, MediaAsset |
| 15 | USMLE Step 1 Content Description | Yes (usmle.org) | 2A | USMLE_System, USMLE_Discipline, USMLE_Task, USMLE_Topic |
| 16 | LCME Functions & Structure 2024–2025 | Yes (lcme.org) | 2B | LCMEStandard, LCMEElement |
| 17 | ACGME Common Program Requirements | Yes (acgme.org) | 2C | ACGME_Domain, ACGME_Subdomain |
| 18 | AAMC Core EPAs for Entering Residency | Yes (aamc.org) | 2D | EPA, EPAGroup |
| 19 | Anderson & Krathwohl Revised Bloom's | Yes (published) | 2E | BloomLevel |
| 20 | Miller Clinical Competence Pyramid | Yes (published) | 2E | MillerLevel |
| 21 | SNOMED CT + MeSH + UMLS | Yes (NLM, academic license) | 3C | StandardTerm |
| 22 | Hetionet Biomedical KG | Yes (hetio.org) | 10 | ExternalEntity |
| 23 | ExamSoft Item Bank Export | No (institutional) | 7 | AssessmentItem (legacy import) |
| 24 | MSM SIS / Canvas LMS | No (institutional) | 8 | Student, Cohort |
| 25 | MedHub / New Innovations | No (institutional) | 8 | EPAEntrustmentStatus |
| 26 | NBME Item-Writing Workshop | Yes (published principles) | 5 | TaskShell, EvidenceRuleTemplate design |

---

## Structured Data Files (JSON fixtures)

These are the intermediate JSON files that bridge raw source documents to Cypher seed scripts:

| File | Source Document(s) | Created By | Feeds |
|------|--------------------|------------|-------|
| `msm-catalog.json` | MSM Academic Catalog (#1) | Claude extraction + human validation | Phase 1 seed scripts |
| `usmle-content-outline.json` | USMLE Step 1 Content Description (#15) | Semi-automated extraction | Phase 2A seed scripts |
| `lcme-standards.json` | LCME Functions & Structure (#16) | Manual JSON structuring | Phase 2B seed scripts |
| `acgme-competencies.json` | ACGME Common Program Requirements (#17) | Manual JSON structuring | Phase 2C seed scripts |
| `snomed-mesh-seed.json` | SNOMED CT + MeSH (#21) | Semi-automated (NLM API) | Phase 3C seed scripts |

---

## Node Count Progression by Phase

| After Phase | Cumulative Nodes | Cumulative Relationships | Key Milestone |
|-------------|------------------|--------------------------|---------------|
| Phase 1 | ~40 | ~60 | Institutional skeleton in graph |
| Phase 2 | ~390 | ~450 | All 6 framework families loaded |
| Phase 3 | ~2,400 | ~5,000 | Concept hierarchy + SLOs populated |
| Phase 4 | ~7,400 | ~30,000 | Content chunks from lecture ingestion |
| Phase 5 | ~7,480 | ~30,500 | ECD measurement architecture ready |
| Phase 6 | ~7,500 | ~65,000 | Massive relationship creation (coverage analysis possible) |
| Phase 7 | ~60,000 | ~400,000 | Assessment items live |
| Phase 8 | ~300,000 | ~1,500,000 | Student mastery tracking live |
| Phase 9 | ~300,500 | ~1,502,000 | Compliance reporting automated |
| Phase 10 | ~301,500 | ~1,510,000 | External KG integration |

---

*This document is the authoritative source-to-node traceability reference for QWEST. Every node in the knowledge graph has a documented origin. Nothing is invented.*
