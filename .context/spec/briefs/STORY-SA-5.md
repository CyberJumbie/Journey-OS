# STORY-SA-5: Approval Workflow

**Epic:** E-04 (Institution Lifecycle)
**Feature:** F-02
**Sprint:** 3
**Lane:** superadmin (P1)
**Size:** M
**Old ID:** S-SA-04-3

---

## User Story
As a **SuperAdmin**, I need to approve an institution application so that the institution record is created and an invitation email is dispatched to the designated admin contact.

## Acceptance Criteria
- [ ] Approve action transitions application status: `pending` -> `approved`
- [ ] InstitutionService creates new institution record in Supabase with `status = 'active'`
- [ ] DualWriteService creates `Institution` node in Neo4j with matching properties
- [ ] Institution record includes: name, type, accreditation_body, `status = 'active'`, created from application data
- [ ] Invitation record created with: token (UUID), `role = 'institutional_admin'`, `institution_id`, `expires_at` (7 days)
- [ ] Invitation email dispatched to application contact with admin role
- [ ] Email contains branded invitation link: `/invite/accept?token=xxx`
- [ ] Approval timestamp (`reviewed_at`) and approving SuperAdmin ID (`reviewed_by`) recorded on application
- [ ] Duplicate approval prevention: if application status is not 'pending', return 409 Conflict
- [ ] All mutations (application update, institution creation, invitation creation) wrapped in Supabase RPC function for atomicity
- [ ] Rollback strategy: if Neo4j write fails, mark `sync_status = 'pending'` and queue for retry
- [ ] Optimistic UI update on approve button click in the review queue
- [ ] 10 API tests

## Reference Screens
**None** -- backend + actions within Review Queue (STORY-SA-3). The approve action is triggered from the confirmation modal in the Application Review Queue.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/institution/approval.types.ts` (exists), `src/institution/institution.types.ts` (exists), `src/institution/invitation.types.ts` (exists) |
| Model | apps/server | `src/models/institution.model.ts` |
| Repository | apps/server | `src/repositories/institution.repository.ts`, `src/repositories/invitation.repository.ts` |
| Service | apps/server | `src/services/institution/institution.service.ts`, `src/services/institution/approval.service.ts`, `src/services/email/invitation-email.service.ts` |
| Controller | apps/server | `src/controllers/institution/approval.controller.ts` |
| Routes | apps/server | `src/routes/admin/application-review.routes.ts` (update, add approve endpoint) |
| RPC | Supabase | Migration: `approve_application` RPC function |
| Tests | apps/server | `src/services/institution/__tests__/approval.service.test.ts`, `src/controllers/institution/__tests__/approval.controller.test.ts` |

## Database Schema

### Supabase — `institutions` table (created by this story)
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `name` | varchar(255) | NOT NULL, UNIQUE |
| `type` | varchar(20) | NOT NULL, CHECK IN ('md', 'do', 'combined') |
| `accreditation_body` | varchar(100) | NOT NULL |
| `status` | varchar(20) | NOT NULL, DEFAULT 'active', CHECK IN ('active', 'suspended', 'archived') |
| `contact_email` | varchar(255) | NULL |
| `website` | varchar(500) | NULL |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() |
| `sync_status` | varchar(20) | NOT NULL, DEFAULT 'pending' |
| `graph_node_id` | varchar(100) | NULL |

### Supabase — `invitations` table (created by this story)
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `token` | uuid | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() |
| `email` | varchar(255) | NOT NULL |
| `role` | varchar(50) | NOT NULL |
| `institution_id` | uuid | NOT NULL, FK -> institutions |
| `status` | varchar(20) | NOT NULL, DEFAULT 'pending', CHECK IN ('pending', 'accepted', 'expired') |
| `expires_at` | timestamptz | NOT NULL |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `accepted_at` | timestamptz | NULL |

### Supabase — RPC function `approve_application`
Atomic operation:
1. UPDATE `applications` SET `status` = 'approved', `reviewed_at` = now(), `reviewed_by` = admin_id WHERE id = app_id AND `status` = 'pending'
2. INSERT INTO `institutions` (name, type, accreditation_body, contact_email, website) from application data
3. INSERT INTO `invitations` (email, role, institution_id, expires_at) with contact_email, 'institutional_admin', new institution_id, now() + 7 days
4. RETURN institution_id, invitation_token

### Neo4j — Institution node
```
(Institution {
  id: uuid,
  name: string,
  type: string,
  accreditation_body: string,
  status: 'active',
  created_at: datetime
})
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/admin/applications/:id/approve` | SuperAdmin | Approve application, create institution + invitation |

### POST Response
```json
{
  "data": {
    "application_id": "uuid",
    "institution_id": "uuid",
    "invitation_token": "uuid",
    "invitation_email": "string"
  }
}
```

## Dependencies
- **Blocked by:** STORY-SA-3 (Review Queue UI must exist for the approve action)
- **Blocks:** STORY-IA-1 (Institution admin users join via invitation), STORY-U-9 (Invitation acceptance flow consumes the token created here)
- **Cross-lane:** STORY-U-9 (universal lane -- invitation acceptance flow)

## Testing Requirements
### API Tests (10)
1. Successful approval creates institution record in Supabase
2. Successful approval creates Institution node in Neo4j (DualWrite)
3. Invitation record created with correct role and institution_id
4. Email dispatch called with correct invitation link (mocked)
5. Application status transitions from 'pending' to 'approved'
6. `reviewed_at` and `reviewed_by` set on application
7. Duplicate approval (already approved) returns 409 Conflict
8. Non-SuperAdmin receives 403 Forbidden
9. Invalid application ID returns 404
10. RPC atomicity: if institution creation fails, application status not changed

## Implementation Notes
- DualWriteService pattern: Supabase institution first -> Neo4j Institution node second. If Neo4j fails, set `sync_status = 'pending'` and queue for retry.
- Use Supabase RPC function for atomicity across applications, institutions, and invitations tables. See `docs/solutions/supabase-transactional-rpc-pattern.md`.
- Email service should be abstracted for swappable providers (Resend, SendGrid, etc.). Use constructor DI.
- The invitation token is a UUID, not a JWT. Token validation happens in STORY-U-9.
- Prevent double-approval: the RPC function should check `status = 'pending'` in the WHERE clause. If 0 rows updated, the application was already processed.
- The institution `name` should be UNIQUE to prevent duplicate institutions.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
