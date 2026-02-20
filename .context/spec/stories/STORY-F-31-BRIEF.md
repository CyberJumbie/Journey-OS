# STORY-F-31 Brief: SubConcept Extraction Service

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-31
old_id: S-F-12-1
epic: E-12 (AI Concept Extraction)
feature: F-06 (Concept Extraction & Mapping)
sprint: 5
lane: faculty
lane_priority: 3
within_lane_order: 31
size: M
depends_on:
  - STORY-F-27 (faculty) — Content Processing Pipeline (content chunks must exist)
  - STORY-F-28 (faculty) — Content Dual-Write (chunks dual-written to Supabase + Neo4j)
blocks:
  - STORY-F-34 — TEACHES Relationship Creation
  - STORY-F-35 — LOD Enrichment
  - STORY-F-36 — Dedup Service (Extraction)
personas_served: [faculty]
```

---

## Section 1: Summary

**What to build:** An AI-powered SubConcept extraction service that uses Claude Haiku (claude-3-haiku) with structured output prompts to automatically identify medical concepts from content chunks. The service processes chunks in batches, creates SubConcept records in Supabase, and respects Anthropic API rate limits with exponential backoff.

**Parent epic:** E-12 (AI Concept Extraction) under F-06 (Concept Extraction & Mapping). This is the foundational extraction story -- all downstream concept work (LOD enrichment, dedup, TEACHES relationships) depends on SubConcepts being extracted first.

**User story:** As a faculty member, I need AI-extracted SubConcepts from my content chunks so that the system automatically identifies what medical concepts are taught in my materials.

**User flows affected:** UF-13 (Concept Extraction & Review).

**Personas:** Faculty (triggers extraction, reviews results later in E-13).

**Why Claude Haiku:** Cost efficiency on high-volume extraction tasks. Structured output ensures consistent JSON responses. Confidence scoring allows filtering low-quality extractions.

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | SubConcept types and DTOs | `packages/types/src/concept/subconcept.types.ts` | 1h |
| 2 | Concept types barrel export | `packages/types/src/concept/index.ts` | 10m |
| 3 | Update types root index | `packages/types/src/index.ts` | 5m |
| 4 | Supabase migration: subconcepts table | Supabase MCP | 30m |
| 5 | Anthropic client config | `apps/server/src/config/anthropic.config.ts` | 30m |
| 6 | Concept extraction prompt template | `apps/server/src/prompts/concept-extraction.prompt.ts` | 1h |
| 7 | SubConcept model | `apps/server/src/models/subconcept.model.ts` | 45m |
| 8 | SubConcept error classes | `apps/server/src/errors/extraction.error.ts` | 20m |
| 9 | ExtractionService | `apps/server/src/services/extraction.service.ts` | 3h |
| 10 | API tests: ExtractionService | `apps/server/src/tests/extraction.service.test.ts` | 2.5h |

**Total estimate:** ~10h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/concept/subconcept.types.ts

/** SubConcept extraction status lifecycle */
export type SubConceptStatus = "extracted" | "enriched" | "verified" | "rejected";

/** Raw extraction result from LLM */
export interface ExtractedConcept {
  readonly name: string;
  readonly description: string;
  readonly confidence: number;
}

/** Structured LLM response for concept extraction */
export interface ExtractionLLMResponse {
  readonly concepts: readonly ExtractedConcept[];
}

/** SubConcept creation DTO */
export interface CreateSubConceptRequest {
  readonly name: string;
  readonly description: string;
  readonly source_chunk_id: string;
  readonly content_id: string;
  readonly course_id: string;
  readonly confidence_score: number;
}

/** Stored SubConcept record (Supabase row) */
export interface SubConcept {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly source_chunk_id: string;
  readonly content_id: string;
  readonly course_id: string;
  readonly status: SubConceptStatus;
  readonly confidence_score: number;
  readonly embedding: number[] | null;
  readonly sync_status: SyncStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Neo4j SubConcept node properties */
export interface SubConceptNodeProperties {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: string;
  readonly confidence_score: number;
  readonly source_chunk_id: string;
  readonly content_id: string;
  readonly course_id: string;
}

/** Extraction batch configuration */
export interface ExtractionBatchConfig {
  readonly batch_size: number;
  readonly confidence_threshold: number;
  readonly max_retries: number;
  readonly backoff_base_ms: number;
}

/** Extraction result summary */
export interface ExtractionResult {
  readonly content_id: string;
  readonly total_chunks_processed: number;
  readonly total_concepts_extracted: number;
  readonly concepts_above_threshold: number;
  readonly concepts_below_threshold: number;
  readonly errors: readonly ExtractionError[];
}

/** Extraction error detail */
export interface ExtractionError {
  readonly chunk_id: string;
  readonly error_message: string;
  readonly retry_count: number;
}

/** SyncStatus (re-export or import from shared) */
export type SyncStatus = "pending" | "synced" | "failed";
```

---

## Section 4: Database Schema (inline, complete)

