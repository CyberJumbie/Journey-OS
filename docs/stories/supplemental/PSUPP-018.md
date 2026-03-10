# PSUPP-018: Admin — Framework Management (/admin/frameworks)
**Group:** Admin Institution Management
**Component:** `FrameworkManagement` | `pages/admin/FrameworkManagement.tsx`
**Priority:** P2 — superadmin-level; institution admins get /institution/frameworks (P3-002)
**Depends:** P3-001 (framework families seeded)
**Specialist:** @frontend-specialist

**As a** superadmin
**I want** to globally manage assessment framework definitions — adding new frameworks, editing element lists, and controlling defaults
**So that** institutions can enable custom frameworks without needing database access

## Acceptance Criteria
- Route: `/admin/frameworks` — superadmin only
- This is the GLOBAL management view; `/institution/frameworks` (P3-002) is the per-institution enable/disable toggle
- Sections:
  1. **Framework Families** — list of all framework families (USMLE, ACGME, LCME, NBME, Custom)
     - Per family: name, element count, institution adoption count, default enabled toggle
  2. **Custom Framework Builder** — create a new framework family:
     - Name, description, element list (CSV import OR manual entry)
     - Assign to: all institutions / specific institutions
  3. **USMLE System Management** — edit the 16 USMLE systems and 7 disciplines
     - Add/rename/archive systems; changes propagate to heatmap
  4. **LCME Elements** — view/edit 93 LCME elements (name, description, standard grouping)
     - Import updated LCME standards from CSV
- All edits write to `framework_elements` table
- `GET /api/v1/admin/frameworks` — list all
- `POST /api/v1/admin/frameworks` — create new
- `PATCH /api/v1/admin/frameworks/:id` — update
- `POST /api/v1/admin/frameworks/import-csv` — bulk import elements

## Files to Create
- `frontend/src/app/(admin)/admin/frameworks/page.tsx`
- `backend/src/controllers/framework-admin.controller.ts`
- `backend/src/routes/framework-admin.routes.ts`
- Migration: `framework_families`, `framework_elements` tables (if not already seeded in P1-006)

## Smoke Test
```bash
# List all frameworks
curl "localhost:3001/api/v1/admin/frameworks" -H "Authorization: Bearer $SUPER_JWT"
# Expected: [USMLE, ACGME, LCME, NBME, ...] each with elementCount

# Create custom framework
curl -X POST "localhost:3001/api/v1/admin/frameworks" \
  -H "Authorization: Bearer $SUPER_JWT" \
  -d '{"name":"MSM Core Competencies","elements":["Patient Care","Medical Knowledge","Professionalism"]}'
# Expected: 201, framework created, available for institutions to enable
```
