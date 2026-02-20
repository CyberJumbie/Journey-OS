# STORY-U-13 Brief: Persona Onboarding Screens

## 0. Lane & Priority

```yaml
story_id: STORY-U-13
old_id: S-U-02-3
lane: universal
lane_priority: 0
within_lane_order: 13
sprint: 3
size: M
depends_on:
  - STORY-U-8 (universal) — Registration Wizard ✅ DONE
  - STORY-U-9 (universal) — Invitation Acceptance Flow (redirects here after acceptance)
blocks:
  - STORY-IA-20 — Institutional Admin Dashboard
personas_served: [superadmin, institutional_admin, faculty, student, advisor]
epic: E-02 (Registration & Onboarding)
feature: F-01 (Authentication & Access)
user_flow: UF-02 (Registration & Onboarding)
```

## 1. Summary

Build **role-specific onboarding screens** shown to users on their first login after registration or invitation acceptance. Each persona (SuperAdmin, Institutional Admin, Faculty, Student, Advisor) sees tailored onboarding steps that introduce platform capabilities relevant to their role. Onboarding is tracked via an `onboarding_completed` flag on the user profile — once completed or skipped, the screens are not shown again.

This is the final step in the E-02 Registration & Onboarding pipeline: U-8 (registration) → U-9 (invitation acceptance) → **U-13 (onboarding)**.

Key constraints:
- Onboarding content is **data-driven** (JSON config per role), not hardcoded JSX
- Skip button available on all screens (sets `onboarding_completed = true`)
- Progress indicator showing current step / total steps
- Atomic Design: `OnboardingCard` is an organism, `StepIndicator` is a molecule
- Design tokens only for all spacing, colors, and typography
- Server-side flag check prevents re-entry after completion

## 2. Task Breakdown

1. **Types** — Create `OnboardingStep`, `OnboardingConfig`, `OnboardingStatus` in `packages/types/src/auth/onboarding.types.ts`
2. **Onboarding config** — Create JSON-driven config for each role's steps in `apps/web/src/config/onboarding.config.ts`
3. **Service** — `OnboardingService` with `getStatus()` and `markComplete()` methods
4. **Controller** — `OnboardingController` with `handleGetStatus()` and `handleComplete()` methods
5. **Routes** — Protected routes `GET /api/v1/onboarding/status` and `POST /api/v1/onboarding/complete`
6. **Frontend page** — `/onboarding` page with step navigation
7. **Frontend components** — `OnboardingCard` (organism), `StepIndicator` (molecule)
8. **Wire up** — Register routes in `apps/server/src/index.ts` after auth middleware
9. **API tests** — 8 tests covering flag check, flag set, role content, skip, re-entry

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/auth/onboarding.types.ts

/** A single onboarding step definition */
export interface OnboardingStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;         // Lucide icon name
  readonly action_label?: string; // Optional CTA button text
  readonly action_href?: string;  // Optional CTA link
}

/** Onboarding configuration for a specific role */
export interface OnboardingConfig {
  readonly role: string;
  readonly welcome_title: string;
  readonly welcome_subtitle: string;
  readonly steps: readonly OnboardingStep[];
}

/** Status response from the API */
export interface OnboardingStatus {
  readonly onboarding_completed: boolean;
  readonly role: string;
}

/** Request to mark onboarding as complete */
export interface OnboardingCompleteRequest {
  readonly skipped: boolean;
}

/** Result after marking onboarding complete */
export interface OnboardingCompleteResult {
  readonly user_id: string;
  readonly onboarding_completed: boolean;
  readonly completed_at: string;
}
```

## 4. Database Schema (inline, complete)

No new tables. Uses existing `profiles` table with `onboarding_completed` column.

```sql
-- Existing profiles table (from U-8 registration):
-- profiles.id UUID PK
-- profiles.email TEXT NOT NULL
-- profiles.full_name TEXT
-- profiles.role TEXT NOT NULL
-- profiles.institution_id UUID FK -> institutions(id)
-- profiles.onboarding_completed BOOLEAN DEFAULT false
-- profiles.created_at TIMESTAMPTZ
-- profiles.updated_at TIMESTAMPTZ

