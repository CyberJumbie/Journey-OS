# STORY-U-8 Brief: Registration Wizard

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-U-8
old_id: S-U-02-1
epic: E-02 (Registration & Onboarding)
feature: F-01 (User Authentication & Account Management)
sprint: 3
lane: universal
lane_priority: 0
within_lane_order: 8
size: L
depends_on:
  - STORY-U-1 (universal) — Supabase Auth Setup [DONE]
  - STORY-U-3 (universal) — Express Auth Middleware [DONE]
blocks:
  - STORY-U-13 (universal) — Email Verification Flow
  - STORY-U-14 (universal) — Profile Management
  - STORY-F-5 (faculty) — Content Creation Onboarding
  - STORY-ST-2 (student) — Learning Path Initialization
personas_served: [faculty, student, advisor]
status: DONE
```

---

## Section 1: Summary

**What to build:** A 4-step multi-step registration wizard (Role Selection -> Profile Info -> Institution Association -> FERPA Consent) with a backend `RegistrationService` that creates a Supabase auth user + profile record. The wizard captures role, email/password/display name, institution selection (with typeahead search), and FERPA consent. Only self-registerable roles (faculty, student, advisor) are allowed; superadmin and institutional_admin are invite-only.

**Parent epic:** E-02 (Registration & Onboarding) under F-01 (User Authentication & Account Management).

**User flows affected:**
- UF-02: New user self-registration (primary)
- UF-01: Login (post-registration redirect)

**Personas:** Faculty, Student, and Advisor can self-register. Superadmin and Institutional Admin are excluded from self-registration.

**Why this story is eighth:** STORY-U-1 set up Supabase auth. STORY-U-3 built Express auth middleware. This story builds the registration flow that creates actual user accounts, which downstream stories (email verification, profile management, role-specific onboarding) depend on.

---

## Section 2: Task Breakdown

Implementation order follows: **Types -> Model -> Repository -> Service -> Controller -> View -> API Tests**

### Task 1: Create registration types
- **File:** `packages/types/src/auth/registration.types.ts`
- **Action:** Define `RegistrationStep`, `SelfRegisterableRole`, `RoleSelectionData`, `ProfileData`, `InstitutionData`, `FerpaConsentData`, `RegistrationRequest`, `RegistrationResponse` interfaces.

### Task 2: Create institution types
- **File:** `packages/types/src/institution/institution.types.ts`
- **Action:** Define `InstitutionStatus`, `Institution`, `InstitutionSearchResult` interfaces.

### Task 3: Create registration error classes
- **File:** `apps/server/src/errors/registration.error.ts`
- **Action:** Create `DuplicateEmailError` (code: `DUPLICATE_EMAIL`), `InvalidRegistrationError` (code: `INVALID_REGISTRATION`), `InstitutionNotFoundError` (code: `INSTITUTION_NOT_FOUND`) extending `JourneyOSError`.

### Task 4: Create Supabase migrations for institutions and profiles tables
- **Action:** Create `institutions` table (id, name, domain, status, approved_at, approved_by, settings, created_at, updated_at) and `profiles` table (id FK to auth.users, email, full_name, role, institution_id FK, is_course_director, onboarding_complete, ferpa_consent_at, ferpa_consent_version, ferpa_consent_ip, created_at, updated_at).

### Task 5: Create RegistrationService
- **File:** `apps/server/src/services/auth/registration.service.ts`
- **Action:** OOP class with `#supabaseClient` (JS private field), constructor DI. Implements `register(data, ipAddress)` with validation chain, Supabase `auth.signUp()`, duplicate email detection via `identities.length === 0`, and profile upsert.

### Task 6: Create RegistrationController
- **File:** `apps/server/src/controllers/auth/registration.controller.ts`
- **Action:** OOP class with `#registrationService` and `#supabaseClient`. Implements `handleRegister(req, res)` (POST) and `handleInstitutionSearch(req, res)` (GET). Returns `ApiResponse<T>` envelope.

