# UF-05: User & Role Management

**Feature:** F-03 (User & Role Management)
**Persona:** Institutional Admin — Dr. Kenji Takahashi
**Goal:** Invite a new faculty member, assign them to courses, and toggle Course Director flag

## Preconditions
- Inst Admin is logged in at `/admin`
- Institution is approved and configured
- At least one course exists (F-04)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/admin` (AdminDashboard) | Click "Faculty" in admin sidebar | Navigate to `/admin/users` |
| 2 | `/admin/users` (FacultyManagement) | See user table: name, email, role, status, last active | Table populated with current institution users |
| 3 | `/admin/users` | Click "Invite Faculty" button | Invite modal opens |
| 4 | `/admin/users` (modal) | Enter email, select role (faculty), optionally check "Course Director" | Form validated |
| 5 | `/admin/users` (modal) | Click "Send Invitation" | Invitation created, email sent, modal closes |
| 6 | `/admin/users` | See new row in table: invited user with "Pending" status badge | Success toast: "Invitation sent to [email]" |
| 7 | `/admin/users` | Click existing user row | User detail panel opens (side sheet or modal) |
| 8 | `/admin/users` (detail) | Toggle "Course Director" switch | Confirmation: "Grant Course Director permissions to [name]?" |
| 9 | `/admin/users` (detail) | Confirm toggle | `is_course_director` updated, JWT refreshed on next login, success toast |
| 10 | `/admin/users` (detail) | Change role dropdown (e.g., faculty → institutional_admin) | Confirmation dialog with implications |
| 11 | `/admin/users` (detail) | Click "Deactivate User" | Confirmation: "This will revoke access. Proceed?" → user disabled |

## Error Paths
- **Duplicate email**: Step 5 — "A user with this email already exists in your institution"
- **Email outside institution domain**: Step 4 — Warning "This email is outside your institution domain. Continue anyway?"
- **Self-demotion**: Step 10 — "You cannot change your own role" (prevented in UI)
- **Last admin demotion**: Step 10 — "Cannot remove the last admin. Promote another user first."
- **Deactivate user with active courses**: Step 11 — "This user is assigned to active courses. Reassign them first?" with course list

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/users` | Step 2 — fetch institution users |
| POST | `/api/v1/users/invite` | Step 5 — send invitation |
| PATCH | `/api/v1/users/:id` | Step 9 — toggle is_course_director |
| PATCH | `/api/v1/users/:id` | Step 10 — change role |
| DELETE | `/api/v1/users/:id` | Step 11 — deactivate (soft delete) |

## Test Scenario (Playwright outline)
Login as: Inst Admin (Dr. Kenji Takahashi)
Steps:
1. Navigate to `/admin/users`
2. Click "Invite Faculty", enter test email
3. Verify invitation appears in table
4. Click existing faculty user, toggle Course Director
5. Verify toggle reflected in UI
Assertions:
- Invitation record created with correct institution_id
- User's `is_course_director` field updated in user_profiles
- Table shows updated role badge

## Source References
- WORKBENCH_SPEC_v2.md § 21 (5 roles + is_course_director, R-023)
- ARCHITECTURE_v10.md § 3.1 (JWT middleware, role claims)
- DESIGN_SPEC.md § 5.1 Group L (FacultyManagement screen)
- API_CONTRACT_v1.md § Users endpoints
- PERSONA-INSTITUTIONAL-ADMIN.md § Key Workflows
