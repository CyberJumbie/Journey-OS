# STORY-ST-12 Brief: Practice Launcher

## 0. Lane & Priority

```yaml
story_id: STORY-ST-12
old_id: S-ST-41-1
lane: student
lane_priority: 4
within_lane_order: 12
sprint: 32
size: M
depends_on:
  - STORY-ST-10 (student) — Adaptive Item Selection
blocks:
  - STORY-ST-13 — Question View
  - STORY-ST-14 — Answer Feedback
  - STORY-ST-15 — Session Summary
personas_served: [student]
epic: E-41 (Adaptive Practice UI)
feature: F-19 (Adaptive Practice)
user_flow: UF-31 (Student Adaptive Practice)
```

## 1. Summary

Build the **practice launcher page** at `/practice/launch` that allows medical students to configure and start an adaptive practice session. The page provides scope selection (by USMLE system, by course, or all concepts), session configuration (question count, time mode, per-question timer), a mastery summary preview for the selected scope, and a "Start Session" action that creates a server-side session record and navigates to the first question.

Key constraints:
- **Express API** — `POST /api/v1/practice/sessions` to create sessions
- **Scope selection** — multi-select tree mirrors USMLE taxonomy (systems from Neo4j seed)
- **Session config** — question count (10, 25, 50, custom 1-100), timed/untimed, timer (60s/90s/120s)
- **Mastery preview** — fetches BKT mastery summary for selected scope from Python API
- **Server-side state** — session stored in Supabase `practice_sessions` table
- **Validation** — at least one scope selected, count 1-100

## 2. Task Breakdown

1. **Types** — Create `CreateSessionRequest`, `CreateSessionResponse`, `ScopeOption`, `SessionConfig`, `MasteryPreview` types in `packages/types/src/student/practice-session.types.ts`
2. **Error class** — `PracticeSessionError` in `apps/server/src/errors/practice.error.ts`
3. **Service** — `PracticeSessionService` in `apps/server/src/services/student/practice-session.service.ts` — session CRUD, scope validation, calls Python adaptive service for initial item queue
4. **Controller** — `PracticeSessionController` in `apps/server/src/controllers/student/practice-session.controller.ts`
5. **Routes** — `POST /api/v1/practice/sessions` and `GET /api/v1/practice/scope-options` with auth middleware (student role)
6. **Frontend page** — `/practice/launch/page.tsx` (student layout)
7. **Frontend components** — `PracticeLauncher`, `ScopeSelector`, `SessionConfigPanel`, `MasteryPreviewCard`, `EstimatedDuration`
8. **Wire up** — Register routes in `apps/server/src/index.ts`
9. **API tests** — 16 tests covering session creation, validation, scope options, auth

## 3. Data Model

```typescript
// packages/types/src/student/practice-session.types.ts

/** Scope types for practice session */
export type ScopeType = "system" | "course" | "all";

/** Time mode for practice session */
export type TimeMode = "timed" | "untimed";

/** Preset question counts */
export type PresetQuestionCount = 10 | 25 | 50;

/** Timer duration options in seconds */
export type TimerDuration = 60 | 90 | 120;

/** A selectable scope option from the USMLE taxonomy */
export interface ScopeOption {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly type: ScopeType;
  readonly concept_count: number;
  readonly children?: ScopeOption[];  // For tree view (systems → topics)
}

/** Session configuration set by the student */
export interface SessionConfig {
  readonly scope_type: ScopeType;
  readonly scope_ids: string[];                 // Selected system/course IDs
  readonly question_count: number;              // 1-100
  readonly time_mode: TimeMode;
  readonly timer_seconds: TimerDuration | null; // null if untimed
}

/** Mastery preview for selected scope */
export interface MasteryPreview {
  readonly scope_label: string;                 // e.g. "Cardiovascular, Renal"
  readonly total_concepts: number;
  readonly mastered_concepts: number;           // P(L) >= 0.85
  readonly average_mastery: number;             // Average P(L) across scope
  readonly weakest_concept: {
    readonly concept_id: string;
    readonly concept_name: string;
    readonly p_mastery: number;
  } | null;
}

/** Request body for POST /api/v1/practice/sessions */
export interface CreateSessionRequest {
  readonly scope_type: ScopeType;
  readonly scope_ids: string[];
  readonly question_count: number;
  readonly time_mode: TimeMode;
  readonly timer_seconds: TimerDuration | null;
}

/** Response from POST /api/v1/practice/sessions */
export interface CreateSessionResponse {
  readonly session_id: string;
  readonly first_item: {
    readonly item_id: string;
    readonly concept_id: string;
    readonly expected_difficulty: number;
  };
  readonly estimated_duration_minutes: number;
  readonly config: SessionConfig;
}

/** Scope options response from GET /api/v1/practice/scope-options */
export interface ScopeOptionsResponse {
  readonly systems: ScopeOption[];
  readonly courses: ScopeOption[];
}

/** Mastery preview response from POST /api/v1/practice/mastery-preview */
export interface MasteryPreviewRequest {
  readonly scope_type: ScopeType;
  readonly scope_ids: string[];
}
```

