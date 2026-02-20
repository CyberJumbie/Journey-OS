# STORY-F-36 Brief: Dedup Service (Extraction)

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-36
old_id: S-F-12-3
epic: E-12 (AI Concept Extraction)
feature: F-06 (Concept Extraction & Mapping)
sprint: 5
lane: faculty
lane_priority: 3
within_lane_order: 36
size: M
depends_on:
  - STORY-F-31 (faculty) — SubConcept Extraction Service (SubConcepts must exist to dedup)
blocks: []
personas_served: [faculty]
```

---

## Section 1: Summary

**What to build:** A deduplication service for extracted SubConcepts that uses pgvector cosine similarity (1024-dim Voyage AI embeddings) to detect semantically duplicate concepts. When similarity exceeds 0.92, the service merges duplicates by keeping the higher-confidence SubConcept and redirecting all relationships from the duplicate to the survivor. Merge operations span both Supabase (soft-delete duplicate) and Neo4j (DETACH DELETE + re-link edges).

**Parent epic:** E-12 (AI Concept Extraction) under F-06 (Concept Extraction & Mapping). Dedup runs as a post-extraction step within the same pipeline, ensuring the concept graph stays clean without redundant entries.

**User story:** As a faculty member, I need duplicate SubConcepts automatically merged so that the concept graph stays clean without redundant entries.

**User flows affected:** UF-13 (Concept Extraction & Review).

**Personas:** Faculty (sees clean, deduplicated concept list after extraction).

**Why 0.92 threshold:** Intentionally high to avoid false positive merges. Medical concepts can be closely related but semantically distinct (e.g., "beta-1 selectivity" vs "beta-2 selectivity"). A high threshold ensures only true duplicates are merged.

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Dedup types and DTOs | `packages/types/src/concept/dedup.types.ts` | 45m |
| 2 | Update concept barrel export | `packages/types/src/concept/index.ts` | 5m |
| 3 | Dedup error classes | `apps/server/src/errors/concept-dedup.errors.ts` | 20m |
| 4 | Update errors barrel | `apps/server/src/errors/index.ts` | 5m |
| 5 | ConceptDedupRepository (pgvector queries) | `apps/server/src/repositories/concept-dedup.repository.ts` | 2h |
| 6 | ConceptDedupService | `apps/server/src/services/concept-dedup.service.ts` | 3h |
| 7 | API tests: ConceptDedupService | `apps/server/src/tests/concept-dedup.service.test.ts` | 2.5h |

**Total estimate:** ~9h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/concept/dedup.types.ts

/** Merge candidate found during dedup */
export interface MergeCandidate {
  readonly subconcept_id: string;
  readonly name: string;
  readonly confidence_score: number;
  readonly similarity: number;
}

/** Merge decision for a pair of SubConcepts */
export interface MergeDecision {
  readonly survivor_id: string;
  readonly duplicate_id: string;
  readonly similarity: number;
  readonly reason: string;
}

/** Merge audit record */
export interface MergeAuditRecord {
  readonly id: string;
  readonly survivor_id: string;
  readonly duplicate_id: string;
  readonly similarity: number;
  readonly relationships_redirected: number;
  readonly merged_at: string;
}

/** Dedup check result for a single SubConcept */
export interface ConceptDedupResult {
  readonly subconcept_id: string;
  readonly merge_candidates: readonly MergeCandidate[];
  readonly merged: boolean;
  readonly merge_audit?: MergeAuditRecord;
}

/** Batch dedup result */
export interface ConceptBatchDedupResult {
  readonly total_checked: number;
  readonly merges_performed: number;
  readonly no_duplicates: number;
  readonly errors: readonly ConceptDedupError[];
}

/** Dedup error detail */
export interface ConceptDedupError {
  readonly subconcept_id: string;
  readonly error_message: string;
}

/** Dedup configuration */
export interface ConceptDedupConfig {
  readonly similarity_threshold: number;  // 0.92
  readonly max_candidates: number;        // 5
}
```

---

## Section 4: Database Schema (inline, complete)

```sql
-- Migration: create_concept_merge_audit_table
CREATE TABLE concept_merge_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survivor_id UUID NOT NULL REFERENCES subconcepts(id),
    duplicate_id UUID NOT NULL,
    similarity NUMERIC(5, 4) NOT NULL,
    relationships_redirected INTEGER NOT NULL DEFAULT 0,
    merged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_concept_merge_audit_survivor ON concept_merge_audit(survivor_id);
CREATE INDEX idx_concept_merge_audit_duplicate ON concept_merge_audit(duplicate_id);

-- RLS
ALTER TABLE concept_merge_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read merge audit" ON concept_merge_audit
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System inserts merge audit" ON concept_merge_audit
    FOR INSERT WITH CHECK (true);

CREATE POLICY "SuperAdmin full access to merge audit" ON concept_merge_audit
    FOR ALL USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'superadmin'
    );
```

