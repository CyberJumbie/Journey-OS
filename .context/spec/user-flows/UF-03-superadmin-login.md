# UF-03: SuperAdmin Login

**Feature:** F-01 (Authentication & Onboarding)
**Persona:** SuperAdmin (Journey OS Team)
**Goal:** Log in and access the super dashboard for platform-wide management

## Preconditions
- SuperAdmin account pre-provisioned (not created via registration flow)
- Valid credentials exist

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/login` | Enter email and password | Credentials validated |
| 2 | `/login` | Click "Sign In" | JWT issued with `role: superadmin`, redirect based on role |
| 3 | `/super/dashboard` (SuperDashboard) | Auto-redirected | See system-wide KPIs: total institutions, pending waitlist, active users, system health |

## Error Paths
- **Invalid credentials**: Step 2 — "Invalid email or password" (generic message, no email enumeration)
- **Account locked**: Step 2 — "Account temporarily locked. Try again in 15 minutes." (after 5 failed attempts)
- **Network error**: Step 2 — Toast "Unable to connect. Check your internet connection."

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| POST | `/api/auth/login` | Step 2 — authenticate |
| GET | `/api/auth/me` | Step 3 — fetch profile for role-based redirect |

## Test Scenario (Playwright outline)
Login as: Pre-provisioned superadmin
Steps:
1. Navigate to `/login`
2. Enter superadmin credentials
3. Submit form
4. Verify redirect to `/super/dashboard`
Assertions:
- URL is `/super/dashboard`
- System KPI strip visible with institution count

## Source References
- DESIGN_SPEC.md § SuperAdmin routes
- ARCHITECTURE_v10.md § 4.1 (role hierarchy)
- PERSONA-MATRIX.md § SuperAdmin (no onboarding — pre-provisioned)
