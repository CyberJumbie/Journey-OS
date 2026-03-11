-- Phase 1 Core Tables Migration
-- Story: P1-004
-- Creates all 9 Phase 1 tables with RLS policies, indexes, and pgvector HNSW index.

-- Enable pgvector (MUST come before any table using vector type)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- INSTITUTIONS
-- ============================================================================
CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER PROFILES (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id),
  role TEXT NOT NULL CHECK (role IN ('faculty','institutional_admin','student','advisor','superadmin')),
  display_name TEXT,
  email TEXT,
  is_course_director BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COURSES
-- ============================================================================
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id),
  code TEXT NOT NULL,         -- e.g. 'MEDI-531'
  title TEXT NOT NULL,
  description TEXT,
  academic_year TEXT,
  phase TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- UPLOADS (WORM - write once, never delete via API)
-- ============================================================================
CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id),
  course_id UUID REFERENCES courses(id),
  uploaded_by UUID REFERENCES user_profiles(id),
  storage_path TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CONTENT CHUNKS (extracted from syllabi)
-- ============================================================================
CREATE TABLE content_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES uploads(id),
  course_id UUID REFERENCES courses(id),
  institution_id UUID REFERENCES institutions(id),
  chunk_index INT,
  content TEXT,
  token_count INT,
  source_type TEXT CHECK (source_type IN ('syllabus','lecture_slide','textbook','other')),
  source_page INT,
  metadata JSONB,
  neo4j_node_id TEXT,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending','synced','failed','orphaned')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE content_chunks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CONTENT CHUNK EMBEDDINGS (1024-dim Voyage AI)
-- No RLS on this table - accessed via service role for vector search
-- ============================================================================
CREATE TABLE content_chunk_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID UNIQUE REFERENCES content_chunks(id),
  embedding vector(1024),
  model_name TEXT DEFAULT 'voyage-large-2',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- HNSW index for fast cosine similarity search
CREATE INDEX ON content_chunk_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- CONTENT CHUNK EMBEDDINGS — OPENAI (1536-dim, dual-embedding provider)
-- No RLS on this table - accessed via service role for vector search
-- ============================================================================
CREATE TABLE content_chunk_embeddings_openai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID UNIQUE REFERENCES content_chunks(id),
  embedding vector(1536),
  model_name TEXT DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- HNSW index for fast cosine similarity search
CREATE INDEX ON content_chunk_embeddings_openai
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- ASSESSMENT ITEMS
-- ============================================================================
CREATE TABLE assessment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id),
  course_id UUID REFERENCES courses(id),
  created_by UUID REFERENCES user_profiles(id),
  vignette TEXT,
  stem TEXT,
  explanation TEXT,
  bloom_level INT,
  usmle_system TEXT,
  usmle_discipline TEXT,
  difficulty_estimate FLOAT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','pending_review','approved','rejected','retired')),
  toulmin JSONB,
  generation_log_id UUID,
  neo4j_node_id TEXT,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending','synced','failed','orphaned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE assessment_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- OPTIONS (A-E per item)
-- ============================================================================
CREATE TABLE options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES assessment_items(id) ON DELETE CASCADE,
  label CHAR(1) CHECK (label IN ('A','B','C','D','E')),
  option_text TEXT,
  is_correct BOOLEAN DEFAULT false,
  distractor_rationale TEXT,
  misconception_targeted TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE options ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GENERATION LOGS (full pipeline audit trail)
-- ============================================================================
CREATE TABLE generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id),
  course_id UUID REFERENCES courses(id),
  user_id UUID REFERENCES user_profiles(id),
  mode TEXT CHECK (mode IN ('single','bulk','review')),
  input_message TEXT,
  pipeline_state JSONB,
  model_calls JSONB,
  total_tokens_in INT,
  total_tokens_out INT,
  total_cost_usd DECIMAL(10,6),
  duration_ms INT,
  status TEXT DEFAULT 'running' CHECK (status IN ('running','completed','failed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FK: assessment_items.generation_log_id -> generation_logs
-- Added after both tables exist to avoid circular dependency
-- ============================================================================
ALTER TABLE assessment_items
  ADD CONSTRAINT fk_assessment_items_generation_log
  FOREIGN KEY (generation_log_id) REFERENCES generation_logs(id);

-- ============================================================================
-- RLS POLICIES (institution-scoped isolation)
-- ============================================================================

-- Helper: get the current user's institution_id
-- Used in all institution-isolation policies below.

-- institutions: user can only see their own institution
CREATE POLICY "institution_isolation" ON institutions FOR ALL USING (
  id = (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
);

-- user_profiles: user can see profiles within their institution
CREATE POLICY "institution_isolation" ON user_profiles FOR ALL USING (
  institution_id = (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
);

-- courses: scoped to user's institution
CREATE POLICY "institution_isolation" ON courses FOR ALL USING (
  institution_id = (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
);

-- uploads: scoped to user's institution
CREATE POLICY "institution_isolation" ON uploads FOR ALL USING (
  institution_id = (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
);

-- content_chunks: scoped to user's institution
CREATE POLICY "institution_isolation" ON content_chunks FOR ALL USING (
  institution_id = (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
);

-- assessment_items: scoped to user's institution
CREATE POLICY "institution_isolation" ON assessment_items FOR ALL USING (
  institution_id = (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
);

-- options: scoped via parent assessment_item's institution
CREATE POLICY "institution_isolation" ON options FOR ALL USING (
  item_id IN (
    SELECT id FROM assessment_items
    WHERE institution_id = (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
  )
);

-- generation_logs: scoped to user's institution
CREATE POLICY "institution_isolation" ON generation_logs FOR ALL USING (
  institution_id = (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
);
