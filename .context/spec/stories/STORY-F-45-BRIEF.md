# STORY-F-45 Brief: Batch Configuration Form

## 0. Lane & Priority

```yaml
story_id: STORY-F-45
old_id: S-F-20-2
lane: faculty
lane_priority: 3
within_lane_order: 45
sprint: 14
size: M
depends_on:
  - STORY-F-39 (faculty) — Inngest Batch Pipeline (batch pipeline must exist to submit to)
blocks: []
personas_served: [faculty]
epic: E-20 (Bulk Generation)
feature: F-09 (AI Generation)
user_flow: UF-20 (Bulk Generation)
```

## 1. Summary

Build a **batch configuration form** that enables faculty to specify target count, course scope, concept scope, question type, difficulty distribution, and optional Bloom level targeting before launching a bulk generation job. The difficulty distribution uses three linked sliders/inputs that auto-adjust to maintain a 100% total. Form validation uses React Hook Form + Zod. On submit, the form creates a batch job via the batch pipeline (STORY-F-39) and navigates to the batch progress view.

Key constraints:
- **Target count** range: 1-100
- **Difficulty distribution** sliders must sum to 100% (auto-adjust on change)
- Course and SLO selectors reuse existing select components
- Estimated generation time: `targetCount * avgGenerationTime / concurrencyLimit`
- Form state managed with React Hook Form + Zod validation
- Submit creates batch job and navigates to progress view (F-46)

## 2. Task Breakdown

1. **Types** — Create `BatchConfigFormValues`, `BatchConfigValidation`, `EstimatedTime` in `packages/types/src/generation/batch-config.types.ts`
2. **Zod schema** — `batchConfigSchema` for form validation
3. **Controller** — `BatchConfigController` with `handleCreateBatch()` endpoint
4. **Frontend page** — `/faculty/generate/batch` page with batch config form
5. **Frontend components** — `BatchConfigForm`, `DifficultyDistribution` (linked sliders)
6. **Estimated time** — Display calculation based on target count and concurrency
7. **API tests** — 10 tests for config validation, difficulty distribution, scope combinations

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/generation/batch-config.types.ts

import { z } from "zod";

/** Difficulty distribution (must sum to 100) */
export interface DifficultyDistributionConfig {
  readonly easy: number;     // 0-100
  readonly medium: number;   // 0-100
  readonly hard: number;     // 0-100
}

/** Batch config form values */
export interface BatchConfigFormValues {
  readonly targetCount: number;                    // 1-100
  readonly courseId: string;
  readonly conceptScope: readonly string[];         // Concept IDs or empty for "all"
  readonly sloScope: readonly string[];             // SLO IDs or empty for "all"
  readonly questionType: string;                   // "single-best-answer" | "extended-matching" etc.
  readonly difficultyDistribution: DifficultyDistributionConfig;
  readonly bloomLevels: readonly string[];          // Optional Bloom level filter
  readonly templateId?: string;                    // Optional generation template
  readonly concurrencyLimit: number;               // Default: 5
}

/** Estimated generation time */
export interface EstimatedTime {
  readonly totalMinutes: number;
  readonly perItemSeconds: number;
  readonly concurrencyLimit: number;
  readonly targetCount: number;
}

/** Question type options */
export const QUESTION_TYPES = [
  { value: "single-best-answer", label: "Single Best Answer (SBA)" },
  { value: "extended-matching", label: "Extended Matching Question (EMQ)" },
  { value: "short-answer", label: "Short Answer" },
] as const;

/** Bloom level options */
export const BLOOM_LEVELS = [
  { value: "knowledge", label: "Knowledge" },
  { value: "comprehension", label: "Comprehension" },
  { value: "application", label: "Application" },
  { value: "analysis", label: "Analysis" },
  { value: "synthesis", label: "Synthesis" },
  { value: "evaluation", label: "Evaluation" },
] as const;

