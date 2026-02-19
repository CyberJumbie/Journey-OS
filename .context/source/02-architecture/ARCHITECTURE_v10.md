# Journey OS — System Architecture v10.0

**Project:** Journey OS  
**Institution:** Morehouse School of Medicine (MSM)  
**Schema Version:** 10.0  
**Date:** February 19, 2026  
**Status:** Definitive reference — supersedes all prior architecture documents (v9.0–v9.3)  
**Reconciliation:** All conflicts resolved per Reconciliation Tracker (R-001 through R-041)  
**Informed by:** Bhagwat (AI Agents), Negro et al. (Knowledge Graphs & LLMs), Gift & Deza (Practical MLOps), Tunstall et al. (NLP with Transformers), Bengfort et al. (Applied Text Analysis), Mislevy et al. (ECD), Toulmin (Argumentation), Haladyna et al. (NBME Item Writing)

---

## Document Changelog (v9.3 → v10.0)

| Change | Reconciliation | Description |
|--------|---------------|-------------|
| **Institutional hierarchy restored** | R-007 | 8-level deep hierarchy: School → Program → ProgramTrack → AcademicYear → CurricularPhase → Block → Course → Section + AcademicTerm, ILO. Models MSM catalog reality. |
| **Node labels standardized** | R-004 | SCREAMING_SNAKE for multi-word acronym-prefixed labels (`USMLE_System`). PascalCase for single-concept labels (`SubConcept`). |
| **Typed relationships restored** | R-010 | `MAPS_TO_COMPETENCY`, `AT_BLOOM`, `ADDRESSES_LCME`, etc. replace single `ALIGNS_TO`. Self-documenting Cypher, distinct authority levels per relationship. |
| **ILO/SLO split restored** | R-019 | Separate `ILO` and `SLO` node types. Different authority models, lifecycle, creation flows. `FULFILLS` bridges SLO → ILO. |
| **USMLE_Topic added** | R-008 | ~200 granular content-outline entries below USMLE_System. Enables precise gap detection. |
| **UME framework added** | R-005, R-034 | 6 `UME_Competency` + 49 `UME_Subcompetency` nodes for pre-clerkship mapping. |
| **Embedding standardized 1024-dim** | R-001 | Voyage AI voyage-large-2 (1024-dim) primary. Dual embedding (+ OpenAI 1536) is Colab evaluation only. |
| **Dedup thresholds clarified** | R-002 | 0.92 for SubConcept dedup. 0.85/0.95 two-tier for question dedup. |
| **Assessment dual-link** | R-027 | Items link to both SLO (`:ASSESSES`) and SubConcept (`:TARGETS`). |
| **Coverage chain branching** | R-009 | Dual terminus: LCME_Element (accreditation) and ACGME_Domain/UME_Subcompetency (competency). |
| **StandardTerm + GROUNDED_IN** | R-026 | LOD enrichment creates StandardTerm nodes, not just properties. |
| **Surface colors aligned** | R-016 | Design spec canonical: Cream `#f5f3ef`, Parchment `#faf9f6`. |
| **§9–17 inlined** | R-022 | All sections now present in this document. No external references to v9.2. |
| **Pipeline: 11 gen + 3 review** | R-003 | graph_writer confirmed in generation pipeline. |
| **Node count: 37 Tier 0** | R-017, R-037 | Canonical node type registry with tier assignments. |

---

## 1. What Journey OS Does

Journey OS is an AI-powered educational operating system for medical schools. It solves three interconnected problems, each powered by the same underlying knowledge graph.

**Job 1 — Assessment Automation.** Faculty upload syllabi and lectures. The system extracts concepts, maps them to the USMLE blueprint and eight educational frameworks, identifies coverage gaps, and generates validated NBME-style questions through a multi-stage Evidence-Centered Design pipeline. Faculty shift from authoring (30–60 min per question) to curating (100+ questions per hour reviewed).

**Job 2 — Accreditation Compliance.** Every course, learning objective, assessment item, and framework mapping lives in the knowledge graph. LCME compliance reports are graph traversals, not narrative assembly. Evidence generation is programmatic.

**Job 3 — Precision Advising.** A "digital twin" of each student's knowledge state tracks mastery per concept with Bayesian inference. The prerequisite graph identifies root-cause gaps, not surface failures. At-risk students are flagged 2–4 weeks before failure with specific remediation paths.

**Design philosophy: Workflows, not autonomous agents.** Journey OS explicitly rejects the "autonomous agent" pattern in favor of structured generation workflows. Autonomous loops create auditability gaps and hallucination risks unacceptable in medical education. The AI acts as a tool for faculty, not an automated content farm.

---

## 2. Four-Layer Hybrid Data Architecture

| Layer | Technology | Owns | Does Not Own |
|-------|-----------|------|-------------|
| **Structure & Semantics** | Neo4j Aura | Institutional hierarchy, concept hierarchies, framework mappings, prerequisite chains, competency alignments, student mastery graphs, content-to-concept provenance (skinny ContentChunk nodes) | Full text, embeddings, file storage, auth |
| **Content & Transactions** | Supabase PostgreSQL | Question text, content chunk full text, syllabus content, auth, audit logs, review workflows, generation logs, psychometric data, WORM raw upload store, notifications, Toulmin JSONB | Graph traversals, framework alignment queries |
| **Similarity & Search** | pgvector (in Supabase PostgreSQL — same database, not a separate store) | Content chunk embeddings (1024-dim, Voyage AI voyage-large-2), question embeddings, concept embeddings. Powers: question dedup (0.85 flag / 0.95 auto-reject), SubConcept dedup (0.92 threshold), Agentic RAG retrieval, concept similarity. All vectors co-located with their source rows. | Structural relationships, graph traversals, transactional state |
| **Generation & Intelligence** | Claude (Opus/Sonnet/Haiku) | Question generation, concept extraction, competency tagging, validation, clinical reasoning, automated quality scoring | Persistent storage |

**Theoretical grounding:** GraphRAG — Knowledge Graphs provide structural constraints that shape what the LLM can produce, not just context.

**Skinny Node Principle:** Neo4j nodes stay under 100 bytes. Supabase holds full text, embeddings, files.

### 2.1 Vector Storage Architecture

Vectors live in Supabase PostgreSQL via the pgvector extension. There is no separate vector database.

| Table | Embedding Source | Dimensions | Index | Used By |
|-------|-----------------|-----------|-------|---------|
| `content_chunk_embeddings` | Voyage AI voyage-large-2 | 1024 | HNSW | Agentic RAG retrieval, content dedup |
| `question_embeddings` | Voyage AI voyage-large-2 | 1024 | HNSW | Question dedup (0.85 flag / 0.95 auto-reject) |
| `concept_embeddings` | Voyage AI voyage-large-2 | 1024 | HNSW | SubConcept dedup (0.92), related concept discovery |

**Deduplication thresholds (two contexts):**

| Context | Threshold | Behavior |
|---------|-----------|----------|
| **SubConcept dedup** (ingestion) | 0.92 single | ≥ 0.92 → merge (reuse existing SubConcept, add TEACHES edge). < 0.92 → create new. Binary decision, no review queue. |
| **Question dedup** (generation) | 0.85 flag / 0.95 reject | 0.85–0.95 → flag for faculty review (similar but possibly distinct). ≥ 0.95 → auto-reject (near-identical). < 0.85 → pass. |

**Why not a dedicated vector DB (Pinecone, Weaviate, etc.)?**

- **Scale:** <100K vectors at Tier 1. pgvector handles millions.
- **Co-location:** Embedding rows reference `content_chunks.id` and `assessment_items.id` directly. No cross-service joins.
- **Simplicity:** One fewer service to deploy, monitor, and pay for.
- **Upgrade path:** If pgvector becomes a bottleneck at scale (>5M vectors), migrate to pgvector on dedicated Supabase compute or an external store. The embedding table schema doesn't change.

**Embedding pipeline:**

```
Upload → Parse → Chunk (800 tokens, 100-token overlap) → Voyage AI embed (1024-dim)
  → INSERT content_chunk_embeddings (vector, chunk_id, metadata)
```

Embeddings are generated during content ingestion (Pipeline A, Stage 4) and during question creation (graph_writer node). They are never generated at query time.