-- If onboarding_completed column doesn't exist yet, add it:
-- Migration: add_onboarding_completed_to_profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
```

## 5. API Contract (complete request/response)

### GET /api/v1/onboarding/status (Auth: any authenticated user)

**Success Response (200):**
```json
{
  "data": {
    "onboarding_completed": false,
    "role": "institutional_admin"
  },
  "error": null
}
```

### POST /api/v1/onboarding/complete (Auth: any authenticated user)

**Request Body:**
```json
{
  "skipped": false
}
```

**Success Response (200):**
```json
{
  "data": {
    "user_id": "user-uuid-1",
    "onboarding_completed": true,
    "completed_at": "2026-02-19T14:00:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Page: `/onboarding` (Protected layout)

**Route:** `apps/web/src/app/(protected)/onboarding/page.tsx`

**Component hierarchy:**
```
OnboardingPage (page.tsx — default export)
  └── OnboardingFlow (client component)
        ├── StepIndicator (molecule — shows current step / total)
        ├── OnboardingCard (organism — displays current step)
        │     ├── Icon (Lucide icon from step config)
        │     ├── Title (step title)
        │     ├── Description (step description)
        │     └── ActionButton (optional CTA linking to relevant page)
        ├── NavigationButtons
        │     ├── BackButton (hidden on step 1)
        │     ├── NextButton / FinishButton
        │     └── SkipButton ("Skip onboarding" — always visible)
        └── RoleWelcome (first screen — personalized welcome message)
```

**Role-specific step content:**

| Role | Steps |
|------|-------|
| SuperAdmin | 1. Platform Overview, 2. Pending Applications Queue, 3. User Management |
| Institutional Admin | 1. Institution Setup Checklist, 2. Framework Import Guide, 3. User Invitation Guide |
| Faculty | 1. Course Assignment Overview, 2. Content Tools Introduction, 3. Generation Workbench Preview |
| Student | 1. Enrolled Courses, 2. Learning Path Overview, 3. Practice Tools Introduction |
| Advisor | 1. Student Roster Preview, 2. Monitoring Tools, 3. Alert Settings |

**States:**
1. **Loading** — Check onboarding status from API
2. **Redirect** — If `onboarding_completed === true`, redirect to dashboard
3. **Welcome** — First screen with role-specific welcome message
4. **Steps** — Navigate through role-specific steps
5. **Complete** — Final step with "Get Started" button, marks complete
6. **Skipped** — Skip button clicked, marks complete, redirects to dashboard

**Design tokens:**
- Surface: White `#ffffff` card on Cream `#f5f3ef` background
- Step indicator: Navy Deep `#002c76` active dot, light gray inactive
- Action buttons: Green `#69a338` primary CTA
- Skip button: text-only, muted color
- Typography: Lora for card titles, Source Sans 3 for descriptions
- Spacing: 32px between cards, 16px internal padding
- Card: Parchment `#faf9f6` background with subtle border

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/auth/onboarding.types.ts` | Types | Create |
| 2 | `packages/types/src/auth/index.ts` | Types | Edit (add onboarding export) |
| 3 | Supabase migration (onboarding_completed column if needed) | Database | Apply via MCP |
| 4 | `apps/server/src/services/auth/onboarding.service.ts` | Service | Create |
| 5 | `apps/server/src/controllers/auth/onboarding.controller.ts` | Controller | Create |
| 6 | `apps/server/src/index.ts` | Routes | Edit (add protected onboarding routes) |
| 7 | `apps/web/src/config/onboarding.config.ts` | Config | Create |
| 8 | `packages/ui/src/components/onboarding/step-indicator.tsx` | Molecule | Create |
| 9 | `packages/ui/src/components/onboarding/onboarding-card.tsx` | Organism | Create |
| 10 | `apps/web/src/app/(protected)/onboarding/page.tsx` | View | Create |
| 11 | `apps/web/src/components/onboarding/onboarding-flow.tsx` | Component | Create |
| 12 | `apps/server/src/services/auth/__tests__/onboarding.service.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-U-8 | universal | **DONE** | Registration wizard creates user profile with `onboarding_completed=false` |
| STORY-U-9 | universal | **PENDING** | Invitation acceptance redirects to onboarding page |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client
- `express` — Server framework
- `vitest` — Testing
- `lucide-react` — Icons for onboarding step cards

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`, `AuthRole`

## 9. Test Fixtures (inline)

```typescript
// Mock user with onboarding incomplete
export const MOCK_USER_NEEDS_ONBOARDING = {
  sub: "user-uuid-1",
  email: "jsmith@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock user with onboarding already completed
export const MOCK_USER_ONBOARDED = {
  ...MOCK_USER_NEEDS_ONBOARDING,
  sub: "user-uuid-2",
};

// Mock profile record (onboarding not completed)
export const MOCK_PROFILE_NOT_ONBOARDED = {
  id: "user-uuid-1",
  email: "jsmith@msm.edu",
  role: "institutional_admin",
  onboarding_completed: false,
  updated_at: "2026-02-19T12:00:00Z",
};

// Mock profile record (onboarding completed)
export const MOCK_PROFILE_ONBOARDED = {
  id: "user-uuid-2",
  email: "faculty@msm.edu",
  role: "faculty",
  onboarding_completed: true,
  updated_at: "2026-02-19T14:00:00Z",
};

// Mock superadmin for role-specific content test
export const MOCK_SUPERADMIN = {
  ...MOCK_USER_NEEDS_ONBOARDING,
  sub: "sa-uuid-1",
  email: "admin@journeyos.com",
  role: "superadmin" as const,
  institution_id: "",
};

// Complete request
export const COMPLETE_REQUEST = { skipped: false };
export const SKIP_REQUEST = { skipped: true };
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/services/auth/__tests__/onboarding.service.test.ts`

```
describe("OnboardingService")
  describe("getStatus")
    ✓ returns onboarding_completed=false for new user
    ✓ returns onboarding_completed=true for onboarded user
    ✓ includes user role in status response

  describe("markComplete")
    ✓ sets onboarding_completed=true in profiles table
    ✓ updates updated_at timestamp
    ✓ returns result with user_id and completed_at
    ✓ is idempotent (calling twice does not error)

  describe("controller integration")
    ✓ GET /status returns 200 with status for authenticated user
    ✓ POST /complete returns 200 and sets flag
    ✓ POST /complete with skipped=true sets flag
    ✓ rejects unauthenticated requests (401)
    ✓ returns correct role-specific data
```

**Total: ~12 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this individual story. E2E coverage will be added when the full onboarding journey (register → accept invitation → onboarding → dashboard) is testable end-to-end.

## 12. Acceptance Criteria

1. Onboarding shown on first login only (checked via `onboarding_completed` flag)
2. SuperAdmin sees: platform overview, pending applications queue link
3. Institutional Admin sees: institution setup checklist, framework import, user invitation guide
4. Faculty sees: course assignment overview, content tools, generation workbench preview
5. Student sees: enrolled courses, learning path overview, practice tools intro
6. Advisor sees: student roster preview, monitoring tools, alert settings
7. Skip button available on all screens (sets `onboarding_completed = true`)
8. Progress indicator showing current step / total steps
9. Responsive layout using Atomic Design (OnboardingCard organism, StepIndicator molecule)
10. Onboarding content is data-driven (JSON config per role)
11. Completed onboarding redirects to role-appropriate dashboard
12. All ~12 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Role-specific onboarding | S-U-02-3 § User Story |
| onboarding_completed flag | S-U-02-3 § Notes: "lives in user_profiles table" |
| Data-driven content | S-U-02-3 § Notes: "JSON config per role, not hardcoded JSX" |
| Atomic Design | S-U-02-3 § Notes: "OnboardingCard is organism, StepIndicator is molecule" |
| Skip button | S-U-02-3 § Acceptance Criteria |
| Per-role step content | S-U-02-3 § Acceptance Criteria |
| Design tokens only | S-U-02-3 § Notes |
| Redirect after invitation | S-U-02-2 § Acceptance Criteria: "Redirect to persona onboarding" |

## 14. Environment Prerequisites

- **Supabase:** Project `hifqdotmnirepgscankl` running, `profiles` table with `onboarding_completed` column
- **Express:** Server running on port 3001 with auth middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story

## 15. Implementation Notes

- **Data-driven steps:** Create `apps/web/src/config/onboarding.config.ts` with an `OnboardingConfig` per role. The component reads the config for the user's role and renders steps dynamically.
- **Protected route:** Onboarding API endpoints require auth but NOT RBAC (all roles can access their own onboarding).
- **Redirect guard:** On the onboarding page, check `GET /api/v1/onboarding/status` on mount. If `onboarding_completed === true`, redirect to dashboard immediately.
- **Profile update:** `markComplete()` uses `supabase.from('profiles').update({ onboarding_completed: true, updated_at: new Date().toISOString() }).eq('id', userId)`.
- **Step navigation:** Use React state (`currentStep`) with Next/Back/Skip buttons. No URL-based steps — keep it simple with local state.
- **CTA links:** Some steps have optional action buttons (e.g., "View Pending Applications" for SuperAdmin). These link to the relevant page but don't mark onboarding as complete — user must click "Next" or "Finish".
- **Lucide icons:** Each step config specifies a Lucide icon name (e.g., `"layout-dashboard"`, `"users"`, `"book-open"`). Dynamically import or use a mapping object.
