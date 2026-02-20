# STORY-SA-8: Institution Suspend/Reactivate

**Epic:** E-05 (Institution Monitoring)
**Feature:** F-02
**Sprint:** 9
**Lane:** superadmin (P1)
**Size:** S
**Old ID:** S-SA-05-3

---

## User Story
As a **SuperAdmin**, I need to suspend and reactivate institutions so that I can manage platform access for institutions that violate policies or request temporary deactivation.

## Acceptance Criteria
- [ ] Suspend action: sets institution status to `suspended`, effectively disables all user logins for that institution
- [ ] Reactivate action: sets institution status to `active`, re-enables user logins
- [ ] Confirmation dialog before suspend: "This will prevent all N users from logging in. Proceed?" (shows actual user count)
- [ ] Reason field required when suspending (stored in `institution_status_changes` audit table)
- [ ] Reason field optional when reactivating
- [ ] Status change reflected in institution list and detail views immediately (optimistic UI)
- [ ] Suspended institution users see "Your institution has been suspended. Contact your administrator." on login attempt (403 with message)
- [ ] Institution-status middleware: on every authenticated request, verify `institution.status !== 'suspended'`; if suspended, return 403
- [ ] Email notification to institution admin(s) on suspend/reactivate
- [ ] Audit trail: all status changes logged with actor_id, from_status, to_status, reason, timestamp
- [ ] DualWriteService: update institution status in both Supabase and Neo4j
- [ ] Suspend does NOT delete data -- all data preserved for reactivation
- [ ] 5-8 API tests

## Reference Screens
**None** -- actions within Institution Detail (STORY-SA-9). Suspend/Reactivate are action buttons on the institution detail view header, triggering confirmation modals.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/admin/institution-lifecycle.types.ts` (exists) |
| Service | apps/server | `src/services/admin/institution-lifecycle.service.ts` |
| Controller | apps/server | `src/controllers/admin/institution.controller.ts` (update, add suspend/reactivate endpoints) |
| Middleware | apps/server | `src/middleware/institution-status.middleware.ts` |
| Routes | apps/server | `src/routes/admin/institution.routes.ts` (update) |
| Email | apps/server | `src/services/email/institution-status-email.service.ts` |
| Migration | Supabase | `institution_status_changes` audit table |
| Organisms | apps/web | `src/components/admin/suspend-confirm-dialog.tsx`, `src/components/admin/reactivate-confirm-dialog.tsx` |
| Hook | apps/web | `src/hooks/use-institution-lifecycle.ts` |
| Tests | apps/server | `src/controllers/admin/__tests__/institution-lifecycle.test.ts` |

## Database Schema

### Supabase -- `institution_status_changes` table (new)
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `institution_id` | uuid | NOT NULL, FK -> institutions |
| `from_status` | varchar(20) | NOT NULL |
| `to_status` | varchar(20) | NOT NULL |
| `reason` | text | NULL (required for suspend, optional for reactivate) |
| `actor_id` | uuid | NOT NULL, FK -> auth.users |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |

### Supabase -- updates `institutions` table
- `status` column updated to 'suspended' or 'active'
- `updated_at` column updated to now()

### Neo4j -- update Institution node
```
MATCH (i:Institution {id: $institutionId})
SET i.status = $newStatus
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/admin/institutions/:id/suspend` | SuperAdmin | Suspend institution |
| POST | `/api/v1/admin/institutions/:id/reactivate` | SuperAdmin | Reactivate institution |

### Suspend Request Body
```json
{
  "reason": "string (required, min 10 chars)"
}
```

### Reactivate Request Body
```json
{
  "reason": "string (optional)"
}
```

## Dependencies
- **Blocked by:** STORY-SA-7 (Institution List Dashboard), STORY-SA-5 (Institution model must exist)
- **Blocks:** None
- **Cross-lane:** Affects all lanes -- the institution-status middleware impacts every authenticated request for users of suspended institutions

## Testing Requirements
### API Tests (8)
1. Suspend sets institution status to 'suspended'
2. Reactivate sets institution status to 'active'
3. Suspend without reason returns 422
4. Suspended institution users receive 403 on subsequent requests (middleware test)
5. Reactivated institution users can make requests again
6. Audit log entry created with correct from/to status
7. Non-SuperAdmin receives 403 Forbidden
8. DualWriteService updates Neo4j Institution node status

### Middleware Tests (3)
1. Active institution users pass through middleware
2. Suspended institution users blocked with 403 and descriptive message
3. SuperAdmin users bypass institution status check (platform-level access)

## Implementation Notes
- The `institution-status.middleware.ts` runs AFTER JWT validation, BEFORE route handler. It must check the user's institution status on every authenticated request.
- Performance: cache institution status in Redis (if available) or in-memory with short TTL (30s) to avoid DB hit on every request. Invalidate on status change.
- SuperAdmin users should bypass the institution status check entirely -- they are platform-level users not scoped to any institution.
- The suspend confirmation dialog must dynamically show the user count for the institution (fetched from the detail endpoint).
- DualWriteService: update Supabase first, then Neo4j. If Neo4j fails, set `sync_status = 'pending'`.
- Suspend does NOT cascade delete. All users, courses, and content remain intact. Only login access is blocked.
- Email notification should go to all users with `institutional_admin` role for that institution.
- Express `req.params` values are `string | string[]` -- narrow with `typeof === "string"`.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table names.
