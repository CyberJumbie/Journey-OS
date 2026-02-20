# STORY-IA-23: ILO Management UI

**Epic:** E-14 (ILO & SLO CRUD)
**Feature:** F-07
**Sprint:** 5
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-14-3

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a management interface for ILOs so that I can create, view, edit, and search institutional learning objectives across my institution's programs.

## Acceptance Criteria
- [ ] ILO list page with table: columns for code, title, Bloom level, status, FULFILLS count, created date
- [ ] ILOs grouped by course with expandable/collapsible course sections
- [ ] Search by title or code
- [ ] Filter by Bloom level, status (active/archived)
- [ ] Create ILO form (modal): code, title, description, Bloom level selection
- [ ] Edit ILO inline or via modal
- [ ] CSV import modal with drag-and-drop upload
- [ ] Framework mapping modal: checkbox grid for ACGME, EPA, LCME mappings
- [ ] Soft-delete with confirmation dialog (archive, not destroy)
- [ ] Stats cards: total ILOs, ACGME mapped, EPA mapped, LCME mapped
- [ ] Controller endpoints: GET /ilos, POST /ilos, PATCH /ilos/:id, DELETE /ilos/:id
- [ ] 8-10 API tests for CRUD endpoints, validation, search, permission checks

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/ILOManagement.tsx` | `apps/web/src/app/(protected)/admin/ilos/page.tsx` | Convert from React Router to Next.js App Router. Replace `export default` (required for page.tsx). Extract stats cards, course-grouped table, create/edit/mapping modals into separate components. Replace hardcoded colors (`text-blue-600`, `text-purple-600`, `text-green-600`) with design tokens. Use react-hook-form + zod for form validation. Replace manual modal state with Dialog from shadcn/ui. Remove `AdminDashboardLayout` wrapper (use route group layout). |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/ilo/ilo.types.ts` (extend if needed) |
| Controller | apps/server | `src/controllers/ilo/ilo.controller.ts` |
| Route | apps/server | `src/routes/ilo.routes.ts` |
| Validation | apps/server | `src/middleware/ilo.validation.ts` |
| View - Page | apps/web | `src/app/(protected)/admin/ilos/page.tsx` |
| View - List | apps/web | `src/components/organisms/ilo-management/ilo-management.tsx` |
| View - Table | apps/web | `src/components/molecules/ilo-table.tsx` |
| View - Form | apps/web | `src/components/molecules/ilo-form.tsx` |
| View - Stats | apps/web | `src/components/molecules/ilo-stats.tsx` |
| View - Mapping Modal | apps/web | `src/components/molecules/ilo-mapping-modal.tsx` |
| Hook | apps/web | `src/hooks/use-ilo-management.ts` |
| Tests | apps/server | `src/controllers/ilo/__tests__/ilo.controller.test.ts` |

## Database Schema
Uses existing `ilos` table. Verify columns via `list_tables` before writing queries.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/ilos` | institutional_admin | List ILOs with search/filter |
| POST | `/api/v1/ilos` | institutional_admin | Create new ILO |
| PATCH | `/api/v1/ilos/:id` | institutional_admin | Update ILO |
| DELETE | `/api/v1/ilos/:id` | institutional_admin | Archive ILO (soft-delete) |
| POST | `/api/v1/ilos/import` | institutional_admin | CSV bulk import |

## Dependencies
- **Blocked by:** S-IA-14-1 (ILO model and repository must exist)
- **Blocks:** None
- **Cross-epic:** S-U-01-3 (RBAC: institutional_admin role)

## Testing Requirements
### API Tests (10)
1. GET /ilos returns paginated list for institution scope
2. GET /ilos with search query filters by title/code
3. GET /ilos with Bloom level filter
4. POST /ilos creates ILO with valid data
5. POST /ilos rejects duplicate code within institution (DuplicateILOCodeError)
6. POST /ilos rejects missing required fields
7. PATCH /ilos/:id updates ILO fields
8. DELETE /ilos/:id soft-deletes ILO
9. Unauthorized user gets 403
10. Non-existent ILO returns 404

## Implementation Notes
- ILOManagement is an Organism containing ILOTable and ILOForm Molecules
- FULFILLS count column shows how many SLOs map to each ILO (read from junction data)
- Bloom level selector uses a dropdown with the 6 taxonomy levels (Remember, Understand, Apply, Analyze, Evaluate, Create)
- Use design tokens for table styling, form inputs, status badges
- Custom error class: `DuplicateILOCodeError` for uniqueness violations
- Framework mapping badges: ACGME (blue token), EPA (purple token), LCME (green token) -- use design tokens, not hardcoded Tailwind colors
- CSV import reuses upload pattern from S-F-09-2 if available
