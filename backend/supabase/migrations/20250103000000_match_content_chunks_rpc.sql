-- ============================================================================
-- RPC: match_content_chunks
-- Vector similarity search for content chunks using pgvector cosine distance.
-- Used by ContextCompilerNode for the Vector RAG path.
-- ============================================================================

CREATE OR REPLACE FUNCTION match_content_chunks(
  query_embedding vector(1024),
  match_course_id UUID,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    cc.id,
    cc.content,
    1 - (cce.embedding <=> query_embedding) AS similarity
  FROM content_chunks cc
  JOIN content_chunk_embeddings cce ON cc.id = cce.chunk_id
  WHERE cc.course_id = match_course_id
  ORDER BY cce.embedding <=> query_embedding
  LIMIT match_count;
$$;
