# STORY-F-35 Brief: LOD Enrichment

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-35
old_id: S-F-12-2
epic: E-12 (AI Concept Extraction)
feature: F-06 (Concept Extraction & Mapping)
sprint: 5
lane: faculty
lane_priority: 3
within_lane_order: 35
size: M
depends_on:
  - STORY-F-31 (faculty) — SubConcept Extraction Service (SubConcepts must be extracted first)
blocks: []
personas_served: [faculty, institutional_admin]
```

---

## Section 1: Summary

**What to build:** A Linked Open Data (LOD) enrichment service that grounds extracted SubConcepts in standard medical terminology by querying external APIs (MeSH via NLM, UMLS). For each SubConcept, the service attempts to find matching StandardTerm(s), creates StandardTerm nodes in Neo4j, and links them with `(SubConcept)-[:MAPPED_TO]->(StandardTerm)` relationships. Graceful degradation ensures SubConcepts proceed even if LOD lookup fails.

**Parent epic:** E-12 (AI Concept Extraction) under F-06 (Concept Extraction & Mapping). Enrichment runs asynchronously after extraction, adding terminological grounding to make SubConcepts interoperable with medical standards.

**User story:** As a faculty member, I need extracted SubConcepts enriched with Linked Open Data so that concepts are grounded in standard medical terminology (MeSH, SNOMED CT, UMLS).

**User flows affected:** UF-13 (Concept Extraction & Review).

**Personas:** Faculty (sees enriched concepts with standard terms), Institutional Admin (uses standard terms for cross-course analysis).

**Why LOD enrichment matters:** Standard medical terminologies (MeSH, UMLS) enable interoperability, consistent concept identification across courses, and alignment with established medical education frameworks.

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | StandardTerm types and DTOs | `packages/types/src/concept/standardterm.types.ts` | 45m |
| 2 | Update concept barrel export | `packages/types/src/concept/index.ts` | 5m |
| 3 | Supabase migration: standard_terms table | Supabase MCP | 30m |
| 4 | Supabase migration: subconcept_standard_term junction | Supabase MCP | 20m |
| 5 | StandardTerm model | `apps/server/src/models/standardterm.model.ts` | 30m |
| 6 | LOD enrichment error classes | `apps/server/src/errors/lod.errors.ts` | 20m |
| 7 | StandardTermRepository (Supabase + Neo4j) | `apps/server/src/repositories/standardterm.repository.ts` | 1.5h |
| 8 | LODEnrichmentService | `apps/server/src/services/lod.service.ts` | 3h |
| 9 | API tests: LODEnrichmentService | `apps/server/src/tests/lod.service.test.ts` | 2h |

**Total estimate:** ~9h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/concept/standardterm.types.ts

/** Source ontology for the standard term */
export type SourceOntology = "mesh" | "umls" | "snomed_ct";

/** StandardTerm creation DTO */
export interface CreateStandardTermRequest {
  readonly name: string;
  readonly source_ontology: SourceOntology;
  readonly external_id: string;
  readonly uri: string;
  readonly description: string;
}

/** Stored StandardTerm record (Supabase row) */
export interface StandardTerm {
  readonly id: string;
  readonly name: string;
  readonly source_ontology: SourceOntology;
  readonly external_id: string;
  readonly uri: string;
  readonly description: string;
  readonly sync_status: SyncStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Neo4j StandardTerm node properties */
export interface StandardTermNodeProperties {
  readonly id: string;
  readonly name: string;
  readonly source_ontology: string;
  readonly external_id: string;
  readonly uri: string;
  readonly description: string;
}

/** LOD lookup result from external API */
export interface LODLookupResult {
  readonly found: boolean;
  readonly terms: readonly ExternalTermMatch[];
}

/** External API term match */
export interface ExternalTermMatch {
  readonly name: string;
  readonly external_id: string;
  readonly uri: string;
  readonly description: string;
  readonly source_ontology: SourceOntology;
  readonly relevance_score: number;
}

/** Enrichment result for a single SubConcept */
export interface EnrichmentResult {
  readonly subconcept_id: string;
  readonly matched_terms: readonly StandardTerm[];
  readonly enriched: boolean;
  readonly error?: string;
}

/** Batch enrichment result */
export interface BatchEnrichmentResult {
  readonly total_processed: number;
  readonly enriched_count: number;
  readonly failed_count: number;
  readonly skipped_count: number;
  readonly results: readonly EnrichmentResult[];
}

/** SyncStatus (import from shared) */
export type SyncStatus = "pending" | "synced" | "failed";
```

---

## Section 4: Database Schema (inline, complete)

