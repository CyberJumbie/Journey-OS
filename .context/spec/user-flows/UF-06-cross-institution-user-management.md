# UF-06: Cross-Institution User Management

**Feature:** F-03 (User & Role Management)
**Persona:** SuperAdmin (Journey OS Team)
**Goal:** Manage users across all institutions — view, search, elevate/demote roles, and disable accounts platform-wide

## Preconditions
- SuperAdmin is logged in at `/super/dashboard`
- At least one institution with users exists

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/super/dashboard` | Click "Users" in super sidebar | Navigate to `/super/users` |
| 2 | `/super/users` | See cross-institution user table: name, email, institution, role, status | All users across all institutions visible |
| 3 | `/super/users` | Filter by institution dropdown | Table filtered to selected institution |
| 4 | `/super/users` | Search by name or email | Results filtered in real-time |
| 5 | `/super/users` | Click user row | User detail panel with full profile |
| 6 | `/super/users` (detail) | Change role (e.g., faculty → institutional_admin) | Confirmation dialog, role updated across both Supabase and JWT claims |
| 7 | `/super/users` (detail) | Click "Disable Account" | User disabled, all active sessions invalidated |

## Error Paths
- **No users match search**: Step 4 — "No users found matching '[query]'" empty state
- **Disable last institution admin**: Step 7 — "This is the only admin for [Institution]. Promote another user first."
- **Cross-institution role conflict**: Step 6 — Changing to superadmin requires additional confirmation

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/users` | Step 2 — fetch all users (SuperAdmin bypasses institution_id filter) |
| GET | `/api/v1/users?institution_id=xxx` | Step 3 — filter by institution |
| PATCH | `/api/v1/users/:id` | Step 6 — change role |
| DELETE | `/api/v1/users/:id` | Step 7 — disable account |

## Test Scenario (Playwright outline)
Login as: SuperAdmin
Steps:
1. Navigate to `/super/users`
2. Verify users from multiple institutions appear
3. Filter by institution
4. Search for specific user
5. Change a user's role
Assertions:
- Table shows users across institutions (no institution_id RLS restriction)
- Role change persisted in user_profiles
- Filter correctly isolates by institution

## Source References
- PERSONA-SUPERADMIN.md § Permissions (manage all users across institutions)
- ARCHITECTURE_v10.md § 4.1 (SuperAdmin bypasses RLS)
- PERSONA-MATRIX.md § Administration (manage users all institutions)