/** Zod validation schema */
export const batchConfigSchema = z.object({
  targetCount: z.number().int().min(1).max(100),
  courseId: z.string().uuid(),
  conceptScope: z.array(z.string().uuid()).default([]),
  sloScope: z.array(z.string().uuid()).default([]),
  questionType: z.string().min(1),
  difficultyDistribution: z.object({
    easy: z.number().min(0).max(100),
    medium: z.number().min(0).max(100),
    hard: z.number().min(0).max(100),
  }).refine(
    (d) => d.easy + d.medium + d.hard === 100,
    { message: "Difficulty distribution must sum to 100%" }
  ),
  bloomLevels: z.array(z.string()).default([]),
  templateId: z.string().uuid().optional(),
  concurrencyLimit: z.number().int().min(1).max(10).default(5),
});
```

## 4. Database Schema (inline, complete)

No new tables needed. Batch jobs table created in STORY-F-39.

```sql
-- No migration required for this story.
-- Uses batch_jobs table from STORY-F-39.
```

## 5. API Contract (complete request/response)

### POST /api/v1/generation/batch (Auth: Faculty) — already defined in F-39

This story uses the same endpoint defined in STORY-F-39. The form submits to `POST /api/v1/generation/batch` with the validated config.

**Request Body (from form):**
```json
{
  "targetCount": 25,
  "courseId": "course-uuid-1",
  "conceptScope": ["concept-uuid-1", "concept-uuid-2"],
  "sloScope": [],
  "questionType": "single-best-answer",
  "difficultyDistribution": { "easy": 20, "medium": 50, "hard": 30 },
  "bloomLevels": ["application", "analysis"],
  "concurrencyLimit": 5
}
```

**Success Response (201):** — Same as F-39 API contract, returns created batch job.

### GET /api/v1/generation/batch/estimate (Auth: Faculty)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `target_count` | number | required | Number of items |
| `concurrency` | number | 5 | Concurrency limit |

**Success Response (200):**
```json
{
  "data": {
    "totalMinutes": 12.5,
    "perItemSeconds": 30,
    "concurrencyLimit": 5,
    "targetCount": 25
  },
  "error": null
}
```

## 6. Frontend Spec

### Page: `/faculty/generate/batch` (Faculty layout)

**Route:** `apps/web/src/app/(dashboard)/faculty/generate/batch/page.tsx`

**Component hierarchy:**
```
BatchConfigPage (page.tsx — default export)
  └── BatchConfigForm (client component)
        ├── Form Header ("Configure Batch Generation")
        ├── CourseSelector (dropdown — reuse existing)
        ├── TargetCount (number input, 1-100)
        ├── QuestionTypeSelector (dropdown)
        ├── DifficultyDistribution (molecule)
        │     ├── EasySlider + input (linked)
        │     ├── MediumSlider + input (linked)
        │     ├── HardSlider + input (linked)
        │     └── Total indicator (must show 100%)
        ├── SLOScope (multi-select — "All" or specific)
        ├── ConceptScope (multi-select — "All" or specific)
        ├── BloomLevelFilter (checkbox group, optional)
        ├── ConcurrencyLimit (number input, 1-10, default 5)
        ├── EstimatedTimeDisplay (read-only calculation)
        └── Submit button ("Start Batch Generation")
```

**States:**
1. **Loading** — Skeleton form while courses/SLOs fetch
2. **Editing** — Form with validation feedback
3. **Invalid** — Form errors highlighted (red borders, error messages)
4. **Submitting** — Submit button disabled with spinner
5. **Success** — Redirect to `/faculty/generate/batch/:batchId` (progress view)

**Design tokens:**
- Surface: White (#ffffff) card on Cream (#f5f3ef) background
- Form labels: Navy Deep (#002c76)
- Submit button: Green (#69a338) with white text
- Error text: Red
- Slider track: Navy Deep (#002c76), thumb: Green (#69a338)
- Difficulty distribution total: Green when 100%, Red when != 100%

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/generation/batch-config.types.ts` | Types | Create |
| 2 | `packages/types/src/generation/index.ts` | Types | Edit (add batch-config export) |
| 3 | `apps/server/src/controllers/generation/batch.controller.ts` | Controller | Edit (add estimate endpoint) |
| 4 | `apps/web/src/app/(dashboard)/faculty/generate/batch/page.tsx` | Page | Create |
| 5 | `apps/web/src/components/generation/BatchConfigForm.tsx` | Component | Create |
| 6 | `apps/web/src/components/generation/DifficultyDistribution.tsx` | Component | Create |
| 7 | `apps/server/src/__tests__/generation/batch.controller.test.ts` | Tests | Edit (add config validation tests) |
| 8 | `apps/web/src/__tests__/generation/BatchConfigForm.test.tsx` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-39 | faculty | NOT STARTED | Batch pipeline must exist to submit config to |
| STORY-U-10 | universal | **DONE** | Dashboard routing for faculty layout |

### NPM Packages (already installed or to install)
- `react-hook-form` — Form state management (likely already installed)
- `zod` — Validation (already installed)
- `@hookform/resolvers` — Zod resolver for react-hook-form (may need install)
- `lucide-react` — Icons (already installed)

### Existing Files Needed
- `apps/server/src/controllers/generation/batch.controller.ts` — Extend with estimate (from F-39)
- `apps/web/src/app/(dashboard)/faculty/layout.tsx` — Faculty layout
- Existing course/SLO selector components (if available from other stories)

## 9. Test Fixtures (inline)

