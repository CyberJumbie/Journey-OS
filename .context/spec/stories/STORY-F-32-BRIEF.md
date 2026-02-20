# STORY-F-32 Brief: Dedup Service (Validation)

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-32
old_id: S-F-21-3
epic: E-21 (Validation & Dedup Engine)
feature: F-10 (Item Validation & Quality)
sprint: 12
lane: faculty
lane_priority: 3
within_lane_order: 32
size: M
depends_on:
  - STORY-F-29 (faculty) — Embedding Service (embeddings must exist for similarity search)
blocks: []
personas_served: [faculty]
```

---

## Section 1: Summary

**What to build:** A deduplication service for the assessment item bank that uses pgvector cosine similarity to detect semantically similar questions. The service runs automatically after validation passes, flagging near-duplicates (>= 0.85 similarity) for review and auto-rejecting exact duplicates (>= 0.95). Supports configurable scope (course, cross-course, institution-wide).

**Parent epic:** E-21 (Validation & Dedup Engine) under F-10 (Item Validation & Quality). This ensures the question bank stays clean as faculty generate and import assessment items at scale.

**User story:** As a faculty member, I need a deduplication service that detects semantically similar questions using pgvector so that the item bank does not accumulate redundant content.

**User flows affected:** UF-18 (Item Validation & Review).

**Personas:** Faculty (sees dedup results during item review).

**Why pgvector:** Embeddings from Voyage AI (1024-dim) are already stored on questions. HNSW indexing provides fast approximate nearest neighbor search with high recall.

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Dedup types and DTOs | `packages/types/src/validation/dedup.types.ts` | 1h |
| 2 | Validation types barrel export | `packages/types/src/validation/index.ts` | 10m |
| 3 | Update types root index | `packages/types/src/index.ts` | 5m |
| 4 | Supabase migration: HNSW index on questions | Supabase MCP | 30m |
| 5 | DedupServiceError class | `apps/server/src/errors/dedup.errors.ts` | 20m |
| 6 | Update errors barrel | `apps/server/src/errors/index.ts` | 5m |
| 7 | DedupRepository (pgvector queries) | `apps/server/src/repositories/dedup.repository.ts` | 2h |
| 8 | DedupService (validation context) | `apps/server/src/services/validation/dedup.service.ts` | 2.5h |
| 9 | API tests: DedupRepository | `apps/server/src/tests/validation/dedup.repository.test.ts` | 1.5h |
| 10 | API tests: DedupService | `apps/server/src/tests/validation/dedup.service.test.ts` | 2h |

**Total estimate:** ~10h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/validation/dedup.types.ts

/** Dedup action recommendation */
export type DedupAction = "pass" | "flag_for_review" | "auto_reject";

/** Dedup scope for similarity search */
export type DedupScope = "course" | "cross_course" | "institution";

/** Similar item found during dedup check */
export interface SimilarItem {
  readonly item_id: string;
  readonly similarity_score: number;
  readonly title: string;
  readonly course_id: string;
}

/** Result of a dedup check for a single item */
export interface DedupResult {
  readonly item_id: string;
  readonly action: DedupAction;
  readonly similar_items: readonly SimilarItem[];
  readonly highest_similarity: number;
  readonly scope: DedupScope;
  readonly checked_at: string;
}

/** Dedup check request configuration */
export interface DedupCheckRequest {
  readonly item_id: string;
  readonly embedding: readonly number[];
  readonly course_id: string;
  readonly institution_id: string;
  readonly scope: DedupScope;
}

/** Dedup thresholds configuration */
export interface DedupThresholds {
  readonly flag_threshold: number;    // 0.85
  readonly reject_threshold: number;  // 0.95
}

/** Batch dedup result summary */
export interface BatchDedupResult {
  readonly total_checked: number;
  readonly passed: number;
  readonly flagged: number;
  readonly rejected: number;
  readonly results: readonly DedupResult[];
}
```

---

## Section 4: Database Schema (inline, complete)

```sql
-- Migration: add_hnsw_index_questions
-- Assumes questions table exists with embedding vector(1024) column

-- HNSW index for cosine similarity search on question embeddings
CREATE INDEX IF NOT EXISTS idx_questions_embedding_hnsw ON questions
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 128);

-- Index for scope filtering
CREATE INDEX IF NOT EXISTS idx_questions_course_id ON questions(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_institution_id ON questions(institution_id);
```

