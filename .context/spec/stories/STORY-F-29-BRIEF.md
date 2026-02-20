# STORY-F-29 Brief: Voyage AI Embedding Integration

## 0. Lane & Priority

```yaml
story_id: STORY-F-29
old_id: S-F-11-2
lane: faculty
lane_priority: 3
within_lane_order: 29
sprint: 4
size: M
depends_on:
  - STORY-F-27 (faculty) — Content pipeline orchestration calls the embedding service
blocks: []
personas_served: [faculty]
epic: E-11 (Content Processing Pipeline)
feature: F-05 (Content Upload & Storage)
```

## 1. Summary

Build the **VoyageEmbedService** that wraps the Voyage AI API (voyage-3-large model) for generating 1024-dimensional embeddings from content chunks. The service supports batch embedding (up to 128 chunks per API call), rate limiting with exponential backoff, input validation, and implements the `IEmbedService` interface for testability and future provider swaps.

Key constraints:
- All embeddings in Journey OS are 1024-dim (architecture rule) -- enforced in type and runtime
- Voyage AI voyage-3-large supports up to 16,000 tokens input; chunks are 800 tokens (within limits)
- Batch processing: up to 128 chunks per API call to amortize overhead
- Rate limiting: respect Voyage AI rate limits with exponential backoff
- Input validation: reject empty strings, truncate chunks exceeding model max tokens
- API key stored in environment variable `VOYAGE_API_KEY`, never hardcoded
- VoyageEmbedService implements `IEmbedService` interface
- pgvector column type: `vector(1024)` with HNSW index for cosine similarity

## 2. Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define embedding types, config types | `packages/types/src/content/embedding.types.ts` | 20m |
| 2 | Update barrel export | `packages/types/src/content/index.ts` | 5m |
| 3 | Create Voyage config | `apps/server/src/config/voyage.config.ts` | 15m |
| 4 | Create `EmbedError` error class (if not from F-27) | `apps/server/src/errors/embed.errors.ts` | 10m |
| 5 | Export new error | `apps/server/src/errors/index.ts` | 5m |
| 6 | Implement `VoyageEmbedService` | `apps/server/src/services/voyage.service.ts` | 90m |
| 7 | Write API tests (9 tests) | `apps/server/src/__tests__/voyage.service.test.ts` | 75m |

**Total estimate:** ~4 hours (Size M)

## 3. Data Model (inline, complete)

### `packages/types/src/content/embedding.types.ts`

```typescript
/**
 * Embedding model configuration.
 */
export interface EmbeddingModelConfig {
  readonly modelName: string;
  readonly dimensions: number;
  readonly maxTokensPerInput: number;
  readonly maxBatchSize: number;
  readonly apiBaseUrl: string;
}

/**
 * Default Voyage AI configuration.
 */
export const VOYAGE_CONFIG: EmbeddingModelConfig = {
  modelName: "voyage-3-large",
  dimensions: 1024,
  maxTokensPerInput: 16000,
  maxBatchSize: 128,
  apiBaseUrl: "https://api.voyageai.com/v1",
};

/**
 * Embedding request to Voyage AI API.
 */
export interface VoyageEmbedRequest {
  readonly model: string;
  readonly input: ReadonlyArray<string>;
  readonly input_type: "document" | "query";
}

/**
 * Embedding response from Voyage AI API.
 */
export interface VoyageEmbedResponse {
  readonly object: "list";
  readonly data: ReadonlyArray<{
    readonly object: "embedding";
    readonly index: number;
    readonly embedding: ReadonlyArray<number>;
  }>;
  readonly model: string;
  readonly usage: {
    readonly total_tokens: number;
  };
}

/**
 * Rate limit configuration.
 */
export interface RateLimitConfig {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
}

/**
 * Default rate limit configuration.
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * Embedding result for a single chunk.
 */
export interface EmbeddingResult {
  readonly chunkIndex: number;
  readonly embedding: ReadonlyArray<number>;
  readonly tokenCount: number;
}

/**
 * Batch embedding result.
 */
export interface BatchEmbeddingResult {
  readonly results: ReadonlyArray<EmbeddingResult>;
  readonly totalTokens: number;
  readonly durationMs: number;
  readonly model: string;
}
```

## 4. Database Schema (inline, complete)

