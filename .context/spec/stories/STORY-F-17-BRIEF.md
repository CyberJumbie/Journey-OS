# STORY-F-17 Brief: Generation Settings

## 0. Lane & Priority

```yaml
story_id: STORY-F-17
old_id: S-F-38-3
lane: faculty
lane_priority: 3
within_lane_order: 17
sprint: 19
size: S
depends_on:
  - STORY-F-5 (faculty) — Profile Page (settings layout exists)
  - STORY-F-16 (faculty) — user_preferences table created
blocks: []
cross_epic:
  - STORY-F-60 (faculty) — automation level config reads user preference
personas_served: [faculty, faculty_course_director]
epic: E-38 (Profile & Preferences)
feature: F-18 (User Preferences)
```

## 1. Summary

Build a **generation settings panel** at `/settings/generation` where faculty configure their default automation level and interrupt behavior for the AI generation workbench. This controls how much autonomy the generation pipeline has before pausing for human review.

Three automation levels form a strictness scale:
- **Manual** ("Review everything") -- pipeline pauses at every step
- **Checkpoints** ("Pause at checkpoints") -- pipeline pauses at key milestones
- **Full Auto** ("Let AI handle it") -- pipeline runs end-to-end without pausing

Institutions can set a minimum strictness level. The effective level is `max(institutionLevel, userLevel)` where `manual > checkpoints > full_auto`. If the institution enforces `checkpoints`, the user cannot select `full_auto` -- it appears disabled with an explanation.

Additionally, faculty can toggle an interrupt preference: "Pause before critic scoring" which inserts an extra review checkpoint regardless of automation level.

Settings are stored in the `user_preferences` table (created by STORY-F-16) under the `generation_preferences` JSONB column. The workbench reads these defaults on load.

Key constraints:
- Authenticated route (faculty+ via RbacMiddleware)
- Institution override: user cannot be less strict than institution policy
- Radio group for automation level (not toggles)
- Settings persist to `user_preferences.generation_preferences` JSONB

## 2. Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define `GenerationPreferences` types | `packages/types/src/user/generation-preferences.types.ts` | 20m |
| 2 | Update barrel exports | `packages/types/src/user/index.ts` | 5m |
| 3 | Implement `GenerationPreferenceService` | `apps/server/src/services/user/generation-preference.service.ts` | 45m |
| 4 | Implement `GenerationPreferenceController` | `apps/server/src/controllers/user/generation-preference.controller.ts` | 30m |
| 5 | Register routes in Express app | `apps/server/src/index.ts` | 10m |
| 6 | Build `GenerationSettingsPanel` component | `apps/web/src/components/settings/generation-settings-panel.tsx` | 45m |
| 7 | Build settings generation page | `apps/web/src/app/(dashboard)/settings/generation/page.tsx` | 15m |
| 8 | Write API tests (8 tests) | `apps/server/src/__tests__/generation-preference.controller.test.ts` | 45m |

**Total estimate:** ~3.5 hours (Size S)

## 3. Data Model (inline, complete)

### `packages/types/src/user/generation-preferences.types.ts`

