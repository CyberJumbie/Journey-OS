# STORY-SA-1 Brief: Waitlist Application Form

## 0. Lane & Priority

```yaml
story_id: STORY-SA-1
old_id: S-SA-04-1
lane: superadmin
lane_priority: 1
within_lane_order: 1
sprint: 3
size: M
depends_on:
  - STORY-U-6 (universal) — RBAC Middleware ✅ DONE
blocks:
  - STORY-SA-3 — Application Review Queue
personas_served: [superadmin, prospective_institutional_admin]
epic: E-04 (Institution Lifecycle)
feature: F-02 (Institution Management)
user_flow: UF-04 (Institution Approval)
```

## 1. Summary

Build a **public waitlist application form** at `/apply` where prospective institutional admins submit their institution's details for platform access. This is the entry point of the institution lifecycle pipeline (E-04). The form is unauthenticated — anyone can submit. The backend creates a `waitlist_applications` record with `status='pending'` in Supabase. No Neo4j dual-write at this stage (Institution node is created only on approval in SA-5).

Key constraints:
- Public route (no auth middleware)
- Rate-limited: max 3 submissions per IP per hour
- Duplicate detection: warn if email or institution name already pending
- Server-side validation + HTML sanitization

## 2. Task Breakdown

1. **Types** — Create `WaitlistApplication` types in `packages/types/src/institution/`
2. **Migration** — Create `waitlist_applications` table in Supabase
3. **Error classes** — `DuplicateApplicationError`, `InvalidApplicationError` in `apps/server/src/errors/`
4. **Service** — `ApplicationService` with `submit()`, `findDuplicate()` methods
5. **Controller** — `ApplicationController` with `handleSubmit()` method
6. **Routes** — Public route `POST /api/v1/waitlist` before auth middleware
7. **Rate limiter** — Application-specific rate limiter (3/IP/hour)
8. **Frontend page** — `/apply` page with application form
9. **Frontend form** — `ApplicationForm` component with validation
10. **API tests** — 12 tests covering CRUD, validation, duplicates, rate limiting
11. **Wire up** — Register route in `apps/server/src/index.ts`

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/institution/application.types.ts

/** Institution type for medical schools */
export type InstitutionType = "md" | "do" | "combined";

/** Application status in the waitlist pipeline */
export type ApplicationStatus = "pending" | "approved" | "rejected";

/** Waitlist application submission DTO (from form) */
export interface WaitlistApplicationRequest {
  readonly institution_name: string;
  readonly institution_type: InstitutionType;
  readonly accreditation_body: string;
  readonly contact_name: string;
  readonly contact_email: string;
  readonly contact_phone: string;
  readonly student_count: number;
  readonly website_url: string;
  readonly reason: string;
}

/** Stored waitlist application record */
export interface WaitlistApplication {
  readonly id: string;
  readonly institution_name: string;
  readonly institution_type: InstitutionType;
  readonly accreditation_body: string;
  readonly contact_name: string;
  readonly contact_email: string;
  readonly contact_phone: string;
  readonly student_count: number;
  readonly website_url: string;
  readonly reason: string;
  readonly status: ApplicationStatus;
  readonly submitted_ip: string;
  readonly reviewed_by: string | null;
  readonly reviewed_at: string | null;
  readonly rejection_reason: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Public-facing submission response */
export interface WaitlistApplicationResponse {
  readonly id: string;
  readonly institution_name: string;
  readonly status: ApplicationStatus;
  readonly submitted_at: string;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_waitlist_applications_table
CREATE TABLE waitlist_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_name TEXT NOT NULL,
    institution_type TEXT NOT NULL CHECK (institution_type IN ('md', 'do', 'combined')),
    accreditation_body TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL DEFAULT '',
    student_count INTEGER NOT NULL CHECK (student_count > 0),
    website_url TEXT NOT NULL DEFAULT '',
    reason TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_ip INET NOT NULL,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for duplicate detection
CREATE INDEX idx_waitlist_applications_contact_email ON waitlist_applications(contact_email);
CREATE INDEX idx_waitlist_applications_institution_name ON waitlist_applications(institution_name);
CREATE INDEX idx_waitlist_applications_status ON waitlist_applications(status);

-- RLS: Public can insert, only SuperAdmin can read/update
ALTER TABLE waitlist_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit application" ON waitlist_applications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "SuperAdmin reads all applications" ON waitlist_applications
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
    );

CREATE POLICY "SuperAdmin updates applications" ON waitlist_applications
    FOR UPDATE USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
    );