**pgvector Query for Dedup:**
```sql
-- Find near-duplicate SubConcepts (cosine distance < 0.08 = similarity > 0.92)
SELECT id, name, confidence_score,
       1 - (embedding <=> $1) AS similarity
FROM subconcepts
WHERE id != $2
  AND 1 - (embedding <=> $1) >= 0.92
ORDER BY embedding <=> $1
LIMIT 5;
```

**Neo4j Merge Operations:**
```cypher
// Redirect all relationships from duplicate to survivor
MATCH (dup:SubConcept {id: $duplicate_id})-[r]->(target)
WITH dup, r, target, type(r) AS relType, properties(r) AS relProps
DELETE r
WITH dup, target, relType, relProps
MATCH (surv:SubConcept {id: $survivor_id})
CALL apoc.create.relationship(surv, relType, relProps, target) YIELD rel
RETURN count(rel)

// Redirect incoming relationships
MATCH (source)-[r]->(dup:SubConcept {id: $duplicate_id})
WITH source, r, dup, type(r) AS relType, properties(r) AS relProps
DELETE r
WITH source, dup, relType, relProps
MATCH (surv:SubConcept {id: $survivor_id})
CALL apoc.create.relationship(source, relType, relProps, surv) YIELD rel
RETURN count(rel)

// Delete duplicate node
MATCH (dup:SubConcept {id: $duplicate_id})
DETACH DELETE dup
```

---

## Section 5: API Contract (complete request/response)

This story is a backend service -- no public REST endpoint. The ConceptDedupService is invoked internally as a post-extraction step in the pipeline.

**Internal Service Interface:**
```typescript
interface IConceptDedupService {
  dedupSubConcept(subconceptId: string): Promise<ConceptDedupResult>;
  dedupBatch(subconceptIds: string[]): Promise<ConceptBatchDedupResult>;
}
```

---

## Section 6: Frontend Spec

Not applicable for this story. Dedup results and merge history will be shown in the Concept Review UI (E-13).

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/concept/dedup.types.ts` | Types | Create |
| 2 | `packages/types/src/concept/index.ts` | Types | Edit (add dedup export) |
| 3 | Supabase migration via MCP (concept_merge_audit table) | Database | Apply |
| 4 | `apps/server/src/errors/concept-dedup.errors.ts` | Errors | Create |
| 5 | `apps/server/src/errors/index.ts` | Errors | Edit (add concept dedup errors) |
| 6 | `apps/server/src/repositories/concept-dedup.repository.ts` | Repository | Create |
| 7 | `apps/server/src/services/concept-dedup.service.ts` | Service | Create |
| 8 | `apps/server/src/tests/concept-dedup.service.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-31 | faculty | **NOT YET** | SubConcepts with embeddings must exist before dedup can run |

### NPM Packages (already installed)
- `@supabase/supabase-js` — pgvector similarity queries and soft-delete
- `neo4j-driver` — Relationship redirection and node deletion
- `zod` — Input validation
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` — `Neo4jClientConfig`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError` base class
- `packages/types/src/concept/subconcept.types.ts` — `SubConcept` type (from F-31)

### Does NOT Depend On
- Anthropic API (no LLM calls)
- External APIs (no LOD lookups)
- Frontend/Next.js (backend service only)
- Redis (no pub/sub)

---

## Section 9: Test Fixtures (inline)