**Colab evaluation note:** The E2E Colab notebook runs dual embeddings (OpenAI 1536 + Voyage 1024) side-by-side to empirically compare retrieval quality for medical education content. Production uses only Voyage 1024. If evaluation shows OpenAI outperforms, switch the production column. The schema doesn't change — only the model and dimension.

**Dual storage for ContentChunks:**

```
Supabase: content_chunks table     Neo4j: (:ContentChunk) skinny node
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ id (uuid)                    │   │ id (same uuid)               │
│ text (500-800 tokens)        │   │ source_type                  │
│ metadata (JSONB)             │   │ chunk_index                  │
│ lecture_id / syllabus_id     │   │ lecture_id                   │
│ graph_node_id ──────────────────→│ word_count                   │
│ sync_status                  │   └──────────────────────────────┘
│ created_at                   │
└──────────────────────────────┘   Relationships:
                                   -[:EXTRACTED_FROM]-> Lecture|Syllabus
content_chunk_embeddings           -[:TEACHES]-> SubConcept (unverified)
┌──────────────────────────────┐   -[:TEACHES_VERIFIED]-> SubConcept
│ chunk_id (FK → content_chunks)│
│ embedding (vector 1024)      │
│ model_version                │
└──────────────────────────────┘
```

Full text and embeddings live in Supabase. The Neo4j node exists solely for graph traversal (provenance, coverage chain). `sync_status` column tracks dual-write state ("pending" → "synced").

---

## 3. Application Stack

### 3.1 Architecture

| Component | Technology | Role |
|-----------|-----------|------|
| **Frontend** | Next.js 15 + React 19 + CopilotKit | App Router. Split-screen workbench UI, CopilotChat, agent state panel. No backend logic. |
| **Backend App Server** | Node.js + Express | REST API, Socket.io server, CopilotKit Runtime, auth middleware, LangGraph.js host |
| **Agent Streaming** | SSE (native AG-UI) | CopilotKit Runtime streams AG-UI events to frontend via Server-Sent Events |
| **Collaboration Transport** | Socket.io (on Express) | Rooms, presence, notifications, multi-user observation |
| **Agent-UI Protocol** | AG-UI (CopilotKit) | Standardized agent state events: STATE_DELTA, TEXT_MESSAGE, TOOL_CALL, interrupts |
| **Agent Orchestration** | LangGraph.js (on Express) | Stateful generation graph with human-in-the-loop interrupts. TypeScript. |
| **Batch / Psychometrics** | Python (FastAPI) | IRT calibration (NumPy/SciPy), GNN training (PyTorch Geometric), bulk import, knowledge distillation |
| **Background Workers** | Inngest | Batch generation orchestration, content ingestion pipeline, scheduled jobs |
| **Knowledge Graph** | Neo4j Aura | Structure, semantics, traversal |
| **Database + Vectors** | Supabase PostgreSQL + pgvector | Content, auth, transactions, embeddings (1024-dim), WORM store, notifications |
| **AI Models** | Claude Haiku / Sonnet / Opus | Model routing by task complexity |
| **File Storage** | Supabase Storage | Raw uploads (WORM), processed content, profile avatars |
| **Auth** | Supabase Auth + JWT | Role-based access, Row-Level Security |

### 3.2 Why This Split

| Concern | Node.js (Express) | Python (FastAPI) |
|---------|-------------------|-----------------|
| LLM generation pipeline | ✅ I/O bound, LangGraph.js native | ❌ Unnecessary hop, added latency |
| Socket.io / real-time | ✅ Native | ❌ Not native |
| CopilotKit Runtime | ✅ First-class JS SDK | 🟡 Python SDK exists but adds service boundary |
| AG-UI event streaming | ✅ SSE native in Express | ❌ Would require proxy |
| Psychometrics (IRT) | ❌ No NumPy/SciPy | ✅ Native ecosystem |
| GNN training | ❌ No PyTorch | ✅ PyTorch Geometric |
| Team debugging | ✅ Same language as frontend | 🟡 Context switch |

### 3.3 Frontend Stack

| Concern | Technology | Notes |
|---------|-----------|-------|
| **Framework** | Next.js 15 (App Router) | File-based routing, middleware for auth guards |
| **UI Primitives** | Radix UI | Headless, accessible |
| **Styled Components** | shadcn/ui | Tailwind-styled, in `packages/ui` |
| **Forms** | React Hook Form 7.x | Multi-step wizards, validation |
| **Charts** | Recharts 2.x | USMLE heatmaps, IRT curves, mastery trends |
| **Graph Visualization** | D3.js 7+ | Concept coverage map (force-directed) |
| **Animation** | Framer Motion 12.x | Pipeline progress, transitions |
| **State** | React Context + hooks | Local UI state. Server state via React Query / SWR. |
| **Agent UI** | CopilotKit (`CopilotChat`, `useCoAgent`, `useCopilotAction`) | Split-screen workbench, AG-UI event consumption, frontend tools |

### 3.4 Design System

**3-Layer Surface Model (hex values from DESIGN_SPEC.md — canonical):**

| Layer | Surface | Background | Use |
|-------|---------|-----------|-----|
| 1 | Cream | `#f5f3ef` | Page background, "desk surface" |
| 2 | White | `#ffffff` | Cards, primary reading areas, content focus, workbench panels |
| 3 | Parchment | `#faf9f6` | Nested elements inside white cards, inputs, table headers |
| Inverted | Navy Deep | `#002c76` | Hero sections, emphasis areas (max 1 per page) |

**The One Rule:** Cards always contrast their parent surface. Cream → White → Parchment. No exceptions. See DESIGN_SPEC.md for full application.

**Typography:** Lora (serif headings), Source Sans 3 (body), DM Mono (labels/meta, uppercase).

**Color Palette:** Navy deep `#002c76` (primary), blue mid `#2b71b9` (accents/links), green `#69a338` (success/approved).

**Navigation:** Collapsible sidebar (72px → 240px on hover). Lucide icons. Role-based menu items.

### 3.5 Dual Real-Time Layer: SSE + Socket.io

AG-UI and Socket.io serve different concerns and coexist on the same Express server.

| Concern | Technology | Transport | Examples |
|---------|-----------|-----------|---------|
| Agent state streaming | AG-UI (CopilotKit) | **SSE** (native) | `STATE_DELTA` patches update question preview, `TEXT_MESSAGE` streams to chat, `TOOL_CALL` shows pipeline progress |
| Human-in-the-loop | AG-UI interrupts | **SSE** | LangGraph pauses → CopilotKit renders approval UI → faculty responds |
| Bulk item progress | AG-UI | **SSE** | Per-item STATE_DELTA patches update bulk_queue[i] status |
| Rooms & presence | Socket.io | **WebSocket** | Faculty joins `gen:session_abc`; multiple observers watch generation |
| Notifications | Socket.io | **WebSocket** | Real-time push to bell icon for generation complete, review needed, alerts |
| Batch complete | Socket.io | **WebSocket** | Inngest pushes "batch finished" notification to batch room |

**Why not Socket.io for everything?** AG-UI's native transport is SSE. CopilotKit expects SSE. Wrapping AG-UI events in Socket.io would add complexity and latency for zero benefit. Socket.io handles what SSE can't: bidirectional multi-user communication.

**Protocol stack:**

| Layer | Protocol | What It Does |
|-------|----------|-------------|
| Agent ↔ Tools/Data | MCP (Anthropic) | LangGraph accesses Neo4j, Supabase, UMLS via structured tools |
| Agent ↔ Agent | A2A (Google) | Future: multi-agent coordination |
| Agent ↔ User | AG-UI (CopilotKit) over SSE | Agent state rendering in split-screen UI |
| Collaboration | Socket.io | Rooms, presence, notifications, multi-user observation |

### 3.6 MCP for Standardized Tool Access

| MCP Server | Exposed Tools | Used By |
|-----------|--------------|---------|
| **Neo4j MCP Server** | `find_prerequisites`, `get_student_mastery`, `query_coverage`, `get_framework_alignment`, `query_knowledge_graph` | Context Compiler, Gap Detector, Adaptive Selector |
| **Supabase MCP Server** | `get_question_text`, `save_result`, `get_content_chunks`, `log_generation`, `semantic_search` | Vignette Builder, Graph Writer, Dedup Detector |

### 3.7 Monorepo Structure

