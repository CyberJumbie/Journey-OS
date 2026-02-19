# Journey OS — E2E Colab Pipeline Plan v3

**Date:** February 17, 2026  
**Purpose:** Complete architectural plan for the Colab notebook that serves as both the production seeding tool AND the regression test harness for Journey OS.  
**Institution:** Morehouse School of Medicine (MSM)  
**Vertical Slice:** MEDI 531 (Organ Systems I) → Atherosclerosis Lecture  
**Supersedes:** v2 plan (which misrouted ume.json into USMLE extraction)

---

## v2 → v3 Change Log

| Change | Why |
|---|---|
| **CRITICAL FIX:** Removed `ume.json` from USMLE extraction (Cell 1d) | `ume.json` is AAMC UME Competencies (6 domains, 49 subcompetencies for M1-M4), NOT USMLE content outline data. Feeding it into USMLE extraction was data contamination. |
| Added `UMESchema` to Section 0h | New Pydantic schema for 6 UME_Competency + 49 UME_Subcompetency nodes |
| Added Cell 1d-bis: UME Extraction | Dedicated extraction cell for ume.json → ume_seed.json |
| Added Cell 3f: Seed UME Competencies | 6 UME_Competency + 49 UME_Subcompetency + 49 HAS_SUBCOMPETENCY + 6 ALIGNS_WITH → ACGME_Domain |
| Updated Cell 3g (was 3f): ILO wiring now includes UME | ILO → MAPS_TO_UME → UME_Subcompetency added (primary fit for pre-clerkship) |
| Updated Cell 4d: SLO → UME mapping | SLOs map to UME_Subcompetency as primary competency link (ACGME via EPA bridge for residency readiness) |
| Updated all progressive questions | Q2+ now include UME subcompetency context |
| Updated all node counts | Phase 2: ~300 → ~355+; total framework nodes include 55 UME |
| Updated coverage chain | Full chain now routes through UME for curriculum assessment, ACGME for residency bridge |
| Added UME to DDL, constraints, file outputs | ume_seed.json in fixtures, UME constraints in Neo4j, ume_competencies table in Supabase |

---

## Guiding Principles

1. **The Colab is both seeder and tester.** Every cell writes production data AND proves it worked.  
2. **JSON fixtures are production artifacts.** Versioned, schema-validated, reusable across re-seeds and consortium expansion.  
3. **Progressive questions are regression tests.** If Q6 isn't materially better than Q3, the enrichment pipeline failed.  
4. **Dual embeddings throughout.** OpenAI text-embedding-3-small (1536-dim) and Voyage AI voyage-large-2 (1024-dim) stored side-by-side. Every retrieval step compares both.  
5. **Topic modeling is first-class.** Every faculty-uploaded document gets topic-modeled at document, section, and chunk granularity. Topics aggregate to course-level and institution-level profiles.  
6. **Clean as you go.** After every graph or Supabase mutation: orphan check, duplicate check, count verification.
7. **UME for now, ACGME for later.** SLOs and ILOs map to UME subcompetencies for current curriculum assessment. ACGME milestones are the residency-readiness bridge connected via EPAs and the ALIGNS_WITH edges. Both frameworks live in the graph; UME is the primary link for pre-clerkship content.

---

## Architectural Additions Since v1

### Dual Embedding Strategy

Every text that gets embedded is embedded twice. Supabase tables carry two vector columns:

```sql
-- Example: content_chunks table
embedding_openai  VECTOR(1536),   -- text-embedding-3-small
embedding_voyage  VECTOR(1024),   -- voyage-large-2
```