```typescript
// Mock SubConcepts for dedup testing
export const SUBCONCEPT_A = {
  id: "subconcept-uuid-001",
  name: "Beta-adrenergic antagonism",
  confidence_score: 0.95,
  embedding: Array.from({ length: 1024 }, (_, i) => Math.sin(i * 0.01)),
};

export const SUBCONCEPT_B_DUPLICATE = {
  id: "subconcept-uuid-002",
  name: "Beta-adrenergic receptor blockade",
  confidence_score: 0.88,
  embedding: Array.from({ length: 1024 }, (_, i) => Math.sin(i * 0.01 + 0.0005)),
};

export const SUBCONCEPT_C_DIFFERENT = {
  id: "subconcept-uuid-003",
  name: "ACE inhibition mechanism",
  confidence_score: 0.91,
  embedding: Array.from({ length: 1024 }, (_, i) => Math.cos(i * 0.5)),
};

// Merge candidate (above 0.92 threshold)
export const MERGE_CANDIDATE: MergeCandidate = {
  subconcept_id: "subconcept-uuid-002",
  name: "Beta-adrenergic receptor blockade",
  confidence_score: 0.88,
  similarity: 0.96,
};

// Merge decision (A survives, B is duplicate because A has higher confidence)
export const EXPECTED_MERGE_DECISION: MergeDecision = {
  survivor_id: "subconcept-uuid-001",
  duplicate_id: "subconcept-uuid-002",
  similarity: 0.96,
  reason: "Survivor has higher confidence score (0.95 vs 0.88)",
};

// Merge audit record
export const MOCK_MERGE_AUDIT: MergeAuditRecord = {
  id: "audit-uuid-001",
  survivor_id: "subconcept-uuid-001",
  duplicate_id: "subconcept-uuid-002",
  similarity: 0.96,
  relationships_redirected: 3,
  merged_at: "2026-02-19T12:00:00Z",
};

// Default config
export const DEFAULT_DEDUP_CONFIG: ConceptDedupConfig = {
  similarity_threshold: 0.92,
  max_candidates: 5,
};
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/tests/concept-dedup.service.test.ts`

```
describe("ConceptDedupService")
  describe("dedupSubConcept")
    ✓ finds merge candidates above 0.92 cosine similarity
    ✓ keeps SubConcept with higher confidence score as survivor
    ✓ redirects MAPPED_TO relationships from duplicate to survivor in Neo4j
    ✓ redirects TEACHES relationships from duplicate to survivor in Neo4j
    ✓ redirects EXTRACTED_FROM relationships from duplicate to survivor
    ✓ soft-deletes duplicate in Supabase
    ✓ DETACH DELETEs duplicate node in Neo4j
    ✓ creates merge audit record with merge details
    ✓ returns ConceptDedupResult with merged=true and audit
    ✓ returns merged=false when no candidates above threshold
    ✓ handles boundary case: similarity exactly at 0.92

  describe("dedupBatch")
    ✓ processes multiple SubConcepts sequentially
    ✓ returns ConceptBatchDedupResult with correct counts
    ✓ continues processing after individual dedup failure
    ✓ avoids re-processing already-merged SubConcepts

  describe("merge strategy")
    ✓ when confidence scores are equal, keeps the older SubConcept
    ✓ counts relationships redirected accurately
```

**Total: ~17 tests**

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not applicable. Concept dedup is a backend service. Merge history display will be tested in E2E when E-13 (Concept Review) UI is complete.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | Cosine similarity computed between SubConcept embeddings via pgvector | API test |
| 2 | Merge triggered at >= 0.92 similarity threshold | API test |
| 3 | Higher-confidence SubConcept kept as survivor | API test |
| 4 | All relationships redirected from duplicate to survivor in Neo4j | API test |
| 5 | Duplicate soft-deleted in Supabase | API test |
| 6 | Duplicate DETACH DELETEd in Neo4j | API test |
| 7 | Merge audit trail recorded (survivor, duplicate, similarity, redirected count) | API test |
| 8 | Batch dedup runs after extraction completes for a content record | Design |
| 9 | Embedding from Voyage AI 1024-dim matches existing embeddings | Schema validation |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| Cosine similarity threshold 0.92 (intentionally high) | S-F-12-3 SS Notes |
| pgvector distance query: `embedding <=> $1 < 0.08` | S-F-12-3 SS Notes |
| Merge: keep higher confidence, redirect relationships | S-F-12-3 SS Acceptance Criteria |
| DualWrite merge: Supabase soft-delete, Neo4j DETACH DELETE + re-link | S-F-12-3 SS Notes |
| Merge audit trail | S-F-12-3 SS Acceptance Criteria |
| 1024-dim Voyage AI embeddings | CLAUDE.md SS shared context |
| Dedup runs in same pipeline as extraction | S-F-12-3 SS Notes |

---

## Section 14: Environment Prerequisites

- **Supabase:** Project running, `subconcepts` table with `embedding vector(1024)` and HNSW index (from F-31 migration), `concept_merge_audit` migration applied
- **Neo4j:** Running with SubConcept nodes and their relationships (from F-31, F-34, F-35)
- **pgvector:** Extension enabled with HNSW index on subconcepts.embedding
- **Express:** Server running on port 3001
- **Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`

---

## Section 15: Figma Make Prototype

Code directly. No UI in this story (backend dedup service only). Merge history and dedup results will be part of the Concept Review UI when E-13 is implemented.