```sql
-- Migration: create_standard_terms_table
CREATE TABLE standard_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    source_ontology TEXT NOT NULL CHECK (source_ontology IN ('mesh', 'umls', 'snomed_ct')),
    external_id TEXT NOT NULL,
    uri TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (external_id, source_ontology)
);

-- Indexes
CREATE INDEX idx_standard_terms_external_id ON standard_terms(external_id);
CREATE INDEX idx_standard_terms_source_ontology ON standard_terms(source_ontology);
CREATE INDEX idx_standard_terms_name ON standard_terms(name);

-- Junction table: SubConcept <-> StandardTerm (MAPPED_TO)
CREATE TABLE subconcept_standard_term (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subconcept_id UUID NOT NULL REFERENCES subconcepts(id),
    standard_term_id UUID NOT NULL REFERENCES standard_terms(id),
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subconcept_id, standard_term_id)
);

-- Indexes
CREATE INDEX idx_sst_subconcept_id ON subconcept_standard_term(subconcept_id);
CREATE INDEX idx_sst_standard_term_id ON subconcept_standard_term(standard_term_id);

-- RLS
ALTER TABLE standard_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE subconcept_standard_term ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read standard terms" ON standard_terms
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System inserts standard terms" ON standard_terms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users read mappings" ON subconcept_standard_term
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System inserts mappings" ON subconcept_standard_term
    FOR INSERT WITH CHECK (true);

CREATE POLICY "SuperAdmin full access to standard terms" ON standard_terms
    FOR ALL USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'superadmin'
    );

CREATE POLICY "SuperAdmin full access to mappings" ON subconcept_standard_term
    FOR ALL USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'superadmin'
    );
```

**Neo4j Schema:**
```cypher
// StandardTerm node creation
CREATE (st:StandardTerm {
  id: $id,
  name: $name,
  source_ontology: $source_ontology,
  external_id: $external_id,
  uri: $uri,
  description: $description
})

// MAPPED_TO relationship
MATCH (sc:SubConcept {id: $subconcept_id}), (st:StandardTerm {id: $standard_term_id})
CREATE (sc)-[:MAPPED_TO]->(st)
```

---

## Section 5: API Contract (complete request/response)

This story is a backend service -- no public REST endpoint. The LODEnrichmentService is invoked internally as an asynchronous post-extraction step in the pipeline.

**Internal Service Interface:**
```typescript
interface ILODEnrichmentService {
  enrichSubConcept(subconceptId: string, subconceptName: string): Promise<EnrichmentResult>;
  enrichBatch(subconcepts: Array<{ id: string; name: string }>): Promise<BatchEnrichmentResult>;
}
```

---

## Section 6: Frontend Spec

Not applicable for this story. StandardTerm mappings will be displayed in the Concept Review UI (E-13).

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/concept/standardterm.types.ts` | Types | Create |
| 2 | `packages/types/src/concept/index.ts` | Types | Edit (add standardterm export) |
| 3 | Supabase migration via MCP (standard_terms table) | Database | Apply |
| 4 | Supabase migration via MCP (subconcept_standard_term junction) | Database | Apply |
| 5 | `apps/server/src/errors/lod.errors.ts` | Errors | Create |
| 6 | `apps/server/src/errors/index.ts` | Errors | Edit (add LOD errors) |
| 7 | `apps/server/src/models/standardterm.model.ts` | Model | Create |
| 8 | `apps/server/src/repositories/standardterm.repository.ts` | Repository | Create |
| 9 | `apps/server/src/services/lod.service.ts` | Service | Create |
| 10 | `apps/server/src/tests/lod.service.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-31 | faculty | **NOT YET** | SubConcepts must be extracted before enrichment can run |

### NPM Packages (already installed)
- `@supabase/supabase-js` — StandardTerm and junction table operations
- `neo4j-driver` — StandardTerm node and MAPPED_TO relationship creation
- `zod` — External API response validation
- `vitest` — Testing

### External APIs
- **MeSH API (NLM):** `https://id.nlm.nih.gov/mesh/` — Primary lookup, 3 req/sec rate limit
- **UMLS API:** `https://uts-ws.nlm.nih.gov/rest/` — Fallback lookup, requires API key with quota

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` — `Neo4jClientConfig`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError` base class
- `packages/types/src/concept/subconcept.types.ts` — `SubConcept` type (from F-31)

### Does NOT Depend On
- Anthropic API (no LLM calls)
- Frontend/Next.js (backend service only)
- Redis (no pub/sub)
- pgvector (no embedding operations)

---

## Section 9: Test Fixtures (inline)

