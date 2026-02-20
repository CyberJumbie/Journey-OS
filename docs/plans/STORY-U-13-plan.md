# Plan: STORY-U-13 — Persona Onboarding Screens

## Tasks (implementation order)

1. **Types** — Create `OnboardingStep`, `OnboardingConfig`, `OnboardingStatus`, `OnboardingCompleteRequest`, `OnboardingCompleteResult` in `packages/types/src/auth/onboarding.types.ts`. Export from `packages/types/src/auth/index.ts`. Rebuild types with `tsc -b`.
2. **Service** — Create `OnboardingService` in `apps/server/src/services/auth/onboarding.service.ts` with `getStatus(userId)` and `markComplete(userId, skipped)`. Constructor DI: `supabaseClient`. Queries `profiles` table.
3. **Controller** — Create `OnboardingController` in `apps/server/src/controllers/auth/onboarding.controller.ts` with `handleGetStatus(req, res)` and `handleComplete(req, res)`. Extracts `userId` from `req.user.sub`.
4. **Routes** — Wire protected routes in `apps/server/src/index.ts` AFTER auth middleware: `GET /api/v1/onboarding/status` and `POST /api/v1/onboarding/complete`. No RBAC — all authenticated roles can access.
5. **Onboarding config** — Create `apps/web/src/config/onboarding.config.ts` with data-driven step definitions per role (5 roles × 3 steps each). Typed as `Record<string, OnboardingConfig>`.
6. **Frontend page** — Create `apps/web/src/app/(protected)/onboarding/page.tsx` (default export). Wraps `OnboardingFlow` in Suspense.
7. **Frontend component** — Create `apps/web/src/components/onboarding/onboarding-flow.tsx` (client component). States: loading → redirect (if already completed) → welcome → steps → complete/skipped.
8. **Service tests** — `apps/server/src/services/auth/__tests__/onboarding.service.test.ts` (~7 tests)
9. **Controller tests** — `apps/server/src/controllers/auth/__tests__/onboarding.controller.test.ts` (~5 tests)

## Critical Field Name Correction

The brief says `onboarding_completed` but the actual DB column and TypeScript type is **`onboarding_complete`**. All code must use `onboarding_complete`.

## Implementation Order

Types → Service → Controller → Routes → Config → View → Tests

## Patterns to Follow

- `docs/solutions/public-auth-route-pattern.md` — Route wiring pattern (but these are PROTECTED, not public)
- `docs/solutions/supabase-mock-factory.md` — Supabase mock pattern for tests
- Existing controller pattern from `invitation-acceptance.controller.ts` — ApiResponse envelope, error mapping
- Existing service pattern from `invitation-acceptance.service.ts` — Constructor DI with supabaseClient

## Existing Code to Reuse

| What | Where |
|------|-------|
| `ApiResponse<T>` | `packages/types/src/auth/auth.types.ts` |
| `AuthTokenPayload` (has `sub`, `role`) | `packages/types/src/auth/auth.types.ts` |
| `getSupabaseClient()` | `apps/server/src/config/supabase.config.ts` |
| `createAuthMiddleware()` | `apps/server/src/middleware/auth.middleware.ts` |
| Protected layout | `apps/web/src/app/(protected)/layout.tsx` |
| `onboarding_complete` column | `profiles` table (already exists, boolean DEFAULT false) |

## Testing Strategy

- **API tests (~12):**
  - Service (7): getStatus returns false for new user, getStatus returns true for onboarded user, getStatus includes role, markComplete sets flag, markComplete updates timestamp, markComplete returns result, markComplete is idempotent
  - Controller (5): GET /status 200, POST /complete 200, POST /complete with skipped=true, handles missing user (500), returns correct ApiResponse envelope
- **E2E:** Not required. Full onboarding journey E2E deferred until all upstream stories testable.

## Figma Make

- [ ] Code directly — uses existing auth layout patterns, simple card-based UI

## Risks / Edge Cases

- **Field name mismatch:** Brief says `onboarding_completed`, actual DB column is `onboarding_complete`. Must use correct name everywhere.
- **Race condition:** User clicks "Complete" twice. Service uses `.eq('id', userId)` which is idempotent — safe.
- **No profile found:** User authenticated but profile missing (edge case from auth trigger failure). Service should handle gracefully.
- **Redirect loop:** If onboarding page redirects to dashboard, and dashboard redirects back to onboarding for incomplete users, ensure the check is one-way (onboarding page checks status, dashboard does NOT redirect back).
- **Lucide icons:** Dynamic icon import could increase bundle size. Use a static mapping object instead of dynamic `import()`.

## Acceptance Criteria (from brief)

1. Onboarding shown on first login only (checked via `onboarding_complete` flag)
2. SuperAdmin sees: platform overview, pending applications queue link
3. Institutional Admin sees: institution setup checklist, framework import, user invitation guide
4. Faculty sees: course assignment overview, content tools, generation workbench preview
5. Student sees: enrolled courses, learning path overview, practice tools intro
6. Advisor sees: student roster preview, monitoring tools, alert settings
7. Skip button available on all screens (sets `onboarding_complete = true`)
8. Progress indicator showing current step / total steps
9. Responsive layout using Atomic Design (OnboardingCard organism, StepIndicator molecule)
10. Onboarding content is data-driven (JSON config per role)
11. Completed onboarding redirects to role-appropriate dashboard
12. All ~12 API tests pass