```
journey-os/
├── apps/
│   ├── web/                          # Next.js 15 (App Router) — faculty + admin
│   │   ├── app/
│   │   │   ├── (auth)/               # Login, register, forgot-password, reset-password
│   │   │   ├── (faculty)/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── courses/
│   │   │   │   ├── generate/         # Generation workbench (generate/bulk/review modes)
│   │   │   │   ├── items/
│   │   │   │   ├── exams/
│   │   │   │   ├── analytics/
│   │   │   │   └── compliance/
│   │   │   ├── (admin)/
│   │   │   ├── (shared)/             # Profile, notifications, settings
│   │   │   └── layout.tsx
│   │   └── middleware.ts
│   ├── student/                       # Next.js 15 — student (Tier 2)
│   └── server/                        # Express backend
│       ├── src/
│       │   ├── api/                   # REST routes
│       │   ├── auth/                  # JWT + role middleware
│       │   ├── socket/               # Socket.io setup (rooms, presence, notifications)
│       │   ├── copilotkit/           # CopilotKit Runtime configuration
│       │   ├── langgraph/            # LangGraph.js generation pipeline
│       │   │   ├── graph.ts          # StateGraph definition
│       │   │   ├── state.ts          # WorkbenchState schema
│       │   │   ├── nodes/
│       │   │   │   ├── init.ts
│       │   │   │   ├── context-compiler.ts
│       │   │   │   ├── vignette-builder.ts
│       │   │   │   ├── stem-writer.ts
│       │   │   │   ├── distractor-generator.ts
│       │   │   │   ├── tagger.ts
│       │   │   │   ├── dedup-detector.ts
│       │   │   │   ├── validator.ts
│       │   │   │   ├── critic-agent.ts
│       │   │   │   ├── graph-writer.ts
│       │   │   │   ├── review-router.ts
│       │   │   │   ├── load-review-question.ts
│       │   │   │   ├── apply-edit.ts
│       │   │   │   └── revalidate.ts
│       │   │   └── prompts/
│       │   ├── validators/
│       │   │   ├── nbme-rules.ts     # 22 NBME item-writing rules
│       │   │   ├── semantic-check.ts
│       │   │   ├── ecd-alignment.ts
│       │   │   └── rebuttal-analysis.ts
│       │   ├── mcp/                   # MCP server implementations
│       │   │   ├── neo4j-mcp.ts
│       │   │   └── supabase-mcp.ts
│       │   └── inngest/              # Inngest functions
│       └── package.json
├── packages/
│   ├── shared-types/                  # TypeScript types, WorkbenchState, graph schema, API contracts
│   └── ui/                            # Design system: shadcn/ui + Radix + design tokens
│       ├── components/                # Atomic design atoms
│       ├── shared/                    # Molecules (StatCard, ProgressRing, etc.)
│       └── organisms/                 # KPIStrip, CourseRow, MasteryHeatmap, etc.
├── services/
│   ├── python-api/                    # FastAPI: IRT, GNN, psychometrics ONLY
│   ├── kg-seeder/                     # Cypher scripts + JSON fixtures
│   └── data-linter/                   # Inngest cron jobs for data quality
├── infrastructure/
├── docs/
│   ├── architecture-v10.md            # THIS DOCUMENT
│   ├── roadmap-v2.3.md
│   ├── DESIGN_SPEC.md
│   └── help/
└── .context/
```

### 3.8 Model Routing Strategy

| Task | Model | Why | Cost |
|------|-------|-----|------|
| Concept extraction | Haiku | High throughput, structured output | ~$0.001/chunk |
| Evidence rule generation | Haiku | Formulaic structured extraction | ~$0.002/item |
| Context synthesis / Agentic RAG | Haiku | Summarization, not generation | ~$0.001/query |
| Vignette + stem + distractor generation | **Sonnet** | Quality-critical clinical reasoning | ~$0.03/item |
| Medical accuracy validation | **Sonnet** | Requires domain knowledge | ~$0.01/item |
| **Critic Agent (quality scoring)** | **Opus** | Highest accuracy for faithfulness/recall | ~$0.02/item |
| Complex edge cases | Opus | Deepest reasoning | ~$0.05/call |

Total per item: ~$0.06–0.13. Without routing: ~$0.50+.

---

## 4. Authentication & Authorization Model

### 4.1 Role Hierarchy

```
SuperAdmin (Journey OS Team)
  └── Reviews waitlist → approves institutions
InstitutionalAdmin (per institution)
  └── Manages users, courses, settings within institution
Faculty → Course management, generation, review, exams, analytics
  └── Faculty with is_course_director: true → additional: bulk gen, review queue mgmt, SLO→ILO approval
Advisor → Student monitoring, at-risk alerts, interventions
Student → Practice, assessment, mastery tracking
```

Five roles. "Course Director" is a permission flag on Faculty, not a separate role.

### 4.2 Auth Flow

Platform access is SuperAdmin-gated (waitlist → approval → invitation). User access is Institutional Admin-gated (create users or enable self-registration for `@institution.edu`). Technical: Supabase Auth, JWT with `{ role, institution_id, is_course_director }`, RLS scoped by `institution_id`, Next.js middleware for route guards, Express middleware for API enforcement.

### 4.3 Onboarding

| Role | Type | Flow |
|------|------|------|
| Faculty | Dedicated wizard | Upload syllabus → watch extraction → generate first question → dashboard tour |
| Student | Guided tour | Dashboard tour → first practice → mastery explanation |
| Institutional Admin | Guided tour | User management → course setup → analytics |

---

## 5. Generation Workbench — Core Interface

The generation workbench is the primary interface for faculty. It is a single split-screen page (`/generate`) operating in three modes: **Generate**, **Bulk**, and **Review**. The same LangGraph.js pipeline serves all three modes with different entry points and interrupt configurations.

### 5.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER (48px) — white background                            │
│  [☰ Sidebar] [Journey OS] [Generate | Bulk | Review] [User] │
├──────────────────────────┬──────────────────────────────────┤
│  LEFT PANEL (45%)        │  RIGHT PANEL (55%)               │
│  White surface           │  White surface                   │
│  ┌────────────────────┐  │  ┌──────────────────────────┐   │
│  │ Session Header     │  │  │ Context Tabs             │   │
│  │ ● MODE • COURSE    │  │  │ [Syllabus][Preview][Cov.]│   │
│  ├────────────────────┤  │  ├──────────────────────────┤   │
│  │  CopilotChat       │  │  │  Context Content         │   │
│  │  (AG-UI messages)  │  │  │  (driven by              │   │
│  │                    │  │  │   state.context_view)     │   │
│  ├────────────────────┤  │  │  • SyllabusView          │   │
│  │ Input + Send       │  │  │  • QuestionPreview       │   │
│  │ [Bloom 4][ACS][..] │  │  │  • BulkQueueView        │   │
│  │ ExtractedParams    │  │  │  • CoverageMapView       │   │
│  └────────────────────┘  │  └──────────────────────────┘   │
└──────────────────────────┴──────────────────────────────────┘
```

### 5.2 WorkbenchState — Shared State Schema

The shared state is the single source of truth for both panels. Defined in `packages/shared-types`, consumed by both frontend (`useCoAgent`) and backend (LangGraph.js state). Synchronized via AG-UI `STATE_SNAPSHOT` and `STATE_DELTA` events over SSE.

```typescript
// packages/shared-types/src/workbench-state.ts

export interface QuestionOption {
  letter: string;              // "A" through "E"
  text: string;
  correct: boolean;
  misconception: string | null;
  evidence_rule: string | null;
}

export interface ToulminArgument {
  claim: string;               // "Student demonstrates mastery of X at Bloom Y"
  data: string | null;         // Student response pattern (post-attempt, null at gen time)
  warrant: string;             // TaskShell + source content connection
  backing: string;             // LO grounding, NBME compliance, provenance
  rebuttal: string;            // Cueing risks, distractor weaknesses
  qualifier: string | null;    // Confidence/certainty hedge
}

export interface SourceProvenance {
  type: "lecture" | "objective" | "textbook" | "graph_node";
  ref: string;
  node_id: string | null;
  confidence: number;
}

