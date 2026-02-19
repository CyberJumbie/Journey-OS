# Sprint 12 — Stories

**Stories:** 4
**Epics:** E-21

## Execution Order (by lane priority)

| # | Story | Title | Lane | Size |
|---|-------|-------|------|------|
| 1 | S-F-21-1 | Validation Rule Engine | faculty | L |
| 2 | S-F-21-2 | Self-Correction Retry | faculty | M |
| 3 | S-F-21-3 | Dedup Service | faculty | M |
| 4 | S-F-21-4 | Auto-Tagging Service | faculty | M |

## Sprint Goals
- Build a pluggable validation rule engine to enforce quality constraints on generated items
- Implement self-correction retry logic so the pipeline auto-fixes validation failures
- Add deduplication and auto-tagging services to ensure item uniqueness and consistent metadata

## Entry Criteria
- Sprint 9 exit criteria complete (admin dashboards, institution monitoring operational)
- Generation pipeline producing items that need post-generation validation

## Exit Criteria
- Validation rule engine catches format, content, and quality violations on generated items
- Self-correction retry resolves fixable violations without human intervention
- Dedup service prevents near-duplicate items; auto-tagging assigns Bloom's level, difficulty, and topic tags