## 4. Database Schema

**Uses existing `practice_sessions` table (from ST-5).** No new tables needed.

```sql
-- Existing table (from ST-5: Session History)
-- practice_sessions (
--   id UUID PK,
--   student_id UUID FK -> auth.users(id),
--   scope_concept_ids TEXT[] NOT NULL,
--   question_count INTEGER NOT NULL,
--   time_mode TEXT NOT NULL CHECK ('timed', 'untimed'),
--   timer_seconds INTEGER,
--   status TEXT NOT NULL DEFAULT 'active' CHECK ('active', 'completed', 'abandoned'),
--   started_at TIMESTAMPTZ,
--   completed_at TIMESTAMPTZ,
--   created_at TIMESTAMPTZ
-- )

-- New columns needed for launcher (migration)
-- Migration: add_practice_session_launcher_columns

ALTER TABLE practice_sessions
  ADD COLUMN IF NOT EXISTS scope_type TEXT NOT NULL DEFAULT 'all'
    CHECK (scope_type IN ('system', 'course', 'all')),
  ADD COLUMN IF NOT EXISTS scope_ids TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;

-- Index for student's active sessions (prevent duplicates)
CREATE INDEX IF NOT EXISTS idx_practice_sessions_student_active
  ON practice_sessions(student_id, status)
  WHERE status = 'active';
```

**Neo4j (read-only — scope option tree):**

```cypher
// Fetch USMLE systems with topic counts for scope selector
MATCH (s:USMLE_System)
OPTIONAL MATCH (s)-[:HAS_TOPIC]->(t:USMLE_Topic)
RETURN s.id AS system_id,
       s.name AS system_name,
       s.code AS system_code,
       count(t) AS concept_count
ORDER BY s.name

// Resolve scope_ids to concept_ids (system → topic expansion)
MATCH (s:USMLE_System)-[:HAS_TOPIC]->(t:USMLE_Topic)
WHERE s.id IN $scopeIds
RETURN collect(DISTINCT t.id) AS concept_ids
```

## 5. API Contract

### POST /api/v1/practice/sessions (Auth: Student)