### Task 7: Wire routes in Express app
- **File:** `apps/server/src/index.ts`
- **Action:** Register `POST /api/v1/auth/register` with rate limiter and `GET /api/v1/auth/institutions/search` (public, no auth).

### Task 8: Create 4-step wizard UI
- **Files:** `apps/web/src/components/auth/registration-wizard.tsx` + 4 step components
- **Action:** Client component with step state machine, progress indicator, form state preserved across steps, POST to `/api/v1/auth/register` on final submit.

### Task 9: Create register page
- **File:** `apps/web/src/app/(auth)/register/page.tsx`
- **Action:** Next.js page with metadata, renders `<RegistrationWizard />`.

### Task 10: Write API tests (15 tests)
- **Files:** `apps/server/src/services/auth/__tests__/registration.service.test.ts` + `apps/server/src/controllers/auth/__tests__/registration.controller.test.ts`
- **Action:** 10 service tests + 5 controller tests covering happy path, validation, duplicate detection, institution checks, error mapping.

---

## Section 3: Data Model (inline, complete)

All types in `packages/types/src/auth/registration.types.ts`:

```typescript
/** Steps in the registration wizard */
export type RegistrationStep = "role" | "profile" | "institution" | "consent";

/** Self-registerable roles (superadmin and institutional_admin are invite-only) */
export type SelfRegisterableRole = "faculty" | "student" | "advisor";

/** Step 1: Role selection */
export interface RoleSelectionData {
  readonly role: SelfRegisterableRole;
}

/** Step 2: Profile info */
export interface ProfileData {
  readonly email: string;
  readonly password: string;
  readonly display_name: string;
}

/** Step 3: Institution association */
export interface InstitutionData {
  readonly institution_id: string;
}

/** Step 4: FERPA consent */
export interface FerpaConsentData {
  readonly consented: boolean;
  readonly consent_version: string;
}

/** Combined registration submission DTO (all 4 steps) */
export interface RegistrationRequest {
  readonly role: SelfRegisterableRole;
  readonly email: string;
  readonly password: string;
  readonly display_name: string;
  readonly institution_id: string;
  readonly consented: boolean;
  readonly consent_version: string;
}

/** Registration response */
export interface RegistrationResponse {
  readonly user_id: string;
  readonly email: string;
  readonly requires_verification: boolean;
}
```

Institution types in `packages/types/src/institution/institution.types.ts`:

```typescript
export type InstitutionStatus = "waitlisted" | "approved" | "suspended";

export interface Institution {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly status: InstitutionStatus;
  readonly approved_at: string | null;
  readonly approved_by: string | null;
  readonly settings: Record<string, unknown>;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Lightweight result for institution search dropdown */
export interface InstitutionSearchResult {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
}
```

---

## Section 4: Database Schema (Supabase DDL)

### institutions table
```sql
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waitlisted'
    CHECK (status IN ('waitlisted', 'approved', 'suspended')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
```

### profiles table
```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL
    CHECK (role IN ('superadmin', 'institutional_admin', 'faculty', 'student', 'advisor')),
  institution_id UUID REFERENCES public.institutions(id),
  is_course_director BOOLEAN NOT NULL DEFAULT false,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ferpa_consent_at TIMESTAMPTZ,
  ferpa_consent_version TEXT,
  ferpa_consent_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

---

## Section 5: API Contract

### POST /api/v1/auth/register

**Auth:** Public (no JWT). Rate-limited via `createRegistrationRateLimiter()`.

**Request body:**
```json
{
  "role": "student",
  "email": "student@msm.edu",
  "password": "Passw0rd1",
  "display_name": "Test Student",
  "institution_id": "uuid-of-institution",
  "consented": true,
  "consent_version": "1.0"
}
```

**201 Created — success:**
```json
{
  "data": {
    "user_id": "uuid-of-user",
    "email": "student@msm.edu",
    "requires_verification": true
  },
  "error": null
}
```

**400 Bad Request — validation error:**
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required fields"
  }
}
```

**400 Bad Request — invalid registration:**
```json
{
  "data": null,
  "error": {
    "code": "INVALID_REGISTRATION",
    "message": "Role \"superadmin\" is not available for self-registration"
  }
}
```

