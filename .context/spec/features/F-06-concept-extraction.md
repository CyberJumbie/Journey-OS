# F-06: Concept Extraction & Knowledge Graph

## Description
After content is chunked and embedded, AI (Claude Haiku) extracts SubConcepts from content chunks, performs LOD (Linked Open Data) enrichment to create StandardTerm nodes, and deduplicates against existing concepts using cosine similarity (0.92 threshold). Extracted concepts are dual-written to both Supabase and Neo4j, creating `[:TEACHES]` edges from ContentChunk to SubConcept. Faculty review extracted concepts before they become verified (`[:TEACHES_VERIFIED]`).

## Personas
- **Faculty (Course Director)**: Reviews extracted SubConcepts, approves/rejects/merges, promotes TEACHES → TEACHES_VERIFIED.
- **Institutional Admin**: Reviews across all courses, manages knowledge graph quality.

## Screens
- `SubConceptReviewQueue.tsx` — Template A, queue of unverified SubConcepts with approve/reject/merge actions
- `SyllabusEditor.tsx` — Template E (Focus), annotated syllabus with extracted concepts highlighted
- `ReviewSyllabusMapping.tsx` — Template E (Focus), concept-to-content mapping verification

## Data Domains
- **Supabase**: `subconcepts` (id, name, definition, lod_uri, graph_node_id, sync_status, institution_id), `concept_embeddings` (subconcept_id FK, embedding vector(1024))
- **Neo4j**: `(:SubConcept)` nodes, `(:StandardTerm)` nodes (LOD enrichment), `(:ContentChunk)-[:TEACHES]->(:SubConcept)`, `(:ContentChunk)-[:TEACHES_VERIFIED]->(:SubConcept)`, `(:SubConcept)-[:GROUNDED_IN]->(:StandardTerm)`
- **AI**: Claude Haiku for extraction, Voyage AI for embedding + dedup similarity
- **Thresholds**: 0.92 cosine similarity → merge (reuse existing SubConcept), < 0.92 → create new

## Dependencies
- **F-05**: Content Upload (chunks must exist before extraction)
- **F-08**: Framework Management (USMLE mapping during extraction)

## Source References
- ARCHITECTURE_v10.md § 2.1 (dedup thresholds: 0.92 for SubConcept)
- ARCHITECTURE_v10.md § 2 (dual-write: Supabase first → Neo4j second)
- ROADMAP_v2_3.md § Sprint 5 (concept extraction deliverables)
- NODE_REGISTRY_v1.md § Layer 3 (SubConcept, StandardTerm, TEACHES, GROUNDED_IN)
- Journey-OS-Seeding-Blueprint-v1_1.md § LOD enrichment, connection authority matrix
- SUPABASE_DDL_v1.md § subconcepts, concept_embeddings tables
- PRODUCT_BRIEF.md § Tier 0 metrics ("Faculty can upload syllabus and see extracted concepts")
