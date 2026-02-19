# E-21: Validation & Dedup Engine

**Feature:** F-10
**Estimated Sprints:** 1
**Sprint Assignment:** Sprint 12

## Definition of Done
- 30 validation rules applied (22 NBME + 8 extended)
- Up to 2 self-correction retries on validation failure
- pgvector HNSW dedup: 0.85 flag threshold, 0.95 auto-reject
- Question status workflow: draft -> pending_review -> approved / rejected / archived
- Tagging service assigns framework tags, Bloom level, difficulty

## User Flows Enabled
- UF-16: Question Review Queue — partially enabled (validation + dedup layer)

## Story Preview
- Story: Validation rule engine — 30 rules with severity levels
- Story: Self-correction retry — up to 2 LLM retries on rule violations
- Story: Dedup service — pgvector HNSW similarity search, threshold-based actions
- Story: Auto-tagging service — framework, Bloom, difficulty assignment

## Source References
- F-10 feature definition
- UF-16 user flow
