# Sprint 5 — Stories

**Stories:** 15
**Epics:** E-12, E-13, E-14, E-15

## Execution Order (by lane priority)

| # | Story | Title | Lane | Size |
|---|-------|-------|------|------|
| 1 | S-IA-14-1 | ILO Model & Repository | institutional_admin | M |
| 2 | S-IA-14-2 | SLO Model & Repository | institutional_admin | M |
| 3 | S-IA-14-3 | ILO Management UI | institutional_admin | M |
| 4 | S-IA-14-4 | SLO Management UI | institutional_admin | M |
| 5 | S-IA-15-1 | FULFILLS Workflow | institutional_admin | M |
| 6 | S-IA-15-2 | Framework Linking Service | institutional_admin | M |
| 7 | S-IA-15-3 | Visual Mapping Interface | institutional_admin | L |
| 8 | S-IA-15-4 | FULFILLS Review Queue | institutional_admin | M |
| 9 | S-F-12-1 | SubConcept Extraction Service | faculty | M |
| 10 | S-F-12-2 | LOD Enrichment | faculty | M |
| 11 | S-F-12-3 | Dedup Service | faculty | M |
| 12 | S-F-12-4 | TEACHES Relationship Creation | faculty | S |
| 13 | S-F-13-1 | Concept Review Queue UI | faculty | L |
| 14 | S-F-13-2 | Verification Workflow | faculty | M |
| 15 | S-F-13-3 | Batch Operations | faculty | S |

## Sprint Goals
- Deliver ILO/SLO CRUD with management UIs and FULFILLS mapping workflow for institutional admins
- Build AI-powered concept extraction pipeline with deduplication and LOD enrichment for faculty content
- Provide concept review queue with verification workflow and batch operations

## Entry Criteria
- Sprint 4 exit criteria complete (courses, content upload, and processing pipeline operational)
- Content chunks with embeddings available in Neo4j for concept extraction

## Exit Criteria
- Institutional admins can manage ILOs/SLOs and map them to framework nodes via visual interface
- AI concept extraction produces deduplicated SubConcept nodes with TEACHES relationships
- Faculty can review, verify, and batch-operate on extracted concepts
