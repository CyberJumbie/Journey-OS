# STORY-F-40 Brief: Concept Review Queue UI

## 0. Lane & Priority

```yaml
story_id: STORY-F-40
old_id: S-F-13-1
lane: faculty
lane_priority: 3
within_lane_order: 40
sprint: 5
size: L
depends_on:
  - STORY-F-31 (faculty) — Concept Extraction (concepts must be extracted)
  - STORY-F-34 (faculty) — TEACHES Relationships (TEACHES rels must exist)
blocks:
  - STORY-F-44 — Batch Operations
personas_served: [faculty, institutional_admin]
epic: E-13 (Concept Review & Verification)
feature: F-06 (Concept Management)
user_flow: UF-13 (Concept Review)
```

## 1. Summary

Build a **concept review queue** at `/courses/:courseId/concepts/review` where Course Directors can view all unverified SubConcepts for a course in a paginated, filterable, sortable list. Each concept card shows its name, description, source chunk text, confidence score, and StandardTerm mappings. Faculty can approve, reject (with reason), or edit (name/description) each concept. A statistics banner shows total, approved, rejected, and pending counts. The detail panel opens as a slide-over showing full context from the source content.

Key constraints:
- **Course Director and Institutional Admin only** — RBAC enforced
- Reads SubConcepts with `status = 'unverified'` from existing concept tables
- Filterable by source content, confidence score range, enrichment status
- Sortable by confidence score, extraction date, name
- Per-concept actions: Approve, Reject (with reason), Edit (name/description)
- Pagination for large concept lists

## 2. Task Breakdown

1. **Types** — Create `ConceptReviewItem`, `ConceptReviewQuery`, `ConceptReviewResponse`, `ConceptDetail`, `ConceptReviewAction` in `packages/types/src/concept/review.types.ts`
2. **Error classes** — `ConceptNotFoundError` in `apps/server/src/errors/concept.errors.ts`
3. **Service** — `ConceptReviewService` with `listUnverified()`, `getConceptDetail()`, `reviewConcept()` methods
4. **Controller** — `ConceptReviewController` with `handleList()`, `handleGetDetail()`, `handleReview()` methods
5. **Routes** — `GET /api/v1/courses/:courseId/concepts`, `GET /api/v1/concepts/:conceptId`, `PATCH /api/v1/concepts/:conceptId/review` with RBAC
6. **Frontend page** — `/courses/:courseId/concepts/review` page (faculty layout)
7. **Frontend components** — `ConceptReviewQueue` (organism), `ConceptReviewCard` (molecule), `ConceptDetailPanel` (molecule), `ReviewStatsBanner` (molecule), `ConceptFilters` (molecule)
8. **Wire up** — Register routes in `apps/server/src/index.ts`
9. **API tests** — 14 tests covering list, filter, approve, reject, edit, permission checks
10. **E2E test** — 1 test for full review flow

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/concept/review.types.ts

/** Review action types */
export type ConceptReviewActionType = "approve" | "reject" | "edit";

/** Sort fields for concept review queue */
export type ConceptReviewSortField = "confidence_score" | "created_at" | "name";

/** Filter parameters for concept review queue */
export interface ConceptReviewQuery {
  readonly page?: number;                    // Default: 1
  readonly limit?: number;                   // Default: 20, max: 100
  readonly sortBy?: ConceptReviewSortField;  // Default: "confidence_score"
  readonly sortDir?: "asc" | "desc";         // Default: "desc"
  readonly status?: "unverified" | "verified" | "rejected" | "all";  // Default: "unverified"
  readonly minConfidence?: number;           // 0-1
  readonly maxConfidence?: number;           // 0-1
  readonly sourceContentId?: string;         // Filter by source document
  readonly enrichmentStatus?: "enriched" | "pending" | "all";
}

/** Single concept row in the review queue */
export interface ConceptReviewItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly confidenceScore: number;
  readonly status: "unverified" | "verified" | "rejected";
  readonly sourceContentId: string;
  readonly sourceChunkPreview: string;        // First 200 chars of source chunk
  readonly standardTermCount: number;         // Count of mapped StandardTerms
  readonly enrichmentStatus: "enriched" | "pending";
  readonly createdAt: string;
}

