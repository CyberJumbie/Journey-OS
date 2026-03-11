# Journey OS — Project Constitution
# Source: CLAUDE.md (uploaded) + workflow system additions from this session

## Identity
AI-powered competency-based medical education platform for Morehouse School of Medicine.
Generates NBME-style assessment items via knowledge graph + multi-stage AI pipeline + conversational UI.

## Stack
- Frontend: Next.js 15 (App Router), React 19, TypeScript strict, Tailwind 4, shadcn/ui, CopilotKit
- State/Data: React Query (TanStack Query v5) for server state, React state for local
- Forms: React Hook Form + Zod validation
- Icons: Lucide React
- Backend: Express, LangGraph.js, Zod validation
- Data: Neo4j Aura, Supabase PostgreSQL, pgvector (dual: voyage 1024-dim + openai 1536-dim), dual embedding providers
- AI: Claude Haiku (cheap ops), Claude Sonnet (generation), Claude Opus (critique, Phase 2+)
- Monorepo: Turborepo + pnpm

## Commands
- pnpm run dev           # Start web (3000) + server (3001)
- pnpm run typecheck     # TypeScript strict (run after ALL changes)
- pnpm run lint          # ESLint flat config
- pnpm run test -- <path> # Single test file
- pnpm run build         # Production build
- turbo lint type-check build  # CI command (turbo.json task names are hyphenated)

## The 10 Rules
1. TypeScript strict. No `any`. No `unknown` without assertion.
2. Supabase-first dual-write. Neo4j is secondary. Always.
3. MERGE not CREATE in Neo4j. All writes idempotent.
4. Skinny graph nodes (< 100 bytes). Full text → Supabase.
5. Stream everything via AG-UI (STATE_DELTA, TEXT_MESSAGE).
6. Haiku for cheap ops, Sonnet for generation, Opus for critique.
7. One file per pipeline node. Self-contained.
8. Prompts in separate .txt files in pipeline/prompts/. Never inline.
9. Labels match NODE_REGISTRY: SCREAMING_SNAKE for frameworks, PascalCase for concepts.
10. No localStorage/sessionStorage in frontend.

## Layer Constraints (STRICT MVC)
Routes → Controllers → Services → Repositories → Database
- Routes: path mapping + middleware. ZERO logic. ZERO DB access.
- Controllers: parse request, Zod validate, call service, format response. NO database access. NO business logic.
- Services: business logic + orchestration. Call repositories or DualWriteService. NO direct DB queries. NO HTTP concepts.
- Repositories: database queries ONLY. NO business logic. Return typed data.
- DualWriteService: the ONLY path for cross-database writes.

## Naming
- Neo4j labels: PascalCase (SubConcept), SCREAMING_SNAKE (USMLE_System)
- Neo4j relationships: SCREAMING_SNAKE (TEACHES, MAPS_TO, TARGETS, GENERATED_FROM)
- TypeScript types: PascalCase. Variables: camelCase. Constants: SCREAMING_SNAKE.
- Files: kebab-case. React components: PascalCase.
- Supabase: snake_case. API: /api/v1/{resource} (plural nouns)

## Design Tokens (never use raw hex)
- Background: #f5f3ef (cream). Panels: #faf9f6 (parchment). Content: #ffffff.
- Navy: #002c76. Blue: #2b71b9. Green: #69a338. Red: #d32f2f. Amber: #f59e0b.
- Gray-600: #4b5563 (secondary text). Gray-300: #d1d5db (borders).
- Headings: Lora 600. Body: Source Sans 3 400. Labels: DM Mono 400 uppercase.

## Prototype
89 components / 107 routes exist with mock data. WIRE existing screens. Do NOT rebuild them.
QuestWorkbench is the ONE full rewrite: form-based → CopilotKit conversational.
When adapting prototype screens: map to Atomic Design layers (see Frontend Architecture below).

## Figma → Next.js Workflow
Screens designed in Figma → exported to design/figma-exports/screens/<screen-name>/.
Adapt exports into Atomic Design components (atoms/molecules/organisms) in frontend/src/components/.
Wire organisms to real API using TanStack Query hooks in frontend/src/hooks/.
API response shape must match 06_SCREEN_BACKEND_MAP.md exactly.