No new tables or migrations. The `chunks` table with pgvector `vector(1024)` column and HNSW index is created in STORY-F-28. This story provides the service that generates the embedding vectors stored in that column.

## 5. API Contract (complete request/response)

No REST endpoints. The VoyageEmbedService is called internally by the content pipeline (STORY-F-27) during the embed stage.

**Voyage AI API call (external):**

```
POST https://api.voyageai.com/v1/embeddings
Authorization: Bearer {VOYAGE_API_KEY}
Content-Type: application/json

{
  "model": "voyage-3-large",
  "input": ["chunk text 1", "chunk text 2", ...],
  "input_type": "document"
}

Response:
{
  "object": "list",
  "data": [
    { "object": "embedding", "index": 0, "embedding": [0.01, 0.02, ...] },
    { "object": "embedding", "index": 1, "embedding": [0.03, 0.04, ...] }
  ],
  "model": "voyage-3-large",
  "usage": { "total_tokens": 1500 }
}
```

**Internal service call:**

```typescript
// Called from ContentPipeline.embed step
const embeddedChunks = await voyageEmbedService.embedBatch(chunks);
// Returns EmbeddedChunk[] with 1024-dim vectors
```

## 6. Frontend Spec

Not applicable for this story. Embedding generation is a server-side background process with no user-facing UI.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/content/embedding.types.ts` | Types | Create |
| 2 | `packages/types/src/content/index.ts` | Types | Edit (add embedding exports) |
| 3 | `apps/server/src/config/voyage.config.ts` | Config | Create |
| 4 | `apps/server/src/errors/embed.errors.ts` | Errors | Create (if not from F-27) |
| 5 | `apps/server/src/errors/index.ts` | Errors | Edit (add export if new) |
| 6 | `apps/server/src/services/voyage.service.ts` | Service | Create |
| 7 | `apps/server/src/__tests__/voyage.service.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-27 | faculty | Required | Pipeline orchestration calls embedBatch() on this service |

### NPM Packages (already installed)
- `vitest` -- Testing

### NPM Packages (new)
| Package | Version | Purpose | Size |
|---------|---------|---------|------|
| None | -- | Voyage AI API is called via native `fetch` | -- |

### Existing Files Needed
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/content/pipeline.types.ts` -- `IEmbedService`, `ContentChunk`, `EmbeddedChunk` (STORY-F-27)

## 9. Test Fixtures (inline)

```typescript
import type {
  VoyageEmbedResponse,
  EmbeddingResult,
  BatchEmbeddingResult,
} from "@journey-os/types";
import type { ContentChunk, EmbeddedChunk } from "@journey-os/types";

/** Mock Voyage API key */
export const MOCK_VOYAGE_API_KEY = "voy-test-key-123456";

/** Mock content chunks for embedding */
export const MOCK_CHUNKS: ContentChunk[] = [
  {
    content_id: "content-uuid-001",
    chunk_index: 0,
    text: "The cardiovascular system consists of the heart, blood vessels, and blood.",
    token_count: 12,
    start_char: 0,
    end_char: 73,
  },
  {
    content_id: "content-uuid-001",
    chunk_index: 1,
    text: "Blood vessels include arteries, veins, and capillaries that form a network.",
    token_count: 13,
    start_char: 63,
    end_char: 137,
  },
];

/** Mock 1024-dim embedding */
export const MOCK_EMBEDDING_1024 = new Array(1024).fill(0).map((_, i) => Math.sin(i * 0.01));

/** Mock Voyage API success response */
export const MOCK_VOYAGE_RESPONSE: VoyageEmbedResponse = {
  object: "list",
  data: [
    { object: "embedding", index: 0, embedding: MOCK_EMBEDDING_1024 },
    { object: "embedding", index: 1, embedding: MOCK_EMBEDDING_1024 },
  ],
  model: "voyage-3-large",
  usage: { total_tokens: 25 },
};

/** Mock Voyage API rate limit response */
export const MOCK_RATE_LIMIT_RESPONSE = {
  status: 429,
  headers: { "retry-after": "2" },
  body: { error: "Rate limit exceeded" },
};

/** Mock Voyage API error response */
export const MOCK_API_ERROR_RESPONSE = {
  status: 500,
  body: { error: "Internal server error" },
};