**Request Body:**
```json
{
  "scope_type": "system",
  "scope_ids": ["usmle-sys-cardiovascular", "usmle-sys-renal"],
  "question_count": 25,
  "time_mode": "timed",
  "timer_seconds": 90
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| `scope_type` | Required. One of: `system`, `course`, `all` |
| `scope_ids` | Required if scope_type is `system` or `course`. Min 1 item. |
| `scope_ids` | Ignored if scope_type is `all` |
| `question_count` | Required. Integer 1-100 |
| `time_mode` | Required. One of: `timed`, `untimed` |
| `timer_seconds` | Required if time_mode is `timed`. One of: 60, 90, 120 |
| `timer_seconds` | Must be null/omitted if time_mode is `untimed` |

**Success Response (201):**
```json
{
  "data": {
    "session_id": "session-uuid-new",
    "first_item": {
      "item_id": "item-cardio-042",
      "concept_id": "concept-cardiac-output",
      "expected_difficulty": 0.45
    },
    "estimated_duration_minutes": 38,
    "config": {
      "scope_type": "system",
      "scope_ids": ["usmle-sys-cardiovascular", "usmle-sys-renal"],
      "question_count": 25,
      "time_mode": "timed",
      "timer_seconds": 90
    }
  },
  "error": null
}
```

### GET /api/v1/practice/scope-options (Auth: Student)

**Success Response (200):**
```json
{
  "data": {
    "systems": [
      {
        "id": "usmle-sys-cardiovascular",
        "name": "Cardiovascular",
        "code": "CVS",
        "type": "system",
        "concept_count": 14
      },
      {
        "id": "usmle-sys-respiratory",
        "name": "Respiratory",
        "code": "RESP",
        "type": "system",
        "concept_count": 12
      }
    ],
    "courses": []
  },
  "error": null
}
```

### POST /api/v1/practice/mastery-preview (Auth: Student)

**Request Body:**
```json
{
  "scope_type": "system",
  "scope_ids": ["usmle-sys-cardiovascular"]
}
```

**Success Response (200):**
```json
{
  "data": {
    "scope_label": "Cardiovascular",
    "total_concepts": 14,
    "mastered_concepts": 3,
    "average_mastery": 0.42,
    "weakest_concept": {
      "concept_id": "concept-starling-law",
      "concept_name": "Frank-Starling Law",
      "p_mastery": 0.18
    }
  },
  "error": null
}
```

**Error Responses (all endpoints):**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-student role |
| 400 | `VALIDATION_ERROR` | Invalid request body (e.g., count > 100, no scope selected) |
| 404 | `SCOPE_NOT_FOUND` | Invalid scope_id (system/course does not exist) |
| 409 | `SESSION_ALREADY_ACTIVE` | Student already has an active session |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Page: `/practice/launch` (Student layout)

**Route:** `apps/web/src/app/(protected)/practice/launch/page.tsx`

**Component hierarchy:**
```
PracticeLaunchPage (page.tsx — default export)
  └── PracticeLauncher (client component)
        ├── PageHeader ("Configure Practice Session")
        ├── ScopeSelector
        │     ├── ScopeTypeTabs (system | course | all)
        │     ├── SystemMultiSelect (checkboxes for each USMLE system)
        │     │     └── SystemCheckbox (system name + concept count badge)
        │     └── CourseMultiSelect (future — disabled with "Coming soon" label)
        ├── SessionConfigPanel
        │     ├── QuestionCountSelector
        │     │     ├── PresetButtons (10, 25, 50)
        │     │     └── CustomInput (number input 1-100)
        │     ├── TimeModeToggle (timed / untimed switch)
        │     └── TimerSelector (60s / 90s / 120s — visible only when timed)
        ├── MasteryPreviewCard (fetched on scope change)
        │     ├── MasteryProgressBar (average_mastery as progress ring)
        │     ├── MasteryStats (total / mastered / weakest concept)
        │     └── LoadingSkeleton (while preview loads)
        ├── EstimatedDuration ("~38 minutes" based on count * timer)
        └── StartSessionButton ("Start Session" — disabled until valid config)
```

**States:**
1. **Initial** — Scope type tabs shown, no systems selected, "Start Session" disabled
2. **Configuring** — Systems selected, config options visible, mastery preview loading
3. **Ready** — Valid configuration, mastery preview loaded, "Start Session" enabled
4. **Starting** — "Start Session" clicked, spinner, button disabled
5. **Error** — Validation error toast or API error with retry option
6. **Active session conflict** — Banner: "You have an active session" with "Resume" link

**Design tokens:**
- Surface: White card on Cream `#f5f3ef` background
- Primary CTA: Navy Deep `#002c76` button with white text
- Scope pills: Blue Mid `#2b71b9` when selected, gray outline when unselected
- Mastery ring: Green `#69a338` above 70%, Amber `#e8a838` 40-70%, Red below 40%
- Disabled state: opacity 0.5 with cursor-not-allowed
- Typography: Source Sans 3 for labels, DM Mono for numbers
- Spacing: 24px section gap, 16px card padding
- Timer chips: 3-column grid with radio-button style selection

