# STORY-IA-24: SLO Management UI

**Epic:** E-14 (ILO & SLO CRUD)
**Feature:** F-07
**Sprint:** 5
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-14-4

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a management interface for SLOs so that I can create, view, edit, and search course-level learning objectives and monitor their alignment to ILOs.

## Acceptance Criteria
- [ ] SLO list page scoped to selected course: columns for code, title, Bloom level, status, FULFILLS link status, created date
- [ ] Course selector dropdown to switch between courses
- [ ] Search by title or code
- [ ] Filter by Bloom level, status (active/archived), FULFILLS status (linked/unlinked)
- [ ] Create SLO form: code, title, description, Bloom level, course association
- [ ] Edit SLO inline or via modal
- [ ] Soft-delete with confirmation dialog
- [ ] Controller endpoints: GET /courses/:id/slos, POST /slos, PATCH /slos/:id, DELETE /slos/:id
- [ ] 8-10 API tests for CRUD endpoints, course scoping, validation, permission checks

## Reference Screens
> No direct prototype screen. Uses same patterns as ILOManagement.tsx but scoped to course context.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/ILOManagement.tsx` (pattern reference) | `apps/web/src/app/(protected)/admin/slos/page.tsx` | Follow same component architecture as ILO management. Add course selector dropdown at top. Add FULFILLS link status column showing linked/unlinked state. Same design token patterns. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/slo/slo.types.ts` (extend if needed) |
| Controller | apps/server | `src/controllers/slo/slo.controller.ts` |
| Route | apps/server | `src/routes/slo.routes.ts` |
| Validation | apps/server | `src/middleware/slo.validation.ts` |
| View - Page | apps/web | `src/app/(protected)/admin/slos/page.tsx` |
| View - List | apps/web | `src/components/organisms/slo-management/slo-management.tsx` |
| View - Table | apps/web | `src/components/molecules/slo-table.tsx` |
| View - Form | apps/web | `src/components/molecules/slo-form.tsx` |
| Hook | apps/web | `src/hooks/use-slo-management.ts` |
| Tests | apps/server | `src/controllers/slo/__tests__/slo.controller.test.ts` |

## Database Schema
Uses existing `slos` table. Verify columns via `list_tables` before writing queries. SLOs have a `course_id` FK.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/courses/:courseId/slos` | institutional_admin, course_director | List SLOs scoped to course |
| POST | `/api/v1/slos` | institutional_admin, course_director | Create new SLO |
| PATCH | `/api/v1/slos/:id` | institutional_admin, course_director | Update SLO |
| DELETE | `/api/v1/slos/:id` | institutional_admin, course_director | Archive SLO (soft-delete) |

## Dependencies
- **Blocked by:** S-IA-14-2 (SLO model and repository must exist)
- **Blocks:** None
- **Cross-epic:** S-U-01-3 (RBAC: institutional_admin or course_director role)

## Testing Requirements
### API Tests (10)
1. GET /courses/:id/slos returns SLOs for specific course
2. GET /courses/:id/slos with search query filters by title/code
3. GET /courses/:id/slos with FULFILLS status filter
4. POST /slos creates SLO with valid data and course association
5. POST /slos rejects duplicate code within course scope (DuplicateSLOCodeError)
6. POST /slos rejects missing required fields
7. PATCH /slos/:id updates SLO fields
8. DELETE /slos/:id soft-deletes SLO
9. Course director can access own course SLOs but not other courses
10. Non-existent SLO returns 404

## Implementation Notes
- SLOManagement is an Organism containing SLOTable and SLOForm Molecules
- FULFILLS link status column shows whether SLO has an approved FULFILLS to an ILO
- Course selector dropdown at top of page scopes all data
- Use design tokens for table styling, form inputs, status badges
- Custom error class: `DuplicateSLOCodeError` for uniqueness violations within course scope
- Faculty (Course Directors) can also access this UI for their own courses -- dual role access
