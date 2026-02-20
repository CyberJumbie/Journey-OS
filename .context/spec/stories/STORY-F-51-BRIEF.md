# STORY-F-51 Brief: Generation Spec Wizard

## 0. Lane & Priority

```yaml
story_id: STORY-F-51
old_id: S-F-19-4
lane: faculty
lane_priority: 3
within_lane_order: 51
sprint: 7
size: M
depends_on:
  - STORY-F-43 (faculty) — Workbench SplitPane layout exists
blocks: []
personas_served: [faculty]
epic: E-19 (Workbench UI)
feature: F-09 (Generation Workbench)
```

## 1. Summary

Build a **multi-step generation specification wizard** that lets faculty configure question parameters before launching generation. The wizard has 4 steps: (1) Question Type -- SBA, EMQ, Sequential Set; (2) Difficulty & Bloom's -- difficulty selector + Bloom's taxonomy level; (3) Scope -- course dropdown, SLO multi-select, concept tag multi-select; (4) Constraints & Review -- max vignette length, required keywords, excluded topics, plus a summary of all selections. Uses `react-hook-form` with Zod schema validation per step. A "Quick Generate" shortcut pre-fills defaults and skips to the review step. Wizard state is preserved if the user switches modes. The wizard output is a `GenerationSpec` object sent to the SSE generation endpoint. The wizard renders inside the chat panel area when in Generate mode.

Key constraints:
- 4-step wizard with linear back/next navigation, per-step validation
- react-hook-form + Zod for validation
- Quick Generate uses last-used config or sensible defaults
- Wizard output is `GenerationSpec` sent to SSE endpoint
- Named exports only, TypeScript strict, design tokens only, atomic design

## 2. Task Breakdown

1. **Types** -- Create `GenerationSpec`, `WizardStep`, `QuestionTypeOption`, `BloomLevel`, `DifficultyLevel` in `packages/types/src/generation/`
2. **Step indicator atom** -- `StepIndicator` in `packages/ui/src/atoms/`
3. **Wizard step molecule** -- `WizardStep` wrapper in `packages/ui/src/molecules/`
4. **Multi-select tags molecule** -- `MultiSelectTags` in `packages/ui/src/molecules/`
5. **Question type step** -- `QuestionTypeStep` organism
6. **Difficulty step** -- `DifficultyStep` organism with difficulty + Bloom's selectors
7. **Scope step** -- `ScopeStep` organism with course, SLO, concept selectors
8. **Review step** -- `ReviewStep` organism with summary + launch button
9. **Generation wizard** -- `GenerationWizard` parent organism
10. **useWizardState hook** -- Wizard state management with persistence
11. **Zod schemas** -- Per-step validation schemas
12. **API tests** -- 8-12 tests covering form validation, step navigation, state persistence, quick generate, submission
13. **Exports** -- Register in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/generation/spec.types.ts

/** Supported question types for generation */
export type QuestionType = "single_best_answer" | "extended_matching" | "sequential_set";

/** Bloom's taxonomy levels */
export type BloomLevel = "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create";

/** Difficulty levels */
export type DifficultyLevel = "easy" | "medium" | "hard";

/** Step 1: Question Type selection */
export interface QuestionTypeSelection {
  readonly question_type: QuestionType;
}

/** Step 2: Difficulty and Bloom's selection */
export interface DifficultySelection {
  readonly difficulty: DifficultyLevel;
  readonly bloom_level: BloomLevel;
}

/** Step 3: Scope selection */
export interface ScopeSelection {
  readonly course_id: string;
  readonly slo_ids: readonly string[];
  readonly concept_ids: readonly string[];
}

/** Step 4: Constraints */
export interface ConstraintSelection {
  readonly max_vignette_length: number | null;
  readonly required_keywords: readonly string[];
  readonly excluded_topics: readonly string[];
}

/** Complete generation specification (wizard output) */
export interface GenerationSpec {
  readonly question_type: QuestionType;
  readonly difficulty: DifficultyLevel;
  readonly bloom_level: BloomLevel;
  readonly course_id: string;
  readonly slo_ids: readonly string[];
  readonly concept_ids: readonly string[];
  readonly max_vignette_length: number | null;
  readonly required_keywords: readonly string[];
  readonly excluded_topics: readonly string[];
}

