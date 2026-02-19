# Journey OS — Supabase DDL Specification v1.0

**Date:** February 19, 2026  
**Purpose:** Canonical DDL for every Supabase PostgreSQL table. Single source of truth for column names, types, constraints, indexes, and RLS policies.  
**Reference:** Architecture v10.0 §2, Node Registry v1.0  
**Embedding Model:** Voyage AI voyage-large-2 (1024 dimensions)  
**Vector Index:** HNSW (all embedding tables)

---

## Conventions

- UUIDs as primary keys (`gen_random_uuid()`)
- `created_at` / `updated_at` on all tables
- `institution_id` on all tenant-scoped tables (RLS boundary)
- `sync_status` on all dual-written tables ("pending" | "synced" | "failed")
- `graph_node_id` on all tables with Neo4j counterparts (bridges the two stores)
- Snake_case for all column names

---

## Core Content Tables

```sql
-- ═══ CONTENT CHUNKS ═══

CREATE TABLE IF NOT EXISTS content_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    resource_id UUID REFERENCES uploads(id),          -- WORM store reference
    lecture_id UUID,                                    -- if from a lecture
    syllabus_id UUID,                                  -- if from a syllabus
    session_id UUID,                                   -- assigned session
    chunk_index INTEGER NOT NULL,                       -- position in document
    text TEXT NOT NULL,                                 -- 500-800 tokens
    heading_context TEXT,                               -- nearest heading above chunk
    token_count INTEGER NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('syllabus', 'lecture', 'textbook', 'clinical_guide')),
    concept_extractions JSONB DEFAULT '[]',            -- AI extraction results
    topic_id TEXT,                                      -- BERTopic assignment (Tier 3)
    topic_confidence FLOAT,
    graph_node_id TEXT,                                 -- Neo4j ContentChunk.id
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chunks_institution ON content_chunks(institution_id);
CREATE INDEX idx_chunks_resource ON content_chunks(resource_id);
CREATE INDEX idx_chunks_session ON content_chunks(session_id);
CREATE INDEX idx_chunks_sync ON content_chunks(sync_status) WHERE sync_status != 'synced';

-- ═══ CONTENT CHUNK EMBEDDINGS ═══

CREATE TABLE IF NOT EXISTS content_chunk_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL REFERENCES content_chunks(id) ON DELETE CASCADE,
    embedding VECTOR(1024) NOT NULL,                    -- Voyage AI voyage-large-2
    model_version TEXT NOT NULL DEFAULT 'voyage-large-2',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chunk_embed_chunk ON content_chunk_embeddings(chunk_id);
-- HNSW index for similarity search
CREATE INDEX idx_chunk_embed_hnsw ON content_chunk_embeddings 
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);


-- ═══ SUBCONCEPTS ═══

CREATE TABLE IF NOT EXISTS subconcepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    name TEXT NOT NULL,
    description TEXT,
    umls_cui TEXT,                                       -- LOD: UMLS Concept Unique Identifier
    snomed_id TEXT,                                      -- LOD: SNOMED CT code
    mesh_id TEXT,                                        -- LOD: MeSH descriptor
    lod_enriched BOOLEAN DEFAULT false,
    lod_brief TEXT,                                      -- Short LOD description for context
    semantic_type TEXT,                                   -- UMLS semantic type
    source_course TEXT,                                   -- originating course code
    graph_node_id TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subconcepts_institution ON subconcepts(institution_id);
CREATE INDEX idx_subconcepts_cui ON subconcepts(umls_cui) WHERE umls_cui IS NOT NULL;

-- ═══ CONCEPT EMBEDDINGS ═══

CREATE TABLE IF NOT EXISTS concept_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subconcept_id UUID NOT NULL REFERENCES subconcepts(id) ON DELETE CASCADE,
    embedding VECTOR(1024) NOT NULL,
    model_version TEXT NOT NULL DEFAULT 'voyage-large-2',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_concept_embed_sub ON concept_embeddings(subconcept_id);
CREATE INDEX idx_concept_embed_hnsw ON concept_embeddings 
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);


-- ═══ LEARNING OBJECTIVES (SLO + ILO mirror) ═══

CREATE TABLE IF NOT EXISTS student_learning_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    session_id UUID,
    text TEXT NOT NULL,
    bloom_verb TEXT,
    bloom_level INTEGER CHECK (bloom_level BETWEEN 1 AND 6),
    confidence FLOAT,
    scope TEXT NOT NULL CHECK (scope IN ('institutional', 'session')),
    course_code TEXT,
    graph_node_id TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_slo_institution ON student_learning_objectives(institution_id);
CREATE INDEX idx_slo_session ON student_learning_objectives(session_id);
CREATE INDEX idx_slo_scope ON student_learning_objectives(scope);

-- SLO embeddings (for FULFILLS suggestion similarity)
CREATE TABLE IF NOT EXISTS slo_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slo_id UUID NOT NULL REFERENCES student_learning_objectives(id) ON DELETE CASCADE,
    embedding VECTOR(1024) NOT NULL,
    model_version TEXT NOT NULL DEFAULT 'voyage-large-2',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_slo_embed_hnsw ON slo_embeddings 
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
```