/** Empty string chunk (should be rejected) */
export const MOCK_EMPTY_CHUNK: ContentChunk = {
  content_id: "content-uuid-001",
  chunk_index: 0,
  text: "",
  token_count: 0,
  start_char: 0,
  end_char: 0,
};

/** Wrong dimension embedding (512 instead of 1024) */
export const MOCK_WRONG_DIM_RESPONSE: VoyageEmbedResponse = {
  object: "list",
  data: [{ object: "embedding", index: 0, embedding: new Array(512).fill(0.01) }],
  model: "voyage-3-large",
  usage: { total_tokens: 12 },
};

/** Large batch of chunks (130 items, exceeds max batch size of 128) */
export const MOCK_LARGE_BATCH: ContentChunk[] = Array.from({ length: 130 }, (_, i) => ({
  content_id: "content-uuid-001",
  chunk_index: i,
  text: `Chunk number ${i} with some medical content about anatomy.`,
  token_count: 10,
  start_char: i * 60,
  end_char: (i + 1) * 60,
}));
```

## 10. API Test Spec (vitest -- PRIMARY)

### `apps/server/src/__tests__/voyage.service.test.ts` (9 tests)

```
describe("VoyageEmbedService")
  describe("embedBatch")
    it generates 1024-dim embeddings for batch of chunks
    it splits large batches into groups of 128 and combines results
    it validates output dimensions are exactly 1024
    it rejects empty string inputs with EmbedError

  describe("rate limiting")
    it retries on 429 with exponential backoff
    it throws EmbedError after max retries exhausted

  describe("error handling")
    it throws EmbedError on Voyage API 500 response
    it throws EmbedError when response dimensions mismatch (not 1024)

  describe("configuration")
    it reads VOYAGE_API_KEY from environment variable
```

**Total: 9 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Embedding generation is a server-side background process. E2E coverage will be part of the full content processing and semantic search journey.

## 12. Acceptance Criteria

1. VoyageEmbedService wraps Voyage AI API (voyage-3-large model)
2. Batch embedding: processes up to 128 chunks per API call, splits larger batches
3. Output: 1024-dimensional float32 vectors per chunk (enforced at runtime)
4. Rate limiting: respects Voyage AI rate limits with exponential backoff (max 5 retries)
5. Embedding vectors stored in Supabase pgvector column (by STORY-F-28)
6. Error handling: retries transient API errors (429, 5xx), surfaces permanent failures
7. Input validation: rejects empty strings, validates chunk text is non-empty
8. VoyageEmbedService implements `IEmbedService` interface
9. API key from `VOYAGE_API_KEY` environment variable, never hardcoded
10. All 9 API tests pass
11. TypeScript strict mode, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| 1024-dim architecture rule | ARCHITECTURE_v10: "All embeddings are 1024-dim (Voyage AI voyage-3-large)" |
| Batch 128 chunks | S-F-11-2: "process up to 128 chunks per API call" |
| Exponential backoff | S-F-11-2: "respect Voyage AI rate limits with exponential backoff" |
| pgvector HNSW index | S-F-11-2: "HNSW index for cosine similarity search" |
| IEmbedService interface | S-F-11-2: "implements IEmbedService interface for testability and future provider swaps" |
| VOYAGE_API_KEY env var | S-F-11-2: "Store API key in environment variable VOYAGE_API_KEY" |
| 16,000 token max | S-F-11-2: "voyage-3-large supports up to 16,000 tokens input" |
| vector(1024) column | S-F-11-2: "pgvector column type: vector(1024)" |

## 14. Environment Prerequisites

- **VOYAGE_API_KEY:** Must be set in environment (`.env` file or system env)
- **Express:** Server running on port 3001
- **No Supabase needed** for this story (embeddings are persisted by STORY-F-28)
- **No Neo4j needed** for this story
- **No new npm packages** required (uses native `fetch` for HTTP calls)
- **Node.js >= 18.x** for native `fetch` support

## 15. Implementation Notes

- **VoyageEmbedService:**

```typescript
import type {
  IEmbedService,
  ContentChunk,
  EmbeddedChunk,
} from "@journey-os/types";
import type {
  VoyageEmbedRequest,
  VoyageEmbedResponse,
  EmbeddingModelConfig,
  RateLimitConfig,
} from "@journey-os/types";
import { VOYAGE_CONFIG, DEFAULT_RATE_LIMIT_CONFIG } from "@journey-os/types";

