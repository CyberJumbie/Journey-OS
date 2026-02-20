# STORY-U-8: Registration Wizard

**Epic:** E-02 (Registration & Onboarding)
**Feature:** F-01 (Authentication & Onboarding)
**Sprint:** 3
**Lane:** universal (P0)
**Size:** L
**Old ID:** S-U-02-1

---

## User Story
As a **new user**, I need a multi-step registration wizard that captures my role, profile information, institution, and FERPA consent so that I can create a fully configured account in one flow.

## Acceptance Criteria
- [ ] 4-step wizard: Role Selection -> Profile Info -> Institution Association -> FERPA Consent
- [ ] Step 1: Role selection from available personas (faculty, student, advisor)
- [ ] Step 2: Name, email, password with validation (8+ chars, uppercase, number)
- [ ] Step 3: Institution search/select or request new institution
- [ ] Step 4: FERPA consent checkbox with full disclosure text, timestamp recorded
- [ ] Form state persisted across steps (no data loss on back navigation)
- [ ] Server-side validation on submission via registration controller
- [ ] RegistrationService creates Supabase auth user + profile record
- [ ] DualWriteService: Supabase user profile first, Neo4j Person node second
- [ ] Registration triggers email verification (STORY-U-14)
- [ ] Error handling: duplicate email, invalid institution, network failures
- [ ] Responsive design using design tokens from packages/ui
- [ ] 15 API tests: validation per step, duplicate email, successful registration, FERPA consent tracking, dual-write verification, institution association, role assignment
- [ ] 1 E2E test: complete registration flow end-to-end

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md` for full mapping.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/auth/Registration.tsx` | `apps/web/src/app/(auth)/register/page.tsx` | Convert from React Router to Next.js App Router; replace inline styles with Tailwind design tokens; extract wizard stepper into packages/ui molecule; 4-step form with URL-based step tracking |
| `pages/auth/RoleSelection.tsx` | `apps/web/src/app/(auth)/register/steps/role-step.tsx` | Role card selection UI; extract role cards into organisms; use AuthRole enum from packages/types |
| `pages/auth/FacultyRegistration.tsx` | `apps/web/src/app/(auth)/register/steps/profile-step.tsx` | Faculty-specific profile fields; merge with generic profile step; conditional fields based on selected role |
| `pages/auth/AdminRegistration.tsx` | `apps/web/src/app/(auth)/register/steps/profile-step.tsx` | Admin profile fields; merge into shared profile step (admin cannot self-register but UI pattern reused) |
| `pages/auth/StudentRegistration.tsx` | `apps/web/src/app/(auth)/register/steps/profile-step.tsx` | Student-specific fields (expected graduation, program year); merge into shared profile step |
| `components/shared/woven-field.tsx` | `packages/ui/src/atoms/woven-field.tsx` | Shared canvas background pattern; named export; design token colors |

Also reference: `05-reference/screens/journey-os-login.jsx` for auth page design patterns (split-panel layout, typography, color system).

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/auth/registration.types.ts` |
| Model | apps/server | `src/models/user-profile.model.ts` |
| Repository | apps/server | `src/repositories/user-profile.repository.ts` |
| Service | apps/server | `src/services/auth/registration.service.ts` |
| Controller | apps/server | `src/controllers/auth/registration.controller.ts` |
| Routes | apps/server | `src/routes/auth.routes.ts` |
| View | apps/web | `src/app/(auth)/register/page.tsx`, `src/app/(auth)/register/steps/role-step.tsx`, `src/app/(auth)/register/steps/profile-step.tsx`, `src/app/(auth)/register/steps/institution-step.tsx`, `src/app/(auth)/register/steps/consent-step.tsx` |
| Molecules | packages/ui | `src/molecules/wizard-stepper.tsx` |
| Atoms | packages/ui | `src/atoms/password-input.tsx`, `src/atoms/woven-field.tsx` |
| Organisms | apps/web | `src/components/auth/auth-brand-panel.tsx`, `src/components/auth/role-card.tsx` |
| Tests | apps/server | `src/controllers/auth/__tests__/registration.controller.test.ts`, `src/services/auth/__tests__/registration.service.test.ts` |
| E2E | apps/web | `e2e/registration.spec.ts` |

## Database Schema

**Supabase:**
```sql
-- profiles table (create if not exists)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'institutional_admin', 'faculty', 'student', 'advisor')),
    institution_id UUID REFERENCES institutions(id),
    avatar_url TEXT,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    ferpa_consent_at TIMESTAMPTZ,
    ferpa_consent_version TEXT,
    ferpa_consent_ip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

