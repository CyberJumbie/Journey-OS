# STORY-F-28: Dual-Write Chunks

**Epic:** E-11 (Content Processing Pipeline)
**Feature:** F-05 (Content Upload & Processing)
**Sprint:** 4
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-11-4

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need processed content chunks written to both Supabase and Neo4j so that they are available for both relational queries and graph traversal.

## Acceptance Criteria
- [ ] Chunk TypeScript types: `id`, `content_id`, `chunk_index`, `text`, `token_count`, `embedding`, `sync_status`
- [ ] ChunkRepository with create and read operations for Supabase
- [ ] Neo4j `Chunk` node creation with properties: `id`, `chunk_index`, `text`, `token_count`
- [ ] Neo4j relationship: `(Content)-[:HAS_CHUNK]->(Chunk)` with chunk_index ordering
- [ ] DualWriteService integration: Supabase first, Neo4j second, `sync_status = 'synced'`
- [ ] Embedding stored in Supabase pgvector; Neo4j stores chunk without embedding (graph traversal only)
- [ ] Batch write: process all chunks for a content record in a single transaction per store
- [ ] Dedicated `updateSyncStatus()` method on repository (no `as unknown as` casting)
- [ ] 10-12 API tests for dual-write, sync_status verification, batch creation, rollback on Neo4j failure
- [ ] TypeScript strict, named exports only

## Reference Screens
No UI screens. Backend dual-write infrastructure only.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | N/A |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/content/chunk.types.ts` |
| Model | apps/server | `src/models/chunk.model.ts` |
| Repository | apps/server | `src/repositories/chunk.repository.ts` |
| Service | apps/server | `src/services/content/chunk-writer.service.ts` |
| Tests | apps/server | `src/services/content/__tests__/chunk-writer.service.test.ts` |

## Database Schema
Supabase `chunks` table:
```sql
CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  embedding vector(1024),
  sync_status TEXT NOT NULL DEFAULT 'pending_sync',
  graph_node_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(content_id, chunk_index)
);

CREATE INDEX idx_chunks_content_id ON chunks(content_id);
CREATE INDEX idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops);
```

Neo4j:
```cypher
(:Content)-[:HAS_CHUNK]->(:Chunk {id, chunk_index, text, token_count})
```

## API Endpoints
No REST endpoints. Called internally by the content pipeline (STORY-F-27).

## Dependencies
- **Blocked by:** STORY-F-27 (pipeline produces chunks)
- **Blocks:** STORY-F-31
- **Cross-lane:** none

## Testing Requirements
- 10-12 API tests: Supabase batch insert, Neo4j batch node creation, HAS_CHUNK relationship creation, sync_status transitions (pending_sync -> synced), rollback on Neo4j failure (sync_status stays pending_sync), updateSyncStatus method, chunk ordering by index, duplicate chunk_index rejection, read by content_id, empty chunk array handling
- 0 E2E tests

## Implementation Notes
- DualWriteService pattern: Supabase first (source of truth), Neo4j second (graph projection).
- Neo4j `Chunk` label (PascalCase per convention).
- Embedding NOT stored in Neo4j — pgvector in Supabase handles all vector operations.
- Batch write uses Supabase `.insert()` for multiple rows and Neo4j `UNWIND` for batch node creation.
- On Neo4j failure: `sync_status = 'pending_sync'`, background job retries.
- Chunk ordering preserved via `chunk_index` for reconstruction of original document flow.
- Use `.select().single()` on ALL Supabase write operations to verify rows affected.
- Add dedicated `updateSyncStatus()` method to repository — never use `as unknown as` casting.