```typescript
/**
 * Automation level for the generation pipeline.
 * Strictness order: manual > checkpoints > full_auto.
 * effectiveLevel = max(institutionLevel, userLevel).
 */
export type AutomationLevel = "full_auto" | "checkpoints" | "manual";

/**
 * Strictness ranking: higher number = stricter.
 * Used to compute effectiveLevel = max(institution, user).
 */
export const AUTOMATION_STRICTNESS: Readonly<Record<AutomationLevel, number>> = {
  full_auto: 0,
  checkpoints: 1,
  manual: 2,
};

/**
 * Generation preferences stored in user_preferences.generation_preferences JSONB.
 */
export interface GenerationPreferences {
  /** User's selected automation level */
  readonly automation_level: AutomationLevel;
  /** Extra checkpoint: pause before critic scoring step */
  readonly pause_before_critic: boolean;
  /** Default difficulty distribution for generated items (percentages, must sum to 100) */
  readonly difficulty_distribution: DifficultyDistribution;
  /** Default Bloom's taxonomy focus levels (array of 1-6) */
  readonly bloom_focus: readonly number[];
}

/**
 * Difficulty distribution across easy/medium/hard.
 * Values are percentages (0-100) that must sum to 100.
 */
export interface DifficultyDistribution {
  readonly easy: number;
  readonly medium: number;
  readonly hard: number;
}

/**
 * Default generation preferences.
 */
export const DEFAULT_GENERATION_PREFERENCES: GenerationPreferences = {
  automation_level: "checkpoints",
  pause_before_critic: false,
  difficulty_distribution: { easy: 30, medium: 50, hard: 20 },
  bloom_focus: [2, 3, 4],
};

/**
 * All valid automation levels for validation.
 */
export const AUTOMATION_LEVELS: readonly AutomationLevel[] = [
  "full_auto",
  "checkpoints",
  "manual",
] as const;

/**
 * GET /api/v1/settings/generation response payload.
 */
export interface GenerationPreferencesResponse {
  readonly preferences: GenerationPreferences;
  /** Institution minimum automation level, null if no override */
  readonly institution_minimum: AutomationLevel | null;
  /** Effective level after institution override applied */
  readonly effective_automation_level: AutomationLevel;
}

/**
 * PUT /api/v1/settings/generation request body.
 * Partial update: only include fields being changed.
 */
export interface UpdateGenerationPreferencesRequest {
  readonly automation_level?: AutomationLevel;
  readonly pause_before_critic?: boolean;
  readonly difficulty_distribution?: DifficultyDistribution;
  readonly bloom_focus?: readonly number[];
}
```

## 4. Database Schema (inline, complete)

No new migration needed. This story uses the `user_preferences` table created by STORY-F-16, specifically the `generation_preferences JSONB` column which defaults to `NULL`.

The `generation_preferences` column stores a `GenerationPreferences` JSON object:

```json
{
  "automation_level": "checkpoints",
  "pause_before_critic": false,
  "difficulty_distribution": { "easy": 30, "medium": 50, "hard": 20 },
  "bloom_focus": [2, 3, 4]
}
```

**Institution automation override** is read from the `institutions` table. This story reads the `settings` JSONB column on the `institutions` table:

```sql
-- Already exists (from institution setup stories)
-- institutions.settings JSONB contains:
-- { "min_automation_level": "checkpoints" }  -- or null if no override
```

If the `institutions.settings` column does not yet contain `min_automation_level`, the service treats it as `null` (no institution override, user has full choice).

## 5. API Contract (complete request/response)

### GET /api/v1/settings/generation (Auth: faculty+)

**Response (200):**
```json
{
  "data": {
    "preferences": {
      "automation_level": "checkpoints",
      "pause_before_critic": false,
      "difficulty_distribution": { "easy": 30, "medium": 50, "hard": 20 },
      "bloom_focus": [2, 3, 4]
    },
    "institution_minimum": "checkpoints",
    "effective_automation_level": "checkpoints"
  },
  "error": null
}
```

**Behavior:** If no `generation_preferences` exist in `user_preferences`, returns defaults. The `institution_minimum` is fetched from the user's institution settings. The `effective_automation_level` is computed as `max(institution_minimum, user.automation_level)`.

### PUT /api/v1/settings/generation (Auth: faculty+)

**Request (partial update):**
```json
{
  "automation_level": "full_auto",
  "pause_before_critic": true
}
```

**Response (200) -- when institution overrides to checkpoints:**
```json
{
  "data": {
    "preferences": {
      "automation_level": "full_auto",
      "pause_before_critic": true,
      "difficulty_distribution": { "easy": 30, "medium": 50, "hard": 20 },
      "bloom_focus": [2, 3, 4]
    },
    "institution_minimum": "checkpoints",
    "effective_automation_level": "checkpoints"
  },
  "error": null
}
```

