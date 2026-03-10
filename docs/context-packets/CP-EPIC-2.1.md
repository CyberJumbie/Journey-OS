# CP-EPIC-2.1 — Pipeline Completion (Weeks 9–10)
**Stories:** P2-001 · P2-002 · P2-003 · P2-004 · P2-005 · P2-006
**Auto-loaded by:** `/story P2-00N` where N = 1–6

---

## What This Epic Builds

Completes the LangGraph.js pipeline from 7 nodes (Phase 1) to 14 nodes. Adds automatic quality assessment via Critic Agent (Opus), deduplication, full 30-rule NBME validation, automatic routing, and self-correction retries.

**Full 14-node pipeline after this epic:**
```
init → context_compiler → vignette_builder → stem_writer →
distractor_generator → dedup_detector → validator →
critic_agent → tagger → toulmin_generator → review_router
(+ 3 review-mode nodes added in Epic 2.2)
```

**Exit gate:** Full pipeline operational. Critic Agent scores every item. Auto-routing routes ≥ 60% of items without faculty intervention. Zero broken pipeline states.

---

## Prerequisites (must be done in Phase 1)

- P1-021: `distractor_generator` node exists and produces 5 options
- P1-022: `validator` node exists with 10 rules
- P1-023: `graph_writer` node exists, items persisted in both DBs
- P1-012: EmbeddingService exists with dual-provider (voyage + openai)
- Phase 2 migration run: `pnpm migrate` in backend

---

## Phase 2 SQL Migration (run once before building any P2 story)

