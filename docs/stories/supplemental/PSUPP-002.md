# PSUPP-002: Role Selection (/role-selection)
**Group:** Auth & User Management
**Component:** `RoleSelection` | `pages/auth/RoleSelection.tsx`
**Priority:** P1 — entry point for self-registration flow
**Depends:** none
**Specialist:** @frontend-specialist

**As a** new user visiting the platform
**I want** to choose my role before registering
**So that** I'm directed to the correct registration form and onboarding

## Acceptance Criteria
- Route: `/role-selection` — accessible pre-auth
- Three role cards: **Student**, **Faculty**, **Institution / Admin**
- Each card: role name, 2-line description, icon, "Register as →" button
- Student card → `/register/student`
- Faculty card → `/register/faculty`
- Institution / Admin card → `/register/admin`
- Already have an account? → `/login` link
- Invited by your institution? → `/invite/accept` guidance text
- No backend endpoint needed — purely navigational

## Files to Create/Modify
- `frontend/src/app/role-selection/page.tsx` (already exists as component, ensure routed correctly)

## Notes
- This is the canonical landing point from `/` "Get Started" CTA
- Do NOT show this screen to authenticated users — middleware redirect to dashboard