Note: The user's raw preference (`full_auto`) is stored as-is. The `effective_automation_level` reflects the institution override. The workbench reads `effective_automation_level`, not the raw preference.

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid automation level, invalid bloom levels, distribution not summing to 100 |
| 401 | `AUTHENTICATION_ERROR` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role below faculty |
| 500 | `INTERNAL_ERROR` | Database error |

## 6. Frontend Spec

### Page: `/settings/generation`

**Route:** `apps/web/src/app/(dashboard)/settings/generation/page.tsx`

**Component hierarchy:**
```
SettingsGenerationPage (page.tsx -- default export)
  └── GenerationSettingsPanel (client component)
        ├── AutomationLevelSection
        │     ├── SectionHeading ("Automation Level")
        │     ├── RadioGroup (shadcn/ui)
        │     │     ├── RadioItem "Let AI handle it" (full_auto)
        │     │     ├── RadioItem "Pause at checkpoints" (checkpoints)
        │     │     └── RadioItem "Review everything" (manual)
        │     └── InstitutionOverrideNotice (conditional)
        ├── InterruptSection
        │     ├── SectionHeading ("Interrupt Preferences")
        │     └── Switch "Pause before critic scoring" (shadcn/ui)
        ├── DefaultParamsSection
        │     ├── SectionHeading ("Default Generation Parameters")
        │     ├── DifficultySliders (easy/medium/hard, constrained to sum 100)
        │     └── BloomFocusCheckboxes (levels 1-6)
        └── SaveButton ("Save Changes")
```

**GenerationSettingsPanel behavior:**
```typescript
interface GenerationSettingsPanelState {
  preferences: GenerationPreferences;
  institutionMinimum: AutomationLevel | null;
  effectiveLevel: AutomationLevel;
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  error: string | null;
}
```

**States:**
1. **Loading** -- Skeleton while fetching GET /settings/generation
2. **Idle** -- Form reflects current preferences, Save button disabled (not dirty)
3. **Dirty** -- User changed a value, Save button enabled
4. **Saving** -- Save button shows spinner, form disabled
5. **Saved** -- Success toast, dirty resets to false
6. **Error** -- Error toast on save failure

**Institution override UX:**
- If `institution_minimum` is not null, radio options stricter than the minimum are disabled
- Disabled options show a lock icon and tooltip: "Your institution requires at least [level]"
- Example: If institution requires `checkpoints`, the `full_auto` radio is disabled with explanation
- The effective level badge shows next to the radio group: "Effective: Checkpoints"

**Design tokens:**
- Surface: White card on Parchment settings background
- Radio active: navyDeep `var(--color-navy-deep)`
- Switch track active: navyDeep `var(--color-navy-deep)`
- Disabled option: `var(--color-text-muted)` with `opacity: 0.5`
- Lock icon: `var(--color-text-muted)`
- Section dividers: `var(--color-cream)`
- Typography: Source Sans 3 for labels, Lora for section headings
- Save button: Primary variant, navyDeep background

**Responsive:**
- Desktop: Full form layout
- Mobile (< 768px): Stacked sections, full-width radio/toggle controls