**404 Not Found — institution not found:**
```json
{
  "data": null,
  "error": {
    "code": "INSTITUTION_NOT_FOUND",
    "message": "Institution not found"
  }
}
```

**409 Conflict — duplicate email:**
```json
{
  "data": null,
  "error": {
    "code": "DUPLICATE_EMAIL",
    "message": "An account with this email already exists"
  }
}
```

**500 Internal Server Error:**
```json
{
  "data": null,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred. Please try again."
  }
}
```

### GET /api/v1/auth/institutions/search?q={query}

**Auth:** Public (no JWT, no rate limit).

**Query params:** `q` (string, min 2 chars) — searches institution name and domain with ILIKE.

**200 OK — results:**
```json
{
  "data": [
    { "id": "uuid", "name": "Morehouse School of Medicine", "domain": "msm.edu" }
  ],
  "error": null
}
```

**200 OK — empty (query too short or no matches):**
```json
{
  "data": [],
  "error": null
}
```

---

## Section 6: Frontend Spec

### Page: `/register`
- **File:** `apps/web/src/app/(auth)/register/page.tsx`
- **Component:** `<RegistrationWizard />`
- **Layout:** Uses `(auth)` layout group (centered card).

### Component: RegistrationWizard (Organism)
- **File:** `apps/web/src/components/auth/registration-wizard.tsx`
- **State:** `currentStep` (0-3), `wizardState` ("filling" | "submitting" | "success" | "error"), form fields (role, displayName, email, password, institutionId, institutionName, consented).
- **Progress indicator:** Numbered circle badges (1-4) with labels (Role, Profile, Institution, Consent). Active/completed steps use `#2b71b9` background.
- **Error banner:** Red bordered alert shown when `wizardState === "error"`.
- **Success state:** "Check Your Email" message with verification link info and login link.
- **Submit:** POST to `${NEXT_PUBLIC_API_URL}/api/v1/auth/register`. Handles 429 rate limit response separately.

### Step 1: RoleStep (Molecule)
- **File:** `apps/web/src/components/auth/steps/role-step.tsx`
- **UI:** Three radio-card buttons for Faculty, Student, Advisor with descriptions.
- **Validation:** Continue button disabled until a role is selected.
- **Props:** `selectedRole`, `onSelect`, `onNext`.

### Step 2: ProfileStep (Molecule)
- **File:** `apps/web/src/components/auth/steps/profile-step.tsx`
- **UI:** Display name, email, and password input fields.
- **Validation:** All fields required. Email format checked. Password: min 8 chars, 1 uppercase, 1 number.
- **Props:** `displayName`, `email`, `password`, `onDisplayNameChange`, `onEmailChange`, `onPasswordChange`, `onNext`, `onBack`.

### Step 3: InstitutionStep (Molecule)
- **File:** `apps/web/src/components/auth/steps/institution-step.tsx`
- **UI:** Search input with typeahead dropdown. Fetches from `GET /api/v1/auth/institutions/search?q={query}`. Shows selected institution name when chosen.
- **Validation:** Institution must be selected to proceed.
- **Props:** `selectedInstitutionId`, `selectedInstitutionName`, `onSelect(id, name)`, `onNext`, `onBack`.

