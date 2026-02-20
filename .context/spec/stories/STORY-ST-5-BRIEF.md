# STORY-ST-5 Brief: Session History

## 0. Lane & Priority

```yaml
story_id: STORY-ST-5
old_id: S-ST-42-4
lane: student
lane_priority: 4
within_lane_order: 5
sprint: 27
size: M
depends_on:
  - STORY-ST-2 (student) — Student Dashboard Page
blocks:
  - STORY-ST-11 — Study Streak & Gamification
personas_served: [student]
epic: E-42 (Student Dashboard)
feature: F-20 (Student Dashboard & Analytics)
user_flow: UF-30 (Student Dashboard Review)
```

## 1. Summary

Build a **practice session history table** on the student dashboard that displays past study sessions with date, duration, questions answered, score, and concepts covered. Students can sort, paginate, and filter their sessions to track study habits and identify patterns.

Key constraints:
- **Student-scoped** — students see only their own sessions (RLS + service filter)
- **Pagination** — 10 sessions per page, offset-based
- **Sortable** — by date (default: newest first), duration, or score
- **Filterable** — by date range (7d, 30d, all) and USMLE system
- **Expandable rows** — click to reveal concept-level breakdown per session
- **Dual-write** — session data lives in Supabase with sync to Neo4j
- **Mock data** — Sprint 27 uses mock mastery data (BKT/IRT not ready until Sprint 31)

## 2. Task Breakdown

1. **Types** — Create `PracticeSession`, `SessionHistoryQuery`, `SessionHistoryResponse`, `SessionConceptBreakdown` in `packages/types/src/student/session.types.ts`
2. **Migration** — Create `practice_sessions` and `session_concept_scores` tables in Supabase (if not already from ST-2)
3. **Error classes** — `SessionNotFoundError` in `apps/server/src/errors/session.error.ts`
4. **Service** — `SessionHistoryService` in `apps/server/src/services/student/session-history.service.ts`
5. **Controller** — `SessionHistoryController` in `apps/server/src/controllers/student/session-history.controller.ts`
6. **Routes** — Protected route `GET /api/v1/student/sessions` with student auth
7. **Frontend page** — Session history section within student dashboard
8. **Frontend components** — `SessionHistoryTable`, `SessionRow`, `SessionExpandedDetail`, `DateRangeFilter`, `SystemFilter`
9. **Mock data service** — `MockSessionDataService` providing realistic session data for Sprint 27
10. **API tests** — 16 tests covering list, pagination, filtering, sorting, expansion, auth
11. **Wire up** — Register route in `apps/server/src/index.ts`

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/student/session.types.ts

/**
 * Sort fields for session history.
 */
export type SessionSortField = "started_at" | "duration_minutes" | "score";

export type SortDirection = "asc" | "desc";

/**
 * Date range filter presets.
 */
export type DateRangePreset = "7d" | "30d" | "all";

/**
 * Query parameters for GET /api/v1/student/sessions.
 */
export interface SessionHistoryQuery {
  readonly page?: number;                 // Default: 1
  readonly limit?: number;                // Default: 10, max: 50
  readonly sort_by?: SessionSortField;    // Default: "started_at"
  readonly sort_dir?: SortDirection;      // Default: "desc"
  readonly date_range?: DateRangePreset;  // Default: "all"
  readonly usmle_system_id?: string;      // Filter by USMLE system UUID
}

/**
 * Single practice session row in the history table.
 */
export interface PracticeSessionSummary {
  readonly id: string;
  readonly started_at: string;            // ISO timestamp
  readonly completed_at: string | null;   // null if abandoned
  readonly duration_minutes: number;
  readonly questions_answered: number;
  readonly questions_correct: number;
  readonly score: number;                 // percentage 0-100
  readonly concepts_covered: number;      // distinct concepts tested
  readonly primary_system: string | null; // dominant USMLE system name
  readonly status: "completed" | "abandoned" | "in_progress";
}

/**
 * Concept-level breakdown for a single session (expanded row).
 */
export interface SessionConceptBreakdown {
  readonly concept_id: string;
  readonly concept_name: string;
  readonly usmle_system_name: string;
  readonly questions_answered: number;
  readonly questions_correct: number;
  readonly score: number;                 // percentage 0-100
  readonly mastery_delta: number;         // change in mastery estimate (-1.0 to 1.0)
}

