# Plan: STORY-F-17 — Generation Settings

## Tasks (from brief, refined after codebase exploration)

| # | Task | File | Notes |
|---|------|------|-------|
| 1 | Define `GenerationPreferences` types | `packages/types/src/user/generation-preferences.types.ts` | New file per brief §3 |
| 2 | Update barrel exports | `packages/types/src/user/index.ts` | Add all new type exports |
| 3 | Rebuild types package | `packages/types/tsconfig.json` | `tsc -b` to emit `.d.ts` |
| 4 | Create error classes | `apps/server/src/errors/generation-preference.errors.ts` | `GenerationPreferenceValidationError` — follow `ProfileValidationError` pattern |
| 5 | Export errors from barrel | `apps/server/src/errors/index.ts` | Single Edit call with usage |
| 6 | Create `GenerationPreferenceService` | `apps/server/src/services/user/generation-preference.service.ts` | `#supabaseClient`, constructor DI, `getForUser()`, `update()`, `computeEffectiveLevel()` |
| 7 | Create `GenerationPreferenceController` | `apps/server/src/controllers/user/generation-preference.controller.ts` | GET + PUT handlers, `#handleError()`, `ApiResponse<T>` envelope |
| 8 | Register routes in Express app | `apps/server/src/index.ts` | Import + instantiate + register `/api/v1/settings/generation` GET/PUT with RBAC `AuthRole.FACULTY` |
| 9 | Add nav item to settings layout | `apps/web/src/app/(dashboard)/settings/layout.tsx` | Add `{ label: "Generation", href: "/settings/generation", enabled: true }` |
| 10 | Build `GenerationSettingsPanel` component | `apps/web/src/components/settings/generation-settings-panel.tsx` | Client component with radio group, switch, difficulty sliders, bloom checkboxes, save button |
| 11 | Build settings generation page | `apps/web/src/app/(dashboard)/settings/generation/page.tsx` | `export default`, fetch + loading/error/data states |
| 12 | Write API tests (13 tests) | `apps/server/src/__tests__/generation-preference.controller.test.ts` | 8 controller + 5 service unit tests |

## Implementation Order

Types (1-3) → Errors (4-5) → Service (6) → Controller (7) → Routes (8) → View (9-11) → Tests (12)

## Patterns to Follow

| Pattern | Solution Doc | Why |
|---------|-------------|-----|
| Profile service stack | `docs/solutions/profile-settings-page-pattern.md` | Identical self-service per-user resource; same auth, same CRUD shape |
| Supabase mock factory | `docs/solutions/supabase-mock-factory.md` | Separate chain objects per read/write operation in tests |
| React Hook Form + Zod | `docs/solutions/react-hook-form-zod-pattern.md` | Form save pattern with `isDirty`, `defaultValues` via RHF not Zod `.default()` |

### Existing code to mirror

- **Service:** `apps/server/src/services/profile/profile.service.ts` — `#private` fields, constructor DI, validation in private methods
- **Controller:** `apps/server/src/controllers/profile/profile.controller.ts` — auth extraction via `(req as unknown as Record<string, unknown>).user`, `#handleError()` dispatch, `ApiResponse<T>` envelope
- **Page:** `apps/web/src/app/(dashboard)/settings/profile/page.tsx` — loading/error/data states, `"use client"`, default export
- **Layout nav:** `apps/web/src/app/(dashboard)/settings/layout.tsx` — NAV_ITEMS array

## Key Decisions

1. **No repository layer** — The brief doesn't specify one and the data model is simple (single JSONB column on `user_preferences`). The service can query Supabase directly like simpler services do. If F-16's notification-preference service exists by implementation time, mirror its approach.

2. **No new migration** — Uses existing `user_preferences.generation_preferences` JSONB column from F-16.

3. **Institution lookup** — Service queries `institutions.settings->>'min_automation_level'` via the user's `institution_id` (from `profiles` table). If column/key is null → no override.

4. **RBAC** — `AuthRole.FACULTY` on both GET and PUT routes. Brief says "faculty+" which maps to `rbac.require(AuthRole.FACULTY)`.

5. **Difficulty sliders** — Three linked sliders constrained to sum 100. When one changes, proportionally adjust the others. Validate sum=100 server-side.

6. **Form save (not optimistic)** — Single "Save Changes" button batches all changes into one PUT. Required because difficulty distribution needs coordinated validation.

## Testing Strategy

### API tests (13 tests)
```
describe("GenerationPreferenceController")
  describe("getPreferences")
    ✓ returns default preferences when no generation_preferences exist (200)
    ✓ returns stored preferences with effective level computed (200)
    ✓ computes effective level as max(institution, user) (200)
    ✓ returns 401 when not authenticated

  describe("updatePreferences")
    ✓ updates automation level and returns new effective level (200)
    ✓ rejects invalid automation level string (400 VALIDATION_ERROR)
    ✓ rejects difficulty distribution not summing to 100 (400 VALIDATION_ERROR)
    ✓ rejects bloom levels outside 1-6 range (400 VALIDATION_ERROR)

describe("GenerationPreferenceService")
  describe("computeEffectiveLevel")
    ✓ returns user level when no institution override
    ✓ returns institution level when stricter than user
    ✓ returns user level when stricter than institution
  describe("validateDifficultyDistribution")
    ✓ accepts distribution summing to 100
    ✓ rejects distribution not summing to 100
```

### E2E: No — not part of the 5 critical user journeys

## Figma Make

- [ ] Prototype first
- [x] Code directly — UI is straightforward (radio group, switch, sliders, checkboxes, save button) using existing shadcn/ui primitives

## Risks / Edge Cases

1. **F-16 dependency** — `user_preferences` table and `generation_preferences` column must exist. Verify with `list_tables` before coding.
2. **Institution settings column** — `institutions.settings` JSONB may not have `min_automation_level` key yet. Service must handle null/missing gracefully.
3. **User has no profile row** — Need to handle case where `profiles` lookup for `institution_id` fails (user not yet onboarded).
4. **Upsert vs update** — First save for a user may need upsert on `user_preferences` row if F-16 hasn't created one yet. Check F-16's behavior.
5. **Barrel export stripping** — PostToolUse eslint hook may strip "unused" exports from `index.ts`. Re-read barrel after edit and verify exports intact.
6. **Bloom focus duplicates** — Validate no duplicate values in the bloom_focus array.
7. **Concurrent saves** — Two tabs saving simultaneously. Last-write-wins is acceptable for user preferences.

## Acceptance Criteria (verbatim from brief)

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
