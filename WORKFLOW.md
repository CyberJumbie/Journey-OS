# Journey OS — Agentic Development Workflow

> **The only law:** Every story must make something measurably better for
> Dr. Amara Osei today. If you can't demo it to a real MSM faculty member
> in 2 minutes, it's not done.

---

## Build Loop (every story, every time)

```
/story [P1-XXX]    Load slim context. Read ACs. Map prototype screen. Check solution docs.
       │           Identify unknowns. Answer them from .context/ or /design-query.
       │
/plan              Write layer-mapped plan (DB → API → Frontend → Test).
       │           STOP. Wait for approval. No code until approved.
       │  [approved]
/implement         Execute plan step by step. Verify each step.
       │           At 70% context: /checkpoint → clear context → resume.
/verify            typecheck + lint + build + story-specific smoke test.
       │           ALL must pass. Zero errors. Zero warnings.
       │  [all pass]
/review            Grep-based layer constraint audit + 10-rule check + prototype contract.
       │  [approved]
/compound          THE LEARNING ENGINE. Extract patterns → solution docs → update CLAUDE.md
       │           "Things Claude Gets Wrong" → update .context/ slim files → update
       │           SESSION_STATE.md → mark done in BACKLOG.md → WIP commit.
       │           This is what makes story 20 faster than story 1.
/commit            Push feat/P1-XXX branch. Open PR to dev with full description.
       │
/codereview [PR]   Structured review: AC coverage + all 10 rules. APPROVE or REQUEST CHANGES.
       │  [approved + merged to dev]
/commit --prod     Squash-merge dev → main. Version tag.
       │
/deploy            Staging gate → human confirmation → production smoke test.
       │
/clear             Write SESSION_STATE.md. Push state. Reset context.
```

---

## The Slim Context Layer

Never load full reference docs into the main context window (40–80K tokens each).
Load the slim layer instead (~1.2K tokens per file):

```
.context/
  entities.yaml      # "EntityName: one-line description"  (60 lines max)
  relationships.yaml # "REL_NAME: From → To (cardinality)"
  routes.yaml        # "METHOD /path — description [auth:role]"
  components.yaml    # "Name: type, variants, used_in_screens"
  pipeline.yaml      # "node_name: input → output (model)"
  stack.yaml         # Tech stack + conventions
```

When you need something deeper: `/design-query "question"` — subagent reads the reference doc and returns only the answer (~200 tokens). Not the full doc (40,000+ tokens).

---

## Solution Documents (docs/solutions/)

Every story generates knowledge. /compound captures it.

```
docs/solutions/
  index.yaml            # "SOL-NNN: pattern name | P1-XXX"
  SOL-001-dual-write-service.md
  SOL-002-neo4j-merge-pattern.md
  SOL-003-supabase-rls-policy.md
  ...
```

**Rule:** Before writing any code, check docs/solutions/ index for applicable patterns.
**Rule:** /compound must run after every story. No exceptions. This is how the factory learns.

---

## SESSION_STATE.md (repo root, max 40 lines)

Replaces the need to re-load context at the start of each session.
Written by /compound and /clear. Read at session start via /status.

Contains only: current story + phase + last 3 done + next-ready queue.
Never grows — it's a dashboard, not a log.

---

## Story Anatomy (vertical slice — every story has all 4 layers)

```markdown
## Vertical Slice
DB Layer:       [Supabase migration | Neo4j seed/write | both | N/A]
API Layer:      [Express route + controller + service + repository]
Frontend Layer: [Prototype screen wired | CopilotKit config | N/A]
Test Layer:     [Integration test | smoke test | graph count check]
```

A story that only touches one layer is probably too granular. Combine with a neighbor.
Exception: pure infra stories (P1-001, P1-002, P1-003) are legitimately backend-only.

---

## Source of Truth (lower number wins when docs contradict)

| # | Document | Controls |
|---|----------|---------|
| 1 | NODE_REGISTRY (packages/shared-types/) | Neo4j labels, relationships, properties |
| 2 | SUPABASE_DDL (apps/server/supabase/migrations/) | Tables, columns, indexes, RLS |
| 3 | CLAUDE.md (.claude/CLAUDE.md) | Project constitution, 10 rules, workflow |
| 4 | Story files (docs/stories/P1-XXX.md) | Acceptance criteria, prototype screen |
| 5 | 06_SCREEN_BACKEND_MAP.md | TypeScript data contract per screen |
| 6 | 04_TECHNICAL_CONTEXT.md | Stack, patterns, layer constraints |
| 7 | 02_DEVELOPMENT_ROADMAP.md | Phase scope, epic exit criteria |
| 8 | 05_GAP_ANALYSIS.md | Design decisions from prior conversations |

---

## The 50/50 Rule

50% of engineering time builds features.
50% improves the factory: refining CLAUDE.md, writing solution docs, sharpening slim context files, improving story templates, writing smoke test scripts.

By story 20, you move at 3× the speed of story 1. That's the 50/50 rule compounding.

---

## Git Branch Strategy

```
main              ← production. Protected. Deploy only via /deploy. Tagged on release.
dev               ← integration. Feature branches merge here via PR. Never force-push.
feat/P1-XXX-name  ← per-story. Branch from dev. PR target: dev. Deleted after merge.
```

Commit format (Conventional Commits):
```
feat(P1-XXX): imperative present tense summary

Body: WHAT and WHY.

Story: P1-XXX | ACs met: AC1, AC2, AC3 | Layer violations: none | TypeScript: clean
```

---

## Context Management Protocol

| Session state | Action |
|--------------|--------|
| 70% context | /checkpoint → clear context → resume (SESSION_STATE.md survives) |
| Story complete | /compound → /commit → /clear |
| Session end | /clear (writes SESSION_STATE.md) |
| Session start | /status (reads SESSION_STATE.md) → /next or /story P1-XXX |

---

## Prototype Wiring Protocol

89 components / 107 routes run on setTimeout mock data.
Find the mock → match its TypeScript shape → replace setTimeout with real fetch.
Never change the component's expected data shape. Never rebuild a component.
One exception: QuestWorkbench is a full rewrite (form → CopilotKit conversational).

---

## Definition of Done

Story: All ACs verified. Typecheck clean. Lint clean. Build clean. Smoke test passes.
Layer constraints verified. DualWriteService used. /compound run. PR merged to dev.

Epic: All stories done. Epic exit criteria met. End-to-end demo with real data.

Phase: All P0 stories done. Dr. Osei can use the Phase 1 primary feature.
