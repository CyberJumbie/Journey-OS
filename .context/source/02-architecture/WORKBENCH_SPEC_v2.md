# Journey OS Generation Workbench — Technical Specification v2.0

**Product:** Journey OS  
**Module:** Split-Screen Generation & Review Workbench  
**Institution:** Morehouse School of Medicine (MSM)  
**Version:** 2.0  
**Date:** February 19, 2026  
**Status:** Specification — Ready for Implementation  
**Reconciliation:** All conflicts resolved per Reconciliation Tracker (R-001–R-041)  
**Reference:** Architecture v10.0, NODE_REGISTRY v1.0

---

## Changelog (v1.0 → v2.0)

| Change | Reconciliation | Description |
|--------|---------------|-------------|
| Product branding | R-011 | "QUEST" → "Journey OS" throughout. Title, agent ID, events, endpoints, component names. |
| Agent ID | R-038 | `quest_generation` → `journey_generation` |
| Inngest events | R-011 | `quest/*` → `journey/*` |
| Endpoint | R-011 | `POST /quest` → `POST /generate` |
| Python/FastAPI note removed | R-036 | Reconciliation note deleted. Spec now directly references LangGraph.js on Express. |
| Role model | R-023 | "Course Director" is a permission flag (`is_course_director`) on Faculty, not a separate role. 5 roles: superadmin, institutional_admin, faculty, advisor, student. |
| Header color | R-039 | TopBar: white background per design system (not dark). |
| Pipeline nodes | R-003 | 10 → 11 generation + 3 review = 14 total. graph_writer confirmed. |
| Node labels | R-004 | SCREAMING_SNAKE for framework labels throughout. |
| Assessment links | R-027 | Dual link: AssessmentItem → ASSESSES → SLO + TARGETS → SubConcept |
| Toulmin fields | R-030 | 5 → 6 fields: added `data` and `qualifier` |
| Transport | R-024 | Bulk STATE_DELTA via SSE (AG-UI), not Socket.io. |

---

## 1. Executive Summary

### 1.1 What This Document Specifies

The Journey OS Generation Workbench is the primary interface for faculty to generate, review, and refine AI-powered medical assessment items. It uses a split-screen layout where the left panel is always a conversational chat interface and the right panel is a context-aware display. The system is powered by a LangGraph.js generation pipeline (14 nodes: 11 generation + 3 review) communicating with the frontend through the AG-UI protocol via CopilotKit.

### 1.2 Core Design Principle

**One screen, three modes.** The same split-screen UI serves generation, bulk generation, and review. All modes route through `/generate`.

### 1.3 Protocol Stack

| Layer | Protocol | Role |
|-------|----------|------|
| Agent-User | AG-UI (CopilotKit) over SSE | Real-time state streaming |
| Agent-Tools/Data | MCP (Anthropic) | Neo4j + Supabase access |
| Agent-Agent | A2A (Google) | Future: multi-agent |
| Orchestration | LangGraph.js (Express) | 14-node pipeline |
| Background | Inngest | Batch orchestration (`journey/*` events) |
| Frontend SDK | CopilotKit | useCoAgent, useCopilotAction, CopilotChat |

### 1.4 Key Identifiers

| Identifier | Value |
|------------|-------|
| Agent ID | `journey_generation` |
| Inngest event prefix | `journey/` |
| Primary endpoint | `POST /api/v1/generate` |
| Route | `/generate` (with `?mode=generate|bulk|review`) |

---

## 2–5. Architecture, AG-UI Protocol, Shared State, Event Mapping

*See Architecture v10.0 §5 for complete WorkbenchState schema, AG-UI event flow, and component tree. These sections are now maintained in the architecture document as the single source of truth.*

**Key changes from v1.0:**

- WorkbenchState `ToulminArgument` now has 6 fields: `claim`, `data`, `warrant`, `backing`, `rebuttal`, `qualifier`
- `QuestionDraft.status` enum unchanged
- Agent ID: `journey_generation` (was `quest_generation`)

---

## 6. Frontend Specification

### 6.1 Header

```
┌─────────────────────────────────────────────────────────────┐
│  [☰] Journey OS    [Generate | Bulk | Review]    [🔔] [👤] │
│  ───────────────────────────────────────────────────────────│
│  Background: #ffffff (white, per design system)             │
│  NOT dark. Frosted glass effect on scroll.                  │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Split Panel

45% left (chat) / 55% right (context). Resizable via drag handle. Both panels: white (`#ffffff`) surface.

### 6.3 Role-Based Access

| Feature | Faculty | Faculty (Course Director) | Institutional Admin |
|---------|---------|--------------------------|---------------------|
| Generate single | ✅ | ✅ | ✅ |
| Generate bulk | ❌ | ✅ | ✅ |
| Review queue management | ❌ | ✅ | ✅ |
| SLO → ILO mapping approval | ❌ | ✅ | ✅ |
| Template management | ✅ | ✅ | ✅ |

"Course Director" is `is_course_director: true` on the user profile, not a separate role in the auth system.

---

## 7. LangGraph Backend Specification

### 7.1 Pipeline Nodes (14 total)

**Generation (11):**

