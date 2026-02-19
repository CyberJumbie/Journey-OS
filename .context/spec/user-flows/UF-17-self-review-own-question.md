# UF-17: Self-Review Own Question

**Feature:** F-10 (Question Review & Quality)
**Persona:** Faculty — Dr. Amara Osei (base faculty, not Course Director)
**Goal:** Review and refine a question that the faculty member personally generated (base faculty cannot access the full review queue — only their own items)

## Preconditions
- Base faculty is logged in (not Course Director)
- Faculty has generated at least one question (F-09, UF-14)
- Question is in `draft` or `pending_review` status

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/dashboard` (FacultyDashboard) | See "My Questions: 3 draft" in activity feed | Click to navigate |
| 2 | `/items?mine=true` (QuestionReviewList) | See personal question list: only items created by this user | Filtered by `user_id` — cannot see other faculty's items |
| 3 | `/items?mine=true` | Filter by status: draft, pending_review, approved, rejected | Table filtered |
| 4 | `/items?mine=true` | Click on a draft question | Navigate to `/items/:id` (QuestionDetailView) |
| 5 | `/items/:id` (QuestionDetailView) | See read-only question view: vignette, stem, options, critic scores | Full detail in Focus Mode |
| 6 | `/items/:id` | See validation summary: which of 30 rules passed/failed | Identify issues to fix |
| 7 | `/items/:id` | Click "Refine with AI" | Navigate to `/items/:id/refine` (AIRefinement) |
| 8 | `/items/:id/refine` (AIRefinement) | Chat: "The fourth distractor is too obvious. Make it more plausible." | AI generates refined version |
| 9 | `/items/:id/refine` | See diff of original vs refined | DiffHighlight component |
| 10 | `/items/:id/refine` | Click "Accept Changes" | Item updated, revalidated |
| 11 | `/items/:id` | If all validations pass: status auto-updates to `pending_review` | Ready for Course Director review (UF-16) |
| 12 | `/items/:id` | See "Sent for Review" status badge | Faculty's part done — CD takes over |

## Error Paths
- **No own questions**: Step 2 — "You haven't generated any questions yet. Go to the workbench to create your first question." with link
- **Cannot approve own items**: Step 5 — No "Approve" button visible (only CD/Admin can approve)
- **Refinement fails**: Step 8 — "AI refinement failed. Try again or edit manually."
- **Question already reviewed by CD**: Step 4 — Read-only view with "Approved by [CD name]" or "Rejected: [reason]"

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/items?created_by=me` | Step 2 — fetch own items |
| GET | `/api/v1/items/:id` | Step 4 — fetch item detail |
| POST | `/api/v1/items/:id/refine` | Step 8 — AI refinement |
| PATCH | `/api/v1/items/:id` | Step 10 — save refined version |

## Test Scenario (Playwright outline)
Login as: Base faculty (not Course Director)
Steps:
1. Navigate to `/items?mine=true`
2. Verify only own items visible
3. Click into a draft item
4. Verify no "Approve" button (only CD can approve)
5. Click "Refine with AI", make a refinement
6. Verify item updated
Assertions:
- Item list filtered to `created_by` = current user
- No approve/reject buttons visible for base faculty
- Refinement creates updated item version
- Status progresses from `draft` to `pending_review`

## Source References
- PERSONA-MATRIX.md § Content (faculty: review own, NOT others')
- WORKBENCH_SPEC_v2.md § 7.1 (review nodes 12-14)
- DESIGN_SPEC.md § 5.1 Group G (AIRefinement, ConversationalRefine)
- ARCHITECTURE_v10.md § 4.1 (role permissions — base faculty vs CD)
