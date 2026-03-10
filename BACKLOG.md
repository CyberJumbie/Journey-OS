# Journey OS — BACKLOG.md

> Build top-to-bottom within each epic. Don't skip stories. Don't start Phase 2 before Phase 1 P0 stories are done.
> Reference docs: docs/stories/P1-XXX.md for full ACs | 06_SCREEN_BACKEND_MAP.md for API contracts

---

## § Ready to Build

### EPIC 1.1 — Infrastructure & Spike (Weeks 1–2)
Exit gate: Neo4j ~560 nodes. Supabase 9 tables + RLS. CopilotKit STATE_DELTA renders. JWT auth blocks unauthenticated requests.

| Rank | Story | Title | Priority | Score | Status |
|------|-------|-------|---------|-------|--------|
| 2 | P1-002 | Provision Neo4j Aura + Supabase + Vercel | P0 | 97% | ready |
| 3 | P1-003 | Environment config (.env + Zod validation + CI skeleton) | P0 | 95% | ready |
| 4 | P1-007 | shared-types package (Zod schemas + WorkbenchState) | P0 | 93% | ready |
| 5 | P1-004 | Supabase DDL Phase 1 (9 tables + RLS + pgvector HNSW) | P0 | 92% | ready |
| 6 | P1-005 | Neo4j Layer 1 seed — institutional hierarchy (~65 nodes) | P0 | 90% | ready |
| 7 | P1-006 | Neo4j Layer 2 seed — framework nodes (~492 nodes) | P0 | 89% | ready |
| 8 | P1-008 | CopilotKit + LangGraph.js integration spike | P0 | 86% | ready |

> ⚠️ Gate: If P1-008 fails → create P1-008b (custom SSE fallback) before starting Epic 1.2.

### EPIC 1.2 — Single Course Ingestion (Weeks 3–4)
Exit gate: MEDI 531 syllabus parsed → chunked → embedded → ~50–200 SubConcepts in Neo4j with MAPS_TO. sync_status = 'synced'.

| Rank | Story | Title | Priority | Score | Status |
|------|-------|-------|---------|-------|--------|
| 9 | P1-009 | File upload endpoint (Supabase Storage, WORM) | P0 | 84% | blocked: P1-004 |
| 10 | P1-014 | DualWriteService (Supabase-first, Neo4j-second, sync_status) | P0 | 83% | blocked: P1-004 |
| 11 | P1-010 | PDF syllabus parser (pdfplumber + multi-column handling) | P0 | 82% | blocked: P1-009 |
| 12 | P1-011 | Semantic chunker (800 tokens, 100 overlap, tiktoken) | P0 | 80% | blocked: P1-010 |
| 13 | P1-012 | Embedding service (Voyage AI voyage-large-2, 1024-dim) | P0 | 79% | blocked: P1-011 |
| 14 | P1-013 | AI concept extraction (Haiku → SubConcepts + TEACHES edges) | P0 | 78% | blocked: P1-012 |
| 15 | P1-015 | Framework alignment (SubConcept → USMLE via MAPS_TO) | P1 | 74% | blocked: P1-013 |

### EPIC 1.3 — Generation Pipeline (Weeks 5–6)
Exit gate: Faculty message → pipeline runs → question appears with streaming. AssessmentItem persisted in Supabase + Neo4j.

| Rank | Story | Title | Priority | Score | Status |
|------|-------|-------|---------|-------|--------|
| 16 | P1-016 | LangGraph.js StateGraph scaffold on Express | P0 | 72% | blocked: P1-008 |
| 17 | P1-017 | init node (load session + course context) | P0 | 71% | blocked: P1-016 |
| 18 | P1-018 | context_compiler node (Graph RAG + Vector RAG + RRF) | P0 | 70% | blocked: P1-017 |
| 19 | P1-019 | vignette_builder node (Sonnet, STATE_DELTA streaming) | P0 | 69% | blocked: P1-018 |
| 20 | P1-020 | stem_writer node (Sonnet, NBME-style lead-in) | P0 | 68% | blocked: P1-019 |
| 21 | P1-021 | distractor_generator node (Sonnet, 5 options + rationale) | P0 | 67% | blocked: P1-020 |
| 22 | P1-022 | validator node (10 of 30 NBME structural rules, rule-based) | P0 | 66% | blocked: P1-021 |
| 23 | P1-023 | graph_writer node (DualWrite AssessmentItem + TARGETS edge) | P0 | 65% | blocked: P1-022 |

