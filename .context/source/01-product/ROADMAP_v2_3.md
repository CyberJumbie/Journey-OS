# Journey OS — Implementation Roadmap & Sprint Plan v2.3

**Architecture Reference:** v10.0  
**Reconciliation:** All conflicts resolved per Reconciliation Tracker (R-001–R-041)  
**Start Date:** February 2026  
**Status:** Greenfield  
**Methodology:** 2-week sprints  
**Total Sprints:** ~56

---

## Changelog (v2.2 → v2.3)

| Change | Reconciliation | Description |
|--------|---------------|-------------|
| Architecture ref updated | R-021 | v9.2 → v10.0 |
| Sprint 1 USMLE corrected | R-008 | 448 cells → 27 axis + ~200 USMLE_Topic nodes |
| Sprint 1 UME added | R-005 | 55 UME nodes (6 competency + 49 subcompetency) added to Layer 2 seeding |
| Sprint 1 hierarchy confirmed | R-007 | Deep hierarchy (~65 nodes) retained. Node labels: SCREAMING_SNAKE. |
| Sprint 2 pgvector corrected | R-001 | 1536-dim → 1024-dim. Model: voyage-large-2. |
| Sprint 2 index corrected | R-029 | IVFFlat → HNSW |
| Sprint 2 sync tracking | R-033 | `graph_sync_status` table → `sync_status` column on individual tables |
| Sprint 2 ILO/SLO split | R-019 | `LearningObjective` → separate `ILO` + `SLO` node types |
| Sprint 5 typed relationships | R-010 | `ALIGNS_TO` → `MAPS_TO_COMPETENCY`, `AT_BLOOM`, `ADDRESSES_LCME`, etc. |
| Sprint 14 transport fixed | R-024 | Per-item STATE_DELTA via SSE (AG-UI), not Socket.io broadcast |
| Framework counts canonical | R-005 | LCME=105, ACGME=27, AAMC=55, EPA=13, Bloom=6, Miller=4, UME=55, USMLE=227 |
| Workbench branding | R-011 | All QUEST/QWEST → Journey OS |
| Agent ID | R-038 | `quest_generation` → `journey_generation` |

---

## Pre-Sprint 0: Environment & Tooling (Week 0 — 1 week)

**Goal:** Every engineer can clone, run, and deploy from day one.

### Deliverables

- [ ] GitHub repo with turborepo monorepo
- [ ] `.context/` stubs, `docs/` with architecture v10.0 + this roadmap + NODE_REGISTRY_v1.0 + SUPABASE_DDL_v1.0
- [ ] CI/CD: GitHub Actions (lint, type-check, build)
- [ ] Supabase project (free tier), Neo4j Aura Free, Anthropic API key, Voyage AI key
- [ ] Docker Compose for local stack
- [ ] Turborepo workspaces: `apps/web` (Next.js 15), `apps/server` (Express), `packages/shared-types`, `packages/ui`
- [ ] `services/kg-seeder/`, `services/python-api/`, `services/data-linter/` directories
- [ ] Next.js 15 + React 19 — `create-next-app` with App Router, pinned versions
- [ ] Node.js 20 LTS, Python 3.12+

### Exit Criteria

- `pnpm install && pnpm build` succeeds
- `docker compose up` starts local stack
- CI passes on `main`

---

## Tier 0: Foundation (Months 1–4 / Sprints 1–9)

> **North Star:** One question generated end-to-end via the split-screen workbench.

---

### Sprint 1 — Knowledge Graph Schema: Layers 1–2 + CopilotKit Spike (Weeks 1–2)

**Goal:** Institutional structure and framework nodes in Neo4j. CopilotKit ↔ LangGraph.js event plumbing validated.

#### Deliverables

- [ ] **Layer 1 Cypher DDL:** Deep hierarchy per Architecture v10.0 §7.2:
  `Institution → School → Program → ProgramTrack → AcademicYear → CurricularPhase → Block → Course → Section → AcademicTerm` + `ILO` nodes (~65–70 nodes)
  - Labels: PascalCase per NODE_REGISTRY (Institution, School, Program, etc.)
  - ILO as separate node type (not LearningObjective)
