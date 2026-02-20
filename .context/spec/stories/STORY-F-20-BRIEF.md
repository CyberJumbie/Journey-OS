# STORY-F-20 Brief: Course Creation Wizard

> **This brief is fully self-contained.** Implement with ZERO external lookups.

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-20
old_id: S-F-08-3
epic: E-08 (Course CRUD & Hierarchy)
feature: F-04 (Course Management)
sprint: 4
lane: faculty
lane_priority: 3
within_lane_order: 20
size: L
depends_on:
  - STORY-F-11 (faculty) — Course Hierarchy (Section/Session models, hierarchy CRUD)
blocks: []
cross_epic:
  - STORY-U-6 (universal) — RBAC Middleware (endpoint protection) ✅ DONE
personas_served: [faculty, faculty_course_director, institutional_admin]
```

---

## Section 1: Summary

Build a **multi-step course creation wizard** that guides faculty through creating a new course with all its configuration: basic info, settings, section/session structure, Course Director assignment, and a review/confirm step. The wizard persists draft state to `localStorage` so users can resume interrupted flows.

The backend adds a `CourseController` with a `POST /api/v1/courses` endpoint that accepts the full course creation payload and orchestrates creation of the course record, its sections, sessions, and Course Director assignment. Validation middleware enforces course code uniqueness, required fields, and referential integrity.

This is a **large story** spanning both backend (controller, validation, routes) and frontend (5-step wizard organism with step molecules, step indicator atom, and form components).

Key constraints:
- 5-step wizard: Basic Info -> Configuration -> Sections & Sessions -> CD Assignment -> Review & Confirm
- Course code uniqueness checked asynchronously against the API
- Section/session builder with add/remove/reorder (drag-and-drop optional, arrow buttons required)
- Course Director search-and-select from institution users
- Draft persistence in `localStorage` keyed by `course-wizard-draft-{userId}`
- Atomic Design: Wizard is an Organism, Steps are Molecules, StepIndicator is an Atom
- Custom error classes: `CourseValidationError`, `DuplicateCourseCodeError`
- 12-15 API tests + 1 E2E test

---

## Section 2: Task Breakdown

Implementation order: Types -> Errors -> Validation -> Controller -> Routes -> Frontend Components -> Page -> Tests -> E2E.

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define `CourseCreateInput`, `WizardStep` types | `packages/types/src/course/course-create.types.ts` | 30m |
| 2 | Update barrel export | `packages/types/src/course/index.ts` | 5m |
| 3 | Create course error classes | `apps/server/src/errors/course.error.ts` | 15m |
| 4 | Export new errors | `apps/server/src/errors/index.ts` | 5m |
| 5 | Implement course validation middleware | `apps/server/src/middleware/course.validation.ts` | 45m |
| 6 | Implement `CourseController` | `apps/server/src/controllers/course.controller.ts` | 90m |
| 7 | Create course routes | `apps/server/src/routes/course.routes.ts` | 20m |
| 8 | Register routes in Express app | `apps/server/src/index.ts` | 10m |
| 9 | Build `StepIndicator` atom | `packages/ui/src/components/atoms/StepIndicator.tsx` | 30m |
| 10 | Build `CourseWizardStep1` (Basic Info) | `apps/web/src/components/molecules/CourseWizardStep1.tsx` | 45m |
| 11 | Build `CourseWizardStep2` (Configuration) | `apps/web/src/components/molecules/CourseWizardStep2.tsx` | 45m |
| 12 | Build `CourseWizardStep3` (Sections & Sessions) | `apps/web/src/components/molecules/CourseWizardStep3.tsx` | 90m |
| 13 | Build `CourseWizardStep4` (CD Assignment) | `apps/web/src/components/molecules/CourseWizardStep4.tsx` | 45m |
| 14 | Build `CourseWizardStep5` (Review & Confirm) | `apps/web/src/components/molecules/CourseWizardStep5.tsx` | 30m |
| 15 | Build `CourseWizard` organism | `apps/web/src/components/organisms/CourseWizard/CourseWizard.tsx` | 60m |
| 16 | Build API client functions | `apps/web/src/lib/api/courses.ts` | 30m |
| 17 | Create course creation page | `apps/web/src/app/(dashboard)/faculty/courses/new/page.tsx` | 20m |
| 18 | Write controller tests (14 tests) | `apps/server/src/tests/course.controller.test.ts` | 90m |
| 19 | Write E2E test | `apps/web/e2e/course-creation.spec.ts` | 60m |

**Total estimate:** ~13 hours (Size L)

---

## Section 3: Data Model (inline, complete)

### `packages/types/src/course/course-create.types.ts`

```typescript
/**
 * Course creation input from the wizard.
 * Contains all data needed to create a course with its hierarchy.
 */

/** Academic term options */
export type AcademicTerm = "fall" | "spring" | "summer" | "year_long";

/** Course status */
export type CourseStatus = "draft" | "active" | "archived";