```typescript
// SubConcept inputs for enrichment
export const ENRICHABLE_SUBCONCEPT = {
  id: "subconcept-uuid-001",
  name: "Beta-adrenergic antagonism",
};

export const ENRICHABLE_SUBCONCEPT_2 = {
  id: "subconcept-uuid-002",
  name: "Angiotensin-converting enzyme inhibition",
};

// Mock MeSH API response
export const MOCK_MESH_MATCH: ExternalTermMatch = {
  name: "Adrenergic beta-Antagonists",
  external_id: "D000319",
  uri: "https://id.nlm.nih.gov/mesh/D000319",
  description: "Drugs that bind to but do not activate beta-adrenergic receptors thereby blocking the actions of beta-adrenergic agonists.",
  source_ontology: "mesh",
  relevance_score: 0.95,
};

// Mock UMLS API response
export const MOCK_UMLS_MATCH: ExternalTermMatch = {
  name: "Beta-Adrenergic Blockers",
  external_id: "C0001645",
  uri: "https://uts.nlm.nih.gov/uts/umls/concept/C0001645",
  description: "Agents that inhibit the actions of the sympathetic nervous system by blocking beta-adrenergic receptors.",
  source_ontology: "umls",
  relevance_score: 0.92,
};

// Mock LOD lookup results
export const MOCK_SUCCESSFUL_LOOKUP: LODLookupResult = {
  found: true,
  terms: [MOCK_MESH_MATCH],
};

export const MOCK_FAILED_LOOKUP: LODLookupResult = {
  found: false,
  terms: [],
};

// Stored StandardTerm
export const STORED_STANDARD_TERM: StandardTerm = {
  id: "stdterm-uuid-001",
  name: "Adrenergic beta-Antagonists",
  source_ontology: "mesh",
  external_id: "D000319",
  uri: "https://id.nlm.nih.gov/mesh/D000319",
  description: "Drugs that bind to but do not activate beta-adrenergic receptors.",
  sync_status: "synced",
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

// Enrichment results
export const SUCCESSFUL_ENRICHMENT: EnrichmentResult = {
  subconcept_id: "subconcept-uuid-001",
  matched_terms: [STORED_STANDARD_TERM],
  enriched: true,
};

export const FAILED_ENRICHMENT: EnrichmentResult = {
  subconcept_id: "subconcept-uuid-003",
  matched_terms: [],
  enriched: false,
  error: "MeSH API returned 503, UMLS fallback also failed",
};
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/tests/lod.service.test.ts`

```
describe("LODEnrichmentService")
  describe("enrichSubConcept")
    ✓ queries MeSH API first with subconcept name
    ✓ creates StandardTerm node in Supabase if not already present
    ✓ creates StandardTerm node in Neo4j (DualWrite)
    ✓ creates MAPPED_TO relationship in Neo4j
    ✓ creates junction row in subconcept_standard_term table
    ✓ deduplicates: reuses existing StandardTerm by external_id + source_ontology
    ✓ updates SubConcept status to 'enriched' on success
    ✓ falls back to UMLS API if MeSH returns no results
    ✓ proceeds without enrichment if both APIs fail (graceful degradation)
    ✓ does not throw — returns EnrichmentResult with error field on failure
    ✓ respects MeSH rate limit (3 req/sec)

  describe("enrichBatch")
    ✓ processes multiple subconcepts and returns BatchEnrichmentResult
    ✓ counts enriched, failed, skipped correctly
    ✓ continues after individual enrichment failure
```

**Total: ~14 tests**

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not applicable. LOD enrichment is a backend service. StandardTerm display will be tested in E2E when E-13 (Concept Review) UI is complete.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | LODEnrichmentService queries MeSH API for each SubConcept | API test |
| 2 | StandardTerm nodes created in Supabase and Neo4j (DualWrite) | API test |
| 3 | (SubConcept)-[:MAPPED_TO]->(StandardTerm) relationship created | API test |
| 4 | Existing StandardTerms reused (dedup by external_id + source_ontology) | API test |
| 5 | UMLS API used as fallback when MeSH returns no results | API test |
| 6 | Graceful degradation: SubConcept proceeds if LOD lookup fails | API test |
| 7 | SubConcept status updated to 'enriched' after successful lookup | API test |
| 8 | MeSH rate limit respected (3 req/sec) | API test |
| 9 | Batch enrichment processes multiple SubConcepts with aggregated results | API test |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| LOD sources: MeSH first, UMLS fallback | S-F-12-2 SS Notes |
| StandardTerm dedup by external_id + source_ontology | S-F-12-2 SS Notes |
| MeSH rate limit 3 req/sec | S-F-12-2 SS Notes |
| MAPPED_TO relationship | S-F-12-2 SS Acceptance Criteria |
| SubConcept status 'enriched' after LOD | S-F-12-2 SS Acceptance Criteria |
| Graceful degradation on API failure | S-F-12-2 SS Acceptance Criteria |
| DualWrite: Supabase first, Neo4j second | CLAUDE.md SS Architecture Rules |
| PascalCase Neo4j labels (StandardTerm) | CLAUDE.md SS Architecture Rules |

---

## Section 14: Environment Prerequisites

- **Supabase:** Project running, `subconcepts` table exists, `standard_terms` and `subconcept_standard_term` migrations applied
- **Neo4j:** Running with SubConcept nodes available (from F-31)
- **External APIs:** MeSH API accessible (public), UMLS API key provisioned
- **Express:** Server running on port 3001
- **Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `MESH_API_KEY`, `UMLS_API_KEY`

---

## Section 15: Figma Make Prototype

Code directly. No UI in this story (backend enrichment service only). StandardTerm display will be part of the Concept Review UI when E-13 is implemented.
