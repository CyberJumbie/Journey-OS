# UF-15: Bulk Question Generation

**Feature:** F-09 (Generation Workbench)
**Persona:** Faculty (Course Director) — Dr. Amara Osei
**Goal:** Generate a batch of assessment items via the workbench bulk mode, targeting specific USMLE topics or SLOs, with progress tracking via Inngest

## Preconditions
- Faculty has `is_course_director: true`
- Course has content, concepts, and SLOs (F-05, F-06, F-07)
- Frameworks seeded (F-08)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/generate` (WorkbenchPage) | Click "Bulk" tab in ModeSwitcher | Mode switches to bulk generation |
| 2 | `/generate` (ChatPanel, Bulk mode) | Type: "Generate 10 questions covering cardiovascular system for USMLE Step 1" | Bulk request parsed |
| 3 | `/generate` (ChatPanel) | AI confirms: "I'll generate 10 questions across cardiovascular topics. Estimated time: ~5 minutes." | ExtractedParams chips show: count=10, system=Cardiovascular, target=USMLE Step 1 |
| 4 | `/generate` (ChatPanel) | Click "Start Batch" button or confirm in chat | `journey/batch.requested` Inngest event fired |
| 5 | `/generate` (ContextPanel) | Context switches to BulkQueueView | Batch progress strip: 0/10 complete |
| 6 | `/generate` (BulkQueueView) | See individual item progress: each of 10 items shows status | Items fan out: `journey/batch.item.generate` events (up to 5 parallel) |
| 7 | `/generate` (BulkQueueView) | Item 1 completes: vignette preview, quality score | Progress: 1/10, score badge (green/yellow/red) |
| 8 | `/generate` (BulkQueueView) | Items 2-10 complete progressively | Progress bar advances, average quality score updates |
| 9 | `/generate` (BulkQueueView) | All 10 items complete | `journey/batch.complete` event fired, Socket.io notification |
| 10 | `/generate` (BulkQueueView) | See batch summary: 10 generated, avg quality, USMLE topic distribution | "Batch complete! 8 approved, 2 need review." |
| 11 | `/generate` | Click on an individual item | Expand to full QuestionPreview with Toulmin chain |
| 12 | `/generate` | Click "Send to Review Queue" | All non-auto-approved items routed to review queue (F-10) |

## Error Paths
- **Not a Course Director**: Step 1 — Bulk tab not visible (hidden for base faculty)
- **Batch size limit**: Step 3 — "Maximum batch size is 50 questions. Adjust count?"
- **Partial failure**: Step 6 — "3 of 10 items failed. Retry failed items?" with retry button
- **Inngest queue full**: Step 4 — "Batch queued. You'll be notified when it starts." (no immediate start)
- **Concurrent batch limit**: Step 4 — "You already have a batch running. Wait for it to complete."
- **All items fail critic**: Step 10 — "All items scored below threshold. Review parameters and try again."

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| POST | `/api/v1/generate/bulk` | Step 4 — initiate batch |
| GET | `/api/v1/generate/batch/:id` | Steps 5-10 — poll batch status (or SSE) |
| POST | `/api/v1/items/:id/review` | Step 12 — route items to review |

## Test Scenario (Playwright outline)
Login as: Faculty (Course Director)
Steps:
1. Navigate to `/generate`, switch to Bulk mode
2. Request 3-item batch (small for test speed)
3. Wait for batch completion (with extended timeout)
4. Verify all items generated
Assertions:
- 3 `assessment_items` records created
- Batch record shows `status: completed`
- Each item has Neo4j edges (ASSESSES, TARGETS, AT_BLOOM)
- Inngest batch events logged

## Source References
- WORKBENCH_SPEC_v2.md § Bulk mode
- ARCHITECTURE_v10.md § 3.5 (SSE for pipeline, Socket.io for notifications)
- ROADMAP_v2_3.md § Sprint 14 (batch mode)
- WORKBENCH_SPEC_v2.md § 14 (Inngest events: batch.requested, batch.item.generate, batch.complete)
- PERSONA-MATRIX.md § Content (generate bulk — Course Director only)