export interface QuestionDraft {
  id: string | null;
  status: "empty" | "context_compiled" | "vignette_draft" | "stem_draft"
    | "options_draft" | "tagged" | "validated" | "critic_scored" 
    | "approved" | "rejected";
  vignette: string;
  stem: string;
  options: QuestionOption[];
  tags: Record<string, any>;
  proficiency_variable: string | null;
  task_shell: string | null;
  toulmin: ToulminArgument | null;
  sources: SourceProvenance[];
  validation_results: Record<string, any> | null;
  critic_scores: CriticScores | null;
  generation_reasoning: string | null;
}

export interface CriticScores {
  faithfulness: number;        // ≥ 0.9
  contextual_recall: number;   // ≥ 0.8
  answer_relevancy: number;    // ≥ 0.95
  distractor_plausibility: number[]; // ≥ 0.6 per distractor
  bloom_alignment: boolean;
  clinical_accuracy: number;   // ≥ 0.95
  composite: number;
  routing: "auto_approve" | "auto_reject" | "faculty_review";
}

export interface BulkQueueItem {
  id: number;
  target_concept: string;
  subconcept_id: string;
  bloom: number;
  status: "pending" | "generating" | "validating" | "complete" 
    | "failed" | "needs_review";
  quality_score: number | null;
  question_id: string | null;
  error: string | null;
}

export interface ExtractedParam {
  key: string;
  value: string;
  source: "chat" | "manual";
  editable: boolean;
}

export interface SyllabusObjective {
  id: string;
  text: string;
  bloom: number;
  covered: boolean;
  question_count: number;
  neo4j_id: string | null;
}

export interface SyllabusContext {
  course_id: string;
  course_name: string;
  section_id: string | null;
  objectives: SyllabusObjective[];
  total_objectives: number;
  covered_count: number;
  gap_count: number;
}

export interface WorkbenchState {
  mode: "generate" | "bulk" | "review";
  context_view: "syllabus" | "question" | "queue" | "coverage";
  session_id: string;
  faculty_id: string;
  faculty_name: string;
  institution_id: string;
  syllabus: SyllabusContext | null;
  current_question: QuestionDraft;
  bulk_queue: BulkQueueItem[];
  bulk_total: number;
  bulk_complete: number;
  bulk_failed: number;
  extracted_params: ExtractedParam[];
  current_stage: string | null;
  stage_progress: Record<string, "pending" | "in_progress" | "complete">;
  review_question_id: string | null;
  review_history: Record<string, any>[];
  review_diff: Record<string, any> | null;
  coverage_data: Record<string, any> | null;
}
```

### 5.3 AG-UI Event Flow

| Event Type | Purpose | Example |
|------------|---------|---------|
| `RUN_STARTED` | Session begins | `{ thread_id, run_id, mode }` |
| `STATE_SNAPSHOT` | Full state on init or reconnect | Complete `WorkbenchState` |
| `STATE_DELTA` | Incremental state patches (JSON Patch RFC 6902) | `[{"op":"replace","path":"/current_question/vignette","value":"A 62-year-old..."}]` |
| `TEXT_MESSAGE_START/CONTENT/END` | Chat panel streaming | Pipeline narration, explanations |
| `TOOL_CALL_START/ARGS/END` | Tool usage indicators | "Querying knowledge graph...", "Running validation..." |
| `CUSTOM` | Pipeline stage transitions | Stage name, progress updates |

**Performance targets:**

| Event | Latency Target |
|-------|---------------|
| Time to first chat token | < 500ms |
| Vignette streaming start | < 3s from context compilation |
| Full question generation | < 45s |
| Context panel update | < 100ms from STATE_DELTA |
| SSE reconnection | < 2s |
| STATE_SNAPSHOT reconciliation | < 1s |
| Concurrent sessions | 50+ |

### 5.4 Frontend Component Tree

```
<WorkbenchPage>                              // /generate
  ├── <Header>
  │   ├── <SidebarToggle />
  │   ├── <Logo />                           // "Journey OS"
  │   ├── <ModeSwitcher mode={state.mode} /> // Generate | Bulk | Review
  │   └── <UserBadge />
  │
  ├── <SplitPane ratio={[45, 55]} resizable>
  │   │
  │   ├── <ChatPanel>                        // LEFT — white surface
  │   │   ├── <SessionHeader mode course />
  │   │   ├── <CopilotChat
  │   │   │     agentId="journey_generation"
  │   │   │     labels={{ placeholder: "Guide the generation..." }}
  │   │   │   >
  │   │   │   ├── <ChatMessage />
  │   │   │   ├── <ToolCallIndicator />
  │   │   │   └── <StageProgressInline />
  │   │   │
  │   │   └── <ExtractedParams
  │   │         params={state.extracted_params}
  │   │         onEdit={handleParamEdit}
  │   │       />
  │   │
  │   └── <ContextPanel>                     // RIGHT — white surface
  │       ├── <ContextTabBar
  │       │     mode={state.mode}
  │       │     activeView={state.context_view}
  │       │   >
  │       │   └── <ReviewActions />          // Approve/Edit/Reject (review mode)
  │       │
  │       └── <ContextContent view={state.context_view}>
  │           ├── {view === "syllabus" && <SyllabusView />}
  │           ├── {view === "question" && <QuestionPreview />}
  │           ├── {view === "queue" && <BulkQueueView />}
  │           └── {view === "coverage" && <CoverageMapView />}
  │
  └── <StageProgressOverlay />
```

### 5.5 Context Panel State Machine

| Pipeline Event | Switches To | Condition |
|----------------|------------|-----------|
| Mode → generate | `syllabus` | Default |
| Mode → bulk | `queue` | Default |
| Mode → review | `question` | Default |
| Context compiled | `question` | Only if on `syllabus` |
| Vignette starts streaming | `question` | Only if not pinned |
| Generation complete | `question` | Always |
| Review question loaded | `question` | Always |
| Faculty says "show coverage" | `coverage` | Always |

**Pin behavior:** If faculty manually switches tabs, auto-switch is suppressed for that stage. A "📌 Pinned" indicator appears. Next stage transition resets the pin.

### 5.6–5.10

**5.6 ExtractedParams** — Color-coded chips (Bloom=purple, Concept=green, Format=blue). Faculty editable. Changes propagate via STATE_DELTA.

**5.7 Frontend Tool Definitions** — `switch_context_view`, `request_faculty_review`, `highlight_element`, `suggest_objective` via `useCopilotAction`.

**5.8 QuestionPreview** — Progressive rendering by `QuestionDraft.status`: empty → context_compiled → vignette_draft → stem_draft → options_draft → tagged → validated → critic_scored → approved.

**5.9 Review as Workbench Mode** — Not a separate screen. Mode toggle or `/generate?mode=review&id=xxx`. Actions: Approve (green button or chat), Edit (amber, re-invokes pipeline), Reject (red, writes reason).

**5.10 Error Handling** — Claude API: retry 3×. Neo4j: retry 1×, degrade. Validation failure: self-correct 2×. Duplicate ≥ 0.95: inform faculty. SSE drop: auto-reconnect + STATE_SNAPSHOT. Inngest: retry 3× per item.

---

## 6. Generation Pipeline — LangGraph.js Nodes

### 6.1 Graph Definition

```typescript
// apps/server/src/langgraph/graph.ts

const generationGraph = new StateGraph<WorkbenchState>({
  channels: workbenchStateChannels,
})
  // Generation nodes (11)
  .addNode("init", initNode)
  .addNode("context_compiler", contextCompilerNode)
  .addNode("vignette_builder", vignetteBuilderNode)
  .addNode("stem_writer", stemWriterNode)
  .addNode("distractor_generator", distractorGeneratorNode)
  .addNode("tagger", taggerNode)
  .addNode("dedup_detector", dedupDetectorNode)
  .addNode("validator", validatorNode)
  .addNode("critic_agent", criticAgentNode)
  .addNode("graph_writer", graphWriterNode)
  .addNode("review_router", reviewRouterNode)
  // Review-specific nodes (3)
  .addNode("load_review_question", loadReviewQuestionNode)
  .addNode("apply_edit", applyEditNode)
  .addNode("revalidate", revalidateNode)
  // Generation edges
  .addEdge("init", "context_compiler")
  .addEdge("context_compiler", "vignette_builder")
  .addEdge("vignette_builder", "stem_writer")
  .addEdge("stem_writer", "distractor_generator")
  .addEdge("distractor_generator", "tagger")
  .addEdge("tagger", "dedup_detector")
  .addEdge("dedup_detector", "validator")
  .addEdge("validator", "critic_agent")
  .addEdge("critic_agent", "graph_writer")
  .addEdge("graph_writer", "review_router")
  .addEdge("review_router", END)
  // Review edges
  .addConditionalEdges("load_review_question", routeReviewAction, {
    edit: "apply_edit",
    approve: "graph_writer",
    reject: "graph_writer",
    chat: END,
  })
  .addEdge("apply_edit", "revalidate")
  .addEdge("revalidate", "critic_agent");