/** Step 1: Basic info */
export interface CourseBasicInfo {
  readonly name: string;
  readonly code: string;
  readonly description: string;
  readonly academic_year: number;
  readonly term: AcademicTerm;
  readonly institution_id: string;
  readonly program_id: string | null;
}

/** Step 2: Configuration */
export interface CourseConfiguration {
  readonly credit_hours: number;
  readonly max_enrollment: number;
  readonly is_required: boolean;
  readonly prerequisites: readonly string[];
  readonly learning_objectives: readonly string[];
  readonly tags: readonly string[];
}

/** Section input for step 3 */
export interface SectionInput {
  readonly name: string;
  readonly position: number;
  readonly sessions: readonly SessionInput[];
}

/** Session input for step 3 */
export interface SessionInput {
  readonly name: string;
  readonly week_number: number;
  readonly day_of_week: number;
  readonly start_time: string;
  readonly end_time: string;
  readonly session_type: "lecture" | "lab" | "clinical" | "discussion" | "exam";
}

/** Step 3: Structure */
export interface CourseStructure {
  readonly sections: readonly SectionInput[];
}

/** Step 4: Course Director */
export interface CourseDirectorAssignment {
  readonly course_director_id: string | null;
}

/** Complete course creation input (all steps combined) */
export interface CourseCreateInput {
  readonly basic_info: CourseBasicInfo;
  readonly configuration: CourseConfiguration;
  readonly structure: CourseStructure;
  readonly director: CourseDirectorAssignment;
}

/** Course creation response */
export interface CourseCreateResponse {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly status: CourseStatus;
  readonly section_count: number;
  readonly session_count: number;
  readonly course_director_id: string | null;
  readonly created_at: string;
}

/** Course code uniqueness check response */
export interface CourseCodeCheckResponse {
  readonly available: boolean;
  readonly code: string;
}

/** Wizard step definition for the frontend */
export interface WizardStepDefinition {
  readonly id: number;
  readonly label: string;
  readonly description: string;
}

/** All wizard steps */
export const COURSE_WIZARD_STEPS: readonly WizardStepDefinition[] = [
  { id: 1, label: "Basic Info", description: "Course name, code, and term" },
  { id: 2, label: "Configuration", description: "Credits, enrollment, and learning objectives" },
  { id: 3, label: "Structure", description: "Sections and sessions" },
  { id: 4, label: "Course Director", description: "Assign a Course Director" },
  { id: 5, label: "Review", description: "Review and create course" },
] as const;

/** Draft state stored in localStorage */
export interface CourseWizardDraft {
  readonly currentStep: number;
  readonly basic_info: Partial<CourseBasicInfo>;
  readonly configuration: Partial<CourseConfiguration>;
  readonly structure: Partial<CourseStructure>;
  readonly director: Partial<CourseDirectorAssignment>;
  readonly savedAt: string;
}

