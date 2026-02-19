# Sprint 14 — Stories

**Stories:** 4
**Epics:** E-20

## Execution Order (by lane priority)

| # | Story | Title | Lane | Size |
|---|-------|-------|------|------|
| 1 | S-F-20-1 | Inngest Batch Pipeline | faculty | L |
| 2 | S-F-20-2 | Batch Configuration Form | faculty | M |
| 3 | S-F-20-3 | Batch Progress UI | faculty | M |
| 4 | S-F-20-4 | Batch Controls | faculty | M |

## Sprint Goals
- Build an Inngest-powered batch generation pipeline for producing multiple items in parallel
- Deliver a batch configuration form for faculty to specify scope, quantity, and constraints
- Provide real-time batch progress UI with pause, resume, and cancel controls

## Entry Criteria
- Sprint 13 exit criteria complete (critic agent, review queue, review actions operational)
- Single-item generation pipeline stable and validated

## Exit Criteria
- Faculty can configure and launch batch generation jobs via the form
- Batch pipeline processes items in parallel with SSE progress updates
- Pause, resume, and cancel controls function correctly on active batches
