# STORY-IA-1: User List & Invitation

**Epic:** E-06 (Per-Institution User Management)
**Feature:** F-03 (User & Role Management)
**Sprint:** 3
**Lane:** institutional_admin (P2)
**Size:** L
**Old ID:** S-IA-06-1

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need to view all users in my institution and invite new faculty/students/advisors so that I can manage my institution's team on the platform.

## Acceptance Criteria
- [ ] User list page at `/institution/users` (Institutional Admin only)
- [ ] Table columns: name, email, role, status (active/pending/deactivated), last login
- [ ] Sortable by: name, role, status, last login
- [ ] Filterable by: role, status
- [ ] Search by name or email (case-insensitive, debounced 300ms)
- [ ] Pagination: 25 items per page with offset-based navigation
- [ ] Invite button opens modal with: email, role selection (faculty, student, advisor), optional CD flag for faculty
- [ ] InvitationService creates invitation record and dispatches email (logged at MVP)
- [ ] Invited users appear in list with status='pending' until they accept
- [ ] Institution scoping: only users from `req.user.institution_id` visible
- [ ] RBAC enforcement: `rbac.requireScoped(AuthRole.INSTITUTIONAL_ADMIN)`
- [ ] Duplicate invitation detection returns 409
- [ ] Invitation expiry set to 14 days from creation

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/FacultyManagement.tsx` | `apps/web/src/app/(protected)/institution/users/page.tsx` | Convert from React Router to Next.js App Router. Replace inline styles with Tailwind + design tokens. Extract table into reusable organism. Replace hardcoded colors with CSS custom properties. Use `@web/*` path alias. |
| `pages/institution/UserManagement.tsx` | `apps/web/src/components/institution/user-list.tsx` | Extract search, filter, and pagination into separate molecules. Use react-hook-form + zod for invite modal validation. Replace manual state management with custom hooks. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/user/institution-user.types.ts` |
| Errors | apps/server | `src/errors/invitation.error.ts` |
| Service | apps/server | `src/services/user/institution-user.service.ts`, `src/services/email/user-invitation-email.service.ts` |
| Controller | apps/server | `src/controllers/user/institution-user.controller.ts` |
| Routes | apps/server | `src/routes/institution/user-management.routes.ts` |
| View | apps/web | `src/app/(protected)/institution/users/page.tsx` |
| Components | apps/web | `src/components/institution/user-list.tsx`, `src/components/institution/invite-user-modal.tsx` |
| Tests | apps/server | `src/services/user/__tests__/institution-user.service.test.ts`, `src/controllers/user/__tests__/institution-user.controller.test.ts` |
| E2E | apps/web | `e2e/institution-users.spec.ts` |

## Database Schema

**No new tables.** Uses existing `profiles` and `invitations` (from STORY-SA-5).

**Migration: performance indexes**
```sql
CREATE INDEX IF NOT EXISTS idx_profiles_institution_id_role
  ON profiles(institution_id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_institution_id_is_active
  ON profiles(institution_id, is_active);
CREATE INDEX IF NOT EXISTS idx_invitations_institution_id_status
  ON invitations(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_email_institution
  ON invitations(email, institution_id);
```

**Query pattern:** Union of active profiles + pending invitations, both scoped by `institution_id`.

**No Neo4j schema** -- DualWrite deferred for invitations at MVP.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/institution/users` | InstitutionalAdmin (scoped) | List users with pagination, search, filters |
| POST | `/api/v1/institution/users/invite` | InstitutionalAdmin (scoped) | Create invitation for new user |

## Dependencies
- **Blocked by:** STORY-U-6 (RBAC Middleware), STORY-SA-5 (Approval Workflow creates institutions + invitations table)
- **Blocks:** STORY-IA-17 (User Deactivation), STORY-IA-18 (Role Assignment & CD Flag)
- **Cross-lane:** STORY-U-9 (invited users accept via invitation flow)

## Testing Requirements
### API Tests (~17)
- list: paginated results scoped to institution_id, includes pending invitations, filters by role/status, search by name/email, sort by valid fields, cap limit at 100, empty list with correct meta, correct total_pages
- invite: creates record with correct institution_id and role, duplicate invitation returns DuplicateInvitationError, sets expiration to 14 days, calls email service, existing user email in same institution rejected
- controller: 200 with user list, scopes to req.user.institution_id, 400 for invalid sort_by, 201 for valid invite, 400 for missing email/invalid role, 409 for duplicate

### E2E Tests (1)
- InstitutionalAdmin can view user list and invite a new user end-to-end

## Implementation Notes
- Use `rbac.requireScoped(AuthRole.INSTITUTIONAL_ADMIN)` -- checks both role AND `institution_id` presence.
- List combines active profiles with pending invitations via two separate queries merged in service layer. Use Supabase RPC or two queries at MVP.
- Email service: `UserInvitationEmailService.sendInvitation()` logs payload at MVP -- actual SMTP wired in future story.
- CD flag on invite only meaningful when `role='faculty'` -- validate in controller, reject for student/advisor.
- Service classes use `readonly #supabaseClient` with constructor DI per architecture rules.
- Invitation expiry checked at query time, not via background job.
- User table organism should be reusable -- similar pattern used in SA global directory.
