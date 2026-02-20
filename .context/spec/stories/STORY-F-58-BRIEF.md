# STORY-F-58 Brief: Review Queue List Page

## 0. Lane & Priority

```yaml
story_id: STORY-F-58
old_id: S-F-23-1
lane: faculty
lane_priority: 3
within_lane_order: 58
sprint: 13
size: M
depends_on:
  - STORY-F-56 (faculty) — Review Router (determines what reaches review queue)
blocks:
  - STORY-F-61 — Review Actions (needs queue to act on)
  - STORY-F-62 — Self-Review Mode (needs queue to detect self-reviews)
  - STORY-F-63 — Question Detail Review View (needs queue to navigate from)
personas_served: [faculty]
epic: E-23 (Faculty Review UI)
feature: F-10
user_flow: UF-14 (Faculty Review Workflow)
```

## 1. Summary

Build a **review queue list page** that displays a paginated, filterable, sortable table of questions awaiting faculty review. The page is scoped by faculty assignment -- faculty see items for their courses plus unassigned items in their department. The table uses shadcn/ui DataTable with color-coded status badges and priority indicators. Faculty can claim/unclaim items for self-assignment and perform bulk status changes. Real-time queue updates arrive via SSE (new items appearing). The server exposes a `GET /api/v1/review/queue` endpoint with comprehensive filtering, sorting, and pagination, plus `POST /api/v1/review/queue/:id/claim` and `DELETE /api/v1/review/queue/:id/claim` for claim management.

Key constraints:
- Queue scoped by faculty assignment: courses + unassigned in department
- SSE for real-time queue updates (NOT Socket.io -- Socket.io is for presence only)
- shadcn/ui DataTable pattern for table component
- Custom error class: `ReviewQueueError` extending `JourneyOSError`
- Named exports only, TypeScript strict, JS `#private` fields

## 2. Task Breakdown

1. **Types** -- Create `ReviewQueueItem`, `ReviewQueueFilters`, `ReviewQueueSort`, `ReviewStatus`, `ReviewPriority` in `packages/types/src/review/`
2. **Error class** -- `ReviewQueueError` in `apps/server/src/errors/review.errors.ts`
3. **Repository** -- `ReviewQueueRepository` with filtered, paginated queries against Supabase `questions` table (status in review pipeline)
4. **Service** -- `ReviewQueueService` with `list()`, `claim()`, `unclaim()`, scope filtering by faculty assignment
5. **Controller** -- `ReviewQueueController` with GET list, POST claim, DELETE unclaim endpoints
6. **Routes** -- Register routes under `/api/v1/review/queue`
7. **View -- QueueFilters** -- `QueueFilters` organism with dropdowns for status, course, priority, question type, date range
8. **View -- ReviewQueueTable** -- `ReviewQueueTable` organism with shadcn/ui DataTable, status badges, priority badges, bulk select
9. **View -- Page** -- `page.tsx` for `/faculty/review` dashboard route
10. **API tests** -- 10 tests covering list, filtering, sorting, pagination, claim/unclaim
11. **Exports** -- Register types and error class in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/review/queue.types.ts

/** Review queue status values */
export type ReviewStatus = "pending" | "in_review" | "revised";

/** Priority levels for review items */
export type ReviewPriority = "P1" | "P2" | "P3" | "P4" | "P5";

