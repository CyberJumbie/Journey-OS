# PSUPP-017: Admin — Application Review Queue (/admin/applications)
**Group:** Admin Institution Management
**Component:** `ApplicationReviewQueue` | `pages/admin/ApplicationReviewQueue.tsx`
**Priority:** P1
**Depends:** `/apply` route (InstitutionApplication screen — companion to this)
**Specialist:** @frontend-specialist + @backend-specialist

**As a** superadmin
**I want** to review institution applications submitted via the public /apply form
**So that** I can approve or reject new schools joining the platform

## Acceptance Criteria

### Public Apply Form (/apply)
- Route: `/apply` — public, unauthenticated
- Form: institution name, type, primary contact name + email + title, size (student count), reason for interest
- `POST /api/v1/institution-applications` — stores in `institution_applications` table
- Response: confirmation message; sends "we received your application" email via Supabase Auth
- No auth required

### Admin Review Queue (/admin/applications)
- Endpoint: `GET /api/v1/admin/applications?status=pending|approved|rejected`
- Table: institution name, contact name/email, submitted date, status badge
- Per-row actions:
  - **Approve** → `PATCH /api/v1/admin/applications/:id { status: 'approved' }`:
    - Creates `institutions` row
    - Sends admin invite email to contact email (auto-triggers PSUPP-001 invite flow)
  - **Reject** with optional reason → sends rejection email
  - **Request More Info** → sends email with custom message, status = 'info_requested'
- Filter by status; sort by submitted date
- Application detail modal: all submitted fields + notes field for internal use

## Files to Create
- `frontend/src/app/apply/page.tsx` (public form)
- `frontend/src/app/(admin)/admin/applications/page.tsx`
- `backend/src/controllers/institution-applications.controller.ts`
- `backend/src/routes/institution-applications.routes.ts`
- Migration: `institution_applications` table

## Smoke Test
```bash
# Submit application (public)
curl -X POST "localhost:3001/api/v1/institution-applications" \
  -d '{"institutionName":"Emory SOM","contactEmail":"dean@emory.edu","contactName":"Dr. Brown","size":200}'
# Expected: 201, confirmation email sent

# Review as superadmin
curl "localhost:3001/api/v1/admin/applications?status=pending" -H "Authorization: Bearer $SUPER_JWT"
# Expected: [{...Emory SOM application...}]

# Approve
curl -X PATCH "localhost:3001/api/v1/admin/applications/{id}" \
  -H "Authorization: Bearer $SUPER_JWT" -d '{"status":"approved"}'
# Expected: institution created, admin invite email sent to dean@emory.edu
```
