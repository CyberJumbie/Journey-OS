# P1-XXX: [Story Title]

**Epic:** 1.X — [Epic Name]
**Priority:** P0 | P1
**Points:** [1–8]
**Status:** ready | in-progress | done
**Depends on:** [P1-YYY, P1-ZZZ | none]

---

## Story

As a **[role: faculty | course_director | superadmin]**,
I want **[capability]**,
so that **[outcome — user value in 2 minutes]**.

---

## Acceptance Criteria

- [ ] **AC1:** [Specific, verifiable, written as behavior — not implementation]
- [ ] **AC2:** [...]
- [ ] **AC3:** [...]
- [ ] **AC4:** [If needed]

---

## Vertical Slice

| Layer | Change |
|-------|--------|
| **DB** | [Supabase: migration/table change] + [Neo4j: seed/node/edge] |
| **API** | [Express route(s) added or modified] |
| **Frontend** | [Prototype screen wired at apps/web/...] OR [N/A — backend only] OR [REWRITE: QuestWorkbench] |
| **Tests** | [Integration test file] + [smoke test command] |

---

## Prototype Contract

**Screen:** `apps/web/src/app/[screen-path]/page.tsx`
**Mock location:** `[file:line — where the setTimeout mock lives]`
**Endpoint:** `[METHOD /api/v1/...]`
**Response shape:**
```typescript
// Expected TypeScript interface (from 06_SCREEN_BACKEND_MAP.md)
interface [ResponseType] {
  // fields
}
```
*If no prototype screen: N/A — this is a backend/infra story.*

---

## Solution Docs to Check First

- `SOL-001` — dual-write-service-pattern [if this story writes to both DBs]
- `SOL-002` — neo4j-merge-idempotent [if this story writes Neo4j nodes]
- `SOL-003` — supabase-rls-policy [if this story creates a new table]
- `SOL-004` — voyage-ai-embedding-retry [if this story calls Voyage AI]
- `SOL-005` — express-mvc-skeleton [if this story adds Express routes]

---

## Slim Context to Load

- `.context/entities.yaml` — [if new entities are introduced]
- `.context/relationships.yaml` — [if new relationships are introduced]
- `.context/routes.yaml` — [if new routes are added]
- `.context/pipeline.yaml` — [if pipeline nodes are involved]

---

## Out of Scope (explicitly deferred)

- [Thing that looks related but is in a different story]
- [Phase 2 capability that might seem natural to add here]

---

## Demo Script (2-minute check)

How to verify this story is done from Dr. Osei's perspective:
1. [Step 1 — what to open or call]
2. [Step 2 — what to see or check]
3. [Step 3 — confirm the outcome]