```typescript
// Mock courses for selector
export const MOCK_COURSES = [
  { id: "course-uuid-1", name: "Cardiovascular Pathology" },
  { id: "course-uuid-2", name: "Neuroanatomy" },
];

// Mock SLOs for selector
export const MOCK_SLOS = [
  { id: "slo-uuid-1", name: "Diagnose acute MI" },
  { id: "slo-uuid-2", name: "Interpret ECG findings" },
];

// Valid form values
export const MOCK_VALID_CONFIG = {
  targetCount: 25,
  courseId: "course-uuid-1",
  conceptScope: [],
  sloScope: [],
  questionType: "single-best-answer",
  difficultyDistribution: { easy: 20, medium: 50, hard: 30 },
  bloomLevels: ["application"],
  concurrencyLimit: 5,
};

// Invalid form values (distribution != 100)
export const MOCK_INVALID_DISTRIBUTION = {
  ...MOCK_VALID_CONFIG,
  difficultyDistribution: { easy: 20, medium: 50, hard: 20 }, // Sum = 90
};

// Invalid form values (target too high)
export const MOCK_INVALID_TARGET = {
  ...MOCK_VALID_CONFIG,
  targetCount: 150, // Max is 100
};

// Mock estimated time response
export const MOCK_ESTIMATED_TIME = {
  totalMinutes: 12.5,
  perItemSeconds: 30,
  concurrencyLimit: 5,
  targetCount: 25,
};
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/__tests__/generation/batch.controller.test.ts` (extend)

```
describe("BatchController — Config Validation")
  ✓ accepts valid batch config (201)
  ✓ rejects targetCount > 100 (400 VALIDATION_ERROR)
  ✓ rejects targetCount < 1 (400 VALIDATION_ERROR)
  ✓ rejects difficulty distribution not summing to 100 (400 VALIDATION_ERROR)
  ✓ rejects missing courseId (400 VALIDATION_ERROR)
  ✓ accepts empty conceptScope/sloScope as "all"
  ✓ defaults concurrencyLimit to 5 when not provided
```

**File:** `apps/web/src/__tests__/generation/BatchConfigForm.test.tsx`

```
describe("BatchConfigForm")
  ✓ renders all form fields with defaults
  ✓ difficulty sliders auto-adjust to maintain 100% total
  ✓ shows validation error when distribution != 100%
  ✓ disables submit button when form is invalid
  ✓ calls onSubmit with validated config on form submit
  ✓ displays estimated generation time based on inputs
```

**Total: ~13 tests** (7 controller + 6 frontend)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. E2E coverage will be added when the full batch flow (config -> progress -> controls) is complete.

## 12. Acceptance Criteria

1. Form fields: target count (1-100), course scope, concept scope, question type, difficulty distribution
2. Difficulty distribution sliders auto-adjust to maintain 100% total
3. Bloom level targeting: optional filter for specific Bloom levels
4. SLO scope: select specific SLOs or "all SLOs in course"
5. Form-level validation with clear error messages
6. Estimated generation time displayed based on target count and concurrency
7. Submit creates batch job and navigates to progress view
8. All ~13 tests pass
9. TypeScript strict, named exports only (except page.tsx), design tokens only

## 13. Source References

| Claim | Source |
|-------|--------|
| Form fields and ranges | S-F-20-2 § Acceptance Criteria |
| Difficulty distribution linked sliders | S-F-20-2 § Notes: "three linked sliders/inputs that auto-adjust" |
| React Hook Form + Zod | S-F-20-2 § Notes: "Form state managed with React Hook Form + Zod" |
| Estimated time formula | S-F-20-2 § Notes: "target_count * avg_generation_time / concurrency_limit" |
| Reuse select components | S-F-20-2 § Notes: "Course and SLO selectors reuse existing select components" |
| Batch config presets | S-F-20-2 § Notes: "Consider saving batch configs as presets" |

## 14. Environment Prerequisites

- **Express:** Server running on port 3001 with batch pipeline endpoints (from F-39)
- **Next.js:** Web app running on port 3000 with faculty dashboard
- **Supabase:** Project running with `batch_jobs` table (from F-39)

## 15. Figma / Make Prototype

**Form Layout:**
```
┌─────────────────────────────────────────┐
│ Configure Batch Generation               │
├─────────────────────────────────────────┤
│ Course: [Cardiovascular Pathology ▾]    │
│                                         │
│ Target Count: [25    ]  (1-100)         │
│ Question Type: [Single Best Answer ▾]   │
│                                         │
│ Difficulty Distribution:                │
│ Easy:   ████░░░░░░  [20%]             │
│ Medium: ██████████  [50%]             │
│ Hard:   ██████░░░░  [30%]             │
│ Total: 100% ✓                          │
│                                         │
│ SLO Scope: [All SLOs ▾]               │
│ Concept Scope: [All Concepts ▾]        │
│ Bloom Levels: ☑ Application ☑ Analysis │
│ Concurrency: [5]                        │
│                                         │
│ Est. Time: ~12.5 minutes               │
│                                         │
│ [Start Batch Generation]                │
└─────────────────────────────────────────┘
```

Colors: White (#ffffff) form card, Navy Deep (#002c76) labels, Green (#69a338) submit button and slider thumbs.