```

### 6.2 Node Summary

| Node | Purpose | Model | Key I/O |
|------|---------|-------|---------|
| **init** | Load session, syllabus, coverage gaps | — | → SyllabusContext, extracted_params |
| **context_compiler** | Graph traversal + Agentic RAG + ECD evidence design | Haiku (refiner) | SubConcept → PV, TaskShell, related concepts, misconceptions, source chunks |
| **vignette_builder** | Generate clinical vignette | Sonnet | Context → 150-200 word vignette (streamed) |
| **stem_writer** | Generate question stem | Sonnet | Vignette + TaskShell → NBME-style stem |
| **distractor_generator** | Generate 5 options with ECD reasoning | Sonnet | Phase 1: reasoning artifact (Toulmin warrant). Phase 2: 1 correct + 4 diagnostic distractors |
| **tagger** | Auto-tag metadata | Haiku | → Bloom, USMLE system/discipline, difficulty, ACGME, EPA |
| **dedup_detector** | Semantic duplicate check | Voyage AI | Embedding → pgvector nearest neighbor (question threshold 0.85/0.95) |
| **validator** | 22 NBME rules + 8 extended checks = 30 total | Rule-based + Sonnet | → validation_results with pass/fail/warning per rule |
| **critic_agent** | Quality scoring | **Opus** | → CriticScores: faithfulness, recall, relevancy, plausibility, bloom, clinical accuracy |
| **graph_writer** | Persist to Neo4j + Supabase | — | Dual-write: AssessmentItem, Options, relationships. Set sync_status. |
| **review_router** | Route based on Critic scores | Rule-based | auto_approve / auto_reject+retry / faculty_review |

### 6.3 Context Compiler — ECD Logic

1. **Evidence Design:** "We need evidence about θ_concept[X] at Bloom Y." Produces target student variables, evidentiary claim, misconceptions to test.
2. **Task Family Selection:** Matches evidence spec to TaskShell templates. Scoring function ranks fit.
3. **Instance Specification:** Fills demographics, clinical setting, lab complexity. Enforces variety across batch.
4. **Agentic RAG:** Neo4j traversal (structural: `ContentChunk -[:TEACHES_VERIFIED]-> SubConcept` + framework hops) + pgvector semantic search on `content_chunk_embeddings` → Reciprocal Rank Fusion → Context Refiner (Haiku) filters to 4,000-token budget. Full chunk text retrieved from Supabase `content_chunks` table by `graph_node_id`.

### 6.4 Critic Agent Node

| Metric | Threshold | What It Measures |
|--------|-----------|-----------------|
| Faithfulness | ≥ 0.9 | Vignette contains ONLY facts from source chunks |
| Contextual Recall | ≥ 0.8 | Question covers key facts from evidence spec |
| Answer Relevancy | ≥ 0.95 | Correct answer directly addresses stem |
| Distractor Plausibility | ≥ 0.6 each | Each distractor tempts a competent student |
| Bloom Alignment | Pass/fail | Cognitive demand matches target |
| Clinical Accuracy | ≥ 0.95 | No hallucinated clinical details |

**Routing:**

| Score | Action |
|-------|--------|
| All above threshold | `auto_approve` — lightweight faculty confirmation |
| Any below threshold | `auto_reject` — regenerate (up to 3 retries) |
| Borderline (within 0.05) | `faculty_review` — full review with scores displayed |

### 6.5 Interrupt Points (Configurable Per Session)

| Interrupt | Default | Effect |
|-----------|---------|--------|
| After context compilation | OFF | Faculty confirms target before generation |
| After vignette | OFF | Faculty reviews vignette before stem/options |
| After options | ON | Faculty reviews full question before tagging |
| After validation warnings | ON | Faculty sees warnings before graph write |

Three automation modes: **Full Auto** (no interrupts, Critic handles quality), **Checkpoints** (interrupts at marked stages), **Manual** (faculty guides every stage).

---

## 7. Knowledge Graph (Neo4j)

### 7.1 Design Principles

**Nodes for Traversal, Properties for Filtering.** Every node type earned its place by answering yes to at least one: (1) we traverse through it, (2) it has independent relationships to multiple entities, (3) we aggregate on it as a first-class entity. Everything else is a property.

**Skinny Node Principle.** Neo4j nodes stay under 100 bytes. Full text, embeddings, files live in Supabase.

**TEACHES vs TEACHES_VERIFIED.** AI extraction creates `TEACHES` (unverified). Faculty confirmation upgrades to `TEACHES_VERIFIED`. Only `TEACHES_VERIFIED` participates in the canonical coverage chain and question generation context. This prevents hallucinated concept mappings from propagating into assessment items.

### 7.2 Five Graph Layers

**Layer 1 — Institutional Structure (11 node types, ~65–70 nodes)**

```
(:Institution {id, name, domain})
  └─[:HAS_SCHOOL]→ (:School {id, name})
    └─[:HAS_PROGRAM]→ (:Program {id, name, degree_type})
      ├─[:HAS_TRACK]→ (:ProgramTrack {id, name})       // 4-Year, 5-Year
      └─[:HAS_YEAR]→ (:AcademicYear {id, name})         // M1, M2, M3, M4
        └─[:HAS_PHASE]→ (:CurricularPhase {id, name})   // Pre-clerkship, Clerkship, Post-clerkship
          └─[:HAS_BLOCK]→ (:Block {id, name})            // Mechanisms of Disease, etc.
            └─[:HAS_COURSE]→ (:Course {id, code, name, credits, type})
              ├─[:HAS_SECTION]→ (:Section {id, term})
              │   └─[:OFFERED_IN]→ (:AcademicTerm {id, name, start, end})
              └─[:HAS_ILO]→ (:ILO {id, description, source})
```

All Layer 1 relationships are **HUMAN_ONLY** — no AI involvement. These are organizational facts from the MSM Academic Catalog.

**Layer 2 — Framework Alignment (15 node types, ~492 nodes)**

USMLE — decomposed into axis sets, not materialized as cross-product:

```
(:USMLE_System)       × 16  — Cardiovascular, Respiratory, Renal, ...
(:USMLE_Discipline)   × 7   — Anatomy, Pathology, Pharmacology, ...
(:USMLE_Task)         × 4   — Normal Processes, Mechanisms, Diagnosis, Management
(:USMLE_Topic)        × ~200 — Granular content-outline entries
                                USMLE_System -[:HAS_TOPIC]-> USMLE_Topic
```

The 16×7 heatmap is computed by double-matching System + Discipline at query time (~10–50ms with indexes). USMLE_Topic enables precise gap detection: "Which specific topics under Cardiovascular have no SubConcepts?"

Cognitive frameworks:

```
(:BloomLevel)         × 6   — Remember through Create
(:MillerLevel)        × 4   — Knows, Knows How, Shows How, Does
```

Compliance and competency frameworks:

```
(:LCME_Standard)      × 12  ─[:HAS_ELEMENT]→  (:LCME_Element) × 93        = 105
(:ACGME_Domain)       × 6   ─[:HAS_SUBDOMAIN]→ (:ACGME_Subdomain) × 21    = 27
(:AAMC_Domain)        × 6   ─[:HAS_COMPETENCY]→ (:AAMC_Competency) × 49   = 55
(:EPA)                × 13                                                  = 13
```

UME framework (pre-clerkship curriculum mapping):

```
(:UME_Competency)     × 6   ─[:HAS_SUBCOMPETENCY]→ (:UME_Subcompetency) × 49 = 55
                               UME_Competency -[:ALIGNS_WITH]-> ACGME_Domain   (6 bridge edges)