## Frontend Architecture (Atomic Design)
frontend/src/components/ has 5 levels — never skip levels, never mix concerns:
- atoms/       — smallest units (Button, Badge, Icon, Spinner, Label, Heading, Text, ProgressBar)
- molecules/   — 2–5 atoms combined (FormField, SearchBar, QuestionOption, ConceptChip, UploadDropzone)
- organisms/   — complex sections with domain logic (CourseCard, Sidebar, QuestWorkbench, ReviewQueue)
- templates/   — layout shells, no data (DashboardTemplate, WorkbenchTemplate, AuthTemplate)
- pages (app/) — one template + route params. Atoms/molecules never fetch data. Only organisms + pages use hooks.
God Component rule: file > 150 lines = doing too much. Split it.

## Backend Architecture (OOP + Design Patterns)
Layer order (never skip): Routes → Controllers → Services → Repositories → lib/
- Singleton:   backend/src/lib/ — Neo4jClient, SupabaseClient, AnthropicClient. Never new'd outside lib/.
- Factory:     backend/src/ingestion/PdfParserFactory.ts — returns IPdfParser impl based on config
- Strategy:    backend/src/ingestion/parsers/ — LlamaParseParser | PdfplumberParser | PdfParseParser
- Repository:  backend/src/repositories/ — one class per entity, ALL DB queries live here only
- Interface:   PipelineNode.interface.ts, IPdfParser.interface.ts — enforce contracts across impls
- Builder:     WorkbenchStateBuilder in InitNode — never construct WorkbenchState with object literals
- Observer:    LangGraph STATE_DELTA emissions to CopilotKit

## Folder Structure
See docs/FOLDER_STRUCTURE.md for canonical locations.
Quick reference:
- Next.js frontend:   frontend/src/
- Express backend:    backend/src/
- Python services:    python/pdf-parser/, python/mip-solver/, python/irt-service/
- Neo4j seeder:       seeder/src/
- Shared types:       packages/shared-types/src/
- Figma exports:      design/figma-exports/
- Dev scripts:        scripts/

## Environments
local → dev (auto on push to dev) → production (CD on push to main)
- local:      pnpm dev. frontend:3000, backend:3001.
- dev:        Auto-deploy on push to dev. Frontend → Vercel preview. Backend → Railway dev.
- production: CD on push to main after epic validated on dev.

## Dual-Write Pattern
1. Write Supabase (source of truth) → 2. Write Neo4j → 3. Update sync_status
If Neo4j fails: Supabase persists, sync_status = 'failed', reconcile later via POST /api/v1/admin/reconcile.

## Graph Architecture
Dual-hub: SubConcept (what MSM teaches) + LearningObjective (what students do, Phase 2+)
TEACHES: ContentChunk → SubConcept (AI-extracted, NOT Course → SubConcept)
TEACHES_VERIFIED: ContentChunk → SubConcept (faculty-confirmed, Phase 2)
Every AssessmentItem: TARGETS → SubConcept, AT_BLOOM → BloomLevel, IN_COURSE → Course, GENERATED_FROM → ContentChunk

## Key Relationships (exact names — source: GRAPH_SCHEMA.md)
Institutional (Layer 1 seed): HAS_SCHOOL, OFFERS_PROGRAM, HAS_TRACK, IN_YEAR, HAS_PHASE, CONTAINS_BLOCK, OFFERS_COURSE, HAS_SECTION, IN_TERM, HAS_ILO
Content: TEACHES, TEACHES_VERIFIED, MAPS_TO, TARGETS, AT_BLOOM, IN_COURSE, GENERATED_FROM
Do NOT use: BELONGS_TO, CONTAINS_COURSE, CHUNK_OF, GROUNDED_IN, SOURCED_FROM (these are wrong)

## Env Vars (source: 04_TECHNICAL_CONTEXT.md)
Server (.env.local): NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD (NOTE: NEO4J_USER not NEO4J_USERNAME)
Server (.env.local): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, VOYAGE_API_KEY, OPENAI_API_KEY, EMBEDDING_PROVIDERS, EMBEDDING_SEARCH_PROVIDER
Web (.env.local): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL

