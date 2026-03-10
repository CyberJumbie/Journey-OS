# SOL-008: Dual Embedding Provider (Voyage AI + OpenAI)

**Status:** Active — Phase 1 through Phase 2  
**Problem:** We want to run Voyage AI and OpenAI embeddings in parallel for 6 months to compare retrieval quality before committing to one provider long-term.

---

## Core Design Decision

Voyage AI `voyage-large-2` = **1024-dim**. OpenAI `text-embedding-3-small` = **1536-dim**. These dimensions are incompatible — they cannot share a single `vector(N)` column.

**Solution:** Two nullable vector columns in `content_chunk_embeddings`, two HNSW indexes, one Strategy-pattern `IEmbeddingProvider` interface, one config flag for search-time provider selection.

```
content_chunk_embeddings
  voyage_embedding  vector(1024)   ← nullable, populated when Voyage is enabled
  openai_embedding  vector(1536)   ← nullable, populated when OpenAI is enabled
```

At ingest time: embed with ALL configured providers (both columns populated).  
At search time: use whichever `EMBEDDING_SEARCH_PROVIDER` points to.  
Comparison: switch `EMBEDDING_SEARCH_PROVIDER` and observe retrieval quality difference.

---

## Database Schema

```sql
-- Drop old single-column table if it exists
ALTER TABLE content_chunk_embeddings
  DROP COLUMN IF EXISTS embedding,
  DROP COLUMN IF EXISTS model_name,
  ADD COLUMN IF NOT EXISTS voyage_embedding  vector(1024),
  ADD COLUMN IF NOT EXISTS voyage_model      TEXT DEFAULT 'voyage-large-2',
  ADD COLUMN IF NOT EXISTS openai_embedding  vector(1536),
  ADD COLUMN IF NOT EXISTS openai_model      TEXT DEFAULT 'text-embedding-3-small';

-- HNSW index per provider — separate indexes, separate ops classes
CREATE INDEX IF NOT EXISTS idx_voyage_hnsw
  ON content_chunk_embeddings
  USING hnsw (voyage_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_openai_hnsw
  ON content_chunk_embeddings
  USING hnsw (openai_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

---

## IEmbeddingProvider Interface (Strategy Pattern)

```typescript
// backend/src/ingestion/providers/IEmbeddingProvider.ts
export interface IEmbeddingProvider {
  readonly name: 'voyage' | 'openai';
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}
```

## VoyageEmbeddingProvider

```typescript
// backend/src/ingestion/providers/VoyageEmbeddingProvider.ts
export class VoyageEmbeddingProvider implements IEmbeddingProvider {
  readonly name = 'voyage' as const;
  readonly model = 'voyage-large-2';
  readonly dimensions = 1024;

  constructor(private apiKey: string) {}

  async embed(texts: string[]): Promise<number[][]> {
    const BATCH_SIZE = 128; // Voyage API limit
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ model: this.model, input: batch }),
      });
      if (!response.ok) throw new Error(`Voyage API error: ${response.status}`);
      const { data } = await response.json();
      results.push(...data.map((d: any) => d.embedding));
    }
    return results;
  }
}
```

## OpenAIEmbeddingProvider

```typescript
// backend/src/ingestion/providers/OpenAIEmbeddingProvider.ts
import OpenAI from 'openai';

export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  readonly name = 'openai' as const;
  readonly model = 'text-embedding-3-small';
  readonly dimensions = 1536;

  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async embed(texts: string[]): Promise<number[][]> {
    const BATCH_SIZE = 100; // OpenAI recommends max 100 for batch stability
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const response = await this.client.embeddings.create({
        model: this.model,
        input: batch,
        encoding_format: 'float',
      });
      results.push(...response.data.map(d => d.embedding));
    }
    return results;
  }
}
```

## EmbeddingProviderFactory

```typescript
// backend/src/ingestion/providers/EmbeddingProviderFactory.ts
export class EmbeddingProviderFactory {
  /**
   * Returns all providers that should run at INGEST time.
   * Controlled by EMBEDDING_PROVIDERS=voyage,openai (comma-separated).
   */
  static getIngestProviders(config: AppConfig): IEmbeddingProvider[] {
    const enabled = (config.EMBEDDING_PROVIDERS ?? 'voyage').split(',').map(s => s.trim());
    const providers: IEmbeddingProvider[] = [];

    if (enabled.includes('voyage') && config.VOYAGE_API_KEY) {
      providers.push(new VoyageEmbeddingProvider(config.VOYAGE_API_KEY));
    }
    if (enabled.includes('openai') && config.OPENAI_API_KEY) {
      providers.push(new OpenAIEmbeddingProvider(config.OPENAI_API_KEY));
    }
    if (providers.length === 0) {
      throw new Error('[EmbeddingProviderFactory] No embedding providers configured. Set EMBEDDING_PROVIDERS and corresponding API keys.');
    }
    return providers;
  }