/** Day of week labels */
export const DAY_OF_WEEK_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** Session type labels */
export const SESSION_TYPE_LABELS: Record<SessionInput["session_type"], string> = {
  lecture: "Lecture",
  lab: "Laboratory",
  clinical: "Clinical",
  discussion: "Discussion",
  exam: "Exam",
};
```

---

## Section 4: Database Schema

**No new tables for this story.** The wizard creates records in existing tables from STORY-F-1 (Course Model) and STORY-F-11 (Course Hierarchy):

- `courses` -- Main course record (from F-1)
- `sections` -- Course sections with position ordering (from F-11)
- `sessions` -- Section sessions with scheduling (from F-11)
- `profiles` -- For Course Director lookup (existing)

The controller orchestrates inserts into these tables within a Supabase RPC transaction (or sequential inserts with rollback on failure).

**Course code uniqueness** is enforced by a unique index on `courses(code, institution_id)` (from F-1 migration).

---

## Section 5: API Contract

Base URL: `/api/v1`
Auth: Bearer JWT (Supabase Auth) in `Authorization` header
All responses: `{ data, error, meta }` envelope

### 5.1 POST /api/v1/courses

**Auth:** faculty+ (AuthRole.FACULTY)
**Description:** Create a new course with sections, sessions, and CD assignment.

**Request:**
```json
{
  "basic_info": {
    "name": "Cardiovascular Pathophysiology",
    "code": "CVPATH-301",
    "description": "Advanced study of cardiovascular disease mechanisms",
    "academic_year": 2026,
    "term": "fall",
    "institution_id": "inst-uuid-001",
    "program_id": "prog-uuid-001"
  },
  "configuration": {
    "credit_hours": 4,
    "max_enrollment": 120,
    "is_required": true,
    "prerequisites": ["PHYSIO-201"],
    "learning_objectives": [
      "Explain pathophysiology of common cardiovascular diseases",
      "Interpret ECG findings for major cardiac conditions"
    ],
    "tags": ["cardiovascular", "pathology", "step2"]
  },
  "structure": {
    "sections": [
      {
        "name": "Cardiac Anatomy & Physiology Review",
        "position": 1,
        "sessions": [
          {
            "name": "Heart Structure and Function",
            "week_number": 1,
            "day_of_week": 1,
            "start_time": "09:00",
            "end_time": "10:30",
            "session_type": "lecture"
          },
          {
            "name": "Cardiac Cycle Lab",
            "week_number": 1,
            "day_of_week": 3,
            "start_time": "14:00",
            "end_time": "16:00",
            "session_type": "lab"
          }
        ]
      },
      {
        "name": "Ischemic Heart Disease",
        "position": 2,
        "sessions": [
          {
            "name": "Coronary Artery Disease",
            "week_number": 2,
            "day_of_week": 1,
            "start_time": "09:00",
            "end_time": "10:30",
            "session_type": "lecture"
          }
        ]
      }
    ]
  },
  "director": {
    "course_director_id": "user-uuid-director"
  }
}
```

**Response (201):**
```json
{
  "data": {
    "id": "course-uuid-001",
    "name": "Cardiovascular Pathophysiology",
    "code": "CVPATH-301",
    "status": "draft",
    "section_count": 2,
    "session_count": 3,
    "course_director_id": "user-uuid-director",
    "created_at": "2026-02-19T12:00:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Missing required fields, invalid term/session_type |
| 409 | `DUPLICATE_COURSE_CODE` | Course code already exists at this institution |
| 401 | `AUTHENTICATION_ERROR` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role below faculty |
| 404 | `DIRECTOR_NOT_FOUND` | Course Director user ID not found |
| 500 | `INTERNAL_ERROR` | Database error |

### 5.2 GET /api/v1/courses/check-code

**Auth:** faculty+
**Description:** Check if a course code is available.

**Query params:** `?code=CVPATH-301&institution_id=inst-uuid-001`

**Response (200):**
```json
{
  "data": {
    "available": true,
    "code": "CVPATH-301"
  },
  "error": null
}
```

### 5.3 GET /api/v1/institutions/:institutionId/users

**Auth:** faculty+
**Description:** Search users at institution (for Course Director selection). Already exists from previous stories; listed here for reference.

**Query params:** `?search=carter&role=faculty&page=1&limit=10`

**Response (200):**
```json
{
  "data": [
    {
      "id": "user-uuid-director",
      "email": "dr.carter@msm.edu",
      "display_name": "Dr. Sarah Carter",
      "role": "faculty"
    }
  ],
  "error": null,
  "meta": { "page": 1, "limit": 10, "total": 1, "total_pages": 1 }
}
```

---

## Section 6: Frontend Spec

### Page: `/faculty/courses/new`

**Route:** `apps/web/src/app/(dashboard)/faculty/courses/new/page.tsx`

**Component hierarchy (Atomic Design):**
```
CourseCreationPage (page.tsx -- default export)
  └── CourseWizard (Organism)
        ├── StepIndicator (Atom -- packages/ui)
        │     ├── StepCircle[] (5 circles: active, complete, upcoming)
        │     └── StepLabel[] (step name below each circle)
        │
        ├── Step 1: CourseWizardStep1 (Molecule -- Basic Info)
        │     ├── NameInput (shadcn/ui Input, required)
        │     ├── CodeInput (shadcn/ui Input, required, async uniqueness check)
        │     │     └── AvailabilityBadge (green check / red X)
        │     ├── DescriptionTextarea (shadcn/ui Textarea)
        │     ├── AcademicYearSelect (shadcn/ui Select)
        │     ├── TermSelect (shadcn/ui Select -- Fall, Spring, Summer, Year-Long)
        │     └── ProgramSelect (shadcn/ui Select -- programs for institution)
        │
        ├── Step 2: CourseWizardStep2 (Molecule -- Configuration)
        │     ├── CreditHoursInput (shadcn/ui Input, type=number)
        │     ├── MaxEnrollmentInput (shadcn/ui Input, type=number)
        │     ├── IsRequiredCheckbox (shadcn/ui Checkbox)
        │     ├── PrerequisitesInput (tag input -- comma-separated)
        │     ├── LearningObjectivesBuilder (add/remove text inputs)
        │     └── TagsInput (tag input -- comma-separated)
        │
        ├── Step 3: CourseWizardStep3 (Molecule -- Sections & Sessions)
        │     ├── SectionList
        │     │     └── SectionCard[] (collapsible)
        │     │           ├── SectionNameInput
        │     │           ├── ReorderButtons (up/down arrows)
        │     │           ├── RemoveButton (trash icon)
        │     │           └── SessionList
        │     │                 └── SessionRow[]
        │     │                       ├── SessionNameInput
        │     │                       ├── WeekNumberInput
        │     │                       ├── DayOfWeekSelect
        │     │                       ├── TimeRangePicker (start/end)
        │     │                       ├── SessionTypeSelect
        │     │                       └── RemoveSessionButton
        │     ├── AddSectionButton
        │     └── AddSessionButton (within each section)
        │
        ├── Step 4: CourseWizardStep4 (Molecule -- CD Assignment)
        │     ├── UserSearchInput (shadcn/ui Input, debounced 300ms)
        │     ├── SearchResultsList
        │     │     └── UserRow[] (name, email, role)
        │     ├── SelectedDirectorCard (shows selected user)
        │     └── ClearSelectionButton
        │
        ├── Step 5: CourseWizardStep5 (Molecule -- Review & Confirm)
        │     ├── BasicInfoSummary (read-only display of step 1 data)
        │     ├── ConfigSummary (read-only display of step 2 data)
        │     ├── StructureSummary (section/session tree view)
        │     ├── DirectorSummary (selected CD name and email)
        │     ├── EditStepLinks (click to jump back to a specific step)
        │     └── CreateButton (primary, submits the full payload)
        │
        └── WizardNavigation
              ├── BackButton (disabled on step 1)
              ├── NextButton (disabled until step validation passes)
              ├── SaveDraftButton (saves to localStorage)
              └── CancelButton (clears draft, navigates away)
```

### Wizard State Management

```typescript
interface CourseWizardState {
  currentStep: number;
  basicInfo: Partial<CourseBasicInfo>;
  configuration: Partial<CourseConfiguration>;
  structure: CourseStructure;
  director: CourseDirectorAssignment;
  codeAvailable: boolean | null;
  codeCheckLoading: boolean;
  submitting: boolean;
  error: string | null;
}
```

### Draft Persistence

```typescript
const DRAFT_KEY = `course-wizard-draft-${userId}`;

// Save draft on every step change and on SaveDraft click
function saveDraft(state: CourseWizardState): void {
  const draft: CourseWizardDraft = {
    currentStep: state.currentStep,
    basic_info: state.basicInfo,
    configuration: state.configuration,
    structure: state.structure,
    director: state.director,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

// On mount: check for existing draft, offer to resume
function loadDraft(): CourseWizardDraft | null {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

// On successful creation: clear draft
function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}
```

### Step Validation Rules

| Step | Validation | Blocks Next |
|------|-----------|-------------|
| 1 | name required (min 3), code required (min 3, alphanumeric + hyphens), code uniqueness check passed, term required | Yes |
| 2 | credit_hours > 0, max_enrollment > 0, at least 1 learning objective | Yes |
| 3 | at least 1 section, each section has a name, each session has name + week + day + times | Yes |
| 4 | CD selection optional (can skip) | No |
| 5 | Review only (no additional validation) | N/A |

### Course Code Uniqueness Check

- Debounce: 500ms after user stops typing
- Call `GET /api/v1/courses/check-code?code=...&institution_id=...`
- Show green check icon + "Available" if `available: true`
- Show red X icon + "Already in use" if `available: false`
- Show spinner while checking
- Block Next button if code check has not passed

### StepIndicator Atom (packages/ui)

```typescript
interface StepIndicatorProps {
  readonly steps: readonly { id: number; label: string }[];
  readonly currentStep: number;
  readonly completedSteps: readonly number[];
}
```

**Visual states per step circle:**
- **Upcoming:** Gray border, gray number, gray label
- **Active:** Navy Deep filled, white number, bold label
- **Completed:** Green filled, white checkmark, green label
- **Connector lines** between circles: gray for upcoming, green for completed

### Design Tokens

- Surface: White sheet for wizard container
- Step indicator active: Navy Deep `var(--color-navy-deep)`
- Step indicator complete: Green `var(--color-green)`
- Section cards: Parchment background, `--radius-md` corners
- Session rows: White background within section cards
- Add buttons: Ghost variant, Navy Deep text
- Remove buttons: Ghost variant, `--color-red-500` icon
- Primary action (Create Course): Navy Deep background
- Typography: Lora for page heading, Source Sans 3 for form labels
- Spacing: `--space-6` between steps, `--space-4` within steps

### Responsive

- Desktop: Horizontal step indicator, 2-column form layouts
- Tablet: Horizontal step indicator, 1-column forms
- Mobile (< 640px): Vertical step indicator (stacked), 1-column forms

---

## Section 7: Files to Create

```
# 1. Types (packages/types)
packages/types/src/course/course-create.types.ts

# 2. Types barrel update
packages/types/src/course/index.ts               -- UPDATE

# 3. Error classes (apps/server)
apps/server/src/errors/course.error.ts

# 4. Error barrel update
apps/server/src/errors/index.ts                  -- UPDATE

# 5. Validation middleware (apps/server)
apps/server/src/middleware/course.validation.ts

# 6. Controller (apps/server)
apps/server/src/controllers/course.controller.ts

# 7. Routes (apps/server)
apps/server/src/routes/course.routes.ts

# 8. Server registration
apps/server/src/index.ts                         -- UPDATE

# 9. StepIndicator atom (packages/ui)
packages/ui/src/components/atoms/StepIndicator.tsx

# 10. Wizard step molecules (apps/web)
apps/web/src/components/molecules/CourseWizardStep1.tsx
apps/web/src/components/molecules/CourseWizardStep2.tsx
apps/web/src/components/molecules/CourseWizardStep3.tsx
apps/web/src/components/molecules/CourseWizardStep4.tsx
apps/web/src/components/molecules/CourseWizardStep5.tsx

# 11. Wizard organism (apps/web)
apps/web/src/components/organisms/CourseWizard/CourseWizard.tsx

# 12. API client (apps/web)
apps/web/src/lib/api/courses.ts

# 13. Page (apps/web)
apps/web/src/app/(dashboard)/faculty/courses/new/page.tsx

# 14. Tests (apps/server)
apps/server/src/tests/course.controller.test.ts

# 15. E2E test (apps/web)
apps/web/e2e/course-creation.spec.ts
```

**Files to modify (wire-up):**
```
apps/server/src/index.ts                        -- Register course routes
apps/server/src/errors/index.ts                 -- Export course errors
packages/types/src/course/index.ts              -- Export course-create types
packages/types/src/index.ts                     -- Re-export course types (if not already)
```

**Total files:** 16 new + 4 modified

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-11 | faculty | Required | Course Hierarchy: Section/Session models, `sections` and `sessions` tables, hierarchy CRUD services |
| STORY-U-6 | universal | **DONE** | RBAC Middleware for endpoint protection |

### NPM Packages (already installed)
- `express` -- Server framework
- `zod` -- Validation schemas
- `@supabase/supabase-js` -- Supabase client
- `vitest` -- Testing
- `@playwright/test` -- E2E testing
- `lucide-react` -- Icons (Plus, Trash, ChevronUp, ChevronDown, Check, X, Loader2)

### shadcn/ui Components Used
- `Input` -- Text and number inputs
- `Textarea` -- Description field
- `Select` -- Dropdowns for term, day, session type
- `Checkbox` -- Is required toggle
- `Button` -- Navigation and actions
- `Card` -- Section cards in step 3
- `Badge` -- Code availability indicator
- `Skeleton` -- Loading states

### Existing Files Needed
- `apps/server/src/services/course/course.service.ts` -- CourseService (from F-1)
- `apps/server/src/services/course/hierarchy.service.ts` -- HierarchyService (from F-11)
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/course/course.types.ts` -- Course types (from F-1)
- `packages/types/src/auth/roles.types.ts` -- `AuthRole` enum
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>` envelope

---

## Section 9: Test Fixtures (inline)

```typescript
import type {
  CourseCreateInput,
  CourseBasicInfo,
  CourseConfiguration,
  SectionInput,
  SessionInput,
} from "@journey-os/types";

/** Mock IDs */
export const MOCK_INSTITUTION_ID = "inst-uuid-001";
export const MOCK_PROGRAM_ID = "prog-uuid-001";
export const MOCK_USER_ID = "user-uuid-001";
export const MOCK_DIRECTOR_ID = "user-uuid-director";

/** Valid basic info */
export const VALID_BASIC_INFO: CourseBasicInfo = {
  name: "Cardiovascular Pathophysiology",
  code: "CVPATH-301",
  description: "Advanced study of cardiovascular disease mechanisms",
  academic_year: 2026,
  term: "fall",
  institution_id: MOCK_INSTITUTION_ID,
  program_id: MOCK_PROGRAM_ID,
};

/** Valid configuration */
export const VALID_CONFIGURATION: CourseConfiguration = {
  credit_hours: 4,
  max_enrollment: 120,
  is_required: true,
  prerequisites: ["PHYSIO-201"],
  learning_objectives: [
    "Explain pathophysiology of common cardiovascular diseases",
    "Interpret ECG findings for major cardiac conditions",
  ],
  tags: ["cardiovascular", "pathology"],
};

/** Valid session */
export const VALID_SESSION: SessionInput = {
  name: "Heart Structure and Function",
  week_number: 1,
  day_of_week: 1,
  start_time: "09:00",
  end_time: "10:30",
  session_type: "lecture",
};

/** Valid section with sessions */
export const VALID_SECTION: SectionInput = {
  name: "Cardiac Anatomy & Physiology Review",
  position: 1,
  sessions: [
    VALID_SESSION,
    {
      name: "Cardiac Cycle Lab",
      week_number: 1,
      day_of_week: 3,
      start_time: "14:00",
      end_time: "16:00",
      session_type: "lab",
    },
  ],
};

/** Full valid course creation input */
export const VALID_COURSE_INPUT: CourseCreateInput = {
  basic_info: VALID_BASIC_INFO,
  configuration: VALID_CONFIGURATION,
  structure: { sections: [VALID_SECTION] },
  director: { course_director_id: MOCK_DIRECTOR_ID },
};

/** Course input with duplicate code */
export const DUPLICATE_CODE_INPUT: CourseCreateInput = {
  ...VALID_COURSE_INPUT,
  basic_info: { ...VALID_BASIC_INFO, code: "EXISTING-101" },
};

/** Course input missing required fields */
export const INVALID_MISSING_NAME: CourseCreateInput = {
  ...VALID_COURSE_INPUT,
  basic_info: { ...VALID_BASIC_INFO, name: "" },
};

/** Course input with no sections */
export const INVALID_NO_SECTIONS: CourseCreateInput = {
  ...VALID_COURSE_INPUT,
  structure: { sections: [] },
};

/** Course input with invalid session time */
export const INVALID_SESSION_TIME: CourseCreateInput = {
  ...VALID_COURSE_INPUT,
  structure: {
    sections: [{
      ...VALID_SECTION,
      sessions: [{ ...VALID_SESSION, start_time: "14:00", end_time: "09:00" }],
    }],
  },
};

/** Course input with no director (valid -- optional) */
export const NO_DIRECTOR_INPUT: CourseCreateInput = {
  ...VALID_COURSE_INPUT,
  director: { course_director_id: null },
};

/** Mock faculty user */
export const MOCK_FACULTY_USER = {
  id: MOCK_USER_ID,
  email: "dr.faculty@msm.edu",
  role: "faculty" as const,
  institution_id: MOCK_INSTITUTION_ID,
  display_name: "Dr. Faculty Member",
};

/** Mock course director */
export const MOCK_DIRECTOR_USER = {
  id: MOCK_DIRECTOR_ID,
  email: "dr.carter@msm.edu",
  display_name: "Dr. Sarah Carter",
  role: "faculty" as const,
};
```

---

## Section 10: API Test Spec (vitest)

**File:** `apps/server/src/tests/course.controller.test.ts`
**Total tests:** 14

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

// vi.hoisted() for mocks referenced by vi.mock() closures
const { mockSupabase, mockCourseService, mockHierarchyService } = vi.hoisted(() => ({
  mockSupabase: { from: vi.fn() },
  mockCourseService: { create: vi.fn(), checkCodeAvailability: vi.fn() },
  mockHierarchyService: { createSections: vi.fn(), createSessions: vi.fn() },
}));

describe("CourseController", () => {
  describe("POST /api/v1/courses", () => {
    it("creates a course with sections, sessions, and CD assignment (201)", async () => {
      // Submit VALID_COURSE_INPUT
      // Assert: 201 status
      // Assert: response.data.id is a UUID
      // Assert: response.data.section_count = 1
      // Assert: response.data.session_count = 2
      // Assert: response.data.course_director_id = MOCK_DIRECTOR_ID
    });

    it("creates a course without a Course Director (201)", async () => {
      // Submit NO_DIRECTOR_INPUT
      // Assert: 201 status
      // Assert: response.data.course_director_id = null
    });

    it("rejects missing course name (400 VALIDATION_ERROR)", async () => {
      // Submit INVALID_MISSING_NAME
      // Assert: 400 status
      // Assert: error.code = "VALIDATION_ERROR"
    });

    it("rejects duplicate course code (409 DUPLICATE_COURSE_CODE)", async () => {
      // Submit DUPLICATE_CODE_INPUT
      // Assert: 409 status
      // Assert: error.code = "DUPLICATE_COURSE_CODE"
    });

    it("rejects course with no sections (400 VALIDATION_ERROR)", async () => {
      // Assert: 400 status
      // Assert: error mentions sections required
    });

    it("rejects session with end_time before start_time (400 VALIDATION_ERROR)", async () => {
      // Submit INVALID_SESSION_TIME
      // Assert: 400 status
    });

    it("rejects invalid session_type (400 VALIDATION_ERROR)", async () => {
      // Submit with session_type: "invalid"
      // Assert: 400 status
    });

    it("rejects invalid academic term (400 VALIDATION_ERROR)", async () => {
      // Submit with term: "winter"
      // Assert: 400 status
    });

    it("rejects non-existent Course Director (404 DIRECTOR_NOT_FOUND)", async () => {
      // Submit with director.course_director_id = "non-existent-uuid"
      // Assert: 404 status
    });

    it("returns 401 when not authenticated", async () => {
      // No auth header
      // Assert: 401 status
    });

    it("returns 403 when role is below faculty", async () => {
      // Auth as student
      // Assert: 403 status
    });

    it("sets course status to draft on creation", async () => {
      // Assert: response.data.status = "draft"
    });
  });

  describe("GET /api/v1/courses/check-code", () => {
    it("returns available: true for unused code (200)", async () => {
      // Assert: 200 status
      // Assert: data.available = true
    });

    it("returns available: false for existing code (200)", async () => {
      // Assert: 200 status
      // Assert: data.available = false
    });
  });
});
```

---

## Section 11: E2E Test Spec (Playwright)

**File:** `apps/web/e2e/course-creation.spec.ts`
**Total tests:** 1 (critical journey)

```typescript
import { test, expect } from "@playwright/test";

test.describe("Course Creation Wizard", () => {
  test("faculty completes full wizard and creates a course", async ({ page }) => {
    // 1. Login as faculty user
    await page.goto("/login");
    await page.fill("[name=email]", "dr.faculty@msm.edu");
    await page.fill("[name=password]", "TestPassword123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard/**");

    // 2. Navigate to course creation
    await page.goto("/faculty/courses/new");
    await expect(page.getByText("Create New Course")).toBeVisible();

    // 3. Step 1: Basic Info
    await page.fill("[name=name]", "Test Course E2E");
    await page.fill("[name=code]", "TEST-E2E-001");
    await page.selectOption("[name=term]", "fall");
    await page.fill("[name=academic_year]", "2026");
    // Wait for code availability check
    await expect(page.getByText("Available")).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Next")');

    // 4. Step 2: Configuration
    await page.fill("[name=credit_hours]", "3");
    await page.fill("[name=max_enrollment]", "60");
    await page.click('button:has-text("Add Learning Objective")');
    await page.fill("[name=learning_objectives_0]", "Understand E2E testing");
    await page.click('button:has-text("Next")');

    // 5. Step 3: Sections & Sessions
    await page.click('button:has-text("Add Section")');
    await page.fill("[name=section_0_name]", "Introduction");
    await page.click('button:has-text("Add Session")');
    await page.fill("[name=session_0_0_name]", "Welcome Lecture");
    await page.click('button:has-text("Next")');

    // 6. Step 4: Course Director (skip)
    await page.click('button:has-text("Next")');

    // 7. Step 5: Review & Create
    await expect(page.getByText("Test Course E2E")).toBeVisible();
    await expect(page.getByText("TEST-E2E-001")).toBeVisible();
    await page.click('button:has-text("Create Course")');

    // 8. Assert redirect to course detail
    await page.waitForURL("/faculty/courses/**");
    await expect(page.getByText("Test Course E2E")).toBeVisible();
  });
});
```

---

## Section 12: Acceptance Criteria

- [ ] Multi-step wizard at `/faculty/courses/new` with 5 steps: Basic Info, Configuration, Structure, CD Assignment, Review
- [ ] Step indicator shows progress (upcoming, active, completed states)
- [ ] Step 1: Course name, code (with async uniqueness check), description, year, term, program
- [ ] Step 1: Code uniqueness check debounced 500ms, shows availability badge
- [ ] Step 2: Credit hours, max enrollment, is_required, prerequisites, learning objectives, tags
- [ ] Step 3: Section builder with add/remove/reorder; session builder within each section
- [ ] Step 4: Course Director search-and-select from institution users (optional)
- [ ] Step 5: Full summary of all steps with "Edit" links to jump back
- [ ] Draft persistence: wizard state saved to localStorage, resume prompt on return
- [ ] Form validation at each step prevents proceeding with invalid data
- [ ] POST `/api/v1/courses` creates course with sections, sessions, and CD in one request
- [ ] Course code uniqueness enforced (409 DUPLICATE_COURSE_CODE)
- [ ] Course created with status "draft"
- [ ] Success redirects to course detail page
- [ ] 14 API tests pass
- [ ] 1 E2E test passes (full wizard completion)
- [ ] TypeScript strict, named exports only (except page.tsx default export)
- [ ] Design tokens only, no hardcoded styling values
- [ ] Atomic Design: StepIndicator atom, Step molecules, CourseWizard organism
- [ ] Custom error classes: `CourseValidationError`, `DuplicateCourseCodeError`

---

## Section 13: Source References

All data in this brief was extracted from the following source documents. Do NOT read these during implementation -- everything needed is inlined above.

| Document | What Was Extracted |
|----------|-------------------|
| `.context/spec/stories/S-F-08-3.md` | Original story with acceptance criteria, implementation layers, dependencies |
| `.context/spec/stories/STORY-F-11-BRIEF.md` | Course hierarchy types, Section/Session models, hierarchy service |
| `.context/spec/stories/STORY-F-1-BRIEF.md` | Course types, courses table schema, CourseService |
| `.context/source/04-process/CODE_STANDARDS.md` | Atomic Design hierarchy, OOP standards, testing standards |
| `.context/source/02-architecture/ARCHITECTURE_v10.md` | Three Sheet design tokens, monorepo structure |
| `.context/source/03-schema/API_CONTRACT_v1.md` | API envelope format, endpoint conventions |

---

## Section 14: Environment Prerequisites

### Required Services
- **Supabase:** `courses`, `sections`, `sessions`, `profiles` tables migrated (from F-1, F-11)
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **Neo4j:** Required for dual-write sync on course creation (handled by existing services)

### Required Environment Variables
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
```

### Pre-implementation Checks
1. Verify STORY-F-11 is complete: `sections` and `sessions` tables exist, HierarchyService available
2. Verify STORY-F-1 is complete: `courses` table exists, CourseService available
3. Verify unique index on `courses(code, institution_id)` exists
4. Verify `profiles` table has faculty users for Course Director search
5. Verify shadcn/ui components installed: Input, Textarea, Select, Checkbox, Button, Card, Badge, Skeleton
6. Verify `lucide-react` installed for icons

---

## Section 15: Implementation Notes

- **Controller orchestration:** The `CourseController.create()` method orchestrates multiple service calls in sequence:

```typescript
async create(req: Request, res: Response): Promise<void> {
  const input = req.body as CourseCreateInput;
  const userId = req.user!.id;
  const institutionId = req.user!.institution_id;

  // 1. Check course code uniqueness
  const codeExists = await this.#courseService.codeExists(input.basic_info.code, institutionId);
  if (codeExists) throw new DuplicateCourseCodeError(input.basic_info.code);

  // 2. Validate Course Director exists (if provided)
  if (input.director.course_director_id) {
    const directorExists = await this.#userService.exists(input.director.course_director_id);
    if (!directorExists) throw new DirectorNotFoundError(input.director.course_director_id);
  }

  // 3. Create course record
  const course = await this.#courseService.create({
    ...input.basic_info,
    ...input.configuration,
    institution_id: institutionId,
    created_by: userId,
    status: "draft",
    course_director_id: input.director.course_director_id,
  });

  // 4. Create sections and sessions
  let sessionCount = 0;
  for (const section of input.structure.sections) {
    const createdSection = await this.#hierarchyService.createSection(course.id, section);
    for (const session of section.sessions) {
      await this.#hierarchyService.createSession(createdSection.id, session);
      sessionCount++;
    }
  }

  // 5. Return response
  res.status(201).json({
    data: {
      id: course.id,
      name: course.name,
      code: course.code,
      status: "draft",
      section_count: input.structure.sections.length,
      session_count: sessionCount,
      course_director_id: input.director.course_director_id,
      created_at: course.created_at,
    },
    error: null,
  });
}
```

- **Validation middleware using Zod:**

```typescript
import { z } from "zod";

const SessionSchema = z.object({
  name: z.string().min(1).max(200),
  week_number: z.number().int().min(1).max(52),
  day_of_week: z.number().int().min(1).max(7),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  session_type: z.enum(["lecture", "lab", "clinical", "discussion", "exam"]),
}).refine(
  (data) => data.start_time < data.end_time,
  { message: "end_time must be after start_time" },
);

const SectionSchema = z.object({
  name: z.string().min(1).max(200),
  position: z.number().int().min(1),
  sessions: z.array(SessionSchema),
});

export const CourseCreateSchema = z.object({
  basic_info: z.object({
    name: z.string().min(3).max(200),
    code: z.string().min(3).max(50).regex(/^[A-Z0-9-]+$/),
    description: z.string().max(2000).optional(),
    academic_year: z.number().int().min(2020).max(2099),
    term: z.enum(["fall", "spring", "summer", "year_long"]),
    institution_id: z.string().uuid(),
    program_id: z.string().uuid().nullable(),
  }),
  configuration: z.object({
    credit_hours: z.number().int().min(1).max(20),
    max_enrollment: z.number().int().min(1).max(1000),
    is_required: z.boolean(),
    prerequisites: z.array(z.string()).default([]),
    learning_objectives: z.array(z.string().min(1)).min(1),
    tags: z.array(z.string()).default([]),
  }),
  structure: z.object({
    sections: z.array(SectionSchema).min(1),
  }),
  director: z.object({
    course_director_id: z.string().uuid().nullable(),
  }),
});
```

- **Error classes:**

```typescript
// apps/server/src/errors/course.error.ts
import { JourneyOSError } from "./base.errors";

export class CourseValidationError extends JourneyOSError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}

export class DuplicateCourseCodeError extends JourneyOSError {
  constructor(code: string) {
    super(`Course code '${code}' already exists at this institution`, "DUPLICATE_COURSE_CODE");
  }
}

export class DirectorNotFoundError extends JourneyOSError {
  constructor(directorId: string) {
    super(`Course Director with ID '${directorId}' not found`, "DIRECTOR_NOT_FOUND");
  }
}
```

- **StepIndicator atom:** Receives `steps`, `currentStep`, `completedSteps` as props. Uses flexbox for horizontal layout on desktop, vertical on mobile. CSS transitions for step state changes.

- **Path alias:** Import from `@web/components/...`, `@web/lib/...` in the web app. Import types from `@journey-os/types`.

- **req.params narrowing:** For any route params, narrow with `typeof x === "string"` before passing to services.

- **vi.hoisted()** needed for Supabase and service mocks in tests.

- **No default exports** except `page.tsx` (Next.js App Router requirement).