**Interactions:**
- Select "All" scope → clears system selection, enables start
- Select systems → multi-select with checkboxes, fetches mastery preview on change (debounced 300ms)
- Question count preset click → sets count immediately
- Custom count → number input with min=1, max=100 validation
- Timed toggle → reveals timer selector with animation
- "Start Session" → POST /api/v1/practice/sessions → navigate to `/practice/{session_id}/question/1`

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/student/practice-session.types.ts` | Types | Create |
| 2 | `packages/types/src/student/index.ts` | Types | Edit (add practice-session export) |
| 3 | `packages/types/src/index.ts` | Types | Edit (add student export if not present) |
| 4 | `apps/server/src/errors/practice.error.ts` | Errors | Create |
| 5 | `apps/server/src/errors/index.ts` | Errors | Edit (add practice errors) |
| 6 | Supabase migration via MCP (alter table + index) | Database | Apply |
| 7 | `apps/server/src/services/student/practice-session.service.ts` | Service | Create |
| 8 | `apps/server/src/controllers/student/practice-session.controller.ts` | Controller | Create |
| 9 | `apps/server/src/index.ts` | Routes | Edit (add practice routes) |
| 10 | `apps/web/src/app/(protected)/practice/launch/page.tsx` | Page | Create |
| 11 | `apps/web/src/components/student/practice-launcher.tsx` | Component | Create |
| 12 | `apps/web/src/components/student/scope-selector.tsx` | Component | Create |
| 13 | `apps/web/src/components/student/session-config-panel.tsx` | Component | Create |
| 14 | `apps/web/src/components/student/mastery-preview-card.tsx` | Component | Create |
| 15 | `apps/web/src/components/student/estimated-duration.tsx` | Atom | Create |
| 16 | `apps/web/src/lib/hooks/use-practice-session.ts` | Hook | Create |
| 17 | `apps/web/src/lib/hooks/use-scope-options.ts` | Hook | Create |
| 18 | `apps/web/src/lib/hooks/use-mastery-preview.ts` | Hook | Create |
| 19 | `apps/server/src/services/student/__tests__/practice-session.service.test.ts` | Tests | Create |
| 20 | `apps/server/src/controllers/student/__tests__/practice-session.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-ST-10 | student | Not started | Adaptive Item Selection — provides first item for session |

### Transitive Dependencies (via ST-10)
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-ST-1 | student | Not started | FastAPI scaffold — Python adaptive service |
| STORY-ST-3 | student | Not started | BKT engine — mastery_estimates for preview |
| STORY-ST-4 | student | Not started | IRT engine — item_parameters for item selection |
| STORY-ST-5 | student | Not started | Session History — practice_sessions table |

### NPM Packages (already installed or to add)
- `@supabase/supabase-js` — Supabase client
- `express` — Server framework
- `vitest` — Testing
- `lucide-react` — Icons (Timer, Play, BookOpen)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` — `Neo4jClientConfig` (for scope options query)
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.STUDENT)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `apps/server/src/errors/validation.error.ts` — `ValidationError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`
- `packages/types/src/auth/roles.types.ts` — `AuthRole`

## 9. Test Fixtures

```typescript
// apps/server/src/services/student/__tests__/practice-session.fixtures.ts

import { AuthRole } from "@journey-os/types";