/** Wizard step metadata */
export interface WizardStepMeta {
  readonly index: number;
  readonly label: string;
  readonly description: string;
  readonly is_valid: boolean;
  readonly is_active: boolean;
  readonly is_completed: boolean;
}

/** Wizard state */
export interface WizardState {
  readonly current_step: number;
  readonly total_steps: number;
  readonly steps: readonly WizardStepMeta[];
  readonly is_quick_generate: boolean;
  readonly spec: Partial<GenerationSpec>;
}

/** Question type display option */
export interface QuestionTypeOption {
  readonly value: QuestionType;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
}

/** Bloom level display option */
export interface BloomLevelOption {
  readonly value: BloomLevel;
  readonly label: string;
  readonly description: string;
  readonly example_verbs: readonly string[];
}

/** Difficulty display option */
export interface DifficultyOption {
  readonly value: DifficultyLevel;
  readonly label: string;
  readonly description: string;
}
```

## 4. Database Schema (inline, complete)

No new tables. The wizard reads from existing tables for scope selectors and persists the `GenerationSpec` as part of the generation session.

```sql
-- No new migration required.
-- Reads from existing:
-- courses (id, name) — for course dropdown
-- slos (id, title, course_id) — for SLO multi-select
-- concepts (id, name) — for concept tag multi-select (via Neo4j)
```

## 5. API Contract (complete request/response)

The wizard is a frontend-only component. It outputs a `GenerationSpec` that is sent to the existing SSE generation endpoint.

### Internal: Wizard submits to generation endpoint

```typescript
// POST /api/v1/generate (SSE endpoint, already exists from pipeline stories)
// Body: GenerationSpec
// Response: SSE stream of generation events
```

### Supporting data endpoints (may already exist):

**GET /api/v1/courses** (Auth: faculty) -- Course list for dropdown
**GET /api/v1/courses/:courseId/slos** (Auth: faculty) -- SLOs for multi-select
**GET /api/v1/concepts?slo_id={sloId}** (Auth: faculty) -- Concepts for multi-select

These are assumed to exist from prior stories. If not, they are thin wrappers.

## 6. Frontend Spec

### GenerationWizard Component

**File:** `apps/web/src/components/workbench/generation-wizard.tsx`

```
GenerationWizard (organism)
  ├── StepIndicator (atom) — shows 4 steps with active/completed/pending states
  ├── WizardStep wrapper (molecule) — manages step transitions
  │   ├── Step 1: QuestionTypeStep
  │   │   ├── Radio cards for SBA, EMQ, Sequential Set
  │   │   └── Each card: icon, label, description
  │   ├── Step 2: DifficultyStep
  │   │   ├── Difficulty selector: Easy / Medium / Hard with tooltips
  │   │   └── Bloom's level selector: 6 levels with example verbs
  │   ├── Step 3: ScopeStep
  │   │   ├── Course dropdown (shadcn/ui Select)
  │   │   ├── SLO multi-select (MultiSelectTags)
  │   │   └── Concept tag multi-select (MultiSelectTags)
  │   └── Step 4: ReviewStep
  │       ├── Summary cards for all selections
  │       └── "Generate" button (primary action)
  ├── Navigation: Back / Next buttons
  └── Quick Generate shortcut button
