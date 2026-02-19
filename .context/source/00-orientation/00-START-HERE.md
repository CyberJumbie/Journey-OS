# Journey OS — Developer Quickstart

**Read time:** 10 minutes  
**Purpose:** Get oriented on day one. Don't read 500K of docs — read this, then go deep when you need to.

---

## What Are We Building?

An AI-powered assessment platform for medical schools. Faculty upload syllabi → system extracts concepts → maps to USMLE/LCME frameworks → generates validated exam questions → tracks student mastery. Think "Duolingo meets USMLE, built on a knowledge graph."

Three jobs: (1) generate exam questions, (2) prove accreditation compliance, (3) predict at-risk students. All powered by the same Neo4j graph.

---

## The Stack

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | Next.js 15, React 19, CopilotKit | App Router, agent-aware UI |
| Backend | Express, LangGraph.js, Socket.io | Generation pipeline, real-time |
| AI | Claude (Haiku/Sonnet/Opus), Voyage AI | Generation, embeddings |
| Graph DB | Neo4j Aura | Curriculum structure, frameworks, mastery |
| SQL + Vectors | Supabase (PostgreSQL + pgvector) | Content, auth, embeddings, transactions |
| Background | Inngest | Batch jobs, ingestion, scheduled tasks |
| Psychometrics | Python FastAPI | IRT, GNN (Tier 2 only) |

---

## The Monorepo

```
journey-os/
├── apps/web/              # Next.js frontend
├── apps/server/            # Express + LangGraph.js + Socket.io
├── packages/shared-types/  # TypeScript interfaces (both apps import)
├── packages/ui/            # Design system (shadcn/Radix/Tailwind)
├── services/kg-seeder/     # Neo4j Cypher scripts (not TypeScript)
├── services/python-api/    # FastAPI for IRT/GNN (Tier 2)
├── services/data-linter/   # Inngest cron jobs
└── .context/               # Architecture docs (you're reading them)
```

Key rule: `packages/` = TypeScript, built by Turborepo. `services/` = everything else.

---

## The 5 Things You'll Get Wrong

1. **Neo4j labels are SCREAMING_SNAKE for frameworks.** `USMLE_System`, not `USMLESystem`. Check `NODE_REGISTRY_v1.md` every time.

2. **ILO and SLO are separate node types.** Not a single `LearningObjective` with a scope property. They have different authority models, lifecycles, and levels.

3. **Embeddings are 1024-dim, not 1536.** Model is Voyage AI `voyage-large-2`. Index type is HNSW.

4. **Relationships are typed.** `MAPS_TO_COMPETENCY`, `AT_BLOOM`, `ADDRESSES_LCME` — never bare `ALIGNS_TO`.

5. **Agent state streams over SSE (AG-UI), collaboration over Socket.io.** These are separate transports. Don't route STATE_DELTA through Socket.io.

---

## Reading Order

**Before you write any code:**
1. This quickstart (you're here)
2. `ARCHITECTURE_v10.md` §1–3 (what we build, data architecture, stack) — 15 min
3. `NODE_REGISTRY_v1.md` §1–2 (labels, relationships) — 10 min
4. `CODE_STANDARDS.md` §1–4 (MVC, OOP, Atomic Design rules) — 15 min
5. `CLAUDE_MD_TEMPLATE.md` (copy into `.claude.md` in repo root) — 5 min

**When you start your sprint:**
6. `ROADMAP_v2_3.md` — find your sprint, read deliverables + exit criteria
7. `ARCHITECTURE_v10.md` — read the section(s) relevant to your sprint
8. `SUPABASE_DDL_v1.md` or `API_CONTRACT_v1.md` — as needed for implementation

**You probably don't need to read** (until relevant):
- DESIGN_SPEC.md — 101K lines, reference when building UI
- Seeding Blueprint — reference when working on kg-seeder
- Colab Plan — reference when working on ingestion pipeline
- Reconciliation Tracker — reference when you want to know *why* a decision was made

---

## Sprint 1 Checklist

If you're starting Sprint 1, here's your minimal path:

1. Clone repo, `pnpm install && pnpm build`
2. Read `NODE_REGISTRY_v1.md` — you'll be creating every label and constraint listed there
3. Read `SEED_VALIDATION_SPEC_v1.md` — these are your acceptance tests
4. Write Cypher scripts in `services/kg-seeder/`
5. Run `pnpm kg:validate` — all checks must pass
6. Do the CopilotKit spike (see Roadmap Sprint 1 deliverables)

---

## Key Decisions Already Made

Don't re-debate these. They're settled with rationale in `reconciliation-tracker-resolved.md`:

- Deep hierarchy (8 levels), not flat
- Separate ILO/SLO nodes, not unified LearningObjective
- 14 pipeline nodes (11 gen + 3 review), including graph_writer
- Dual-write: Supabase first → Neo4j → sync_status column (not separate table)
- 800-token chunks, 100-token overlap
- 0.92 SubConcept dedup / 0.85-0.95 question dedup
- 6-field Toulmin (claim, data, warrant, backing, rebuttal, qualifier)
- Miller has 4 levels (not 5)
- `journey_generation` agent ID, `journey/*` Inngest events
- Course Director = permission flag on Faculty, not separate role