No new tables. The dedup service queries the existing `questions` table using pgvector operators.

**pgvector Query Pattern:**
```sql
-- Find similar questions within cosine distance threshold
SELECT id, title, course_id,
       1 - (embedding <=> $1) AS similarity_score
FROM questions
WHERE id != $2
  AND institution_id = $3
  AND (course_id = $4 OR $5 = 'institution')
  AND 1 - (embedding <=> $1) >= $6
ORDER BY embedding <=> $1
LIMIT 10;
```

---

## Section 5: API Contract (complete request/response)

This story is a backend service -- no public REST endpoint. The DedupService is invoked internally after validation passes in the item processing pipeline.

**Internal Service Interface:**
```typescript
interface IDedupService {
  checkDuplicate(request: DedupCheckRequest): Promise<DedupResult>;
  batchCheck(requests: DedupCheckRequest[]): Promise<BatchDedupResult>;
}
```

**No HTTP endpoints in this story.** Dedup is triggered programmatically from the validation pipeline.

---

## Section 6: Frontend Spec

Not applicable for this story. Dedup results will be shown in the item review UI (part of E-21 validation flow).

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/validation/dedup.types.ts` | Types | Create |
| 2 | `packages/types/src/validation/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add validation export) |
| 4 | Supabase migration via MCP (HNSW index) | Database | Apply |
| 5 | `apps/server/src/errors/dedup.errors.ts` | Errors | Create |
| 6 | `apps/server/src/errors/index.ts` | Errors | Edit (add dedup errors) |
| 7 | `apps/server/src/repositories/dedup.repository.ts` | Repository | Create |
| 8 | `apps/server/src/services/validation/dedup.service.ts` | Service | Create |
| 9 | `apps/server/src/tests/validation/dedup.repository.test.ts` | Tests | Create |
| 10 | `apps/server/src/tests/validation/dedup.service.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-29 | faculty | **NOT YET** | Embeddings must exist on question records for similarity search |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client for pgvector raw SQL queries
- `zod` — Input validation
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError` base class

### Does NOT Depend On
- Neo4j (dedup is purely pgvector/Supabase)
- Anthropic API (no LLM calls)
- Frontend/Next.js (backend service only)
- Redis (no pub/sub)

---

## Section 9: Test Fixtures (inline)

```typescript
// Mock embedding (1024-dim, simplified for tests)
export const MOCK_EMBEDDING_1 = Array.from({ length: 1024 }, (_, i) => Math.sin(i * 0.01));
export const MOCK_EMBEDDING_2 = Array.from({ length: 1024 }, (_, i) => Math.sin(i * 0.01 + 0.001)); // very similar
export const MOCK_EMBEDDING_3 = Array.from({ length: 1024 }, (_, i) => Math.cos(i * 0.5)); // different

// Dedup check request
export const DEDUP_REQUEST_COURSE_SCOPE: DedupCheckRequest = {
  item_id: "question-uuid-001",
  embedding: MOCK_EMBEDDING_1,
  course_id: "course-uuid-001",
  institution_id: "inst-uuid-001",
  scope: "course",
};

export const DEDUP_REQUEST_INSTITUTION_SCOPE: DedupCheckRequest = {
  ...DEDUP_REQUEST_COURSE_SCOPE,
  scope: "institution",
};

// Mock similar items returned by repository
export const MOCK_EXACT_DUPLICATE: SimilarItem = {
  item_id: "question-uuid-002",
  similarity_score: 0.97,
  title: "Beta-blocker mechanism of action",
  course_id: "course-uuid-001",
};

export const MOCK_NEAR_DUPLICATE: SimilarItem = {
  item_id: "question-uuid-003",
  similarity_score: 0.89,
  title: "Beta-blocker pharmacological effects",
  course_id: "course-uuid-001",
};

export const MOCK_BELOW_THRESHOLD: SimilarItem = {
  item_id: "question-uuid-004",
  similarity_score: 0.72,
  title: "ACE inhibitor mechanism",
  course_id: "course-uuid-001",
};

// Expected DedupResults
export const EXPECTED_AUTO_REJECT: DedupResult = {
  item_id: "question-uuid-001",
  action: "auto_reject",
  similar_items: [MOCK_EXACT_DUPLICATE],
  highest_similarity: 0.97,
  scope: "course",
  checked_at: "2026-02-19T12:00:00Z",
};

export const EXPECTED_FLAG: DedupResult = {
  item_id: "question-uuid-001",
  action: "flag_for_review",
  similar_items: [MOCK_NEAR_DUPLICATE],
  highest_similarity: 0.89,
  scope: "course",
  checked_at: "2026-02-19T12:00:00Z",
};

export const EXPECTED_PASS: DedupResult = {
  item_id: "question-uuid-001",
  action: "pass",
  similar_items: [],
  highest_similarity: 0,
  scope: "course",
  checked_at: "2026-02-19T12:00:00Z",
};

// Default thresholds
export const DEFAULT_THRESHOLDS: DedupThresholds = {
  flag_threshold: 0.85,
  reject_threshold: 0.95,
};
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/tests/validation/dedup.repository.test.ts`

