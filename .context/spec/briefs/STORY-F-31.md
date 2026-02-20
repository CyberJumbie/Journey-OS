# STORY-F-31: SubConcept Extraction Service

**Epic:** E-12 (AI Concept Extraction)
**Feature:** F-06 (Concept Extraction & Knowledge Graph)
**Sprint:** 5
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-12-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need AI-extracted SubConcepts from my content chunks so that the system automatically identifies what medical concepts are taught in my materials.

## Acceptance Criteria
- [ ] SubConcept TypeScript types: `id`, `name`, `description`, `source_chunk_id`, `content_id`, `course_id`, `status`, `confidence_score`
- [ ] `ExtractionService` using Claude Haiku (claude-3-haiku) with structured output prompt
- [ ] Prompt engineering: extract medical SubConcepts with name, description, and confidence score
- [ ] Process chunks in batches (10 chunks per LLM call) for efficiency
- [ ] Rate limiting: respect Anthropic API rate limits with exponential backoff
- [ ] SubConcept nodes created in Supabase with extraction metadata
- [ ] Confidence threshold: only persist SubConcepts with `confidence >= 0.7`
- [ ] SubConcept status lifecycle: `extracted` -> `enriched` -> `verified`
- [ ] 10-12 API tests covering extraction from various content types, prompt validation, batch processing, error handling
- [ ] TypeScript strict, named exports only

## Reference Screens
No UI screens. Backend extraction service only.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | N/A |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/concept/subconcept.types.ts` |
| Model | apps/server | `src/models/subconcept.model.ts` |
| Repository | apps/server | `src/repositories/subconcept.repository.ts` |
| Service | apps/server | `src/services/concept/extraction.service.ts` |
| Prompt | apps/server | `src/services/concept/prompts/concept-extraction.prompt.ts` |
| Config | apps/server | `src/config/anthropic.config.ts` |
| Errors | apps/server | `src/errors/extraction.errors.ts` |
| Tests | apps/server | `src/services/concept/__tests__/extraction.service.test.ts` |

## Database Schema
Supabase `subconcepts` table:
```sql
CREATE TABLE subconcepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  source_chunk_id UUID REFERENCES chunks(id),
  content_id UUID NOT NULL REFERENCES contents(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  status TEXT NOT NULL DEFAULT 'extracted',
  confidence_score NUMERIC(4,3) NOT NULL,
  embedding vector(1024),
  sync_status TEXT NOT NULL DEFAULT 'pending_sync',
  graph_node_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subconcepts_course_id ON subconcepts(course_id);
CREATE INDEX idx_subconcepts_status ON subconcepts(status);
CREATE INDEX idx_subconcepts_confidence ON subconcepts(confidence_score);
```

Neo4j:
```cypher
(:SubConcept {id, name, description, confidence_score, status})
```

## API Endpoints
No REST endpoints. Called internally by the content pipeline after chunking completes.

## Dependencies
- **Blocked by:** STORY-F-27 (content chunks must exist — pipeline), STORY-F-28 (chunks dual-written)
- **Blocks:** STORY-F-34, STORY-F-35, STORY-F-36, STORY-F-40
- **Cross-lane:** E-11 (content processing pipeline)

## Testing Requirements
- 10-12 API tests: successful extraction from text chunk, batch processing (10 chunks), confidence threshold filtering (< 0.7 rejected), structured output parsing, Anthropic rate limit backoff, empty chunk handling, malformed LLM response fallback, SubConcept status initialization, repository create with sync_status, extraction idempotency
- 0 E2E tests

## Implementation Notes
- Claude Haiku chosen for cost efficiency on high-volume extraction tasks.
- Structured output: prompt returns JSON array of `{ name, description, confidence }` objects.
- Confidence threshold: only persist SubConcepts with `confidence >= 0.7`.
- Neo4j label: `SubConcept` (PascalCase per convention).
- Store API key in environment variable `ANTHROPIC_API_KEY` — validate at class instantiation.
- Extraction is idempotent: re-extracting from the same chunk produces same SubConcepts (deduped in STORY-F-36).
- Constructor DI pattern with `#anthropicClient` private field.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