```

**States:**
1. **Step active** -- Current step form visible with validation
2. **Step completed** -- Green checkmark on step indicator
3. **Step pending** -- Gray dot on step indicator
4. **Validating** -- Inline errors shown on invalid fields
5. **Quick Generate** -- Skips to review step with defaults pre-filled
6. **Submitting** -- Generate button shows loading spinner

**Design tokens:**
- Step indicator active: Navy Deep `#002c76`
- Step indicator completed: Green `#69a338`
- Step indicator pending: Cream `#f5f3ef` with border
- Radio cards: White `#ffffff` with Navy Deep border when selected
- Generate button: Navy Deep `#002c76` background, White text
- Quick Generate: Ghost variant with Lucide `Zap` icon
- Error text: destructive color from design system
- Tooltip backgrounds: design system popover tokens

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/generation/spec.types.ts` | Types | Create |
| 2 | `packages/types/src/generation/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add generation export) |
| 4 | `packages/ui/src/atoms/step-indicator.tsx` | Atom | Create |
| 5 | `packages/ui/src/molecules/wizard-step.tsx` | Molecule | Create |
| 6 | `packages/ui/src/molecules/multi-select-tags.tsx` | Molecule | Create |
| 7 | `apps/web/src/components/workbench/wizard-steps/question-type-step.tsx` | Organism | Create |
| 8 | `apps/web/src/components/workbench/wizard-steps/difficulty-step.tsx` | Organism | Create |
| 9 | `apps/web/src/components/workbench/wizard-steps/scope-step.tsx` | Organism | Create |
| 10 | `apps/web/src/components/workbench/wizard-steps/review-step.tsx` | Organism | Create |
| 11 | `apps/web/src/components/workbench/generation-wizard.tsx` | Organism | Create |
| 12 | `apps/web/src/hooks/use-wizard-state.ts` | Hook | Create |
| 13 | `apps/web/src/lib/schemas/generation-spec.schema.ts` | Validation | Create |
| 14 | `apps/web/src/__tests__/workbench/generation-wizard.test.tsx` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-43 | faculty | Pending | Workbench SplitPane layout must exist |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-7 | universal | **DONE** | USMLE seed data for framework tag options |

### NPM Packages (to install)
- No new packages required. Uses existing react-hook-form, zod, and shadcn/ui components.

### Existing Files Needed
- `apps/web/src/components/workbench/` -- Workbench layout (from STORY-F-43)
- `apps/web/src/lib/supabase/` -- Supabase client for course/SLO data fetching

## 9. Test Fixtures (inline)

```typescript
// Default generation spec (for Quick Generate)
export const DEFAULT_GENERATION_SPEC: GenerationSpec = {
  question_type: "single_best_answer",
  difficulty: "medium",
  bloom_level: "Apply",
  course_id: "course-uuid-1",
  slo_ids: ["slo-uuid-1"],
  concept_ids: [],
  max_vignette_length: null,
  required_keywords: [],
  excluded_topics: [],
};

// Fully specified generation spec
export const FULL_GENERATION_SPEC: GenerationSpec = {
  question_type: "extended_matching",
  difficulty: "hard",
  bloom_level: "Analyze",
  course_id: "course-uuid-1",
  slo_ids: ["slo-uuid-1", "slo-uuid-2"],
  concept_ids: ["concept-uuid-1", "concept-uuid-2"],
  max_vignette_length: 500,
  required_keywords: ["diagnosis", "treatment"],
  excluded_topics: ["pediatric"],
};

// Mock course list for scope step
export const MOCK_COURSES = [
  { id: "course-uuid-1", name: "Cardiovascular Medicine" },
  { id: "course-uuid-2", name: "Pharmacology" },
  { id: "course-uuid-3", name: "Neuroscience" },
];

// Mock SLOs for scope step
export const MOCK_SLOS = [
  { id: "slo-uuid-1", title: "Diagnose acute coronary syndrome", course_id: "course-uuid-1" },
  { id: "slo-uuid-2", title: "Manage heart failure", course_id: "course-uuid-1" },
];

// Mock concepts for scope step
export const MOCK_CONCEPTS = [
  { id: "concept-uuid-1", name: "Cardiac Physiology" },
  { id: "concept-uuid-2", name: "Pharmacokinetics" },
];

// Partial spec for step validation
export const INVALID_STEP_1 = {}; // missing question_type
export const VALID_STEP_1: QuestionTypeSelection = { question_type: "single_best_answer" };
export const VALID_STEP_2: DifficultySelection = { difficulty: "medium", bloom_level: "Apply" };
export const VALID_STEP_3: ScopeSelection = {
  course_id: "course-uuid-1",
  slo_ids: ["slo-uuid-1"],
  concept_ids: [],
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/web/src/__tests__/workbench/generation-wizard.test.tsx`