  /**
   * Returns the single provider to use at SEARCH time.
   * Controlled by EMBEDDING_SEARCH_PROVIDER=voyage|openai.
   */
  static getSearchProvider(config: AppConfig): IEmbeddingProvider {
    const name = config.EMBEDDING_SEARCH_PROVIDER ?? 'voyage';
    if (name === 'voyage' && config.VOYAGE_API_KEY) {
      return new VoyageEmbeddingProvider(config.VOYAGE_API_KEY);
    }
    if (name === 'openai' && config.OPENAI_API_KEY) {
      return new OpenAIEmbeddingProvider(config.OPENAI_API_KEY);
    }
    throw new Error(`[EmbeddingProviderFactory] Search provider '${name}' configured but API key missing.`);
  }
}
```

## EmbedderService (updated for dual providers)

```typescript
// backend/src/ingestion/EmbedderService.ts
export class EmbedderService {
  private ingestProviders: IEmbeddingProvider[];
  private searchProvider: IEmbeddingProvider;

  constructor(config: AppConfig, private chunkRepo: ChunkRepository) {
    this.ingestProviders = EmbeddingProviderFactory.getIngestProviders(config);
    this.searchProvider = EmbeddingProviderFactory.getSearchProvider(config);
  }

  /**
   * Embed chunks with ALL configured providers and store in DB.
   * Runs providers sequentially (not parallel) to avoid rate-limit conflicts.
   */
  async embedChunks(chunks: ContentChunk[]): Promise<void> {
    const texts = chunks.map(c => c.content);

    for (const provider of this.ingestProviders) {
      const embeddings = await provider.embed(texts);

      for (let i = 0; i < chunks.length; i++) {
        await this.chunkRepo.upsertEmbedding({
          chunk_id: chunks[i].id,
          provider: provider.name,
          embedding: embeddings[i],
          model: provider.model,
        });
      }

      console.log(`[EmbedderService] ${provider.name} embeddings stored for ${chunks.length} chunks`);
    }
  }

  /**
   * Semantic search using the configured search provider.
   * Optionally override provider at call time for A/B testing.
   */
  async searchChunks(
    query: string,
    courseId: string,
    limit: number,
    overrideProvider?: 'voyage' | 'openai'
  ): Promise<ContentChunk[]> {
    const provider = overrideProvider
      ? EmbeddingProviderFactory.getSearchProvider({ ...config, EMBEDDING_SEARCH_PROVIDER: overrideProvider })
      : this.searchProvider;

    const [queryEmbedding] = await provider.embed([query]);
    const column = provider.name === 'voyage' ? 'voyage_embedding' : 'openai_embedding';

    return this.chunkRepo.searchByVector(queryEmbedding, courseId, limit, column);
  }
}
```

## ChunkRepository upsertEmbedding

```typescript
// In chunk.repository.ts
async upsertEmbedding(data: {
  chunk_id: string;
  provider: 'voyage' | 'openai';
  embedding: number[];
  model: string;
}): Promise<void> {
  const column = data.provider === 'voyage' ? 'voyage_embedding' : 'openai_embedding';
  const modelColumn = data.provider === 'voyage' ? 'voyage_model' : 'openai_model';

  const { error } = await this.supabase
    .from('content_chunk_embeddings')
    .upsert({
      chunk_id: data.chunk_id,
      [column]: JSON.stringify(data.embedding),
      [modelColumn]: data.model,
    }, { onConflict: 'chunk_id' });

  if (error) throw new DatabaseError(error.message);
}

