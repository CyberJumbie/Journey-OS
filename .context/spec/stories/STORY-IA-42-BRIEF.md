# STORY-IA-42 Brief: Gap-to-Workbench Handoff

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-IA-42
old_id: S-IA-29-2
epic: E-29 (Gap-Driven Generation)
feature: F-13 (Coverage Gap Analysis)
sprint: 8
lane: institutional_admin
lane_priority: 2
within_lane_order: 42
size: M
depends_on:
  - STORY-IA-28 (institutional_admin) — Drill-down UI with "Generate for gap" button context
  - STORY-F-43 (faculty) — Workbench exists to navigate to (cross-lane)
blocks: []
personas_served: [institutional_admin, faculty]
```

---

## Section 1: Summary

**What to build:** A "Generate for gap" action that launches the generation workbench pre-configured with the gap scope. When an institutional admin clicks the button in the coverage drill-down UI, a `GenerationSpec` is constructed with pre-filled scope (system, discipline, topic, SubConcepts), the user is navigated to the workbench, and the wizard auto-fills the scope step. After generation, a coverage delta is shown ("Before: 23% -> After: 31% (+8%)"). If the admin initiates generation for another faculty member, that faculty receives a notification.

**Parent epic:** E-29 (Gap-Driven Generation) under F-13 (Coverage Gap Analysis). This is the bridge between gap analysis (IA lane) and content generation (Faculty lane).

**User story:** As an Institutional Admin, I need the "Generate for gap" action to launch the workbench pre-configured with the gap scope so that faculty can immediately start generating questions for under-assessed areas without manual configuration.

**Key constraints:**
- Handoff via URL search params + sessionStorage fallback for large specs
- Workbench wizard auto-fills scope step, defaults difficulty to Medium
- Coverage delta computed by re-querying coverage service after generation
- Faculty notification when admin initiates gap generation on their behalf
- Role check: only institutional_admin and course_director can initiate

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Gap handoff types | `packages/types/src/coverage/gap-handoff.types.ts` | 1h |
| 2 | Types barrel export | `packages/types/src/coverage/index.ts` | 10m |
| 3 | GapHandoffService | `apps/server/src/services/coverage/gap-handoff.service.ts` | 2h |
| 4 | Extend CoverageController | `apps/server/src/controllers/coverage.controller.ts` | 1h |
| 5 | GapGenerateButton component | `apps/web/src/components/coverage/gap-generate-button.tsx` | 1.5h |
| 6 | CoverageDeltaCard component | `apps/web/src/components/coverage/coverage-delta-card.tsx` | 1h |
| 7 | useGapHandoff hook | `apps/web/src/hooks/use-gap-handoff.ts` | 1.5h |
| 8 | Server API tests | `apps/server/src/__tests__/coverage/gap-handoff.test.ts` | 2h |
| 9 | Frontend component tests | `apps/web/src/__tests__/coverage/gap-generate-button.test.tsx` | 1h |

**Total estimate:** ~11h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/coverage/gap-handoff.types.ts

/** Generation spec constructed from coverage gap data */
export interface GenerationSpec {
  readonly mode: "generate";
  readonly prefill: "gap";
  readonly system: string;
  readonly discipline: string;
  readonly topic: string;
  readonly sub_concepts: readonly string[];
  readonly difficulty: DifficultyLevel;
  readonly initiated_by: string;
  readonly target_faculty_id: string | null;
  readonly handoff_id: string;
}

/** Difficulty levels for question generation */
export type DifficultyLevel = "easy" | "medium" | "hard";

/** Gap handoff URL params (subset for URL encoding) */
export interface GapHandoffParams {
  readonly mode: "generate";
  readonly prefill: "gap";
  readonly system: string;
  readonly discipline: string;
  readonly topic: string;
  readonly handoff_id: string;
}

/** Coverage delta after generation */
export interface CoverageDelta {
  readonly system: string;
  readonly discipline: string;
  readonly before_pct: number;
  readonly after_pct: number;
  readonly delta_pct: number;
}

/** Coverage delta request */
export interface CoverageDeltaRequest {
  readonly system: string;
  readonly discipline: string;
  readonly institution_id: string;
}

/** Faculty notification for gap-driven generation */
export interface GapGenerationNotification {
  readonly faculty_id: string;
  readonly initiated_by_name: string;
  readonly system: string;
  readonly discipline: string;
  readonly topic: string;
  readonly workbench_link: string;
}
```

---

## Section 4: Database Schema (inline, complete)

No new tables needed. This story reads from existing coverage data and writes notifications to the existing `notifications` table.

```sql
-- Existing tables used:
-- coverage_results (institution_id, system, discipline, coverage_pct, computed_at)
-- notifications (from STORY-F-2 or STORY-IA-38)
-- user_profiles (for faculty lookup and role check)
```

---

## Section 5: API Contract (complete request/response)

### POST /api/v1/coverage/handoff (Auth: institutional_admin, course_director)