/** Full concept detail (returned by GET /concepts/:id) */
export interface ConceptDetail {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly confidenceScore: number;
  readonly status: "unverified" | "verified" | "rejected";
  readonly sourceContentId: string;
  readonly sourceChunkText: string;           // Full source chunk text
  readonly standardTerms: readonly StandardTermMapping[];
  readonly enrichmentStatus: "enriched" | "pending";
  readonly courseId: string;
  readonly courseName: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Standard term mapping */
export interface StandardTermMapping {
  readonly termId: string;
  readonly termName: string;
  readonly vocabulary: string;               // e.g., "MeSH", "SNOMED"
  readonly matchScore: number;
}

/** Review action payload */
export interface ConceptReviewAction {
  readonly action: ConceptReviewActionType;
  readonly reason?: string;                   // Required for reject
  readonly editedName?: string;               // Only for edit action
  readonly editedDescription?: string;        // Only for edit action
}

/** Review statistics */
export interface ConceptReviewStats {
  readonly total: number;
  readonly approved: number;
  readonly rejected: number;
  readonly pending: number;
}

/** Paginated response for concept review */
export interface ConceptReviewResponse {
  readonly concepts: readonly ConceptReviewItem[];
  readonly stats: ConceptReviewStats;
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}
```

## 4. Database Schema (inline, complete)

No new tables needed. Reads from existing concept tables created by extraction pipeline (F-31/F-34). One new index for review queue performance.

```sql
-- Existing tables used:
-- sub_concepts (id, name, description, confidence_score, status, source_content_id, enrichment_status, created_at, updated_at)
-- standard_term_mappings (id, concept_id, term_id, term_name, vocabulary, match_score)
-- concept_reviews (id, concept_id, reviewer_id, action, reason, previous_state, created_at) — audit trail from F-41

-- Additional index for review queue sort/filter performance:
CREATE INDEX IF NOT EXISTS idx_sub_concepts_status_confidence
  ON sub_concepts(status, confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_sub_concepts_course_status
  ON sub_concepts(course_id, status);
```

## 5. API Contract (complete request/response)

### GET /api/v1/courses/:courseId/concepts (Auth: Course Director, Institutional Admin)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `sort_by` | string | `confidence_score` | Sort: `confidence_score`, `created_at`, `name` |
| `sort_dir` | string | `desc` | Sort direction |
| `status` | string | `unverified` | Filter: `unverified`, `verified`, `rejected`, `all` |
| `min_confidence` | number | - | Minimum confidence score (0-1) |
| `max_confidence` | number | - | Maximum confidence score (0-1) |
| `source_content_id` | string | - | Filter by source document |

**Success Response (200):**
```json
{
  "data": {
    "concepts": [
      {
        "id": "concept-uuid-1",
        "name": "Myocardial Infarction Pathophysiology",
        "description": "Mechanisms of cardiac cell death from ischemia",
        "confidenceScore": 0.92,
        "status": "unverified",
        "sourceContentId": "content-uuid-1",
        "sourceChunkPreview": "The pathophysiology of myocardial infarction involves...",
        "standardTermCount": 3,
        "enrichmentStatus": "enriched",
        "createdAt": "2026-02-19T12:00:00Z"
      }
    ],
    "stats": {
      "total": 48,
      "approved": 12,
      "rejected": 3,
      "pending": 33
    },
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 33,
      "totalPages": 2
    }
  },
  "error": null
}
```

### GET /api/v1/concepts/:conceptId (Auth: Course Director, Institutional Admin)

**Success Response (200):**
```json
{
  "data": {
    "id": "concept-uuid-1",
    "name": "Myocardial Infarction Pathophysiology",
    "description": "Mechanisms of cardiac cell death from ischemia",
    "confidenceScore": 0.92,
    "status": "unverified",
    "sourceContentId": "content-uuid-1",
    "sourceChunkText": "The pathophysiology of myocardial infarction involves prolonged ischemia leading to irreversible cardiac myocyte death...",
    "standardTerms": [
      { "termId": "mesh-1", "termName": "Myocardial Infarction", "vocabulary": "MeSH", "matchScore": 0.95 }
    ],
    "enrichmentStatus": "enriched",
    "courseId": "course-uuid-1",
    "courseName": "Cardiovascular Pathology",
    "createdAt": "2026-02-19T12:00:00Z",
    "updatedAt": "2026-02-19T12:00:00Z"
  },
  "error": null
}
```

### PATCH /api/v1/concepts/:conceptId/review (Auth: Course Director, Institutional Admin)

**Request Body:**
```json
{
  "action": "approve"
}
```
or
```json
{
  "action": "reject",
  "reason": "Incorrect mapping to curriculum objective"
}
```
or
```json
{
  "action": "edit",
  "editedName": "MI Pathophysiology",
  "editedDescription": "Updated description of cardiac ischemia mechanisms"
}
```

**Success Response (200):**
```json
{
  "data": {
    "id": "concept-uuid-1",
    "status": "verified",
    "reviewedAt": "2026-02-19T12:05:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-Course Director / non-Institutional Admin |
| 400 | `VALIDATION_ERROR` | Missing reason for reject, invalid action |
| 404 | `NOT_FOUND` | Concept ID does not exist |
| 409 | `ALREADY_REVIEWED` | Concept already in terminal state |

## 6. Frontend Spec

### Page: `/courses/:courseId/concepts/review` (Faculty layout)

**Route:** `apps/web/src/app/(dashboard)/faculty/courses/[courseId]/concepts/review/page.tsx`

**Component hierarchy:**
```
ConceptReviewPage (page.tsx — default export)
  └── ConceptReviewQueue (organism, client component)
        ├── ReviewStatsBanner (molecule: total, approved, rejected, pending)
        ├── ConceptFilters (molecule: status dropdown, confidence range, source filter)
        ├── ConceptReviewCardList
        │     └── ConceptReviewCard (molecule, per-concept)
        │           ├── Name, description, confidence badge
        │           ├── Source chunk preview (truncated)
        │           ├── StandardTerm count badge
        │           ├── Approve button (green, #69a338)
        │           ├── Reject button (red)
        │           └── Edit button (navy, #002c76)
        ├── ConceptDetailPanel (molecule — slide-over panel)
        │     ├── Full concept data display
        │     ├── Source chunk full text
        │     ├── StandardTerm mappings list
        │     └── Review action buttons
        └── Pagination (page numbers + prev/next)
```

**States:**
1. **Loading** — Skeleton cards while fetching
2. **Empty** — "No concepts pending review" with link back to course
3. **Data** — Card list with filters, stats banner, pagination
4. **Detail** — Slide-over panel showing full concept context
5. **Reject Modal** — Text input for rejection reason
6. **Error** — Error message with retry button

**Design tokens:**
- Status badges: unverified = `warning-blue`, verified = `success-green` (#69a338), rejected = `error-red`
- Confidence score: color gradient from red (<0.5) to yellow (0.5-0.7) to green (>0.7)
- Surface: White (#ffffff) cards on Cream (#f5f3ef) background
- Typography: Source Sans 3
- Spacing: 16px card padding, 24px section gap

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/concept/review.types.ts` | Types | Create |
| 2 | `packages/types/src/concept/index.ts` | Types | Create (barrel export) |
| 3 | Supabase migration via MCP (indexes) | Database | Apply |
| 4 | `apps/server/src/errors/concept.errors.ts` | Errors | Create |
| 5 | `apps/server/src/services/concept/concept-review.service.ts` | Service | Create |
| 6 | `apps/server/src/controllers/concept/concept-review.controller.ts` | Controller | Create |
| 7 | `apps/server/src/routes/concept-review.routes.ts` | Routes | Create |
| 8 | `apps/server/src/index.ts` | Routes | Edit (register concept review routes) |
| 9 | `apps/web/src/app/(dashboard)/faculty/courses/[courseId]/concepts/review/page.tsx` | Page | Create |
| 10 | `apps/web/src/components/organisms/ConceptReviewQueue/ConceptReviewQueue.tsx` | Organism | Create |
| 11 | `apps/web/src/components/molecules/ConceptReviewCard.tsx` | Molecule | Create |
| 12 | `apps/web/src/components/molecules/ConceptDetailPanel.tsx` | Molecule | Create |
| 13 | `apps/web/src/components/molecules/ReviewStatsBanner.tsx` | Molecule | Create |
| 14 | `apps/web/src/components/molecules/ConceptFilters.tsx` | Molecule | Create |
| 15 | `apps/server/src/__tests__/concept/concept-review.controller.test.ts` | Tests | Create |
| 16 | `apps/web/e2e/concept-review.spec.ts` | E2E | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-31 | faculty | NOT STARTED | Concepts must be extracted (SubConcept nodes and tables) |
| STORY-F-34 | faculty | NOT STARTED | TEACHES relationships must exist (course-concept links) |
| STORY-U-3 | universal | **DONE** | Auth middleware for JWT validation |
| STORY-U-6 | universal | **DONE** | RBAC middleware for role enforcement |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client
- `express` — Server framework
- `vitest` — Testing
- `@playwright/test` — E2E testing

### Existing Files Needed
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — RBAC enforcement
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`

## 9. Test Fixtures (inline)

```typescript
// Mock Course Director user
export const COURSE_DIRECTOR_USER = {
  sub: "cd-uuid-1",
  email: "dr.jones@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: true,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock student user (should be denied)
export const STUDENT_USER = {
  ...COURSE_DIRECTOR_USER,
  sub: "student-uuid-1",
  email: "student@msm.edu",
  role: "student" as const,
  is_course_director: false,
};

// Mock concept review items
export const MOCK_CONCEPTS = [
  {
    id: "concept-1",
    name: "Myocardial Infarction Pathophysiology",
    description: "Mechanisms of cardiac cell death from ischemia",
    confidence_score: 0.92,
    status: "unverified",
    source_content_id: "content-1",
    source_chunk_preview: "The pathophysiology of myocardial infarction involves...",
    standard_term_count: 3,
    enrichment_status: "enriched",
    created_at: "2026-02-19T12:00:00Z",
  },
  {
    id: "concept-2",
    name: "Left Ventricular Hypertrophy",
    description: "Thickening of the left ventricular wall",
    confidence_score: 0.78,
    status: "unverified",
    source_content_id: "content-1",
    source_chunk_preview: "Left ventricular hypertrophy is characterized by...",
    standard_term_count: 2,
    enrichment_status: "enriched",
    created_at: "2026-02-18T10:00:00Z",
  },
  {
    id: "concept-3",
    name: "Cardiac Tamponade",
    description: "Fluid accumulation in the pericardial space",
    confidence_score: 0.55,
    status: "unverified",
    source_content_id: "content-2",
    source_chunk_preview: "Cardiac tamponade occurs when fluid accumulates...",
    standard_term_count: 1,
    enrichment_status: "pending",
    created_at: "2026-02-17T08:00:00Z",
  },
];

// Mock concept detail
export const MOCK_CONCEPT_DETAIL = {
  id: "concept-1",
  name: "Myocardial Infarction Pathophysiology",
  description: "Mechanisms of cardiac cell death from ischemia",
  confidence_score: 0.92,
  status: "unverified",
  source_content_id: "content-1",
  source_chunk_text: "The pathophysiology of myocardial infarction involves prolonged ischemia leading to irreversible cardiac myocyte death. The process begins with coronary artery occlusion...",
  standard_terms: [
    { term_id: "mesh-1", term_name: "Myocardial Infarction", vocabulary: "MeSH", match_score: 0.95 },
    { term_id: "snomed-1", term_name: "Acute myocardial infarction", vocabulary: "SNOMED", match_score: 0.91 },
  ],
  enrichment_status: "enriched",
  course_id: "course-uuid-1",
  course_name: "Cardiovascular Pathology",
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

// Mock review stats
export const MOCK_REVIEW_STATS = {
  total: 48,
  approved: 12,
  rejected: 3,
  pending: 33,
};
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/__tests__/concept/concept-review.controller.test.ts`

```
describe("ConceptReviewController")
  describe("handleList")
    ✓ returns paginated unverified concepts for Course Director (200)
    ✓ returns correct pagination meta
    ✓ returns review statistics in response
    ✓ defaults to status=unverified, sort_by=confidence_score desc
    ✓ rejects unauthenticated request (401)
    ✓ rejects non-Course Director roles (403 FORBIDDEN)
    ✓ filters by confidence score range (min/max)
    ✓ filters by source content ID
    ✓ sorts by name ascending
    ✓ returns empty list when no concepts match filter

  describe("handleGetDetail")
    ✓ returns full concept detail with StandardTerm mappings
    ✓ returns 404 for non-existent concept ID

  describe("handleReview")
    ✓ approves concept and returns updated status
    ✓ rejects concept with reason
    ✓ edits concept name and description
    ✓ returns 400 when reject action missing reason
    ✓ returns 409 when concept already reviewed

describe("ConceptReviewService")
  describe("listUnverified")
    ✓ builds correct Supabase query with filters
    ✓ calculates stats from parallel count queries
  describe("reviewConcept")
    ✓ delegates to VerificationService for approve/reject
    ✓ updates name/description for edit action and triggers re-embedding
```

**Total: ~21 tests** (17 controller + 4 service)

## 11. E2E Test Spec (Playwright — 1 test)

**File:** `apps/web/e2e/concept-review.spec.ts`

```
describe("Concept Review Flow")
  ✓ Course Director views review queue, approves a concept, verifies status change
    1. Login as Course Director (demo account)
    2. Navigate to /courses/:courseId/concepts/review
    3. Verify review stats banner shows counts
    4. Verify concept cards display with name, confidence, status
    5. Click first concept card to open detail panel
    6. Verify detail panel shows source chunk and StandardTerm mappings
    7. Click Approve button
    8. Verify concept status changes to "verified"
    9. Verify stats banner updates (pending - 1, approved + 1)
```

## 12. Acceptance Criteria

1. Review queue page lists all unverified SubConcepts for a course
2. Filterable by source content, confidence score range, enrichment status
3. Sortable by confidence score, extraction date, name
4. Per-concept actions: Approve, Reject (with reason), Edit (name/description)
5. Concept detail panel shows name, description, source chunk text, confidence score, StandardTerm mappings
6. Review statistics banner shows total, approved, rejected, pending counts
7. Pagination for large concept lists (20 per page, max 100)
8. Only Course Directors and Institutional Admins can access (RBAC enforced)
9. All ~21 API tests pass
10. 1 E2E test passes: full review flow

## 13. Source References

| Claim | Source |
|-------|--------|
| Review queue for Course Directors | S-F-13-1 § User Story |
| ConceptReviewQueue is Organism | S-F-13-1 § Notes: "ConceptReviewQueue is an Organism" |
| Status badge colors | S-F-13-1 § Notes: "blue (pending), green (approved), red (rejected)" |
| Reject requires reason | S-F-13-1 § Notes: "Reject action requires a reason string" |
| Edit triggers re-embedding | S-F-13-1 § Notes: "Edit action updates SubConcept and triggers re-embedding" |
| Detail panel slide-over | S-F-13-1 § Notes: "Detail panel opens as a slide-over" |

## 14. Environment Prerequisites

- **Supabase:** Project running with concept tables (from F-31/F-34)
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **Neo4j:** Running for TEACHES relationship queries (read-only in this story)

## 15. Figma / Make Prototype

**Layout:** Full-width page within faculty dashboard layout.
- **Stats Banner:** 4-column card row at top (Total, Approved, Rejected, Pending) using Navy Deep (#002c76) text on White (#ffffff) cards
- **Filters:** Horizontal filter bar below stats (status dropdown, confidence range slider, source selector)
- **Card List:** Vertical scrollable list of ConceptReviewCards with 16px gap
- **Detail Panel:** Right slide-over (400px width) with full concept detail, overlays card list
- **Action Buttons:** Approve (Green #69a338), Reject (Red), Edit (Navy #002c76) — in both card footer and detail panel