- [ ] **Layer 2 Cypher DDL:**
  - USMLE: 16 `USMLE_System` + 7 `USMLE_Discipline` + 4 `USMLE_Task` + ~200 `USMLE_Topic` = **~227 nodes**
  - LCME: 12 `LCME_Standard` + 93 `LCME_Element` = **105 nodes**
  - ACGME: 6 `ACGME_Domain` + 21 `ACGME_Subdomain` = **27 nodes**
  - AAMC: 6 `AAMC_Domain` + 49 `AAMC_Competency` = **55 nodes**
  - UME: 6 `UME_Competency` + 49 `UME_Subcompetency` = **55 nodes** + 6 `ALIGNS_WITH → ACGME_Domain` bridge edges
  - EPA: 13 `EPA` nodes
  - Bloom: 6 `BloomLevel`, Miller: 4 `MillerLevel`
  - All framework labels: SCREAMING_SNAKE (`USMLE_System`, not `USMLESystem`)
  - **Layer 2 total: ~492 nodes**
- [ ] `services/kg-seeder/` idempotent scripts + runner (`pnpm kg:seed`)
- [ ] Neo4j uniqueness constraints per NODE_REGISTRY §Constraints
- [ ] `packages/shared-types/src/graph.ts` — TypeScript types matching NODE_REGISTRY exactly
- [ ] **🔴 SPIKE: CopilotKit ↔ LangGraph.js Integration Proof (2–3 days)**
  - Minimal LangGraph.js `StateGraph` with ONE node on Express
  - Node updates a single string field in state via `UIEventEmitter`
  - CopilotKit Runtime configured, SSE streaming operational
  - `useCoAgent` consumes `STATE_DELTA` in a minimal React page
  - **Test:** STATE_DELTA renders in frontend. TEXT_MESSAGE streams to chat.

#### Exit Criteria

- Verification queries (must match NODE_REGISTRY counts):
  - `MATCH (n:USMLE_System) RETURN count(n)` → 16
  - `MATCH (n:USMLE_Topic) RETURN count(n)` → ~200
  - `MATCH (n:LCME_Element) RETURN count(n)` → 93
  - `MATCH (n:UME_Subcompetency) RETURN count(n)` → 49
  - `MATCH (n:BloomLevel) RETURN count(n)` → 6
  - `MATCH (n:MillerLevel) RETURN count(n)` → 4
  - Total Layer 2: ~492
- Seeder idempotent (run twice, same count)
- CopilotKit spike: STATE_DELTA renders. Event format documented.

---

### Sprint 2 — Knowledge Graph Layer 3 + Supabase Foundation (Weeks 3–4)

**Goal:** Concept hierarchy + Supabase DDL operational.

#### Deliverables

- [ ] **Layer 3 Cypher DDL:**
  - `SubConcept`, `SLO` (separate from ILO per R-019), `ProficiencyVariable`, `MisconceptionCategory`
  - `SLO -[:FULFILLS]-> ILO` bridge relationship
  - `SLO -[:ADDRESSED_BY]-> SubConcept`
  - `Session -[:HAS_SLO]-> SLO`
- [ ] **Supabase DDL** per SUPABASE_DDL_v1.0:
  - All tables from DDL spec: `institutions`, `user_profiles`, `uploads`, `content_chunks`, `content_chunk_embeddings`, `subconcepts`, `concept_embeddings`, `student_learning_objectives`, `slo_embeddings`, `assessment_items`, `question_embeddings`, `options`, `generation_logs`, `frameworks`, `ume_competencies`, `notifications`, `audit_log`
  - pgvector enabled: **1024-dim** (Voyage AI voyage-large-2)
  - **HNSW** indexes on all embedding tables
  - `sync_status` column on dual-written tables (content_chunks, subconcepts, assessment_items) — no separate `graph_sync_status` table
- [ ] RLS scoped by `institution_id`
- [ ] WORM Store bucket (`raw-uploads`, immutable)
- [ ] Dual-write utility (Supabase first → Neo4j second → update `sync_status` column)

#### Exit Criteria

- RLS blocks cross-institution reads
- Dual-write succeeds E2E (sync_status: "pending" → "synced")
- pgvector HNSW query works on test embeddings (1024-dim)

---

### Sprint 3 — Design System + Auth + SuperAdmin Waitlist (Weeks 5–6)

**Goal:** Design system live. Auth with full role hierarchy. SuperAdmin manages waitlist.

#### Deliverables

- [ ] **`packages/ui` — Design System:**
  - Tailwind tokens: cream `#f5f3ef`, parchment `#faf9f6`, white `#ffffff`, navy-deep `#002c76`, blue-mid `#2b71b9`, green `#69a338`
  - Fonts: Lora, Source Sans 3, DM Mono
  - 3-layer surface system, cards contrast parent
  - shadcn/ui + Radix components styled to system
  - Collapsible sidebar (72px → 240px, Lucide icons)
  - Header: white background (not dark, per R-039)
