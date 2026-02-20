# STORY-SA-4: User Reassignment

**Epic:** E-07 (Cross-Institution User Management)
**Feature:** F-03
**Sprint:** 3
**Lane:** superadmin (P1)
**Size:** M
**Old ID:** S-SA-07-2

---

## User Story
As a **SuperAdmin**, I need to reassign a user from one institution to another so that faculty or staff transfers are handled without losing their account data.

## Acceptance Criteria
- [ ] Reassign action accessible from user detail within Global User Directory (modal-based, no separate page)
- [ ] Target institution selected from dropdown of active institutions
- [ ] Confirmation dialog shows: user name, current institution, target institution, impact summary (courses to be archived, role preservation)
- [ ] ReassignmentService updates `institution_id` in Supabase `profiles` table
- [ ] DualWriteService updates Neo4j: remove old `(Person)-[:BELONGS_TO]->(Institution)`, create new relationship
- [ ] Course associations from old institution are archived (`course_members.status = 'archived'`), not deleted
- [ ] User retains their role unless explicitly changed during reassignment
- [ ] Course Director flag (`is_course_director`) reset to `false` on reassignment (CD is institution-scoped)
- [ ] Audit log entry: reassignment event with `from_institution_id`, `to_institution_id`, timestamp, `admin_id`
- [ ] Notification email sent to user about institution change
- [ ] Same-institution reassignment rejected with error
- [ ] Concurrent reassignment guard: optimistic locking via `updated_at` check
- [ ] All mutations (profile update, course archival, audit log) wrapped in Supabase RPC function for atomicity
- [ ] 10 API tests

## Reference Screens
**None** -- modal within Global User Directory (STORY-SA-2). The reassignment UI is a confirmation modal triggered from the user directory table row actions.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/user/reassignment.types.ts` (if not exists, check first) |
| Service | apps/server | `src/services/user/user-reassignment.service.ts` |
| Controller | apps/server | `src/controllers/user/user-reassignment.controller.ts` |
| Routes | apps/server | `src/routes/admin/user-management.routes.ts` (update, add reassignment endpoint) |
| Email | apps/server | `src/services/email/reassignment-email.service.ts` |
| RPC | Supabase | Migration: `reassign_user_institution` RPC function |
| Organisms | apps/web | `src/components/admin/reassignment-confirm-modal.tsx` |
| Hook | apps/web | `src/hooks/use-user-reassignment.ts` |
| Tests | apps/server | `src/services/user/__tests__/user-reassignment.service.test.ts`, `src/controllers/user/__tests__/user-reassignment.controller.test.ts` |

## Database Schema

### Supabase — RPC function `reassign_user_institution`
Atomic operation that performs:
1. UPDATE `profiles` SET `institution_id` = target_id WHERE id = user_id AND `updated_at` = expected_updated_at (optimistic lock)
2. UPDATE `profiles` SET `is_course_director` = false WHERE id = user_id (if faculty)
3. UPDATE `course_members` SET `status` = 'archived' WHERE `user_id` = user_id AND course belongs to old institution
4. INSERT INTO `audit_logs` (action, entity_type, entity_id, actor_id, metadata) VALUES ('user_reassigned', 'user', user_id, admin_id, jsonb with from/to institution)

### Neo4j — relationship update
```
// In single transaction:
MATCH (p:Person {id: $userId})-[r:BELONGS_TO]->(old:Institution {id: $fromInstitutionId})
DELETE r
WITH p
MATCH (new:Institution {id: $toInstitutionId})
CREATE (p)-[:BELONGS_TO]->(new)
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/admin/users/:id/reassign` | SuperAdmin | Reassign user to different institution |
| GET | `/api/v1/admin/institutions/active` | SuperAdmin | List active institutions for dropdown |

### POST Request Body
```json
{
  "to_institution_id": "uuid",
  "reason": "string (optional)"
}
```

## Dependencies
- **Blocked by:** STORY-SA-2 (Global User Directory must exist for the UI context)
- **Blocks:** None
- **Cross-lane:** None

## Testing Requirements
### API Tests (10)
1. Successful reassignment updates `institution_id` in profiles
2. DualWriteService removes old and creates new BELONGS_TO relationship
3. Audit log entry created with correct from/to institutions
4. Email notification dispatched (mocked)
5. Same-institution reassignment returns 422 error
6. Invalid institution ID returns 404
7. Non-SuperAdmin receives 403 Forbidden
8. Course memberships from old institution archived (not deleted)
9. User role preserved after reassignment
10. Concurrent reassignment blocked by optimistic lock (409 Conflict)

### Service Tests (5)
1. Course Director flag reset on faculty reassignment
2. Active institutions dropdown excludes suspended/archived
3. Reassignment RPC function is atomic (rollback on failure)
4. Neo4j relationship update in single transaction
5. Concurrent access with stale `updated_at` raises conflict error

## Implementation Notes
- Reassignment is a complex multi-system operation. Use Supabase RPC for atomicity on the Postgres side. See `docs/solutions/supabase-transactional-rpc-pattern.md`.
- Neo4j relationship update: DELETE old BELONGS_TO, CREATE new BELONGS_TO in same transaction.
- Course archival: set `course_members.status = 'archived'` for old institution courses. Data is preserved for audit.
- Edge case: user with Course Director flag should have CD flag reset on reassignment (CD is institution-scoped).
- Email service should be abstracted for swappable providers (same pattern as STORY-SA-5/SA-6).
- The confirmation modal should show the number of courses that will be archived as part of the impact summary.
- Express `req.params` values are `string | string[]` -- narrow with `typeof === "string"` before passing to service.