### Step 4: ConsentStep (Molecule)
- **File:** `apps/web/src/components/auth/steps/consent-step.tsx`
- **UI:** Scrollable FERPA disclosure text (version 1.0), checkbox, Back + Create Account buttons.
- **Validation:** Checkbox must be checked. Submit button disabled while submitting (shows spinner).
- **Exports:** `FERPA_VERSION = "1.0"` (used by wizard during submit).
- **Props:** `consented`, `onConsentChange`, `onSubmit`, `onBack`, `isSubmitting`.

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Action |
|---|------|--------|
| 1 | `packages/types/src/auth/registration.types.ts` | CREATE — registration DTOs and step types |
| 2 | `packages/types/src/institution/institution.types.ts` | CREATE — Institution, InstitutionSearchResult |
| 3 | `packages/types/src/institution/index.ts` | CREATE — barrel export |
| 4 | `apps/server/src/errors/registration.error.ts` | CREATE — DuplicateEmailError, InvalidRegistrationError, InstitutionNotFoundError |
| 5 | Supabase migration: `institutions` table | CREATE via Supabase MCP |
| 6 | Supabase migration: `profiles` table | CREATE via Supabase MCP |
| 7 | `apps/server/src/services/auth/registration.service.ts` | CREATE — RegistrationService |
| 8 | `apps/server/src/controllers/auth/registration.controller.ts` | CREATE — RegistrationController |
| 9 | `apps/server/src/index.ts` | EDIT — wire POST /api/v1/auth/register + GET /api/v1/auth/institutions/search |
| 10 | `apps/web/src/components/auth/steps/role-step.tsx` | CREATE — Step 1 UI |
| 11 | `apps/web/src/components/auth/steps/profile-step.tsx` | CREATE — Step 2 UI |
| 12 | `apps/web/src/components/auth/steps/institution-step.tsx` | CREATE — Step 3 UI |
| 13 | `apps/web/src/components/auth/steps/consent-step.tsx` | CREATE — Step 4 UI |
| 14 | `apps/web/src/components/auth/registration-wizard.tsx` | CREATE — 4-step wizard orchestrator |
| 15 | `apps/web/src/app/(auth)/register/page.tsx` | CREATE — Next.js page |
| 16 | `apps/server/src/services/auth/__tests__/registration.service.test.ts` | CREATE — 10 service tests |
| 17 | `apps/server/src/controllers/auth/__tests__/registration.controller.test.ts` | CREATE — 5 controller tests |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | What it provides |
|-------|------|--------|------------------|
| STORY-U-1 | universal | DONE | Supabase auth client, auth.signUp(), auth.users table |
| STORY-U-3 | universal | DONE | Express auth middleware, JourneyOSError base class, ValidationError |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client SDK
- `@supabase/ssr` — Supabase SSR helpers (web app)
- `express` — HTTP framework
- `vitest` — testing

### Existing Files Needed
| File | Purpose |
|------|---------|
| `apps/server/src/errors/base.errors.ts` | `JourneyOSError` base class (code + message) |
| `apps/server/src/errors/validation.error.ts` | `ValidationError` class |
| `apps/server/src/middleware/rate-limiter.middleware.ts` | `createRegistrationRateLimiter()` factory |
| `packages/types/src/api/api-response.types.ts` | `ApiResponse<T>` envelope type |
| `apps/server/src/config/supabase.config.ts` | Supabase client singleton |

---

## Section 9: Test Fixtures (inline)

### Valid Registration Request
```typescript
const VALID_REQUEST: RegistrationRequest = {
  role: "student",
  email: "student@msm.edu",
  password: "Passw0rd1",
  display_name: "Test Student",
  institution_id: "inst-001",
  consented: true,
  consent_version: "1.0",
};
```

### Mock Supabase Client Factory
```typescript
function createMockSupabaseClient(overrides?: {
  signUp?: ReturnType<typeof vi.fn>;
  selectSingle?: ReturnType<typeof vi.fn>;
  upsert?: ReturnType<typeof vi.fn>;
}) {
  const selectSingle = overrides?.selectSingle ??
    vi.fn().mockResolvedValue({
      data: { id: "inst-001", status: "approved" },
      error: null,
    });

  const upsert = overrides?.upsert ??
    vi.fn().mockResolvedValue({ data: null, error: null });

  const signUp = overrides?.signUp ??
    vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "user-001",
          email: "student@msm.edu",
          identities: [{ id: "id-1" }],
        },
        session: null,
      },
      error: null,
    });

  return {
    auth: { signUp },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: selectSingle,
        }),
      }),
      upsert,
    }),
  } as unknown as SupabaseClient;
}
```

### Duplicate Email Response (empty identities)
```typescript
const DUPLICATE_EMAIL_RESPONSE = {
  data: {
    user: { id: "fake-id", email: "student@msm.edu", identities: [] },
    session: null,
  },
  error: null,
};
```