- [ ] **Auth flow (`apps/web`):**
  - `/login` — split-panel, `@msm.edu` validation, role-based redirect
  - `/register` — 4-step wizard, FERPA consent, email verification
  - `/forgot-password`, `/reset-password`
- [ ] **Express backend (`apps/server`):**
  - JWT middleware (Supabase Auth tokens)
  - Role middleware: `superadmin`, `institutional_admin`, `faculty`, `advisor`, `student`
  - JWT includes `is_course_director` boolean (R-023)
  - REST routes: `/api/auth/me`, `/api/institutions`, `/api/waitlist`
- [ ] **SuperAdmin waitlist flow:**
  - Public application form → `waitlist_applications` record
  - `/super/waitlist` screen: review, approve/reject, send invitation
  - Approval → creates institution → invitation email to admin
- [ ] **Role-based sidebar navigation**

#### Exit Criteria

- Design system renders across 3 surfaces
- Faculty login → faculty sidebar, SuperAdmin → super sidebar
- SuperAdmin approves institution → admin creates account

---

### Sprint 4 — Course Management + Upload Pipeline (Weeks 7–8)

**Goal:** Faculty manages courses. Upload pipeline parses through embedding.

#### Deliverables

- [ ] Course management: `/courses` (list), `/courses/new` (wizard), `/courses/[id]` (tabs: structure, settings)
- [ ] Upload pipeline (Inngest, Stages 1–4): Parse → Clean → Chunk (800 tokens, 100-token overlap) → Embed (Voyage voyage-large-2, 1024-dim)
- [ ] Upload UI in course context (drag-and-drop, pipeline status)
- [ ] Inngest client + dev server

#### Exit Criteria

- Faculty uploads PDF → parsed, cleaned, chunked, embedded in < 60s
- WORM store preserves original

---

### Sprint 5 — Concept Extraction + LO Management + Dual-Write (Weeks 9–10)

**Goal:** AI extracts concepts. Faculty manages learning objectives with framework linking.

#### Deliverables

- [ ] Stage 4 — Extract (Haiku): SubConcept identification, USMLE mapping, LOD enrichment, dedup (0.92 threshold)
- [ ] Stage 5 — Dual-write (sync_status column pattern), Stage 6 — Review queue
- [ ] Review queue UI (`/generate?mode=review` placeholder, basic list for now)
- [ ] Course Outcomes screen (`/courses/[id]/outcomes`): LO CRUD, ILO/SLO, framework linking with typed relationships: `AT_BLOOM`, `MAPS_TO_COMPETENCY`, `ADDRESSES_LCME`, `MAPS_TO_EPA`, `MAPS_TO_UME`

#### Exit Criteria

- Upload → concepts extracted, LOD-enriched, dual-written
- Faculty manages LOs with typed framework relationships
- 50+ SubConcepts from test syllabi

---

### Sprint 6 — WorkbenchState + LangGraph.js + Basic Generation (Weeks 11–12)

**Goal:** WorkbenchState schema implemented. LangGraph.js pipeline produces a question.

#### Deliverables (updated references only)

- [ ] Agent registered: **`journey_generation`** (not `quest_generation`)
- [ ] Inngest events: **`journey/*`** namespace (not `quest/*`)
- [ ] Endpoint: **`POST /generate`** (not `POST /quest`)
- [ ] All other Sprint 6 deliverables unchanged from v2.2

---

### Sprint 7 — Full Workbench UI: Components + State Machine + ExtractedParams (Weeks 13–14)

**Goal:** Complete workbench frontend with context panel state machine, ExtractedParams, and all component scaffolding.

#### Deliverables

- [ ] Full workbench component tree: `<WorkbenchPage>`, `<SplitPane>`, `<ChatPanel>`, `<ContextPanel>`, `<ModeSwitcher>`, `<StageProgressOverlay>`
- [ ] Context views: `<SyllabusView>`, `<QuestionPreview>` (progressive rendering), `<BulkQueueView>` (placeholder), `<CoverageMapView>` (placeholder)
- [ ] Question sub-components: `<VignetteDisplay>`, `<StemDisplay>`, `<OptionRow>`, `<ToulminChain>`, `<SourceProvenance>`, `<ValidationSummary>`, `<DiffHighlight>`
- [ ] ExtractedParams: parse from chat, color-coded chips (Bloom=purple, Concept=green, Format=blue), editable
- [ ] Context panel state machine: auto-switch rules, pin behavior, reset on stage transition
- [ ] Frontend tool definitions (`useCopilotAction`): `switch_context_view`, `request_faculty_review`, `highlight_element`, `suggest_objective`
- [ ] Conversational refinement: faculty types feedback → re-run targeted nodes → diff highlighting

