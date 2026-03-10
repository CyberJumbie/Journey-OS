# CP-EPIC-2.4 — Data Quality + Faculty Trust (Weeks 15–16)
**Stories:** P2-018 · P2-019 · P2-020 · P2-021
**Auto-loaded by:** `/story P2-01N` where N = 8–21

---

## What This Epic Builds

Closes the quality loop. Faculty can verify AI-extracted content-concept mappings (TEACHES → TEACHES_VERIFIED). Automated nightly data linting detects sync drift and data integrity issues. A golden dataset of 25 verified items serves as a regression benchmark. Generation history gives faculty visibility into their productivity.

**Exit gate:** ≥ 60% auto-handled. ≥ 50 approved items. TEACHES_VERIFIED workflow operational. Zero broken sync states. Nightly linting running.

---

## Prerequisites

- Epic 2.1 complete: auto-routing and critic scores working
- Epic 2.2 complete: Inngest installed
- P1-013: SubConcepts extracted, TEACHES edges created
- P1-023: `generation_logs` table populated

---

## TEACHES vs TEACHES_VERIFIED Architecture

This is the canonical trust distinction in the system. **Never conflate them.**

| Relationship | Created by | Meaning | Used in |
|---|---|---|---|
| `TEACHES` | `ConceptExtractorNode` (AI) | "AI believes this chunk covers this concept" | Content indexing, embedding retrieval |
| `TEACHES_VERIFIED` | `POST /concept-mappings/:id/verify` (faculty) | "Faculty confirmed this mapping" | LCME evidence chains, compliance reporting (Phase 3+) |

The UI for this is `/courses/:id/concept-review` — a queue of pending TEACHES edges awaiting faculty action.

```cypher
-- TEACHES_VERIFIED creation (on faculty verify action)
MATCH (cc:ContentChunk {uuid: $chunkUuid})
MATCH (sc:SubConcept {uuid: $subConceptUuid})
MERGE (cc)-[:TEACHES_VERIFIED {
  verified_by: $facultyUuid,
  verified_at: datetime(),
  authority: 'FACULTY_CONFIRMED'
}]->(sc)

-- TEACHES rejection: remove the AI-asserted edge (keep TEACHES_VERIFIED if it existed)
MATCH (cc:ContentChunk {uuid: $chunkUuid})-[r:TEACHES]->(sc:SubConcept {uuid: $subConceptUuid})
DELETE r
```

---

## KaizenML: 5 Lint Rules

```typescript
// backend/src/inngest/data-lint.function.ts

const LINT_RULES = [
  {
    id: 'sync_status_drift',
    description: 'Supabase items with sync_status=failed',
    threshold: 5,
    query: `SELECT count(*) FROM assessment_items WHERE sync_status = 'failed'`,
  },
  {
    id: 'orphan_sub_concepts',
    description: 'Neo4j SubConcepts with no TEACHES edges',
    // Cypher: MATCH (sc:SubConcept) WHERE NOT ()-[:TEACHES]->(sc) RETURN count(sc)
    threshold: 0.10,  // 10% of total SubConcepts
  },
  {
    id: 'null_embeddings',
    description: 'ContentChunks with both voyage and openai embedding null',
    query: `SELECT count(*) FROM content_chunk_embeddings WHERE voyage_embedding IS NULL AND openai_embedding IS NULL`,
    threshold: 0,
  },
  {
    id: 'items_without_tags',
    description: 'Items older than 24h with null bloom_level',
    query: `SELECT count(*) FROM assessment_items WHERE bloom_level IS NULL AND created_at < now() - interval '24 hours'`,
    threshold: 0,
  },
  {
    id: 'stale_running_logs',
    description: 'generation_logs stuck in running > 2 hours',
    query: `SELECT count(*) FROM generation_logs WHERE status = 'running' AND created_at < now() - interval '2 hours'`,
    threshold: 0,
    remediation: `UPDATE generation_logs SET status = 'failed', error = 'stuck' WHERE status = 'running' AND created_at < now() - interval '2 hours'`,
  },
];
```

Rule 5 (`stale_running_logs`) auto-remediates — it updates the rows, not just reports.

---

## Generation History API Shape

```typescript
// GET /api/v1/generation-logs
// Response
interface GenerationLogRow {
  id: string;
  courseId: string;
  courseName: string;            // joined from courses table
  userMessage: string;           // first 80 chars
  autoRoute: 'auto_approve' | 'auto_reject' | 'faculty_review' | null;
  criticComposite: number | null;
  retryCount: number;
  durationMs: number;
  costUsd: number | null;        // if cost tracking implemented
  createdAt: string;
  itemStatus: 'approved' | 'rejected' | 'draft' | null;
  itemId: string | null;
}

// Stats aggregate
interface GenerationStats {
  period: 'month';
  totalGenerated: number;
  totalApproved: number;
  approvalRate: number;          // 0.0–1.0
  avgCriticScore: number | null;
  avgCostUsd: number | null;
}
```

---

## Golden Dataset Seed Logic

```typescript
// seeder/src/seed-golden-dataset.ts

// 1. Query top 25 approved items by critic score
const topItems = await supabase
  .from('assessment_items')
  .select('id, critic_composite_score')
  .eq('status', 'approved')
  .not('critic_composite_score', 'is', null)
  .gte('critic_composite_score', 4.0)
  .order('critic_composite_score', { ascending: false })
  .limit(25);

// 2. Insert into golden_dataset
await supabase.from('golden_dataset').insert(
  topItems.data.map(item => ({
    item_id: item.id,
    added_by: SEED_USER_ID,   // system seed user
    target_critic_min: 3.8,   // 0.2 below current score = tolerance
    notes: 'Auto-seeded from top Phase 1 approved items',
  }))
);
```

