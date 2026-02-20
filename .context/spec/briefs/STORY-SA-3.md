# STORY-SA-3: Application Review Queue

**Epic:** E-04 (Institution Lifecycle)
**Feature:** F-02
**Sprint:** 3
**Lane:** superadmin (P1)
**Size:** M
**Old ID:** S-SA-04-2

---

## User Story
As a **SuperAdmin**, I need a review queue listing all pending institution applications so that I can evaluate and act on each request.

## Acceptance Criteria
- [ ] Review queue page at `/admin/applications` (SuperAdmin only)
- [ ] Application cards showing: institution name, type (with label mapping), student count, contact info, accreditation body, submission date
- [ ] Stat cards at top: Pending Review count, Approved count, Total Applications count
- [ ] Filterable by: status (pending default, approved, rejected, all)
- [ ] Searchable by: institution name, contact name, contact email
- [ ] Each pending application card has Approve and Reject action buttons
- [ ] Approve button opens confirmation modal with full application details
- [ ] Reject button opens modal with rejection reason textarea and full application details
- [ ] Detail modal shows: institution info, contact grid (name, email, phone), student count, website link, reason for interest
- [ ] Pagination: 25 items per page
- [ ] Loading skeleton state (3 placeholder cards with pulse animation)
- [ ] Empty state with "No applications found" message
- [ ] RBAC: only SuperAdmin role can access this route
- [ ] 10 API tests: list endpoint, pagination, filtering, sorting, auth enforcement, empty state, detail fetch, role restriction, invalid filters, search

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/ApplicationReviewQueue.tsx` | `apps/web/src/app/(protected)/admin/applications/page.tsx` | Extract inline sidebar into shared admin layout. Replace inline styles with Tailwind + design tokens. Extract application card into organism. Extract review modal into organism. Replace mock data with API fetch. Convert `useNavigate`/`useLocation` to Next.js. Replace `alert()` error handling with toast notifications. Use design tokens for status colors (pending=warning, approved=success). |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/institution/review.types.ts` (exists) |
| Service | apps/server | `src/services/institution/application-review.service.ts` |
| Controller | apps/server | `src/controllers/institution/application-review.controller.ts` |
| Routes | apps/server | `src/routes/admin/application-review.routes.ts` |
| Organisms | apps/web | `src/components/admin/application-card.tsx`, `src/components/admin/application-review-modal.tsx`, `src/components/admin/application-stat-cards.tsx` |
| Page | apps/web | `src/app/(protected)/admin/applications/page.tsx` |
| Hook | apps/web | `src/hooks/use-application-review.ts` |
| Tests | apps/server | `src/controllers/institution/__tests__/application-review.controller.test.ts` |

## Database Schema

### Supabase — queries against `applications` table (created in STORY-SA-1)
- All columns from STORY-SA-1 schema
- Filterable by `status`, searchable by `institution_name`, `contact_name`, `contact_email`
- Ordered by `submitted_at DESC` by default

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/admin/applications` | SuperAdmin | List applications with filters |
| GET | `/api/v1/admin/applications/:id` | SuperAdmin | Get single application detail |

### Query Parameters
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 25 | Items per page |
| `status` | string | "pending" | Filter by status |
| `search` | string | - | Search institution/contact |

## Dependencies
- **Blocked by:** STORY-SA-1 (applications table and data must exist), S-U-01-3 (RBAC middleware)
- **Blocks:** STORY-SA-5 (Approval Workflow), STORY-SA-6 (Rejection Workflow)
- **Cross-lane:** None

## Testing Requirements
### API Tests (10)
1. List returns paginated applications with correct fields
2. Pagination returns correct page metadata
3. Status filter returns only matching applications
4. Search by institution name returns matching results
5. Search by contact email returns matching results
6. Non-SuperAdmin receives 403 Forbidden
7. Empty results return empty array with pagination metadata
8. Single application detail returns full data
9. Invalid application ID returns 404
10. Default filter is "pending" status

## Implementation Notes
- The prototype's `ApplicationReviewQueue.tsx` shows a card-based layout (not table rows) for applications. Preserve this UX pattern.
- The modal has two modes: "approve" (shows details + confirm button) and "reject" (shows details + reason textarea + reject button).
- The prototype uses `alert()` for errors -- replace with proper toast notifications or inline error display.
- Status badge colors: pending=yellow/warning token, approved=green/success token, rejected=red/danger token.
- Institution type labels: `md` -> "MD (Allopathic)", `do` -> "DO (Osteopathic)", `combined` -> "Combined MD/DO".
- The approve/reject actions from the modal trigger endpoints defined in STORY-SA-5 and STORY-SA-6. This story only implements the list/detail read endpoints and the UI shell.
- PostgREST `.or()` filter for search: escape `%`, `_`, `,`, `.` in user input.
- The prototype's sidebar nav items (Dashboard, Applications, Institutions, Users, Settings) define the SuperAdmin navigation structure.