### EPIC 1.4 — Workbench MVP (Weeks 7–8)
Exit gate: Faculty logs in → selects MEDI 531 → asks for question → gets streamed NBME item → approves → item persists.

| Rank | Story | Title | Priority | Score | Status |
|------|-------|-------|---------|-------|--------|
| 24 | P1-024 | Auth flow (Supabase Auth + JWT + role middleware + login UI) | P0 | 64% | blocked: P1-004 |
| 25 | P1-025 | Course selection screen (wire existing prototype) | P0 | 63% | blocked: P1-024 |
| 26 | P1-026 | QuestWorkbench — CopilotKit chat panel (REWRITE) | P0 | 62% | blocked: P1-023 |
| 27 | P1-027 | Question preview right panel (progressive render via STATE_DELTA) | P0 | 61% | blocked: P1-026 |
| 28 | P1-028 | Approve/Reject buttons (PATCH /api/v1/items/:id, dual-write status) | P0 | 60% | blocked: P1-027 |
| 29 | P1-029 | Basic question bank view (wire /repository prototype screen) | P1 | 55% | blocked: P1-028 |

---

## § Phase 2 — Quality Engine (Weeks 9–16)
Activate only after all Phase 1 P0 stories are done.

| Epic | Stories | Exit Gate |
|------|---------|-----------|
| 2.1 Pipeline Completion (Wks 9–10) | P2-001 tagger, P2-002 dedup_detector, P2-003 full validator (30 rules), P2-004 critic_agent (Opus), P2-005 review_router, P2-006 self-correction | Full 14-node pipeline. Critic scores every item. Auto-routing works. |
| 2.2 Review Mode + Bulk (Wks 11–12) | P2-007 review mode pipeline, P2-008 review UI, P2-009 conversational refinement, P2-010 bulk via Inngest, P2-011 bulk UI, P2-012 Socket.io | Faculty can refine questions conversationally. 20+ bulk items generated. |
| 2.3 ECD + TaskShells (Wks 13–14) | P2-013 seed TaskShells, P2-014 ProficiencyVariable, P2-015 Toulmin generation, P2-016 ECD context_compiler sub-steps, P2-017 relationships | Every item has Toulmin JSONB. Generation uses TaskShell templates. |
| 2.4 Data Quality (Wks 15–16) | P2-018 TEACHES_VERIFIED workflow, P2-019 data linter, P2-020 golden dataset regression, P2-021 faculty dashboard | ≥60% items auto-approved. Faculty trusts output for real exams. |

---

## § Phases 3–5 (Epic-Level Only)
| Phase | Consumer | Proves | Key Epics |
|-------|---------|--------|-----------|
| 3: Coverage Map (Wks 17–24) | Course Director | Institutional intelligence | USMLE 16×7 heatmap, LCME 12×93 compliance, SLO extraction, all 9 courses ingested |
| 4: Item Bank + Exams (Wks 25–32) | Faculty + Director | Assessment instruments | MIP solver exam assembly, item bank management, real exam delivered |
| 5: Student Experience (Wks 33–48) | Students + Advisors | Closed loop | BKT mastery tracking, adaptive practice, at-risk detection, advisor dashboard |

---

## § In Progress
| Story | Title | Branch | Started |
|-------|-------|--------|---------|
| *(empty — run /next to start)* | | | |

---

## § Done
| Story | Title | Version | PR | Deployed |
|-------|-------|---------|-----|---------|
| P1-001 | Monorepo scaffold (Turborepo + pnpm workspaces) | v0.1.0 | — | local |

---

## § Blocked
| Story | Blocked By | Decision Needed |
|-------|-----------|----------------|
| P1-008b | P1-008 outcome | If CopilotKit spike fails: build custom SSE fallback? |

---

## § Idea Inbox
*(Run `/idea "your idea"` to add — validated against roadmap before entering)*

---

## Stats
```
Phase 1 total:   29 stories (25 P0 + 4 P1)
Ready now:        7 stories (Epic 1.1 — P1-002 next)
Blocked:         21 stories (waiting on Epic 1.1 gates)
Done:             1 stories (P1-001)
In progress:      0 stories
Phase 2+:        ~75 stories (epic-level, not yet decomposed)
```