Creates a handoff spec and optionally notifies the target faculty.

**Request:**
```json
{
  "system": "Cardiovascular",
  "discipline": "Pathology",
  "topic": "Myocardial Infarction",
  "sub_concepts": ["Troponin elevation", "ST changes"],
  "target_faculty_id": "faculty-uuid-1"
}
```

**Success Response (201):**
```json
{
  "data": {
    "handoff_id": "handoff-uuid-1",
    "workbench_url": "/workbench?mode=generate&prefill=gap&system=Cardiovascular&discipline=Pathology&topic=Myocardial_Infarction&handoff_id=handoff-uuid-1",
    "notification_sent": true
  },
  "error": null
}
```

### GET /api/v1/coverage/handoff/:handoffId (Auth: institutional_admin, faculty)

Retrieves the stored GenerationSpec for the workbench to consume.

**Success Response (200):**
```json
{
  "data": {
    "mode": "generate",
    "prefill": "gap",
    "system": "Cardiovascular",
    "discipline": "Pathology",
    "topic": "Myocardial Infarction",
    "sub_concepts": ["Troponin elevation", "ST changes"],
    "difficulty": "medium",
    "initiated_by": "admin-uuid-1",
    "target_faculty_id": "faculty-uuid-1",
    "handoff_id": "handoff-uuid-1"
  },
  "error": null
}
```

### POST /api/v1/coverage/delta (Auth: institutional_admin, faculty)

Computes coverage delta after new questions are saved.

**Request:**
```json
{
  "system": "Cardiovascular",
  "discipline": "Pathology",
  "institution_id": "inst-uuid-1"
}
```

**Success Response (200):**
```json
{
  "data": {
    "system": "Cardiovascular",
    "discipline": "Pathology",
    "before_pct": 23,
    "after_pct": 31,
    "delta_pct": 8
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Not institutional_admin or course_director |
| 404 | `HANDOFF_NOT_FOUND` | Handoff ID does not exist |
| 404 | `FACULTY_NOT_FOUND` | Target faculty ID does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Section 6: Frontend Spec

### GapGenerateButton (organism)

**Location:** `apps/web/src/components/coverage/gap-generate-button.tsx`

```
GapGenerateButton
  +-- Button ("Generate for Gap" with Wand2 icon)
  +-- FacultySelectDialog (optional: choose target faculty)
  |     +-- FacultySearch (search by name/email)
  |     +-- FacultyList (selectable)
  +-- onClick: construct GenerationSpec, store in sessionStorage, navigate to workbench URL
```

### CoverageDeltaCard (molecule)

**Location:** `apps/web/src/components/coverage/coverage-delta-card.tsx`

```
CoverageDeltaCard
  +-- Before value (e.g., "23%")
  +-- Arrow indicator
  +-- After value (e.g., "31%")
  +-- Delta badge ("+8%" in green)
  +-- System / Discipline label
```

### useGapHandoff hook

**Location:** `apps/web/src/hooks/use-gap-handoff.ts`

Reads URL search params and/or sessionStorage to reconstruct the GenerationSpec for the workbench wizard auto-fill.

```typescript
export function useGapHandoff(): {
  spec: GenerationSpec | null;
  isGapHandoff: boolean;
  clearHandoff: () => void;
}
```

**Design tokens:**
- Generate button: Navy Deep `#002c76` primary
- Delta positive: Green `#69a338`
- Delta negative: error-red
- Card surface: White on Cream `#f5f3ef`

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/coverage/gap-handoff.types.ts` | Types | Create |
| 2 | `packages/types/src/coverage/index.ts` | Types | Edit (add gap-handoff export) |
| 3 | `apps/server/src/errors/coverage.error.ts` | Errors | Create |
| 4 | `apps/server/src/services/coverage/gap-handoff.service.ts` | Service | Create |
| 5 | `apps/server/src/controllers/coverage.controller.ts` | Controller | Edit (add handoff + delta endpoints) |
| 6 | `apps/server/src/index.ts` | Routes | Edit (add coverage routes) |
| 7 | `apps/web/src/hooks/use-gap-handoff.ts` | Hook | Create |
| 8 | `apps/web/src/components/coverage/gap-generate-button.tsx` | Organism | Create |
| 9 | `apps/web/src/components/coverage/coverage-delta-card.tsx` | Molecule | Create |
| 10 | `apps/server/src/__tests__/coverage/gap-handoff.test.ts` | Tests | Create |
| 11 | `apps/web/src/__tests__/coverage/gap-generate-button.test.tsx` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-28 | institutional_admin | **NOT YET** | Drill-down UI provides the gap context for the button |
| STORY-F-43 | faculty | **NOT YET** | Workbench exists as navigation target (cross-lane) |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `uuid` or `crypto.randomUUID()` -- Handoff ID generation
- `vitest` -- Testing
- `@testing-library/react` -- Component tests

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`
- `apps/server/src/repositories/notification.repository.ts` -- For faculty notification
- Coverage computation service (from STORY-IA-27/28) for delta computation

