# STORY-F-28 Brief: Dual-Write Chunks

## 0. Lane & Priority

```yaml
story_id: STORY-F-28
old_id: S-F-11-4
lane: faculty
lane_priority: 3
within_lane_order: 28
sprint: 4
size: M
depends_on:
  - STORY-F-27 (faculty) — Content pipeline produces chunks that need dual-writing
blocks: []
personas_served: [faculty]
epic: E-11 (Content Processing Pipeline)
feature: F-05 (Content Upload & Storage)
```

## 1. Summary

Build the **ChunkWriterService** that dual-writes processed content chunks to both Supabase (with pgvector embeddings) and Neo4j (for graph traversal without embeddings). Chunks are produced by the content pipeline (STORY-F-27) and need to be persisted in both stores following the DualWriteService pattern: Supabase first (source of truth), Neo4j second (graph projection), with `sync_status` tracking.

Key constraints:
- DualWrite pattern: Supabase first, Neo4j second, `sync_status = 'synced'`
- Embedding stored in Supabase pgvector `vector(1024)` column; NOT in Neo4j
- Neo4j stores `Chunk` nodes with: id, chunk_index, text, token_count
- Neo4j relationship: `(Content)-[:HAS_CHUNK]->(Chunk)` with chunk_index ordering
- Batch write: all chunks for a content record in a single transaction per store
- Supabase uses `.insert()` for multiple rows; Neo4j uses `UNWIND` for batch creation
- On Neo4j failure: `sync_status = 'pending_sync'`, background job retries

## 2. Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define `Chunk`, `ChunkRow`, sync types | `packages/types/src/content/chunk.types.ts` | 20m |
| 2 | Update barrel export | `packages/types/src/content/index.ts` | 5m |
| 3 | Create `ChunkWriteError` error class | `apps/server/src/errors/chunk.errors.ts` | 10m |
| 4 | Export new error | `apps/server/src/errors/index.ts` | 5m |
| 5 | Implement `ChunkModel` with private fields | `apps/server/src/models/chunk.model.ts` | 20m |
| 6 | Implement `ChunkRepository` (Supabase CRUD) | `apps/server/src/repositories/chunk.repository.ts` | 45m |
| 7 | Implement `ChunkWriterService` (DualWrite) | `apps/server/src/services/chunkWriter.service.ts` | 90m |
| 8 | Migration: create `chunks` table with pgvector | Supabase MCP | 20m |
| 9 | Write API tests (11 tests) | `apps/server/src/__tests__/chunkWriter.service.test.ts` | 90m |

**Total estimate:** ~6 hours (Size M)

## 3. Data Model (inline, complete)

### `packages/types/src/content/chunk.types.ts`

```typescript
/**
 * Sync status for dual-written entities.
 */
export type ChunkSyncStatus = "synced" | "pending_sync" | "failed";

/**
 * Chunk record from the chunks table (Supabase).
 */
export interface Chunk {
  readonly id: string;
  readonly content_id: string;
  readonly chunk_index: number;
  readonly text: string;
  readonly token_count: number;
  readonly start_char: number;
  readonly end_char: number;
  readonly embedding: ReadonlyArray<number>;
  readonly sync_status: ChunkSyncStatus;
  readonly created_at: string;
}

/**
 * Chunk insert row (for Supabase batch insert).
 */
export interface ChunkInsertRow {
  readonly content_id: string;
  readonly chunk_index: number;
  readonly text: string;
  readonly token_count: number;
  readonly start_char: number;
  readonly end_char: number;
  readonly embedding: string; // pgvector format: '[0.01, 0.02, ...]'
}

/**
 * Neo4j Chunk node properties (no embedding).
 */
export interface Neo4jChunkNode {
  readonly id: string;
  readonly content_id: string;
  readonly chunk_index: number;
  readonly text: string;
  readonly token_count: number;
}

/**
 * Batch write result.
 */
export interface ChunkBatchWriteResult {
  readonly content_id: string;
  readonly chunks_written: number;
  readonly supabase_success: boolean;
  readonly neo4j_success: boolean;
  readonly sync_status: ChunkSyncStatus;
  readonly errors: ReadonlyArray<string>;
}

/**
 * Chunk read query filters.
 */
export interface ChunkReadFilter {
  readonly content_id: string;
  readonly chunk_index?: number;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_chunks_table

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    token_count INTEGER NOT NULL CHECK (token_count > 0),
    start_char INTEGER NOT NULL CHECK (start_char >= 0),
    end_char INTEGER NOT NULL CHECK (end_char > start_char),
    embedding vector(1024) NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending_sync'
        CHECK (sync_status IN ('synced', 'pending_sync', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(content_id, chunk_index)
);

-- Indexes
CREATE INDEX idx_chunks_content_id ON chunks(content_id);
CREATE INDEX idx_chunks_content_ordering ON chunks(content_id, chunk_index);
CREATE INDEX idx_chunks_sync_status ON chunks(sync_status) WHERE sync_status != 'synced';

-- HNSW index for cosine similarity vector search
CREATE INDEX idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- RLS: Same access as contents table (institution-scoped via course)
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty read chunks for own institution" ON chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM contents ct
            JOIN courses c ON ct.course_id = c.id
            JOIN programs p ON c.program_id = p.id
            WHERE ct.id = chunks.content_id
            AND p.institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
        )
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
    );

CREATE POLICY "System insert chunks" ON chunks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System update chunk sync_status" ON chunks
    FOR UPDATE USING (true) WITH CHECK (true);
```