```sql
-- backend/supabase/migrations/20250901000000_phase2_tables.sql

-- ── Tags columns on assessment_items ─────────────────────────────────────────
ALTER TABLE assessment_items
  ADD COLUMN bloom_level         INTEGER,          -- 1–6 (was estimated in Phase 1, now set by tagger)
  ADD COLUMN usmle_system        TEXT,             -- matches USMLE_System node name exactly
  ADD COLUMN usmle_discipline    TEXT,             -- matches USMLE_Discipline node name
  ADD COLUMN difficulty          INTEGER,          -- 1–5
  ADD COLUMN acgme_domain        TEXT,
  ADD COLUMN epa_number          TEXT,
  ADD COLUMN tags_generated_at   TIMESTAMPTZ,
  ADD COLUMN validation_results  JSONB,            -- array of {rule, passed, message}
  ADD COLUMN validation_passed   BOOLEAN,
  ADD COLUMN dedup_similarity    FLOAT,            -- 0.0–1.0, cosine to nearest neighbor
  ADD COLUMN dedup_status        TEXT DEFAULT 'pending', -- 'pass' | 'flag' | 'auto_reject' | 'skipped'
  ADD COLUMN dedup_item_id       UUID,             -- nearest neighbor item id
  ADD COLUMN critic_clinical_accuracy    FLOAT,    -- 1.0–5.0
  ADD COLUMN critic_vignette_realism     FLOAT,
  ADD COLUMN critic_distractor_quality   FLOAT,
  ADD COLUMN critic_bloom_alignment      FLOAT,
  ADD COLUMN critic_nbme_compliance      FLOAT,
  ADD COLUMN critic_educational_value    FLOAT,
  ADD COLUMN critic_composite_score      FLOAT,    -- average of 6 metrics
  ADD COLUMN critic_reasoning            TEXT,
  ADD COLUMN auto_route          TEXT,             -- 'auto_approve' | 'auto_reject' | 'faculty_review'
  ADD COLUMN rejection_reason    TEXT,
  ADD COLUMN toulmin             JSONB,            -- {claim, data, warrant, backing, rebuttal, qualifier}
  ADD COLUMN task_shell_id       UUID;             -- FK to task_shells table

-- ── generation_logs Phase 2 columns ──────────────────────────────────────────
ALTER TABLE generation_logs
  ADD COLUMN retry_count         INTEGER DEFAULT 0,
  ADD COLUMN critic_input_tokens  INTEGER,
  ADD COLUMN critic_output_tokens INTEGER,
  ADD COLUMN task_shell_id       UUID;

-- ── Assessment item embeddings (dedup detection) ──────────────────────────────
CREATE TABLE assessment_item_embeddings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID NOT NULL REFERENCES assessment_items(id) ON DELETE CASCADE,
  voyage_embedding  vector(1024),
  voyage_model      TEXT DEFAULT 'voyage-large-2',
  openai_embedding  vector(1536),
  openai_model      TEXT DEFAULT 'text-embedding-3-small',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id)
);

CREATE INDEX idx_item_voyage_hnsw ON assessment_item_embeddings
  USING hnsw (voyage_embedding vector_cosine_ops) WITH (m=16, ef_construction=64);
CREATE INDEX idx_item_openai_hnsw ON assessment_item_embeddings
  USING hnsw (openai_embedding vector_cosine_ops) WITH (m=16, ef_construction=64);

-- ── Task shells ────────────────────────────────────────────────────────────────
CREATE TABLE task_shells (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shell_id          TEXT UNIQUE NOT NULL,   -- TS-001 through TS-012
  name              TEXT NOT NULL,
  bloom_min         INTEGER NOT NULL,
  bloom_max         INTEGER NOT NULL,
  vignette_required BOOLEAN DEFAULT true,
  option_count      INTEGER DEFAULT 5,
  distractor_strategy TEXT,
  neo4j_node_id     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── Proficiency variables ──────────────────────────────────────────────────────
CREATE TABLE proficiency_variables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  sub_concept_id  UUID REFERENCES assessment_items(id),  -- conceptual FK (no strict constraint)
  neo4j_node_id   TEXT,
  sync_status     TEXT DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Item versions (review mode history) ──────────────────────────────────────
CREATE TABLE assessment_item_versions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          UUID NOT NULL REFERENCES assessment_items(id) ON DELETE CASCADE,
  vignette         TEXT,
  stem             TEXT,
  options          JSONB,
  edit_instruction TEXT,
  edited_by        UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ── Bulk batches ───────────────────────────────────────────────────────────────
CREATE TABLE bulk_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       UUID NOT NULL,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  total_count     INTEGER NOT NULL,
  completed_count INTEGER DEFAULT 0,
  failed_count    INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'pending',  -- 'pending' | 'running' | 'completed' | 'failed'
  estimated_cost  FLOAT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE TABLE bulk_batch_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id     UUID NOT NULL REFERENCES bulk_batches(id) ON DELETE CASCADE,
  item_id      UUID REFERENCES assessment_items(id),
  status       TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── TEACHES verifications ──────────────────────────────────────────────────────
CREATE TABLE teaches_verifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id        UUID NOT NULL,
  sub_concept_id  UUID NOT NULL,
  verified_by     UUID NOT NULL REFERENCES auth.users(id),
  action          TEXT NOT NULL,  -- 'verify' | 'reject'
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── KaizenML lint runs ─────────────────────────────────────────────────────────
CREATE TABLE kaizen_lint_runs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at     TIMESTAMPTZ DEFAULT now(),
  rule_id    TEXT NOT NULL,
  result     JSONB,
  count      INTEGER,
  threshold  INTEGER,
  passed     BOOLEAN,
  details    TEXT
);

-- ── Golden dataset ─────────────────────────────────────────────────────────────
CREATE TABLE golden_dataset (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id           UUID NOT NULL REFERENCES assessment_items(id),
  added_by          UUID REFERENCES auth.users(id),
  added_at          TIMESTAMPTZ DEFAULT now(),
  notes             TEXT,
  target_critic_min FLOAT DEFAULT 3.8
);

-- ── RLS Policies ───────────────────────────────────────────────────────────────
ALTER TABLE bulk_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own batches" ON bulk_batches
  FOR ALL USING (user_id = auth.uid());

ALTER TABLE assessment_item_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faculty see own item versions" ON assessment_item_versions
  FOR ALL USING (edited_by = auth.uid());

ALTER TABLE golden_dataset ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins only" ON golden_dataset
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ── pgvector search RPC functions for item dedup ──────────────────────────────
CREATE OR REPLACE FUNCTION search_items_by_stem_voyage(
  query_embedding vector(1024),
  p_course_id UUID,
  similarity_threshold FLOAT DEFAULT 0.85,
  match_count INT DEFAULT 5
)
RETURNS TABLE (item_id UUID, stem TEXT, similarity FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT ai.id, ai.stem, 1-(aie.voyage_embedding <=> query_embedding) AS similarity
  FROM assessment_items ai
  JOIN assessment_item_embeddings aie ON ai.id = aie.item_id
  WHERE ai.course_id = p_course_id
    AND ai.status IN ('draft','approved')
    AND aie.voyage_embedding IS NOT NULL
    AND (1 - (aie.voyage_embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY aie.voyage_embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION search_items_by_stem_openai(
  query_embedding vector(1536),
  p_course_id UUID,
  similarity_threshold FLOAT DEFAULT 0.85,
  match_count INT DEFAULT 5
)
RETURNS TABLE (item_id UUID, stem TEXT, similarity FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT ai.id, ai.stem, 1-(aie.openai_embedding <=> query_embedding) AS similarity
  FROM assessment_items ai
  JOIN assessment_item_embeddings aie ON ai.id = aie.item_id
  WHERE ai.course_id = p_course_id
    AND ai.status IN ('draft','approved')
    AND aie.openai_embedding IS NOT NULL
    AND (1 - (aie.openai_embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY aie.openai_embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## TypeScript Interface Updates (packages/shared-types)

```typescript
// Add to WorkbenchState
interface WorkbenchState {
  // ... existing Phase 1 fields ...

