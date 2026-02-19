# Journey OS — Ontology & Seeding Blueprint v1.1

**Date:** February 17, 2026  
**Purpose:** Single source of truth for how every piece of data enters the graph, who creates each connection, and how we validate trust at every layer.  
**Supersedes:** All previous seeding documents, Phase 1-10 specs, and ad-hoc ontology discussions.

---

## Table of Contents

1. [The Ontology at a Glance](#1-the-ontology-at-a-glance)
2. [Layer-by-Layer: What Exists and How It Gets There](#2-layer-by-layer)
3. [The Connection Authority Matrix: Claude vs Human](#3-connection-authority-matrix)
4. [ILO ↔ SLO: The Full Story](#4-ilo-slo-the-full-story)
5. [USMLE Tagging: How Syllabi and Lectures Get Mapped](#5-usmle-tagging)
6. [Chunking & Vectorization: The Dual-Store Pipeline](#6-chunking-and-vectorization)
7. [Graph RAG vs Vector RAG: When to Use Which](#7-graph-rag-vs-vector-rag)
8. [LOD Enrichment: Identifying and Connecting Standard Terminology](#8-lod-enrichment)
9. [Hetionet Biomedical Knowledge Integration](#9-hetionet-biomedical-knowledge-integration)
10. [The Seeding Sequence: What Happens in What Order](#10-the-seeding-sequence)
11. [Validation & Trust Gates](#11-validation-and-trust-gates)

---

## 1. The Ontology at a Glance

The Journey OS knowledge graph has **five conceptual layers**, each with a different stability profile and a different authority model for who creates and validates data.

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 5: STUDENT STATE (most dynamic)                              │
│  StudentMastery, AttemptRecord, Response                            │
│  Authority: System-generated from student interactions              │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 4: ASSESSMENT                                                │
│  AssessmentItem, Exam, ExamSession, Option, Rationale               │
│  Authority: Claude generates → Faculty validates                    │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 3: CONTENT & CONCEPTS (the living layer)                     │
│  ContentChunk, SubConcept, Domain, Concept, Session, Slide          │
│  SLO, StandardTerm, ExternalEntity                                  │
│  Authority: Mixed — Claude extracts, Faculty reviews, LOD auto      │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 2: FRAMEWORKS (quasi-static)                                 │
│  USMLE_System, USMLE_Discipline, ACGME_Competency, EPA,            │
│  LCME_Element, BloomLevel, MillerLevel                              │
│  Authority: National standards bodies — seeded once, updated rarely │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 1: INSTITUTIONAL STRUCTURE (most stable)                     │
│  School, Program, ProgramTrack, AcademicYear, CurricularPhase,     │
│  Block, Course, Section, AcademicTerm, ILO                         │
│  Authority: Admin/Curriculum Committee — manual entry               │
└─────────────────────────────────────────────────────────────────────┘
```

**Key principle:** Data flows *upward* through the layers. Layer 1 exists before anything else. Layer 2 exists before content enters. Layer 3 is populated by the ingestion pipeline. Layer 4 is populated by the generation engine. Layer 5 is populated by student interactions. Each layer depends on the layers below it.

---

## 2. Layer-by-Layer: What Exists and How It Gets There

### Layer 1: Institutional Structure

These nodes represent MSM's organizational reality. They change on an annual or multi-year cycle.

| Node | Source | Who Creates | How | Count |
|------|--------|-------------|-----|-------|
| School | MSM catalog | Admin (one-time) | Manual entry in admin UI (A-001) | 1 |
| Program | MSM catalog | Admin (one-time) | Manual entry | 1 |
| ProgramTrack | MSM catalog | Admin | Manual — 4-Year, 5-Year tracks | 2 |
| AcademicYear | MSM catalog | Admin | Manual — M1, M2, M3, M4 | 4 |
| CurricularPhase | MSM catalog | Admin | Manual — Pre-clerkship, Clerkship, Post-clerkship | 3-4 |
| Block | MSM catalog | Admin | Manual — teaching blocks within phases | ~6 |
| Course | MSM catalog | Admin | Manual entry per course (MEDI 511, etc.) | ~14 |
| Section | MSM registrar | Admin | One per course per term offering | ~28 |
| AcademicTerm | MSM calendar | Admin | Manual — Fall 2025, Spring 2026, etc. | 4+ |
| **ILO** | **Course catalog / Curriculum committee** | **Admin** | **Manual entry per course (A-008)** | **~70-140** |

**ILOs live in Layer 1** because they are institutional commitments, not extracted content. The curriculum committee defines them. They are stable across sections and semesters. They are the "promises" the institution makes about what students will learn.

**Relationships in this layer:**
- `School → HAS_PROGRAM → Program`
- `Program → HAS_TRACK → ProgramTrack`
- `Program → HAS_YEAR → AcademicYear`
- `AcademicYear → HAS_PHASE → CurricularPhase`
- `CurricularPhase → HAS_BLOCK → Block`
- `Block → HAS_COURSE → Course`
- `Course → HAS_SECTION → Section`
- `Section → OFFERED_IN → AcademicTerm`
- `Course → HAS_ILO → ILO`

**All Layer 1 relationships are human-created.** No AI involvement. These are organizational facts.

---

### Layer 2: Frameworks

These nodes represent external standards. They are seeded from official published sources and updated only when the standards bodies release new versions.

| Node | Source | Who Creates | How | Count |
|------|--------|-------------|-----|-------|
| USMLE_System | USMLE Content Outline | Engineer (seed script) | Cypher from official PDF | 12 |
| USMLE_Discipline | USMLE Content Outline | Engineer (seed script) | Cypher from official PDF | ~18 |
| USMLE_Task | USMLE Content Outline | Engineer (seed script) | Cypher from official PDF | ~8 |
| ACGME_Competency | ACGME framework | Engineer (seed script) | Cypher from ACGME docs | 6 |
| EPA | AAMC Core EPAs | Engineer (seed script) | Cypher from AAMC docs | 13 |
| LCME_Element | LCME Standards | Engineer (seed script) | Cypher from LCME docs | ~90 |
| BloomLevel | Revised Bloom's Taxonomy | Engineer (seed script) | Static — 6 levels | 6 |
| MillerLevel | Miller's Pyramid | Engineer (seed script) | Static — 5 levels | 5 |

**Relationships within Layer 2:**
- `USMLE_System → HAS_DISCIPLINE → USMLE_Discipline` (the blueprint matrix)
- `BloomLevel → NEXT_LEVEL → BloomLevel` (ordering)
- `MillerLevel → NEXT_LEVEL → MillerLevel` (ordering)

**Cross-layer relationships (Layer 1 ↔ Layer 2):**

| Relationship | Direction | Who Creates | How |
|---|---|---|---|
| `ILO → MAPS_TO_COMPETENCY → ACGME_Competency` | Admin | Admin UI (A-008 mapping modal) with Claude suggestions | 
| `ILO → MAPS_TO_EPA → EPA` | Admin | Admin UI with Claude suggestions |
| `ILO → ADDRESSES_LCME → LCME_Element` | Admin | Admin UI with Claude suggestions |

**How Claude helps here:** When an Admin creates an ILO like "Demonstrate understanding of cardiovascular pathophysiology," Claude analyzes the text and suggests: "This maps to ACGME: Medical Knowledge (94% confidence), EPA 2: Differential Diagnosis (78%), LCME 7.1: Biomedical Sciences (96%)." The Admin sees these as checkboxes with confidence scores and approves, edits, or rejects each one.

**Trust gate:** No ILO → Framework mapping goes live without Admin approval. Claude's suggestions are presented in a review UI, never auto-committed.

---

### Layer 3: Content & Concepts (The Living Layer)

This is where most of the complexity lives. This layer is populated by the **ingestion pipeline** — documents go in, structured graph data comes out.

#### 3A. Content Nodes (from document ingestion)

| Node | Source | Who Creates | How | Count |
|------|--------|-------------|-----|-------|
| Session | Syllabus | Claude extracts → Faculty confirms | Parse syllabus week/session structure | ~400-600 |
| ContentChunk | Syllabus/Lecture/Textbook | Pipeline (automated) | Parse → Chunk → Dual-write | ~65,000+ |
| Slide | Lecture PPTX | Pipeline (automated) | Parse PPTX → one node per slide | ~2,000-4,000 |
| Resource | Uploaded files | Pipeline (automated) | One node per uploaded document | ~200-500 |

#### 3B. Knowledge Nodes (from AI extraction)

| Node | Source | Who Creates | How | Count |
|------|--------|-------------|-----|-------|
| Domain | Curriculum structure | Admin | Manual — broad groupings (Cardiology, Neurology) | ~15-25 |
| Concept | Syllabus + Claude | Claude proposes → Admin approves | AI groups SubConcepts into parent Concepts | ~200-500 |
| **SubConcept** | **Lecture content + Claude** | **Claude extracts → Faculty reviews** | **AI concept extraction from chunks** | **~8,000-15,000** |
| **SLO** | **Syllabus per-session objectives** | **Claude extracts → Faculty reviews** | **Parse syllabus session-level LOs** | **~3,000-6,000** |
| StandardTerm | UMLS/SNOMED/MeSH APIs | Pipeline (automated) | LOD enrichment after SubConcept approval | ~1,000-5,000 |
| ExternalEntity | Hetionet | Pipeline (automated) | Selective import of related biomedical entities | ~5,000-47,000 |

#### 3C. Critical Relationships in Layer 3

**This is the section that answers "how does everything connect."**

```
THE COVERAGE CHAIN (the most important path in the entire graph):

  ContentChunk ──TEACHES_VERIFIED──► SubConcept ◄──TARGETS── AssessmentItem
                                         │                         │
                                         │                         │
                                    ADDRESSED_BY                ASSESSES
                                         │                         │
                                         ▼                         ▼
                                        SLO ────FULFILLS────►    ILO
                                         │                         │
                                     AT_BLOOM                 MAPS_TO_COMPETENCY
                                         │                    MAPS_TO_EPA
                                         ▼                    ADDRESSES_LCME
                                     BloomLevel                    │
                                                                   ▼
                                                           ACGME / EPA / LCME
```

**Reading the chain:** "This content chunk teaches this subconcept, which is addressed by this SLO, which fulfills this ILO, which maps to these accreditation standards." If any link in the chain is missing, you have a gap.

---

## 3. The Connection Authority Matrix: Claude vs Human

This is the core of your question. Every relationship in the graph has an **authority model** — who creates it, who validates it, and what happens if it's wrong.

### Authority Levels

| Level | Meaning | Trust | Example |
|---|---|---|---|
| **HUMAN_ONLY** | Only a human can create this | Highest | Admin creates ILO |
| **HUMAN_APPROVED** | Claude suggests, human must approve | High | SLO → ILO FULFILLS mapping |
| **AI_VERIFIED** | Claude creates, human can override | Medium | ContentChunk → SubConcept TEACHES |
| **AI_AUTO** | Claude creates, no human review needed | Baseline | StandardTerm → LOD codes |
| **SYSTEM_AUTO** | System creates from user actions | Baseline | StudentMastery from responses |

### Full Relationship Authority Map

| Relationship | Direction | Authority | Details |
|---|---|---|---|
| **INSTITUTIONAL (Layer 1)** | | | |
| `School → HAS_PROGRAM → Program` | → | HUMAN_ONLY | Admin seeds once |
| `Course → HAS_ILO → ILO` | → | HUMAN_ONLY | Admin creates ILOs per course |
| `Course → HAS_SECTION → Section` | → | HUMAN_ONLY | Admin per term |
| **FRAMEWORK MAPPINGS (Layer 1↔2)** | | | |
| `ILO → MAPS_TO_COMPETENCY → ACGME` | → | **HUMAN_APPROVED** | Claude suggests with confidence %, Admin approves via A-008 mapping modal |
| `ILO → MAPS_TO_EPA → EPA` | → | **HUMAN_APPROVED** | Same flow |
| `ILO → ADDRESSES_LCME → LCME_Element` | → | **HUMAN_APPROVED** | Same flow |
| **CONTENT EXTRACTION (Layer 3)** | | | |
| `Session → PART_OF → Section` | → | **HUMAN_APPROVED** | Claude parses syllabus structure → Faculty confirms session list |
| `ContentChunk → FROM_SESSION → Session` | → | **AI_VERIFIED** | Pipeline assigns chunk to session based on document position. Faculty can reassign. |
| `ContentChunk → TEACHES → SubConcept` | → | **AI_VERIFIED** | Claude extracts concept from chunk with confidence score. Confidence < 0.7 → review queue. ≥ 0.7 → auto-created, overridable. |
| `ContentChunk → TEACHES_VERIFIED → SubConcept` | → | **HUMAN_APPROVED** | Faculty explicitly confirms a TEACHES edge. This is the "gold" version used for assessment context. |
| **SLO CREATION & MAPPING** | | | |
| `Session → HAS_SLO → SLO` | → | **HUMAN_APPROVED** | Claude parses per-session objectives from syllabus → Faculty reviews extracted SLOs in F-005 |
| `SLO → AT_BLOOM → BloomLevel` | → | **AI_VERIFIED** | Claude infers Bloom level from verb ("Describe" → Understand, "Analyze" → Analyze). Faculty can override in review UI. |
| `SLO → ADDRESSED_BY → SubConcept` | → | **AI_VERIFIED** | Claude determines which SubConcepts an SLO covers based on semantic similarity. Review queue for low confidence. |
| **THE FULFILLS BRIDGE** | | | |
| `SLO → FULFILLS → ILO` | → | **HUMAN_APPROVED** | Claude suggests, Faculty maps via drag-and-drop (F-009), Admin verifies (A-009). **This is the most important human-validated edge in the graph.** |
| **USMLE MAPPING** | | | |
| `SubConcept → MAPS_TO → USMLE_System` | → | **AI_VERIFIED** | Claude assigns USMLE system during extraction. Faculty can override. See §5. |
| `SubConcept → MAPS_TO → USMLE_Discipline` | → | **AI_VERIFIED** | Same — Claude assigns discipline coordinate. |
| **LOD CONNECTIONS** | | | |
| `SubConcept → GROUNDED_IN → StandardTerm` | → | **AI_AUTO** | Pipeline queries UMLS API after SubConcept approval. No human review unless ambiguous. See §8. |
| `StandardTerm → SAME_AS → StandardTerm` | → | **AI_AUTO** | Cross-ontology links from UMLS crosswalks |
| `SubConcept → LINKED_TO → ExternalEntity` | → | **AI_AUTO** | Hetionet edges imported automatically |
| **CONCEPT HIERARCHY** | | | |
| `Domain → HAS_CONCEPT → Concept` | → | **HUMAN_APPROVED** | Admin organizes concept hierarchy |
| `Concept → HAS_SUBCONCEPT → SubConcept` | → | **AI_VERIFIED** | Claude groups SubConcepts under parent Concepts. Admin can reorganize. |
| `SubConcept → PREREQUISITE_OF → SubConcept` | → | **AI_VERIFIED** | Claude infers from syllabus order + content analysis. Faculty validates critical prerequisite chains. |
| `SubConcept → RELATED_TO → SubConcept` | → | **AI_AUTO** | Typed edges (same_system, differential_diagnosis, commonly_confused). Used for distractor generation. |
| **ASSESSMENT (Layer 4)** | | | |
| `AssessmentItem → ASSESSES → SLO` | → | **HUMAN_APPROVED** | Claude suggests during generation → Faculty confirms in review |
| `AssessmentItem → TARGETS → SubConcept` | → | **AI_VERIFIED** | Claude assigns primary/secondary concept targets |
| `AssessmentItem → AT_BLOOM → BloomLevel` | → | **AI_VERIFIED** | Claude assigns, Faculty can override |
| **STUDENT STATE (Layer 5)** | | | |
| `Student → HAS_MASTERY → StudentMastery` | → | **SYSTEM_AUTO** | Created on first interaction with a SubConcept |
| `StudentMastery → MEASURES → ProficiencyVariable` | → | **SYSTEM_AUTO** | BKT/IRT engine updates after each response |

---

## 4. ILO ↔ SLO: The Full Story

### What They Are

**ILO (Institutional Learning Outcome):** A stable, high-level promise the institution makes about what students will achieve. Set by the curriculum committee. Lives at the Course level. Changes maybe once per accreditation cycle.

Example: *"Students will demonstrate understanding of the pathophysiology of major organ systems."*

**SLO (Student Learning Outcome / Section Learning Outcome):** A granular, measurable objective for a specific session or week. Lives at the Session level. Changes each semester as faculty adjust their teaching.

Example: *"Students will identify the pathophysiologic mechanisms of heart failure, including systolic and diastolic dysfunction."*

### How They Enter the Graph

**ILOs: Human-created, always.**

1. Admin navigates to A-008 (ILO Management screen)
2. Selects a Course (e.g., MEDI-511)
3. Enters ILOs manually, OR imports from a CSV extracted from the course catalog
4. For each ILO, Admin maps to ACGME, EPA, LCME via the mapping modal
   - Claude suggests framework mappings with confidence scores
   - Admin approves/rejects each suggestion
5. ILO nodes are created in Neo4j: `(course)-[:HAS_ILO]->(ilo)`
6. Framework edges are created only upon Admin approval

**SLOs: Claude-extracted, Faculty-reviewed.**

1. Faculty uploads a syllabus for their Section
2. Pipeline Stage: **Parse** — extracts text from PDF/DOCX
3. Pipeline Stage: **SLO Extraction** — Claude reads the parsed syllabus and identifies per-session learning objectives

   Claude's prompt context includes:
   - The full parsed syllabus text
   - The Course's ILOs (so Claude knows the institutional context)
   - The syllabus type classification (Type 1-6) to guide extraction strategy

   Claude returns structured JSON:
   ```json
   {
     "sessions": [
       {
         "session_title": "Cardiac Anatomy and Physiology",
         "week": 1,
         "slos": [
           {
             "text": "Describe the gross anatomy of the heart including chambers, valves, and vessels",
             "bloom_verb": "describe",
             "inferred_bloom_level": 2,
             "confidence": 0.95
           }
         ]
       }
     ]
   }
   ```

4. Faculty sees extracted SLOs in **F-005 (SLO Review Queue)**
   - Each SLO shown with source text highlighted in the syllabus
   - Bloom level shown as a tag (editable)
   - Approve / Edit / Reject per SLO
5. Approved SLOs become nodes: `(session)-[:HAS_SLO]->(slo)`, `(slo)-[:AT_BLOOM]->(bloom_level)`

### The FULFILLS Bridge: How SLOs Connect to ILOs

This is the most critical human-validated relationship in the entire system.

**Step 1: Claude suggests FULFILLS mappings**

After SLOs are approved, Claude analyzes each SLO against the Course's ILOs using semantic similarity + Bloom level compatibility:

```
Input to Claude:
  - SLO: "Identify the pathophysiologic mechanisms of heart failure"
  - Course ILOs: [list of all ILOs for this course]

Claude returns:
  - ILO-3: "Understand pathophysiology of major organ systems" → 92% match
  - ILO-7: "Apply diagnostic reasoning to cardiovascular cases" → 34% match
```

**Step 2: Faculty maps via F-009 (FULFILLS Mapping UI)**

Two-panel drag-and-drop interface:
- Left panel: SLOs grouped by week/session
- Right panel: ILOs as drop targets
- Drag SLO → drop on ILO = create FULFILLS edge
- Claude's suggestions appear as pre-highlighted recommendations
- Unmapped SLOs are visually flagged (amber highlight)
- ILOs with zero FULFILLS edges are flagged (red — "No SLOs map to this ILO")

**Step 3: Admin verifies via A-009 (FULFILLS Review Queue)**

Admin sees all Faculty-submitted FULFILLS mappings with full context:
- The SLO text, its session, its Bloom level
- The ILO text, its framework mappings
- Claude's original confidence score
- Approve / Reject / Reassign

**Step 4: Only after Admin approval does the edge go live**

```cypher
CREATE (slo)-[:FULFILLS {
  mapped_by: "faculty_uuid",
  verified_by: "admin_uuid",
  ai_confidence: 0.92,
  mapped_at: datetime(),
  verified_at: datetime()
}]->(ilo)
```

### What About Orphans?

The system watches for two dangerous states:

- **Orphan SLOs:** SLOs that don't FULFILLS any ILO. This means the Faculty is teaching something that doesn't trace back to an institutional promise. Could be a missing ILO, or a syllabus error.
- **Unfulfilled ILOs:** ILOs that have zero SLOs mapping to them. This means the institution promises an outcome but no session-level objective addresses it. This is an LCME compliance risk.

Both are surfaced in the Admin dashboard.

---

## 5. USMLE Tagging: How Syllabi and Lectures Get Mapped

### The Question: How Do We Know Which USMLE Nodes Apply?

USMLE tagging happens at the **SubConcept level**. When Claude extracts a SubConcept from a lecture or syllabus chunk, it simultaneously assigns USMLE coordinates.

### The Extraction Flow

**Step 1: Content enters as a chunk**

A lecture slide about "Atherosclerotic Plaque Formation" is chunked and embedded.

**Step 2: Claude extracts SubConcepts with USMLE coordinates**

Claude's extraction prompt includes:
- The chunk text
- The Course context (which course, which session)
- The full USMLE blueprint (all 12 Systems, all Disciplines, all Tasks) as reference

Claude returns:
```json
{
  "subconcepts": [
    {
      "name": "Atherosclerotic Plaque Formation",
      "description": "Process of lipid accumulation and inflammatory response in arterial walls",
      "usmle_system": "Cardiovascular",
      "usmle_discipline": "Pathology",
      "usmle_task": "Mechanisms of Disease",
      "confidence": {
        "system": 0.98,
        "discipline": 0.91,
        "task": 0.85
      },
      "semantic_type": "Pathological Process",
      "multi_label": ["SubConcept", "Pathway"]
    }
  ]
}
```

**Step 3: Confidence-gated creation**

| Confidence | Action |
|---|---|
| ≥ 0.8 all three coordinates | Auto-create MAPS_TO edges. AI_VERIFIED status. |
| 0.5 – 0.8 on any coordinate | Create edges but flag for Faculty review. |
| < 0.5 on any coordinate | Do NOT create edges. Send to review queue with "USMLE mapping unclear." |

**Step 4: Faculty review (for flagged items)**

In the SubConcept review queue (A-006b), Faculty sees:
- The SubConcept name and description
- Claude's suggested USMLE coordinates with confidence scores
- Dropdown selectors for System, Discipline, Task to override

**Step 5: MAPS_TO edges created**

```cypher
MATCH (sc:SubConcept {uuid: $scId})
MATCH (us:USMLE_System {name: $systemName})
MATCH (ud:USMLE_Discipline {name: $disciplineName})
CREATE (sc)-[:MAPS_TO {mapped_by: $authority, confidence: $conf}]->(us)
CREATE (sc)-[:MAPS_TO {mapped_by: $authority, confidence: $conf}]->(ud)
```

### How This Cascades to Syllabi and Lectures

Since SubConcepts are extracted FROM content chunks, and content chunks come FROM syllabi and lectures, the USMLE tagging is **inherited upward**:

```
Lecture Slide (raw content)
  → ContentChunk (chunked text)
    → TEACHES → SubConcept (extracted concept)
      → MAPS_TO → USMLE_System (e.g., Cardiovascular)
      → MAPS_TO → USMLE_Discipline (e.g., Pathology)
```

To answer "What USMLE topics does this syllabus cover?":
```cypher
MATCH (sect:Section {course_code: "MEDI-511"})
MATCH (sess:Session)-[:PART_OF]->(sect)
MATCH (cc:ContentChunk)-[:FROM_SESSION]->(sess)
MATCH (cc)-[:TEACHES_VERIFIED]->(sc:SubConcept)
MATCH (sc)-[:MAPS_TO]->(us:USMLE_System)
RETURN us.name, count(DISTINCT sc) AS concepts_covered
ORDER BY concepts_covered DESC
```

To find "USMLE gaps — what's NOT covered":
```cypher
MATCH (us:USMLE_System)
OPTIONAL MATCH (sc:SubConcept)-[:MAPS_TO]->(us)
WHERE sc.source_course = "MEDI-511"
WITH us, count(sc) AS covered
WHERE covered = 0
RETURN us.name AS uncovered_system
```

---

## 6. Chunking & Vectorization: The Dual-Store Pipeline

### The Core Principle

**Neo4j owns structure and meaning. Supabase + pgvector owns content and similarity.**

A ContentChunk node in Neo4j is *skinny* (~100 bytes). It holds just enough to traverse the graph: a UUID, a pointer to Supabase, a source_type, and a course_id. The actual text, the embedding vector, and the full metadata live in Supabase.

### The 6-Stage Ingestion Pipeline

```
DOCUMENT UPLOAD
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 1: PARSE                                                   │
│                                                                   │
│ Input: PDF / DOCX / PPTX                                        │
│ Tool: pdfplumber (PDF), mammoth (DOCX), python-pptx (PPTX)     │
│ Output: Raw text + structural metadata (headings, page breaks)  │
│                                                                   │
│ Syllabus Type Detection runs here:                               │
│   Type 1 (Objectives-Based) → extract numbered LO lists          │
│   Type 2 (Course Overview) → extract high-level structure         │
│   Type 3 (ACGME-Coded) → extract codes + descriptions            │
│   Type 4 (Clinical Dense) → flag for AI extraction                │
│   Type 5 (Mixed) → chunk by section type                          │
│   Type 6 (Minimal) → flag for manual review                      │
│                                                                   │
│ Authority: SYSTEM_AUTO (no human involved)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 2: CHUNK                                                   │
│                                                                   │
│ Strategy: Semantic chunking                                      │
│   Target: 800 tokens per chunk                                   │
│   Overlap: 100 tokens between adjacent chunks                    │
│   Boundary respect: Never split mid-sentence, mid-paragraph      │
│   Slide-aware: For PPTX, one chunk per slide (+ speaker notes)  │
│                                                                   │
│ Each chunk gets:                                                  │
│   - chunk_index (position in document)                           │
│   - source_type (syllabus | lecture | textbook | clinical_guide) │
│   - session_id (if determinable from document structure)         │
│   - heading_context (nearest heading above the chunk)            │
│                                                                   │
│ Authority: SYSTEM_AUTO                                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 3: EMBED                                                   │
│                                                                   │
│ Model: Voyage AI (voyage-large-2) → 1024-dim vectors            │
│ Store: Supabase pgvector with HNSW index                         │
│                                                                   │
│ What gets embedded:                                               │
│   - The chunk text itself                                         │
│   - Prepended with heading_context for better retrieval           │
│     e.g., "Cardiovascular System > Week 3 > Atherosclerosis:     │
│            The formation of atherosclerotic plaques begins..."    │
│                                                                   │
│ Why heading context matters:                                      │
│   Without it, "The process begins with endothelial damage"       │
│   could be about ANY organ system. With context, the embedding    │
│   captures that this is cardiovascular pathology.                 │
│                                                                   │
│ Authority: SYSTEM_AUTO                                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 4: EXTRACT (the AI stage)                                  │
│                                                                   │
│ This is where Claude enters the pipeline.                        │
│                                                                   │
│ For each chunk, Claude receives:                                  │
│   - The chunk text                                                │
│   - The Course context (name, phase, ILOs)                       │
│   - The USMLE blueprint (all systems/disciplines)                │
│   - Existing SubConcepts in this course (to avoid duplicates)    │
│                                                                   │
│ Claude returns:                                                   │
│   1. SubConcept extractions (name, description, USMLE coords)   │
│   2. SLO extractions (if this chunk contains learning objectives)│
│   3. TEACHES confidence (how strongly this chunk teaches each    │
│      extracted SubConcept)                                        │
│   4. Coverage type per TEACHES edge:                              │
│      Definition | Mechanism | Example | Clinical Application     │
│                                                                   │
│ Deduplication:                                                    │
│   Before creating a new SubConcept, check pgvector for existing  │
│   SubConcepts with cosine similarity > 0.92.                     │
│   If match found → reuse existing SubConcept, add TEACHES edge   │
│   If no match → create new SubConcept                             │
│                                                                   │
│ Authority: AI_VERIFIED (auto-created, overridable)               │
│ Exception: Confidence < 0.7 → routed to review queue             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 5: DUAL-WRITE                                              │
│                                                                   │
│ Supabase (the fat store):                                        │
│   INSERT INTO content_chunks (                                    │
│     id, resource_id, chunk_index, text, heading_context,         │
│     embedding, token_count, source_type, session_id,             │
│     concept_extractions, created_at                               │
│   )                                                               │
│                                                                   │
│ Neo4j (the skinny store):                                        │
│   CREATE (:ContentChunk {                                         │
│     uuid: $chunkUuid,                                             │
│     supabase_id: $supabaseId,    // pointer to full content      │
│     source_type: "lecture",                                       │
│     course_id: "msm_medi_511",                                   │
│     session_id: "sess_511_03",                                    │
│     chunk_index: 3                                                │
│   })                                                              │
│                                                                   │
│   // Relationship edges                                           │
│   CREATE (cc)-[:FROM_SESSION]->(session)                          │
│   CREATE (cc)-[:FROM_COURSE]->(course)                            │
│   CREATE (cc)-[:TEACHES {                                         │
│     confidence: 0.87,                                             │
│     coverage_type: "Mechanism",                                   │
│     mapping_source: "AI_extracted"                                │
│   }]->(subconcept)                                                │
│                                                                   │
│ Authority: SYSTEM_AUTO (edges carry AI_VERIFIED status)          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 6: REVIEW QUEUE                                            │
│                                                                   │
│ Routes to human review when:                                      │
│   - Any TEACHES confidence < 0.7                                  │
│   - Any USMLE mapping confidence < 0.5                           │
│   - SubConcept name matches existing but description diverges    │
│   - Chunk contains apparent LOs but extraction confidence is low │
│   - Syllabus detected as Type 6 (minimal)                        │
│                                                                   │
│ Faculty sees flagged items in F-005 review queue                 │
│ Admin sees cross-section patterns in A-006                       │
│                                                                   │
│ Authority: HUMAN_APPROVED (review queue items)                   │
└─────────────────────────────────────────────────────────────────┘
```

### What Lives Where: The Dual-Store Split

| Data | Supabase (PostgreSQL + pgvector) | Neo4j |
|---|---|---|
| Chunk full text | ✅ `content_chunks.text` | ❌ |
| Chunk embedding (1024-dim) | ✅ `content_chunks.embedding` | ❌ |
| Chunk → SubConcept mapping | ✅ `content_chunks.concept_extractions` (JSON) | ✅ `TEACHES` relationship |
| SubConcept name + description | ✅ `subconcepts` table (search/display) | ✅ node properties (traversal) |
| SubConcept embedding | ✅ `subconcepts.embedding` (dedup + similarity) | ❌ |
| USMLE coordinates | ❌ | ✅ `MAPS_TO` edges |
| SLO → ILO mapping | ❌ | ✅ `FULFILLS` edges |
| Student mastery state | ✅ `student_mastery` table (fast reads) | ✅ `StudentMastery` node (graph traversal) |

---

## 7. Graph RAG vs Vector RAG: When to Use Which

The system uses **two different retrieval strategies** depending on the question being asked.

### Vector RAG (Supabase pgvector)

**When:** You need to find content that is *semantically similar* to a query, regardless of graph structure.

**How it works:**
1. Embed the query (same Voyage model)
2. Cosine similarity search against `content_chunks.embedding`
3. Return top-k chunks ranked by similarity

**Use cases:**
- "Find content similar to this question stem" (deduplication)
- "What lecture material covers heart failure?" (broad content retrieval)
- "Find chunks relevant to this SubConcept" (context assembly for generation)
- Student asks a free-text question → retrieve relevant content

**Strengths:** Handles fuzzy, natural-language queries. Finds semantically related content even if terminology differs. Fast (HNSW index).

**Weaknesses:** No structural awareness. Doesn't know about prerequisite chains, USMLE mappings, or curriculum hierarchy. Can return chunks from unrelated courses.

### Graph RAG (Neo4j traversal)

**When:** You need to follow *relationships and structure* to find the right content.

**How it works:**
1. Start from a known node (a SubConcept, an SLO, a Student)
2. Traverse edges to find connected information
3. Collect content by following `supabase_id` pointers back to full text

**Use cases:**
- "What content teaches the prerequisites of this SubConcept?" (traverse PREREQUISITE_OF → TEACHES)
- "Generate a question for this SLO" (SLO → ADDRESSED_BY → SubConcept → TEACHES ← ContentChunk)
- "What are this student's weakest USMLE systems?" (Student → HAS_MASTERY → StudentMastery → MEASURES → SubConcept → MAPS_TO → USMLE_System)
- "Does this ILO have assessment coverage?" (ILO ← FULFILLS ← SLO ← ASSESSES ← AssessmentItem)
- "Find commonly confused concepts for distractor generation" (SubConcept → RELATED_TO {type: 'commonly_confused'} → SubConcept)

**Strengths:** Structurally precise. Respects curriculum hierarchy, prerequisite ordering, USMLE mappings. Answers "why" and "how connected" questions.

**Weaknesses:** Requires known starting nodes. Can't handle fuzzy/ambiguous natural-language queries well.

### Hybrid RAG (the real power)

For question generation — the core use case — we use BOTH:

```
STEP 1 (Graph RAG): Start from the target SLO
  → Traverse to SubConcepts it ADDRESSED_BY
  → Traverse to USMLE_System for context
  → Traverse to PREREQUISITE_OF for assumed knowledge
  → Traverse to RELATED_TO for distractor candidates
  → Collect all SubConcept UUIDs

STEP 2 (Vector RAG): For each SubConcept UUID
  → Fetch the SubConcept's embedding from Supabase
  → Find top-3 most relevant ContentChunks via cosine similarity
  → Also find chunks from related SubConcepts (for distractors)

STEP 3 (Context Assembly): Combine
  → Graph structure (what connects to what)
  → Retrieved chunk text (the actual teaching content)
  → LOD enrichment (StandardTerm definitions, Hetionet relationships)
  → Package as Claude's generation context

STEP 4 (Generation): Claude generates the question using this rich context
```

This hybrid approach means the question is grounded in both **structural accuracy** (it assesses the right SLO, targets the right concepts, uses appropriate distractors from related concepts) and **content fidelity** (the clinical details come from actual lecture material, not Claude's general knowledge).

---

## 8. LOD Enrichment: Identifying and Connecting Standard Terminology

### What LOD Is and Why It Matters

Linked Open Data (LOD) connects our internal SubConcepts to the global biomedical vocabulary: UMLS CUIs, SNOMED CT codes, MeSH descriptors, ICD-10 codes. This serves three purposes:

1. **Deduplication:** "MI", "Myocardial Infarction", and "Heart Attack" all map to UMLS CUI C0027051
2. **Interoperability:** USMLE content databases use UMLS. If we share CUIs, our content maps to theirs.
3. **Enrichment:** UMLS knows that MI *is-a* Acute Coronary Syndrome. Hetionet knows which drugs treat it, which genes are involved. This knowledge powers smarter question generation.

### How LOD Gets Identified in Corpuses

LOD enrichment happens **after SubConcept approval**, as an asynchronous pipeline step.

```
SubConcept approved (by Faculty or auto-approved at high confidence)
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: UMLS API Lookup                                          │
│                                                                   │
│ Query UMLS Metathesaurus REST API:                               │
│   Input: SubConcept.name + SubConcept.semantic_type              │
│   Context: Parent Domain/Concept name for disambiguation         │
│                                                                   │
│ Example:                                                          │
│   SubConcept: "Atherosclerotic Plaque Formation"                 │
│   Query: "Atherosclerotic Plaque Formation" + "Pathology"        │
│   Returns: CUI C0004153, Preferred Name: "Atherosclerosis",     │
│            Semantic Type: "Disease or Syndrome"                   │
│                                                                   │
│ If multiple CUI candidates:                                       │
│   Claude disambiguates using the SubConcept's description        │
│   and the content chunks that TEACH it                           │
│                                                                   │
│ Authority: AI_AUTO (no human review for clear matches)           │
│ Exception: If UMLS returns 0 results or >3 ambiguous results    │
│   → flag as "LOD_AMBIGUOUS" for review                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Cross-Ontology Enrichment                                │
│                                                                   │
│ Using the UMLS CUI, pull cross-walks:                            │
│   CUI → SNOMED CT code (via UMLS Metathesaurus)                 │
│   CUI → MeSH descriptor (via UMLS Metathesaurus)                │
│   CUI → ICD-10-CM code (diseases only)                           │
│   CUI → RxNorm code (drugs only)                                 │
│                                                                   │
│ Create or merge StandardTerm node:                                │
│   MERGE (:StandardTerm {cui: "C0004153"})                        │
│   SET preferred_name = "Atherosclerosis",                         │
│       snomed_id = "38341003",                                     │
│       mesh_id = "D050197",                                        │
│       source_vocabulary = "UMLS"                                  │
│                                                                   │
│ Create grounding edge:                                            │
│   (subconcept)-[:GROUNDED_IN {primary: true}]->(standardTerm)   │
│                                                                   │
│ Authority: AI_AUTO                                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Hetionet Integration (Selective)                         │
│                                                                   │
│ For SubConcepts with Disease, Drug, or Gene multi-labels:       │
│   Query Hetionet for edges:                                      │
│     Drug → treats → Disease                                      │
│     Disease → associates → Gene                                  │
│     Gene → participates → BiologicalProcess                      │
│     Compound → binds → Gene                                      │
│                                                                   │
│ Create ExternalEntity nodes for connected entities:              │
│   MERGE (:ExternalEntity {external_id: "hetionet_xxx"})          │
│   SET name = "Metoprolol", entity_type = "Compound",            │
│       source = "hetionet_v1.0"                                   │
│                                                                   │
│ Create LINKED_TO edges:                                           │
│   (subconcept)-[:LINKED_TO {                                     │
│     relationship_type: "treats",                                  │
│     source: "hetionet"                                            │
│   }]->(externalEntity)                                           │
│                                                                   │
│ Authority: AI_AUTO                                               │
│ Note: Selective import — only entities within 2 hops of our      │
│ SubConcepts, not the full 47K-node Hetionet graph               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: LOD Brief Generation                                     │
│                                                                   │
│ For each enriched SubConcept, Claude generates a ~200-token     │
│ "LOD brief" that summarizes:                                     │
│   - UMLS definition                                               │
│   - Key SNOMED parent concepts                                   │
│   - Relevant Hetionet relationships                               │
│                                                                   │
│ This brief is stored as a SubConcept property and used during    │
│ question generation context assembly.                             │
│                                                                   │
│ Example LOD brief:                                                │
│   "Atherosclerosis (C0004153/SNOMED:38341003): Chronic           │
│   inflammatory disease of arterial walls. UMLS parent:            │
│   Arteriosclerosis. Hetionet: treated by statins (atorvastatin,  │
│   rosuvastatin), associated with APOE, LDLR genes.              │
│   Differential: Mönckeberg's medial calcification,               │
│   arteriolosclerosis."                                            │
│                                                                   │
│ Authority: AI_AUTO                                               │
└─────────────────────────────────────────────────────────────────┘
```

### How LOD Is Identified Within Content Chunks

LOD identification in the raw corpus text happens *indirectly*, not by scanning for UMLS codes in the text itself. The flow is:

1. Content chunk text mentions "atherosclerosis" or "plaque formation"
2. Claude extracts SubConcept "Atherosclerotic Plaque Formation" from the chunk
3. After SubConcept is approved, the LOD pipeline queries UMLS for the SubConcept name
4. UMLS returns the CUI, which links to SNOMED/MeSH/ICD-10

The raw text never contains LOD codes. LOD is *discovered* by mapping extracted concepts to standard vocabularies.

### LOD Status Categories

| Status | Meaning | Count (expected) |
|---|---|---|
| `verified` | CUI confirmed, cross-walks complete | ~80% of SubConcepts |
| `inferred` | CUI match found but not validated against content | ~12% |
| `ambiguous` | Multiple CUI candidates, needs review | ~5% |
| `unmappable` | Pedagogical construct with no standard vocabulary entry | ~3% |

**Unmappable is acceptable.** Concepts like "Structure-Function Correlation" or "3D Anatomical Integration" are teaching frameworks, not biomedical entities. They carry `lod_status: "unmappable"` with an explanation.

---

## 9. Hetionet Biomedical Knowledge Integration

### 9.1 What Hetionet Is

Hetionet (Himmelstein et al., 2017) is a publicly available biomedical knowledge graph integrating data from 29 public resources (DrugBank, Disease Ontology, Gene Ontology, SIDER, Reactome, and others). It contains 47,031 nodes across 11 types and 2,250,197 relationships across 24 types — essentially a pre-built map of how drugs, diseases, genes, pathways, symptoms, and biological processes relate to each other at a mechanistic level.

**Hetionet's 11 node types:**

| Type | Description | Native Identifier | Count |
|---|---|---|---|
| Gene | Human genes | Entrez Gene ID (NCBI) | 20,945 |
| Disease | Diseases and conditions | Disease Ontology (DOID) | 137 |
| Compound (Drug) | Pharmaceutical compounds | DrugBank ID | 1,552 |
| Anatomy | Anatomical structures | Uberon ID | 402 |
| Symptom | Signs and symptoms | MeSH ID | 438 |
| Biological Process | GO biological processes | Gene Ontology (GO) | 11,381 |
| Molecular Function | GO molecular functions | Gene Ontology (GO) | 2,884 |
| Cellular Component | GO cellular components | Gene Ontology (GO) | 1,391 |
| Pathway | Biological pathways | Reactome / WikiPathways | 1,822 |
| Pharmacologic Class | Drug class groupings | NDF-RT / DrugBank | 345 |
| Side Effect | Adverse drug reactions | UMLS CUI (via SIDER) | 5,734 |

**Hetionet's 24 relationship types** include precision verbs critical for medical education: BINDS, UPREGULATES, DOWNREGULATES, TREATS, PALLIATES, CAUSES, ASSOCIATES, PARTICIPATES_IN, LOCALIZES_TO, SIDE_EFFECT_OF, CONTRAINDICATES.

### 9.2 Why Journey OS Needs Hetionet

Hetionet solves the **mechanism gap**. Without it, the graph can represent "Metformin treats Type 2 Diabetes" — a fact, but a flat fact. Medical education is fundamentally about understanding *why*.

Hetionet encodes the why through **metapaths** — chains of typed relationships that trace biological mechanisms:

```
Metformin -[:BINDS]-> PRKAB1 (gene)
  PRKAB1 -[:PARTICIPATES_IN]-> AMPK Signaling Pathway
    AMPK Signaling -[:DOWNREGULATES]-> Hepatic Gluconeogenesis
      Hepatic Gluconeogenesis -[:ASSOCIATES]-> Type 2 Diabetes
```

This matters for three specific Journey OS capabilities:

**Question generation quality.** With the metapath, Claude generates: *"A 52-year-old patient with newly diagnosed T2DM is started on metformin. Which of the following best describes the mechanism by which this drug reduces hepatic glucose output?"* — targeting AMPK activation and gluconeogenesis suppression. Without it, Claude generates generic questions from whatever the lecture mentioned.

**Distractor precision.** Each drug class works through a different pathway. DPP-4 inhibitors → incretin pathways. Sulfonylureas → insulin secretion. SGLT2 inhibitors → renal glucose reabsorption. Hetionet makes these alternative metapaths traversable, so distractors aren't random wrong answers — they're plausible mechanisms from related drug classes, matching how NBME writes high-quality distractors.

**Student explanation generation.** When the Intelligent Advisor explains *why* a student got a mechanism question wrong, it traverses the metapath: "You selected the answer related to insulin secretion, which is how sulfonylureas work. Metformin actually works through AMPK activation, which decreases hepatic gluconeogenesis."

### 9.3 The Schema Layer (Adopted Immediately)

Before importing any Hetionet data, Journey OS adopts Hetionet's type system as multi-labels and relationship types. This costs zero nodes.

**13 multi-labels on SubConcept:**

Disease, Drug, Procedure, Skill, Pathway, Anatomy, ClinicalFinding, BiologicalProcess, Gene, Protein, CellularComponent, PharmacologicClass, SideEffect

These enable type-specific queries like `MATCH (d:SubConcept:Gene)` without separate node types.

**12 Hetionet relationship types added to schema:**

| Relationship | Direction | Meaning |
|---|---|---|
| BINDS | Drug → Gene/Protein | Pharmacodynamic target |
| TARGETS | Drug → Gene/Protein | Therapeutic target |
| UPREGULATES | Gene/Drug → BiologicalProcess/Gene | Increases activity |
| DOWNREGULATES | Gene/Drug → BiologicalProcess/Gene | Decreases activity |
| CAUSES | Gene/ClinicalFinding → Disease | Causal (not correlational) |
| ASSOCIATES | Gene/ClinicalFinding → Disease | Statistical association |
| TREATS | Drug → Disease | Curative / disease-modifying |
| PALLIATES | Drug → Disease | Symptom management (not cure) |
| PARTICIPATES_IN | Gene/Protein → Pathway/BiologicalProcess | Functional membership |
| LOCALIZES_TO | Gene/Protein → CellularComponent/Anatomy | Physical location |
| SIDE_EFFECT_OF | SideEffect → Drug | Adverse reaction |
| CONTRAINDICATES | Disease/Drug → Drug | Clinical contraindication |

### 9.4 Import Strategy: Selective at 2 Hops (Recommended)

**Decision: Selective curriculum-scoped import, NOT full Hetionet import.**

Even with Neo4j Professional (which removes the tier capacity constraint), full import is not recommended at this stage for two reasons:

**Signal-to-noise ratio.** Full Hetionet imports the complete biomedical map — dermatology gene associations, rare tropical disease pathways, obscure molecular functions MSM's curriculum will never touch. The graph goes from a tightly curated assessment intelligence system to also being a biomedical reference database. Every traversal query returns results from both knowledge systems, and Claude's context assembly must constantly filter curriculum-relevant metapaths from noise.

**Trust divergence.** Curriculum data has a clear trust lifecycle (Faculty uploads → Claude extracts → Faculty reviews → Admin verifies). Hetionet data is static, computationally derived, and has no faculty touchpoint. With selective import, every Hetionet node exists because a curriculum SubConcept triggered it — clear provenance. With full import, 60%+ of Hetionet nodes have no curriculum connection — orphaned reference data.

**The selective approach:** Import the 2-hop neighborhood of every curriculum-derived SubConcept that has a CUI match in Hetionet.

```
Curriculum SubConcept: "Lisinopril" (CUI C0065374)
  Hop 1: ACE gene, Hypertension, Heart Failure, Dry Cough, Angioedema
  Hop 2: Renin-Angiotensin pathway, Bradykinin pathway,
         other drugs that BIND ACE, other diseases ACE ASSOCIATES with
```

Two hops captures ~90% of the metapath value because most clinically relevant mechanism chains are 2-4 edges long and the curriculum SubConcept is usually at one end.

**Scale comparison:**

| Approach | Est. Nodes | Est. Relationships | Curriculum-Connected |
|---|---|---|---|
| Selective (1 hop) | ~5,000 | ~15,000 | 100% |
| **Selective (2 hops) — recommended** | **~12,000-18,000** | **~80,000-120,000** | **~95%** |
| Full import | 47,031 | 2,250,197 | ~30-40% ever touched |

### 9.5 The Selective Import Pipeline

The import is triggered by curriculum activity, not run as a bulk job. Every time new SubConcepts are approved and CUI-grounded, the pipeline re-queries Hetionet for their neighborhoods.

```
SubConcept approved + CUI resolved via LOD enrichment (§8)
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: CUI Match Check                                         │
│                                                                   │
│ Does this SubConcept's CUI appear in Hetionet?                  │
│ Use pre-built cross-reference tables:                            │
│   - CUI → DrugBank ID (for Compounds)                           │
│   - CUI → DOID (for Diseases)                                   │
│   - CUI → MeSH ID (for Symptoms)                                │
│   - CUI → GO ID (for Biological Processes)                      │
│   - CUI → Uberon ID (for Anatomy)                               │
│                                                                   │
│ If no match: stop. This SubConcept has no Hetionet presence.    │
│ If match: proceed to Hop 1.                                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Hop 1 — Direct Neighbors                                │
│                                                                   │
│ Query Hetionet for all nodes directly connected to the matched  │
│ node, across all 24 relationship types.                          │
│                                                                   │
│ Example for Lisinopril (DrugBank DB00722):                      │
│   Lisinopril -[:BINDS]-> ACE (Gene, Entrez 1636)               │
│   Lisinopril -[:TREATS]-> Hypertension (DOID:10763)            │
│   Lisinopril -[:TREATS]-> Heart Failure (DOID:6000)            │
│   Lisinopril -[:SIDE_EFFECT_OF]-> Dry Cough (CUI C0010200)    │
│   Lisinopril -[:SIDE_EFFECT_OF]-> Angioedema (CUI C0002994)   │
│   Lisinopril -[:MEMBER_OF]-> ACE Inhibitors (PharmClass)       │
│                                                                   │
│ For each neighbor: attempt CUI resolution via cross-ref tables  │
│ Check if CUI already exists in graph (curriculum SubConcept)    │
│   If CUI match → MERGE (enrich existing node with Hetionet     │
│                   edges — ONE node, TWO knowledge layers)        │
│   If no match → CREATE as ExternalEntity                         │
│                                                                   │
│ Authority: AI_AUTO                                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Hop 2 — Extended Neighborhood                            │
│                                                                   │
│ For each Hop 1 node, query ITS direct neighbors.                │
│ This completes the metapath chains.                              │
│                                                                   │
│ Example continuing from ACE gene (Hop 1):                        │
│   ACE -[:PARTICIPATES_IN]-> RAAS Pathway                        │
│   ACE -[:ASSOCIATES]-> Hypertension (already in graph)          │
│   ACE -[:UPREGULATES]-> Angiotensin II Production               │
│                                                                   │
│ Example continuing from Dry Cough (Hop 1):                       │
│   Dry Cough -[:SIDE_EFFECT_OF]-> Enalapril (same class)        │
│   Dry Cough -[:SIDE_EFFECT_OF]-> Ramipril (same class)         │
│   → Useful for distractor context: "all ACE inhibitors cause    │
│     dry cough via bradykinin accumulation"                       │
│                                                                   │
│ Same MERGE-or-CREATE logic as Hop 1.                             │
│ Authority: AI_AUTO                                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Provenance Tagging                                       │
│                                                                   │
│ Every imported node carries:                                      │
│   source: "hetionet"                                              │
│   hetionet_id: "DB00722"  (original Hetionet identifier)        │
│   import_date: datetime()                                         │
│   import_phase: "selective"                                       │
│   triggered_by: "sc_uuid_xxx" (the curriculum SubConcept        │
│                                 that triggered this import)      │
│                                                                   │
│ Every imported edge carries:                                      │
│   source: "hetionet"                                              │
│   import_date: datetime()                                         │
│                                                                   │
│ This distinguishes Hetionet knowledge from curriculum knowledge  │
│ in every query.                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 9.6 The CUI Merge Pattern

This is the architectural piece that makes Hetionet integration seamless. UMLS CUIs are the glue between curriculum-derived knowledge and Hetionet-derived knowledge.

```
Step 1: Faculty uploads lecture about Lisinopril
Step 2: Pipeline creates (:SubConcept:Drug {name: "Lisinopril"})
Step 3: LOD enrichment (§8) resolves Lisinopril → UMLS CUI C0065374
Step 4: Hetionet import finds DrugBank DB00722 (Lisinopril)
Step 5: Cross-reference table resolves DB00722 → RxNorm → same CUI C0065374
Step 6: CUI MATCH DETECTED → MERGE, don't duplicate
Step 7: Existing curriculum SubConcept enriched with Hetionet edges
```

**Result: One node, two knowledge layers.**

```cypher
// This single node now carries:

// Curriculum provenance:
(lisinopril)-[:TEACHES_VERIFIED]->(:ContentChunk)     // faculty-confirmed teaching
(lisinopril)<-[:ADDRESSED_BY]-(:SLO)                  // curriculum alignment
(lisinopril)-[:MAPS_TO]->(:USMLE_System {name: "Cardiovascular"})

// Biomedical provenance (from Hetionet):
(lisinopril)-[:BINDS]->(:ExternalEntity:Gene {name: "ACE"})
(lisinopril)-[:TREATS]->(:SubConcept:Disease {name: "Hypertension"})
(lisinopril)-[:SIDE_EFFECT_OF]->(:ExternalEntity:SideEffect {name: "Dry Cough"})
(lisinopril)-[:MEMBER_OF]->(:ExternalEntity:PharmacologicClass {name: "ACE Inhibitors"})
```

When Claude assembles generation context, it gets BOTH the lecture content (what faculty actually taught) AND the mechanistic relationships (biological ground truth).

### 9.7 Hetionet-to-UMLS LOD Mapping Coverage

Not all Hetionet node types map cleanly to UMLS. This affects the merge pattern's reliability per type:

| Hetionet Type | Native ID | UMLS Mapping Method | Coverage | Role |
|---|---|---|---|---|
| Side Effect | UMLS CUI (already) | No translation needed | 100% | Assessment-relevant |
| Symptom | MeSH ID | MeSH → UMLS direct | ~99% | Assessment-relevant |
| Compound (Drug) | DrugBank ID | DrugBank → RxNorm → CUI | ~95% | Assessment-relevant |
| Biological Process | Gene Ontology | GO → UMLS | ~90% | Metapath intermediate |
| Molecular Function | Gene Ontology | GO → UMLS | ~90% | Metapath intermediate |
| Cellular Component | Gene Ontology | GO → UMLS | ~90% | Metapath intermediate |
| Disease | Disease Ontology (DOID) | DOID xref → CUI | ~85-90% | Assessment-relevant |
| Pharmacologic Class | NDF-RT | NDF-RT → UMLS direct | ~85% | Assessment-relevant |
| Anatomy | Uberon ID | Uberon xref → CUI | ~80% | Assessment-relevant |
| Gene | Entrez Gene ID | UMLS string search | ~60% | Traversal intermediary |
| Pathway | Reactome/WikiPathways | Via GO, not direct | ~40% | Traversal intermediary |

**Key insight:** Clinically relevant types (Disease, Drug, Symptom, Side Effect, Pharmacologic Class) all map at 85%+. These are assessment targets. Traversal intermediaries (Gene, Pathway) map weakly but don't need CUIs — they serve metapath traversal, not direct assessment. A Gene's identity is its Entrez ID; UMLS grounding is a bonus, not a requirement.

### 9.8 Import-Time Resolution Workflow

Type-specific resolution for each Hetionet node during import:

```
For each Hetionet node being imported:

1. Check node type

2. If Symptom/SideEffect/BiologicalProcess/MolecularFunction/CellularComponent:
   → Direct UMLS lookup via native ID (MeSH, CUI, GO)
   → High confidence match → auto-resolve

3. If Disease:
   → Check pre-built DOID→CUI cross-reference table
   → If match: use CUI
   → If no match: UMLS string search on disease name
   → If still no match: import without CUI, flag for review

4. If Compound/Drug:
   → Check pre-built DrugBank→RxNorm→CUI cross-reference table
   → If match: use CUI
   → If no match: UMLS string search on drug name variants
   → Rarely fails for clinical drugs

5. If Anatomy:
   → Check pre-built Uberon→CUI cross-reference table
   → Fallback: UMLS string search

6. If Gene:
   → UMLS string search on gene symbol + full name
   → If match: use CUI (bonus)
   → If no match: import with Entrez ID only (acceptable)

7. If Pathway:
   → Don't force UMLS mapping
   → Import with native Reactome/WikiPathways ID
   → Link to GO BiologicalProcess nodes (which DO have CUIs)

8. For ALL resolved nodes:
   → Check if CUI already exists in graph
   → If CUI match: MERGE (Hetionet enriches existing node)
   → If no match: CREATE as ExternalEntity with {source: "hetionet"}
   → Store mapping confidence: "direct" | "cross-reference" |
     "string-match" | "unmapped"
```

### 9.9 Cross-Reference Tables

To avoid per-node UMLS API calls during import (slow and rate-limited), the system pre-builds cross-reference tables from source ontology files during system initialization:

| Table | Source File | Contents | Size |
|---|---|---|---|
| `doid_to_cui` | Disease Ontology OBO | DOID → UMLS CUI | ~137 rows |
| `drugbank_to_cui` | RxNorm release | DrugBank ID → RxNorm → CUI | ~1,500 rows |
| `go_to_cui` | UMLS Metathesaurus | GO ID → CUI | ~15,000 rows |
| `uberon_to_cui` | Uberon OBO xrefs | Uberon ID → CUI | ~400 rows |
| `mesh_to_cui` | UMLS Metathesaurus | MeSH ID → CUI | ~30,000 rows |

Stored in Supabase. During import, CUI resolution is a local table lookup, not an API call.

### 9.10 Metapath Serialization for Question Generation

When Claude generates a question, Hetionet metapaths are serialized into the generation context as structured paths:

**Without Hetionet — Claude's generation context:**
```
Target SLO: "Explain the mechanism of action of ACE inhibitors"
Content chunks: [lecture text about ACE inhibitors from MEDI-511]
SubConcept: "ACE Inhibitors" with RELATED_TO edges to "Hypertension"
```

**With Hetionet metapaths — Claude's generation context:**
```
Target SLO: "Explain the mechanism of action of ACE inhibitors"
Content chunks: [lecture text about ACE inhibitors from MEDI-511]
SubConcept: "ACE Inhibitors"

Mechanism metapath:
  ACE Inhibitors -[:BINDS]-> ACE gene
    ACE -[:PARTICIPATES_IN]-> Renin-Angiotensin-Aldosterone System
      RAAS -[:UPREGULATES]-> Angiotensin II Production
        Angiotensin II -[:CAUSES]-> Vasoconstriction, Aldosterone Secretion
          → ASSOCIATES → Hypertension, Heart Failure

Side effect metapath:
  ACE Inhibitors -[:SIDE_EFFECT_OF]-> Dry Cough
    Dry Cough -[:CAUSED_BY]-> Bradykinin Accumulation
      (ACE also degrades bradykinin; inhibiting ACE → bradykinin builds up)

Contraindication metapath:
  ACE Inhibitors -[:CONTRAINDICATES]-> Bilateral Renal Artery Stenosis

Distractor paths (alternative drug classes for same condition):
  ARBs: BINDS → AT1 receptor (different target, similar pathway)
  Beta Blockers: BINDS → Beta-adrenergic receptor (different system)
  CCBs: BINDS → L-type calcium channel (vascular smooth muscle)
  Thiazides: TARGETS → Na-Cl cotransporter (renal mechanism)
```

The graph assembles this context via hybrid RAG (§7): Graph RAG traverses the metapaths, Vector RAG retrieves the actual lecture content for each concept in the path.

### 9.11 When to Upgrade to Full Import

Selective-at-2-hops is the recommended starting point. Full Hetionet import (all 47K nodes, 2.25M relationships) becomes the right call when one of these triggers fires:

**Trigger 1: Consortium expansion.** When Howard, Meharry, and other schools join, their curricula touch different Hetionet neighborhoods than MSM's. Selective import per school becomes more complex than importing everything and letting each school's curriculum "illuminate" the relevant subgraph.

**Trigger 2: Cross-concept discovery product feature.** If you build a "what other diseases share this pathway?" exploratory tool for faculty, that requires full Hetionet because faculty are exploring *beyond* what the curriculum covers. This is a curriculum-design tool, not an assessment tool.

**Trigger 3: Selective coverage exceeds 60% of Hetionet.** When enough curriculum is ingested that the selective subgraph covers >60% of Hetionet nodes, the gap between selective and full is small enough that managing the import pipeline is more overhead than just loading everything.

**Estimated trigger timeline:** Trigger 1 (consortium) likely hits first — late 2026 or early 2027 based on the consortium roadmap.

**Migration path:** The import pipeline is designed to be re-runnable with a scope parameter. Switching from selective to full is changing one parameter:

```python
# Current: selective import
import_scope = "selective"  # 2-hop neighborhood of curriculum SubConcepts
hop_depth = 2

# Future: full import
import_scope = "full"       # all 47K nodes
hop_depth = None             # irrelevant in full mode
```

The provenance tagging, CUI merge pattern, and cross-reference tables work identically in both modes. The only difference is which Hetionet nodes enter the graph.

### 9.12 Authority Model for Hetionet Data

| Edge Type | Authority | Notes |
|---|---|---|
| All Hetionet-imported edges | AI_AUTO | No human review — these are published biomedical facts |
| CUI merge (Hetionet → existing SubConcept) | AI_AUTO | Automatic when CUI matches |
| ExternalEntity creation | AI_AUTO | New nodes for entities not in curriculum |
| Metapath inclusion in generation context | AI_VERIFIED | Claude selects relevant paths; Faculty sees which paths influenced the question in review |

**Key principle:** Hetionet edges are *context*, not *curriculum*. They enrich Claude's generation capabilities but do not determine what students are assessed on. Only curriculum-provenance edges (TEACHES_VERIFIED, ASSESSES, FULFILLS) govern assessment scope. A Faculty member reviewing a generated question can see that the question's mechanistic accuracy was informed by Hetionet metapaths, but the decision to assess that SLO came from curriculum alignment, not from Hetionet's existence.

---

## 10. The Seeding Sequence: What Happens in What Order

### Phase 0: Prerequisites

- Neo4j Aura Professional instance provisioned
- Supabase project created with pgvector extension
- UMLS API key obtained (free for education/research)
- Hetionet dataset downloaded (TSV files from https://github.com/hetio/hetionet)
- Cross-reference tables built (DOID→CUI, DrugBank→CUI, GO→CUI, Uberon→CUI, MeSH→CUI)
- Anthropic API key configured

### Phase 1: Institutional Skeleton (Admin, manual, ~1 day)

```
Action: Admin enters institutional structure via admin UI
Creates: School, Program, ProgramTrack, AcademicYear, CurricularPhase, Block, Course, Section, AcademicTerm
Count: ~65 nodes, ~75 relationships
Authority: HUMAN_ONLY throughout
Depends on: Nothing — this is the foundation
```

### Phase 2: Framework Seeding (Engineer, seed scripts, ~1 day)

```
Action: Run Cypher seed scripts from official standard documents
Creates: USMLE_System (12), USMLE_Discipline (~18), USMLE_Task (~8), ACGME_Competency (6), EPA (13), LCME_Element (~90), BloomLevel (6), MillerLevel (5)
Count: ~158 nodes, ~50 relationships
Authority: Engineer runs scripts from authoritative sources
Depends on: Phase 1 (but no edges connect yet — frameworks are standalone until ILOs map to them)
```

### Phase 3: ILO Entry + Framework Mapping (Admin, ~1-2 weeks)

```
Action: Admin enters ILOs per Course, maps each to ACGME/EPA/LCME
Creates: ILO nodes (~70-140), ILO→Framework edges
Authority: HUMAN_ONLY (ILO creation), HUMAN_APPROVED (framework mappings with Claude suggestions)
Depends on: Phase 1 (Courses exist), Phase 2 (Framework nodes exist)
```

### Phase 4: First Syllabus Ingestion (Faculty + Pipeline, ~1-2 weeks)

```
Action: Faculty uploads syllabi. Pipeline runs Stages 1-6.
Creates: Session, ContentChunk, SubConcept, SLO nodes
         TEACHES, HAS_SLO, AT_BLOOM, FROM_SESSION edges
         MAPS_TO (USMLE) edges
Authority: Mixed — see Authority Matrix
Depends on: Phase 3 (ILOs exist for FULFILLS suggestions)

Recommended starting order:
  1. MEDI 611 IPC (Type 3 — ACGME-coded, gold standard)
  2. MEDI 531/532/533 (Type 1 — one parser covers all three)
  3. MEDI 511 (Type varies — needs type detection)
```

### Phase 5: FULFILLS Mapping (Faculty + Admin, ongoing)

```
Action: Faculty maps SLOs → ILOs via F-009 drag-and-drop. Admin verifies.
Creates: FULFILLS edges (the critical bridge)
Authority: HUMAN_APPROVED
Depends on: Phase 3 (ILOs exist), Phase 4 (SLOs exist)
Note: This can happen concurrently with Phase 4 — as SLOs appear, Faculty maps them.
```

### Phase 6a: LOD Enrichment (Pipeline, automated, ~2-3 days per course)

```
Action: Pipeline queries UMLS/SNOMED/MeSH for each approved SubConcept
Creates: StandardTerm nodes, GROUNDED_IN edges
Authority: AI_AUTO (except ambiguous cases → review queue)
Depends on: Phase 4 (SubConcepts exist and are approved)
See: §8 for full LOD enrichment pipeline
```

### Phase 6b: Hetionet Selective Import (Pipeline, automated, runs after 6a)

```
Action: For each CUI-grounded SubConcept, query Hetionet for 2-hop neighborhood
Creates: ExternalEntity nodes (~12,000-18,000), Hetionet relationship edges (~80,000-120,000)
         CUI-matched nodes MERGED into existing SubConcepts (one node, two knowledge layers)
Authority: AI_AUTO (published biomedical facts, no human review)
Depends on: Phase 6a (CUI grounding required for Hetionet matching)
Trigger: Runs automatically after each batch of SubConcepts completes LOD enrichment
Re-runnable: Pipeline re-queries for new SubConcepts on each course ingestion
See: §9 for full Hetionet integration architecture
```

### Phase 7: ECD Layer (Engineer + Admin, ~1 week)

```
Action: Create ProficiencyVariable, TaskShell, EvidenceRuleTemplate nodes
Creates: Measurement infrastructure for assessment
Authority: Engineer creates templates, Admin configures per-course
Depends on: Phase 4 (SubConcepts exist to measure)
```

### Phase 8: Assessment Item Generation (Claude + Faculty, ongoing)

```
Action: Faculty configures generation specs. Claude generates questions. Faculty reviews.
Creates: AssessmentItem, Option, Rationale nodes
         ASSESSES, TARGETS, AT_BLOOM edges
Authority: HUMAN_APPROVED (every generated item reviewed before going live)
Depends on: Phases 4-7 (content, concepts, SLOs, measurement infrastructure)
Enhanced by: Phase 6b (Hetionet metapaths provide mechanism context and distractor paths)
```

### Phase 9: Student Mastery (System, ongoing)

```
Action: Students take assessments. System updates mastery state.
Creates: Student, StudentMastery, AttemptRecord nodes
         HAS_MASTERY, MEASURES, ON_ITEM edges
Authority: SYSTEM_AUTO
Depends on: Phase 8 (assessment items exist)
```

### Phase 10: Prerequisite & Inference (Claude + Faculty, ongoing)

```
Action: Claude infers prerequisite chains from curriculum order + content analysis. Faculty validates critical chains.
Creates: PREREQUISITE_OF edges between SubConcepts
Authority: AI_VERIFIED (auto-created, Faculty validates high-stakes chains)
Depends on: Phase 4 (SubConcepts exist with sufficient density)
```

---

## 11. Validation & Trust Gates

### Per-Phase Validation Queries

**After Phase 1:**
```cypher
// All courses have at least one section
MATCH (c:Course) WHERE NOT (c)<-[:HAS_COURSE]-() RETURN c.name AS orphan_course

// No disconnected nodes
MATCH (n) WHERE NOT (n)--() AND NOT n:SchemaVersion RETURN labels(n), count(n)
```

**After Phase 3:**
```cypher
// All ILOs map to at least one framework
MATCH (ilo:ILO) WHERE NOT (ilo)-[:MAPS_TO_COMPETENCY|MAPS_TO_EPA|ADDRESSES_LCME]->()
RETURN ilo.description AS unmapped_ilo
```

**After Phase 5:**
```cypher
// Orphan SLOs (no FULFILLS edge)
MATCH (slo:SLO) WHERE NOT (slo)-[:FULFILLS]->(:ILO)
RETURN slo.text AS orphan_slo, count(*) AS total

// Unfulfilled ILOs (no SLO maps to them)
MATCH (ilo:ILO) WHERE NOT (:SLO)-[:FULFILLS]->(ilo)
RETURN ilo.description AS unfulfilled_ilo

// Full coverage chain integrity
MATCH (item:AssessmentItem)-[:ASSESSES]->(slo:SLO)-[:FULFILLS]->(ilo:ILO)
RETURN count(DISTINCT item) AS items_in_chain, count(DISTINCT ilo) AS ilos_covered
```

**After Phase 6a (LOD):**
```cypher
// LOD coverage rate
MATCH (sc:SubConcept)
OPTIONAL MATCH (sc)-[:GROUNDED_IN]->(st:StandardTerm)
WITH count(sc) AS total, count(st) AS grounded
RETURN grounded, total, round(100.0 * grounded / total) AS pct_grounded
```

**After Phase 6b (Hetionet):**
```cypher
// Hetionet import coverage — how many curriculum SubConcepts got Hetionet enrichment?
MATCH (sc:SubConcept) WHERE sc.source <> "hetionet"
OPTIONAL MATCH (sc)-[r]->() WHERE r.source = "hetionet"
WITH count(DISTINCT sc) AS total_curriculum,
     count(DISTINCT CASE WHEN r IS NOT NULL THEN sc END) AS hetionet_enriched
RETURN hetionet_enriched, total_curriculum,
       round(100.0 * hetionet_enriched / total_curriculum) AS pct_enriched

// CUI merge success — how many Hetionet nodes merged with existing SubConcepts?
MATCH (sc:SubConcept) WHERE sc.source <> "hetionet"
MATCH (sc)-[r]->() WHERE r.source = "hetionet"
RETURN count(DISTINCT sc) AS merged_nodes

// Orphan ExternalEntities — Hetionet nodes with no curriculum connection within 2 hops
MATCH (ee:ExternalEntity {source: "hetionet"})
WHERE NOT (ee)-[*1..2]-(:SubConcept {source: "curriculum"})
RETURN ee.name, ee.entity_type, count(*) AS orphan_count

// Metapath availability — SubConcepts with complete mechanism chains
MATCH (sc:SubConcept:Drug)-[:BINDS]->(g)-[:PARTICIPATES_IN]->(p)-[:ASSOCIATES]->(d:SubConcept:Disease)
RETURN sc.name AS drug, d.name AS disease, count(DISTINCT p) AS pathway_count
ORDER BY pathway_count DESC
```

### The Trust Gradient

Every edge in the graph carries implicit trust based on its authority level:

```
HUMAN_ONLY       ████████████████████  100% trusted
HUMAN_APPROVED   ██████████████████    90% trusted (human saw it)
AI_VERIFIED      ████████████████      80% trusted (auto, overridable)
AI_AUTO          ██████████████        70% trusted (no human review)
SYSTEM_AUTO      ████████████████████  100% trusted (deterministic)
```

**For assessment:** Only TEACHES_VERIFIED (HUMAN_APPROVED) edges are used for question generation context, not TEACHES (AI_VERIFIED). This means a concept must have faculty-confirmed teaching evidence before it becomes fair game for exam questions.

**For compliance:** Only FULFILLS edges with `verified_by` populated count toward LCME coverage claims. Draft mappings are visible in dashboards but excluded from compliance reports.

---

## Appendix A: Node Count Projections

| Phase | Cumulative Nodes | Cumulative Relationships | Neo4j Tier Needed |
|---|---|---|---|
| 1 | ~65 | ~75 | Free |
| 2 | ~223 | ~125 | Free |
| 3 | ~363 | ~525 | Free |
| 4 | ~2,000 | ~5,000 | Free (approaching limit) |
| 5 | ~2,000 | ~8,000 | Free |
| 6a (LOD) | ~7,000 | ~12,000 | Professional |
| 6b (Hetionet selective) | ~20,000-25,000 | ~92,000-132,000 | Professional |
| 7-10 | ~90,000+ | ~320,000+ | Professional |
| Future: Full Hetionet | +47,000 | +2,250,000 | Professional (comfortable) |

## Appendix B: Key Cypher Patterns

**Coverage chain for an assessment item:**
```cypher
MATCH (item:AssessmentItem {uuid: $itemUuid})
MATCH (item)-[:ASSESSES]->(slo:SLO)-[:FULFILLS]->(ilo:ILO)
MATCH (ilo)-[:ADDRESSES_LCME]->(lcme:LCME_Element)
MATCH (item)-[:TARGETS]->(sc:SubConcept)-[:MAPS_TO]->(us:USMLE_System)
RETURN item.stem_preview, slo.text, ilo.description, lcme.element_number, us.name
```

**Student's weakest USMLE systems:**
```cypher
MATCH (s:Student {uuid: $studentUuid})-[:HAS_MASTERY]->(sm:StudentMastery)
MATCH (sm)-[:MEASURES]->(:ProficiencyVariable)-[:MEASURES]->(sc:SubConcept)
MATCH (sc)-[:MAPS_TO]->(us:USMLE_System)
WHERE sm.mastery < 0.5 AND sm.attempt_count >= 5
RETURN us.name, avg(sm.mastery) AS avg_mastery, count(sc) AS weak_concepts
ORDER BY avg_mastery ASC
```

**Hybrid RAG context assembly for question generation:**
```cypher
// Step 1: Graph RAG — find the target concept and its neighbors
MATCH (slo:SLO {uuid: $sloUuid})-[:ADDRESSED_BY]->(sc:SubConcept)
OPTIONAL MATCH (sc)-[:PREREQUISITE_OF]->(prereq:SubConcept)
OPTIONAL MATCH (sc)-[:RELATED_TO {type: 'commonly_confused'}]->(confused:SubConcept)
OPTIONAL MATCH (sc)-[:GROUNDED_IN]->(st:StandardTerm)
OPTIONAL MATCH (sc)-[:LINKED_TO]->(ext:ExternalEntity)
WITH sc, collect(DISTINCT prereq) AS prereqs, collect(DISTINCT confused) AS confusables,
     st, collect(DISTINCT ext) AS externals

// Step 2: Get content chunk pointers for vector RAG
MATCH (cc:ContentChunk)-[:TEACHES_VERIFIED]->(sc)
RETURN sc.name, sc.description, sc.lod_brief,
       [p IN prereqs | p.name] AS prerequisite_concepts,
       [c IN confusables | c.name] AS distractor_candidates,
       collect(cc.supabase_id) AS chunk_ids_for_vector_lookup,
       st.preferred_name AS standard_name, st.cui AS umls_cui
```

Then use `chunk_ids_for_vector_lookup` to fetch full text from Supabase for Claude's generation context.