---

## Assessment Tables

```sql
-- ═══ ASSESSMENT ITEMS ═══

CREATE TABLE IF NOT EXISTS assessment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    vignette TEXT,
    stem TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'context_compiled', 'vignette_draft', 'stem_draft', 
        'options_draft', 'tagged', 'validated', 'critic_scored',
        'approved', 'rejected', 'retired'
    )),
    bloom_level INTEGER CHECK (bloom_level BETWEEN 1 AND 6),
    difficulty FLOAT,
    quality_score FLOAT,
    
    -- Toulmin Argumentation (6 fields per R-030)
    toulmin JSONB DEFAULT '{}',
    -- Schema: { claim, data, warrant, backing, rebuttal, qualifier }
    
    -- Generation metadata
    generation_session_id UUID,
    generation_reasoning TEXT,
    critic_scores JSONB,
    -- Schema: { faithfulness, contextual_recall, answer_relevancy, 
    --           distractor_plausibility[], bloom_alignment, clinical_accuracy, 
    --           composite, routing }
    
    -- Review
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Graph sync
    graph_node_id TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_items_institution ON assessment_items(institution_id);
CREATE INDEX idx_items_status ON assessment_items(status);
CREATE INDEX idx_items_session ON assessment_items(generation_session_id);
CREATE INDEX idx_items_sync ON assessment_items(sync_status) WHERE sync_status != 'synced';

-- ═══ QUESTION EMBEDDINGS ═══

CREATE TABLE IF NOT EXISTS question_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES assessment_items(id) ON DELETE CASCADE,
    embedding VECTOR(1024) NOT NULL,
    model_version TEXT NOT NULL DEFAULT 'voyage-large-2',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_question_embed_item ON question_embeddings(item_id);
CREATE INDEX idx_question_embed_hnsw ON question_embeddings 
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);


-- ═══ OPTIONS ═══

CREATE TABLE IF NOT EXISTS options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES assessment_items(id) ON DELETE CASCADE,
    letter TEXT NOT NULL CHECK (letter IN ('A', 'B', 'C', 'D', 'E')),
    text TEXT NOT NULL,
    correct BOOLEAN NOT NULL DEFAULT false,
    misconception TEXT,
    evidence_rule TEXT,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_options_item ON options(item_id);
CREATE UNIQUE INDEX idx_options_item_letter ON options(item_id, letter);


-- ═══ GENERATION LOGS ═══

CREATE TABLE IF NOT EXISTS generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    institution_id UUID NOT NULL REFERENCES institutions(id),
    faculty_id UUID NOT NULL REFERENCES auth.users(id),
    node_name TEXT NOT NULL,                            -- pipeline node that generated this log
    node_index INTEGER NOT NULL,                        -- 1-14 (11 gen + 3 review)
    input_summary JSONB,
    output_summary JSONB,
    model_used TEXT,
    tokens_in INTEGER,
    tokens_out INTEGER,
    latency_ms INTEGER,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_genlog_session ON generation_logs(session_id);
CREATE INDEX idx_genlog_institution ON generation_logs(institution_id);
```

---

## Framework Tables (Supabase mirror for search/display)

```sql
-- ═══ FRAMEWORKS (denormalized for fast lookup) ═══

CREATE TABLE IF NOT EXISTS frameworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework_type TEXT NOT NULL CHECK (framework_type IN (
        'usmle_system', 'usmle_discipline', 'usmle_task', 'usmle_topic',
        'lcme_standard', 'lcme_element',
        'acgme_domain', 'acgme_subdomain',
        'aamc_domain', 'aamc_competency',
        'epa', 'bloom', 'miller',
        'ume_competency', 'ume_subcompetency'
    )),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parent_code TEXT,                                   -- for hierarchical frameworks
    metadata JSONB DEFAULT '{}',
    neo4j_label TEXT NOT NULL,                          -- e.g., 'USMLE_System'
    graph_node_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_frameworks_type_code ON frameworks(framework_type, code);
CREATE INDEX idx_frameworks_type ON frameworks(framework_type);
CREATE INDEX idx_frameworks_parent ON frameworks(parent_code) WHERE parent_code IS NOT NULL;


-- ═══ UME COMPETENCIES ═══

CREATE TABLE IF NOT EXISTS ume_competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    level TEXT NOT NULL CHECK (level IN ('competency', 'subcompetency')),
    parent_code TEXT,
    do_specific BOOLEAN DEFAULT false,
    acgme_bridge_code TEXT,
    graph_node_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ume_level ON ume_competencies(level);
CREATE INDEX idx_ume_parent ON ume_competencies(parent_code) WHERE parent_code IS NOT NULL;
```

