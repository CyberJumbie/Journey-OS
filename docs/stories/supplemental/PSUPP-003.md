# PSUPP-003: Admin Registration (/register/admin)
**Group:** Auth & User Management
**Component:** `AdminRegistration` | `pages/auth/AdminRegistration.tsx`
**Priority:** P1
**Depends:** none
**Specialist:** @backend-specialist

**As a** new platform administrator
**I want** to register with an access code
**So that** admin accounts are protected from unauthorized self-registration

## Acceptance Criteria
- Route: `/register/admin`
- Fields: name, email, password, institution name, **admin access code** (one-time code)
- Access code validated server-side: `POST /api/v1/auth/register/admin`
  - Backend checks `admin_access_codes` table — single-use codes pre-seeded by superadmin
  - On match: creates auth.users + user_profiles with role = institution_admin
  - Marks code as used (used_at, used_by)
- Success → `/onboarding/admin`
- Invalid code → "Invalid or already used access code" error
- `admin_access_codes` table: `{ id, code TEXT UNIQUE, used_at TIMESTAMPTZ, used_by UUID }`
- Superadmin creates codes via CLI script: `pnpm tsx scripts/create-admin-code.ts`

## Files to Create
- `backend/src/controllers/admin-auth.controller.ts`
- `backend/src/routes/admin-auth.routes.ts`
- `scripts/create-admin-code.ts`
- Migration: `admin_access_codes` table

## Smoke Test
```bash
# Create a code
pnpm tsx scripts/create-admin-code.ts --email superadmin@msm.edu

# Register with it
curl -X POST "localhost:3001/api/v1/auth/register/admin" \
  -d '{"name":"Dr. Admin","email":"admin@msm.edu","password":"Secure123!","institutionName":"MSM","accessCode":"ABC-123-DEF"}'
# Expected: 201, user created, redirected to /onboarding/admin

# Try same code again
# Expected: 400 "Access code already used"
```
