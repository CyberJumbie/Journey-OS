# F-01: Authentication & Onboarding

## Description
Faculty, admins, advisors, and students authenticate via Supabase Auth with role-based routing to their persona-specific dashboard. Registration follows a multi-step wizard with FERPA consent and email verification. First-time users complete a persona-specific onboarding flow that introduces them to their primary workflows.

## Personas
- **SuperAdmin**: Logs in via `/login`, routed to `/super/dashboard`. No onboarding (pre-provisioned).
- **Institutional Admin**: Registers via invitation link from SuperAdmin. Onboarding covers setup wizard (seed frameworks, add faculty).
- **Faculty**: Registers with `@msm.edu` email validation. Onboarding: upload syllabus → watch extraction → generate first question → dashboard tour.
- **Advisor**: Registers via institution invitation. Onboarding covers cohort assignment and alert preferences (Tier 2).
- **Student**: Registers via institution invitation. Onboarding covers course enrollment and study preferences (Tier 2).

## Screens
- `Login.tsx` — Split-panel (Template C), woven thread motif, role-based redirect
- `RoleSelection.tsx` — Split-panel, choose registration type
- `Registration.tsx` — Split-panel, 4-step wizard, FERPA consent
- `StudentRegistration.tsx` — Split-panel, student-specific fields
- `FacultyRegistration.tsx` — Split-panel, faculty-specific fields + `@msm.edu` validation
- `AdminRegistration.tsx` — Split-panel, invitation-gated
- `ForgotPassword.tsx` — Split-panel, email-based reset
- `EmailVerification.tsx` — Split-panel, OTP/magic link confirmation
- `Onboarding.tsx` — Full-width (Template D), persona router
- `StudentOnboarding.tsx` — Full-width, study preferences
- `FacultyOnboarding.tsx` — Full-width, syllabus upload + first question
- `AdminOnboarding.tsx` — Full-width, framework seeding + faculty invitation

## Data Domains
- **Supabase**: `auth.users`, `user_profiles` (role, institution_id, is_course_director, onboarding_completed)
- **API**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- **RLS**: All tables scoped by `institution_id`; students additionally by `user_id`

## Dependencies
- None (foundational feature)

## Source References
- PRODUCT_BRIEF.md § Personas (role descriptions, usage patterns)
- ARCHITECTURE_v10.md § 3.1 (auth stack: Supabase Auth + JWT)
- ARCHITECTURE_v10.md § 3.3 (frontend: Next.js 15 App Router)
- ROADMAP_v2_3.md § Sprint 3 (auth flow deliverables)
- DESIGN_SPEC.md § 4.3 Template C (Split Panel — 9 auth screens)
- DESIGN_SPEC.md § 4.4 Template D (Full-Width — onboarding)
- WORKBENCH_SPEC_v2.md § 21 (5 roles + is_course_director flag)
- API_CONTRACT_v1.md § Auth endpoints
- SUPABASE_DDL_v1.md § user_profiles table