Note: If Phase 1 has fewer than 25 approved items with critic scores (possible if Epic 2.1 was just deployed), use whatever is available. Minimum viable golden dataset = 10 items.

---

## Concept Review Queue UI Spec

Route: `/courses/:id/concept-review`

Layout:
```
┌─────────────────────────────────────────────────────┐
│  Concept Mapping Review — MEDI 531 Organ Systems I   │
│  Progress: 12 of 47 mappings reviewed ██████░░░░░░   │
│                                                      │
│  [Verify All High Confidence] [Filter ▼]            │
├─────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────┐ │
│ │ "...atherosclerosis develops from endothelial... │ │  ← chunk excerpt (200 chars)
│ │  ...leading to plaque accumulation and..."       │ │
│ │                                                   │ │
│ │ ↓ TEACHES (confidence: 0.91) ████████████ HIGH   │ │  ← ConfidenceBadge
│ │                                                   │ │
│ │  SubConcept: Atherosclerosis Pathogenesis         │ │
│ │                                                   │ │
│ │        [✓ Verify]    [✗ Reject]                   │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ [Next Card] ...                                      │
└─────────────────────────────────────────────────────┘
```

ConfidenceBadge colors:
- Green: confidence ≥ 0.85
- Amber: 0.65–0.85
- Red: < 0.65

"Verify All High Confidence" button: sends PATCH for all pending mappings with confidence ≥ 0.85 in a single batch request.

---

## Admin Role: New Routes

```
GET  /api/v1/admin/lint-results       → kaizen_lint_runs (last 10, admin only)
POST /api/v1/admin/lint-run           → manually trigger lint (admin only)
GET  /api/v1/admin/golden-dataset     → golden dataset items + latest scores
POST /api/v1/admin/golden-run         → manually trigger regression
```

Auth middleware: `requireRole('admin')` — checks `auth.jwt() ->> 'role' = 'admin'`

---

## New Files (Epic 2.4)

```
backend/src/controllers/concept-mapping.controller.ts
backend/src/services/concept-mapping.service.ts
backend/src/repositories/concept-mapping.repository.ts
backend/src/routes/concept-mapping.routes.ts
backend/src/controllers/admin.controller.ts
backend/src/routes/admin.routes.ts
backend/src/inngest/data-lint.function.ts
backend/src/inngest/golden-regression.function.ts
seeder/src/seed-golden-dataset.ts
frontend/src/hooks/useConceptMappings.ts
frontend/src/hooks/useGenerationHistory.ts
frontend/src/components/atoms/ConfidenceBadge/ConfidenceBadge.tsx
frontend/src/components/atoms/ChunkExcerpt/ChunkExcerpt.tsx
frontend/src/components/organisms/ConceptMappingCard/ConceptMappingCard.tsx
frontend/src/components/molecules/HistoryRow/HistoryRow.tsx
frontend/src/app/(faculty)/courses/[id]/concept-review/page.tsx
frontend/src/app/(faculty)/history/page.tsx
backend/supabase/migrations/20250903000000_teaches_verifications.sql
backend/supabase/migrations/20250903000001_kaizen_golden.sql
```

---

## Smoke Tests

```bash
# 1. TEACHES_VERIFIED workflow
# GET concept mappings
curl "localhost:3001/api/v1/courses/medi-531/concept-mappings?limit=5" \
  -H "Authorization: Bearer $JWT"
# Expected: array with chunkExcerpt, subConceptName, confidence, status: 'pending'

# Verify one
curl -X PATCH "localhost:3001/api/v1/concept-mappings/{id}/verify" \
  -H "Authorization: Bearer $JWT" -d '{"action":"verify"}'

# Confirm Neo4j edge created
# MATCH ()-[:TEACHES_VERIFIED]->() RETURN count(*)  → > 0

# 2. Lint run
curl -X POST "localhost:3001/api/v1/admin/lint-run" -H "Authorization: Bearer $ADMIN_JWT"
curl "localhost:3001/api/v1/admin/lint-results" -H "Authorization: Bearer $ADMIN_JWT"
# Expected: 5 rules, each with passed: true|false, count, threshold

# 3. Generation history
curl "localhost:3001/api/v1/generation-logs?limit=10" -H "Authorization: Bearer $JWT"
# Expected: rows with courseId, userMessage, autoRoute, criticComposite

# 4. Golden dataset seed
pnpm seed:golden
psql $SUPABASE_DB_URL -c "SELECT count(*) FROM golden_dataset;"
# Expected: 10–25 rows (depends on how many approved items exist)
```

---

## Phase 2 Exit Gate Checklist

Run this at end of Week 16:

```bash
# Auto-handling rate ≥ 60%
psql $SUPABASE_DB_URL -c "
  SELECT
    auto_route,
    count(*) AS count,
    round(count(*) * 100.0 / sum(count(*)) OVER (), 1) AS pct
  FROM assessment_items
  WHERE auto_route IS NOT NULL
  GROUP BY auto_route;"
# Pass: auto_approve + auto_reject ≥ 60% of total

# ≥ 50 approved items
psql $SUPABASE_DB_URL -c "SELECT count(*) FROM assessment_items WHERE status = 'approved';"
# Pass: count ≥ 50

# TEACHES_VERIFIED count
# MATCH ()-[:TEACHES_VERIFIED]->() RETURN count(*)
# Pass: > 0

# Zero stale running logs
psql $SUPABASE_DB_URL -c "SELECT count(*) FROM generation_logs WHERE status = 'running' AND created_at < now() - interval '2 hours';"
# Pass: 0

# Nightly lint passing
psql $SUPABASE_DB_URL -c "SELECT rule_id, passed FROM kaizen_lint_runs WHERE run_at > now() - interval '25 hours';"
# Pass: all rules passed = true
```