  // Phase 2 additions
  tags: ItemTags | null;
  criticScores: CriticScore[] | null;
  criticComposite: number | null;
  toulmin: ToulminArgument | null;
  autoRoute: 'auto_approve' | 'auto_reject' | 'faculty_review' | null;
  retryCount: number;
  isDuplicate: boolean;
  dupSimilarity: number | null;
  dupItemId: string | null;
  taskShellId: string | null;
}

interface ItemTags {
  bloom_level: number;         // 1–6
  usmle_system: string;
  usmle_discipline: string;
  difficulty: number;          // 1–5
  acgme_domain: string | null;
  epa_number: string | null;
}

interface CriticScore {
  metric: 'clinical_accuracy' | 'vignette_realism' | 'distractor_quality'
        | 'bloom_alignment' | 'nbme_compliance' | 'educational_value';
  score: number;               // 1.0–5.0
}

interface ToulminArgument {
  claim: string;
  data: string;
  warrant: string;
  backing: string;
  rebuttal: string;
  qualifier: string;
}
```

---

## Phase 2 Pipeline Node Order (graph.ts)

```typescript
// backend/src/pipeline/graph.ts — Phase 2 full pipeline

const graph = new StateGraph(WorkbenchState)
  .addNode('init',                 initNode)
  .addNode('context_compiler',     contextCompilerNode)
  .addNode('vignette_builder',     vignetteBuilderNode)
  .addNode('stem_writer',          stemWriterNode)
  .addNode('distractor_generator', distractorGeneratorNode)
  .addNode('dedup_detector',       dedupDetectorNode)          // P2-002: NEW
  .addNode('validator',            validatorNode)              // P2-003: UPGRADED
  .addNode('critic_agent',         criticAgentNode)            // P2-004: NEW
  .addNode('tagger',               taggerNode)                 // P2-001: NEW
  .addNode('toulmin_generator',    toulminGeneratorNode)       // P2-015: NEW
  .addNode('review_router',        reviewRouterNode)           // P2-005: NEW
  .addEdge(START,                  'init')
  .addEdge('init',                 'context_compiler')
  .addEdge('context_compiler',     'vignette_builder')
  .addEdge('vignette_builder',     'stem_writer')
  .addEdge('stem_writer',          'distractor_generator')
  .addEdge('distractor_generator', 'dedup_detector')
  .addEdge('dedup_detector',       'validator')
  .addEdge('validator',            'graph_writer')             // Phase 1 node still here
  .addEdge('graph_writer',         'critic_agent')
  .addEdge('critic_agent',         'tagger')
  .addEdge('tagger',               'toulmin_generator')
  .addEdge('toulmin_generator',    'review_router')
  // Retry edge (P2-006)
  .addConditionalEdges('review_router', retryOrFinish, {
    retry:  'vignette_builder',
    finish: END,
  });