**Save behavior:** Unlike notification preferences (optimistic per-toggle), generation settings use a traditional form save pattern -- changes are batched and submitted via a single "Save Changes" button. This is because the difficulty distribution constraint (sum to 100) requires coordinated validation.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/user/generation-preferences.types.ts` | Types | Create |
| 2 | `packages/types/src/user/index.ts` | Types | Edit (add exports) |
| 3 | `apps/server/src/services/user/generation-preference.service.ts` | Service | Create |
| 4 | `apps/server/src/controllers/user/generation-preference.controller.ts` | Controller | Create |
| 5 | `apps/server/src/index.ts` | Routes | Edit (add settings routes) |
| 6 | `apps/web/src/components/settings/generation-settings-panel.tsx` | Component | Create |
| 7 | `apps/web/src/app/(dashboard)/settings/generation/page.tsx` | View | Create |
| 8 | `apps/server/src/__tests__/generation-preference.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-5 | faculty | Required | Settings layout at `/settings/` must exist |
| STORY-F-16 | faculty | Required | `user_preferences` table must exist |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `express` -- Server framework
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `apps/server/src/errors/validation.error.ts` -- `ValidationError`
- `packages/types/src/auth/roles.types.ts` -- `AuthRole` enum
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>` envelope
- `apps/server/src/services/user/notification-preference.service.ts` -- shares `user_preferences` table

### Cross-Epic Integration (F-60)
The generation workbench (F-60) will read `effective_automation_level` to determine pipeline behavior. This story provides:
- `GenerationPreferenceService.getForUser(userId)` returning preferences + effective level
- Type definitions for automation levels and generation preferences

## 9. Test Fixtures (inline)

```typescript
import type {
  GenerationPreferences,
  AutomationLevel,
  UpdateGenerationPreferencesRequest,
} from "@journey-os/types";

/** Default generation preferences */
export const DEFAULT_GEN_PREFS: GenerationPreferences = {
  automation_level: "checkpoints",
  pause_before_critic: false,
  difficulty_distribution: { easy: 30, medium: 50, hard: 20 },
  bloom_focus: [2, 3, 4],
};

/** Custom generation preferences */
export const CUSTOM_GEN_PREFS: GenerationPreferences = {
  automation_level: "manual",
  pause_before_critic: true,
  difficulty_distribution: { easy: 20, medium: 40, hard: 40 },
  bloom_focus: [3, 4, 5, 6],
};

/** Valid partial update */
export const VALID_UPDATE: UpdateGenerationPreferencesRequest = {
  automation_level: "manual",
  pause_before_critic: true,
};

/** Invalid: unknown automation level */
export const INVALID_LEVEL_UPDATE = {
  automation_level: "turbo",
};

/** Invalid: difficulty distribution not summing to 100 */
export const INVALID_DISTRIBUTION_UPDATE: UpdateGenerationPreferencesRequest = {
  difficulty_distribution: { easy: 30, medium: 30, hard: 30 },
};

/** Invalid: bloom levels out of range */
export const INVALID_BLOOM_UPDATE: UpdateGenerationPreferencesRequest = {
  bloom_focus: [0, 7, 8],
};

/** Mock user ID */
export const MOCK_USER_ID = "user-uuid-001";

/** Mock institution with checkpoints minimum */
export const MOCK_INSTITUTION_SETTINGS = {
  min_automation_level: "checkpoints" as AutomationLevel,
};

/** Mock institution with no override */
export const MOCK_INSTITUTION_NO_OVERRIDE = {
  min_automation_level: null,
};