```

**Typed framework relationships** (each has a distinct authority level):

| Relationship | Direction | Authority |
|---|---|---|
| `ILO -[:MAPS_TO_COMPETENCY]-> ACGME_Domain` | HUMAN_APPROVED |
| `ILO -[:MAPS_TO_EPA]-> EPA` | HUMAN_APPROVED |
| `ILO -[:ADDRESSES_LCME]-> LCME_Element` | HUMAN_APPROVED |
| `SLO -[:AT_BLOOM]-> BloomLevel` | AI_VERIFIED |
| `SLO -[:MAPS_TO_UME]-> UME_Subcompetency` | AI_VERIFIED |
| `ILO -[:MAPS_TO_UME]-> UME_Subcompetency` | HUMAN_APPROVED |
| `SubConcept -[:MAPS_TO]-> USMLE_System` | AI_VERIFIED |
| `SubConcept -[:MAPS_TO]-> USMLE_Discipline` | AI_VERIFIED |
| `AssessmentItem -[:AT_BLOOM]-> BloomLevel` | AI_VERIFIED |
| `AssessmentItem -[:AT_MILLER]-> MillerLevel` | AI_VERIFIED |

**Layer 3 — Concepts & Content (7 node types, ~9,600+ nodes)**

```
(:ContentChunk)             — skinny proxy for ingested content
(:SubConcept)               — knowledge hub, LOD-grounded (UMLS CUI, SNOMED, MeSH)
                              Properties: id, name, description, umls_cui, lod_enriched,
                              semantic_type, source_course
(:ILO)                      — institutional learning outcome (Course level, HUMAN_ONLY creation)
(:SLO)                      — session learning outcome (Session level, HUMAN_APPROVED creation)
(:ProficiencyVariable)      — ECD: measurable knowledge/skill/ability (1:1 with SubConcept,
                              separate for future many-to-many capability)
(:MisconceptionCategory)    — common student errors, shared across items
(:StandardTerm)             — LOD node: UMLS CUI, SNOMED, MeSH, ICD-10 codes (Tier 1)
```

Key relationships:
```
ContentChunk -[:EXTRACTED_FROM]-> Lecture | Syllabus
ContentChunk -[:TEACHES]-> SubConcept                 (AI-inferred, unverified)
ContentChunk -[:TEACHES_VERIFIED]-> SubConcept         (faculty-confirmed)
SubConcept -[:PREREQUISITE_OF]-> SubConcept
SubConcept -[:RELATED_TO {type}]-> SubConcept          (same_system, commonly_confused, differential)
SubConcept -[:HAS_MISCONCEPTION]-> MisconceptionCategory
SubConcept -[:MAPPED_TO]-> ProficiencyVariable
SubConcept -[:GROUNDED_IN]-> StandardTerm              (LOD enrichment)
StandardTerm -[:SAME_AS]-> StandardTerm                (cross-ontology)
SLO -[:FULFILLS]-> ILO                                (most important human-validated edge)
SLO -[:ADDRESSED_BY]-> SubConcept
Course -[:HAS_ILO]-> ILO
Session -[:HAS_SLO]-> SLO
```

**Canonical Coverage Chain (starts at TEACHES_VERIFIED only):**

```
ContentChunk -[:TEACHES_VERIFIED]-> SubConcept
  -[:ADDRESSED_BY]-> SLO
    -[:FULFILLS]-> ILO
      ├─[:ADDRESSES_LCME]-> LCME_Element        (accreditation terminus)
      ├─[:MAPS_TO_COMPETENCY]-> ACGME_Domain     (GME readiness terminus)
      └─[:MAPS_TO_UME]-> UME_Subcompetency       (pre-clerkship terminus)
```

One chain, branching terminus. Unverified TEACHES links do not participate.

**Layer 4 — Assessment & ECD (3 node types, ~50K+ at scale)**

```
(:TaskShell)        — reusable generation templates (bloom_range, concept_family, constraints)
(:AssessmentItem)   — complete question (vignette, stem, status, bloom, difficulty)
                      Supabase: toulmin JSONB (6 fields: claim, data, warrant, backing, rebuttal, qualifier)
(:Option)           — answer option (letter, text, correct, misconception, evidence_rule property)
```

Key relationships:
```
ProficiencyVariable -[:ASSESSED_BY]-> TaskShell
AssessmentItem -[:ASSESSES]-> SLO              (primary — for coverage chain)
AssessmentItem -[:TARGETS]-> SubConcept         (secondary — for concept-level analytics/mastery)
AssessmentItem -[:INSTANTIATES]-> TaskShell
AssessmentItem -[:HAS_OPTION]-> Option
AssessmentItem -[:SOURCED_FROM]-> ContentChunk  (provenance)
AssessmentItem -[:SUPERSEDES]-> AssessmentItem
Option -[:TARGETS_MISCONCEPTION]-> MisconceptionCategory
```

USMLE mapping is **inherited through SubConcept**, not direct: `AssessmentItem -[:TARGETS]-> SubConcept -[:MAPS_TO]-> USMLE_System`. This means a USMLE mapping correction on SubConcept propagates to all its items automatically.

**Layer 5 — Student Mastery (3 node types, ~120K+ at scale)**

```
(:Student)          — linked to Supabase auth
(:ConceptMastery)   — p_mastered, trend, evidence_count per concept
(:AttemptRecord)    — linked-list chain of attempts

Student -[:HAS_MASTERY]-> ConceptMastery -[:FOR_CONCEPT]-> SubConcept
AttemptRecord -[:ON_ITEM]-> AssessmentItem
AttemptRecord -[:NEXT]-> AttemptRecord
```

### 7.3 Complete Schema Summary

| Layer | Node Types | Count | Key Relationships |
|-------|-----------|-------|-------------------|
| Institutional | Institution, School, Program, ProgramTrack, AcademicYear, CurricularPhase, Block, Course, Section, AcademicTerm, ILO | ~65–70 | HAS_SCHOOL, HAS_PROGRAM, HAS_TRACK, HAS_YEAR, HAS_PHASE, HAS_BLOCK, HAS_COURSE, HAS_SECTION, OFFERED_IN, HAS_ILO |
| Frameworks | USMLE_System, USMLE_Discipline, USMLE_Task, USMLE_Topic, LCME_Standard, LCME_Element, ACGME_Domain, ACGME_Subdomain, AAMC_Domain, AAMC_Competency, EPA, BloomLevel, MillerLevel, UME_Competency, UME_Subcompetency | ~492 | HAS_TOPIC, HAS_ELEMENT, HAS_SUBDOMAIN, HAS_COMPETENCY, HAS_SUBCOMPETENCY, ALIGNS_WITH, MAPS_TO_COMPETENCY, MAPS_TO_EPA, ADDRESSES_LCME, AT_BLOOM, AT_MILLER, MAPS_TO, MAPS_TO_UME |
| Concepts & Content | ContentChunk, SubConcept, SLO, ILO (counted in L1), ProficiencyVariable, MisconceptionCategory, StandardTerm | ~9,600+ | EXTRACTED_FROM, TEACHES, TEACHES_VERIFIED, PREREQUISITE_OF, RELATED_TO, HAS_MISCONCEPTION, MAPPED_TO, GROUNDED_IN, SAME_AS, FULFILLS, ADDRESSED_BY, HAS_SLO |
| Assessment | TaskShell, AssessmentItem, Option | ~50K+ | ASSESSED_BY, ASSESSES, TARGETS, INSTANTIATES, HAS_OPTION, SOURCED_FROM, SUPERSEDES, TARGETS_MISCONCEPTION |
| Students | Student, ConceptMastery, AttemptRecord | ~120K+ | HAS_MASTERY, FOR_CONCEPT, ON_ITEM, NEXT |
| **Tier 0 Total** | **37 node types** | | **~30 relationship types** |

### 7.4 Graph Data Science

PageRank and betweenness centrality on SubConcept graph. Priority score: `(1 - coverage_pct) × usmle_weight × centrality_score × recency_decay`.

### 7.5 GNN Layer (Tier 3)

Three applications: Hidden Prerequisites, LCME Gap Prediction, Student Risk Classification. Progressive: GraphSAGE → GAT → Heterogeneous GNN. All faculty-validated suggestions.

---

## 8. Content Ingestion

### 8.1 WORM Store

Immutable raw binary in Supabase Storage. Corpus Reader abstraction with versioned parser replay.

### 8.2 Pipeline A: Syllabus/Lecture Upload (7 Stages via Inngest)

UPLOAD → PARSE → CLEAN → CHUNK → EMBED → EXTRACT → DUAL-WRITE → REVIEW QUEUE.

Density-based cleaning. **800-token chunks with 100-token overlap.** Voyage AI voyage-large-2 embeddings (1024-dim, stored in `content_chunk_embeddings`). Haiku extraction with LOD enrichment. Graph-based entity disambiguation. SubConcept dedup at 0.92 cosine threshold.

**Stage 5 — Dual-Write detail:**
1. Supabase: INSERT `content_chunks` row (full text, metadata, lecture_id, sync_status: "pending")
2. Supabase: INSERT `content_chunk_embeddings` row (vector 1024, chunk_id)
3. Neo4j: CREATE `(:ContentChunk)` skinny node (id, source_type, chunk_index, word_count)
4. Neo4j: CREATE `(:ContentChunk)-[:EXTRACTED_FROM]->(:Lecture)` relationship
5. Neo4j: CREATE `(:ContentChunk)-[:TEACHES]->(:SubConcept)` for AI-inferred concept links
6. Supabase: UPDATE `content_chunks` SET `graph_node_id` = Neo4j node ID, `sync_status` = "synced"

Faculty review (Stage 6) upgrades `TEACHES` → `TEACHES_VERIFIED` on confirmed links.

### 8.3 Pipeline B: Question Generation (14 LangGraph.js Nodes)

See Section 6. 11 generation + 3 review nodes.

### 8.4 Pipeline C: Legacy Import (10 Steps)

Parse → Normalize → Hybrid Index → Disambiguate → Concept Map → Competency Tag → Dedup → Validate → Dual-Write → Review Queue.

### 8.5 Continuous Data Linting (KaizenML)

9 lint rules as Inngest scheduled jobs.

### 8.6 Golden Dataset Regression

50 items, nightly regression, alert on > 0.05 quality drop.

---

## 9. USMLE Gap Detection

### 9.1 Heatmap Architecture

16×7 matrix heatmap (USMLE_System × USMLE_Discipline) computed at query time from axis nodes. Not a 448-cell pre-materialized cross-product — the heatmap is a double-match query against SubConcept relationships.

```cypher
-- Heatmap cell query
MATCH (sc:SubConcept)-[:MAPS_TO]->(sys:USMLE_System)
MATCH (sc)-[:MAPS_TO]->(disc:USMLE_Discipline)
OPTIONAL MATCH (sc)<-[:TARGETS]-(item:AssessmentItem {status: 'approved'})
RETURN sys.name AS system, disc.name AS discipline,
       count(DISTINCT sc) AS concept_count,
       count(DISTINCT item) AS item_count
