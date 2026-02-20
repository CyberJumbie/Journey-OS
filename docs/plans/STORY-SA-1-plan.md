# Implementation Plan: STORY-SA-1 — Waitlist Application Form

## Overview
Public form at `/apply` for prospective institutional admins to submit waitlist applications. Supabase-only (no Neo4j). Follows public auth route pattern from STORY-U-5.

## Implementation Order: Types → Migration → Errors → Service → Controller → Routes → Frontend → Tests

---

### Step 1: Types (packages/types)

**Create** `packages/types/src/institution/application.types.ts`:
- `InstitutionType` = `"md" | "do" | "combined"`
- `ApplicationStatus` = `"pending" | "approved" | "rejected"`
- `WaitlistApplicationRequest` — form submission DTO (9 fields)
- `WaitlistApplication` — full database record
- `WaitlistApplicationResponse` — public response (id, name, status, submitted_at)

**Edit** `packages/types/src/institution/index.ts`:
- Add re-exports for application types

---

### Step 2: Database Migration (Supabase MCP)

**Apply migration** `create_waitlist_applications_table`:
- Table: `waitlist_applications` with all fields from brief §4
- CHECK constraints: `institution_type IN ('md','do','combined')`, `status IN ('pending','approved','rejected')`, `student_count > 0`
- Indexes on `contact_email`, `institution_name`, `status`
- RLS: public INSERT, SuperAdmin-only SELECT/UPDATE

---

### Step 3: Error Classes

**Create** `apps/server/src/errors/application.error.ts`:
- `DuplicateApplicationError extends JourneyOSError` — code: `"DUPLICATE_APPLICATION"`, message: "An application with this email or institution name is already pending"
- `InvalidApplicationError extends JourneyOSError` — code: `"VALIDATION_ERROR"`, message: dynamic

**Edit** `apps/server/src/errors/index.ts`:
- Export both new errors

---

### Step 4: ApplicationService

**Create** `apps/server/src/services/institution/application.service.ts`:

```
class ApplicationService {
  #supabaseClient: SupabaseClient

  constructor(supabaseClient)

  async submit(data: WaitlistApplicationRequest, ip: string): Promise<WaitlistApplicationResponse>
    - validate all required fields
    - sanitize strings (strip HTML tags)
    - trim whitespace, lowercase email
    - check for duplicate (pending application with same email OR institution_name)
    - insert into waitlist_applications with status='pending', submitted_ip=ip
    - return { id, institution_name, status, submitted_at }

  #validate(data): void — throws InvalidApplicationError
    - institution_name: required, min 3 chars
    - institution_type: required, must be md/do/combined
    - accreditation_body: required
    - contact_name: required, min 2 chars
    - contact_email: required, email regex
    - student_count: required, positive integer
    - website_url: if provided, must be valid URL

  #sanitize(value: string): string — strip HTML tags

  async #checkDuplicate(email: string, name: string): Promise<void>
    - query waitlist_applications WHERE status='pending' AND (contact_email=email OR institution_name=name)
    - if found, throw DuplicateApplicationError
}
```

---

### Step 5: ApplicationController

**Create** `apps/server/src/controllers/institution/application.controller.ts`:

```
class ApplicationController {
  #applicationService: ApplicationService

  constructor(applicationService)

  async handleSubmit(req: Request, res: Response): Promise<void>
    - extract body fields
    - validate required fields present (early 400)
    - extract IP from x-forwarded-for or req.ip
    - call service.submit(data, ip)
    - 201 with ApiResponse<WaitlistApplicationResponse>
    - catch DuplicateApplicationError → 409
    - catch InvalidApplicationError/ValidationError → 400
    - catch unknown → 500
}
```

---

### Step 6: Rate Limiter + Route Registration

**Edit** `apps/server/src/middleware/rate-limiter.middleware.ts`:
- Add `createApplicationRateLimiter()` — 3 requests per IP per hour
- Key: IP address (same pattern as registration rate limiter)

**Edit** `apps/server/src/index.ts`:
- Import ApplicationService, ApplicationController, rate limiter
- Register BEFORE auth middleware:
  ```
  app.post("/api/v1/waitlist", createApplicationRateLimiter(), (req, res) =>
    applicationController.handleSubmit(req, res)
  );
  ```

---

### Step 7: Frontend

**Create** `apps/web/src/app/(public)/apply/page.tsx`:
- Default export page component
- Renders `<ApplicationForm />`
- Public layout (no auth wrapper)

**Create** `apps/web/src/components/institution/application-form.tsx`:
- `"use client"` component
- Controlled form with state for all 9 fields
- Client-side validation on submit (before API call)
- Fetch `POST /api/v1/waitlist` on submit
- States: idle → submitting → success/error
- Success: show confirmation with institution name and "pending" status
- Error: display inline error messages

---

### Step 8: API Tests

**Create** `apps/server/src/__tests__/application.controller.test.ts`:

Mock Supabase client for all tests. Test:
1. Valid submission → 201 with correct response shape
2. Default status = "pending"
3. Missing required fields → 400
4. Invalid email → 400
5. Invalid institution_type → 400
6. Negative student_count → 400
7. Invalid URL → 400
8. Duplicate by email → 409
9. Duplicate by institution name → 409
10. Rejected application allows resubmission
11. Rate limit (test via middleware mock)
12. HTML sanitization strips tags

Service unit tests:
13. Trims whitespace
14. Lowercases email
15. Stores submitted IP
16. Calls Supabase insert with correct data

---

## Risk Mitigation

- **XSS via stored application data**: Sanitize all text fields server-side before storing
- **Rate limit bypass**: Key on IP, not email — prevents enumeration while stopping spam
- **Duplicate detection race condition**: Low risk at MVP volume; can add UNIQUE constraint later if needed

## Estimated Files Changed
- 2 new type files, 1 edited
- 1 migration (Supabase MCP)
- 1 new error file, 1 edited
- 1 new service file
- 1 new controller file
- 1 edited server index
- 1 edited rate limiter middleware
- 2 new frontend files
- 1 new test file
- **Total: 8 new, 4 edited**