#### Performance Acceptance Criteria

| Metric | Target |
|--------|--------|
| Time to first chat token | < 500ms |
| Vignette streaming start | < 3s from compilation |
| Full question generation | < 45s |
| Context panel update | < 100ms from STATE_DELTA |
| SSE reconnection | < 2s |
| STATE_SNAPSHOT reconciliation | < 1s |

#### Exit Criteria

- Full component tree renders in design system (cream/white/parchment)
- ExtractedParams chips editable, propagate to backend
- Context panel auto-switches, respects pin
- Progressive rendering: question builds up incrementally
- All performance targets met

---

### Sprint 8 — USMLE Gap Detection + Dashboard + Coverage (Weeks 15–16)

**Goal:** Gaps identified. Faculty has a home base. Coverage visualization live.

#### Deliverables

- [ ] Graph centrality (PageRank + betweenness), weekly Inngest recalculation
- [ ] USMLE coverage calculation + priority score
- [ ] Gap detection heatmap (Recharts 16×7) — computed from axis nodes at query time
- [ ] USMLE_Topic drill-down: click cell → topic list → identify blind spots
- [ ] Nightly gap scan (Inngest `journey/gap.scan`)
- [ ] **Faculty Dashboard (`/dashboard`):** activity feed, generation stats, gap alerts, quick actions, course overview
- [ ] **CoverageMapView (D3):** force-directed SubConcept graph, colored by coverage, click gap node → generate

#### Exit Criteria

- Heatmap renders with real data
- Coverage map shows concept graph with gaps highlighted
- Gap-driven generation pre-fills workbench with concept

---

### Sprint 9 — SuperAdmin Polish + Tier 0 Hardening (Weeks 17–18)

**Goal:** SuperAdmin dashboard + institutions. Error handling, retry logic, error boundaries.

#### Exit Criteria (Tier 0 Gate)

| Criterion | Status |
|-----------|--------|
| Monorepo builds and deploys | ☐ |
| Design system applied to all screens | ☐ |
| Auth: SuperAdmin → waitlist → Admin → Faculty | ☐ |
| WorkbenchState synchronized via AG-UI over SSE | ☐ |
| Socket.io delivering notifications independently | ☐ |
| 1 question generated via workbench | ☐ |
| ExtractedParams chips functional | ☐ |
| Context panel state machine operational | ☐ |
| Progressive rendering in QuestionPreview | ☐ |
| USMLE gap detection + coverage map | ☐ |

---

## Tier 1: ECD Core (Months 5–12 / Sprints 10–24)

> **North Star:** 200+ approved. Critic Agent auto-handles 60%+.

### Sprint 10 — Full Pipeline: Nodes 1–3 (Context Compiler with ECD) (Weeks 19–20)

- [ ] Layer 4 graph schema: ProficiencyVariable, TaskShell, MisconceptionCategory. Dual assessment links: `ASSESSES → SLO` + `TARGETS → SubConcept` (R-027)
- [ ] context_compiler ECD sub-steps: Evidence Design → Task Family Selection → Instance Specification → Agentic RAG
- [ ] TaskShell library: 10–15 templates
- [ ] AG-UI events per sub-step

### Sprint 11 — Full Pipeline: Nodes 4–6 (Generation Core) (Weeks 21–22)

- [ ] vignette_builder (Sonnet, streamed via STATE_DELTA)
- [ ] stem_writer (Sonnet, NBME style)
- [ ] distractor_generator (Sonnet, Phase 1 reasoning + Phase 2 options, sequential emit)
- [ ] AG-UI interrupt (default ON) after options

### Sprint 12 — Pipeline: Nodes 7–9 (Tagger + Dedup + Validator) (Weeks 23–24)

- [ ] tagger (Haiku): Bloom, USMLE, difficulty, ACGME, EPA
- [ ] dedup_detector: Voyage embedding → pgvector HNSW (0.85 flag / 0.95 auto-reject)
- [ ] validator: 22 NBME rules + 8 extended = 30 total
- [ ] Self-correction: validation failure → re-invoke → up to 2 retries

### Sprint 13 — Critic Agent + Review Mode (Weeks 25–26)

- [ ] critic_agent (Opus): 6 metrics, composite score, routing
- [ ] review_router: auto_approve / auto_reject / faculty_review
- [ ] Review mode in workbench with approve/edit/reject actions
- [ ] Three automation modes: Full Auto, Checkpoints, Manual
- [ ] Generation logs with pipeline trace, timing, costs

