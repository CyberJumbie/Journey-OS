# STORY-F-35: LOD Enrichment

**Epic:** E-12 (AI Concept Extraction)
**Feature:** F-06 (Concept Extraction & Knowledge Graph)
**Sprint:** 5
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-12-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need extracted SubConcepts enriched with Linked Open Data so that concepts are grounded in standard medical terminology (MeSH, SNOMED CT, UMLS).

## Acceptance Criteria
- [ ] `StandardTerm` TypeScript types: `id`, `name`, `source_ontology`, `external_id`, `uri`, `description`
- [ ] `LODEnrichmentService` that queries external terminology APIs (MeSH, UMLS)
- [ ] For each SubConcept, attempt to find matching StandardTerm(s)
- [ ] Create `StandardTerm` nodes in Neo4j if not already present
- [ ] Create `(SubConcept)-[:MAPPED_TO]->(StandardTerm)` relationship
- [ ] DualWriteService for StandardTerm nodes
- [ ] Graceful degradation: if LOD lookup fails, SubConcept proceeds without enrichment
- [ ] SubConcept status updated to `enriched` after successful LOD lookup
- [ ] 8-10 API tests for LOD lookup, StandardTerm creation, dedup of existing terms, fallback behavior
- [ ] TypeScript strict, named exports only

## Reference Screens
No UI screens. Backend enrichment service only.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | N/A |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/concept/standard-term.types.ts` |
| Model | apps/server | `src/models/standard-term.model.ts` |
| Repository | apps/server | `src/repositories/standard-term.repository.ts` |
| Service | apps/server | `src/services/concept/lod-enrichment.service.ts` |
| Tests | apps/server | `src/services/concept/__tests__/lod-enrichment.service.test.ts` |

## Database Schema
Supabase `standard_terms` table:
```sql
CREATE TABLE standard_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_ontology TEXT NOT NULL,  -- 'MeSH' | 'UMLS' | 'SNOMED_CT'
  external_id TEXT NOT NULL,
  uri TEXT,
  description TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending_sync',
  graph_node_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(external_id, source_ontology)
);

CREATE TABLE subconcept_standard_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subconcept_id UUID NOT NULL REFERENCES subconcepts(id) ON DELETE CASCADE,
  standard_term_id UUID NOT NULL REFERENCES standard_terms(id) ON DELETE CASCADE,
  sync_status TEXT NOT NULL DEFAULT 'pending_sync',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subconcept_id, standard_term_id)
);
```

Neo4j:
```cypher
(:SubConcept)-[:MAPPED_TO]->(:StandardTerm {id, name, source_ontology, external_id, uri})
```

## API Endpoints
No REST endpoints. Called asynchronously after extraction completes.

## Dependencies
- **Blocked by:** STORY-F-31 (SubConcepts must be extracted first)
- **Blocks:** none
- **Cross-lane:** none

## Testing Requirements
- 8-10 API tests: MeSH API lookup success, UMLS fallback on MeSH miss, StandardTerm node creation, dedup existing StandardTerm (lookup by external_id + source_ontology), MAPPED_TO relationship creation, DualWriteService sync_status, graceful degradation on API failure, SubConcept status update to 'enriched', rate limit handling, empty lookup result
- 0 E2E tests

## Implementation Notes
- Neo4j label: `StandardTerm` (PascalCase per convention).
- LOD sources priority: MeSH (NLM API) first, UMLS (UMLS API) as fallback.
- StandardTerm dedup: lookup by `external_id + source_ontology` before creating new node.
- Rate limiting for external APIs: MeSH allows 3 req/sec, UMLS requires API key with quota.
- Enrichment runs asynchronously after extraction; does not block pipeline completion.
- Store external API keys in environment variables: `MESH_API_KEY`, `UMLS_API_KEY` — validate at class instantiation.
- Constructor DI with `#meshClient`, `#umlsClient` private fields.