export class VoyageEmbedService implements IEmbedService {
  readonly #apiKey: string;
  readonly #config: EmbeddingModelConfig;
  readonly #rateLimitConfig: RateLimitConfig;

  constructor(apiKey: string, config?: Partial<EmbeddingModelConfig>) {
    if (!apiKey) {
      throw new EmbedError("VOYAGE_API_KEY is required");
    }
    this.#apiKey = apiKey;
    this.#config = { ...VOYAGE_CONFIG, ...config };
    this.#rateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG;
  }

  get modelName(): string { return this.#config.modelName; }
  get dimensions(): number { return this.#config.dimensions; }

  async embedBatch(chunks: ReadonlyArray<ContentChunk>): Promise<ReadonlyArray<EmbeddedChunk>> {
    // Validate inputs
    this.#validateInputs(chunks);

    // Split into batches of maxBatchSize
    const batches = this.#splitBatches(chunks);
    const allResults: EmbeddedChunk[] = [];

    for (const batch of batches) {
      const response = await this.#callApi(batch.map((c) => c.text));
      this.#validateDimensions(response);

      for (let i = 0; i < batch.length; i++) {
        allResults.push({
          ...batch[i]!,
          embedding: response.data[i]!.embedding,
        });
      }
    }

    return allResults;
  }

  async #callApi(texts: string[]): Promise<VoyageEmbedResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.#rateLimitConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.#config.apiBaseUrl}/embeddings`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.#apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.#config.modelName,
            input: texts,
            input_type: "document",
          } satisfies VoyageEmbedRequest),
        });

        if (response.status === 429) {
          const delay = this.#calculateBackoff(attempt);
          await this.#sleep(delay);
          continue;
        }

        if (!response.ok) {
          throw new EmbedError(`Voyage AI API error: ${response.status} ${response.statusText}`);
        }

        return (await response.json()) as VoyageEmbedResponse;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.#rateLimitConfig.maxRetries - 1) {
          await this.#sleep(this.#calculateBackoff(attempt));
        }
      }
    }

    throw new EmbedError(`Voyage AI API failed after ${this.#rateLimitConfig.maxRetries} retries: ${lastError?.message}`);
  }

  #validateInputs(chunks: ReadonlyArray<ContentChunk>): void {
    for (const chunk of chunks) {
      if (!chunk.text || chunk.text.trim().length === 0) {
        throw new EmbedError(`Empty text in chunk at index ${chunk.chunk_index}`);
      }
    }
  }

  #validateDimensions(response: VoyageEmbedResponse): void {
    for (const item of response.data) {
      if (item.embedding.length !== this.#config.dimensions) {
        throw new EmbedError(
          `Dimension mismatch: expected ${this.#config.dimensions}, got ${item.embedding.length}`
        );
      }
    }
  }

  #splitBatches(chunks: ReadonlyArray<ContentChunk>): ContentChunk[][] {
    const batches: ContentChunk[][] = [];
    for (let i = 0; i < chunks.length; i += this.#config.maxBatchSize) {
      batches.push([...chunks.slice(i, i + this.#config.maxBatchSize)]);
    }
    return batches;
  }

  #calculateBackoff(attempt: number): number {
    const delay = this.#rateLimitConfig.baseDelayMs * Math.pow(2, attempt);
    return Math.min(delay, this.#rateLimitConfig.maxDelayMs);
  }

  #sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

- **Voyage config file:**

```typescript
// apps/server/src/config/voyage.config.ts
import { VOYAGE_CONFIG } from "@journey-os/types";

export function getVoyageApiKey(): string {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) {
    throw new Error("VOYAGE_API_KEY environment variable is not set");
  }
  return key;
}

export { VOYAGE_CONFIG };
```

- **Error class** (may already exist from STORY-F-27):

```
JourneyOSError
  └── EmbedError (code: "EMBED_ERROR")
```

- **OOP:** VoyageEmbedService uses JS `#private` fields, constructor DI for API key and config.

- **Testing approach:** Mock the global `fetch` function using `vi.stubGlobal("fetch", vi.fn())` to simulate Voyage AI API responses without making actual HTTP calls.

- **vi.hoisted()** may be needed if mock variables are referenced inside `vi.mock()` closures.

- **Named exports only** for all types, config, service, and error classes.
