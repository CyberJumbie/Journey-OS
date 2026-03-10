# PSUPP-016: Admin — Institution Detail (/admin/institutions/:id)
**Group:** Admin Institution Management
**Component:** `InstitutionDetailView` | `pages/admin/InstitutionDetailView.tsx`
**Priority:** P1
**Depends:** PSUPP-015
**Specialist:** @frontend-specialist

**As a** superadmin
**I want** a detailed view of a single institution including all users, courses, storage, and health signals
**So that** I can support that institution and troubleshoot issues without asking them to run queries

## Acceptance Criteria
- Route: `/admin/institutions/:id`
- Endpoint: `GET /api/v1/admin/institutions/:id`
- Tabs:
  1. **Overview** — KPIs (faculty, students, courses, items, coverage %), recent activity log, storage usage bar
  2. **Users** — same as `/admin/users` but scoped to this institution; can invite users directly into this institution
  3. **Courses** — list of all courses with question counts and coverage
  4. **Health** — sync failure count, lint rule status, UMLS enrichment status (from data-integrity endpoint scoped to institution)
  5. **Settings** — institution name (editable), framework families enabled, storage limit (editable by superadmin)
- "Impersonate Admin" button (superadmin only) — creates a temporary scoped JWT for this institution; logs the action in audit_log
- Endpoint for impersonation: `POST /api/v1/admin/institutions/:id/impersonate` → returns scoped JWT + audit log entry

## Files to Create
- `frontend/src/app/(admin)/admin/institutions/[id]/page.tsx`
- `backend/src/controllers/institution-detail.controller.ts`

## Smoke Test
```bash
curl "localhost:3001/api/v1/admin/institutions/{msm-uuid}" -H "Authorization: Bearer $SUPER_ADMIN_JWT"
# Expected: { name, facultyCount, courseCount, health: {...} }
```
