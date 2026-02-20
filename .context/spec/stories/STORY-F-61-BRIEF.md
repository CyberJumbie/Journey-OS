# STORY-F-61 Brief: Review Actions

## 0. Lane & Priority

```yaml
story_id: STORY-F-61
old_id: S-F-23-3
lane: faculty
lane_priority: 3
within_lane_order: 61
sprint: 13
size: M
depends_on:
  - STORY-F-58 (faculty) — Review Queue List Page (queue must exist)
blocks:
  - STORY-F-64 — Item Bank Browser Page (needs approved items)
personas_served: [faculty]
epic: E-23 (Faculty Review UI)
feature: F-10
user_flow: UF-14 (Faculty Review Workflow)
```

## 1. Summary

Build **review action capabilities** that let faculty approve, reject, or request revision on reviewed questions. Each action transitions the question through a well-defined status flow with required comments (optional for approve, required for reject/revise). A comment thread supports multi-round review discussions. Approve triggers DualWriteService to update both Supabase and Neo4j. Reject archives the question. Request Revision sends it back to the generator. Revision resubmissions re-enter the full validation-critic-router pipeline. An audit trail logs every action with actor, timestamp, comment, and previous status.

Key constraints:
- DualWriteService on approve: Supabase `questions` table update then Neo4j `Question` node status update
- Comment thread stored in `review_comments` table with question_id FK
- Revision creates a new version (preserves original for audit)
- Optimistic UI with rollback on failure
- Named exports only, TypeScript strict, JS `#private` fields

## 2. Task Breakdown

1. **Types** -- Create `ReviewAction`, `ReviewActionRequest`, `ReviewComment`, `ReviewAuditEntry`, `ReviewStatusTransition` in `packages/types/src/review/`
2. **Error class** -- `ReviewActionError` in `apps/server/src/errors/review.errors.ts`
3. **Repository** -- `ReviewCommentRepository` for comment thread CRUD
4. **Service -- ReviewActionService** -- `approve()`, `reject()`, `requestRevision()` with status transitions, audit logging, DualWriteService integration
5. **Service -- CommentThreadService** -- `addComment()`, `getThread()`, threaded discussion
6. **Controller** -- `ReviewActionController` with POST endpoints for each action + comment CRUD
7. **Routes** -- Register under `/api/v1/review/questions/:questionId/actions`
8. **View -- ReviewActionBar** -- Three action buttons with comment input
9. **View -- CommentThread** -- Threaded comment display with reply capability
10. **API tests** -- 12 tests covering each action, comments, status transitions, audit trail
11. **Exports** -- Register types and error class in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/review/action.types.ts

/** Available review actions */
export type ReviewActionType = "approve" | "reject" | "request_revision";

/** Question statuses in the review pipeline */
export type QuestionReviewStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "self_approved"
  | "rejected"
  | "revision_requested"
  | "revised";

/** Request to perform a review action */
export interface ReviewActionRequest {
  readonly action: ReviewActionType;
  readonly comment: string;
}

/** Response after performing a review action */
export interface ReviewActionResponse {
  readonly question_id: string;
  readonly action: ReviewActionType;
  readonly previous_status: QuestionReviewStatus;
  readonly new_status: QuestionReviewStatus;
  readonly actor_id: string;
  readonly comment_id: string;
  readonly created_at: string;
}

