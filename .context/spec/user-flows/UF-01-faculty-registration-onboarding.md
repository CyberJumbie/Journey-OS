# UF-01: Faculty Registration & Onboarding

**Feature:** F-01 (Authentication & Onboarding)
**Persona:** Faculty — Dr. Amara Osei
**Goal:** Register with institutional email, verify identity, and complete onboarding by uploading first syllabus and seeing extracted concepts

## Preconditions
- Institution already approved and configured by SuperAdmin (F-02)
- Faculty has valid `@msm.edu` institutional email
- Frameworks already seeded by Inst Admin (F-08)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/login` | Click "Create Account" | Navigate to `/register/role` |
| 2 | `/register/role` (RoleSelection) | Select "Faculty" | Navigate to `/register/faculty` |
| 3 | `/register/faculty` Step 1 | Enter first name, last name, `@msm.edu` email | Domain validated against institution, proceed to step 2 |
| 4 | `/register/faculty` Step 2 | Create password (min 8 chars, 1 uppercase, 1 number) | Proceed to step 3 |
| 5 | `/register/faculty` Step 3 | Read and accept FERPA consent checkbox | Proceed to step 4 |
| 6 | `/register/faculty` Step 4 | Review summary, click "Create Account" | Account created via Supabase Auth, redirect to email verification |
| 7 | `/verify-email` (EmailVerification) | Enter OTP from email or click magic link | Email verified, redirect to onboarding |
| 8 | `/onboarding/faculty` Step 1 | Welcome screen, overview of platform capabilities | Click "Get Started" |
| 9 | `/onboarding/faculty` Step 2 | Upload first syllabus (drag-and-drop PDF/DOCX/PPTX) | File uploaded, processing pipeline starts |
| 10 | `/onboarding/faculty` Step 3 | Watch extraction progress (parse → chunk → embed → extract) | See extracted concepts appear in real-time |
| 11 | `/onboarding/faculty` Step 4 | Generate first question from extracted concepts | See AI-generated question preview |
| 12 | `/onboarding/faculty` Step 5 | Dashboard tour highlights (KPI strip, courses, generation) | Click "Go to Dashboard" |
| 13 | `/dashboard` (FacultyDashboard) | Land on faculty dashboard with initial data | See KPI strip, empty courses list, getting started prompts |

## Error Paths
- **Invalid email domain**: Step 3 — "Please use your institutional email (@msm.edu)" inline error
- **Email already registered**: Step 3 — "An account with this email already exists. Try signing in."
- **Weak password**: Step 4 — Inline validation with password strength indicator
- **FERPA consent not checked**: Step 5 — "You must accept the FERPA consent to continue" (submit disabled)
- **OTP expired**: Step 7 — "Code expired. Click Resend to get a new code." with resend button (60s cooldown)
- **OTP invalid**: Step 7 — "Invalid code. Please check and try again." (max 3 attempts)
- **Upload fails**: Step 9 — "Upload failed. Please try again." with retry button
- **Processing fails**: Step 10 — "Processing encountered an error. Our team has been notified." Skip to dashboard
- **Network timeout**: Any step — Toast notification "Connection lost. Retrying..." with auto-retry

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| POST | `/api/auth/register` | Step 6 — create account |
| POST | `/api/auth/verify-email` | Step 7 — verify OTP |
| GET | `/api/auth/me` | Step 8 — fetch user profile |
| POST | `/api/v1/courses/:id/upload` | Step 9 — upload syllabus |
| GET | `/api/v1/uploads/:id/status` | Step 10 — poll processing status (SSE) |
| POST | `/api/v1/generate` | Step 11 — generate first question |
| PATCH | `/api/v1/users/:id` | Step 12 — set `onboarding_completed: true` |

## Test Scenario (Playwright outline)
Login as: New faculty user (create via API in beforeAll)
Steps:
1. Navigate to `/register/role`, select Faculty
2. Fill registration form with `test-faculty@msm.edu`
3. Verify email via OTP (extract from Supabase admin API in test)
4. Complete onboarding steps (upload test PDF, skip generation if slow)
5. Verify landing on `/dashboard`
Assertions:
- User profile created with `role: faculty`, `onboarding_completed: true`
- Dashboard renders with KPI strip visible
- Upload record exists in `uploads` table

## Source References
- PRODUCT_BRIEF.md § Personas (Dr. Amara Osei usage patterns)
- ARCHITECTURE_v10.md § 3.1 (Supabase Auth + JWT)
- DESIGN_SPEC.md § 4.3 Template C (Split Panel auth screens)
- DESIGN_SPEC.md § 4.4 Template D (Full-Width onboarding)
- API_CONTRACT_v1.md § Auth endpoints
- SUPABASE_DDL_v1.md § user_profiles table