**Neo4j schema:**
```cypher
// Node label (PascalCase per convention)
(:Chunk {id, content_id, chunk_index, text, token_count})

// Relationship (typed with direction)
(Content)-[:HAS_CHUNK {chunk_index}]->(Chunk)
```

## 5. API Contract (complete request/response)

No REST endpoints. The ChunkWriterService is called internally by the content pipeline (STORY-F-27) after the embed stage completes. The service receives embedded chunks and writes them to both stores.

**Internal service call:**

```typescript
// Called from ContentPipeline after embed stage
const result = await chunkWriterService.writeBatch(contentId, embeddedChunks);
// Returns ChunkBatchWriteResult with sync_status
```

**Future read access** (for semantic search):

```typescript
// ChunkRepository.findByContentId(contentId) -- returns ordered chunks
// ChunkRepository.vectorSearch(queryEmbedding, limit) -- cosine similarity
```

## 6. Frontend Spec

Not applicable for this story. Chunks are internal data structures used by the semantic search and concept extraction systems. No user-facing UI displays raw chunks.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/content/chunk.types.ts` | Types | Create |
| 2 | `packages/types/src/content/index.ts` | Types | Edit (add chunk exports) |
| 3 | Supabase migration via MCP: `create_chunks_table` | Database | Apply |
| 4 | `apps/server/src/errors/chunk.errors.ts` | Errors | Create |
| 5 | `apps/server/src/errors/index.ts` | Errors | Edit (add export) |
| 6 | `apps/server/src/models/chunk.model.ts` | Model | Create |
| 7 | `apps/server/src/repositories/chunk.repository.ts` | Repository | Create |
| 8 | `apps/server/src/services/chunkWriter.service.ts` | Service | Create |
| 9 | `apps/server/src/__tests__/chunkWriter.service.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-27 | faculty | Required | Content pipeline produces embedded chunks |
| STORY-F-24 | faculty | Required | Contents table (FK target for chunks) |
| STORY-U-4 | universal | **DONE** | Neo4j client config for graph operations |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client (includes pgvector support)
- `neo4j-driver` -- Neo4j driver for graph writes
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` -- `Neo4jClientConfig` for Neo4j driver
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/content/pipeline.types.ts` -- `EmbeddedChunk` type (STORY-F-27)

## 9. Test Fixtures (inline)