```

## 5. API Contract (complete request/response)

### POST /api/v1/waitlist (Public — no auth)

**Request:**
```json
{
  "institution_name": "Morehouse School of Medicine",
  "institution_type": "md",
  "accreditation_body": "LCME",
  "contact_name": "Dr. Jane Smith",
  "contact_email": "jsmith@msm.edu",
  "contact_phone": "+1-404-555-0100",
  "student_count": 450,
  "website_url": "https://www.msm.edu",
  "reason": "Interested in AI-powered assessment generation for Step 1 prep"
}
```

**Success Response (201):**
```json
{
  "data": {
    "id": "uuid-here",
    "institution_name": "Morehouse School of Medicine",
    "status": "pending",
    "submitted_at": "2026-02-19T12:00:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Missing required fields, invalid email/URL format |
| 409 | `DUPLICATE_APPLICATION` | Email or institution name already has pending application |
| 429 | `RATE_LIMITED` | >3 applications from same IP in 1 hour |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

**Headers:** Rate limit: `Retry-After: <seconds>` on 429.

**Auth:** None (public endpoint). Rate-limited by IP.

## 6. Frontend Spec

### Page: `/apply` (public, no auth layout)

**Route:** `apps/web/src/app/(public)/apply/page.tsx`

**Component hierarchy:**
```
ApplyPage (page.tsx — default export)
  └── ApplicationForm (client component)
        ├── Form fields (controlled inputs)
        ├── InstitutionTypeSelect (md/do/combined dropdown)
        ├── Validation error display
        └── SubmitButton with loading state
```

**ApplicationForm props:**
```typescript
// No props — self-contained form with internal state

interface ApplicationFormState {
  institution_name: string;
  institution_type: InstitutionType | "";
  accreditation_body: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  student_count: string; // string for input, parsed to number on submit
  website_url: string;
  reason: string;
}
```

**States:**
1. **Idle** — Empty form, submit button enabled
2. **Validating** — Client-side validation on blur/submit
3. **Submitting** — Loading spinner on submit button, form disabled
4. **Success** — Confirmation message with application reference
5. **Error** — Server error displayed inline (duplicate, rate limit, validation)

**Validation rules (client-side):**
- `institution_name`: required, min 3 chars
- `institution_type`: required, must be one of md/do/combined
- `accreditation_body`: required
- `contact_name`: required, min 2 chars
- `contact_email`: required, email regex
- `contact_phone`: optional, phone regex if provided
- `student_count`: required, positive integer
- `website_url`: optional, URL regex if provided
- `reason`: optional, max 1000 chars

**Design tokens:**
- Surface: Cream background (public page)
- Primary action: Navy Deep `#002c76`
- Success state: Green `#69a338`
- Typography: Lora for page heading, Source Sans 3 for form labels/inputs

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/institution/application.types.ts` | Types | Create |
| 2 | `packages/types/src/institution/index.ts` | Types | Edit (add exports) |
| 3 | Supabase migration via MCP | Database | Apply |
| 4 | `apps/server/src/errors/application.error.ts` | Errors | Create |
| 5 | `apps/server/src/errors/index.ts` | Errors | Edit (add exports) |
| 6 | `apps/server/src/services/institution/application.service.ts` | Service | Create |
| 7 | `apps/server/src/controllers/institution/application.controller.ts` | Controller | Create |
| 8 | `apps/server/src/index.ts` | Routes | Edit (add public route) |
| 9 | `apps/web/src/app/(public)/apply/page.tsx` | View | Create |
| 10 | `apps/web/src/components/institution/application-form.tsx` | Component | Create |
| 11 | `apps/server/src/__tests__/application.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-U-6 | universal | **DONE** | RBAC needed for future admin-only endpoints; form itself is public |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client
- `express` — Server framework
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/rate-limiter.middleware.ts` — Rate limiter pattern
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError` base class
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>` envelope

## 9. Test Fixtures (inline)

```typescript
// Valid application
export const VALID_APPLICATION = {
  institution_name: "Morehouse School of Medicine",
  institution_type: "md",
  accreditation_body: "LCME",
  contact_name: "Dr. Jane Smith",
  contact_email: "jsmith@msm.edu",
  contact_phone: "+1-404-555-0100",
  student_count: 450,
  website_url: "https://www.msm.edu",
  reason: "Interested in AI-powered assessment tools",
};

// Minimal valid application (optional fields empty)
export const MINIMAL_APPLICATION = {
  institution_name: "Test Medical School",
  institution_type: "do",
  accreditation_body: "AOA",
  contact_name: "Dr. Test",
  contact_email: "test@testmed.edu",
  contact_phone: "",
  student_count: 100,
  website_url: "",
  reason: "",
};

// Invalid applications
export const MISSING_NAME = { ...VALID_APPLICATION, institution_name: "" };
export const INVALID_EMAIL = { ...VALID_APPLICATION, contact_email: "not-an-email" };
export const INVALID_TYPE = { ...VALID_APPLICATION, institution_type: "phd" };
export const NEGATIVE_STUDENTS = { ...VALID_APPLICATION, student_count: -5 };
export const INVALID_URL = { ...VALID_APPLICATION, website_url: "not-a-url" };
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/__tests__/application.controller.test.ts`

```
describe("ApplicationController")
  describe("handleSubmit")
    ✓ creates application with valid data (201)
    ✓ returns application id, name, status, submitted_at
    ✓ sets status to "pending" by default
    ✓ rejects missing required fields (400 VALIDATION_ERROR)
    ✓ rejects invalid email format (400 VALIDATION_ERROR)
    ✓ rejects invalid institution type (400 VALIDATION_ERROR)
    ✓ rejects negative student count (400 VALIDATION_ERROR)
    ✓ rejects invalid website URL when provided (400 VALIDATION_ERROR)
    ✓ detects duplicate pending application by email (409 DUPLICATE_APPLICATION)
    ✓ detects duplicate pending application by institution name (409 DUPLICATE_APPLICATION)
    ✓ allows resubmission if previous application was rejected
    ✓ rate limits after 3 submissions from same IP (429 RATE_LIMITED)

describe("ApplicationService")
  describe("submit")
    ✓ sanitizes HTML from input fields
    ✓ trims whitespace from all string fields
    ✓ lowercases contact_email before storing
    ✓ stores submitted_ip from request
```

**Total: ~16 tests** (12 controller + 4 service unit tests)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. The waitlist form is not part of the 5 critical user journeys. E2E coverage will be added when E-04 is fully complete (SA-1 through SA-6).

## 12. Acceptance Criteria

1. Public form accessible at `/apply` without authentication
2. Form validates required fields client-side before submission
3. Server validates all fields and returns specific error codes
4. Successful submission creates `waitlist_applications` row with `status='pending'`
5. Duplicate detection: 409 if contact_email OR institution_name matches a pending application
6. Rate limiting: 429 after 3 submissions from same IP within 1 hour
7. Confirmation page shown after successful submission with application reference
8. Input sanitized to prevent XSS (HTML stripped from all text fields)
9. All 16 API tests pass
10. No auth middleware on the submission endpoint

## 13. Source References

| Claim | Source |
|-------|--------|
| Public waitlist form | API_CONTRACT_v1 § Waitlist: `POST /api/v1/waitlist (Auth: None)` |
| Application fields | S-SA-04-1 § Acceptance Criteria |
| Institution status lifecycle | SUPABASE_DDL_v1 § institutions: `CHECK (status IN ('waitlisted', 'approved', 'suspended'))` |
| SuperAdmin reviews waitlist | ARCHITECTURE_v10 § 4.1: "Reviews waitlist → approves institutions" |
| Rate limiting pattern | STORY-U-5 § Rate limiter middleware (existing) |
| DualWrite deferred to SA-5 | UF-04 § Step 5: "Institution created on approval" |
| Form at /apply | F-02 § Institution Management: waitlist applications |

## 14. Environment Prerequisites

- **Supabase:** Project `hifqdotmnirepgscankl` running, `waitlist_applications` table created via migration
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story (graph node created on approval in SA-5)

## 15. Implementation Notes

- **Public route pattern:** Follow STORY-U-5's pattern — register route BEFORE `app.use("/api/v1", createAuthMiddleware())` in index.ts
- **Rate limiter:** Reuse `RateLimiterMiddleware` from STORY-U-5, configure with IP-based key and 3 requests/hour
- **No DualWriteService** — The application record is Supabase-only. Neo4j Institution node is created later (SA-5 approval workflow)
- **Sanitization:** Strip HTML tags from all text fields server-side to prevent stored XSS
- **The form is NOT a wizard** — it's a single-page form (unlike the 4-step registration wizard)