### Controller Mock Request/Response
```typescript
function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function createMockRequest(body: Record<string, unknown> = {}): Request {
  return {
    body,
    ip: "127.0.0.1",
    headers: {},
  } as unknown as Request;
}
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

### File: `apps/server/src/services/auth/__tests__/registration.service.test.ts` (10 tests)

#### Test Group 1: Successful registration
```
- registers a user successfully with all valid fields
- stores FERPA consent fields in profile upsert (ferpa_consent_version, ferpa_consent_ip, ferpa_consent_at)
```

#### Test Group 2: Role validation
```
- rejects superadmin role (throws InvalidRegistrationError)
- rejects institutional_admin role (throws InvalidRegistrationError)
```

#### Test Group 3: Password validation
```
- rejects weak password — too short (< 8 chars, throws ValidationError)
- rejects weak password — no uppercase (throws ValidationError)
- rejects weak password — no number (throws ValidationError)
```

#### Test Group 4: Duplicate email detection
```
- detects duplicate email via empty identities array (throws DuplicateEmailError)
```

#### Test Group 5: Institution validation
```
- throws InstitutionNotFoundError when institution does not exist
- throws InstitutionNotFoundError when institution is not approved (status: "waitlisted")
```

### File: `apps/server/src/controllers/auth/__tests__/registration.controller.test.ts` (5 tests)

#### Test Group 1: HTTP responses
```
- returns 201 on successful registration (ApiResponse with data.user_id)
- returns 400 on missing required fields (code: VALIDATION_ERROR)
- returns 400 on invalid email format (message: "Invalid email format")
- returns 409 on duplicate email (code: DUPLICATE_EMAIL)
- returns 500 on unexpected error (code: INTERNAL_ERROR)
```

**Total test count: 15 tests**

---

## Section 11: E2E Test Spec (Playwright)

### File: `apps/web/e2e/registration.spec.ts` (1 E2E test)

```
Test: Full registration wizard flow
1. Navigate to /register
2. Step 1: Select "Student" role, click Continue
3. Step 2: Fill display name, email, password, click Continue
4. Step 3: Search for institution, select from dropdown, click Continue
5. Step 4: Check FERPA consent checkbox, click Create Account
6. Verify success message: "Check Your Email" with verification info
```

**Note:** Requires a seeded "approved" institution in the test database and a clean email address.

---

## Section 12: Acceptance Criteria

1. Four-step wizard UI renders at `/register` with progress indicator showing steps 1-4.
2. Step 1 offers exactly 3 self-registerable roles: Faculty, Student, Advisor.
3. Step 2 validates email format, password strength (8+ chars, 1 uppercase, 1 number), and display name presence.
4. Step 3 searches institutions via `GET /api/v1/auth/institutions/search?q=` with typeahead (min 2 chars, max 10 results, only "approved" institutions).
5. Step 4 displays FERPA disclosure text (version 1.0) and requires checkbox consent before submit.
6. `POST /api/v1/auth/register` creates a Supabase auth user via `auth.signUp()` with role and institution_id in `user_metadata`.
7. Profile row is upserted into `profiles` table with `ferpa_consent_at`, `ferpa_consent_version`, and `ferpa_consent_ip`.
8. Duplicate email is detected via Supabase's `identities.length === 0` pattern (not an error response) and returns 409.
9. Superadmin and institutional_admin roles are rejected with `InvalidRegistrationError`.
10. Institution must exist and have `status = 'approved'`; otherwise returns 404.
11. Registration endpoint is rate-limited via `createRegistrationRateLimiter()`.
12. Success screen shows "Check Your Email" with the user's email and a link to `/login`.
13. All 15 vitest tests pass (10 service + 5 controller).
14. All types use `readonly` properties and named exports only.
15. Error classes extend `JourneyOSError` with unique error codes.

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| 4-step wizard (Role, Profile, Institution, Consent) | [S-U-02-1 § User Story] |
| Self-registerable roles: faculty, student, advisor | [S-U-02-1 § Acceptance Criteria] |
| FERPA consent capture with version + IP | [S-U-02-1 § Acceptance Criteria], [SUPABASE_DDL_v1.md § profiles] |
| institutions table schema | [SUPABASE_DDL_v1.md § institutions] |
| profiles table schema | [SUPABASE_DDL_v1.md § profiles] |
| Duplicate email detection via empty identities | [Supabase Auth docs § signUp behavior] |
| Password: 8+ chars, 1 uppercase, 1 number | [S-U-02-1 § Acceptance Criteria] |
| Institution search: ILIKE on name + domain | [S-U-02-1 § Acceptance Criteria] |
| Rate limiting on registration | [S-U-02-1 § Non-functional Requirements] |
| OOP with JS #private fields | [CLAUDE.md § Architecture Rules] |
| ApiResponse envelope | [CLAUDE.md § Architecture Rules], [api-response.types.ts] |
| Named exports only (except page.tsx) | [CLAUDE.md § Architecture Rules] |
| Custom error classes only | [CLAUDE.md § Architecture Rules] |

---

## Section 14: Environment Prerequisites

| Requirement | Details |
|-------------|---------|
| Supabase | Running instance with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env`. Migrations applied for `institutions` and `profiles` tables. |
| Node.js | 18+ (already in monorepo) |
| pnpm | Workspace manager (already configured) |
| `@journey-os/types` | Must be built (`pnpm --filter @journey-os/types build`) for server and web to resolve registration + institution types. |
| `NEXT_PUBLIC_API_URL` | Express server URL (defaults to `http://localhost:3001` in wizard). |