```typescript
import type {
  Chunk,
  ChunkInsertRow,
  Neo4jChunkNode,
  ChunkBatchWriteResult,
  ChunkSyncStatus,
} from "@journey-os/types";
import type { EmbeddedChunk } from "@journey-os/types";

/** Mock content ID */
export const MOCK_CONTENT_ID = "content-uuid-001";

/** Mock 1024-dim embedding vector */
export const MOCK_EMBEDDING = new Array(1024).fill(0.01);

/** Mock embedded chunks (from pipeline) */
export const MOCK_EMBEDDED_CHUNKS: EmbeddedChunk[] = [
  {
    content_id: MOCK_CONTENT_ID,
    chunk_index: 0,
    text: "The cardiovascular system consists of the heart, blood vessels, and blood.",
    token_count: 12,
    start_char: 0,
    end_char: 73,
    embedding: MOCK_EMBEDDING,
  },
  {
    content_id: MOCK_CONTENT_ID,
    chunk_index: 1,
    text: "Blood vessels include arteries, veins, and capillaries that form a network.",
    token_count: 13,
    start_char: 63,
    end_char: 137,
    embedding: MOCK_EMBEDDING,
  },
];

/** Expected Supabase insert rows */
export const EXPECTED_INSERT_ROWS: ChunkInsertRow[] = MOCK_EMBEDDED_CHUNKS.map((chunk) => ({
  content_id: chunk.content_id,
  chunk_index: chunk.chunk_index,
  text: chunk.text,
  token_count: chunk.token_count,
  start_char: chunk.start_char,
  end_char: chunk.end_char,
  embedding: `[${chunk.embedding.join(",")}]`,
}));

/** Expected Neo4j chunk nodes (no embedding) */
export const EXPECTED_NEO4J_NODES: Neo4jChunkNode[] = MOCK_EMBEDDED_CHUNKS.map((chunk) => ({
  id: expect.any(String),
  content_id: chunk.content_id,
  chunk_index: chunk.chunk_index,
  text: chunk.text,
  token_count: chunk.token_count,
}));

/** Mock stored chunk (from Supabase) */
export const MOCK_STORED_CHUNK: Chunk = {
  id: "chunk-uuid-001",
  content_id: MOCK_CONTENT_ID,
  chunk_index: 0,
  text: "The cardiovascular system consists of the heart, blood vessels, and blood.",
  token_count: 12,
  start_char: 0,
  end_char: 73,
  embedding: MOCK_EMBEDDING,
  sync_status: "synced",
  created_at: "2026-02-19T12:00:00Z",
};

/** Mock successful batch write result */
export const MOCK_SUCCESS_RESULT: ChunkBatchWriteResult = {
  content_id: MOCK_CONTENT_ID,
  chunks_written: 2,
  supabase_success: true,
  neo4j_success: true,
  sync_status: "synced",
  errors: [],
};

/** Mock partial failure result (Neo4j failed) */
export const MOCK_PARTIAL_FAILURE: ChunkBatchWriteResult = {
  content_id: MOCK_CONTENT_ID,
  chunks_written: 2,
  supabase_success: true,
  neo4j_success: false,
  sync_status: "pending_sync",
  errors: ["Neo4j write failed: connection timeout"],
};
```

## 10. API Test Spec (vitest -- PRIMARY)

### `apps/server/src/__tests__/chunkWriter.service.test.ts` (11 tests)

```
describe("ChunkWriterService")
  describe("writeBatch")
    it writes embedded chunks to Supabase with pgvector embeddings
    it writes chunk nodes to Neo4j without embeddings
    it creates HAS_CHUNK relationships from Content to each Chunk
    it preserves chunk_index ordering in both stores
    it sets sync_status to "synced" when both writes succeed
    it sets sync_status to "pending_sync" when Neo4j fails
    it does NOT rollback Supabase insert when Neo4j fails
    it uses Supabase batch insert for all chunks in single query
    it uses Neo4j UNWIND for batch node creation

  describe("ChunkRepository")
    it reads chunks by content_id ordered by chunk_index
    it returns empty array for content_id with no chunks

  describe("error handling")
    it throws ChunkWriteError when Supabase insert fails
```

**Total: 11 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Dual-write chunks are an internal data operation with no user-facing UI. E2E coverage will be part of the full content processing journey.

## 12. Acceptance Criteria

1. Chunk TypeScript types define: id, content_id, chunk_index, text, token_count, embedding, sync_status
2. ChunkRepository supports create (batch) and read operations for Supabase
3. Neo4j `Chunk` nodes created with properties: id, chunk_index, text, token_count (no embedding)
4. Neo4j relationship: `(Content)-[:HAS_CHUNK]->(Chunk)` with chunk_index ordering
5. DualWriteService pattern: Supabase first, Neo4j second, `sync_status = 'synced'`
6. Embeddings stored in Supabase pgvector `vector(1024)` column with HNSW index
7. Neo4j does NOT store embeddings (graph traversal only)
8. Batch write: all chunks for a content record in single transaction per store
9. On Neo4j failure: `sync_status = 'pending_sync'`, Supabase insert NOT rolled back
10. Chunk ordering preserved via chunk_index
11. All 11 API tests pass
12. TypeScript strict mode, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| DualWrite pattern | ARCHITECTURE_v10 Section 5.4: "Supabase first, Neo4j second, sync_status = synced" |
| Embedding in pgvector only | S-F-11-4: "Embedding NOT stored in Neo4j -- pgvector in Supabase handles all vector operations" |
| Neo4j Chunk label PascalCase | S-F-11-4: "Neo4j Chunk label: Chunk (PascalCase per convention)" |
| HAS_CHUNK relationship | S-F-11-4: "(Content)-[:HAS_CHUNK]->(Chunk)" |
| Batch insert Supabase | S-F-11-4: "Supabase .insert() for multiple rows" |
| Neo4j UNWIND | S-F-11-4: "Neo4j UNWIND for batch node creation" |
| pending_sync on failure | S-F-11-4: "sync_status = 'pending_sync', background job retries" |
| 1024-dim vectors | ARCHITECTURE_v10: "All embeddings are 1024-dim (Voyage AI voyage-3-large)" |
| HNSW index for cosine | S-F-11-2: "HNSW index for cosine similarity search" |