ORDER BY sys.name, disc.name
```

Performance: ~10–50ms with indexes on SubConcept MAPS_TO relationships.

### 9.2 Priority Scoring

`priority = (1 - coverage_pct) × usmle_weight × centrality_score × recency_decay`

Where:
- `coverage_pct` = items_generated / total_subconcepts in that cell
- `usmle_weight` = Step 1 blueprint emphasis weight (some systems tested more heavily)
- `centrality_score` = PageRank of the SubConcepts in that cell (high centrality = many prerequisites depend on it)
- `recency_decay` = exponential decay from last generation date (prevents neglected cells from being permanently deprioritized)

### 9.3 Gap-to-Generation Closed Loop

1. Faculty views heatmap on dashboard or workbench coverage tab
2. Clicks an under-covered cell (e.g., "Cardiovascular × Pharmacology")
3. System pre-fills workbench: course context → SubConcepts in that cell → "Generate N Questions" button
4. USMLE_Topic drill-down: click a System cell → see which specific Topics under that System have zero SubConcepts (these are true blind spots, not just under-assessed areas)

### 9.4 Nightly Gap Scan (Inngest)

Inngest scheduled job `journey/gap.scan` runs nightly:
1. Recompute all 112 heatmap cells
2. Recompute PageRank and betweenness centrality on SubConcept graph
3. Identify cells where coverage dropped below threshold (0.3)
4. Generate notification cards for faculty dashboard: "Renal × Pathology has 2 SubConcepts but 0 approved questions"
5. Store gap snapshot in Supabase `gap_snapshots` (JSONB) for trend tracking

---

## 10. Assessment Delivery & Adaptive Practice

### 10.1 Three Delivery Modes

| Mode | Algorithm | Use Case | Tier |
|------|-----------|----------|------|
| **Standardized Exam** | Mixed-Integer Programming (MIP) solver | Faculty-created exams with constraints (Bloom distribution, topic coverage, time limit) | 1 |
| **Adaptive Practice** | Fisher Information + centrality weighting | Student self-study — items selected to maximize information gain at current mastery level | 2 |
| **Custom/Targeted** | Filtered pool | Faculty assigns specific concept sets or Bloom levels | 1 |

### 10.2 MIP Solver (Standardized Exam Assembly)

Faculty specifies constraints:
- Total items: N
- Bloom distribution: e.g., 20% Apply, 40% Analyze, 30% Evaluate, 10% Create
- USMLE system coverage: at least 1 item per system
- Time budget: estimated minutes
- Exclude previously seen items per student (optional)

Solver (Python service, PuLP/OR-Tools) selects items from approved pool maximizing:
- Content validity (coverage across SLOs)
- Construct validity (Bloom + Miller distribution)
- Discrimination power (IRT item parameters, Tier 2)

### 10.3 Adaptive Practice (Tier 2)

Item selection: Fisher Information criterion — select the item whose difficulty most closely matches the student's current θ estimate, weighted by centrality (high-centrality concepts are prioritized for testing).

Mastery update pipeline (< 500ms):
```
Student submits answer
  → Supabase INSERT attempt_record
  → Supabase Realtime trigger
  → Parallel consumers:
      1. Neo4j: UPDATE ConceptMastery.p_mastered (BKT update)
      2. Neo4j: UPDATE AttemptRecord linked list
      3. Supabase: UPDATE student dashboard stats
  → Next item selection (Fisher Information + centrality + prerequisite state)
```

### 10.4 Agent Working Memory

Session-scoped: items shown this session, concepts tested, performance trends within session.
Graph-scoped: student's full mastery state from ConceptMastery nodes — persistent across sessions.

Combined, these prevent: asking the same concept twice in a session, asking about concepts the student has demonstrably mastered (unless prerequisite for a gap), and failing to probe identified weak areas.

### 10.5 Post-Question Review

After each practice item, student sees:
- Correct answer highlighted with evidence rule explanation
- Misconception feedback: "You selected B, which relates to [misconception]. The correct mechanism is..."
- Toulmin chain (simplified): claim + warrant
- Link to relevant content chunk for self-study
- Mastery update visualization (progress bar shift)

---

## 11. Notification System

### 11.1 Architecture

Supabase `notifications` table (see DDL spec) + Socket.io real-time push to connected clients. In-app notifications (Tier 1). Email digest (Tier 2).

### 11.2 Notification Types

| Type | Trigger | Recipients | Priority |
|------|---------|-----------|----------|
| `generation_complete` | Pipeline finishes a question | Requesting faculty | Normal |
| `batch_complete` | Inngest batch finishes | Requesting faculty | Normal |
| `review_needed` | Critic routes item to faculty_review | Course director | High |
| `data_lint` | KaizenML lint finds issue | Institutional admin | Low |
| `quality_regression` | Golden dataset score drops > 0.05 | Institutional admin | High |
| `at_risk_alert` | BKT predicts student failure 2–4 weeks out | Advisor + student | High |
| `exam_available` | Faculty publishes an exam | Enrolled students | Normal |
| `system` | Platform announcements | All users | Low |

### 11.3 Delivery

**In-app (Tier 1):** Socket.io pushes notification to connected clients in real-time. Bell icon in header shows unread count. Notification dropdown with mark-as-read.

**Email digest (Tier 2):** Inngest scheduled job aggregates unread notifications and sends daily digest email. High-priority notifications also trigger immediate email.

---

## 12. Compliance System

### 12.1 LCME Dashboard

12-row heatmap (one per LCME Standard). Each row shows elements within that standard. Color coding by coverage level:
- Green: element addressed by ≥ 3 ILOs with assessment coverage
- Yellow: element addressed by 1–2 ILOs
- Red: element not addressed by any ILO

Query path: `LCME_Element <-[:ADDRESSES_LCME]- ILO <-[:FULFILLS]- SLO <-[:ASSESSES]- AssessmentItem`

### 12.2 Report Builder

Faculty/admin selects compliance scope (full program, single course, specific standards) and generates:
- **PDF report:** Formatted compliance narrative with evidence citations
- **DOCX report:** Editable template pre-filled with graph-derived evidence
- **CSV export:** Raw coverage data for further analysis

Evidence is programmatic: "Standard 7, Element 7.2 is addressed by ILO 'Explain pathophysiology of atherosclerosis' (MEDI 531), which is assessed by 12 approved items covering 4 SubConcepts."

### 12.3 GNN Gap Prediction (Tier 3)

Graph Neural Network trained on the full curriculum graph predicts which LCME elements are at risk of non-compliance based on structural patterns (missing ILOs, sparse assessment coverage, low concept connectivity). Faculty-validated — GNN surfaces predictions, faculty confirms or dismisses.

---

## 13. Student & Advisor Experience

### 13.1 Student Dashboard

- **Mastery heatmap:** USMLE System × Bloom level matrix showing p_mastered per cell
- **Practice launcher:** Quick-start adaptive practice by course, concept set, or weak areas
- **Progress timeline:** Mastery trend over time with milestone markers
- **Upcoming exams:** Schedule with preparation recommendations
- **Weak areas:** Top 5 SubConcepts with lowest mastery + linked practice sets

### 13.2 Practice Flow

```
Launcher → Configure (course, mode, length)
  → Session (item presentation, timer, submit)
    → Review (correct answer, explanation, misconception, mastery update)
      → Session Summary (items attempted, accuracy, mastery changes)
        → History (past sessions, trend charts)
          → Weak Areas (prioritized remediation)
            → Exam Prep (simulated exam conditions)