**Neo4j:**
```cypher
// Person node (dual-write target)
MERGE (p:Person {id: $userId})
SET p.email = $email, p.full_name = $fullName, p.role = $role, p.institution_id = $institutionId

// Relationships
(p:Person)-[:BELONGS_TO]->(i:Institution)
```

## API Endpoints

### POST /api/v1/auth/register
**Auth:** Public (no JWT required)
**Request:**
```json
{
  "role": "faculty",
  "full_name": "Dr. Jane Smith",
  "email": "jane.smith@med.edu",
  "password": "SecurePass123!",
  "institution_id": "uuid-inst",
  "ferpa_consent": true,
  "ferpa_consent_version": "1.0"
}
```
**Success Response (201):**
```json
{
  "data": {
    "id": "uuid-new-user",
    "email": "jane.smith@med.edu",
    "role": "faculty",
    "email_verified": false,
    "message": "Registration successful. Please check your email to verify your account."
  },
  "error": null
}
```
**Error Responses:**
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Missing fields, weak password, invalid email format |
| 409 | `DUPLICATE_EMAIL` | Email already registered |
| 404 | `INSTITUTION_NOT_FOUND` | Invalid institution_id |

### GET /api/v1/institutions/search?q=morehouse
**Auth:** Public (for registration step 3)
**Response:** List of matching institutions for the institution search/select step.

## Dependencies
- **Blocked by:** STORY-U-1 (Supabase Auth Setup), STORY-U-3 (Express Auth Middleware)
- **Blocks:** STORY-U-13 (Persona Onboarding), STORY-U-14 (Email Verification)
- **Cross-lane:** STORY-U-9 (Invitation Acceptance reuses registration UI patterns)

## Testing Requirements
- 15 API tests:
  1. Step 1 validation: role must be faculty/student/advisor
  2. Step 2 validation: name required
  3. Step 2 validation: email format
  4. Step 2 validation: password strength (8+ chars, uppercase, number)
  5. Step 3 validation: valid institution_id required
  6. Step 4 validation: FERPA consent required (true)
  7. Successful registration creates auth.users record
  8. Successful registration creates profiles record
  9. DualWrite creates Neo4j Person node
  10. sync_status set correctly on dual-write
  11. Duplicate email returns 409
  12. Invalid institution returns 404
  13. FERPA consent timestamp and version recorded
  14. Role set in app_metadata (not user_metadata)
  15. Email verification triggered after registration
- 1 E2E test: complete 4-step registration wizard flow

## Implementation Notes
- DualWriteService pattern: Supabase first -> Neo4j second -> sync_status = 'synced'.
- Wizard state managed with React context or URL params, not global store. See `docs/solutions/multi-step-wizard-pattern.md`.
- FERPA consent must record: version, timestamp, IP address for compliance audit.
- Institution association: if institution not found, surface waitlist option (links to E-04).
- SuperAdmin and Institutional Admin cannot self-register; they are invited (STORY-U-9).
- The prototype files show a split-panel layout (Template C) consistent across all auth pages.
- Replace all hardcoded hex values with CSS custom properties / design tokens.
- Use `@web/*` path alias for imports in apps/web (not `@/*`).
- When seeding auth.users via raw SQL, use empty strings (`''`) not NULL for varchar token columns.