---

## Section 9: Test Fixtures (inline)

```typescript
// Mock admin user
export const ADMIN_USER = {
  sub: "admin-uuid-1",
  email: "admin@med.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock course director
export const COURSE_DIRECTOR_USER = {
  ...ADMIN_USER,
  sub: "cd-uuid-1",
  email: "director@med.edu",
  role: "faculty" as const,
  is_course_director: true,
};

// Mock regular faculty (should be denied handoff creation)
export const REGULAR_FACULTY = {
  ...ADMIN_USER,
  sub: "faculty-uuid-2",
  email: "faculty2@med.edu",
  role: "faculty" as const,
  is_course_director: false,
};

// Mock handoff request
export const MOCK_HANDOFF_REQUEST = {
  system: "Cardiovascular",
  discipline: "Pathology",
  topic: "Myocardial Infarction",
  sub_concepts: ["Troponin elevation", "ST changes"],
  target_faculty_id: "faculty-uuid-1",
};

// Mock coverage delta
export const MOCK_COVERAGE_DELTA = {
  system: "Cardiovascular",
  discipline: "Pathology",
  before_pct: 23,
  after_pct: 31,
  delta_pct: 8,
};

// Mock generation spec (stored in sessionStorage)
export const MOCK_GENERATION_SPEC = {
  mode: "generate" as const,
  prefill: "gap" as const,
  system: "Cardiovascular",
  discipline: "Pathology",
  topic: "Myocardial Infarction",
  sub_concepts: ["Troponin elevation", "ST changes"],
  difficulty: "medium" as const,
  initiated_by: "admin-uuid-1",
  target_faculty_id: "faculty-uuid-1",
  handoff_id: "handoff-uuid-1",
};
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/coverage/gap-handoff.test.ts`

```
describe("GapHandoffService")
  describe("createHandoff")
    + constructs GenerationSpec with pre-filled scope
    + generates unique handoff_id
    + defaults difficulty to 'medium'
    + stores spec for later retrieval
    + sends notification to target faculty when target_faculty_id provided
    + skips notification when target_faculty_id is null
    + notification includes workbench link with handoff params
    + rejects when target_faculty_id does not exist (404)

  describe("getHandoff")
    + returns stored GenerationSpec by handoff_id
    + returns 404 for non-existent handoff_id

  describe("computeDelta")
    + computes before_pct from most recent coverage result
    + computes after_pct by re-querying coverage service
    + returns correct delta_pct (after - before)
    + handles zero coverage case (0% -> N%)

describe("GapHandoffController")
  describe("POST /api/v1/coverage/handoff")
    + returns 201 with handoff_id and workbench_url
    + rejects non-institutional_admin and non-course_director (403)
    + rejects unauthenticated (401)

  describe("GET /api/v1/coverage/handoff/:handoffId")
    + returns 200 with GenerationSpec
    + returns 404 for non-existent handoff

  describe("POST /api/v1/coverage/delta")
    + returns 200 with before/after/delta percentages
```

**Total: ~17 tests**

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. E2E coverage will be part of the full gap-driven generation journey: identify gap -> click generate -> workbench auto-fills -> generate -> see delta.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | "Generate for gap" button constructs GenerationSpec with pre-filled scope | API test |
| 2 | Navigation to workbench with spec via URL params + sessionStorage | Manual |
| 3 | Workbench wizard auto-fills scope step from spec | Manual |
| 4 | Difficulty defaults to Medium | API test |
| 5 | Coverage delta shown after generation (Before -> After + delta) | API test |
| 6 | Faculty notification sent when admin initiates for another faculty | API test |
| 7 | Only institutional_admin and course_director can create handoffs | API test |
| 8 | Handoff spec retrievable by handoff_id | API test |
| 9 | All ~17 API tests pass | CI |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| "Generate for gap" button constructing GenerationSpec | S-IA-29-2 SS Acceptance Criteria |
| URL params + sessionStorage handoff | S-IA-29-2 SS Notes |
| Workbench wizard auto-fill | S-IA-29-2 SS Acceptance Criteria |
| Coverage delta computation | S-IA-29-2 SS Acceptance Criteria |
| Faculty notification on admin-initiated generation | S-IA-29-2 SS Acceptance Criteria |
| Role check: institutional_admin and course_director only | S-IA-29-2 SS Notes |
| Handoff URL format | S-IA-29-2 SS Notes |

---

## Section 14: Environment Prerequisites

- **Supabase:** Project running, coverage_results table exists (from STORY-IA-28), notifications table exists (from STORY-F-2/IA-38)
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **Workbench app** (from STORY-F-43) must be deployed for full handoff integration
- **No Neo4j needed** for this story

---

## Section 15: Figma Make Prototype

Code directly. The GapGenerateButton is a standard action button with optional faculty selection dialog. The CoverageDeltaCard is a simple before/after display. Both follow existing component patterns in the codebase.