```
describe("GenerationWizard")
  describe("step navigation")
    > renders step 1 (Question Type) by default
    > navigates to step 2 on Next when step 1 is valid
    > prevents navigation to step 2 when step 1 is invalid
    > navigates back from step 2 to step 1
    > renders all 4 steps in sequence

  describe("form validation")
    > validates question type is selected in step 1
    > validates difficulty and bloom level in step 2
    > validates course is selected in step 3
    > shows inline error messages for invalid fields

  describe("quick generate")
    > Quick Generate pre-fills defaults and skips to review step
    > Quick Generate uses last-used config when available

  describe("submission")
    > submits GenerationSpec on Generate button click in review step
    > review step shows summary of all selections

  describe("state persistence")
    > preserves wizard state when user switches mode and returns
```

**Total: ~14 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. The wizard is a sub-component of the workbench. E2E coverage for the generation flow will exercise the wizard end-to-end.

## 12. Acceptance Criteria

1. Multi-step wizard with 4 steps: Question Type, Difficulty & Bloom's, Scope, Constraints & Review
2. Question Type selector: SBA, EMQ, Sequential Set with descriptions
3. Difficulty selector: Easy / Medium / Hard with tooltips
4. Bloom's Level selector: 6 levels with example verbs
5. Scope: Course dropdown, SLO multi-select, Concept tag multi-select
6. Constraints: max vignette length, required keywords, excluded topics
7. Review step shows summary of all selections before launch
8. Form validation with inline errors (react-hook-form + zod, per-step)
9. Wizard state preserved on mode switch
10. Quick Generate shortcut pre-fills defaults and skips to review
11. All 14 API tests pass
12. Named exports only, TypeScript strict, design tokens only

## 13. Source References

| Claim | Source |
|-------|--------|
| 4-step wizard | S-F-19-4 Acceptance Criteria |
| USMLE Step formats | S-F-19-4 Acceptance Criteria: "Single Best Answer, Extended Matching, Sequential Set" |
| Bloom's 6 levels | S-F-19-4 Acceptance Criteria |
| react-hook-form + zod per step | S-F-19-4 Notes: "uses react-hook-form with Zod schema validation per step" |
| Quick Generate defaults | S-F-19-4 Notes: "SBA, Medium, Apply, current course" |
| Wizard rendered in chat panel area | S-F-19-4 Notes: "rendered inside the chat panel area when in Generate mode" |
| GenerationSpec to SSE endpoint | S-F-19-4 Notes: "GenerationSpec object that gets sent to the SSE generation endpoint" |

## 14. Environment Prerequisites

- **Supabase:** Project running, `courses` and `slos` tables exist
- **Neo4j:** Running with concept data for scope selection
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **No new NPM packages required**

## 15. Implementation Notes

- **Wizard state with useWizardState:** Custom hook using `useReducer` or zustand store. Tracks `currentStep`, `formData` (partial GenerationSpec), `isQuickGenerate`. Stores state in sessionStorage for persistence across mode switches.
- **Per-step Zod schemas:** Separate Zod schemas for each step. Step 1: `z.object({ question_type: z.enum([...]) })`. Step 2: `z.object({ difficulty: z.enum([...]), bloom_level: z.enum([...]) })`. Step 3: `z.object({ course_id: z.string().uuid(), slo_ids: z.array(z.string().uuid()).min(1) })`. Step 4: optional constraints.
- **React Hook Form integration:** Single `useForm<GenerationSpec>()` instance. Each step renders fields from the form. `trigger()` called on Next to validate current step fields only. `handleSubmit()` on Generate in review step.
- **Quick Generate:** Reads last-used config from localStorage. Falls back to defaults: `{ question_type: "single_best_answer", difficulty: "medium", bloom_level: "Apply", course_id: <current course from URL> }`. Sets `currentStep` to 3 (review).
- **StepIndicator atom:** Horizontal 4-dot indicator. Active step: filled Navy Deep circle. Completed: Green circle with checkmark. Pending: empty circle with border. Labels below each dot.
- **MultiSelectTags molecule:** Wraps shadcn/ui `Command` + `Badge` for tag-style multi-select with search. Selected items shown as removable badges above the search input.
- **No default exports:** All components, hooks, schemas use named exports only.
