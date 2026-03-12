-- Phase 2 Tables Migration
-- Epic 2.1: Pipeline Completion
-- Adds Phase 2 columns, tables, indexes, RLS, and RPC functions.
-- Safe to re-run: uses ADD COLUMN IF NOT EXISTS and CREATE TABLE IF NOT EXISTS.

-- ============================================================================
-- ASSESSMENT_ITEMS — Phase 2 columns
-- Note: bloom_level, usmle_system, usmle_discipline, difficulty_estimate,
-- and toulmin already exist from Phase 1. We add NEW columns only.
-- ============================================================================
ALTER TABLE assessment_items
  ADD COLUMN IF NOT EXISTS difficulty          INTEGER,
  ADD COLUMN IF NOT EXISTS acgme_domain        TEXT,
  ADD COLUMN IF NOT EXISTS epa_number          TEXT,
  ADD COLUMN IF NOT EXISTS tags_generated_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validation_results  JSONB,
  ADD COLUMN IF NOT EXISTS validation_passed   BOOLEAN,
  ADD COLUMN IF NOT EXISTS dedup_similarity    FLOAT,
  ADD COLUMN IF NOT EXISTS dedup_status        TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS dedup_item_id       UUID,
  ADD COLUMN IF NOT EXISTS critic_clinical_accuracy    FLOAT,
  ADD COLUMN IF NOT EXISTS critic_vignette_realism     FLOAT,
  ADD COLUMN IF NOT EXISTS critic_distractor_quality   FLOAT,
  ADD COLUMN IF NOT EXISTS critic_bloom_alignment      FLOAT,
  ADD COLUMN IF NOT EXISTS critic_nbme_compliance      FLOAT,
  ADD COLUMN IF NOT EXISTS critic_educational_value    FLOAT,
  ADD COLUMN IF NOT EXISTS critic_composite_score      FLOAT,
  ADD COLUMN IF NOT EXISTS critic_reasoning            TEXT,
  ADD COLUMN IF NOT EXISTS auto_route          TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason    TEXT,
  ADD COLUMN IF NOT EXISTS task_shell_id       UUID;

-- ============================================================================
-- GENERATION_LOGS — Phase 2 columns
-- ============================================================================
ALTER TABLE generation_logs
  ADD COLUMN IF NOT EXISTS retry_count          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS critic_input_tokens  INTEGER,
  ADD COLUMN IF NOT EXISTS critic_output_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS task_shell_id        UUID;

-- ============================================================================
-- ASSESSMENT ITEM EMBEDDINGS (dedup detection via pgvector)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assessment_item_embeddings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id           UUID NOT NULL REFERENCES assessment_items(id) ON DELETE CASCADE,
  voyage_embedding  vector(1024),
  voyage_model      TEXT DEFAULT 'voyage-large-2',
  openai_embedding  vector(1536),
  openai_model      TEXT DEFAULT 'text-embedding-3-small',
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id)
);

CREATE INDEX IF NOT EXISTS idx_item_voyage_hnsw ON assessment_item_embeddings
  USING hnsw (voyage_embedding vector_cosine_ops) WITH (m=16, ef_construction=64);
CREATE INDEX IF NOT EXISTS idx_item_openai_hnsw ON assessment_item_embeddings
  USING hnsw (openai_embedding vector_cosine_ops) WITH (m=16, ef_construction=64);

-- ============================================================================
-- TASK SHELLS
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_shells (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shell_id          TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  bloom_min         INTEGER NOT NULL,
  bloom_max         INTEGER NOT NULL,
  vignette_required BOOLEAN DEFAULT true,
  option_count      INTEGER DEFAULT 5,
  distractor_strategy TEXT,
  neo4j_node_id     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PROFICIENCY VARIABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS proficiency_variables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  sub_concept_id  UUID,
  neo4j_node_id   TEXT,
  sync_status     TEXT DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- ASSESSMENT ITEM VERSIONS (review mode history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assessment_item_versions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          UUID NOT NULL REFERENCES assessment_items(id) ON DELETE CASCADE,
  vignette         TEXT,
  stem             TEXT,
  options          JSONB,
  edit_instruction TEXT,
  edited_by        UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- BULK BATCHES
-- ============================================================================
CREATE TABLE IF NOT EXISTS bulk_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       UUID NOT NULL,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  total_count     INTEGER NOT NULL,
  completed_count INTEGER DEFAULT 0,
  failed_count    INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'pending',
  estimated_cost  FLOAT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bulk_batch_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id      UUID NOT NULL REFERENCES bulk_batches(id) ON DELETE CASCADE,
  item_id       UUID REFERENCES assessment_items(id),
  status        TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TEACHES VERIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS teaches_verifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id        UUID NOT NULL,
  sub_concept_id  UUID NOT NULL,
  verified_by     UUID NOT NULL REFERENCES auth.users(id),
  action          TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- KAIZEN LINT RUNS
-- ============================================================================
CREATE TABLE IF NOT EXISTS kaizen_lint_runs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at     TIMESTAMPTZ DEFAULT now(),
  rule_id    TEXT NOT NULL,
  result     JSONB,
  count      INTEGER,
  threshold  INTEGER,
  passed     BOOLEAN,
  details    TEXT
);

-- ============================================================================
-- GOLDEN DATASET
-- ============================================================================
CREATE TABLE IF NOT EXISTS golden_dataset (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id           UUID NOT NULL REFERENCES assessment_items(id),
  added_by          UUID REFERENCES auth.users(id),
  added_at          TIMESTAMPTZ DEFAULT now(),
  notes             TEXT,
  target_critic_min FLOAT DEFAULT 3.8
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE bulk_batches ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "users see own batches" ON bulk_batches
    FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE assessment_item_versions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "faculty see own item versions" ON assessment_item_versions
    FOR ALL USING (edited_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE golden_dataset ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "admins only" ON golden_dataset
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- RPC FUNCTIONS — pgvector search for item dedup
-- ============================================================================
CREATE OR REPLACE FUNCTION search_items_by_stem_voyage(
  query_embedding vector(1024),
  p_course_id UUID,
  similarity_threshold FLOAT DEFAULT 0.85,
  match_count INT DEFAULT 5
)
RETURNS TABLE (item_id UUID, stem TEXT, similarity FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT ai.id, ai.stem, 1 - (aie.voyage_embedding <=> query_embedding) AS similarity
  FROM assessment_items ai
  JOIN assessment_item_embeddings aie ON ai.id = aie.item_id
  WHERE ai.course_id = p_course_id
    AND ai.status IN ('draft', 'approved')
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
  SELECT ai.id, ai.stem, 1 - (aie.openai_embedding <=> query_embedding) AS similarity
  FROM assessment_items ai
  JOIN assessment_item_embeddings aie ON ai.id = aie.item_id
  WHERE ai.course_id = p_course_id
    AND ai.status IN ('draft', 'approved')
    AND aie.openai_embedding IS NOT NULL
    AND (1 - (aie.openai_embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY aie.openai_embedding <=> query_embedding
  LIMIT match_count;
$$;