## Key File Paths (source: 04_TECHNICAL_CONTEXT.md + updated structure)
- backend/src/config/config.ts — Zod-validated env (Singleton pattern)
- backend/src/lib/Neo4jClient.ts — Neo4j driver Singleton
- backend/src/lib/SupabaseClient.ts — Supabase service-role Singleton
- backend/src/pipeline/nodes/ — one class per LangGraph node (implements PipelineNode interface)
- backend/src/pipeline/prompts/ — Claude prompt .txt files (never inline)
- backend/src/ingestion/PdfParserFactory.ts — Factory for PDF parser Strategy selection
- backend/src/ingestion/parsers/ — IPdfParser implementations
- backend/supabase/migrations/ — SQL migration files
- seeder/src/seed-layer1.ts — Layer 1 institutional seed
- seeder/src/seed-layer2.ts — Layer 2 framework seed
- seeder/data/ — JSON seed files

## Workflow
ALWAYS: /story → /plan → /implement → /verify → /review → /compound → /commit → /end
NEVER: code without an approved plan. NEVER: rebuild prototype screens.

## Slim Context Layer
Never load full reference docs (40-80K tokens). Load .context/ stubs instead (~1.2K each).
When deeper info needed: /design-query "question" — subagent reads only the relevant section.
.context/ files: entities.yaml, relationships.yaml, routes.yaml, components.yaml, pipeline.yaml, stack.yaml

## Solution Docs
docs/solutions/index.yaml — check this FIRST before writing any code.
If a pattern exists in docs/solutions/, apply it. Do not reinvent.
Current solutions: SOL-001 (dual-write), SOL-002 (neo4j-merge), SOL-003 (rls-policy), SOL-004 (voyage-retry), SOL-005 (express-mvc), SOL-008 (dual-embedding-provider)

## Session State
SESSION_STATE.md — max 40 lines, written by /compound and /end.
Contains: current story + PIVC phase + last 3 done + next-ready queue. Never grows.
On new session: read SESSION_STATE.md first, then /story [ID].

## 50/50 Rule
50% engineering time on features, 50% on improving the factory.
After each story: /compound extracts patterns → solution docs → CLAUDE.md → .context/ → SESSION_STATE.md.
By story 20, expect 3× story 1 speed.

## Things Claude Gets Wrong
*(updated by /compound — max 15 active entries)*