## 14. Environment Prerequisites

- **Supabase:** Project running, `contents` table exists (STORY-F-24), pgvector extension enabled
- **Neo4j:** Running and accessible, `Content` nodes exist (from pipeline)
- **Express:** Server running on port 3001
- **No new npm packages** required
- **pgvector extension:** Must be enabled in Supabase (`CREATE EXTENSION IF NOT EXISTS vector`)

## 15. Implementation Notes

- **ChunkWriterService:**

```typescript
import { SupabaseClient } from "@supabase/supabase-js";
import { Driver } from "neo4j-driver";
import type { EmbeddedChunk, ChunkBatchWriteResult, ChunkSyncStatus } from "@journey-os/types";

export class ChunkWriterService {
  readonly #supabaseClient: SupabaseClient;
  readonly #neo4jDriver: Driver;

  constructor(supabaseClient: SupabaseClient, neo4jDriver: Driver) {
    this.#supabaseClient = supabaseClient;
    this.#neo4jDriver = neo4jDriver;
  }

  async writeBatch(contentId: string, chunks: EmbeddedChunk[]): Promise<ChunkBatchWriteResult> {
    // Step 1: Write to Supabase (source of truth)
    const rows = chunks.map((chunk) => ({
      content_id: chunk.content_id,
      chunk_index: chunk.chunk_index,
      text: chunk.text,
      token_count: chunk.token_count,
      start_char: chunk.start_char,
      end_char: chunk.end_char,
      embedding: `[${chunk.embedding.join(",")}]`,
      sync_status: "pending_sync",
    }));

    const { data: insertedRows, error: supaError } = await this.#supabaseClient
      .from("chunks")
      .insert(rows)
      .select();

    if (supaError) {
      throw new ChunkWriteError(`Supabase chunk insert failed: ${supaError.message}`);
    }

    // Step 2: Write to Neo4j (graph projection, no embeddings)
    let neo4jSuccess = true;
    try {
      const session = this.#neo4jDriver.session();
      try {
        await session.executeWrite(async (tx) => {
          await tx.run(
            `UNWIND $chunks AS chunk
             CREATE (c:Chunk {
               id: chunk.id,
               content_id: chunk.content_id,
               chunk_index: chunk.chunk_index,
               text: chunk.text,
               token_count: chunk.token_count
             })
             WITH c, chunk
             MATCH (content:Content {id: chunk.content_id})
             CREATE (content)-[:HAS_CHUNK {chunk_index: chunk.chunk_index}]->(c)`,
            {
              chunks: insertedRows.map((row) => ({
                id: row.id,
                content_id: row.content_id,
                chunk_index: row.chunk_index,
                text: row.text,
                token_count: row.token_count,
              })),
            },
          );
        });
      } finally {
        await session.close();
      }
    } catch {
      neo4jSuccess = false;
    }

    // Step 3: Update sync_status
    const syncStatus: ChunkSyncStatus = neo4jSuccess ? "synced" : "pending_sync";
    await this.#supabaseClient
      .from("chunks")
      .update({ sync_status: syncStatus })
      .eq("content_id", contentId);

    return {
      content_id: contentId,
      chunks_written: insertedRows.length,
      supabase_success: true,
      neo4j_success: neo4jSuccess,
      sync_status: syncStatus,
      errors: neo4jSuccess ? [] : ["Neo4j write failed"],
    };
  }
}
```

- **ChunkModel:**

```typescript
export class ChunkModel {
  readonly #id: string;
  readonly #contentId: string;
  readonly #chunkIndex: number;
  readonly #text: string;
  readonly #tokenCount: number;
  readonly #embedding: ReadonlyArray<number>;
  #syncStatus: ChunkSyncStatus;

  constructor(data: Chunk) {
    this.#id = data.id;
    this.#contentId = data.content_id;
    this.#chunkIndex = data.chunk_index;
    this.#text = data.text;
    this.#tokenCount = data.token_count;
    this.#embedding = data.embedding;
    this.#syncStatus = data.sync_status;
  }

  get id(): string { return this.#id; }
  get contentId(): string { return this.#contentId; }
  // ... other getters
}
```

- **pgvector format:** Embeddings are stored as `vector(1024)` type. Insert uses string format: `'[0.01, 0.02, ...]'`. Supabase JS client handles this via the `.insert()` call.

- **Error class:**

```
JourneyOSError
  └── ChunkWriteError (code: "CHUNK_WRITE_ERROR")
```

- **OOP:** All classes use JS `#private` fields, constructor DI.
- **vi.hoisted()** needed for Supabase and Neo4j driver mocks in tests.
- **Neo4j mock pattern:** Use `vi.hoisted()` to declare mock session and tx objects before `vi.mock("neo4j-driver")`.