```
describe("DedupRepository")
  ✓ executes pgvector cosine similarity query
  ✓ converts cosine distance to similarity score (1 - distance)
  ✓ filters by course_id when scope is 'course'
  ✓ filters by institution_id when scope is 'institution'
  ✓ excludes the source item from results (id != $2)
  ✓ limits results to top 10 similar items
  ✓ returns empty array when no items above threshold
  ✓ handles empty question bank gracefully
```

**File:** `apps/server/src/tests/validation/dedup.service.test.ts`

```
describe("DedupService")
  describe("checkDuplicate")
    ✓ returns 'auto_reject' for similarity >= 0.95
    ✓ writes rejection reason and links to duplicate source on auto-reject
    ✓ returns 'flag_for_review' for similarity >= 0.85 and < 0.95
    ✓ adds 'potential_duplicate' tag with reference on flag
    ✓ returns 'pass' for similarity < 0.85
    ✓ uses configured thresholds (not hardcoded)
    ✓ searches within correct scope (course, cross-course, institution)
    ✓ returns highest similarity score in result
    ✓ throws DedupServiceError on repository failure

  describe("batchCheck")
    ✓ processes multiple items and returns BatchDedupResult
    ✓ counts passed, flagged, and rejected correctly
    ✓ handles empty batch input
    ✓ continues processing after individual item failure
```

**Total: ~21 tests** (8 repository + 13 service)

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not applicable. Dedup is a backend service. E2E tests for the validation review flow will be added when the full E-21 UI is complete.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | pgvector HNSW index created on question embeddings (1024-dim) | Migration |
| 2 | Similarity >= 0.95 triggers auto-reject with rejection reason | API test |
| 3 | Similarity >= 0.85 triggers flag_for_review with potential_duplicate tag | API test |
| 4 | Similarity < 0.85 passes without flagging | API test |
| 5 | Dedup runs after validation passes (pipeline integration) | API test / design |
| 6 | DedupResult includes similar items, scores, and recommended action | API test |
| 7 | Scope filtering works: course, cross-course, institution-wide | API test |
| 8 | Custom DedupServiceError class used for all service errors | API test |
| 9 | Batch dedup processes multiple items with aggregated results | API test |
| 10 | Empty question bank returns pass (no similar items) | API test |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| pgvector HNSW index with ef_construction=128, m=16 | S-F-21-3 SS Notes |
| Voyage AI 1024-dim embeddings | CLAUDE.md SS shared context |
| Cosine similarity via `<=>` operator | S-F-21-3 SS Notes |
| Flag threshold 0.85, auto-reject 0.95 | S-F-21-3 SS Acceptance Criteria |
| Scope filtering: course, cross-course, institution | S-F-21-3 SS Acceptance Criteria |
| Custom error classes only | CLAUDE.md SS Architecture Rules |
| Named exports only | CLAUDE.md SS Architecture Rules |

---

## Section 14: Environment Prerequisites

- **Supabase:** Project running, `questions` table exists with `embedding vector(1024)` column, `pgvector` extension enabled, HNSW index migration applied
- **Express:** Server running on port 3001
- **Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

## Section 15: Figma Make Prototype

Code directly. No UI in this story (backend dedup service only). Dedup results display will be prototyped when the validation review UI (E-21) is implemented.
