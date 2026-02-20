# STORY-IA-8 Brief: Course Oversight Dashboard

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-8
old_id: S-IA-09-3
lane: institutional_admin
lane_priority: 2
within_lane_order: 8
sprint: 4
size: M
depends_on:
  - STORY-F-1 (faculty) — Course CRUD (courses must exist)
blocks: []
personas_served: [institutional_admin]
epic: E-09 (Course SLO Linking & Scheduling)
feature: F-04 (Course Management)
user_flow: UF-08 (Course Oversight)
```

## 1. Summary

**What to build:** A course oversight dashboard page at `/institution/courses` that displays all institution courses as summary cards with key metrics. Each card shows: SLO count, FULFILLS coverage percentage, content upload count, and processing status. The dashboard supports filtering by program, academic year, and status, plus sorting by coverage percentage, name, or last updated. Clicking a card navigates to the course detail page.

**Parent epic:** E-09 (Course SLO Linking & Scheduling) under F-04 (Course Management). This is story 3 of the epic, providing the institutional admin's read-only overview of all courses.

**User flows satisfied:**
- UF-08 (Course Oversight) — institutional admin reviews course health across the institution

**Personas:** Institutional Admin. This dashboard is scoped to a single institution; the admin sees only their institution's courses.

**Why this story matters:** Without a centralized course overview, institutional admins have no way to monitor SLO coverage, content upload progress, or processing status across their programs. This is the entry point to course-level drill-down and compliance monitoring.

## 2. Task Breakdown

| # | Task | File(s) | Action |
|---|------|---------|--------|
| 1 | Define course oversight types | `packages/types/src/course/oversight.types.ts` | CREATE |
| 2 | Create course types barrel export | `packages/types/src/course/index.ts` | CREATE |
| 3 | Export course module from types root | `packages/types/src/index.ts` | UPDATE |
| 4 | Create CourseOverviewError custom error | `apps/server/src/errors/course-overview.error.ts` | CREATE |
| 5 | Implement CourseOversightService | `apps/server/src/services/course/course-oversight.service.ts` | CREATE |
| 6 | Implement CourseOversightController | `apps/server/src/controllers/course/course-oversight.controller.ts` | CREATE |
| 7 | Register course overview route | `apps/server/src/index.ts` | UPDATE |
| 8 | Create course overview page (Next.js) | `apps/web/src/app/(protected)/institution/courses/page.tsx` | CREATE |
| 9 | Create CourseOverview organism component | `apps/web/src/components/course/course-overview.tsx` | CREATE |
| 10 | Create CourseSummaryCard molecule component | `apps/web/src/components/course/course-summary-card.tsx` | CREATE |
| 11 | Write CourseOversightService unit tests | `apps/server/src/services/course/__tests__/course-oversight.service.test.ts` | CREATE |
| 12 | Write CourseOversightController unit tests | `apps/server/src/controllers/course/__tests__/course-oversight.controller.test.ts` | CREATE |

## 3. Data Model (inline, complete)

### `packages/types/src/course/oversight.types.ts`

```typescript
/**
 * A single course summary item for the oversight dashboard.
 * Read-only — this is a computed view, not a mutable entity.
 */
export interface CourseOverviewItem {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly director_name: string | null;
  readonly slo_count: number;
  readonly fulfills_coverage_pct: number;
  readonly upload_count: number;
  readonly processing_status: CourseProcessingStatus;
  readonly program_name: string | null;
  readonly academic_year: string | null;
  readonly status: CourseStatus;
  readonly updated_at: string;
}

export type CourseProcessingStatus = "idle" | "processing" | "complete";
export type CourseStatus = "active" | "archived";

/**
 * Valid sort fields for course overview listing.
 */
export type CourseOverviewSortField = "name" | "fulfills_coverage_pct" | "updated_at";

/**
 * Query parameters for GET /api/v1/institution/courses/overview.
 */