### Sprint 14 — Batch Generation + BulkQueueView (Weeks 27–28)

- [ ] Inngest batch orchestration (up to 5 parallel)
- [ ] Per-item **STATE_DELTA via SSE (AG-UI)** updates `bulk_queue[i]` (not Socket.io)
- [ ] Socket.io delivers "batch complete" notification
- [ ] Bulk mode in workbench with BulkQueueView
- [ ] Gap-driven batch: select USMLE cells → batch generate

### Sprint 15 — Data Linting + Golden Dataset (Weeks 29–30)

- [ ] 9 KaizenML lint rules as Inngest jobs
- [ ] Data integrity admin screen
- [ ] Golden dataset: 50 items, nightly regression, alert on > 0.05 drop

### Sprint 16 — Generation History, Templates, Settings (Weeks 31–32)

- [ ] `/generate/history` — past sessions with metrics
- [ ] `/generate/templates` — reusable TaskShell configurations
- [ ] `/generate/settings` — automation level, interrupt preferences

### Sprint 17 — Legacy Import + Item Bank (Weeks 33–34)

- [ ] Pipeline C implementation
- [ ] Item bank (`/items`): filterable list, rich item editor, export

### Sprint 18 — Item Analytics + Tag Manager (Weeks 35–36)

- [ ] Per-item analytics page
- [ ] Tag management UI

### Sprint 19 — Notifications + Profile + Settings (Weeks 37–38)

- [ ] Socket.io-delivered notifications, bell icon, dropdown
- [ ] Profile management, settings page

### Sprint 20 — Course Students + Course Settings (Weeks 39–40)

- [ ] Student enrollment in courses
- [ ] Course settings management

### Sprint 21 — Faculty Onboarding + Help Docs (Weeks 41–42)

- [ ] Onboarding wizard: upload syllabus → watch extraction → generate first question → dashboard tour

### Sprints 22–24 — Testing, Polish, Faculty Pilot (Weeks 43–48)

- [ ] E2E tests: WorkbenchState sync, AG-UI events, context panel, review flow, batch flow
- [ ] Performance benchmarks against §5 targets
- [ ] Faculty pilot with real MSM course content

#### Exit Criteria (Tier 1 Gate)

| Criterion | Target |
|-----------|--------|
| Approved questions | ≥ 200 |
| Critic auto-handle rate | ≥ 60% |
| Pipeline reliability | ≥ 95% |
| Full generation time | < 45s |
| Cost per approved item | < $0.15 |
| Golden dataset quality | ≥ 0.85 |

---

## Tier 2: Psychometrics & Adaptive (Months 10–16 / Sprints 25–39)

> **North Star:** 500+ calibrated. ATA valid. Adaptive > static.

- **Sprint 25–26:** Python service (FastAPI) for IRT calibration + GNN training
- **Sprint 27–28:** Student app (Next.js 15): dashboard, practice launcher
- **Sprint 29–30:** Exam delivery: MIP solver, exam management
- **Sprint 31–32:** Adaptive practice: event-driven mastery, practice session UI
- **Sprint 33–34:** Agent working memory for adaptive sessions
- **Sprint 35–36:** Domain embeddings (fine-tuned), ONNX quantization, student course access
- **Sprint 37–38:** Advisor dashboard, admin dashboard, email notifications
- **Sprint 39:** LCME compliance, report builder, exam analytics
- StandardTerm + LOD enrichment lands here or earlier if Tier 1 time permits

---

## Tier 3: Consortium + AI (Months 16–24 / Sprints 40–56)

> **North Star:** 3+ institutions. GNN ≥ 70%. AUC > 0.80.

- Multi-institution: tenant isolation, cross-institution analytics, framework management
- GNN: hidden prerequisites, LCME gap prediction, student risk classification
- Fine-tuned models: domain-specific embedding, Claude fine-tune
- Topic modeling (BERTopic): TopicCluster, TopicProfile nodes
- Full admin portal with system monitoring

---

## Appendix A: LangGraph.js Node Files (unchanged from v2.2)

## Appendix B: Frontend Workbench Component Files (unchanged from v2.2)

## Appendix C: Technology Procurement (updated)

| Technology | Version | When | Notes |
|-----------|---------|------|-------|
| Voyage AI | voyage-large-2 | Sprint 4 | 1024-dim embeddings |
| All others | — | — | Unchanged from v2.2 |

## Appendix D: Key Risk Updates (unchanged from v2.2)

---

*This roadmap is a living document. Dates shift — exit criteria don't. References Architecture v10.0 and NODE_REGISTRY v1.0 as canonical schema authority.*