**No Neo4j required** for this story -- Supabase-only (DualWriteService for Neo4j sync is a future enhancement).

---

## Section 15: Figma Make Prototype

### Wizard Layout
- Centered card (max-width ~480px) within `(auth)` layout group.
- Progress bar: 4 numbered circles with step labels, connected by horizontal lines. Active/completed steps use `#2b71b9`.

### Step 1: Role Selection
- Three radio-card buttons stacked vertically with role name (bold) and description text.
- Selected card: `#2b71b9` border + `#f0f6ff` background.
- "Continue" button (full width, `#2b71b9`), disabled until selection.

### Step 2: Profile Info
- Three text inputs: Display Name, Email, Password.
- "Back" (outline) + "Continue" (primary) buttons side-by-side.

### Step 3: Institution Search
- Search input with debounced typeahead.
- Dropdown list shows institution name + domain.
- Selected institution displayed as a tag/chip.
- "Back" + "Continue" buttons.

### Step 4: FERPA Consent
- Scrollable disclosure box (max-height ~192px) with version number.
- Checkbox: "I have read and agree to the FERPA disclosure above..."
- "Back" + "Create Account" buttons. Create Account shows spinner while submitting.

### Success Screen
- "Check Your Email" heading.
- Green text confirmation with the user's email bolded.
- "Go to Login" link (`#2b71b9`).

---

## Implementation Notes

### Supabase Duplicate Email Detection
Supabase `auth.signUp()` does NOT return an error for existing emails (to prevent email enumeration). Instead, it returns a "fake" user with `identities: []`. Always check `signUpData.user.identities.length === 0` to detect duplicates.

### IP Address Extraction
The controller extracts IP from `x-forwarded-for` header (first value, trimmed), falling back to `req.ip`, then `"127.0.0.1"`. This IP is stored in the profile for FERPA audit.

### Rate Limiting
The registration endpoint uses `createRegistrationRateLimiter()` from the rate limiter middleware. The wizard handles 429 responses with a user-friendly message.

### Supabase Mock Pattern
Create separate mock objects per Supabase chain stage to avoid `mockReturnThis()` chaining issues. See `createMockSupabaseClient()` in test fixtures. The `from()` mock returns an object with `select()` chain (for institution lookup) and `upsert()` (for profile creation) -- these are separate call paths.

### Institution Search
The `handleInstitutionSearch` method on the controller queries the `institutions` table with `ILIKE` on both `name` and `domain` columns, limited to 10 results, filtered to `status = 'approved'`. Returns empty array for queries under 2 characters.