At every retrieval step (Vector RAG for question generation, SubConcept deduplication, SLO similarity matching), we run both embeddings and compare:
- Top-k overlap (do both retrievers find the same chunks?)
- Rank correlation (Spearman's ρ between the two ranked lists)
- Downstream quality impact (does one produce better questions?)

By Section 9, we have empirical data on which embedding model performs better for medical education content.

### Topic Modeling Architecture

Topic modeling operates at four levels, each stored differently:

```
LEVEL 1: DOCUMENT-LEVEL TOPICS
  Scope: One topic distribution per uploaded document
  Method: BERTopic on full document text (using the better-performing embedding)
  Storage: Neo4j — document node gets HAS_TOPIC → TopicCluster edges
           Supabase — topic_distributions table (document_id, topic_id, weight)
  Timing: Computed in Section 1 during document processing

LEVEL 2: SECTION/SESSION-LEVEL TOPICS  
  Scope: One topic distribution per syllabus session or lecture section
  Method: BERTopic on session/section text
  Storage: Neo4j — Session/Slide nodes get HAS_TOPIC → TopicCluster edges
           Supabase — topic_distributions table
  Timing: Computed during Sections 4 (syllabus) and 7 (lecture)

LEVEL 3: CHUNK-LEVEL TOPICS
  Scope: One topic assignment per ContentChunk
  Method: Transform from BERTopic model (predict on new chunks)
  Storage: Neo4j — ContentChunk → HAS_TOPIC → TopicCluster
           Supabase — content_chunks.topic_id, content_chunks.topic_confidence
  Timing: Computed during dual-write in Sections 4 and 7

LEVEL 4: AGGREGATE TOPICS
  Scope: Course-level and institution-level topic profiles
  Method: Weighted aggregation of document-level distributions
  Storage: Neo4j — Course → HAS_TOPIC_PROFILE → TopicProfile
           Supabase — course_topic_profiles, institution_topic_profiles
  Timing: Computed in Section 8 after all content is ingested

CROSS-REFERENCE: TOPIC ↔ USMLE ALIGNMENT
  Each TopicCluster gets Claude-labeled with:
    - Descriptive name (e.g., "Lipid Metabolism & Atherosclerosis")
    - Top representative terms
    - Suggested USMLE_System mapping (e.g., Cardiovascular + Pathology)
    - Suggested USMLE_Discipline mapping
  This enables: "Which USMLE topics have no content clusters?" (gap analysis)
```

### UME ↔ ACGME Dual Competency Framework

The graph carries both UME (undergraduate) and ACGME (graduate) competency frameworks with 6 ALIGNS_WITH bridge edges connecting them through their shared domain structure.

```
UME Layer (for current curriculum):
  UME_Competency (6) → HAS_SUBCOMPETENCY → UME_Subcompetency (49)
  
  SLO → MAPS_TO_UME → UME_Subcompetency    ← PRIMARY link for "what should 
  ILO → MAPS_TO_UME → UME_Subcompetency       students demonstrate NOW"

ACGME Layer (for residency readiness):
  ACGME_Domain (6) → HAS_SUBDOMAIN → ACGME_Subdomain (21)
  
  ILO → MAPS_TO_COMPETENCY → ACGME_Domain   ← Bridge for "where students 
  EPA → bridges to → ACGME_Domain               are HEADED"

Bridge Layer:
  UME_Competency → ALIGNS_WITH → ACGME_Domain  (6 edges, shared domain names)

Why both? UME subcompetencies tell you what students should demonstrate NOW 
(M1-M4 calibrated). ACGME milestones tell you where students are HEADED 
(residency calibrated). SLOs from pre-clerkship syllabi map naturally to UME. 
EPAs bridge to ACGME for residency readiness assessment.
```

**New Neo4j Node Types (in addition to v1):**

| Node | Properties | Created By |
|---|---|---|
| TopicCluster | uuid, name, description, representative_terms[], model_id, topic_number | BERTopic + Claude labeling |
| TopicProfile | uuid, scope (course/institution), distribution (JSON), dominant_topics[] | Aggregation pipeline |
| UME_Competency | uuid, code, name, description | Seed from ume.json |
| UME_Subcompetency | uuid, code, name, description, do_specific (bool) | Seed from ume.json |

**New Neo4j Relationships (in addition to v1):**

| Relationship | Direction | Meaning |
|---|---|---|
| HAS_TOPIC | Document/Session/Chunk → TopicCluster | This content belongs to this topic |
| HAS_TOPIC_PROFILE | Course/School → TopicProfile | Aggregate topic distribution |
| TOPIC_MAPS_TO | TopicCluster → USMLE_System | This topic aligns with this USMLE system |
| HAS_SUBCOMPETENCY | UME_Competency → UME_Subcompetency | 49 edges |
| ALIGNS_WITH | UME_Competency → ACGME_Domain | 6 edges bridging UME ↔ ACGME |
| MAPS_TO_UME | ILO/SLO → UME_Subcompetency | Primary competency mapping for pre-clerkship |

---

## Section-by-Section Plan

---

### Section 0: Configuration, Connections & Schema Contracts

Everything that every other section depends on. No data processing, just infrastructure.

```
CELL 0a: Install Dependencies
  pip install: neo4j, supabase, anthropic, openai, voyageai,
               pdfplumber, python-pptx, python-docx, mammoth,
               requests, numpy, pandas, matplotlib, seaborn, tqdm,
               bertopic, scikit-learn, hdbscan, umap-learn,
               pydantic

CELL 0b: Neo4j Aura Connection + Constraints
  Connect via driver
  Create ALL constraints (idempotent):
    - All existing constraints from v1
    - ADD: TopicCluster (uuid), TopicProfile (uuid)
    - ADD: UME_Competency (code), UME_Subcompetency (code)    ◄── NEW in v3
  Verify: connection test + constraint count

CELL 0c: Supabase Connection + DDL
  Connect via client
  DDL for ALL tables:
    - frameworks, institutional_learning_objectives
    - student_learning_objectives (embedding_openai VECTOR(1536), embedding_voyage VECTOR(1024))
    - content_chunks (embedding_openai VECTOR(1536), embedding_voyage VECTOR(1024))
    - subconcepts (embedding_openai VECTOR(1536), embedding_voyage VECTOR(1024))
    - assessment_items (embedding_openai VECTOR(1536), embedding_voyage VECTOR(1024))
    - retired_exam_items
    - quality_reports
    - topic_distributions (document_id, topic_id, weight, level)
    - course_topic_profiles
    - institution_topic_profiles
    - ume_competencies                                          ◄── NEW in v3
    - demo_users, demo_activity_log
  Verify: table list matches expected

CELL 0d: Anthropic Claude API
  Connect, test with ping
  Set CLAUDE_MODEL = "claude-sonnet-4-5-20250514"

CELL 0e: OpenAI Embedding API
  Connect, test with sample embed
  Verify: returns 1536-dim vector

CELL 0f: Voyage AI Embedding API  
  Connect, test with sample embed
  Verify: returns 1024-dim vector
  
  COMPARISON CELL: Embed "atherosclerotic plaque formation" with both
  Print: both work, dimensions confirmed

CELL 0g: UMLS API
  Connect, test with "atherosclerosis" search
  Verify: returns CUI C0004153

CELL 0h: Schema Definitions (Pydantic Models)
  
  class InstitutionalSchema(BaseModel):
      school: SchoolNode
      program: ProgramNode  
      tracks: List[TrackNode]
      academic_years: List[AcademicYearNode]
      curricular_phases: List[PhaseNode]
      blocks: List[BlockNode]
      courses: List[CourseNode]
      sections: List[SectionNode]
      academic_terms: List[TermNode]
      ilos: List[ILONode]
      demo_faculty: FacultyNode
  
  class USMLEFrameworkSchema(BaseModel):
      systems: List[USMLESystemNode]          # 18
      disciplines: List[USMLEDisciplineNode]  # 16
      tasks: List[USMLETaskNode]              # ~7
  
  class UMESchema(BaseModel):                                   ◄── NEW in v3
      competencies: List[UMECompetencyNode]   # 6
      subcompetencies: List[UMESubcompetencyNode]  # 49
      # Each subcompetency has: code, name, description, 
      # parent_competency_code, do_specific: bool
  
  class LCMESchema(BaseModel):
      standards: List[LCMEStandardNode]       # 12
      elements: List[LCMEElementNode]         # 93
  
  class ACGMESchema(BaseModel):
      domains: List[ACGMEDomainNode]          # 6
      subdomains: List[ACGMESubdomainNode]    # 21
  
  class EPABloomMillerSchema(BaseModel):
      epas: List[EPANode]                     # 13
      bloom_levels: List[BloomNode]           # 6
      miller_levels: List[MillerNode]         # 5
  
  class SyllabusExtractionSchema(BaseModel):
      sessions: List[SessionNode]
      slos: List[SLONode]
      slo_to_session_map: List[SLOSessionMapping]
      document_topics: List[TopicAssignment]
  
  class LectureExtractionSchema(BaseModel):
      slides: List[SlideNode]
      chunks: List[ChunkNode]
      subconcepts: List[SubConceptCandidate]
      document_topics: List[TopicAssignment]
  
  class AssessmentItemSchema(BaseModel):
      items: List[AssessmentItemNode]
  
  def validate_fixture(data: dict, schema: type) -> ValidationResult:
      """Validate a JSON fixture against its Pydantic schema.
      Returns: ValidationResult with .valid bool, .errors list, .warnings list"""

CELL 0i: Helper Functions
  gen_uuid(), run_query(), verify(), create_node(), create_edge()
  graph_stats(), check_orphans(), cleanup()
  claude_extract(), claude_extract_json()  
  embed_openai(text) → 1536-dim vector
  embed_voyage(text) → 1024-dim vector
  embed_dual(text) → {"openai": [...], "voyage": [...]}
  umls_search(), umls_get_crosswalks()
  topic_model_documents(texts, names) → BERTopic model + topic assignments
  compare_retrieval(query, table, top_k) → side-by-side OpenAI vs Voyage results

CELL 0j: Upload ALL Files
  Upload prompt listing every expected file
  Auto-classify by filename pattern
  Manual override option
  Print: file inventory table with name, size, type, classification
  Assert: all required files present
```

---

### Section 1: Document Processing Factory

Every source file gets loaded, parsed, extracted into schema-compliant JSON, topic-modeled, and validated. Nothing touches Neo4j or Supabase yet.

```
CELL 1a: Parse ALL Files → Raw Text

  For each uploaded file:
    PDF  → pdfplumber → page-by-page text with page numbers
    DOCX → python-docx → text with heading hierarchy preserved
    PPTX → python-pptx → per-slide: title, body text, speaker notes, slide number
    JSON → json.load → print structure summary
  
  Output: raw_texts = {
    "MSMCurriculumMDProgramChart": {"type": "pdf", "text": "...", "pages": 4},
    "Med-Catalog": {"type": "folder", "files": [...]},
    "ume": {"type": "json", "data": {...}},
    "USMLE_Content_Outline_0": {"type": "pdf", "text": "...", "pages": 28},
    "USMLE_Physician_Tasks": {"type": "pdf", "text": "...", "pages": 6},
    "LCME_Functions_Structure": {"type": "docx", "text": "...", "headings": [...]},
    "acgme-2024": {"type": "json", "data": {...}},
    "acgme-competencies": {"type": "json", "data": {...}},
    "MEDI531_LO": {"type": "docx", "text": "...", "headings": [...]},
    "MEDI531_Schedule": {"type": "docx", "text": "...", "headings": [...]},
    "Atherosclerosis_Lecture": {"type": "pptx", "slides": [...]},
    "NBME_Path_AI_Gen": {"type": "docx", "text": "..."},
    "NBME_Path_Lecture_Questions": {"type": "docx", "text": "..."},
    "Refined_Path_Questions": {"type": "docx", "text": "..."}
  }
  
  Gate: Every file parsed successfully. Print table: filename | type | chars/slides | status

CELL 1b: Document-Level Topic Modeling (ALL documents)

  Collect all document texts into a corpus:
    texts = [raw_texts[k]["text"] for k in raw_texts if "text" in raw_texts[k]]
    names = [k for k in raw_texts if "text" in raw_texts[k]]
  
  Run BERTopic:
    1. Embed all documents with BOTH models (for comparison)
    2. Fit BERTopic on the better-performing embeddings (or both, compare)
    3. Extract: topic assignments per document, topic descriptions, representative terms
  
  Claude labels each discovered topic:
    - Descriptive name
    - Suggested USMLE_System alignment
    - Suggested USMLE_Discipline alignment
    - Is this topic curriculum-content or administrative/structural?
  
  Output: document_topics dict keyed by document name
  
  Print: Topic summary table
    Topic ID | Name | Documents | USMLE System | Type
  
  Print: Document-topic heatmap (documents × topics, colored by weight)
  
  Key insight this reveals: Do the syllabus and lecture share dominant topics?
  If not, there's a curriculum alignment issue visible before any seeding.
  
  Save: document_topic_model.pkl (the fitted BERTopic model for reuse on chunks later)

CELL 1c: Institutional Extraction (Recursive Claude)

  Input: MSMCurriculumMDProgramChart.pdf text + Med-Catalog text
  Schema target: InstitutionalSchema
  
  PASS 1 — Top-level hierarchy:
    Prompt: "Extract the institutional hierarchy from this medical school catalog.
             Return JSON matching this exact schema: {InstitutionalSchema.schema_json()}
             Focus on: School name, Program, Tracks (4-year, 5-year), Academic Years (M1-M4),
             Curricular Phases, Blocks."
    Claude → JSON → partial validation
  
  PASS 2 — Course details:
    Prompt: "From this catalog text, extract all courses. For each:
             code, title, credits, type, description, grading, prerequisites.
             Focus especially on MEDI 531 (Organ Systems I).
             Here is the hierarchy from Pass 1: {pass1_result}"
    Claude → JSON → merge with Pass 1
  
  PASS 3 — MEDI 531 specifics:
    Prompt: "Extract ILOs for MEDI 531 from this catalog.
             Also extract: curriculum units within MEDI 531, 
             current section/term information for 2025-2026.
             Catalog text: {relevant_pages}
             If ILOs are not explicitly listed, extract the course learning objectives
             or program-level objectives that MEDI 531 maps to."
    Claude → JSON → merge
  
  PASS 4 — Demo faculty:
    Prompt: "Create a realistic faculty profile for a Course Director of MEDI 531 at MSM.
             Name, credentials, title, department, role. This will be used as demo data."
    Claude → JSON → merge
  
  Validate: validate_fixture(result, InstitutionalSchema)
  Save: institutional_seed.json
  Print: Summary — node counts per type, validation status

CELL 1d: USMLE Framework Extraction (PDFs ONLY — no ume.json)    ◄── FIXED in v3

  Input: USMLE_Content_Outline_0.pdf + USMLE_Physician_Tasks_Competencies.pdf
  Schema target: USMLEFrameworkSchema
  
  ⚠️  ume.json is NOT used here. It contains AAMC UME Competencies, 
      not USMLE content outline data. See Cell 1d-bis for UME extraction.
  
  PASS 1 — Extract Systems + Disciplines from Content Outline PDF:
    Prompt: "Extract ALL USMLE Step 1 organ systems and disciplines from this 
             content description document.
             
             Systems are the body systems tested (e.g., Cardiovascular, Respiratory, 
             Renal/Urinary, etc.). There should be approximately 18.
             
             Disciplines are the scientific approaches (e.g., Pathology, Pharmacology,
             Physiology, Biochemistry, etc.). There should be approximately 16.
             
             Return JSON matching: {USMLEFrameworkSchema.schema_json()}
             PDF text: {usmle_outline_text[:40000]}"
    Claude → JSON with systems + disciplines
  
  PASS 2 — Extract Tasks from Physician Tasks PDF:
    Prompt: "Extract ALL physician tasks/competencies from this USMLE document.
             These are the clinical task categories tested (e.g., 'Health Maintenance',
             'Mechanisms of Disease', 'Diagnosis', 'Management', etc.).
             There should be approximately 7.
             Return as JSON array matching: {USMLETaskNode.schema_json()}
             PDF text: {tasks_pdf_text}"
    Claude → JSON tasks
  
  PASS 3 — Merge and validate:
    Combine systems + disciplines + tasks
    Deduplicate by code
  
  Validate: validate_fixture(result, USMLEFrameworkSchema)
  Verify: ~18 systems, ~16 disciplines, ~7 tasks (warn if counts differ significantly)
  Save: usmle_seed.json

CELL 1d-bis: UME Competency Extraction (from ume.json)           ◄── NEW in v3

  Input: ume.json (already structured JSON from AAMC)
  Schema target: UMESchema
  
  This is the simplest extraction — the source is already machine-readable.
  
  PASS 1 — Load and inspect ume.json:
    Load JSON, print structure summary
    Expected: 6 competency domains, 49 subcompetencies (45 standard + 4 DO-specific)
    Verify top-level keys and structure
  
  PASS 2 — Restructure into canonical schema:
    Map ume.json fields to UMESchema:
      - Each competency domain → UMECompetencyNode
        Properties: code, name, description
      - Each subcompetency → UMESubcompetencyNode
        Properties: code, name, description, parent_competency_code, do_specific (bool)
    
    If ume.json is already close to the schema, this is a direct mapping.
    If not, Claude restructures:
      Prompt: "Restructure this AAMC UME competency data into the following schema.
               Preserve ALL 49 subcompetencies. Flag which ones have do_specific: true.
               Source data: {ume_json}
               Target schema: {UMESchema.schema_json()}"
  
  PASS 3 — Cross-reference with ACGME domains:
    For each UME_Competency, identify the matching ACGME_Domain code:
      Professionalism → acgme_professionalism
      Patient Care and Procedural Skills → acgme_patient_care
      Medical Knowledge → acgme_medical_knowledge
      Practice-Based Learning and Improvement → acgme_pbli
      Interpersonal and Communication Skills → acgme_ics
      Systems-Based Practice → acgme_sbp
    
    Store these as aligns_with_acgme_code on each UME_Competency
    (Used in Section 3 to create ALIGNS_WITH edges after ACGME is seeded)
  
  Validate: validate_fixture(result, UMESchema)
  Verify: exactly 6 competencies, exactly 49 subcompetencies, 4 DO-specific flagged
  
  Print: Subcompetency distribution table:
    | UME Domain                            | Subcompetencies | DO-Specific |
    |---------------------------------------|-----------------|-------------|
    | Professionalism                        | 11              | 1           |
    | Patient Care and Procedural Skills     | 13              | 2           |
    | Medical Knowledge                      | 6               | 1           |
    | Practice-Based Learning and Improvement| 5               | 0           |
    | Interpersonal and Communication Skills | 6               | 0           |
    | Systems-Based Practice                 | 8               | 0           |
    | TOTAL                                  | 49              | 4           |
  
  Save: ume_seed.json

CELL 1e: LCME Extraction (Recursive Claude on Large DOCX)

  Input: 2026-27-Functions-and-StructureLCME.docx text
  Schema target: LCMESchema
  
  This document is large (~100+ pages). Process recursively:
  
  PASS 1 — Standard identification:
    Prompt: "Identify ALL 12 LCME standards from this document.
             Return: standard number, standard title.
             Do NOT extract elements yet — just the 12 top-level standards."
    Claude → 12 standards
  
  PASSES 2-13 — Per-standard element extraction:
    For each standard:
      Prompt: "From this document section about Standard {n}: {standard_name},
               extract every element. Each element has:
               - element_number (e.g., '7.1', '7.2')
               - title
               - description (the full narrative text)
               - annotations (if any supplemental guidance exists)
               Document section: {relevant_text_chunk}"
      Claude → elements for this standard
  
  PASS 14 — Assemble + deduplicate:
    Merge all 12 passes, check for duplicates, verify element numbering
  
  Validate: validate_fixture(result, LCMESchema)
  Verify: exactly 12 standards, ~93 elements (warn if ≠93)
  Save: lcme_seed.json

CELL 1f: ACGME Extraction (Merge Existing JSONs)

  Input: acgme-2024.json + acgme-competencies.json
  Schema target: ACGMESchema
  
  PASS 1 — Load and inspect both JSONs
  PASS 2 — Claude reconciles into canonical format:
    Prompt: "Merge these two ACGME data sources into a single structure.
             Target: 6 domains (Patient Care, Medical Knowledge, SBP, PBLI, 
             Professionalism, ICS) each with their subdomains/milestones.
             Source 1: {acgme_2024_summary}
             Source 2: {acgme_competencies_summary}
             Return JSON matching: {ACGMESchema.schema_json()}"
  
  Validate: validate_fixture(result, ACGMESchema)
  Verify: 6 domains, ~21 subdomains
  Save: acgme_seed.json

CELL 1g: EPA + Bloom + Miller (Claude from Knowledge, Cross-Checked)

  Schema target: EPABloomMillerSchema
  
  Prompt: "Generate the complete reference data for:
           1. AAMC Core EPAs for Entering Residency (all 13, with descriptions)
           2. Revised Bloom's Taxonomy (6 levels: Remember through Create, with action verbs)
           3. Miller's Pyramid (5 levels: Knows through Does, with descriptions)
           Return JSON matching: {EPABloomMillerSchema.schema_json()}"
  
  Validate: validate_fixture(result, EPABloomMillerSchema)
  Verify: 13 EPAs, 6 Bloom, 5 Miller
  Save: epa_bloom_miller_seed.json

CELL 1h: Syllabus Processing — DUAL APPROACH

  Input: MEDI531_LO.docx text + MEDI531_Schedule.docx text
  Schema target: SyllabusExtractionSchema
  
  ═══ APPROACH A: TYPE DETECTION FIRST ═══
  
  PASS A1 — Classify LO document:
    Prompt: "Classify this medical education syllabus into one of these types:
             Type 1: Objectives-Based (numbered LO lists per session/week)
             Type 2: Course Overview (high-level structure, minimal detail)
             Type 3: ACGME-Coded (explicit competency codes like 1.a, 2.b)
             Type 4: Clinical Dense (case-heavy, embedded objectives)
             Type 5: Mixed (some structured, some narrative)
             Type 6: Minimal (very sparse, mostly administrative)
             
             Document: {lo_text[:20000]}
             
             Return: {type, confidence, reasoning, recommended_extraction_strategy}"
  
  PASS A2 — Classify Schedule document (same prompt)
  
  PASS A3 — Type-specific extraction:
    Based on detected types, use type-specific prompts.
    E.g., if Type 1: "Extract numbered learning objectives, grouped by week/unit"
    E.g., if Type 3: "Extract ACGME-coded objectives with code + description"
  
  Save: syllabus_typed_extraction.json
  
  ═══ APPROACH B: RAW EXTRACTION (TYPE-AGNOSTIC) ═══
  
  PASS B1 — Extract SLOs from LO document:
    Prompt: "Extract EVERY learning objective from this syllabus.
             For each, return:
             - text: the exact objective text
             - bloom_verb: the primary action verb
             - inferred_bloom_level: 1-6
             - week_or_unit: which week/unit this belongs to (if determinable)
             - confidence: how sure you are this is a distinct learning objective
             
             Be exhaustive. If something looks like it MIGHT be an objective, include it
             with lower confidence.
             
             Document: {lo_text}"
  
  PASS B2 — Extract Sessions from Schedule document:
    Prompt: "Extract EVERY teaching session from this schedule syllabus.
             For each, return:
             - title: session/topic name
             - week: week number
             - session_type: lecture|lab|small_group|clinical|TBL|PBL|other
             - faculty: instructor name(s) if listed
             - date: if listed
             - topics: key topics covered
             - duration_hours: if listed
             
             Document: {schedule_text}"
  
  PASS B3 — Cross-map SLOs to Sessions:
    Prompt: "Map these SLOs to these Sessions based on topic alignment.
             SLOs: {slo_list}
             Sessions: {session_list}
             
             For each SLO, return the most likely session it belongs to,
             with a confidence score. An SLO can map to multiple sessions
             if it spans multiple weeks."
  
  Save: syllabus_raw_extraction.json
  
  ═══ COMPARISON ═══
  
  Print side-by-side:
    - Type detection results (what types were detected?)
    - SLO count: Approach A vs Approach B
    - Session count: Approach A vs Approach B
    - SLO-Session mapping overlap
    - Any SLOs found by one approach but not the other
  
  ═══ MERGE BEST OF BOTH ═══
  
  Claude evaluates: "Given these two extraction approaches and their results,
                     produce the best combined extraction. Prefer Approach B's 
                     exhaustiveness for SLO count, but use Approach A's type-awareness
                     for structural organization."
  
  Session-level topic modeling:
    For each extracted session, run the fitted BERTopic model (from Cell 1b)
    on the session's combined text (SLO texts + topic description)
    Assign topic clusters at session level
  
  Validate: validate_fixture(merged, SyllabusExtractionSchema)
  Verify: SLO count seems reasonable for a semester course (~50-150)
  Save: medi531_syllabus_seed.json

CELL 1i: Lecture Processing (PPTX)

  Input: Pathogenesis of Atherosclerosis 2024.pptx (already parsed as slides)
  Schema target: LectureExtractionSchema
  
  PASS 1 — Slide-level extraction:
    For each slide: title, body text, speaker notes, image descriptions
    One chunk = one slide (text + speaker notes combined)
  
  PASS 2 — Claude enriches per-chunk:
    For each chunk (batched, ~5 slides per Claude call):
      Prompt: "For each lecture slide below, extract:
               - subconcept_candidates: medical concepts taught
                 (name, description, semantic_type: Disease|Drug|Pathway|etc.)
               - usmle_system: which USMLE system this aligns to
               - usmle_discipline: which discipline
               - key_terms: terms suitable for UMLS/LOD grounding
               - teaching_depth: Definition|Mechanism|Example|ClinicalApplication
               
               Slide {n}: {slide_text + speaker_notes}"
  
  PASS 3 — Slide-level topic modeling:
    Run fitted BERTopic model on each slide's text
    Assign topic clusters at slide level
  
  PASS 4 — Deduplication check:
    Compare extracted SubConcept candidates against syllabus SubConcepts
    Flag duplicates with cosine similarity > 0.92
  
  Validate: validate_fixture(result, LectureExtractionSchema)
  Verify: slide count matches PPTX, every slide has ≥1 SubConcept candidate
  Save: atherosclerosis_lecture_seed.json

CELL 1j: Existing Question Processing

  Input: NBME_Path_AI_Gen.docx + NBME_Path_Lecture_Questions.docx + Refined_Path_Questions.docx
  Schema target: AssessmentItemSchema
  
  For each document:
    PASS 1 — Claude extracts individual questions:
      "Extract every MCQ from this document. For each:
       - vignette (clinical stem, if present)
       - lead_in (the actual question)
       - options (A through E, with text)
       - correct_answer (letter)
       - explanation (if present)
       - source_document: {filename}"
    
    PASS 2 — Claude tags each question:
      "For each extracted question, determine:
       - usmle_system, usmle_discipline
       - bloom_level (1-6)
       - difficulty_band (easy|medium|hard)
       - key_concepts (SubConcept names this question targets)"
  
  Validate: validate_fixture(result, AssessmentItemSchema)
  Save: existing_questions_seed.json

CELL 1k: ═══ MASTER VALIDATION GATE ═══

  Print summary table:
  
  | Fixture                        | File Size | Node Count | Validation | Topics |
  |-------------------------------|-----------|------------|------------|--------|
  | institutional_seed.json        | XX KB     | ~35-65     | ✅/❌       | N/A    |
  | usmle_seed.json               | XX KB     | ~41        | ✅/❌       | N/A    |
  | ume_seed.json                 | XX KB     | ~55        | ✅/❌       | N/A    | ◄── NEW
  | lcme_seed.json                | XX KB     | ~105       | ✅/❌       | N/A    |
  | acgme_seed.json               | XX KB     | ~27        | ✅/❌       | N/A    |
  | epa_bloom_miller_seed.json    | XX KB     | ~24        | ✅/❌       | N/A    |
  | medi531_syllabus_seed.json    | XX KB     | ~200-600   | ✅/❌       | ✅     |
  | atherosclerosis_lecture_seed  | XX KB     | ~30-60     | ✅/❌       | ✅     |
  | existing_questions_seed.json  | XX KB     | ~30-80     | ✅/❌       | N/A    |
  | document_topic_model.pkl      | XX KB     | N/A        | ✅/❌       | ✅     |
  
  ASSERT: ALL rows show ✅ validation
  
  Save all fixtures to Colab /content/fixtures/ directory
  Print: "Section 1 complete. All production fixtures validated. Ready to seed."
```

---

### Section 2: Institutional Skeleton Seeding

```
CELL 2a: Load institutional_seed.json

CELL 2b: Seed Neo4j — Full Hierarchy
  School → HAS_PROGRAM → Program
  Program → HAS_TRACK → ProgramTrack (4-year, 5-year)
  Program → HAS_YEAR → AcademicYear (M1, M2, M3, M4)
  AcademicYear → HAS_PHASE → CurricularPhase
  CurricularPhase → HAS_BLOCK → Block
  Block → HAS_COURSE → Course (MEDI 531 + prereqs)
  Course → HAS_SECTION → Section
  Section → OFFERED_IN → AcademicTerm

CELL 2c: Seed ILOs for MEDI 531
  Course → HAS_ILO → ILO (one per extracted ILO)

CELL 2d: Supabase Sync
  Mirror institutional records into relational tables

CELL 2e: Cleanup & Gate
  graph_stats()
  check_orphans()
  Verify counts match JSON fixture exactly
  
  🔍 GATE: ~35-65 nodes, ~50-75 rels, zero orphans

CELL 2f: 🧪 PROGRESSIVE QUESTION TEST #1 — Institutional Only
  
  Available context: Course name, description, ILO texts, year/phase
  
  Claude prompt:
    "You are generating an NBME-style single-best-answer question.
     You have ONLY the following information about this course:
     
     Course: {course.name} ({course.code})
     Description: {course.description}
     Year: {year.name}, Phase: {phase.name}
     
     Institutional Learning Objectives:
     {ilo_texts}
     
     Generate ONE question. Note: you have no specific content,
     no USMLE mapping, no competency mapping, no concept details.
     Do your best with what you have.
     
     Return JSON: {AssessmentItemSchema.item_schema()}"
  
  Save: progressive_q1.json
  Print: The question with annotation:
    "⚠️ CONTEXT LEVEL: Institutional only
     Missing: USMLE coordinates, UME competencies, specific concepts,
              content grounding, LOD enrichment, mechanism pathways, lecture content"
```

---

### Section 3: Framework Seeding

```
CELL 3a: Load all framework JSONs                                ◄── UPDATED in v3
  Load: usmle_seed.json, ume_seed.json, lcme_seed.json, 
        acgme_seed.json, epa_bloom_miller_seed.json

CELL 3b: Seed USMLE
  USMLE_System nodes (18) + USMLE_Discipline nodes (16) + USMLE_Task nodes (~7)
  Internal relationships: System ↔ Discipline blueprint matrix

CELL 3c: Seed LCME
  LCME_Standard nodes (12) → HAS_ELEMENT → LCME_Element nodes (93)

CELL 3d: Seed ACGME
  ACGME_Domain nodes (6) → HAS_SUBDOMAIN → ACGME_Subdomain nodes (21)

CELL 3e: Seed EPA + Bloom + Miller
  EPA nodes (13)
  BloomLevel nodes (6) with NEXT_LEVEL ordering
  MillerLevel nodes (5) with NEXT_LEVEL ordering

CELL 3f: Seed UME Competencies                                  ◄── NEW in v3
  
  UME_Competency nodes (6):
    CREATE (:UME_Competency {code: $code, name: $name, description: $desc})
    for each of the 6 domains
  
  UME_Subcompetency nodes (49):
    CREATE (:UME_Subcompetency {
      code: $code, name: $name, description: $desc, 
      do_specific: $do_specific
    })
    for each of the 49 subcompetencies (4 flagged do_specific: true)
  
  HAS_SUBCOMPETENCY edges (49):
    MATCH (c:UME_Competency {code: $parent_code})
    MATCH (s:UME_Subcompetency {code: $sub_code})
    CREATE (c)-[:HAS_SUBCOMPETENCY]->(s)
  
  ALIGNS_WITH bridge edges (6):                                  ◄── KEY BRIDGE
    MATCH (u:UME_Competency {code: $ume_code})
    MATCH (a:ACGME_Domain {code: $acgme_code})
    CREATE (u)-[:ALIGNS_WITH]->(a)
    
    Mapping (from ume_seed.json cross-reference):
      ume_professionalism      → acgme_professionalism
      ume_patient_care         → acgme_patient_care
      ume_medical_knowledge    → acgme_medical_knowledge
      ume_pbli                 → acgme_pbli
      ume_ics                  → acgme_ics
      ume_sbp                  → acgme_sbp
  
  Supabase: ume_competencies table populated
  
  Print: UME seeding summary
    6 competencies, 49 subcompetencies (4 DO-specific), 
    49 HAS_SUBCOMPETENCY edges, 6 ALIGNS_WITH → ACGME bridges

CELL 3g: Wire ILO → Framework Mappings                          ◄── UPDATED in v3
  For each ILO:
    Claude suggests:
      MAPS_TO_COMPETENCY → ACGME_Domain (with confidence %)
      MAPS_TO_EPA → EPA (with confidence %)
      ADDRESSES_LCME → LCME_Element (with confidence %)
      MAPS_TO_UME → UME_Subcompetency (with confidence %)          ◄── NEW
    
    The UME mapping prompt:
      "For this Institutional Learning Objective from a pre-clerkship medical course,
       identify the most relevant AAMC UME subcompetencies.
       
       ILO: {ilo.text}
       Course: MEDI 531 (Organ Systems I), M1 year, Pre-clerkship phase
       
       Available UME Subcompetencies:
       {ume_subcompetency_list_with_descriptions}
       
       Return the top 1-3 matches with confidence scores.
       Note: UME subcompetencies are calibrated for medical students (not residents),
       so these should be a natural fit for pre-clerkship ILOs."
    
  Auto-approve all (this is production seeding, not the review UI)
  Log: every mapping with confidence score
  
  Print: ILO → Framework wiring summary
    ILO code | ACGME | UME | EPA | LCME | Bloom

CELL 3h: Supabase Sync — framework reference tables

CELL 3i: Cleanup & Gate                                          ◄── UPDATED in v3
  Framework count verification:
    USMLE_System: 18, Discipline: 16, Task: ~7
    UME_Competency: 6, UME_Subcompetency: 49                      ◄── NEW check
    LCME_Standard: 12, Element: 93
    ACGME_Domain: 6, Subdomain: 21
    EPA: 13, Bloom: 6, Miller: 5
    ALIGNS_WITH edges: exactly 6 (UME → ACGME bridge)             ◄── NEW check
  All ILOs mapped to ≥1 framework node
  All ILOs mapped to ≥1 UME_Subcompetency                         ◄── NEW check
  
  🔍 GATE: ~255-355 total nodes, framework counts exact, 
           ILOs fully wired including UME, 6 ALIGNS_WITH bridges exist

CELL 3j: 🧪 PROGRESSIVE QUESTION TEST #2 — With Frameworks      ◄── UPDATED in v3
  
  Available context: ILO + ACGME + UME subcompetency + USMLE system + Bloom + EPA + LCME
  
  Claude prompt:
    "Generate an NBME-style question for this ILO.
     You now have comprehensive framework alignment:
     
     ILO: {ilo.text}
     
     UME Subcompetency (what students should demonstrate NOW):         ◄── NEW
       {ume_subcompetency.name}: {ume_subcompetency.description}
     
     ACGME Domain (where students are HEADED):
       {acgme.name} — {acgme.description}
     
     USMLE System: {usmle_system.name}
     Target Bloom Level: {bloom.name} ({bloom.level})
     LCME Element: {lcme.element_number}: {lcme.description}
     EPA: {epa.description}
     
     The question should:
     - Be appropriate for the USMLE system
     - Target the Bloom level
     - Assess the UME subcompetency (pre-clerkship calibration)
     - Still no specific content — use your general medical knowledge."
  
  Save: progressive_q2.json
  Compare: Print Q1 and Q2 side by side
    Highlight: What did framework alignment add?
    (Expected: right organ system, appropriate cognitive level, UME-calibrated 
     for pre-clerkship student, still generic clinically)
```

---

### Section 4: MEDI 531 Syllabus Ingestion

```
CELL 4a: Load medi531_syllabus_seed.json

CELL 4b: Seed Sessions → Neo4j
  Session nodes with: title, week, session_type, faculty
  Session → PART_OF → Section
  Session → HAS_TYPE → SessionType (if SessionType nodes exist)

CELL 4c: Seed SLOs → Neo4j
  SLO nodes with: text, bloom_verb, bloom_level, confidence
  Session → HAS_SLO → SLO
  SLO → AT_BLOOM → BloomLevel

CELL 4d: FULFILLS Bridge + UME Mapping                           ◄── UPDATED in v3
  
  For each SLO, TWO mapping operations:
  
  OPERATION 1 — FULFILLS → ILO:
    Claude: "Match this SLO to the most appropriate ILO(s).
             SLO: {slo.text}
             Available ILOs: {ilo_list}
             Return: [{ilo_code, confidence, reasoning}]"
    Create FULFILLS edges (auto-approve ≥ 0.7, flag < 0.7)
  
  OPERATION 2 — MAPS_TO_UME → UME_Subcompetency:                 ◄── NEW
    Claude: "For this Session Learning Objective from a pre-clerkship course,
             identify the most relevant AAMC UME subcompetencies.
             
             SLO: {slo.text}
             Bloom level: {slo.bloom_level}
             Course: MEDI 531 (Organ Systems I), M1 year
             
             Available UME Subcompetencies:
             {ume_subcompetency_list}
             
             Return the top 1-2 matches with confidence scores.
             SLOs are granular session-level objectives, so they typically
             map to 1-2 specific subcompetencies."
    Create MAPS_TO_UME edges (auto-approve ≥ 0.7)
  
  Log: mapping table with both FULFILLS and UME mappings

CELL 4e: Extract SubConcepts from SLOs
  Batch SLOs to Claude:
    "For each SLO, extract the medical SubConcepts it addresses.
     For each SubConcept:
     - name, description, semantic_type (Disease|Drug|Pathway|etc.)
     - usmle_system, usmle_discipline (from the USMLE blueprint)
     - confidence
     
     SLOs: {slo_batch}
     USMLE Systems: {system_list}
     USMLE Disciplines: {discipline_list}"
  
  Deduplication: embed each SubConcept name with BOTH models,
    check cosine similarity against existing SubConcepts
    If > 0.92: reuse existing, add ADDRESSED_BY edge
    If ≤ 0.92: create new SubConcept

CELL 4f: Seed SubConcepts → Neo4j + Supabase
  SubConcept nodes with: name, description, semantic_type, multi-labels
  ADDRESSED_BY: SLO → SubConcept
  MAPS_TO: SubConcept → USMLE_System
  MAPS_TO: SubConcept → USMLE_Discipline
  Supabase: subconcepts table with dual embeddings

CELL 4g: Concept Hierarchy
  Claude groups SubConcepts into parent Concepts
  Create: Domain → HAS_CONCEPT → Concept → HAS_SUBCONCEPT → SubConcept

CELL 4h: Session-Level Topic Assignment
  For each session, run BERTopic predict on session text
  Create: Session → HAS_TOPIC → TopicCluster edges
  Verify: topic assignments align with USMLE mappings

CELL 4i: Cleanup & Gate                                          ◄── UPDATED in v3
  Orphan SLOs (no FULFILLS → ILO): list and count
  Unfulfilled ILOs (no SLO → FULFILLS): list and count
  SLOs without UME mapping: list and count                         ◄── NEW check
  SubConcepts without USMLE mapping: list and count
  
  Coverage chain check (partial — no ContentChunks yet):
    SLO → FULFILLS → ILO → MAPS_TO_COMPETENCY → ACGME ✅
    SLO → MAPS_TO_UME → UME_Subcompetency → ALIGNS_WITH → ACGME ✅  ◄── NEW chain
    SLO → ADDRESSED_BY → SubConcept → MAPS_TO → USMLE ✅
    ContentChunk → TEACHES → SubConcept ❌ (expected — lecture not loaded yet)
  
  🔍 GATE: SLOs created, FULFILLS wired, UME mapped, 
           SubConcepts with USMLE, topic assignments present

CELL 4j: 🧪 PROGRESSIVE QUESTION TEST #3 — With Syllabus/SLOs   ◄── UPDATED in v3
  
  Pick an SLO related to atherosclerosis
  Available context: SLO text + SubConcepts + USMLE + Bloom + UME subcompetency
  
  Claude prompt:
    "Generate an NBME-style question targeting this specific SLO.
     
     SLO: {slo.text}
     Bloom Level: {bloom.name}
     
     UME Subcompetency:                                              ◄── NEW
       {ume_sub.name}: {ume_sub.description}
     
     SubConcepts addressed:
       {subconcept_list_with_descriptions}
     USMLE System: {system}, Discipline: {discipline}
     
     The question must:
     - Assess the specific SubConcepts listed
     - Be appropriate for the UME subcompetency level (pre-clerkship)
     - Use appropriate clinical vignette format for the Bloom level"
  
  Save: progressive_q3.json
  Compare: Q1 → Q2 → Q3 side by side
    Highlight: Concept specificity jump + UME-calibrated assessment level
```

---

### Section 5: LOD Enrichment

```
CELL 5a: UMLS CUI Resolution
  For each SubConcept:
    Query UMLS API: search by name + semantic_type
    If 1 clear match: auto-resolve CUI
    If >1 ambiguous: Claude disambiguates using SubConcept description + context
    If 0 results: flag as LOD_UNRESOLVED
  Rate limit: batch with 0.1s delay between calls
  Log: resolved/ambiguous/unresolved counts

CELL 5b: Cross-Ontology Enrichment
  For each resolved CUI:
    Pull SNOMED CT, MeSH, ICD-10 via UMLS crosswalks API
    Store all codes

CELL 5c: Create StandardTerm Nodes + GROUNDED_IN Edges
  Neo4j: MERGE StandardTerm by CUI (idempotent)
  Properties: cui, preferred_name, snomed_id, mesh_id, icd10_code, source_vocabulary
  Edge: SubConcept → GROUNDED_IN → StandardTerm

CELL 5d: LOD Brief Generation
  Claude batch:
    "For each of these medically-grounded SubConcepts, generate a ~200-token
     LOD brief summarizing: UMLS definition, SNOMED parent concepts,
     key relationships, differential concepts.
     
     SubConcepts with CUI data: {subconcept_lod_batch}"
  
  Store LOD briefs as SubConcept.lod_brief property in Neo4j
  Also store in Supabase subconcepts table

CELL 5e: Supabase Sync — StandardTerm records, update SubConcepts with CUI/SNOMED

CELL 5f: Cleanup & Gate
  LOD coverage: {grounded}/{total} = {pct}% (target ≥ 70%)
  Crosswalk counts: SNOMED, MeSH, ICD-10
  Zero duplicate StandardTerms
  
  🔍 GATE: LOD coverage ≥ 70%, no duplicates, LOD briefs populated

CELL 5g: 🧪 PROGRESSIVE QUESTION TEST #4 — With LOD
  
  Same SLO as Q3
  Added context: LOD briefs for each SubConcept (UMLS definitions, SNOMED hierarchy)
  
  Claude prompt:
    "Generate an NBME-style question. You now have standardized medical terminology:
     
     SLO: {slo.text}
     UME Subcompetency: {ume_sub.name}
     SubConcepts with LOD:
       {subconcept_name}: {lod_brief}
       ...
     
     Use precise medical terminology from the LOD briefs.
     Consider SNOMED parent/child concepts for distractor generation."
  
  Save: progressive_q4.json
  Compare: Q3 vs Q4
    Highlight: Terminology precision, distractor quality from SNOMED neighbors
```

---

### Section 6: Hetionet Selective Import

```
CELL 6a: Download & Load Hetionet
  Download nodes.tsv + edges.tsv from GitHub
  Load into pandas DataFrames
  Build cross-reference tables in memory:
    doid_to_cui, drugbank_to_cui, go_to_cui, uberon_to_cui, mesh_to_cui
  Print: Hetionet stats (47K nodes, 2.25M edges, type distribution)

CELL 6b: CUI Match Check
  For each CUI-grounded SubConcept:
    Check if CUI appears in any cross-reference table
    Log: matched/unmatched counts per SubConcept type

CELL 6c: Hop 1 — Direct Neighbors
  For each matched SubConcept:
    Query Hetionet edges DataFrame for all direct connections
    For each neighbor:
      Attempt CUI resolution via cross-ref tables
      If CUI matches existing graph SubConcept → MERGE (enrich, don't duplicate)
      If no match → CREATE as ExternalEntity with {source: "hetionet"}
    Create relationship edges with Hetionet type (BINDS, TREATS, ASSOCIATES, etc.)
  
  Provenance: every node gets source="hetionet", import_date, triggered_by

CELL 6d: Hop 2 — Extended Neighborhood
  For each Hop 1 node:
    Query Hetionet edges for ITS direct connections
    Same MERGE-or-CREATE logic
    Same provenance tagging
  
  Print: Hop 1 vs Hop 2 import stats

CELL 6e: Provenance & Multi-Label Tagging
  Add multi-labels to SubConcepts based on Hetionet type:
    Disease, Drug, Gene, Pathway, Anatomy, etc.
  Verify: multi-labels assigned correctly

CELL 6f: Neo4j Cleanup
  Orphan ExternalEntities (no curriculum connection within 2 hops)
  Metapath availability check

CELL 6g: Supabase Sync

  🔍 GATE: ExternalEntity count, merge count, zero orphan ExternalEntities,
           ≥1 complete metapath available

CELL 6h: 🧪 PROGRESSIVE QUESTION TEST #5 — With Hetionet
  
  Same SLO as Q3-Q4
  Added context: Hetionet metapaths serialized
  
  Claude prompt:
    "Generate an NBME-style question. You now have biomedical mechanism data:
     
     SLO: {slo.text}
     UME Subcompetency: {ume_sub.name}
     SubConcepts with LOD: {lod_data}
     
     Mechanism Metapaths:
       {serialized_metapaths}
     
     Distractor Paths (alternative mechanisms):
       {distractor_metapaths}
     
     Use the mechanism metapaths to create a question about mechanism of action.
     Use the distractor paths to create plausible wrong answers from related 
     but distinct mechanisms."
  
  Save: progressive_q5.json
  Compare: Q4 vs Q5
    Highlight: Mechanism depth, distractor quality from related drug classes
```

---

### Section 7: Atherosclerosis Lecture Ingestion

```
CELL 7a: Load atherosclerosis_lecture_seed.json

CELL 7b: Create Slide + ContentChunk Nodes
  Neo4j (skinny): ContentChunk with uuid, supabase_id, source_type, course_id, chunk_index
  Supabase (fat): content_chunks with full text, heading_context, dual embeddings
  Slide nodes: slide_number, title, has_speaker_notes

CELL 7c: Wire Structural Edges
  ContentChunk → FROM_SESSION → Session (the atherosclerosis session)
  ContentChunk → FROM_COURSE → Course (MEDI 531)
  Slide → PART_OF → Session

CELL 7d: Wire TEACHES Edges
  Match each chunk's extracted SubConcepts against existing graph:
    If SubConcept exists → create TEACHES edge
    If new SubConcept → create node + TEACHES edge + USMLE mapping
  
  Properties on TEACHES: confidence, coverage_type, mapping_source

CELL 7e: Promote TEACHES → TEACHES_VERIFIED
  Simulate faculty review: for high-confidence TEACHES edges (≥ 0.85),
  create corresponding TEACHES_VERIFIED edges
  Log: which edges were promoted, which remain AI_VERIFIED only

CELL 7f: Chunk-Level Topic Assignment
  Run fitted BERTopic model on each chunk
  Create: ContentChunk → HAS_TOPIC → TopicCluster
  Verify: topic coherence with slide content

CELL 7g: LOD Enrichment for NEW SubConcepts
  Reuse Section 5 pipeline for any SubConcepts created from lecture
  that weren't already in the syllabus extraction

CELL 7h: Hetionet Enrichment for NEW CUI-Grounded SubConcepts
  Reuse Section 6 pipeline for newly CUI-grounded SubConcepts

CELL 7i: Cleanup & Gate                                          ◄── UPDATED in v3
  Slide count matches PPTX
  All chunks connected (no orphan ContentChunks)
  TEACHES_VERIFIED coverage
  
  FULL COVERAGE CHAIN NOW COMPLETE (dual competency path):
    
    Curriculum assessment path (UME):
      ContentChunk → TEACHES_VERIFIED → SubConcept ← ADDRESSED_BY ← SLO 
        → MAPS_TO_UME → UME_Subcompetency → (parent) UME_Competency
        → ALIGNS_WITH → ACGME_Domain
    
    Institutional compliance path:
      SLO → FULFILLS → ILO → MAPS_TO_COMPETENCY → ACGME_Domain
      SLO → FULFILLS → ILO → ADDRESSES_LCME → LCME_Element
    
    USMLE alignment:
      SubConcept → MAPS_TO → USMLE_System
  
  Print: The complete chain for one assessment-ready path
  
  🔍 GATE: Full chain exists (both paths), slide count correct, all chunks connected

CELL 7j: 🧪 PROGRESSIVE QUESTION TEST #6 — Full Pipeline (THE PAYOFF)
  
  Same SLO, but now with TEACHES_VERIFIED content chunks from the actual lecture
  
  HYBRID RAG:
    Step 1 (Graph RAG): SLO → SubConcepts → prerequisites, RELATED_TO, 
                        Hetionet metapaths, LOD briefs
                        SLO → UME_Subcompetency (competency calibration)
    Step 2 (Vector RAG): For each SubConcept, fetch top-3 content chunks
                         from Supabase using BOTH embeddings (compare results)
    Step 3 (Context Assembly): Graph structure + chunk text + LOD + metapaths + UME
  
  Claude prompt:
    "Generate an NBME-style question using this complete context.
     
     SLO: {slo.text}
     Bloom Level: {bloom}
     UME Subcompetency: {ume_sub.name} — {ume_sub.description}
     
     TEACHING CONTENT (from faculty's actual lecture):
       {chunk_texts_from_verified_teaches}
     
     CONCEPT DETAIL:
       {subconcept_descriptions_with_lod}
     
     MECHANISM METAPATHS:
       {hetionet_metapaths}
     
     DISTRACTOR PATHS:
       {distractor_metapaths}
     
     REQUIREMENTS:
     - Question must be grounded in the teaching content provided
     - Clinical vignette appropriate for {bloom} level
     - Calibrated for pre-clerkship student per UME subcompetency
     - Distractors from related mechanisms (use distractor paths)
     - Correct answer traceable to specific lecture content"
  
  Save: progressive_q6.json
  
  EMBEDDING COMPARISON:
    Did OpenAI and Voyage retrieve the same chunks?
    Print: top-5 chunks from each, overlap count, rank correlation
  
  Compare: Full Q1→Q6 progression table
```

---

### Section 8: Assessment Generation, Question Import & Demo Setup

```
CELL 8a: Generate 5 Questions Across Different SLOs
  For each: full pipeline context (hybrid RAG + UME calibration)
  For each: save complete provenance (chunks, SubConcepts, metapaths, SLO, ILO, UME)
  Store in Neo4j + Supabase as AssessmentItem nodes

CELL 8b: Import Existing Faculty Questions
  Load existing_questions_seed.json
  Create RetiredExamItem nodes in Neo4j
  Claude auto-tags: ASSESSES → SLO, TARGETS → SubConcept, AT_BLOOM → BloomLevel
  Also tag: MAPS_TO_UME → UME_Subcompetency (via SLO→UME path)      ◄── NEW
  Store in Supabase

CELL 8c: Quality Comparison
  For each generated question AND each existing question:
    Claude evaluates against NBME criteria:
      - Structural (stem clarity, option formatting, single best answer)
      - Content (clinical accuracy, appropriate difficulty, concept alignment)
      - Educational (Bloom alignment, UME competency alignment, distractor plausibility)
    Score: 0-100 with breakdown
  
  Side-by-side table: generated vs faculty-authored vs refined

CELL 8d: Aggregate Topic Profiles
  Course-level: aggregate all document/session/chunk topics for MEDI 531
  Institution-level: aggregate across all loaded content
  Create: Course → HAS_TOPIC_PROFILE → TopicProfile
          School → HAS_TOPIC_PROFILE → TopicProfile
  
  Topic ↔ USMLE gap analysis:
    Which USMLE systems have rich topic coverage?
    Which have sparse or zero coverage?
    Print: USMLE system × topic cluster heatmap
  
  Topic ↔ UME gap analysis:                                       ◄── NEW
    Which UME subcompetencies have SLO coverage?
    Which have zero SLOs mapping to them?
    Print: UME subcompetency coverage table

CELL 8e: Demo Institution Setup
  
  CREATE demo faculty user:
    {name, credentials, title: "Course Director", department, role}
    Assigned to: MEDI 531
    Teaching: Atherosclerosis session
  
  CREATE activity log (simulating production workflow):
    1. Faculty uploaded Atherosclerosis PPTX → upload record
    2. Faculty uploaded LO syllabus → upload record
    3. Faculty uploaded Session Schedule → upload record
    4. Faculty reviewed 3 TEACHES → TEACHES_VERIFIED promotions → verification records
    5. Faculty approved 5 SLO → ILO FULFILLS mappings → approval records
    6. Faculty approved 5 SLO → UME_Subcompetency mappings → approval records  ◄── NEW
    7. Faculty generated 5 questions → generation records
    8. Faculty reviewed 3, approved 2 → review records with status
  
  SET assessment item statuses:
    2 items: review_status = "approved" (exam-ready)
    1 item: review_status = "in_review" (seen, not approved)
    2 items: review_status = "draft" (generated, awaiting review)
  
  Neo4j: Faculty → TEACHES_COURSE → Course
         Faculty → TEACHES_SESSION → Session (atherosclerosis)
         Faculty → GENERATED → AssessmentItem (for generated items)
         Faculty → REVIEWED → AssessmentItem (for reviewed items)
         Faculty → UPLOADED → Resource (for uploaded files)

CELL 8f: Supabase Final Sync

CELL 8g: Final Cleanup Pass
  Complete orphan check across ALL node types
  Duplicate check
  Coverage chain integrity (both UME and ACGME paths)
  
  🔍 FINAL GATE:
    Complete graph_stats() with counts per node type and relationship type
    Layer connectivity audit (L1→L2→L3→L4→L5)
    Zero orphans
    Demo user fully wired
    UME coverage: X/49 subcompetencies have ≥1 SLO mapping              ◄── NEW
```

---

### Section 9: The Progressive Enrichment Story + Final Analytics

```
CELL 9a: Progressive Question Gallery
  
  Load Q1 through Q6
  Print sequentially with annotations:
  
  ┌─────────────────────────────────────────────────────────────────────┐
  │ Q1: INSTITUTIONAL ONLY                                              │
  │ Context: Course name + ILOs                                         │
  │ Quality: ★☆☆☆☆ — Generic, could be any med school's question      │
  │ Missing: USMLE, UME, concepts, content, LOD, mechanisms, lectures   │
  ├─────────────────────────────────────────────────────────────────────┤
  │ Q2: + FRAMEWORKS (USMLE + UME + ACGME + LCME + Bloom + EPA)       │  ◄── UPDATED
  │ Context: + UME subcompetency + ACGME + USMLE system + Bloom       │
  │ Quality: ★★☆☆☆ — Right system, pre-clerkship calibrated, generic │
  │ Added: USMLE targeting, UME-calibrated difficulty, Bloom stem      │
  ├─────────────────────────────────────────────────────────────────────┤
  │ Q3: + SYLLABUS / SLOs                                              │
  │ Context: + SLO text + SubConcepts + UME mapping + USMLE coords    │
  │ Quality: ★★★☆☆ — Clinically specific, competency-aligned          │
  │ Added: Concept specificity, SLO→UME assessment calibration         │
  ├─────────────────────────────────────────────────────────────────────┤
  │ Q4: + LOD ENRICHMENT                                               │
  │ Context: + UMLS definitions + SNOMED hierarchy + LOD briefs        │
  │ Quality: ★★★★☆ — Precise terminology, better distractors          │
  │ Added: Medical vocabulary precision, SNOMED-informed options        │
  ├─────────────────────────────────────────────────────────────────────┤
  │ Q5: + HETIONET METAPATHS                                           │
  │ Context: + Drug→Gene→Pathway→Disease mechanism chains              │
  │ Quality: ★★★★☆ — Mechanism-based, pathway-aware distractors       │
  │ Added: Biological mechanism depth, related-class distractors        │
  ├─────────────────────────────────────────────────────────────────────┤
  │ Q6: + LECTURE CONTENT (FULL PIPELINE)                              │
  │ Context: + Actual lecture slides + speaker notes via TEACHES        │
  │ Quality: ★★★★★ — Grounded in what was taught, full provenance     │
  │ Added: Content fidelity, faculty-specific teaching emphasis         │
  └─────────────────────────────────────────────────────────────────────┘

CELL 9b: Embedding Model Comparison Report
  
  Across all retrieval operations in Sections 4-7:
    - Total queries run: N
    - Top-5 overlap rate: OpenAI vs Voyage
    - Rank correlation (Spearman's ρ)
    - Question quality impact
  
  Recommendation: which model to use in production

CELL 9c: Topic Model Report
  
  Document-level, session-level, course-level, institution-level reports
  Topic ↔ USMLE alignment heatmap
  Topic ↔ UME coverage analysis                                    ◄── NEW

CELL 9d: Full Provenance Chain for Q6                              ◄── UPDATED in v3
  
  Print the complete trace:
    "This question was generated from:
     SLO: {slo.text}
       which FULFILLS ILO: {ilo.text}
       which MAPS_TO_COMPETENCY ACGME: {acgme.name}
       which ADDRESSES LCME: {lcme.element_number}
     
     SLO also MAPS_TO_UME:                                          ◄── NEW
       UME Subcompetency: {ume_sub.name}
       UME Domain: {ume_comp.name}
       ALIGNS_WITH ACGME: {acgme.name} (confirmed via bridge)
     
     Targeting SubConcept: {sc.name}
       CUI: {sc.cui}, SNOMED: {sc.snomed_id}
       USMLE System: {system}, Discipline: {discipline}
       LOD Brief: {sc.lod_brief}
     
     Content grounded in:
       Lecture: Pathogenesis of Atherosclerosis 2024.pptx
       Slide {n}: {slide_title}
       Teaching evidence: TEACHES_VERIFIED (confidence: 0.93)
       Verified by: {faculty.name}
     
     Mechanism context from Hetionet:
       {metapath_chain}
     
     Distractor sources:
       Option B: {distractor_1_metapath}
       Option C: {distractor_2_metapath}
       Option D: {distractor_3_metapath}
     
     Topic cluster: {topic.name} (weight: 0.78)
     Bloom level: {bloom} (matches SLO target)"

CELL 9e: Final Graph Statistics
  
  Complete node/relationship inventory including UME counts

CELL 9f: Export Production Artifacts
  
  Save to /content/production/:
    - All JSON fixtures (versioned, including ume_seed.json)
    - Progressive questions Q1-Q6
    - Quality comparison report
    - Topic model (pickle)
    - Embedding comparison report
    - Complete graph statistics
    - Demo user configuration
  
  Print: "Production seeding complete. Graph ready for application layer."
```

---

## New Supabase DDL Summary

```sql
-- ═══ DUAL EMBEDDING COLUMNS (added to all content tables) ═══

-- content_chunks
embedding_openai  VECTOR(1536),
embedding_voyage  VECTOR(1024),
topic_id TEXT,
topic_confidence FLOAT;

-- subconcepts  
embedding_openai VECTOR(1536),
embedding_voyage VECTOR(1024),
lod_brief TEXT;

-- student_learning_objectives
embedding_openai VECTOR(1536),
embedding_voyage VECTOR(1024);

-- assessment_items
embedding_openai VECTOR(1536),
embedding_voyage VECTOR(1024);

-- ═══ NEW TABLES ═══

CREATE TABLE IF NOT EXISTS ume_competencies (                    ◄── NEW in v3
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    level TEXT NOT NULL,            -- 'competency' | 'subcompetency'
    parent_code TEXT,               -- NULL for competencies, competency code for subs
    do_specific BOOLEAN DEFAULT false,
    acgme_bridge_code TEXT,         -- matching ACGME domain code (competency level only)
    neo4j_uuid TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topic_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    topic_name TEXT,
    weight FLOAT NOT NULL,
    model_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_topic_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code TEXT NOT NULL,
    distribution JSONB NOT NULL,
    dominant_topics TEXT[],
    usmle_coverage JSONB,
    ume_coverage JSONB,                                          ◄── NEW in v3
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS institution_topic_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_uuid TEXT NOT NULL,
    distribution JSONB NOT NULL,
    dominant_topics TEXT[],
    usmle_coverage JSONB,
    ume_coverage JSONB,                                          ◄── NEW in v3
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS demo_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    credentials TEXT,
    title TEXT,
    department TEXT,
    role TEXT NOT NULL,
    assigned_courses TEXT[],
    assigned_sessions TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS demo_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES demo_users(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Neo4j Constraints Addition (v3)

```cypher
-- Added in v3:
CREATE CONSTRAINT IF NOT EXISTS FOR (n:UME_Competency) REQUIRE n.code IS UNIQUE
CREATE CONSTRAINT IF NOT EXISTS FOR (n:UME_Subcompetency) REQUIRE n.code IS UNIQUE
```

---

## API Keys Required (Colab Secrets)

| Secret Name | Service | Free Tier? | Needed For |
|---|---|---|---|
| NEO4J_URI | Neo4j Aura | Professional ($65/mo) | Graph storage |
| NEO4J_USER | Neo4j Aura | — | — |
| NEO4J_PASSWORD | Neo4j Aura | — | — |
| SUPABASE_URL | Supabase | Free tier works | Relational + vector storage |
| SUPABASE_SERVICE_KEY | Supabase | — | — |
| ANTHROPIC_API_KEY | Anthropic | Pay per token | Claude extraction + generation |
| OPENAI_API_KEY | OpenAI | Pay per token | text-embedding-3-small |
| VOYAGE_API_KEY | Voyage AI | Free tier (50M tokens) | voyage-large-2 |
| UMLS_API_KEY | NLM/UMLS | Free (academic) | LOD enrichment |

---

## Estimated Token Costs (Anthropic)

| Section | Claude Calls | Est. Input Tokens | Est. Output Tokens | Est. Cost |
|---|---|---|---|---|
| 1 (Document Factory) | ~45-65 | ~520K | ~210K | ~$5-9 |
| 2 (Institutional seed) | 1 (Q1) | ~2K | ~1K | <$0.01 |
| 3 (Framework seed + UME) | ~8 (ILO mapping incl. UME + Q2) | ~30K | ~15K | ~$0.30 |
| 4 (Syllabus + UME mapping) | ~20-25 | ~120K | ~60K | ~$1.50-2.50 |
| 5 (LOD enrichment) | ~10 | ~30K | ~15K | ~$0.30 |
| 6 (Hetionet) | 1 (Q5) | ~5K | ~2K | ~$0.05 |
| 7 (Lecture ingestion) | ~10-15 | ~50K | ~25K | ~$0.50 |
| 8 (Generation + demo) | ~15-20 | ~100K | ~50K | ~$1-2 |
| **TOTAL** | **~110-150** | **~860K** | **~380K** | **~$9-15** |

---

## File Outputs (Saved to Colab /content/)

```
/content/fixtures/
  institutional_seed.json
  usmle_seed.json
  ume_seed.json                     ◄── NEW in v3
  lcme_seed.json
  acgme_seed.json
  epa_bloom_miller_seed.json
  medi531_syllabus_seed.json
  atherosclerosis_lecture_seed.json
  existing_questions_seed.json

/content/models/
  document_topic_model.pkl
  embedding_comparison.json

/content/progressive_questions/
  progressive_q1_institutional.json
  progressive_q2_frameworks.json
  progressive_q3_syllabus.json
  progressive_q4_lod.json
  progressive_q5_hetionet.json
  progressive_q6_full_pipeline.json

/content/reports/
  quality_comparison.json
  embedding_comparison.json
  topic_model_report.json
  provenance_chain_q6.json
  final_graph_stats.json
  ume_coverage_report.json          ◄── NEW in v3
```

---

## Node Count Progression by Section (v3 corrected)

| After Section | Cumulative Nodes | Cumulative Rels | Key Milestone |
|---|---|---|---|
| 2 (Institutional) | ~35-65 | ~50-75 | Skeleton + ILOs |
| 3 (Frameworks) | ~310-370 | ~560-640 | All 8 framework families incl. UME, ILOs wired |
| 4 (Syllabus) | ~600-1,000 | ~2,000-4,000 | Sessions + SLOs + SubConcepts + UME mappings |
| 5 (LOD) | ~800-1,500 | ~3,000-5,500 | StandardTerms + GROUNDED_IN |
| 6 (Hetionet) | ~2,000-5,000 | ~15,000-40,000 | ExternalEntities + metapaths |
| 7 (Lecture) | ~2,050-5,100 | ~15,200-40,500 | ContentChunks + TEACHES_VERIFIED |
| 8 (Assessment + demo) | ~2,100-5,200 | ~15,500-41,000 | AssessmentItems + demo user |

*Note: Hetionet is the biggest node count jump. Lecture adds relatively few nodes but completes the coverage chain.*