/** A single item in the review queue */
export interface ReviewQueueItem {
  readonly id: string;
  readonly question_id: string;
  readonly title: string;
  readonly stem_preview: string;
  readonly question_type: string;
  readonly course_id: string;
  readonly course_name: string;
  readonly priority: ReviewPriority;
  readonly status: ReviewStatus;
  readonly critic_composite_score: number;
  readonly assigned_reviewer_id: string | null;
  readonly assigned_reviewer_name: string | null;
  readonly generated_by_id: string;
  readonly generated_by_name: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Filters for querying the review queue */
export interface ReviewQueueFilters {
  readonly status?: ReviewStatus[];
  readonly course_id?: string;
  readonly priority?: ReviewPriority[];
  readonly question_type?: string;
  readonly date_from?: string;
  readonly date_to?: string;
}

/** Sort configuration */
export type ReviewQueueSortField = "priority" | "created_at" | "critic_composite_score" | "course_name";
export type SortDirection = "asc" | "desc";

export interface ReviewQueueSort {
  readonly field: ReviewQueueSortField;
  readonly direction: SortDirection;
}

/** Paginated response wrapper */
export interface ReviewQueueListResponse {
  readonly items: ReviewQueueItem[];
  readonly total: number;
  readonly page: number;
  readonly page_size: number;
  readonly total_pages: number;
}

/** Claim/unclaim request */
export interface ClaimRequest {
  readonly question_id: string;
}

/** Claim response */
export interface ClaimResponse {
  readonly question_id: string;
  readonly reviewer_id: string;
  readonly claimed_at: string;
}

/** Bulk action request */
export interface BulkStatusChangeRequest {
  readonly question_ids: string[];
  readonly new_status: ReviewStatus;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_review_queue_table
-- Review queue tracks questions in the review pipeline

CREATE TABLE IF NOT EXISTS review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  department_id UUID,
  priority TEXT NOT NULL DEFAULT 'P3' CHECK (priority IN ('P1', 'P2', 'P3', 'P4', 'P5')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'revised')),
  critic_composite_score NUMERIC(3,2),
  assigned_reviewer_id UUID REFERENCES profiles(id),
  generated_by_id UUID NOT NULL REFERENCES profiles(id),
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id)
);

-- Index for faculty-scoped queries (course + department)
CREATE INDEX idx_review_queue_course_id ON review_queue(course_id);
CREATE INDEX idx_review_queue_institution_id ON review_queue(institution_id);
CREATE INDEX idx_review_queue_department_id ON review_queue(department_id);
CREATE INDEX idx_review_queue_status ON review_queue(status);
CREATE INDEX idx_review_queue_assigned_reviewer ON review_queue(assigned_reviewer_id);
CREATE INDEX idx_review_queue_priority_created ON review_queue(priority, created_at DESC);

-- RLS policies
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can view queue items for their courses or unassigned in department"
  ON review_queue FOR SELECT
  USING (
    auth.uid() = assigned_reviewer_id
    OR course_id IN (
      SELECT course_id FROM course_assignments WHERE user_id = auth.uid()
    )
    OR (assigned_reviewer_id IS NULL AND department_id IN (
      SELECT department_id FROM profiles WHERE id = auth.uid()
    ))
  );

CREATE POLICY "Faculty can update queue items they are assigned to"
  ON review_queue FOR UPDATE
  USING (auth.uid() = assigned_reviewer_id OR assigned_reviewer_id IS NULL);
