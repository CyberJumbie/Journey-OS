# PSUPP-024: Admin Onboarding Wizard (/onboarding/admin)
**Group:** Auth & User Management
**Component:** `AdminOnboarding` | `pages/onboarding/AdminOnboarding.tsx`
**Priority:** P1 — new institution admins (from PSUPP-003 or PSUPP-017 approval) need onboarding
**Depends:** PSUPP-003 (admin registration), PSUPP-015/017 (institution provisioning)
**Specialist:** @frontend-specialist

**As a** newly activated Institution Admin
**I want** a guided setup wizard
**So that** my institution is configured (courses created, faculty invited, frameworks enabled) before I hand the platform over to faculty

## Acceptance Criteria
- Route: `/onboarding/admin`
- Triggered: on first login when role = institution_admin AND onboarding_completed = false
- Steps:
  1. **Institution Setup** — confirm institution name, type, primary timezone
  2. **Framework Selection** — enable/disable framework families (USMLE on by default; LCME, ACGME optional)
  3. **Create Courses** — create 1–10 courses (code, name, term, year): reuses course creation form; can skip and do later
  4. **Invite Faculty** — enter email addresses + course assignments for first wave of faculty invites (fires PSUPP-001 magic link flow); can skip
  5. **Coverage Targets** — set institution-wide targets: min items per course, min coverage %, target Bloom distribution
  6. **Done** — summary of what was set up + links to /institution dashboard and /admin/users

- Coverage targets stored in `institution_settings JSONB` on institutions table
- Each step's completion persisted server-side (`PATCH /api/v1/users/me/onboarding`)
- Steps 3–5 skippable; steps 1–2 mandatory

## Files to Create
- `frontend/src/app/onboarding/admin/page.tsx`
- `frontend/src/components/organisms/AdminOnboardingWizard/AdminOnboardingWizard.tsx`
- `frontend/src/hooks/useAdminOnboarding.ts`

## Smoke Test
```bash
# Login as new institution admin (onboarding_completed=false)
# → redirect to /onboarding/admin
# Complete step 1 (institution name)
# Patch: PATCH /users/me/onboarding { step: 1, data: { institutionName: "MSM", timezone: "America/New_York" } }
# Skip steps 3-5
# Complete step 6 → redirect to /institution
```