```sql
-- Migration: create_subconcepts_table
CREATE TABLE subconcepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    source_chunk_id UUID NOT NULL,
    content_id UUID NOT NULL,
    course_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'extracted' CHECK (status IN ('extracted', 'enriched', 'verified', 'rejected')),
    confidence_score NUMERIC(4, 3) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    embedding vector(1024),
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subconcepts_content_id ON subconcepts(content_id);
CREATE INDEX idx_subconcepts_course_id ON subconcepts(course_id);
CREATE INDEX idx_subconcepts_source_chunk_id ON subconcepts(source_chunk_id);
CREATE INDEX idx_subconcepts_status ON subconcepts(status);
CREATE INDEX idx_subconcepts_confidence ON subconcepts(confidence_score);

-- HNSW index for embedding similarity (used by dedup service in F-36)
CREATE INDEX idx_subconcepts_embedding ON subconcepts
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 128);

-- RLS
ALTER TABLE subconcepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty reads subconcepts for own courses" ON subconcepts
    FOR SELECT USING (
        course_id IN (
            SELECT id FROM courses WHERE course_director_id = auth.uid()
        )
        OR (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('institutional_admin', 'superadmin')
    );

CREATE POLICY "System inserts subconcepts" ON subconcepts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "SuperAdmin full access to subconcepts" ON subconcepts
    FOR ALL USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'superadmin'
    );
```

**Neo4j Schema:**
```cypher
// SubConcept node creation
CREATE (sc:SubConcept {
  id: $id,
  name: $name,
  description: $description,
  status: $status,
  confidence_score: $confidence_score,
  source_chunk_id: $source_chunk_id,
  content_id: $content_id,
  course_id: $course_id
})

// Relationships
(sc:SubConcept)-[:EXTRACTED_FROM]->(chunk:ContentChunk)
(content:Content)-[:HAS_CONCEPT]->(sc:SubConcept)
```

---

## Section 5: API Contract (complete request/response)

This story is a backend service -- no public REST endpoint. The ExtractionService is invoked internally by the content processing pipeline (Inngest job or direct service call) after chunks are created.

**Internal Service Interface:**
```typescript
interface IExtractionService {
  extractFromContent(contentId: string, courseId: string): Promise<ExtractionResult>;
  extractFromChunks(chunks: ContentChunk[], courseId: string, contentId: string): Promise<SubConcept[]>;
}
```

**No HTTP endpoints in this story.** Extraction is triggered programmatically from the pipeline. A future story may add a manual trigger endpoint.

---

## Section 6: Frontend Spec

Not applicable for this story. SubConcept extraction is a backend-only service. Faculty review UI for extracted concepts is covered in E-13 (Concept Review & Verification).

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/concept/subconcept.types.ts` | Types | Create |
| 2 | `packages/types/src/concept/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add concept export) |
| 4 | Supabase migration via MCP | Database | Apply |
| 5 | `apps/server/src/errors/extraction.error.ts` | Errors | Create |
| 6 | `apps/server/src/errors/index.ts` | Errors | Edit (add extraction errors) |
| 7 | `apps/server/src/config/anthropic.config.ts` | Config | Create |
| 8 | `apps/server/src/prompts/concept-extraction.prompt.ts` | Prompt | Create |
| 9 | `apps/server/src/models/subconcept.model.ts` | Model | Create |
| 10 | `apps/server/src/services/extraction.service.ts` | Service | Create |
| 11 | `apps/server/src/tests/extraction.service.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-27 | faculty | **NOT YET** | Content chunks must exist before extraction |
| STORY-F-28 | faculty | **NOT YET** | Chunks must be dual-written to both stores |

### NPM Packages (new)
- `@anthropic-ai/sdk` — Anthropic API client for Claude Haiku structured output calls

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client for subconcept persistence
- `neo4j-driver` — Neo4j driver for graph node creation
- `zod` — Validation of LLM response schema
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` — `Neo4jClientConfig`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError` base class
- `packages/types/src/auth/auth.types.ts` — `SyncStatus`

### Does NOT Depend On
- Frontend/Next.js (backend service only)
- Redis (no pub/sub needed for extraction)
- RBAC middleware (internal service, not exposed via HTTP)

---

## Section 9: Test Fixtures (inline)

```typescript
// Mock content chunks
export const MOCK_CHUNK_1 = {
  id: "chunk-uuid-001",
  content_id: "content-uuid-001",
  text: "Beta-blockers competitively inhibit catecholamines at beta-adrenergic receptors. They reduce heart rate, myocardial contractility, and blood pressure.",
  sequence: 1,
};

export const MOCK_CHUNK_2 = {
  id: "chunk-uuid-002",
  content_id: "content-uuid-001",
  text: "ACE inhibitors block the conversion of angiotensin I to angiotensin II. They are first-line therapy for hypertension and heart failure.",
  sequence: 2,
};

export const MOCK_CHUNKS_BATCH = Array.from({ length: 10 }, (_, i) => ({
  id: `chunk-uuid-${String(i + 1).padStart(3, "0")}`,
  content_id: "content-uuid-001",
  text: `Medical content chunk ${i + 1} with pharmacological concepts.`,
  sequence: i + 1,
}));

