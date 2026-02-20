# STORY-IA-17: User Deactivation

**Epic:** E-06 (Per-Institution User Management)
**Feature:** F-03 (User & Role Management)
**Sprint:** 3
**Lane:** institutional_admin (P2)
**Size:** S
**Old ID:** S-IA-06-3

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need to deactivate a user so that their access is revoked while preserving their data for audit and potential reactivation.

## Acceptance Criteria
- [ ] Deactivate button on user row/detail with confirmation dialog
- [ ] Confirmation dialog shows: user name, role, and impact summary
- [ ] Soft-delete: sets `is_active = false` / `status = 'deactivated'`, does not remove records
- [ ] Deactivated users cannot log in (Supabase auth user banned)
- [ ] Deactivated users appear in list with 'deactivated' status badge
- [ ] DualWriteService updates both Supabase and Neo4j status
- [ ] Reactivation option available (reverses deactivation)
- [ ] Audit log entry for deactivation: who, when, reason
- [ ] Deactivated faculty do not appear in course assignment dropdowns

## Reference Screens
**None** -- action within the User List from STORY-IA-1. Uses confirmation modal component.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Service | apps/server | `src/services/user/user-deactivation.service.ts` |
| Controller | apps/server | `src/controllers/user/user-deactivation.controller.ts` |
| Routes | apps/server | `src/routes/institution/user-management.routes.ts` (update) |
| Components | apps/web | `src/components/institution/deactivation-confirm-modal.tsx` |
| Tests | apps/server | `src/services/user/__tests__/user-deactivation.service.test.ts` |

## Database Schema

No new tables. Updates existing `profiles` table (`is_active` field) and Supabase auth user (banned flag).

**Audit log entry:** Uses existing `audit_logs` table (if available) or creates one:
```sql
INSERT INTO audit_logs (action, target_type, target_id, performed_by, details, created_at)
VALUES ('user_deactivated', 'profile', $userId, $adminId, $details, now());
```

### Neo4j -- Person node property update
```cypher
MATCH (p:Person {id: $userId}) SET p.status = 'deactivated'
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PUT | `/api/v1/institution/users/:id/deactivate` | InstitutionalAdmin (scoped) | Deactivate a user |
| PUT | `/api/v1/institution/users/:id/reactivate` | InstitutionalAdmin (scoped) | Reactivate a user |

## Dependencies
- **Blocked by:** STORY-IA-1 (User List & Invitation -- user list must exist)
- **Blocks:** None
- **Cross-lane:** None

## Testing Requirements
### API Tests (5)
- Deactivation: sets user inactive, bans Supabase auth user
- Login prevention: deactivated user receives 403 on login attempt
- Reactivation: reverses ban, sets user active again
- Auth enforcement: non-admin cannot deactivate users
- Audit log: deactivation event recorded with admin ID and timestamp

## Implementation Notes
- Soft-delete pattern: never hard-delete user records. Set status field and disable Supabase auth user.
- Supabase admin API: `supabase.auth.admin.updateUserById(id, { banned: true })` for deactivation.
- Reactivation reverses the ban: `supabase.auth.admin.updateUserById(id, { banned: false })`.
- Consider cascade effects: deactivated faculty should not appear in course assignment dropdowns.
- Must use Supabase RPC for atomic multi-table writes (profile + audit_log). See `docs/solutions/supabase-transactional-rpc-pattern.md`.
- Express `req.params.id` is `string | string[]` -- narrow with `typeof === "string"`.
- Service uses `readonly #supabaseClient` with constructor DI.