```

### 13.3 Course Access

Students see read-only course information: learning objectives, session schedule, recommended resources. Journey OS is NOT an LMS — it does not host lectures, manage assignments, or track attendance. It focuses entirely on assessment, practice, and mastery tracking.

### 13.4 Advisor Dashboard

- **Cohort overview:** Class mastery distribution with percentile bands
- **At-risk alerts:** Students flagged by BKT 2–4 weeks before predicted failure
- **Individual student drill-down:** Full mastery graph, attempt history, prerequisite gaps
- **Intervention tracking:** Log interventions, track outcomes
- **Comparative analytics:** Student vs cohort performance by USMLE system

---

## 14. Screen Architecture — Route Map

### `apps/web` (Faculty + Admin)

```
/login, /register, /forgot-password, /reset-password
/onboarding
/dashboard
/courses, /courses/new, /courses/[id] (structure/outcomes/students/settings tabs)
/generate                       # Workbench — modes: generate, bulk, review
/generate/history, /generate/templates, /generate/settings
/items, /items/[id], /items/[id]/analytics, /items/tags
/exams, /exams/new, /exams/[id], /exams/[id]/results
/analytics
/compliance, /compliance/report
/admin, /admin/users, /admin/data-integrity, /admin/frameworks
/profile, /notifications, /settings
/super/dashboard, /super/waitlist, /super/institutions, /super/system
```

### `apps/student`

```
/login, /onboarding
/dashboard
/practice, /practice/session, /practice/review, /practice/history
/practice/weak-areas, /practice/exam-prep
/courses, /courses/[id]
/progress, /analytics
/profile, /notifications, /settings
```

---

## 15. Integration Patterns

### 15.1 Dual-Write Pattern

All entities that exist in both Supabase and Neo4j follow the same pattern:

```
1. Supabase INSERT (sync_status: "pending")
2. Neo4j CREATE/MERGE
3. Supabase UPDATE sync_status = "synced", graph_node_id = neo4j_id

On Neo4j failure:
  → sync_status stays "pending"
  → Inngest retry job picks up pending rows every 5 minutes
  → Max 3 retries, then sync_status = "failed" + admin notification
```

Dual-written entities: content_chunks, subconcepts, assessment_items, student_learning_objectives.

### 15.2 Event-Driven Mastery Update

```
Student submits answer (Supabase INSERT attempt_record)
  → Supabase Realtime trigger fires
  → Three parallel consumers:
      1. BKT Update: Neo4j MATCH (cm:ConceptMastery) SET cm.p_mastered = newValue
      2. Attempt Chain: Neo4j CREATE (ar:AttemptRecord)-[:ON_ITEM]->(item), link to previous
      3. Stats Update: Supabase UPDATE student dashboard aggregate stats
  → Total latency target: < 500ms
```

### 15.3 Inngest Job Patterns

| Job | Schedule | Purpose |
|-----|----------|---------|
| `journey/content.uploaded` | On upload | Ingestion pipeline (parse → chunk → embed → extract → dual-write) |
| `journey/batch.requested` | On demand | Fan-out batch generation (up to 5 parallel) |
| `journey/gap.scan` | Nightly | USMLE heatmap recompute + gap alerts |
| `journey/lint.run` | Nightly | 9 KaizenML data quality rules |
| `journey/regression.run` | Nightly | Golden dataset quality check |
| `journey/sync.retry` | Every 5 min | Retry failed dual-writes |

### 15.4 Embedding Pipeline

All embeddings follow the same pattern regardless of entity type:

```
Text → Voyage AI voyage-large-2 API → 1024-dim vector → Supabase INSERT with HNSW index
```

Entities embedded: content chunks (at ingestion), SubConcepts (at creation), assessment items (at graph_writer), SLOs (at creation).

Embeddings are NEVER generated at query time. They are pre-computed and stored.

---

## 16. Tier Architecture

### Tier 0 (Months 1–4)
Graph seeded (deep hierarchy + frameworks). Supabase DDL. Monorepo. Design system. Auth with SuperAdmin waitlist. Course management. Upload pipeline. Basic generation workbench. CopilotKit + AG-UI. USMLE gap detection.
**Exit:** One question generated end-to-end.

### Tier 1 (Months 5–12)
Full 11-node pipeline + Critic Agent. WorkbenchState + AG-UI events. Batch generation. Faculty review. Item bank. Legacy import. Data linting + golden dataset. Generation history/templates/settings. Notifications. Admin data integrity. Faculty onboarding. StandardTerm + LOD enrichment.
**Exit:** 200+ approved. 60%+ Critic auto-handle.

### Tier 2 (Months 10–16)
IRT. Test assembly. Student app. Event-driven mastery. Adaptive practice. ONNX. Domain embeddings. Advisor dashboard. LCME compliance. Admin dashboard + users. Hetionet integration (selective 2-hop).
**Exit:** 500+ calibrated. ATA valid. Adaptive > static.

### Tier 3 (Months 16–24)
Multi-institution. GNN. Fine-tuned models. Framework management. Full admin portal. Topic modeling (BERTopic).
**Exit:** 3+ institutions. GNN ≥ 70%. AUC > 0.80.

---

## 17. Scholarly Foundations

| Framework | Implementation |
|-----------|---------------|
| **Evidence-Centered Design** (Mislevy 2003) | PV → TaskShell pipeline; evidence_rule property on Option; distractor reasoning artifact; context_compiler ECD sub-steps |
| **Toulmin Argumentation** (1958) | Toulmin JSONB on assessment_items (Supabase, 6 fields); machine-readable validity chains; LCME audit trail |
| **Bloom's Taxonomy** (Anderson & Krathwohl 2001) | Bloom tagging via AT_BLOOM; TaskShell constraints; question complexity targeting |
| **Bayesian Knowledge Tracing** (Corbett & Anderson 1994) | Student mastery modeling; domain-specific BKT; hierarchical inference |
| **Item Response Theory** (Lord 1980) | Item calibration; difficulty/discrimination; adaptive testing |
| **NBME Item Writing** (Haladyna et al. 2002) | 22-rule validation in validator node + 8 extended checks = 30 total |
| **Knowledge Graphs for Curriculum** (Brusilovsky & Vassileva 2003) | Neo4j ontology; PREREQUISITE_OF; graph-based gap analysis |
| **GraphRAG** (Negro et al.) | Structural constraints on LLM generation; graph context + vector context merged |
| **Agentic RAG** (Bhagwat) | Context Refiner reasons about relevance before expensive generation calls |
| **KaizenML** (Gift & Deza) | Continuous data linting; treat data errors like syntax errors |

---

*This document is the definitive reference. It supersedes all prior architecture documents (v9.0–v9.3). When any other document contradicts this one, this document wins.*