| # | Node | Model | Emits |
|---|------|-------|-------|
| 1 | `init` | — | STATE_SNAPSHOT |
| 2 | `context_compiler` | Haiku (refiner) | TEXT_MESSAGE (narration), STATE_DELTA (PV, TaskShell) |
| 3 | `vignette_builder` | Sonnet | STATE_DELTA (vignette, streamed), TEXT_MESSAGE |
| 4 | `stem_writer` | Sonnet | STATE_DELTA (stem) |
| 5 | `distractor_generator` | Sonnet | STATE_DELTA (options, sequential), TEXT_MESSAGE |
| 6 | `tagger` | Haiku | STATE_DELTA (tags) |
| 7 | `dedup_detector` | Voyage AI | STATE_DELTA (dedup result), TEXT_MESSAGE if flagged |
| 8 | `validator` | Rule-based + Sonnet | STATE_DELTA (validation_results) |
| 9 | `critic_agent` | Opus | STATE_DELTA (critic_scores) |
| 10 | `graph_writer` | — | Dual-write to Neo4j + Supabase. STATE_DELTA (id, sync) |
| 11 | `review_router` | Rule-based | Routes: auto_approve / auto_reject / faculty_review |

**Review (3):**

| # | Node | Purpose |
|---|------|---------|
| 12 | `load_review_question` | Load question + graph context from DB |
| 13 | `apply_edit` | Re-invoke targeted node with faculty edit constraints |
| 14 | `revalidate` | Re-validate affected rules only |

### 7.2 graph_writer — Dual Write Detail

1. Supabase: INSERT/UPDATE `assessment_items` (vignette, stem, status, toulmin JSONB, critic_scores, sync_status: "pending")
2. Supabase: INSERT `options` (5 rows per item)
3. Supabase: INSERT `question_embeddings` (1024-dim Voyage embedding)
4. Neo4j: CREATE `(:AssessmentItem)` skinny node
5. Neo4j: CREATE `(:AssessmentItem)-[:ASSESSES]->(:SLO)` (primary coverage link)
6. Neo4j: CREATE `(:AssessmentItem)-[:TARGETS]->(:SubConcept)` (secondary analytics link)
7. Neo4j: CREATE `(:AssessmentItem)-[:AT_BLOOM]->(:BloomLevel)`
8. Neo4j: CREATE `(:AssessmentItem)-[:AT_MILLER]->(:MillerLevel)`
9. Neo4j: CREATE `(:AssessmentItem)-[:INSTANTIATES]->(:TaskShell)`
10. Neo4j: CREATE `(:AssessmentItem)-[:SOURCED_FROM]->(:ContentChunk)` per source
11. Neo4j: CREATE `(:Option)-[:TARGETS_MISCONCEPTION]->(:MisconceptionCategory)` per distractor
12. Supabase: UPDATE `assessment_items` SET sync_status = "synced"

---

## 8–10. Generation Flows

### Single Generation
Faculty types in chat → pipeline runs 11 nodes → question appears in right panel → review actions.

### Bulk Generation
Faculty configures batch → Inngest `journey/batch.requested` → fan-out (up to 5 parallel) → per-item **STATE_DELTA via SSE (AG-UI)** updates `bulk_queue[i]` → Socket.io delivers `journey/batch.complete` notification when all items finish.

### Review Flow
Faculty opens `/generate?mode=review&id=xxx` → `load_review_question` → full context in right panel → Approve / Edit / Reject.

---

## 14. Inngest Integration

| Event | Trigger | Handler |
|-------|---------|---------|
| `journey/batch.requested` | Faculty starts bulk | Fan-out orchestrator |
| `journey/batch.item.generate` | Per-item in batch | Single pipeline run |
| `journey/batch.complete` | All items done | Socket.io notification |
| `journey/content.uploaded` | File upload | Ingestion pipeline |
| `journey/gap.scan` | Nightly cron | Gap detection + alerts |
| `journey/lint.run` | Nightly cron | Data quality checks |
| `journey/regression.run` | Nightly cron | Golden dataset check |

---

## 19. API Contracts

See API_CONTRACT_v1.md for complete endpoint specifications. Key workbench endpoints:

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/generate` | POST | faculty | Single generation (SSE response) |
| `/api/v1/generate/bulk` | POST | faculty (course_director) | Batch generation |
| `/api/v1/generate/batch/:id` | GET | faculty | Batch status |
| `/api/v1/generate/history` | GET | faculty | Generation history |
| `/api/v1/items/:id/review` | POST | faculty | Review action |

---

## 21. Security & Access Control

Five roles (unchanged): superadmin, institutional_admin, faculty, advisor, student.

`is_course_director` boolean on `user_profiles` table grants additional permissions for bulk generation, review queue management, and SLO→ILO mapping approval. This is NOT a separate role — it's a permission flag checked in middleware.

---

## 23. Testing Strategy

### 23.1 Unit Tests
Pipeline node isolation: mock MCP servers, verify STATE_DELTA emissions per node.

### 23.2 Integration Tests
Full pipeline: seed test data → run pipeline → verify Supabase + Neo4j state.

### 23.3 E2E Tests
**Playwright** for E2E tests in CI/CD. Test flows: generate, review, bulk.
**Puppeteer MCP** is Claude Code's visual verification tool, not a test framework.

---

*This specification is the complete technical reference for the Journey OS Generation Workbench. It references Architecture v10.0 for shared state schema and NODE_REGISTRY v1.0 for all graph labels. When in conflict, Architecture v10.0 wins for system-level decisions.*