async searchByVector(
  embedding: number[],
  courseId: string,
  limit: number,
  column: 'voyage_embedding' | 'openai_embedding'
): Promise<ContentChunk[]> {
  // pgvector cosine similarity search on the specified column
  const { data, error } = await this.supabase.rpc('search_chunks', {
    query_embedding: embedding,
    course_id: courseId,
    match_count: limit,
    embedding_column: column,
  });
  if (error) throw new DatabaseError(error.message);
  return data;
}
```

## Supabase RPC Function

```sql
-- Create a generic search function that accepts the column name
-- (PostgreSQL doesn't support dynamic column selection in standard SQL,
--  so we use two overloaded functions)

CREATE OR REPLACE FUNCTION search_chunks_voyage(
  query_embedding vector(1024),
  course_id UUID,
  match_count INT DEFAULT 10
)
RETURNS TABLE (id UUID, content TEXT, similarity FLOAT)
LANGUAGE SQL STABLE
AS $$
  SELECT cc.id, cc.content,
    1 - (cce.voyage_embedding <=> query_embedding) AS similarity
  FROM content_chunks cc
  JOIN content_chunk_embeddings cce ON cc.id = cce.chunk_id
  WHERE cc.course_id = course_id
    AND cce.voyage_embedding IS NOT NULL
  ORDER BY cce.voyage_embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION search_chunks_openai(
  query_embedding vector(1536),
  course_id UUID,
  match_count INT DEFAULT 10
)
RETURNS TABLE (id UUID, content TEXT, similarity FLOAT)
LANGUAGE SQL STABLE
AS $$
  SELECT cc.id, cc.content,
    1 - (cce.openai_embedding <=> query_embedding) AS similarity
  FROM content_chunks cc
  JOIN content_chunk_embeddings cce ON cc.id = cce.chunk_id
  WHERE cc.course_id = course_id
    AND cce.openai_embedding IS NOT NULL
  ORDER BY cce.openai_embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## Environment Variables

```env
# Which providers to run at INGEST time (both = store both embeddings per chunk)
EMBEDDING_PROVIDERS=voyage,openai

# Which provider to use at SEARCH time (switch to compare)
EMBEDDING_SEARCH_PROVIDER=voyage

# Keys
VOYAGE_API_KEY=pa-...
OPENAI_API_KEY=sk-...
```

---

## Switching Providers for Comparison

To compare retrieval quality over 6 months:

1. Both providers embed at ingest time (both columns populated for every chunk)
2. Week 1–12: `EMBEDDING_SEARCH_PROVIDER=voyage` — baseline
3. Week 13–26: `EMBEDDING_SEARCH_PROVIDER=openai` — comparison
4. Or A/B: pass `overrideProvider` parameter at search time to compare within a session

**Metrics to track in `generation_logs`:**
- Which provider was used for context_compiler RAG search
- Number of chunks retrieved (N in "Found N chunks")
- Final question validation pass rate
- Faculty approval rate (proxy for generation quality)

After 6 months, compare: approval rate by provider × retrieval N × cost.

---

## Cost Comparison (approximate)

| Provider | Model | Dimensions | Cost per 1M tokens | Phase 1 estimate |
|----------|-------|------------|-------------------|-----------------|
| Voyage AI | voyage-large-2 | 1024 | $0.12 | ~$0.50/syllabus |
| OpenAI | text-embedding-3-small | 1536 | $0.02 | ~$0.08/syllabus |
| OpenAI | text-embedding-3-large | 3072 | $0.13 | ~$0.55/syllabus |

`text-embedding-3-small` is the cost-comparable choice for fair comparison vs Voyage.

---

## Failure Modes

1. **Only one provider has embeddings** — if you add OpenAI after initial ingest, run `POST /api/v1/admin/re-embed?provider=openai` to backfill OpenAI embeddings for existing chunks
2. **Search provider column is NULL** — if `EMBEDDING_SEARCH_PROVIDER=openai` but OpenAI ingest never ran, all searches return empty. Check: `SELECT count(*) FROM content_chunk_embeddings WHERE openai_embedding IS NULL`
3. **Dimension mismatch error** — if you try to search with `voyage_embedding` column using a 1536-dim query vector. `EmbeddingProviderFactory.getSearchProvider()` must return the same provider as the column being queried
4. **Rate limits** — Voyage: 300 RPM. OpenAI: 3000 RPM (tier 1). Run providers sequentially at ingest, not parallel
5. **UPSERT conflict on chunk_id** — use `onConflict: 'chunk_id'` on the embeddings table so re-ingesting a course updates both columns rather than failing
