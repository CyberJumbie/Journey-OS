# SOL-004: Voyage AI Embedding with Retry

## Trigger
Any time calling the Voyage AI embedding API. Always use this pattern — the API rate-limits and needs graceful retry.

Story it emerged from: P1-012 (embedding service)

## Pattern

### What it solves
Voyage AI has rate limits (RPM and TPM). Batch requests with exponential backoff prevent 429 failures from killing the ingestion pipeline.

### Implementation
```typescript
// apps/server/src/services/embedding.service.ts

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-large-2'
const EMBEDDING_DIM = 1024
const BATCH_SIZE = 128  // Voyage AI max batch size
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await fetchWithRetry(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model: VOYAGE_MODEL,
    }),
  })

  const data = await response.json()
  // Sort by index to preserve order (Voyage returns in arbitrary order)
  return data.data
    .sort((a: any, b: any) => a.index - b.index)
    .map((item: any) => item.embedding)
}

export async function embedChunks(chunks: ContentChunk[]): Promise<ContentChunkEmbedding[]> {
  const results: ContentChunkEmbedding[] = []
  
  // Process in batches to avoid hitting rate limits
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const embeddings = await embedBatch(batch.map(c => c.text))
    
    results.push(...batch.map((chunk, idx) => ({
      chunk_id: chunk.id,
      embedding: embeddings[idx],
      model: VOYAGE_MODEL,
      dimensions: EMBEDDING_DIM,
    })))
    
    // Rate limit courtesy delay between batches
    if (i + BATCH_SIZE < chunks.length) {
      await sleep(200)
    }
  }
  
  return results
}

async function fetchWithRetry(url: string, options: RequestInit, attempt = 0): Promise<Response> {
  const response = await fetch(url, options)
  
  if (response.status === 429 && attempt < MAX_RETRIES) {
    const retryAfter = response.headers.get('Retry-After')
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : BASE_DELAY_MS * Math.pow(2, attempt)
    await sleep(delay)
    return fetchWithRetry(url, options, attempt + 1)
  }
  
  if (!response.ok) {
    throw new Error(`Voyage AI error: ${response.status} ${await response.text()}`)
  }
  
  return response
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
```

### Supabase insert pattern for vectors
```typescript
// pgvector requires array format — Supabase handles the cast
const { error } = await supabase
  .from('content_chunk_embeddings')
  .insert(embeddings.map(e => ({
    chunk_id: e.chunk_id,
    embedding: e.embedding,  // number[] — pgvector casts automatically
    model: e.model,
  })))
```

### Gotchas
- Voyage AI returns results in arbitrary order — always sort by `index` field.
- The embedding dimension is 1024 for voyage-large-2. If the HNSW index was created with a different dimension, inserts will fail silently.
- BATCH_SIZE=128 is the Voyage max. Larger batches return 400.
- The Retry-After header is in seconds, not milliseconds — multiply by 1000.
- Never embed empty strings — they'll return a zero vector and pollute similarity search.

## Provenance
Pattern established: P1-012
Applies to: P1-012 (embedding service), any future re-embedding or index rebuild
