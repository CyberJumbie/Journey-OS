# UF-16: Question Review Queue

**Feature:** F-10 (Question Review & Quality)
**Persona:** Faculty (Course Director) — Dr. Amara Osei
**Goal:** Review AI-generated questions in the review queue, approve/reject/refine items based on critic scores and Toulmin argumentation, and configure automation level

## Preconditions
- Faculty (CD) is logged in
- Questions exist with `status: pending_review` (from generation F-09)
- Critic Agent has scored items (6 metrics)
- Review Router has routed items to human review (not auto-approved/rejected)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/dashboard` (FacultyDashboard) | See "Review Queue: 8 items" badge | Click to navigate |
| 2 | `/items/review` (FacultyReviewQueue) | See queue count strip and prioritized item list | Items sorted by critic score (lowest first — needs most attention) |
| 3 | `/items/review` | See filters: status (pending, all), course, topic, quality score range | Apply filters to narrow queue |
| 4 | `/items/review` | Click on first item | Navigate to `/items/:id` (ItemDetail) |
| 5 | `/items/:id` (ItemDetail) | See full question in Focus Mode (Template E): vignette, stem, 5 options | Question content fully rendered |
| 6 | `/items/:id` | See Critic scores: 6 metrics with individual scores and composite | Scores displayed as badges/bars (green ≥ 0.8, yellow ≥ 0.6, red < 0.6) |
| 7 | `/items/:id` | See Toulmin chain: claim, data, warrant, backing, rebuttal, qualifier | Full argumentation evidence |
| 8 | `/items/:id` | See source provenance: linked content chunks with text highlights | Click to view source material |
| 9 | `/items/:id` | Click "Approve" | Item status → `approved`, moved to item bank, removed from queue |
| 10 | `/items/review` | Next item auto-loaded | Queue count decremented |

### Edit Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| E1 | `/items/:id` (ItemDetail) | Click "Edit" | Switch to edit mode — inline editing of vignette, stem, options |
| E2 | `/items/:id` (edit mode) | Modify distractor text | Changes tracked |
| E3 | `/items/:id` (edit mode) | Click "Revalidate" | 30 validation rules re-run, critic re-scores |
| E4 | `/items/:id` (edit mode) | If pass: Click "Approve Edited" | Updated item saved, status → `approved` |

### AI Refinement Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| R1 | `/items/:id` (ItemDetail) | Click "AI Refine" | Navigate to `/items/:id/refine` (ConversationalRefine) |
| R2 | `/items/:id/refine` | Chat with AI: "Make the vignette more realistic, add vital signs" | AI generates refined version |
| R3 | `/items/:id/refine` | See diff: original vs refined (DiffHighlight) | Changes highlighted |
| R4 | `/items/:id/refine` | Click "Accept Changes" | Updated item revalidated, return to ItemDetail |

### Configure Automation
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| C1 | `/items/review` (settings) | Click "Review Settings" | Settings panel: automation level |
| C2 | `/items/review` (settings) | Choose: Full Auto / Checkpoints / Manual | Level saved per course |
| C3 | `/items/review` (settings) | Full Auto: critic auto-approves above threshold, auto-rejects below | Most items bypass queue |
| C4 | `/items/review` (settings) | Manual: all items require human review | Queue receives all generated items |

## Error Paths
- **Empty queue**: Step 2 — "No items pending review. Generate more questions or adjust automation level."
- **Concurrent review**: Step 4 — "This item is being reviewed by [other reviewer]." Lock indicator
- **Validation fails after edit**: Step E3 — "3 validation rules failed. Review issues before approving."
- **Critic service down**: Step 6 — "Quality scores unavailable. Review manually." (scores show as "N/A")

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/items/review-queue` | Step 2 — fetch queue |
| GET | `/api/v1/items/:id` | Step 4 — fetch full item detail with Toulmin + critic scores |
| POST | `/api/v1/items/:id/review` | Step 9 — approve (body: `{ action: "approve" }`) |
| PATCH | `/api/v1/items/:id` | Step E2 — update item content |
| POST | `/api/v1/items/:id/revalidate` | Step E3 — re-run validation + critic |
| POST | `/api/v1/items/:id/refine` | Step R2 — AI refinement via LangGraph review nodes |

## Test Scenario (Playwright outline)
Login as: Faculty (Course Director)
Steps:
1. Navigate to review queue (pre-seed items via API in beforeAll)
2. Click first item, verify detail view renders
3. Check critic scores and Toulmin chain visible
4. Approve the item
5. Verify queue count decremented
Assertions:
- Item status changed to `approved` in assessment_items
- Item removed from review queue
- Queue count in badge updated
- Critic scores rendered (6 metrics)

## Source References
- WORKBENCH_SPEC_v2.md § 7.1 (pipeline nodes 9-14: critic, reviewer, router)
- ROADMAP_v2_3.md § Sprint 12-13 (validator, critic, review mode)
- ARCHITECTURE_v10.md § 2.1 (dedup thresholds)
- DESIGN_SPEC.md § 5.1 Group G (7 review screens)
- PRODUCT_BRIEF.md § Tier 1 ("Critic auto-handle ≥ 60%")