---

## Auth & Institutional Tables

```sql
-- ═══ INSTITUTIONS ═══

CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,                        -- e.g., 'msm.edu'
    status TEXT NOT NULL DEFAULT 'waitlisted' CHECK (status IN ('waitlisted', 'approved', 'suspended')),
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ USER PROFILES ═══

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'institutional_admin', 'faculty', 'advisor', 'student')),
    is_course_director BOOLEAN DEFAULT false,           -- Permission flag (R-023)
    display_name TEXT,
    title TEXT,
    department TEXT,
    avatar_url TEXT,
    onboarding_complete BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_institution ON user_profiles(institution_id);
CREATE INDEX idx_profiles_role ON user_profiles(role);
```

---

## Notification & Audit Tables

```sql
-- ═══ NOTIFICATIONS ═══

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    type TEXT NOT NULL CHECK (type IN (
        'generation_complete', 'review_needed', 'data_lint',
        'quality_regression', 'at_risk_alert', 'exam_available',
        'batch_complete', 'system'
    )),
    title TEXT NOT NULL,
    body TEXT,
    metadata JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = false;

-- ═══ AUDIT LOG ═══

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    changes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_institution ON audit_log(institution_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
```

---

## File Storage Tables

```sql
-- ═══ UPLOADS (WORM store metadata) ═══

CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,                          -- Supabase Storage path
    document_type TEXT CHECK (document_type IN (
        'syllabus', 'lecture', 'textbook', 'exam_export', 'clinical_guide', 'other'
    )),
    syllabus_type INTEGER CHECK (syllabus_type BETWEEN 1 AND 6),  -- Type 1-6 classification
    parse_status TEXT DEFAULT 'pending' CHECK (parse_status IN ('pending', 'parsing', 'parsed', 'failed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_uploads_institution ON uploads(institution_id);
CREATE INDEX idx_uploads_status ON uploads(parse_status);
```

---

## Row-Level Security Policies

```sql
-- All tenant-scoped tables get this pattern:
ALTER TABLE content_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own institution data" ON content_chunks
    FOR SELECT USING (
        institution_id = (
            SELECT institution_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Faculty can insert for own institution" ON content_chunks
    FOR INSERT WITH CHECK (
        institution_id = (
            SELECT institution_id FROM user_profiles WHERE id = auth.uid()
        )
        AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('faculty', 'institutional_admin', 'superadmin')
    );

-- SuperAdmin bypasses institution scope:
CREATE POLICY "SuperAdmin sees all" ON content_chunks
    FOR SELECT USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'superadmin'
    );

-- Repeat pattern for: subconcepts, assessment_items, options, student_learning_objectives,
-- generation_logs, notifications, audit_log, uploads, frameworks, ume_competencies
```

---

## Useful Functions

```sql
-- Semantic search for content chunks
CREATE OR REPLACE FUNCTION search_content_chunks(
    query_embedding VECTOR(1024),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10,
    filter_institution UUID DEFAULT NULL
)
RETURNS TABLE (
    chunk_id UUID,
    text TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cc.id,
        cc.text,
        1 - (cce.embedding <=> query_embedding) AS similarity
    FROM content_chunk_embeddings cce
    JOIN content_chunks cc ON cc.id = cce.chunk_id
    WHERE 
        (filter_institution IS NULL OR cc.institution_id = filter_institution)
        AND 1 - (cce.embedding <=> query_embedding) > match_threshold
    ORDER BY cce.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Question dedup check
CREATE OR REPLACE FUNCTION check_question_dedup(
    query_embedding VECTOR(1024),
    institution UUID
)
RETURNS TABLE (
    item_id UUID,
    stem TEXT,
    similarity FLOAT,
    dedup_action TEXT     -- 'pass' | 'flag' | 'reject'
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ai.id,
        ai.stem,
        1 - (qe.embedding <=> query_embedding) AS sim,
        CASE 
            WHEN 1 - (qe.embedding <=> query_embedding) >= 0.95 THEN 'reject'
            WHEN 1 - (qe.embedding <=> query_embedding) >= 0.85 THEN 'flag'
            ELSE 'pass'
        END
    FROM question_embeddings qe
    JOIN assessment_items ai ON ai.id = qe.item_id
    WHERE ai.institution_id = institution
        AND ai.status NOT IN ('rejected', 'retired')
        AND 1 - (qe.embedding <=> query_embedding) >= 0.85
    ORDER BY qe.embedding <=> query_embedding
    LIMIT 5;
END;
$$;
```

---

*This DDL specification is the single source of truth for Supabase schema. All migration scripts, seed commands, and TypeScript types must match these table and column definitions exactly.*
