# Sprint 13 — Stories

**Stories:** 7
**Epics:** E-22, E-23

## Execution Order (by lane priority)

| # | Story | Title | Lane | Size |
|---|-------|-------|------|------|
| 1 | S-F-22-1 | Critic Agent Service | faculty | M |
| 2 | S-F-22-2 | Review Router | faculty | M |
| 3 | S-F-22-3 | Automation Level Configuration | faculty | S |
| 4 | S-F-23-1 | Review Queue List Page | faculty | M |
| 5 | S-F-23-2 | Question Detail Review View | faculty | L |
| 6 | S-F-23-3 | Review Actions | faculty | M |
| 7 | S-F-23-4 | Self-Review Mode | faculty | S |

## Sprint Goals
- Build the critic agent service and review router to automate quality assessment of generated items
- Deliver the faculty review queue UI with detailed question views and approve/reject/edit actions
- Support configurable automation levels and a self-review mode for faculty working independently

## Entry Criteria
- Sprint 12 exit criteria complete (validation engine, dedup, auto-tagging operational)
- Generated items flowing through validation pipeline and ready for review

## Exit Criteria
- Critic agent scores items and review router directs them to appropriate queues based on automation level
- Faculty can browse review queue, inspect item details, and take review actions
- Self-review mode allows faculty to review their own generated items
