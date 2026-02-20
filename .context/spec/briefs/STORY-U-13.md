# STORY-U-13: Persona Onboarding Screens

**Epic:** E-02 (Registration & Onboarding)
**Feature:** F-01 (Authentication & Onboarding)
**Sprint:** 3
**Lane:** universal (P0)
**Size:** M
**Old ID:** S-U-02-3

---

## User Story
As a **newly registered user**, I need role-specific onboarding screens that guide me through initial setup so that I understand the platform capabilities relevant to my role.

## Acceptance Criteria
- [ ] Onboarding shown on first login only (tracked via `onboarding_completed` flag)
- [ ] SuperAdmin onboarding: platform overview, pending applications queue link
- [ ] Institutional Admin onboarding: institution setup checklist, framework import prompt, user invitation guide
- [ ] Faculty onboarding: course assignment overview, content tools introduction, generation workbench preview
- [ ] Student onboarding: enrolled courses, learning path overview, practice tools intro
- [ ] Advisor onboarding: student roster preview, monitoring tools, alert settings
- [ ] Skip button available on all screens (sets onboarding_completed = true)
- [ ] Progress indicator showing current step / total steps
- [ ] Responsive layout using Atomic Design: organisms for each onboarding card
- [ ] 8 API tests: flag check, flag set, per-role content rendering, skip action, re-entry prevention

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md` for full mapping.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/auth/PersonaOnboarding.tsx` | `apps/web/src/app/(protected)/onboarding/page.tsx` | Convert to Next.js App Router; role-based content rendering via server component; redirect if onboarding_completed=true; replace inline styles with Tailwind design tokens |
| `pages/onboarding/Onboarding.tsx` | `apps/web/src/app/(protected)/onboarding/page.tsx` | Merge with PersonaOnboarding; serves as the entry point layout; step navigation logic |
| `pages/onboarding/FacultyOnboarding.tsx` | `apps/web/src/app/(protected)/onboarding/steps/faculty-intro.tsx` | Faculty-specific onboarding content: course tools, generation workbench preview; convert to organism component |
| `pages/onboarding/AdminOnboarding.tsx` | `apps/web/src/app/(protected)/onboarding/steps/admin-setup.tsx` | Admin onboarding: institution setup checklist, framework import, user invitation; convert to organism |
| `pages/onboarding/StudentOnboarding.tsx` | `apps/web/src/app/(protected)/onboarding/steps/student-intro.tsx` | Student onboarding: enrolled courses, learning path, practice tools; convert to organism |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/auth/onboarding.types.ts` |
| Service | apps/server | `src/services/auth/onboarding.service.ts` |
| Controller | apps/server | `src/controllers/auth/onboarding.controller.ts` |
| View | apps/web | `src/app/(protected)/onboarding/page.tsx`, `src/app/(protected)/onboarding/steps/superadmin-welcome.tsx`, `src/app/(protected)/onboarding/steps/admin-setup.tsx`, `src/app/(protected)/onboarding/steps/faculty-intro.tsx`, `src/app/(protected)/onboarding/steps/student-intro.tsx`, `src/app/(protected)/onboarding/steps/advisor-intro.tsx` |
| Molecules | packages/ui | `src/molecules/step-indicator.tsx` |
| Organisms | packages/ui | `src/organisms/onboarding-card.tsx` |
| Tests | apps/server | `src/services/auth/__tests__/onboarding.service.test.ts` |

## Database Schema

**Supabase (profiles table update):**
```sql
-- The onboarding_completed column should already exist from STORY-U-8
-- If not: ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;
```

No Neo4j changes.

## API Endpoints

### GET /api/v1/auth/onboarding/status
**Auth:** Required (JWT)
**Success Response (200):**
```json
{
  "data": {
    "onboarding_completed": false,
    "role": "faculty",
    "steps": [
      { "key": "welcome", "title": "Welcome to Journey OS", "completed": true },
      { "key": "course-tools", "title": "Course Tools Overview", "completed": false },
      { "key": "generation", "title": "Generation Workbench", "completed": false }
    ]
  },
  "error": null
}
```

### POST /api/v1/auth/onboarding/complete
**Auth:** Required (JWT)
**Request:**
```json
{ "step": "welcome" }
```
**Success Response (200):**
```json
{ "data": { "onboarding_completed": false, "completed_steps": ["welcome"] }, "error": null }
```

### POST /api/v1/auth/onboarding/skip
**Auth:** Required (JWT)
**Success Response (200):**
```json
{ "data": { "onboarding_completed": true }, "error": null }
```

## Dependencies
- **Blocked by:** STORY-U-8 (Registration Wizard), STORY-U-9 (Invitation Acceptance)
- **Blocks:** none
- **Cross-lane:** STORY-IA-6 (framework import step references onboarding)

## Testing Requirements
- 8 API tests:
  1. GET status returns correct onboarding state for new user
  2. GET status returns onboarding_completed=true for completed user
  3. POST complete marks individual step as done
  4. POST skip sets onboarding_completed=true immediately
  5. Completed user is not shown onboarding again (re-entry prevention)
  6. Faculty gets faculty-specific steps
  7. Admin gets admin-specific steps
  8. Student gets student-specific steps
- 0 E2E tests

## Implementation Notes
- Atomic Design: OnboardingCard is an organism, StepIndicator is a molecule.
- Onboarding content should be data-driven (JSON config per role), not hardcoded JSX.
- The `onboarding_completed` flag lives in profiles table (Supabase).
- Design tokens only for all spacing, colors, and typography.
- The prototype shows card-based step layouts with illustrations and descriptions.
- Each persona has 3-5 onboarding steps specific to their role capabilities.
- Use `@web/*` path alias for imports in apps/web.
- Named exports only for all components.
