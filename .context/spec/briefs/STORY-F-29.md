# STORY-F-29: Voyage AI Embedding Integration

**Epic:** E-11 (Content Processing Pipeline)
**Feature:** F-05 (Content Upload & Processing)
**Sprint:** 4
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-11-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need content chunks embedded with Voyage AI so that semantic search and concept extraction can operate on vector representations.

## Acceptance Criteria
- [ ] `VoyageEmbedService` wrapping Voyage AI API (voyage-3-large model)
- [ ] Batch embedding: process up to 128 chunks per API call
- [ ] Output: 1024-dimensional float32 vectors per chunk
- [ ] Rate limiting: respect Voyage AI rate limits with exponential backoff
- [ ] Embedding vectors stored in Supabase pgvector column
- [ ] Error handling: retry transient API errors, surface permanent failures
- [ ] Input validation: reject empty strings, truncate chunks exceeding model max tokens
- [ ] `IEmbedService` interface for testability and future provider swaps
- [ ] 8-10 API tests covering batch embedding, rate limiting, error handling, dimension validation
- [ ] TypeScript strict, named exports only

## Reference Screens
No UI screens. Backend embedding service only.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | N/A |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/content/embedding.types.ts` |
| Interface | apps/server | `src/interfaces/embed-service.interface.ts` |
| Service | apps/server | `src/services/content/voyage-embed.service.ts` |
| Config | apps/server | `src/config/voyage.config.ts` |
| Tests | apps/server | `src/services/content/__tests__/voyage-embed.service.test.ts` |

## Database Schema
No new tables. Uses existing `chunks.embedding` column (`vector(1024)` with HNSW index) defined in STORY-F-28.

## API Endpoints
No REST endpoints. Called internally by the content pipeline (STORY-F-27) embed step.

## Dependencies
- **Blocked by:** STORY-F-27 (pipeline orchestration calls embedding service)
- **Blocks:** none
- **Cross-lane:** none

## Testing Requirements
- 8-10 API tests: single chunk embedding, batch embedding (128 chunks), empty string rejection, dimension validation (exactly 1024), rate limit backoff, transient error retry, permanent error surfacing, truncation of oversized chunks, provider interface compliance
- 0 E2E tests

## Implementation Notes
- All embeddings in Journey OS are 1024-dim (architecture rule) — enforce in type and runtime validation.
- Voyage AI `voyage-3-large` supports up to 16,000 tokens input; chunks are 800 tokens so well within limits.
- Batch processing amortizes API overhead: group chunks by `content_id` for efficient processing.
- Store API key in environment variable `VOYAGE_API_KEY` — validate at class instantiation, not in global zod env schema (lazy service pattern).
- `VoyageEmbedService` implements `IEmbedService` interface for testability and future provider swaps.
- pgvector column type: `vector(1024)` with HNSW index for cosine similarity search.
- Constructor DI pattern with `#apiKey` private field.
