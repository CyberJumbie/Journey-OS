# E-12: AI Concept Extraction

**Feature:** F-06
**Estimated Sprints:** 1
**Sprint Assignment:** Sprint 5

## Definition of Done
- Claude Haiku extracts SubConcepts from content chunks
- LOD enrichment creates StandardTerm nodes
- Cosine similarity dedup at 0.92 threshold
- TEACHES relationships created between courses and SubConcepts
- Dual-write to Supabase + Neo4j

## User Flows Enabled
- UF-10: Concept Review & Verification — partially enabled (extraction only)

## Story Preview
- Story: SubConcept extraction service — Claude Haiku prompt, chunk processing
- Story: LOD enrichment — StandardTerm lookup and node creation
- Story: Dedup service — cosine similarity at 0.92, merge duplicates
- Story: TEACHES relationship creation — course-to-concept linking

## Source References
- F-06 feature definition
- UF-10 user flow