/** Comment in a review thread */
export interface ReviewComment {
  readonly id: string;
  readonly question_id: string;
  readonly author_id: string;
  readonly author_name: string;
  readonly author_role: string;
  readonly content: string;
  readonly parent_id: string | null;
  readonly action_type: ReviewActionType | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Create comment request */
export interface CreateCommentRequest {
  readonly content: string;
  readonly parent_id?: string;
}

/** Comment thread (flat list, client assembles tree) */
export interface CommentThread {
  readonly question_id: string;
  readonly comments: ReviewComment[];
  readonly total: number;
}

/** Audit trail entry */
export interface ReviewAuditEntry {
  readonly id: string;
  readonly question_id: string;
  readonly actor_id: string;
  readonly actor_name: string;
  readonly action: ReviewActionType;
  readonly previous_status: QuestionReviewStatus;
  readonly new_status: QuestionReviewStatus;
  readonly comment: string;
  readonly created_at: string;
}

/** Status transition rules */
export interface StatusTransitionRule {
  readonly from: QuestionReviewStatus[];
  readonly to: QuestionReviewStatus;
  readonly action: ReviewActionType;
  readonly comment_required: boolean;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_review_comments_and_audit_tables

-- Review comments for threaded discussion
CREATE TABLE IF NOT EXISTS review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  parent_id UUID REFERENCES review_comments(id),
  action_type TEXT CHECK (action_type IN ('approve', 'reject', 'request_revision')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_review_comments_question ON review_comments(question_id, created_at);
CREATE INDEX idx_review_comments_parent ON review_comments(parent_id);

-- Review audit trail
CREATE TABLE IF NOT EXISTS review_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'request_revision')),
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_review_audit_question ON review_audit(question_id, created_at DESC);

-- RLS policies
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can view comments for questions they can access"
  ON review_comments FOR SELECT
  USING (
    question_id IN (
      SELECT question_id FROM review_queue rq
      WHERE rq.assigned_reviewer_id = auth.uid()
        OR rq.generated_by_id = auth.uid()
        OR rq.course_id IN (SELECT course_id FROM course_assignments WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Faculty can insert comments on questions they can access"
  ON review_comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Faculty can view audit for questions they can access"
  ON review_audit FOR SELECT
  USING (
    question_id IN (
      SELECT question_id FROM review_queue rq
      WHERE rq.assigned_reviewer_id = auth.uid()
        OR rq.generated_by_id = auth.uid()
        OR rq.course_id IN (SELECT course_id FROM course_assignments WHERE user_id = auth.uid())
    )
  );
```

## 5. API Contract (complete request/response)

### POST /api/v1/review/questions/:questionId/actions (Auth: faculty)

**Request Body:**
```json
{
  "action": "approve",
  "comment": "Well-constructed question with clear clinical vignette."
}
```

**Success Response (200):**
```json
{
  "data": {
    "question_id": "q-uuid-1",
    "action": "approve",
    "previous_status": "in_review",
    "new_status": "approved",
    "actor_id": "faculty-uuid-1",
    "comment_id": "comment-uuid-1",
    "created_at": "2026-02-19T14:30:00Z"
  },
  "error": null
}
```

### GET /api/v1/review/questions/:questionId/comments (Auth: faculty)

**Success Response (200):**
```json
{
  "data": {
    "question_id": "q-uuid-1",
    "comments": [
      {
        "id": "comment-uuid-1",
        "question_id": "q-uuid-1",
        "author_id": "faculty-uuid-1",
        "author_name": "Dr. Jones",
        "author_role": "faculty",
        "content": "The stem could be clearer about the timeline.",
        "parent_id": null,
        "action_type": "request_revision",
        "created_at": "2026-02-19T14:00:00Z",
        "updated_at": "2026-02-19T14:00:00Z"
      },
      {
        "id": "comment-uuid-2",
        "question_id": "q-uuid-1",
        "author_id": "faculty-uuid-2",
        "author_name": "Dr. Smith",
        "author_role": "faculty",
        "content": "Updated the timeline in the stem. Please re-review.",
        "parent_id": "comment-uuid-1",
        "action_type": null,
        "created_at": "2026-02-19T15:00:00Z",
        "updated_at": "2026-02-19T15:00:00Z"
      }
    ],
    "total": 2
  },
  "error": null
}
```

### POST /api/v1/review/questions/:questionId/comments (Auth: faculty)

**Request Body:**
```json
{
  "content": "Looks good now after the revision.",
  "parent_id": "comment-uuid-1"
}
```

**Success Response (201):**
```json
{
  "data": {
    "id": "comment-uuid-3",
    "question_id": "q-uuid-1",
    "author_id": "faculty-uuid-1",
    "author_name": "Dr. Jones",
    "author_role": "faculty",
    "content": "Looks good now after the revision.",
    "parent_id": "comment-uuid-1",
    "action_type": null,
    "created_at": "2026-02-19T16:00:00Z",
    "updated_at": "2026-02-19T16:00:00Z"
  },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 200/201 | - | Success |
| 400 | `VALIDATION_ERROR` | Missing required comment for reject/revise, or invalid action |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Not assigned reviewer or not in course |
| 404 | `NOT_FOUND` | Question not found in review queue |
| 409 | `INVALID_TRANSITION` | Status transition not allowed (e.g., approve already-approved) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Components (embedded in Review Detail View page)

```
ReviewActionBar (organism)
  ├── ApproveButton (atom) — green, Lucide Check icon
  │   └── Tooltip: "Approve question (Ctrl+Enter)"
  ├── RejectButton (atom) — red, Lucide X icon
  │   └── Tooltip: "Reject question (Ctrl+Shift+R)"
  ├── ReviseButton (atom) — amber, Lucide RotateCcw icon
  │   └── Tooltip: "Request revision (Ctrl+Shift+E)"
  └── CommentInput (molecule) — textarea with submit
      ├── Label: "Comment (required for reject/revise)"
      └── CharacterCount (atom)

CommentThread (organism)
  ├── CommentList (molecule)
  │   └── CommentItem (molecule) — author, timestamp, content, action badge
  │       ├── AuthorAvatar (atom)
  │       ├── ActionBadge (atom) — "Approved", "Rejected", "Revision Requested"
  │       └── ReplyButton (atom)
  └── ReplyInput (molecule) — textarea for thread replies
```

**Design tokens:**
- Approve button: `--color-success` (green #69a338)
- Reject button: `--color-error` (red)
- Revise button: `--color-warning` (amber)
- Comment background: `--color-surface-white` (#ffffff)
- Action badge: matches action color
- Thread indent: `--spacing-4` per nesting level

**States:**
1. **Idle** -- Action buttons enabled, comment empty
2. **Commenting** -- User typing comment, submit available
3. **Submitting** -- Optimistic UI: button disabled, spinner, status visually updated
4. **Success** -- Toast: "Question approved/rejected/revision requested"
5. **Error** -- Rollback optimistic update, show error toast
6. **Comment validation** -- Red border on comment field if required but empty

**Keyboard shortcuts:**
- `Ctrl+Enter` -- Approve with current comment
- `Ctrl+Shift+R` -- Reject with current comment
- `Ctrl+Shift+E` -- Request revision with current comment

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/review/action.types.ts` | Types | Create |
| 2 | `packages/types/src/review/index.ts` | Types | Edit (add action export) |
| 3 | `apps/server/src/errors/review.errors.ts` | Errors | Edit (add ReviewActionError) |
| 4 | Supabase migration via MCP (review_comments + review_audit) | Database | Apply |
| 5 | `apps/server/src/repositories/review-comment.repository.ts` | Repository | Create |
| 6 | `apps/server/src/services/review/review-action.service.ts` | Service | Create |
| 7 | `apps/server/src/services/review/comment-thread.service.ts` | Service | Create |
| 8 | `apps/server/src/controllers/review/review-action.controller.ts` | Controller | Create |
| 9 | `apps/server/src/routes/review.routes.ts` | Routes | Edit (add action + comment routes) |
| 10 | `apps/web/src/components/review/ReviewActionBar.tsx` | Organism | Create |
| 11 | `apps/web/src/components/review/CommentThread.tsx` | Organism | Create |
| 12 | `apps/server/src/__tests__/review/review-action.test.ts` | Tests | Create |
| 13 | `apps/server/src/__tests__/review/comment-thread.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-58 | faculty | Pending | Review queue must exist for items to act on |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty role check |

### NPM Packages
- None additional required

### Existing Files Needed
- `apps/server/src/services/dual-write.service.ts` -- DualWriteService for approve action
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/auth/roles.types.ts` -- `AuthRole` enum

## 9. Test Fixtures (inline)

```typescript
// Mock question in review
export const QUESTION_IN_REVIEW = {
  id: "q-uuid-1",
  status: "in_review" as const,
  assigned_reviewer_id: "faculty-uuid-1",
  generated_by_id: "faculty-uuid-2",
  course_id: "course-uuid-1",
  title: "Chest Pain Differential",
};

// Mock faculty user (reviewer)
export const REVIEWER_USER = {
  id: "faculty-uuid-1",
  email: "drjones@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
};

// Mock faculty user (generator)
export const GENERATOR_USER = {
  id: "faculty-uuid-2",
  email: "drsmith@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
};

// Mock approve action
export const APPROVE_ACTION = {
  action: "approve" as const,
  comment: "Well-constructed question with clear clinical vignette.",
};

// Mock reject action
export const REJECT_ACTION = {
  action: "reject" as const,
  comment: "The question stem contains factual inaccuracies about drug interactions.",
};

// Mock revision request
export const REVISION_ACTION = {
  action: "request_revision" as const,
  comment: "The clinical vignette timeline needs clarification.",
};

// Mock comment thread
export const COMMENT_THREAD = [
  {
    id: "comment-uuid-1",
    question_id: "q-uuid-1",
    author_id: "faculty-uuid-1",
    author_name: "Dr. Jones",
    author_role: "faculty",
    content: "The stem could be clearer about the timeline.",
    parent_id: null,
    action_type: "request_revision",
    created_at: "2026-02-19T14:00:00Z",
    updated_at: "2026-02-19T14:00:00Z",
  },
  {
    id: "comment-uuid-2",
    question_id: "q-uuid-1",
    author_id: "faculty-uuid-2",
    author_name: "Dr. Smith",
    author_role: "faculty",
    content: "Updated the timeline. Please re-review.",
    parent_id: "comment-uuid-1",
    action_type: null,
    created_at: "2026-02-19T15:00:00Z",
    updated_at: "2026-02-19T15:00:00Z",
  },
];

// Mock audit entry
export const APPROVE_AUDIT_ENTRY = {
  id: "audit-uuid-1",
  question_id: "q-uuid-1",
  actor_id: "faculty-uuid-1",
  actor_name: "Dr. Jones",
  action: "approve",
  previous_status: "in_review",
  new_status: "approved",
  comment: "Well-constructed question.",
  created_at: "2026-02-19T14:30:00Z",
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/review/review-action.test.ts`

```
describe("ReviewActionService")
  describe("approve")
    > transitions status from in_review to approved
    > creates comment with action_type 'approve'
    > triggers DualWriteService for Supabase + Neo4j update
    > creates audit trail entry with previous and new status
    > allows empty comment for approve action

  describe("reject")
    > transitions status from in_review to rejected
    > requires non-empty comment
    > returns 400 when comment is empty
    > archives the question

  describe("requestRevision")
    > transitions status from in_review to revision_requested
    > requires non-empty comment
    > returns 400 when comment is empty

  describe("status transitions")
    > returns 409 for invalid transition (approve already-approved)
    > returns 403 when non-assigned faculty tries to act
```

**File:** `apps/server/src/__tests__/review/comment-thread.test.ts`

```
describe("CommentThreadService")
  describe("addComment")
    > creates a top-level comment
    > creates a reply (with parent_id)
    > returns the created comment with author details

  describe("getThread")
    > returns all comments for a question ordered by created_at
    > returns empty array for question with no comments
```

**Total: ~16 tests** (13 action + 3 comment thread; adjusted within range of 10-14 specified)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story alone. E2E coverage for the full review workflow (queue -> detail -> action) will be added when all review stories are complete.

## 12. Acceptance Criteria

1. Three action buttons: Approve, Reject, Request Revision
2. Comment optional for approve, required for reject/revise
3. Comment thread supports threaded multi-round discussion
4. Approve transitions to `approved`, triggers DualWriteService (Supabase + Neo4j)
5. Reject transitions to `rejected` with reason, archives question
6. Request Revision transitions to `revision_requested`, notifies original generator
7. Revision resubmission re-enters validation-critic-router pipeline
8. Audit trail logs all actions with actor, timestamp, comment, previous status
9. Invalid status transitions return 409
10. All 16 API tests pass
11. TypeScript strict, named exports only, JS `#private` fields

## 13. Source References

| Claim | Source |
|-------|--------|
| DualWriteService on approve | S-F-23-3 SS Notes: "Approve action triggers DualWriteService" |
| Comment thread in review_comments | S-F-23-3 SS Notes: "Comment thread stored in Supabase review_comments table" |
| Revision creates new version | S-F-23-3 SS Notes: "Revision resubmission creates a new version, preserving the original" |
| Keyboard shortcuts | S-F-23-3 SS Notes: "Ctrl+Enter approve, Ctrl+Shift+R reject, Ctrl+Shift+E request revision" |
| Blocks item bank | FULL-DEPENDENCY-GRAPH: S-F-23-3 -> S-F-25-1 |
| Status transitions | S-F-23-3 SS Acceptance Criteria |
| Audit trail | S-F-23-3 SS Acceptance Criteria: "all actions logged with actor, timestamp, comment, previous status" |

## 14. Environment Prerequisites

- **Supabase:** Project running, `questions`, `profiles`, `review_queue` tables exist
- **Neo4j:** Running for DualWriteService on approve
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **STORY-F-58 (Review Queue):** Must be complete
- **DualWriteService:** Must exist for approve action

## 15. Figma Make Prototype

```
Frame: Review Action Bar (1200x120, embedded in detail page)
  ├── Action Buttons Row (flex, gap-12)
  │   ├── ApproveButton (green #69a338, white text, Check icon, 120px)
  │   ├── RejectButton (red, white text, X icon, 120px)
  │   └── ReviseButton (amber, white text, RotateCcw icon, 160px)
  └── CommentInput (full width, textarea, 3 rows)
      ├── Placeholder: "Add a comment..."
      └── Character count (bottom right, muted)

Frame: Comment Thread (1200x400, below action bar)
  ├── Comment Item
  │   ├── Avatar (32px circle) + "Dr. Jones" + "2 hours ago"
  │   ├── Action Badge: "Revision Requested" (amber)
  │   ├── Content: "The stem could be clearer..."
  │   └── ReplyButton: "Reply"
  └── Nested Reply (indented --spacing-4)
      ├── Avatar + "Dr. Smith" + "1 hour ago"
      └── Content: "Updated the timeline..."
```
