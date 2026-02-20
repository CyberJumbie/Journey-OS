# STORY-IA-18: Role Assignment & CD Flag

**Epic:** E-06 (Per-Institution User Management)
**Feature:** F-03 (User & Role Management)
**Sprint:** 3
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-06-2

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need to assign roles to users and toggle the Course Director flag for faculty members so that access permissions and course management capabilities are correctly configured.

## Acceptance Criteria
- [ ] Role dropdown on user detail/edit view: faculty, student, advisor
- [ ] Role change updates Supabase `app_metadata.role` and Neo4j Person node
- [ ] Course Director (CD) flag toggle visible only for faculty role users
- [ ] CD flag stored as boolean in user profile and Neo4j Person node
- [ ] CD flag grants additional permissions: course creation, SLO management
- [ ] Role change triggers DualWriteService update
- [ ] Confirmation dialog before role change (destructive action warning)
- [ ] Audit log entry for every role change: who, when, from_role, to_role
- [ ] Atomic multi-table write via Supabase RPC (profile + app_metadata + audit_log)

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/settings/UserRoleManagement.tsx` | `apps/web/src/app/(protected)/institution/users/[id]/page.tsx` | Convert to Next.js App Router with dynamic route. Replace inline styles with Tailwind + design tokens. Extract role select and CD flag toggle into molecules. |
| `pages/faculty/CourseRoster.tsx` | `apps/web/src/components/institution/role-assignment-form.tsx` | Extract role management form for reuse. Use react-hook-form + zod for validation. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/user/role-assignment.types.ts` |
| Service | apps/server | `src/services/user/role-assignment.service.ts` |
| Controller | apps/server | `src/controllers/user/role-assignment.controller.ts` |
| Routes | apps/server | `src/routes/institution/user-management.routes.ts` (update) |
| Page | apps/web | `src/app/(protected)/institution/users/[id]/page.tsx` |
| Components | apps/web | `src/components/institution/role-assignment-form.tsx`, `src/components/institution/cd-flag-toggle.tsx` |
| Tests | apps/server | `src/services/user/__tests__/role-assignment.service.test.ts`, `src/controllers/user/__tests__/role-assignment.controller.test.ts` |

## Database Schema

No new tables. Updates existing `profiles` table and Supabase auth `app_metadata`.

**Atomic update via Supabase RPC:**
```sql
CREATE OR REPLACE FUNCTION update_user_role(
  p_user_id UUID, p_new_role TEXT, p_is_cd BOOLEAN,
  p_admin_id UUID, p_old_role TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET role = p_new_role, is_course_director = p_is_cd, updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO audit_logs (action, target_type, target_id, performed_by, details)
  VALUES ('role_changed', 'profile', p_user_id, p_admin_id,
    jsonb_build_object('from_role', p_old_role, 'to_role', p_new_role, 'is_cd', p_is_cd));
END;
$$ LANGUAGE plpgsql;
```

### Neo4j -- Person node property update
```cypher
MATCH (p:Person {id: $userId})
SET p.role = $newRole, p.is_course_director = $isCD
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PUT | `/api/v1/institution/users/:id/role` | InstitutionalAdmin (scoped) | Update user role and CD flag |
| GET | `/api/v1/institution/users/:id` | InstitutionalAdmin (scoped) | Get user detail for edit view |

## Dependencies
- **Blocked by:** STORY-IA-1 (User List & Invitation)
- **Blocks:** None
- **Cross-lane:** None

## Testing Requirements
### API Tests (10)
- Role update: changes profile role and app_metadata.role
- CD flag toggle: sets is_course_director on profile and Neo4j node
- Non-faculty CD rejection: CD flag rejected for student/advisor roles
- Dual-write: Supabase and Neo4j both updated
- Auth enforcement: non-admin cannot change roles
- Institution scoping: admin cannot change roles for users in other institutions
- Audit log: role change recorded with from_role, to_role, admin ID
- Invalid role: rejected with validation error
- Concurrent update: handles race conditions gracefully
- Permission matrix: CD flag grants course creation permissions

## Implementation Notes
- CD flag is separate from role; a faculty member can be faculty without being a Course Director.
- Role changes must update JWT claims via Supabase admin API (`app_metadata` update).
- Audit logging is essential for compliance; store in dedicated `audit_logs` table.
- DualWriteService: Supabase profile update first -> Neo4j Person node property update second.
- Must use Supabase RPC for atomic multi-table writes (profile + audit_log). See `docs/solutions/supabase-transactional-rpc-pattern.md`.
- Use `AuthRole` enum (not string literal) when calling `rbac.require()`.
- Express `req.params.id` is `string | string[]` -- narrow with `typeof === "string"`.
