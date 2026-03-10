# PSUPP-015: Admin — Institution List (/admin/institutions)
**Group:** Admin Institution Management
**Component:** `InstitutionListDashboard` | `pages/admin/InstitutionListDashboard.tsx`
**Priority:** P1 — superadmin needs to manage multiple institutions
**Depends:** P4-011 (admin auth + roles)
**Specialist:** @frontend-specialist + @backend-specialist

**As a** superadmin
**I want** to see all institutions on the platform with their health metrics
**So that** I can monitor, configure, and support each institution from a central view

## Acceptance Criteria
- Route: `/admin/institutions` — superadmin only
- Endpoint: `GET /api/v1/admin/institutions`
- Response:
```typescript
interface InstitutionListResponse {
  institutions: {
    id: string;
    name: string;
    type: string;               // 'medical_school' | 'residency_program' | 'hospital'
    status: 'active' | 'trial' | 'suspended' | 'pending';
    adminCount: number;
    facultyCount: number;
    studentCount: number;
    courseCount: number;
    approvedItemCount: number;
    coverageScore: number;      // 0-100
    storageUsedMb: number;
    createdAt: string;
    lastActivityAt: string;
  }[];
  total: number;
}
```
- Table with sortable columns: name, status badge, faculty count, item count, coverage %, last activity
- Filter by status (active / trial / suspended)
- Search by name
- "View Details" per row → `/admin/institutions/:id`
- "Suspend" / "Activate" per row (inline status toggle)
- "Provision New Institution" button → opens creation modal:
  - Institution name, type, admin email (auto-sends invite to become institution_admin)
- `POST /api/v1/admin/institutions` — create institution + admin invite
- `PATCH /api/v1/admin/institutions/:id` — update status

## Files to Create
- `frontend/src/app/(admin)/admin/institutions/page.tsx`
- `frontend/src/hooks/useInstitutions.ts`
- `backend/src/controllers/institutions.controller.ts`
- `backend/src/routes/institutions.routes.ts`
- Migration: `institutions` table (id, name, type, status, settings JSONB, created_at)

## Smoke Test
```bash
curl "localhost:3001/api/v1/admin/institutions" -H "Authorization: Bearer $SUPER_ADMIN_JWT"
# Expected: { total: N, institutions: [...] }
# Role check: institution_admin JWT → 403
```