```

---

## Model Assignment (non-negotiable)

| Node | Model | Why |
|------|-------|-----|
| `tagger` | `claude-haiku-4-5` | Cheap structured output, 6 tag fields |
| `dedup_detector` | No AI | Pure vector search |
| `validator` R001–R030 | No AI | Pure TypeScript rules |
| `validator` Cover the Options | `claude-sonnet-4-6` | Semantic quality judgment |
| `critic_agent` | `claude-opus-4-6` | Only place Opus is used in Phase 2 |
| `toulmin_generator` | `claude-sonnet-4-6` | Quality matters for ECD arguments |
| `review_router` | No AI | Pure routing logic |

---

## New Files to Create (Epic 2.1 only)

```
backend/src/pipeline/nodes/TaggerNode.ts
backend/src/pipeline/nodes/DedupDetectorNode.ts
backend/src/pipeline/nodes/CriticAgentNode.ts
backend/src/pipeline/nodes/ReviewRouterNode.ts
backend/src/pipeline/prompts/tagger-system.txt
backend/src/pipeline/prompts/critic-agent-system.txt
backend/src/pipeline/prompts/cover-the-options-system.txt
backend/src/pipeline/validators/rules-R011-R030.ts
backend/supabase/migrations/20250901000000_phase2_tables.sql
backend/supabase/migrations/20250901000001_item_embeddings.sql
```

---

## Smoke Tests

```bash
# 1. Full 14-node pipeline runs without error
# Generate a question, check all new columns populated
psql $SUPABASE_DB_URL -c "
  SELECT id, bloom_level, usmle_system, critic_composite_score, auto_route, 
         dedup_status, validation_passed, task_shell_id
  FROM assessment_items ORDER BY created_at DESC LIMIT 1;"

# Expected: all columns non-null (first item has no dedup neighbor → dedup_status='pass')

# 2. Auto-routing statistics
psql $SUPABASE_DB_URL -c "
  SELECT auto_route, count(*) FROM assessment_items GROUP BY auto_route;"
# Expected: mix of auto_approve, faculty_review, auto_reject

# 3. Retry count check
psql $SUPABASE_DB_URL -c "SELECT retry_count, count(*) FROM generation_logs GROUP BY retry_count;"
# Expected: mostly 0, some 1–2

# 4. Critic cost tracking
psql $SUPABASE_DB_URL -c "SELECT AVG(critic_input_tokens), AVG(critic_output_tokens) FROM generation_logs WHERE critic_input_tokens IS NOT NULL;"
# Expected: tokens tracked per generation
```

---

## Failure Modes

1. **Opus times out** → critic_agent sets `critic_composite = null`, review_router defaults to `faculty_review`
2. **Dedup on first item** → `assessment_item_embeddings` empty → no similarity check, `dedup_status = 'pass'`
3. **Tagger JSON malformed** → log warning, write `null` tags, continue (never block)
4. **Retry loop infinite** → `retryCount` checked at graph entry, graph crashes if > 2 (hard ceiling)
5. **Cover the Options too expensive** → only runs if all 30 structural rules pass — saves ~70% of calls
6. **Opus cost explosion** → add monthly spend circuit breaker in `CriticAgentNode` before each Opus call