export interface CourseOverviewQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly sort_by?: CourseOverviewSortField;
  readonly sort_dir?: "asc" | "desc";
  readonly program_id?: string;
  readonly academic_year?: string;
  readonly status?: CourseStatus;
}

/**
 * Paginated response for course overview.
 */
export interface CourseOverviewResponse {
  readonly courses: readonly CourseOverviewItem[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}
```

### `packages/types/src/course/index.ts`

```typescript
export type {
  CourseOverviewItem,
  CourseProcessingStatus,
  CourseStatus,
  CourseOverviewSortField,
  CourseOverviewQuery,
  CourseOverviewResponse,
} from "./oversight.types";
```

## 4. Database Schema (inline, complete)

**No new tables or migrations.** This story reads from existing tables:

- `courses` — base course data (id, code, name, program_id, academic_year, status, updated_at)
- `slos` — SLO records linked to courses (for slo_count)
- `course_content_uploads` — uploaded content items (for upload_count, processing_status)
- `programs` — program name lookup
- `profiles` — course director name lookup

The service constructs an aggregation query joining these tables and computing:
- `slo_count`: COUNT of SLOs linked to each course
- `fulfills_coverage_pct`: percentage of SLOs that have at least one FULFILLS relationship to content
- `upload_count`: COUNT of content uploads for each course
- `processing_status`: derived from upload statuses (all complete = "complete", any processing = "processing", none = "idle")

All data is scoped to the authenticated user's `institution_id` from the JWT.

## 5. API Contract (complete request/response)

### GET /api/v1/institution/courses/overview

**Auth:** Required. Role: `institutional_admin`. Scoped to user's institution.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number (1-indexed) |
| `limit` | number | 20 | Items per page (max 100) |
| `sort_by` | string | "name" | Sort field: "name", "fulfills_coverage_pct", "updated_at" |
| `sort_dir` | string | "asc" | Sort direction: "asc", "desc" |
| `program_id` | string | — | Filter by program UUID |
| `academic_year` | string | — | Filter by academic year (e.g., "2025-2026") |
| `status` | string | — | Filter by status: "active", "archived" |

**200 Success:**
```json
{
  "data": {
    "courses": [
      {
        "id": "course-uuid-1",
        "code": "ANAT-101",
        "name": "Gross Anatomy",
        "director_name": "Dr. Sarah Chen",
        "slo_count": 24,
        "fulfills_coverage_pct": 87.5,
        "upload_count": 12,
        "processing_status": "complete",
        "program_name": "MD Program",
        "academic_year": "2025-2026",
        "status": "active",
        "updated_at": "2026-02-15T10:30:00Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "total_pages": 1
    }
  },
  "error": null
}
```

**400 Validation Error (invalid query params):**
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid sort_by value. Must be one of: name, fulfills_coverage_pct, updated_at"
  }
}
```

**401 Unauthorized:**
```json
{
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden (wrong role):**
```json
{
  "data": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

**500 Internal Error:**
```json
{
  "data": null,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## 6. Frontend Spec

### Route: `/institution/courses`

**Layout:** `(protected)` group layout — requires authentication, shows institution admin navigation.

### Component Hierarchy

```
app/(protected)/institution/courses/page.tsx (Server Component — metadata + data fetch)
  └── CourseOverview (Client Component — "use client")
        ├── Filter bar
        │   ├── Program dropdown
        │   ├── Academic year dropdown
        │   └── Status toggle (active/archived)
        ├── Sort controls
        │   ├── Sort by dropdown (name, coverage %, last updated)
        │   └── Sort direction toggle (asc/desc)
        ├── Course card grid
        │   └── CourseSummaryCard[] (molecule)
        │       ├── Course code + name
        │       ├── Director name
        │       ├── SLO count badge
        │       ├── Coverage % progress bar
        │       ├── Upload count
        │       ├── Processing status indicator
        │       └── Click → /institution/courses/[id]
        ├── Pagination controls
        ├── Empty state ("No courses found")
        └── Loading skeleton
```

### CourseSummaryCard Props

```typescript
interface CourseSummaryCardProps {
  readonly course: CourseOverviewItem;
  readonly onClick: (courseId: string) => void;
}
```

### CourseOverview Props

```typescript
interface CourseOverviewProps {}
// Self-contained — fetches data via API call to /api/v1/institution/courses/overview
// Manages filter, sort, and pagination state internally
```

### Design Tokens
- Card: `bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer`
- Coverage bar: gradient from `#dc2626` (0%) through `#f59e0b` (50%) to `#69a338` (100%)
- Processing status dots: idle = `bg-gray-400`, processing = `bg-amber-500 animate-pulse`, complete = `bg-green-500`
- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Primary button: `bg-[#2b71b9] text-white`
- Font: inherited from layout (Geist / Source Sans 3)

### States
1. **Loading:** Grid of skeleton cards (6 placeholders)
2. **Data:** Course cards with metrics
3. **Empty:** "No courses match your filters" with reset filters button
4. **Error:** Red banner with retry button

## 7. Files to Create (exact paths, implementation order)

| # | Layer | Path | Action | Description |
|---|-------|------|--------|-------------|
| 1 | Types | `packages/types/src/course/oversight.types.ts` | CREATE | CourseOverviewItem, Query, Response types |
| 2 | Types | `packages/types/src/course/index.ts` | CREATE | Barrel export for course types |
| 3 | Types | `packages/types/src/index.ts` | UPDATE | Add `export * from "./course"` |
| 4 | Errors | `apps/server/src/errors/course-overview.error.ts` | CREATE | CourseOverviewError |
| 5 | Service | `apps/server/src/services/course/course-oversight.service.ts` | CREATE | Aggregation queries, filtering, sorting |
| 6 | Controller | `apps/server/src/controllers/course/course-oversight.controller.ts` | CREATE | Query param validation, response formatting |
| 7 | App | `apps/server/src/index.ts` | UPDATE | Register GET /api/v1/institution/courses/overview |
| 8 | View | `apps/web/src/app/(protected)/institution/courses/page.tsx` | CREATE | Server component with metadata |
| 9 | Component | `apps/web/src/components/course/course-overview.tsx` | CREATE | Organism: filter bar + grid + pagination |
| 10 | Component | `apps/web/src/components/course/course-summary-card.tsx` | CREATE | Molecule: single course card |
| 11 | Tests | `apps/server/src/services/course/__tests__/course-oversight.service.test.ts` | CREATE | Service unit tests |
| 12 | Tests | `apps/server/src/controllers/course/__tests__/course-oversight.controller.test.ts` | CREATE | Controller unit tests |

## 8. Dependencies

### Story Dependencies

| Story | Lane | Status | What It Provides |
|-------|------|--------|------------------|
| STORY-F-1 | faculty | PENDING | Course CRUD — courses table, course model, course repository |
| STORY-U-1 | universal | DONE | Supabase Auth Setup |
| STORY-U-3 | universal | DONE | Express Auth Middleware |
| STORY-U-6 | universal | DONE | RBAC Middleware — `rbac.require(AuthRole.INSTITUTIONAL_ADMIN)` |

### NPM Packages (all already installed)

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | ^2.97.0 | Supabase queries for aggregation |
| `express` | ^5.2.1 | Request/Response types |
| `zod` | ^4.3.6 | Query parameter validation |
| `vitest` | ^4.0.18 | Test runner |
| `next` | 16.1.6 | App Router |
| `react` | 19.2.3 | UI |
| `@journey-os/types` | workspace:* | Shared type definitions |

### Existing Files Required

| File | What It Provides |
|------|------------------|
| `apps/server/src/errors/base.errors.ts` | `JourneyOSError` base class |
| `apps/server/src/middleware/auth.middleware.ts` | Auth middleware for JWT validation |
| `apps/server/src/middleware/rbac.middleware.ts` | RBAC middleware for role enforcement |
| `apps/server/src/config/supabase.config.ts` | `getSupabaseClient()` singleton |
| `apps/server/src/config/env.config.ts` | `envConfig` |
| `packages/types/src/auth/roles.types.ts` | `AuthRole` enum |

## 9. Test Fixtures (inline)

### Course Overview Items

```typescript
export const MOCK_COURSES: CourseOverviewItem[] = [
  {
    id: "course-aaaa-bbbb-cccc-000000000001",
    code: "ANAT-101",
    name: "Gross Anatomy",
    director_name: "Dr. Sarah Chen",
    slo_count: 24,
    fulfills_coverage_pct: 87.5,
    upload_count: 12,
    processing_status: "complete",
    program_name: "MD Program",
    academic_year: "2025-2026",
    status: "active",
    updated_at: "2026-02-15T10:30:00Z",
  },
  {
    id: "course-aaaa-bbbb-cccc-000000000002",
    code: "PHYS-201",
    name: "Medical Physiology",
    director_name: "Dr. James Okoro",
    slo_count: 18,
    fulfills_coverage_pct: 55.0,
    upload_count: 6,
    processing_status: "processing",
    program_name: "MD Program",
    academic_year: "2025-2026",
    status: "active",
    updated_at: "2026-02-10T14:00:00Z",
  },
  {
    id: "course-aaaa-bbbb-cccc-000000000003",
    code: "BIOC-150",
    name: "Medical Biochemistry",
    director_name: null,
    slo_count: 0,
    fulfills_coverage_pct: 0,
    upload_count: 0,
    processing_status: "idle",
    program_name: "MD Program",
    academic_year: "2024-2025",
    status: "archived",
    updated_at: "2025-06-01T09:00:00Z",
  },
];
```

### Mock Supabase Query Builder

```typescript
export function mockSupabaseQuery(data: CourseOverviewItem[], total: number) {
  const selectMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({
      data,
      error: null,
      count: total,
    }),
  });

  return {
    from: vi.fn().mockReturnValue({
      select: selectMock,
    }),
  };
}
```

### Mock Express Objects

```typescript
import { Request, Response } from "express";

export function mockRequest(query?: Record<string, string>): Partial<Request> {
  return {
    query: query ?? {},
    user: {
      sub: "user-uuid-1",
      email: "admin@example.edu",
      role: "institutional_admin",
      institution_id: "inst-uuid-1",
      is_course_director: false,
      aud: "authenticated",
      exp: Date.now() / 1000 + 3600,
      iat: Date.now() / 1000,
    },
  };
}

export function mockResponse(): Partial<Response> & { statusCode: number; body: unknown } {
  const res: Partial<Response> & { statusCode: number; body: unknown } = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res as Response;
    },
    json(data: unknown) {
      res.body = data;
      return res as Response;
    },
  };
  return res;
}
```

## 10. API Test Spec (vitest -- PRIMARY)

### `apps/server/src/services/course/__tests__/course-oversight.service.test.ts`

```
describe("CourseOversightService")
  describe("getOverview")
    it("returns paginated course overview items for institution")
    it("applies program_id filter when provided")
    it("applies academic_year filter when provided")
    it("applies status filter when provided")
    it("sorts by name ascending by default")
    it("sorts by fulfills_coverage_pct descending when requested")
    it("sorts by updated_at when requested")
    it("calculates correct total_pages for pagination")
    it("returns empty courses array when no courses match filters")
    it("scopes query to the authenticated user's institution_id")
```

### `apps/server/src/controllers/course/__tests__/course-oversight.controller.test.ts`

```
describe("CourseOversightController")
  describe("handleGetOverview")
    it("returns 200 with CourseOverviewResponse for valid request")
    it("returns 200 with empty courses for no results")
    it("parses page and limit from query string")
    it("defaults page to 1 and limit to 20 when not provided")
    it("returns 400 for invalid sort_by value")
    it("returns 400 for invalid status value")
    it("returns 400 for non-numeric page parameter")
    it("clamps limit to max 100")
    it("response body matches ApiResponse<CourseOverviewResponse> shape")
    it("returns 500 when service throws")
```

**Total: ~20 test cases** (exceeds 8-10 minimum).

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

**Not applicable for this story.** The course oversight dashboard depends on courses existing in the database (from STORY-F-1). E2E tests will be added once the full course management flow is testable. For now, API-level tests provide sufficient coverage.

## 12. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | Course overview page exists at `/institution/courses` | Manual: navigate to page |
| AC-2 | Each course card displays: code, name, director, SLO count, coverage %, uploads, processing status | Code review: CourseSummaryCard component |
| AC-3 | Filter by program works (dropdown populated from institution's programs) | Test: program_id filter applied to query |
| AC-4 | Filter by academic year works | Test: academic_year filter applied to query |
| AC-5 | Filter by status (active/archived) works | Test: status filter applied to query |
| AC-6 | Sort by name, coverage %, last updated works in both directions | Test: sort_by and sort_dir applied |
| AC-7 | Pagination works with page and limit controls | Test: correct total_pages calculation |
| AC-8 | Clicking a course card navigates to course detail page | Code review: onClick handler |
| AC-9 | Empty state shown when no courses match filters | Code review: empty state rendering |
| AC-10 | Route is protected — requires `institutional_admin` role | Test: RBAC middleware applied |
| AC-11 | Data scoped to authenticated user's institution_id | Test: institution_id from JWT used in query |
| AC-12 | JS `#private` fields used (not TS `private`) | Code review |
| AC-13 | Constructor DI: Supabase client injected | Code review: constructor signature |
| AC-14 | Custom error classes only (no raw throw new Error()) | Code review |
| AC-15 | 8+ API tests pass | Test suite: ~20 tests in vitest |
| AC-16 | Response body matches `ApiResponse<CourseOverviewResponse>` envelope | Test: assert shape |

## 13. Source References

| Claim | Source | Section |
|-------|--------|---------|
| Five roles: superadmin, institutional_admin, faculty, advisor, student | ARCHITECTURE_v10.md | SS 4.1 |
| API response envelope: `{ data, error, meta? }` | API_CONTRACT_v1.md | Conventions |
| RBAC middleware for role enforcement | STORY-U-6 implementation | RbacService, RbacMiddleware |
| Custom error classes only (no raw Error) | CLAUDE.md | Architecture Rules |
| JS #private fields, constructor DI | CLAUDE.md | Architecture Rules (OOP) |
| Named exports only | CLAUDE.md | Architecture Rules |
| Course entity in data model | ARCHITECTURE_v10.md | SS 5.3 |
| SLO-to-content FULFILLS relationship | ARCHITECTURE_v10.md | SS 5.4 |
| Web path alias `@web/*` | CLAUDE.md | Monorepo Conventions |

## 14. Environment Prerequisites

### Services Required

| Service | Purpose | Required |
|---------|---------|----------|
| Supabase | Course data queries — mocked in tests | For manual testing only |

### Environment Variables

No new environment variables. Uses existing Supabase config:

**Server (`apps/server/.env`):**
- `SUPABASE_URL` — already configured
- `SUPABASE_SERVICE_ROLE_KEY` — already configured

**Web (`apps/web/.env.local`):**
- `NEXT_PUBLIC_SUPABASE_URL` — already configured
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — already configured

### Dev Setup

```bash
# From monorepo root
pnpm install
pnpm --filter @journey-os/types build   # build types first
pnpm --filter @journey-os/server test   # run server tests
```

## 15. Figma Make Prototype (Optional)

**Recommended but not blocking.** The course card grid with metrics is a moderately complex layout. If time allows, create a low-fidelity prototype for the card component showing the coverage bar, status dot, and metric badges. Otherwise, code directly using the design tokens above.