/**
 * Response for GET /api/v1/student/sessions.
 */
export interface SessionHistoryResponse {
  readonly sessions: PracticeSessionSummary[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}

/**
 * Response for GET /api/v1/student/sessions/:id/concepts.
 */
export interface SessionConceptResponse {
  readonly session_id: string;
  readonly concepts: SessionConceptBreakdown[];
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_practice_session_tables
-- Practice session history and concept-level scoring

CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_minutes INT NOT NULL DEFAULT 0,
  questions_answered INT NOT NULL DEFAULT 0,
  questions_correct INT NOT NULL DEFAULT 0,
  score FLOAT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  concepts_covered INT NOT NULL DEFAULT 0,
  primary_system_id UUID,              -- FK to USMLE system (nullable)
  primary_system_name TEXT,            -- denormalized for query performance
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('completed', 'abandoned', 'in_progress')),
  config JSONB,                        -- session configuration snapshot
  sync_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'synced', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE session_concept_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL,
  concept_name TEXT NOT NULL,
  usmle_system_name TEXT NOT NULL,
  questions_answered INT NOT NULL DEFAULT 0,
  questions_correct INT NOT NULL DEFAULT 0,
  score FLOAT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  mastery_delta FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for student-scoped queries
CREATE INDEX idx_practice_sessions_student ON practice_sessions(student_id);
CREATE INDEX idx_practice_sessions_student_date ON practice_sessions(student_id, started_at DESC);
CREATE INDEX idx_practice_sessions_status ON practice_sessions(status);
CREATE INDEX idx_practice_sessions_system ON practice_sessions(primary_system_id);
CREATE INDEX idx_session_concepts_session ON session_concept_scores(session_id);

-- RLS policies (student sees only own sessions)
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_concept_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own sessions"
  ON practice_sessions
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Service role full access on practice_sessions"
  ON practice_sessions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Students read own session concepts"
  ON session_concept_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM practice_sessions ps
      WHERE ps.id = session_concept_scores.session_id
      AND ps.student_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on session_concept_scores"
  ON session_concept_scores
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

```cypher
// Neo4j schema for session history (dual-write target)

// Student node (created in prior stories)
// (:Student {id, supabase_id, email})

// PracticeSession node
CREATE CONSTRAINT practice_session_id IF NOT EXISTS
  FOR (ps:PracticeSession) REQUIRE ps.id IS UNIQUE;

// Relationships
// (Student)-[:COMPLETED_SESSION]->(PracticeSession)
// (PracticeSession)-[:COVERED_CONCEPT]->(SubConcept)
// (PracticeSession)-[:IN_SYSTEM]->(USMLE_System)
```

## 5. API Contract (complete request/response)

### GET /api/v1/student/sessions (Auth: student role)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page (max 50) |
| `sort_by` | string | `started_at` | Sort field |
| `sort_dir` | string | `desc` | Sort direction |
| `date_range` | string | `all` | `7d`, `30d`, or `all` |
| `usmle_system_id` | string | -- | Filter by USMLE system UUID |

**Success Response (200):**
```json
{
  "data": {
    "sessions": [
      {
        "id": "session-uuid-1",
        "started_at": "2026-02-19T14:00:00Z",
        "completed_at": "2026-02-19T14:45:00Z",
        "duration_minutes": 45,
        "questions_answered": 30,
        "questions_correct": 22,
        "score": 73.3,
        "concepts_covered": 8,
        "primary_system": "Cardiovascular System",
        "status": "completed"
      },
      {
        "id": "session-uuid-2",
        "started_at": "2026-02-18T10:00:00Z",
        "completed_at": "2026-02-18T10:20:00Z",
        "duration_minutes": 20,
        "questions_answered": 15,
        "questions_correct": 9,
        "score": 60.0,
        "concepts_covered": 5,
        "primary_system": "Respiratory System",
        "status": "completed"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 42,
      "total_pages": 5
    }
  },
  "error": null
}
```

### GET /api/v1/student/sessions/:id/concepts (Auth: student role, own session)

**Success Response (200):**
```json
{
  "data": {
    "session_id": "session-uuid-1",
    "concepts": [
      {
        "concept_id": "concept-uuid-1",
        "concept_name": "Cardiac Output Regulation",
        "usmle_system_name": "Cardiovascular System",
        "questions_answered": 5,
        "questions_correct": 4,
        "score": 80.0,
        "mastery_delta": 0.12
      },
      {
        "concept_id": "concept-uuid-2",
        "concept_name": "Heart Failure Pathophysiology",
        "usmle_system_name": "Cardiovascular System",
        "questions_answered": 4,
        "questions_correct": 2,
        "score": 50.0,
        "mastery_delta": -0.05
      }
    ]
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-student role or accessing another student's session |
| 400 | `VALIDATION_ERROR` | Invalid query params (bad sort field, invalid date range) |
| 404 | `SESSION_NOT_FOUND` | Session ID does not exist or not owned by student |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Component: Session History (within Student Dashboard)

**Route:** Part of `apps/web/src/app/(protected)/dashboard/student/page.tsx`

**Component hierarchy:**
```
StudentDashboardPage (page.tsx -- default export)
  └── SessionHistorySection (organism)
        ├── SectionHeader ("Practice History" + total session count)
        ├── SessionFilters (molecule)
        │     ├── DateRangeToggle (atom: 7d | 30d | All)
        │     └── SystemFilterDropdown (atom: USMLE system select)
        ├── SessionHistoryTable (organism)
        │     ├── SortableTableHeader (molecule: Date, Duration, Questions, Score)
        │     ├── SessionRow (molecule: collapsed summary row)
        │     │     └── SessionExpandedDetail (organism: concept breakdown)
        │     │           ├── ConceptScoreRow (molecule: concept name + bar + delta)
        │     │           └── MasteryDeltaBadge (atom: +0.12 green / -0.05 red)
        │     └── EmptyState (atom: "No sessions yet" illustration)
        ├── Pagination (molecule: page numbers + prev/next)
        └── LoadingSkeleton (molecule: animated table placeholder)
```

**States:**
1. **Loading** -- Skeleton table (6 rows) with animated shimmer
2. **Empty** -- "No practice sessions yet. Start your first session to see your history here." with CTA button
3. **Data** -- Table with rows, sortable headers, expandable rows
4. **Expanded row** -- Concept-level breakdown slides down with animation
5. **Filtering** -- Subtle loading indicator on table while refetching
6. **Error** -- "Could not load sessions" with retry button

**Design tokens:**
- Surface: White card on Cream background (`#f5f3ef` bg, `#ffffff` card)
- Score colors: Green `#69a338` (>= 80%), Yellow `#d4a017` (50-79%), Red `#c4463a` (< 50%)
- Mastery delta: Green text for positive, Red text for negative, Gray for zero
- Row hover: `#faf9f6` (Parchment)
- Expanded row bg: `#faf9f6` (Parchment) nested surface
- Typography: DM Sans for headers, Source Sans 3 for data
- Spacing: 12px cell padding, 16px section gap, 8px between filter pills
- Animation: `transition-all duration-200 ease-in-out` for expand/collapse
- Progress bars inside expanded rows: 8px height, rounded-full

**Props:**
```typescript
// SessionHistorySection
interface SessionHistorySectionProps {
  readonly studentId: string;
}

// SessionHistoryTable
interface SessionHistoryTableProps {
  readonly sessions: PracticeSessionSummary[];
  readonly sortBy: SessionSortField;
  readonly sortDir: SortDirection;
  readonly onSort: (field: SessionSortField) => void;
  readonly onExpandRow: (sessionId: string) => void;
  readonly expandedRowId: string | null;
  readonly isLoading: boolean;
}

// SessionExpandedDetail
interface SessionExpandedDetailProps {
  readonly sessionId: string;
  readonly concepts: SessionConceptBreakdown[];
  readonly isLoading: boolean;
}

// SessionFilters
interface SessionFiltersProps {
  readonly dateRange: DateRangePreset;
  readonly systemId: string | null;
  readonly systems: Array<{ id: string; name: string }>;
  readonly onDateRangeChange: (range: DateRangePreset) => void;
  readonly onSystemChange: (systemId: string | null) => void;
}
```

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/student/session.types.ts` | Types | Create |
| 2 | `packages/types/src/student/index.ts` | Types | Create (or edit if exists from ST-4) |
| 3 | `packages/types/src/index.ts` | Types | Edit (add student export) |
| 4 | Supabase migration via MCP (session tables) | Database | Apply |
| 5 | `apps/server/src/errors/session.error.ts` | Errors | Create |
| 6 | `apps/server/src/errors/index.ts` | Errors | Edit (add session exports) |
| 7 | `apps/server/src/services/student/session-history.service.ts` | Service | Create |
| 8 | `apps/server/src/services/student/mock-session-data.service.ts` | Service | Create |
| 9 | `apps/server/src/controllers/student/session-history.controller.ts` | Controller | Create |
| 10 | `apps/server/src/index.ts` | Routes | Edit (add student session routes) |
| 11 | `apps/web/src/components/student/session-history-section.tsx` | Organism | Create |
| 12 | `apps/web/src/components/student/session-history-table.tsx` | Organism | Create |
| 13 | `apps/web/src/components/student/session-row.tsx` | Molecule | Create |
| 14 | `apps/web/src/components/student/session-expanded-detail.tsx` | Organism | Create |
| 15 | `apps/web/src/components/student/session-filters.tsx` | Molecule | Create |
| 16 | `apps/web/src/components/student/mastery-delta-badge.tsx` | Atom | Create |
| 17 | `apps/web/src/hooks/use-session-history.ts` | Hook | Create |
| 18 | `apps/server/src/services/student/__tests__/session-history.service.test.ts` | Tests | Create |
| 19 | `apps/server/src/controllers/student/__tests__/session-history.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-ST-2 | student | NOT STARTED | Student Dashboard Page — provides the dashboard shell and layout |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `express` -- Server framework
- `vitest` -- Testing
- `recharts` -- Charts (for potential future sparklines)
- `lucide-react` -- Icons (ChevronDown, ChevronUp, Calendar, Filter)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` -- `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` -- `rbac.require(AuthRole.STUDENT)`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>`, `PaginationMeta`

## 9. Test Fixtures (inline)

```typescript
// apps/server/src/services/student/__tests__/fixtures/session.fixtures.ts

export const STUDENT_USER = {
  sub: "student-uuid-1",
  email: "marcus@msm.edu",
  role: "student" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

export const OTHER_STUDENT_USER = {
  ...STUDENT_USER,
  sub: "student-uuid-2",
  email: "other@msm.edu",
};

export const FACULTY_USER = {
  ...STUDENT_USER,
  sub: "faculty-uuid-1",
  email: "faculty@msm.edu",
  role: "faculty" as const,
};

export const MOCK_SESSIONS: Array<{
  id: string;
  student_id: string;
  started_at: string;
  completed_at: string | null;
  duration_minutes: number;
  questions_answered: number;
  questions_correct: number;
  score: number;
  concepts_covered: number;
  primary_system_name: string | null;
  status: string;
}> = [
  {
    id: "session-1",
    student_id: "student-uuid-1",
    started_at: "2026-02-19T14:00:00Z",
    completed_at: "2026-02-19T14:45:00Z",
    duration_minutes: 45,
    questions_answered: 30,
    questions_correct: 22,
    score: 73.3,
    concepts_covered: 8,
    primary_system_name: "Cardiovascular System",
    status: "completed",
  },
  {
    id: "session-2",
    student_id: "student-uuid-1",
    started_at: "2026-02-18T10:00:00Z",
    completed_at: "2026-02-18T10:20:00Z",
    duration_minutes: 20,
    questions_answered: 15,
    questions_correct: 9,
    score: 60.0,
    concepts_covered: 5,
    primary_system_name: "Respiratory System",
    status: "completed",
  },
  {
    id: "session-3",
    student_id: "student-uuid-1",
    started_at: "2026-02-17T09:00:00Z",
    completed_at: null,
    duration_minutes: 10,
    questions_answered: 7,
    questions_correct: 3,
    score: 42.9,
    concepts_covered: 3,
    primary_system_name: "Nervous System",
    status: "abandoned",
  },
];

export const MOCK_CONCEPT_BREAKDOWN = [
  {
    concept_id: "concept-1",
    concept_name: "Cardiac Output Regulation",
    usmle_system_name: "Cardiovascular System",
    questions_answered: 5,
    questions_correct: 4,
    score: 80.0,
    mastery_delta: 0.12,
  },
  {
    concept_id: "concept-2",
    concept_name: "Heart Failure Pathophysiology",
    usmle_system_name: "Cardiovascular System",
    questions_answered: 4,
    questions_correct: 2,
    score: 50.0,
    mastery_delta: -0.05,
  },
  {
    concept_id: "concept-3",
    concept_name: "Valvular Heart Disease",
    usmle_system_name: "Cardiovascular System",
    questions_answered: 3,
    questions_correct: 3,
    score: 100.0,
    mastery_delta: 0.18,
  },
];
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/controllers/student/__tests__/session-history.controller.test.ts`

```
describe("SessionHistoryController")
  describe("handleList")
    - returns paginated session list for authenticated student (200)
    - returns correct pagination meta (page, limit, total, total_pages)
    - returns only sessions belonging to the authenticated student
    - rejects unauthenticated request (401)
    - rejects non-student roles (403 FORBIDDEN)
    - sorts by started_at desc by default
    - sorts by duration_minutes when requested
    - sorts by score when requested
    - filters by date_range "7d" (last 7 days)
    - filters by date_range "30d" (last 30 days)
    - filters by usmle_system_id
    - rejects invalid sort_by field (400 VALIDATION_ERROR)
    - caps limit at 50 when higher value requested
    - returns empty list with meta when no sessions match

  describe("handleGetConcepts")
    - returns concept breakdown for a valid session (200)
    - returns 404 for non-existent session
    - returns 403 when accessing another student's session
    - returns concepts sorted by score ascending (weakest first)
```

**File:** `apps/server/src/services/student/__tests__/session-history.service.test.ts`

```
describe("SessionHistoryService")
  describe("list")
    - builds correct Supabase query with student_id filter
    - applies date range filter correctly for "7d"
    - calculates total_pages correctly
  describe("getSessionConcepts")
    - returns concept breakdown for owned session
    - throws SessionNotFoundError for unknown session_id
```

**Total: ~23 tests** (18 controller + 5 service)

## 11. E2E Test Spec (Playwright)

Not required for this story alone. Session history is part of the broader "Student reviews dashboard" journey but the E2E test will be authored as part of ST-2 (Student Dashboard Page) which composes all dashboard sections.

## 12. Acceptance Criteria

1. Session history table displays date, duration, questions answered, score, and concepts covered
2. Table is sortable by date (newest first default), duration, or score
3. Pagination works with 10 sessions per page
4. Filter by date range: last 7 days, 30 days, all time
5. Filter by USMLE system
6. Clicking a row expands to show concept-level breakdown
7. Empty state displays when no sessions exist
8. Loading skeleton displays while fetching data
9. Session data served from Supabase with dual-write sync_status column
10. API endpoint returns paginated, filtered, sorted session history
11. Students can only see their own sessions (403 for other students' sessions)
12. Mock data service provides realistic session data for Sprint 27
13. All 23 tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Session history table spec | S-ST-42-4 SS Acceptance Criteria |
| Student dashboard layout | DESIGN_SPEC SS Template E — Student Dashboard |
| practice_sessions table | SUPABASE_DDL_v1 SS Student Performance Tables |
| Dual-write pattern | ARCHITECTURE_v10 SS 3.2 — DualWriteService |
| Mock data for Sprint 27 | ROADMAP_v2_3 SS Sprint 27 — "mock mastery data" |
| Marcus Williams persona | PRODUCT_BRIEF SS Marcus Williams — "track study habits" |
| Surface system (Cream/White/Parchment) | DESIGN_SPEC SS Group D — Color Tokens |
| Pagination pattern | API_CONTRACT_v1 SS Conventions — offset pagination |
| USMLE system filter | NODE_REGISTRY_v1 SS Layer 2 — 16 USMLE_System nodes |

## 14. Environment Prerequisites

- **Supabase:** Project running, `practice_sessions` and `session_concept_scores` tables created
- **Express:** Server running on port 3001 with auth middleware active
- **Next.js:** Web app running on port 3000
- **Student dashboard shell** from STORY-ST-2 must exist (the page layout this section slots into)
- **No Neo4j needed** for initial read path (sync_status column supports future dual-write)

## 15. Figma Make Prototype

**Optional.** The session history table follows standard data table patterns. The expandable row with concept breakdown is the only novel interaction -- can be prototyped in Figma Make if the animation timing needs validation, but straightforward enough to code directly from the spec above.