// Mock LLM extraction response
export const MOCK_LLM_RESPONSE: ExtractionLLMResponse = {
  concepts: [
    { name: "Beta-adrenergic antagonism", description: "Competitive inhibition of catecholamines at beta-adrenergic receptors", confidence: 0.95 },
    { name: "Chronotropic effect", description: "Reduction of heart rate through cardiac beta-1 receptor blockade", confidence: 0.88 },
    { name: "Inotropic effect", description: "Reduction of myocardial contractility", confidence: 0.82 },
    { name: "Antihypertensive mechanism", description: "Blood pressure reduction via decreased cardiac output", confidence: 0.65 },
  ],
};

// Expected: 3 above threshold (0.7), 1 below
export const MOCK_ABOVE_THRESHOLD_COUNT = 3;
export const MOCK_BELOW_THRESHOLD_COUNT = 1;

// Mock malformed LLM response
export const MOCK_MALFORMED_RESPONSE = { concepts: "not an array" };

// Course context
export const MOCK_COURSE_ID = "course-uuid-001";
export const MOCK_CONTENT_ID = "content-uuid-001";

// Stored SubConcept
export const STORED_SUBCONCEPT = {
  id: "subconcept-uuid-001",
  name: "Beta-adrenergic antagonism",
  description: "Competitive inhibition of catecholamines at beta-adrenergic receptors",
  source_chunk_id: "chunk-uuid-001",
  content_id: "content-uuid-001",
  course_id: "course-uuid-001",
  status: "extracted" as const,
  confidence_score: 0.95,
  embedding: null,
  sync_status: "synced" as const,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/tests/extraction.service.test.ts`

```
describe("ExtractionService")
  describe("extractFromChunks")
    ✓ sends chunks to Claude Haiku with structured output prompt
    ✓ processes chunks in batches of 10
    ✓ parses LLM response with Zod schema validation
    ✓ creates SubConcept records in Supabase for concepts above 0.7 confidence
    ✓ filters out concepts below 0.7 confidence threshold
    ✓ creates SubConcept nodes in Neo4j with EXTRACTED_FROM relationship
    ✓ sets sync_status to 'synced' on successful dual-write
    ✓ sets sync_status to 'failed' if Neo4j write fails
    ✓ handles malformed LLM response gracefully (ExtractionServiceError)
    ✓ retries on Anthropic rate limit (429) with exponential backoff
    ✓ returns ExtractionResult with correct counts

  describe("extractFromContent")
    ✓ fetches all chunks for content ID from Supabase
    ✓ calls extractFromChunks with fetched chunks
    ✓ returns aggregated ExtractionResult
    ✓ handles empty chunk set (no concepts extracted, no error)
    ✓ records errors for individual failed batches without stopping pipeline

  describe("prompt validation")
    ✓ prompt includes chunk text in system message
    ✓ prompt requests JSON array output format
    ✓ prompt specifies name, description, confidence fields

  describe("idempotency")
    ✓ re-extracting same chunk does not create duplicate SubConcepts (deferred to F-36)
```

**Total: ~20 tests**

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not applicable. SubConcept extraction is a backend service with no UI. E2E tests will be added when the concept review UI (E-13) is implemented.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | ExtractionService calls Claude Haiku with structured output prompt | API test |
| 2 | Chunks processed in batches of 10 | API test |
| 3 | Only SubConcepts with confidence >= 0.7 are persisted | API test |
| 4 | SubConcept nodes created in Supabase with extraction metadata | API test |
| 5 | SubConcept nodes created in Neo4j with EXTRACTED_FROM relationship | API test |
| 6 | Anthropic API rate limits respected with exponential backoff | API test |
| 7 | Malformed LLM responses handled gracefully (custom error class) | API test |
| 8 | ExtractionResult returns accurate counts | API test |
| 9 | SubConcept status set to 'extracted' initially | API test |
| 10 | Extraction is idempotent (same input produces same output) | API test / design |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| Claude Haiku for cost-efficient extraction | S-F-12-1 SS Notes |
| Structured output JSON format | S-F-12-1 SS Acceptance Criteria |
| Confidence threshold 0.7 | S-F-12-1 SS Notes |
| Batch size of 10 chunks per call | S-F-12-1 SS Acceptance Criteria |
| SubConcept status lifecycle | S-F-12-1 SS Notes |
| PascalCase Neo4j labels | CLAUDE.md SS Architecture Rules |
| DualWrite: Supabase first, Neo4j second | CLAUDE.md SS Architecture Rules |
| 1024-dim Voyage AI embeddings | CLAUDE.md SS shared context |

---

## Section 14: Environment Prerequisites

- **Supabase:** Project running, `courses` table exists, `subconcepts` migration applied, `pgvector` extension enabled
- **Neo4j:** Running with ContentChunk nodes available (from F-27/F-28)
- **Anthropic API:** Valid API key with Claude Haiku access
- **Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `ANTHROPIC_API_KEY`

---

## Section 15: Figma Make Prototype

Code directly. No UI in this story (backend extraction service only). Frontend concept review UI will be prototyped when E-13 (Concept Review & Verification) is implemented.
