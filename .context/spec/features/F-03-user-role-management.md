# F-03: User & Role Management

## Description
Institutional admins manage users within their institution: inviting faculty, assigning roles, toggling the Course Director flag, and deactivating accounts. SuperAdmin manages users across all institutions. The RBAC system enforces five roles (superadmin, institutional_admin, faculty, advisor, student) with Course Director as a permission flag, not a separate role.

## Personas
- **SuperAdmin**: Manages users across all institutions. Can elevate/demote any user.
- **Institutional Admin**: Manages users within own institution. Invites faculty, assigns roles, toggles `is_course_director`.

## Screens
- `FacultyManagement.tsx` — Template B (Admin Shell), user list with role badges, invite button, bulk actions
- `Profile.tsx` — Template A (Dashboard Shell), personal profile view/edit

## Data Domains
- **Supabase**: `user_profiles` (id, auth_user_id, institution_id, role, is_course_director, first_name, last_name, email, avatar_url, onboarding_completed)
- **API**: `GET /api/v1/users`, `POST /api/v1/users/invite`, `PATCH /api/v1/users/:id`, `DELETE /api/v1/users/:id`
- **RLS**: institution_id scoping for all non-SuperAdmin queries
- **JWT**: Includes role and is_course_director claims

## Dependencies
- **F-01**: Authentication (user creation)
- **F-02**: Institution Management (institution must exist)

## Source References
- WORKBENCH_SPEC_v2.md § 21 (5 roles + is_course_director flag, R-023)
- ARCHITECTURE_v10.md § 3.1 (JWT middleware, role middleware)
- ROADMAP_v2_3.md § Sprint 3 (auth + role hierarchy)
- SUPABASE_DDL_v1.md § user_profiles table
- PERSONA-MATRIX.md § Administration capabilities
- DESIGN_SPEC.md § 5.1 Group L (Admin Backend screens)