export const STUDENT_USER = {
  sub: "student-uuid-001",
  email: "student@msm.edu",
  role: AuthRole.STUDENT,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

export const FACULTY_USER = {
  ...STUDENT_USER,
  sub: "faculty-uuid-001",
  email: "faculty@msm.edu",
  role: AuthRole.FACULTY,
};

export const VALID_CREATE_SESSION_REQUEST = {
  scope_type: "system" as const,
  scope_ids: ["usmle-sys-cardiovascular", "usmle-sys-renal"],
  question_count: 25,
  time_mode: "timed" as const,
  timer_seconds: 90 as const,
};

export const VALID_CREATE_ALL_SCOPE_REQUEST = {
  scope_type: "all" as const,
  scope_ids: [],
  question_count: 50,
  time_mode: "untimed" as const,
  timer_seconds: null,
};

export const INVALID_NO_SCOPE_REQUEST = {
  scope_type: "system" as const,
  scope_ids: [],
  question_count: 25,
  time_mode: "untimed" as const,
  timer_seconds: null,
};

export const INVALID_COUNT_OVER_100 = {
  scope_type: "all" as const,
  scope_ids: [],
  question_count: 150,
  time_mode: "untimed" as const,
  timer_seconds: null,
};

export const INVALID_TIMED_NO_TIMER = {
  scope_type: "all" as const,
  scope_ids: [],
  question_count: 25,
  time_mode: "timed" as const,
  timer_seconds: null,
};

export const MOCK_SCOPE_OPTIONS = {
  systems: [
    {
      id: "usmle-sys-cardiovascular",
      name: "Cardiovascular",
      code: "CVS",
      type: "system" as const,
      concept_count: 14,
    },
    {
      id: "usmle-sys-respiratory",
      name: "Respiratory",
      code: "RESP",
      type: "system" as const,
      concept_count: 12,
    },
    {
      id: "usmle-sys-renal",
      name: "Renal/Urinary",
      code: "REN",
      type: "system" as const,
      concept_count: 10,
    },
  ],
  courses: [],
};

export const MOCK_MASTERY_PREVIEW = {
  scope_label: "Cardiovascular, Renal/Urinary",
  total_concepts: 24,
  mastered_concepts: 5,
  average_mastery: 0.42,
  weakest_concept: {
    concept_id: "concept-starling-law",
    concept_name: "Frank-Starling Law",
    p_mastery: 0.18,
  },
};

export const MOCK_FIRST_ITEM = {
  item_id: "item-cardio-042",
  concept_id: "concept-cardiac-output",
  expected_difficulty: 0.45,
};

export const MOCK_CREATED_SESSION = {
  id: "session-uuid-new",
  student_id: "student-uuid-001",
  scope_type: "system",
  scope_ids: ["usmle-sys-cardiovascular", "usmle-sys-renal"],
  scope_concept_ids: ["concept-cardiac-output", "concept-starling-law", "concept-renal-perfusion"],
  question_count: 25,
  time_mode: "timed",
  timer_seconds: 90,
  status: "active",
  estimated_duration_minutes: 38,
  started_at: "2026-02-19T10:00:00Z",
  created_at: "2026-02-19T10:00:00Z",
};

export const MOCK_ACTIVE_SESSION = {
  id: "session-uuid-existing",
  student_id: "student-uuid-001",
  status: "active",
  started_at: "2026-02-19T08:00:00Z",
};
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/controllers/student/__tests__/practice-session.controller.test.ts`

```
describe("PracticeSessionController")
  describe("handleCreateSession")
    ✓ creates session and returns 201 with session_id and first_item
    ✓ resolves scope_ids to concept_ids via Neo4j for system scope
    ✓ uses all concepts when scope_type is "all"
    ✓ calculates estimated_duration_minutes (count * timer_seconds / 60)
    ✓ returns estimated_duration_minutes as null for untimed sessions
    ✓ rejects request with no scope_ids when scope_type is "system" (400)
    ✓ rejects question_count > 100 (400 VALIDATION_ERROR)
    ✓ rejects question_count < 1 (400 VALIDATION_ERROR)
    ✓ rejects timed mode without timer_seconds (400 VALIDATION_ERROR)
    ✓ rejects invalid scope_id that does not exist (404 SCOPE_NOT_FOUND)
    ✓ rejects when student has active session (409 SESSION_ALREADY_ACTIVE)
    ✓ rejects unauthenticated request (401)
    ✓ rejects non-student roles (403 FORBIDDEN)

  describe("handleGetScopeOptions")
    ✓ returns 200 with list of USMLE systems and concept counts
    ✓ systems are sorted alphabetically by name
    ✓ rejects unauthenticated request (401)

describe("PracticeSessionService")
  describe("createSession")
    ✓ inserts session record into practice_sessions table
    ✓ calls adaptive service for first item
    ✓ checks for existing active session before creating
  describe("getScopeOptions")
    ✓ queries Neo4j for USMLE systems with topic counts
  describe("getMasteryPreview")
    ✓ returns average mastery and weakest concept for scope
```

**Total: ~21 tests** (13 controller-create + 3 controller-scope + 5 service)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

**Required.** The practice launcher is part of the **adaptive practice critical journey** (UF-31 steps 1-5). This is one of the 5 critical journeys.

**File:** `apps/web/e2e/practice-launcher.spec.ts`

```
describe("Practice Launcher (UF-31 Steps 1-5)")
  test("student can configure and start an adaptive practice session")
    1. Login as demo student (student@msm.edu)
    2. Navigate to /practice/launch
    3. Verify scope selector shows USMLE systems
    4. Select "Cardiovascular" and "Renal" systems
    5. Verify mastery preview loads with stats
    6. Set question count to 25
    7. Toggle to "Timed" mode
    8. Select 90s timer
    9. Verify estimated duration shows "~38 minutes"
    10. Click "Start Session"
    11. Verify redirect to /practice/{session_id}/question/1
    12. Verify first question loads
```

## 12. Acceptance Criteria

1. Practice launcher page accessible at `/practice/launch` for students
2. Scope selection supports: by USMLE system (multi-select), by course (future, disabled), or all concepts
3. Multi-select allows choosing one or more USMLE systems
4. Session config supports question count: 10, 25, 50, or custom (1-100)
5. Time mode toggle: timed (60s, 90s, 120s per question) or untimed
6. Mastery summary preview loads for selected scope showing average mastery and weakest concept
7. Estimated session duration calculated and displayed
8. "Start Session" creates a `practice_sessions` record in Supabase
9. Session state stored server-side (not client-only)
10. After creation, navigates to first question at `/practice/{session_id}/question/1`
11. Validation: at least one scope must be selected, count 1-100
12. 409 returned if student already has an active session
13. Non-student roles receive 403 Forbidden
14. All 21 API tests pass
15. E2E test for UF-31 steps 1-5 passes

## 13. Source References

| Claim | Source |
|-------|--------|
| Practice launcher page | UF-31 SS Student Adaptive Practice, steps 1-5 |
| POST /api/v1/practice/sessions | F-19 SS Adaptive Practice |
| Scope selection by system/course/all | S-ST-41-1 SS Acceptance Criteria |
| Question count 10/25/50/custom | S-ST-41-1 SS Acceptance Criteria |
| Timed mode with per-question timer | S-ST-41-1 SS Acceptance Criteria |
| Mastery summary from BKT service | S-ST-41-1 SS Acceptance Criteria |
| Session record server-side | S-ST-41-1 SS Acceptance Criteria |
| practice_sessions table | SUPABASE_DDL_v1 SS Practice module |
| USMLE taxonomy tree | NODE_REGISTRY_v1 SS Layer 2 |
| Scope tree from Neo4j | ARCHITECTURE_v10 SS 10.3: Neo4j concept graph |
| Timer affects question view | S-ST-41-2 note |
| Design system | DESIGN_SPEC SS Group D: StudentPractice |

## 14. Environment Prerequisites

- **Supabase:** `practice_sessions` table exists with launcher columns (migration applied)
- **Neo4j:** Running with `USMLE_System` and `USMLE_Topic` nodes seeded (from STORY-U-7)
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **Python API:** FastAPI running (from ST-1) — called by Express for first item selection and mastery preview
- **mastery_estimates table:** Must exist with student data (from ST-3/BKT)
- **item_parameters table:** Must exist with item data (from ST-4/IRT)

## 15. Figma / Make Prototype

**Layout sketch:**
```
┌──────────────────────────────────────────────────┐
│  Configure Practice Session                      │
├──────────────────────────────────────────────────┤
│                                                  │
│  Select Scope    [ System | Course | All ]       │
│                                                  │
│  ☐ Cardiovascular (14 concepts)                  │
│  ☑ Renal/Urinary (10 concepts)                   │
│  ☐ Respiratory (12 concepts)                     │
│  ☐ Gastrointestinal (11 concepts)                │
│  ☐ Nervous System (15 concepts)                  │
│  ... (scrollable)                                │
│                                                  │
├──────────────────────────────────────────────────┤
│  Questions    [ 10 ] [ 25 ] [ 50 ] [ Custom: _ ]│
│                                                  │
│  Time Mode    ○ Untimed   ● Timed                │
│  Timer        [ 60s ] [●90s ] [ 120s ]           │
│                                                  │
├──────────────────────────────────────────────────┤
│  ┌─── Mastery Preview ────────────────────────┐  │
│  │  Renal/Urinary               ◐ 42% avg    │  │
│  │  10 concepts  ·  3 mastered                │  │
│  │  Weakest: Acid-Base Balance (18%)          │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Estimated Duration: ~38 minutes                 │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │          ▶  Start Session                  │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```
