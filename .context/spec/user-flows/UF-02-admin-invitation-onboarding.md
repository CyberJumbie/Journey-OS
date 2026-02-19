# UF-02: Admin Invitation & Onboarding

**Feature:** F-01 (Authentication & Onboarding)
**Persona:** Institutional Admin — Dr. Kenji Takahashi
**Goal:** Accept SuperAdmin invitation, register, and complete institution setup wizard (seed frameworks, invite faculty)

## Preconditions
- SuperAdmin has approved the institution (F-02)
- SuperAdmin has sent invitation email to designated admin
- Invitation link contains valid token

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | Email inbox | Click invitation link from Journey OS | Navigate to `/register/admin?token=xxx` |
| 2 | `/register/admin` (AdminRegistration) Step 1 | Institution name pre-filled (read-only), enter first/last name | Proceed to step 2 |
| 3 | `/register/admin` Step 2 | Create password | Proceed to step 3 |
| 4 | `/register/admin` Step 3 | Accept FERPA consent | Proceed to step 4 |
| 5 | `/register/admin` Step 4 | Review summary, click "Create Account" | Account created with `role: institutional_admin`, redirect to email verification |
| 6 | `/verify-email` | Enter OTP or click magic link | Email verified, redirect to onboarding |
| 7 | `/onboarding/admin` Step 1 (SetupWizard) | Welcome screen, institution setup overview | Click "Begin Setup" |
| 8 | `/onboarding/admin` Step 2 | Configure institution details (academic year, programs) | Saved to `institutions` table |
| 9 | `/onboarding/admin` Step 3 | Seed frameworks — select which to import (USMLE, LCME, ACGME, EPA, Bloom, Miller) | Idempotent seed runs, ~492 nodes created in Neo4j |
| 10 | `/onboarding/admin` Step 4 | Framework seeding progress bar | All selected frameworks show green checkmarks |
| 11 | `/onboarding/admin` Step 5 | Invite faculty — enter email addresses, assign roles | Invitation emails queued |
| 12 | `/onboarding/admin` Step 6 | Setup complete summary | Click "Go to Dashboard" |
| 13 | `/admin` (AdminDashboard) | Land on admin dashboard | See KPI strip, empty faculty list, framework counts |

## Error Paths
- **Invalid/expired invitation token**: Step 1 — "This invitation has expired. Contact your platform administrator."
- **Token already used**: Step 1 — "This invitation has already been used. Try signing in." with login link
- **Email mismatch**: Step 2 — Token email doesn't match entered email — "Please use the email this invitation was sent to"
- **Framework seeding fails**: Step 9 — "Failed to seed [framework]. Retry?" with retry button per framework
- **Faculty invite email invalid**: Step 11 — Inline email validation per row
- **Network timeout during seeding**: Step 10 — Progress bar pauses, auto-retry with "Retrying..." message

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/invitations/:token` | Step 1 — validate invitation token |
| POST | `/api/auth/register` | Step 5 — create admin account |
| POST | `/api/auth/verify-email` | Step 6 — verify OTP |
| PATCH | `/api/v1/institutions/:id` | Step 8 — update institution details |
| POST | `/api/v1/frameworks/seed` | Step 9 — seed selected frameworks |
| GET | `/api/v1/frameworks` | Step 10 — poll seeding status |
| POST | `/api/v1/users/invite` | Step 11 — send faculty invitations |
| PATCH | `/api/v1/users/:id` | Step 12 — set `onboarding_completed: true` |

## Test Scenario (Playwright outline)
Login as: New admin (create invitation via SuperAdmin API in beforeAll)
Steps:
1. Navigate to invitation URL with valid token
2. Complete registration form
3. Verify email via test OTP extraction
4. Run setup wizard (seed Bloom + Miller — smallest frameworks)
5. Invite one test faculty email
6. Verify landing on `/admin`
Assertions:
- User profile: `role: institutional_admin`, `onboarding_completed: true`
- Frameworks seeded: `BloomLevel` (6), `MillerLevel` (4) nodes exist in Neo4j
- Invitation record created for faculty email

## Source References
- DESIGN_SPEC.md § AdminOnboarding, SetupWizard
- ARCHITECTURE_v10.md § 3.1 (invitation-gated registration)
- ROADMAP_v2_3.md § Sprint 3 (auth flow)
- PERSONA-MATRIX.md § Institutional Admin capabilities
- NODE_REGISTRY_v1.md § Layer 2 (framework nodes)