/** Mock user preferences row with generation prefs */
export const MOCK_PREFS_ROW = {
  id: "pref-uuid-001",
  user_id: MOCK_USER_ID,
  notification_preferences: {},
  generation_preferences: DEFAULT_GEN_PREFS,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/generation-preference.controller.test.ts`

```
describe("GenerationPreferenceController")
  describe("getPreferences")
    it returns default preferences when no generation_preferences exist (200)
    it returns stored preferences with effective level computed (200)
    it computes effective level as max(institution, user) (200)
    it returns 401 when not authenticated

  describe("updatePreferences")
    it updates automation level and returns new effective level (200)
    it rejects invalid automation level string (400 VALIDATION_ERROR)
    it rejects difficulty distribution not summing to 100 (400 VALIDATION_ERROR)
    it rejects bloom levels outside 1-6 range (400 VALIDATION_ERROR)

describe("GenerationPreferenceService")
  describe("computeEffectiveLevel")
    it returns user level when no institution override
    it returns institution level when stricter than user
    it returns user level when stricter than institution
  describe("validateDifficultyDistribution")
    it accepts distribution summing to 100
    it rejects distribution not summing to 100
```

**Total: ~13 tests** (8 controller + 5 service unit tests)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Generation settings are not part of the 5 critical user journeys. E2E coverage may be added when the generation workbench flow is tested end-to-end.

## 12. Acceptance Criteria

1. GET `/settings/generation` returns generation preferences with effective automation level
2. PUT `/settings/generation` performs a partial update on generation preferences
3. Effective automation level is computed as `max(institutionLevel, userLevel)` using strictness ranking
4. Institution override disables less-strict options in the radio group with explanation
5. Difficulty distribution must sum to 100; server returns 400 if not
6. Bloom focus levels must be integers between 1 and 6; server returns 400 for out-of-range
7. UI renders radio group for automation level, toggle for critic pause, sliders for difficulty
8. "Save Changes" button submits all form changes in a single PUT request
9. Disabled radio options show lock icon and explanation tooltip
10. All 13 API tests pass
11. Route protected by AuthMiddleware + RbacMiddleware requiring `AuthRole.FACULTY` or higher

## 13. Source References

| Claim | Source |
|-------|--------|
| Three automation levels | S-F-38-3: "full_auto, checkpoints, manual" |
| Institution override formula | S-F-38-3: "effectiveLevel = max(institutionLevel, userLevel)" |
| Strictness order | S-F-38-3: "manual > checkpoints > full_auto" |
| Interrupt preference | S-F-38-3: "Pause before critic scoring toggle" |
| Default generation params | S-F-38-3: "difficulty distribution, Bloom focus" |
| Saved to user_preferences JSONB | S-F-38-3: "Saved to user_preferences JSONB" |
| Workbench reads defaults | S-F-38-3: "Workbench reads defaults on load" |
| Settings URL /settings/generation | S-F-38-3 |
| Radio group for automation | S-F-38-3: "Radio group for automation" |
| Disabled options with explanation | S-F-38-3: "Show disabled options with explanation when institution is stricter" |
| Settings Template A design | Design spec: two-column, left nav, three-sheet hierarchy |
| Cross-epic F-60 dependency | S-F-38-3: "Cross-epic: F-60 (automation level config)" |

## 14. Environment Prerequisites

- **Supabase:** Project running, `user_preferences` table exists (from STORY-F-16)
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story
- **Settings layout** from STORY-F-5 must exist at `apps/web/src/app/(dashboard)/settings/`
- **institutions table** must have a `settings` JSONB column (may be NULL if not yet populated)

## 15. Implementation Notes

- **Shared table with F-16:** Both stories read/write `user_preferences`. F-16 creates the table and uses `notification_preferences` column. This story uses the `generation_preferences` column. No migration needed -- the column was created with `DEFAULT NULL` in F-16's migration.
- **Effective level computation:** Pure function, testable independently:

```typescript
export function computeEffectiveLevel(
  userLevel: AutomationLevel,
  institutionMinimum: AutomationLevel | null,
): AutomationLevel {
  if (institutionMinimum === null) return userLevel;
  const userStrictness = AUTOMATION_STRICTNESS[userLevel];
  const instStrictness = AUTOMATION_STRICTNESS[institutionMinimum];
  return userStrictness >= instStrictness ? userLevel : institutionMinimum;
}
```

- **Service class pattern:** Use JS `#private` fields for the Supabase client. Constructor DI matching existing service patterns.

```typescript
export class GenerationPreferenceService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }
}
```

- **Institution settings lookup:** Query `institutions` table for the user's `institution_id` to get `settings->>'min_automation_level'`. If the column or key is null, treat as no override.
- **Validation rules:**
  - `automation_level`: must be one of `AUTOMATION_LEVELS`
  - `difficulty_distribution`: all three values must be non-negative integers summing to 100
  - `bloom_focus`: array of integers each between 1-6, no duplicates
  - `pause_before_critic`: must be boolean
- **RbacMiddleware:** Use `AuthRole.FACULTY` -- same as notification preferences.
- **vi.hoisted()** needed for Supabase mock in tests.
- **Form save vs optimistic:** This story uses form-save pattern (not optimistic) because difficulty distribution requires coordinated validation (sum to 100). Save button is enabled only when form is dirty.