```

## 5. API Contract (complete request/response)

### GET /api/v1/review/queue (Auth: faculty, institutional_admin, superadmin)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| page_size | number | 20 | Items per page (max 100) |
| status | string | - | Comma-separated: pending,in_review,revised |
| course_id | string | - | Filter by course UUID |
| priority | string | - | Comma-separated: P1,P2,P3,P4,P5 |
| question_type | string | - | Filter by question type |
| date_from | string | - | ISO date string |
| date_to | string | - | ISO date string |
| sort_by | string | priority | Sort field |
| sort_dir | string | asc | asc or desc |

**Success Response (200):**
```json
{
  "data": {
    "items": [
      {
        "id": "rq-uuid-1",
        "question_id": "q-uuid-1",
        "title": "Chest Pain Differential",
        "stem_preview": "A 55-year-old male presents to the ED with...",
        "question_type": "single_best_answer",
        "course_id": "course-uuid-1",
        "course_name": "Cardiology 201",
        "priority": "P1",
        "status": "pending",
        "critic_composite_score": 3.8,
        "assigned_reviewer_id": null,
        "assigned_reviewer_name": null,
        "generated_by_id": "faculty-uuid-2",
        "generated_by_name": "Dr. Smith",
        "created_at": "2026-02-18T10:00:00Z",
        "updated_at": "2026-02-18T10:00:00Z"
      }
    ],
    "total": 47,
    "page": 1,
    "page_size": 20,
    "total_pages": 3
  },
  "error": null
}
```

### POST /api/v1/review/queue/:questionId/claim (Auth: faculty)

**Success Response (200):**
```json
{
  "data": {
    "question_id": "q-uuid-1",
    "reviewer_id": "faculty-uuid-1",
    "claimed_at": "2026-02-19T14:30:00Z"
  },
  "error": null
}
```

### DELETE /api/v1/review/queue/:questionId/claim (Auth: faculty)

**Success Response (200):**
```json
{
  "data": {
    "question_id": "q-uuid-1",
    "unclaimed_at": "2026-02-19T14:35:00Z"
  },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 200 | - | Success |
| 400 | `VALIDATION_ERROR` | Invalid filter params |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role |
| 404 | `NOT_FOUND` | Question not in queue |
| 409 | `ALREADY_CLAIMED` | Another reviewer already claimed |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Page: `/faculty/review`

**File:** `apps/web/src/app/(dashboard)/faculty/review/page.tsx`

```
ReviewQueuePage
  ├── PageHeader ("Review Queue")
  ├── QueueFilters (organism)
  │   ├── StatusFilter (molecule) — multi-select: pending, in_review, revised
  │   ├── CourseFilter (molecule) — dropdown populated from user's courses
  │   ├── PriorityFilter (molecule) — multi-select: P1-P5
  │   ├── QuestionTypeFilter (molecule) — dropdown
  │   ├── DateRangeFilter (molecule) — date pickers
  │   ├── ActiveFilterChips (molecule) — shows active filters with clear
  │   └── ClearAllButton (atom)
  ├── ReviewQueueTable (organism)
  │   ├── DataTable (shadcn/ui) — paginated, sortable columns
  │   ├── StatusBadge (atom) — pending: yellow, in_review: blue, revised: green
  │   ├── PriorityBadge (atom) — P1: red, P2: orange, P3: yellow, P4: blue, P5: gray
  │   ├── BulkSelectCheckbox (atom) — header checkbox for select all
  │   ├── ClaimButton (atom) — "Claim" / "Unclaim" toggle per row
  │   └── BulkActionBar (molecule) — appears when items selected
  └── EmptyState (molecule) — "Queue is clear!" with illustration
```

**Design tokens:**
- Status badge colors: `--color-status-pending` (amber/yellow), `--color-status-in-review` (blue), `--color-status-revised` (green)
- Priority badge colors: P1 `--color-priority-critical` (red), P2 `--color-priority-high` (orange), P3 `--color-priority-medium` (yellow), P4 `--color-priority-low` (blue), P5 `--color-priority-info` (gray)
- Table row hover: `--color-surface-hover`
- Background: `--color-bg-cream` (#f5f3ef)

**States:**
1. **Loading** -- Skeleton table rows while fetching
2. **Populated** -- Table with data, filters active
3. **Empty** -- No items match filters, show empty state
4. **Error** -- API error, show error banner with retry
5. **Claiming** -- Optimistic UI: button disabled during claim API call

**Keyboard shortcuts (power user):**
- `j` / `k` -- Navigate rows up/down
- `c` -- Claim/unclaim focused row
- `Enter` -- Open question detail view

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/review/queue.types.ts` | Types | Create |
| 2 | `packages/types/src/review/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add review export) |
| 4 | `apps/server/src/errors/review.errors.ts` | Errors | Create |
| 5 | `apps/server/src/errors/index.ts` | Errors | Edit (add export) |
| 6 | Supabase migration via MCP (review_queue table) | Database | Apply |
| 7 | `apps/server/src/repositories/review-queue.repository.ts` | Repository | Create |
| 8 | `apps/server/src/services/review/review-queue.service.ts` | Service | Create |
| 9 | `apps/server/src/controllers/review/review-queue.controller.ts` | Controller | Create |
| 10 | `apps/server/src/routes/review.routes.ts` | Routes | Create |
| 11 | `apps/server/src/routes/index.ts` | Routes | Edit (register review routes) |
| 12 | `apps/web/src/components/review/StatusBadge.tsx` | Atom | Create |
| 13 | `apps/web/src/components/review/PriorityBadge.tsx` | Atom | Create |
| 14 | `apps/web/src/components/review/QueueFilters.tsx` | Organism | Create |
| 15 | `apps/web/src/components/review/ReviewQueueTable.tsx` | Organism | Create |
| 16 | `apps/web/src/app/(dashboard)/faculty/review/page.tsx` | Page | Create |
| 17 | `apps/server/src/__tests__/review/review-queue.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-56 | faculty | Pending | Review router must exist to route items into queue |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty role check |
| STORY-U-10 | universal | **DONE** | Dashboard routing for faculty layout |

### NPM Packages (already installed or standard)
- `@tanstack/react-table` -- DataTable foundation for shadcn/ui table
- `date-fns` -- Date range filter formatting

### Existing Files Needed
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware` for route protection
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware` for faculty role check
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/auth/roles.types.ts` -- `AuthRole` enum
- `packages/types/src/common/api.types.ts` -- `ApiResponse<T>`, `PaginationMeta`

## 9. Test Fixtures (inline)

```typescript
// Mock review queue items
export const PENDING_REVIEW_ITEM = {
  id: "rq-uuid-1",
  question_id: "q-uuid-1",
  title: "Chest Pain Differential",
  stem_preview: "A 55-year-old male presents to the ED with...",
  question_type: "single_best_answer",
  course_id: "course-uuid-1",
  course_name: "Cardiology 201",
  priority: "P1" as const,
  status: "pending" as const,
  critic_composite_score: 3.8,
  assigned_reviewer_id: null,
  assigned_reviewer_name: null,
  generated_by_id: "faculty-uuid-2",
  generated_by_name: "Dr. Smith",
  created_at: "2026-02-18T10:00:00Z",
  updated_at: "2026-02-18T10:00:00Z",
};

export const IN_REVIEW_ITEM = {
  ...PENDING_REVIEW_ITEM,
  id: "rq-uuid-2",
  question_id: "q-uuid-2",
  title: "Renal Tubular Acidosis",
  status: "in_review" as const,
  priority: "P2" as const,
  assigned_reviewer_id: "faculty-uuid-1",
  assigned_reviewer_name: "Dr. Jones",
  critic_composite_score: 2.9,
};

export const REVISED_ITEM = {
  ...PENDING_REVIEW_ITEM,
  id: "rq-uuid-3",
  question_id: "q-uuid-3",
  title: "Pharmacokinetics of Warfarin",
  status: "revised" as const,
  priority: "P3" as const,
  critic_composite_score: 4.5,
};

// Mock faculty user for auth context
export const FACULTY_USER = {
  id: "faculty-uuid-1",
  email: "drjones@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
};

// Mock paginated response
export const QUEUE_LIST_RESPONSE = {
  items: [PENDING_REVIEW_ITEM, IN_REVIEW_ITEM, REVISED_ITEM],
  total: 3,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

// Empty queue response
export const EMPTY_QUEUE_RESPONSE = {
  items: [],
  total: 0,
  page: 1,
  page_size: 20,
  total_pages: 0,
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/review/review-queue.controller.test.ts`

```
describe("ReviewQueueController")
  describe("GET /api/v1/review/queue")
    > returns paginated list of review queue items
    > filters by status (pending only)
    > filters by course_id
    > filters by priority (P1, P2)
    > filters by date range
    > sorts by priority ascending (default)
    > sorts by critic_composite_score descending
    > returns empty list with empty state when no items match
    > returns 401 for unauthenticated request
    > returns 403 for non-faculty role

  describe("POST /api/v1/review/queue/:questionId/claim")
    > claims an unclaimed question for the requesting faculty
    > returns 409 when question already claimed by another reviewer
    > returns 404 when question not in queue

  describe("DELETE /api/v1/review/queue/:questionId/claim")
    > unclaims a question the faculty has claimed
    > returns 403 when trying to unclaim another reviewer's claim
```

**Total: ~15 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. E2E coverage for the review workflow will be added when the full review pipeline (queue + detail + actions) is complete.

## 12. Acceptance Criteria

1. Paginated table displays questions routed to review with all specified columns
2. Filters work: status, course, priority, question type, date range
3. Sorting works: priority (default), date, composite score, course
4. Status badges are color-coded: pending (yellow), in_review (blue), revised (green)
5. Priority badges are color-coded: P1 (red), P2 (orange), P3 (yellow), P4 (blue), P5 (gray)
6. Bulk select enables batch status changes
7. Claim/unclaim functionality works with optimistic UI
8. Empty state displays helpful messaging when queue is clear
9. Queue is scoped: faculty see items for their courses + unassigned in department
10. All 15 API tests pass
11. TypeScript strict, named exports only, JS `#private` fields

## 13. Source References

| Claim | Source |
|-------|--------|
| SSE for real-time, not Socket.io | ARCHITECTURE_v10 SS 6.3: "SSE for streaming generation pipeline events. Socket.io for presence only." |
| Review queue scoping by faculty assignment | S-F-23-1 SS Notes: "faculty see items for their courses + unassigned items in their department" |
| Priority badge colors | S-F-23-1 SS Notes: "P1 (red), P2 (orange), P3 (yellow), P4 (blue), P5 (gray)" |
| Keyboard shortcuts | S-F-23-1 SS Notes: "j/k navigate, c claim, Enter open detail" |
| shadcn/ui DataTable pattern | S-F-23-1 SS Notes |
| Blocks detail/actions/self-review | FULL-DEPENDENCY-GRAPH: S-F-23-1 -> S-F-23-2, S-F-23-3, S-F-23-4 |
| Review router dependency | S-F-23-1 SS Dependencies: "Blocked by: S-F-22-2" |

## 14. Environment Prerequisites

- **Supabase:** Project running, `questions`, `courses`, `profiles`, `institutions` tables exist
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **STORY-F-56 (Review Router):** Must be complete -- routes items into review queue
- **STORY-U-6 (RBAC):** Complete -- provides role-based access control
- **No Neo4j needed** for this story (review queue is Supabase-only)

## 15. Figma Make Prototype

```
Frame: Review Queue Page (1440x900)
  ├── Sidebar (240px, navy deep #002c76)
  ├── Main Content Area (1200px, cream #f5f3ef)
  │   ├── Header: "Review Queue" (24px, bold, navy deep)
  │   ├── Filter Bar (full width, white #ffffff card)
  │   │   ├── Status multi-select dropdown
  │   │   ├── Course dropdown
  │   │   ├── Priority multi-select dropdown
  │   │   ├── Question type dropdown
  │   │   ├── Date range picker
  │   │   └── Active filter chips row
  │   ├── DataTable (full width, white #ffffff card)
  │   │   ├── Header row with sortable columns
  │   │   ├── Checkbox column (bulk select)
  │   │   ├── Title/stem preview column
  │   │   ├── Type column
  │   │   ├── Course column
  │   │   ├── Priority badge column (color-coded)
  │   │   ├── Status badge column (color-coded)
  │   │   ├── Score column
  │   │   ├── Reviewer column
  │   │   ├── Date column
  │   │   ├── Claim button column
  │   │   └── Pagination controls
  │   └── Bulk Action Bar (sticky bottom, appears on selection)
  └── Empty State (centered, illustration + "Queue is clear!")
```