- TEACHES_DIRECTION: TEACHES goes ContentChunk → SubConcept. NOT Course → SubConcept.
- RELATIONSHIP_NAMES: Use exact names from GRAPH_SCHEMA.md. HAS_SCHOOL not BELONGS_TO. OFFERS_COURSE not CONTAINS_COURSE. GENERATED_FROM not SOURCED_FROM.
- NEO4J_USER: The env var is NEO4J_USER, not NEO4J_USERNAME. Breaks DB connection silently.
- SEEDER_PATH: Seed scripts live in seeder/src/, not scripts/ or services/. Standalone package.
- MISSING_REACT_QUERY: All API calls go through TanStack Query hooks in frontend/src/hooks/. Never bare fetch() in a component.
- WRONG_FOLDER: New files go in frontend/ or backend/ not apps/web/ or apps/server/ — old paths no longer exist.
- SINGLETON_VIOLATION: Never `new Neo4jDriver()` or `new SupabaseClient()` inside a service or repository. Import from backend/src/lib/ only.
- FACTORY_BYPASS: Never instantiate LlamaParseParser or PdfplumberParser directly. Always call PdfParserFactory.create() so the strategy is swappable.
- GOD_COMPONENT: A React component file over 150 lines is a God Component. Split into smaller atomic parts before adding more code.
- WRONG_ATOMIC_LEVEL: Atoms never fetch data. Molecules never fetch data. Only organisms (via hooks) and pages fetch data. Don't put useQuery in a Button or FormField.
- LAYER_VIOLATION: Writing Supabase queries in a service class. Services call repositories. Repositories call the DB.
- DUAL_WRITE_ORDER: Writing Neo4j before Supabase. Supabase is ALWAYS first.
- CYPHER_CREATE: Using CREATE instead of MERGE in Neo4j. All writes must be idempotent.
- SKINNY_NODE_VIOLATION: Putting text content (stem, vignette, rationale) as Neo4j node properties.
- RAW_TEXT_EXTRACTION: Never pass raw .txt to the chunker. Always Markdown via PdfParserFactory (SOL-006).
- CHUNKER_TABLE_SPLIT: Never split a Markdown table mid-row. Split on ## headers first, then \n\n.
- CLASSIFIER_SKIPPED: classifier must run before concept_extractor. Never send all chunks directly to Haiku.
- INLINE_PROMPT: Writing Claude prompt text inline in node code. All prompts in backend/src/pipeline/prompts/*.txt.
- OPUS_IN_PHASE1: Using claude-opus in Phase 1. Opus is Critic Agent only, Phase 2+.
- STORAGE_API: Using localStorage or sessionStorage. Not supported — use useState or TanStack Query cache.
- COPILOTKIT_SSR: CopilotKit hooks (useCoAgent, CopilotChat) fail during Next.js static prerendering. Use `dynamic(() => import('./component'), { ssr: false })` for any page with CopilotKit.
- RAW_OBJECT_RETURN: Returning raw `{ field: value }` from pipeline nodes. Use WorkbenchStateBuilder, spread with `messages` array: `return { ...builder.build(), messages }`.
- MUTATION_IN_MOLECULE: Putting useMutation/useQuery in a molecule component. Molecules are pure presentational — lift mutations to parent organism and pass callbacks as props.
- AUTH_SERVICE_DIRECT_DB: AuthService (or any service) querying `.from('table')` directly. Always route through a repository class, even for user_profiles.
- DUAL_SYSTEM_PROMPT: Loading a prompt from .txt file BUT also passing a separate inline `system:` string to Anthropic. Use the loaded template as the complete prompt — never split across inline + file.
- ECD_FALLBACK_REQUIRED: TaskShell selection and PV lookup can return null. Always provide fallback: TS-001 for missing TaskShell, Bloom 3 for missing bloom_level_guess.

---

## Phase 2 Additions (Weeks 9–16)

### New Stack (Phase 2+)
- Background jobs: Inngest (`npm install inngest`) — registered at `POST /api/inngest`
- Real-time: Socket.io (`socket.io` server, `socket.io-client` frontend) — JWT-authenticated
- Redis: available for caching Phase 2+ (not required for Epics 2.1–2.4)

### New Phase 2 Env Vars
```
INNGEST_EVENT_KEY=...      # from Inngest dashboard
INNGEST_SIGNING_KEY=...    # for webhook verification
```

### Phase 2 Model Rules (extends Rule 6)
- `TaggerNode`: `claude-haiku-4-5` — structured tag output, cheap
- `CriticAgentNode`: `claude-opus-4-6` — only place Opus runs in the entire codebase
- `ToulminGeneratorNode`: `claude-sonnet-4-6` — quality matters for ECD arguments
- `cover-the-options validator`: `claude-sonnet-4-6` — semantic judgment
- `ReviewRouterNode`: no AI — pure TypeScript routing logic
- `DedupDetectorNode`: no AI — pure vector search

### Phase 2 Key Rules (add to The 10 Rules above)
- Rule 11: **Critic cost guard.** Check monthly Opus spend before every CriticAgentNode call. Threshold: $50/month. Above → skip critic, route to faculty_review.
- Rule 12: **Dedup never blocks.** If embedding or pgvector call fails, set `dedup_status: 'skipped'` and continue. Never abort generation.
- Rule 13: **Max 2 retries.** Self-correction loop max = 2. Hard ceiling enforced at graph entry.
- Rule 14: **Inngest step wrapping.** Every bulk item must be wrapped in `await step.run(...)`. Never loop without step boundaries.
- Rule 15: **TEACHES vs TEACHES_VERIFIED.** Never conflate. TEACHES = AI-extracted. TEACHES_VERIFIED = faculty-confirmed. Only TEACHES_VERIFIED participates in LCME compliance chains.

### Phase 2 New Relationships (add to Graph Architecture section)
- `ProficiencyVariable -[:MAPPED_TO]-> SubConcept` (1:1, auto-created on SubConcept extraction)
- `ProficiencyVariable -[:ASSESSED_BY {priority: 1|2|3}]-> TaskShell`
- `TaskShell -[:AT_BLOOM_RANGE]-> BloomLevel`
- `AssessmentItem -[:INSTANTIATES]-> TaskShell`
- `ContentChunk -[:TEACHES_VERIFIED]-> SubConcept` (faculty-confirmed)

### Phase 2 Solution Docs
- SOL-009: Inngest bulk generation pattern (see docs/solutions/SOL-009-inngest-bulk.md)
- SOL-010: Socket.io JWT auth pattern (see docs/solutions/SOL-010-socketio-auth.md)
- SOL-011: Self-correction retry loop (see docs/solutions/SOL-011-retry-loop.md)

### Phase 2 Things Claude Gets Wrong
- OPUS_NOT_IN_TAGGER: Tagger uses Haiku, NOT Sonnet or Opus. It's structured JSON extraction.
- INNGEST_NO_THROW: Inside `step.run()`, never rethrow errors. Catch, log, mark item failed, return.
- SOCKET_ROOM_PATTERN: Socket rooms are `user:{userId}`. Never emit to a socket id directly.
- REVIEW_MODE_REUSE: Review mode reuses existing `critic_agent` and `review_router` nodes. Do NOT duplicate them.
- PV_NOT_TABLE_FK: `proficiency_variables.sub_concept_id` is a conceptual reference — there is no `sub_concepts` Supabase table (SubConcepts are in Neo4j). Use `neo4j_node_id` for cross-reference.
- TOULMIN_ALL_FIELDS: All 6 Toulmin fields must be present. Use 'N/A' for unfillable fields, never omit a key.
- GOLDEN_SCORE_ONLY: Golden regression re-scores items — it never changes `assessment_items.status`. Read-only regression.

---

## Phase 3 Additions (Weeks 17–24)

### Phase 3 Stack Additions
- D3.js (`npm install d3` in frontend) — force-directed coverage graph
- pptx-text-extract (`npm install pptx-text-extract` in backend) — PPTX parsing
- UMLS REST API (free NLM account required) — StandardTerm LOD enrichment

### Phase 3 New Env Vars
```
UMLS_API_KEY=your-nlm-api-key    # free at https://uts.nlm.nih.gov/uts/signup-login
```

### Phase 3 New Relationships (Graph Architecture)
- `Course -[:HAS_SLO]-> SLO`
- `SLO -[:FULFILLS]-> ILO`
- `LCME_Element -[:ALIGNS_TO]-> ILO` (may exist from Phase 1 seed — verify)
- `SubConcept -[:GROUNDED_IN {confidence, matchType}]-> StandardTerm`
- `AssessmentItem -[:INSTANTIATES]-> TaskShell` (from Phase 2)

### Phase 3 Key Rules
- Rule 16: **UMLS CUI is the unique key.** Always `MERGE (st:StandardTerm {cui: $cui})` — never CREATE.
- Rule 17: **UMLS confidence threshold.** Only create GROUNDED_IN for exact matches or approximate ≥ 0.85. Never link below 0.85.
- Rule 18: **LCME evidence requires both paths.** ILO → SLO path AND SubConcept → AssessmentItem path. Neither alone constitutes evidence.
- Rule 19: **OPTIONAL MATCH in heatmap queries.** Always use OPTIONAL MATCH so 0-item cells appear.
- Rule 20: **D3 cap at 500 nodes.** Order by pagerank DESC LIMIT 500 in coverage graph query.
- Rule 21: **PptxParser implements IPdfParser.** Never bypass PdfParserFactory for PPTX files.
- Rule 22: **SLO dedup at ingest.** Check similarity > 0.95 before creating duplicate SLO nodes within same course.

### Phase 3 Solution Docs
- SOL-012: UMLS TGT auth pattern (docs/solutions/SOL-012-umls-auth.md)
- SOL-013: Inngest 7-stage ingestion pipeline (docs/solutions/SOL-013-ingestion-pipeline.md)
- SOL-014: SubConcept dedup algorithm (docs/solutions/SOL-014-subconcept-dedup.md)
- SOL-015: LCME evidence chain query (docs/solutions/SOL-015-lcme-chain.md)

### Phase 3 Things Claude Gets Wrong
- UMLS_NO_CREATE: Never `CREATE (st:StandardTerm)`. Always `MERGE (st:StandardTerm {cui: $cui})`. CUI is globally unique.
- LCME_WRONG_CHAIN: LCME evidence goes Element ← ALIGNS_TO ← ILO ← FULFILLS ← SLO. NOT Element → SubConcept directly.
- SLO_DIRECTION: `SLO -[:FULFILLS]-> ILO`. SLO fulfills ILO, not the other way.
- DEDUP_THEN_UMLS: SubConcept dedup (P3-004) MUST run before UMLS enrichment (P3-018). Enriching pre-dedup nodes wastes UMLS quota.
- D3_NO_SSR: D3 code only in `useEffect` + `useRef`. Never render D3 during SSR. Use `'use client'` directive.
- OPTIONAL_HEATMAP: Heatmap Cypher must use OPTIONAL MATCH. A MATCH that returns no rows for empty cells will not show zeros.
- PPTX_FACTORY: PptxParser is registered in PdfParserFactory. Never call `new PptxParser()` directly.

---

## Phase 4 Additions (Weeks 25–32)

### Phase 4 Stack Additions
- PuLP (`pip install pulp`) in `python/mip-solver/` — MIP constraint solver
- FastAPI (`pip install fastapi uvicorn`) in `python/mip-solver/` — Python HTTP service port 8001
- @dnd-kit/core + @dnd-kit/sortable (`npm install @dnd-kit/core @dnd-kit/sortable`) — drag-to-reorder
- Supabase Realtime (already in `@supabase/supabase-js` — just enable on `notifications` table)

### Phase 4 New Env Vars
```
MIP_SOLVER_URL=http://localhost:8001   # Python MIP solver service
```

### Phase 4 Key Rules
- Rule 23: **MIP solver always has greedy fallback.** If solver is unavailable, `ExamAssemblyService` uses greedy (sort by critic score, apply hard filters). Never throw — always assemble an exam.
- Rule 24: **Score server-side.** Exam scoring (`pct_score`, `raw_score`) is ALWAYS calculated in `ExamSessionService.submitSession()`. Never trust the client.
- Rule 25: **Legacy import: flag, don't reject.** Legacy items that fail 30-rule validation get `validation_passed: false` but NOT `status: 'rejected'`. They stay `status: 'draft'` for faculty review.
- Rule 26: **Notifications dual-channel.** Every notification fires BOTH Socket.io (P2-012) AND writes to Supabase `notifications` table (P4-012). Never only one channel.
- Rule 27: **Item editor always versions.** Every `PATCH /items/:id` creates a row in `assessment_item_versions` BEFORE modifying the item. Never skip versioning.
- Rule 28: **Onboarding step is server-authoritative.** `onboarding_step` lives on the user profile, not in client state. Fetch it on mount. Never infer step from URL.

### Phase 4 New Relationships
- `Faculty -[:CREATED]-> Exam`
- `Exam -[:CONTAINS {position, points}]-> AssessmentItem`
- `Student -[:TOOK]-> ExamSession`
- `ExamSession -[:FOR]-> Exam`
- `ExamSession -[:ANSWERED {selectedOption, isCorrect}]-> AssessmentItem`
- `LCME_Element -[:USES_TERM {confidence}]-> StandardTerm` (Phase 4 extension of UMLS)

### Phase 4 Things Claude Gets Wrong
- MIP_NO_THROW: MIP solver failure must NOT throw. Always return from greedy fallback. User should get an exam even if solver is down.
- SCORE_SERVER_SIDE: Never calculate pct_score on the client. Always POST /submit → server calculates → return scores.
- LEGACY_NO_REJECT: Legacy imported items that fail validation are NOT auto-rejected. `status` stays 'draft'.
- VERSION_BEFORE_EDIT: `assessment_item_versions` row must be created BEFORE any field update in item editor. If version creation fails, abort the edit.
- REALTIME_CLEANUP: Supabase Realtime channels MUST be removed on component unmount. Missing cleanup = memory leak + duplicate events.
- ONBOARDING_SERVER: onboarding_step is server-authoritative. Never store step in localStorage or URL params.
