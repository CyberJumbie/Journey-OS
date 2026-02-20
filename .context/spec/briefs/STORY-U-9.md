# STORY-U-9: Invitation Acceptance Flow

**Epic:** E-02 (Registration & Onboarding)
**Feature:** F-01 (Authentication & Onboarding)
**Sprint:** 3
**Lane:** universal (P0)
**Size:** M
**Old ID:** S-U-02-2

---

## User Story
As an **invited institutional admin**, I need to accept my invitation by validating the token and creating my account so that I can begin managing my institution on the platform.

## Acceptance Criteria
- [ ] Invitation URL contains secure token: /invite/accept?token=xxx
- [ ] Token validation: check expiry (72h), single-use, valid institution
- [ ] Expired token shows clear error with "request new invitation" link
- [ ] Already-used token redirects to login page with message
- [ ] Acceptance form: set password, confirm email (pre-filled from invitation)
- [ ] InvitationService validates token, creates Supabase user with pre-assigned role
- [ ] DualWriteService creates user profile in Supabase + Neo4j
- [ ] User automatically associated with inviting institution
- [ ] Token marked as consumed after successful acceptance
- [ ] Redirect to persona onboarding (STORY-U-13) after account creation
- [ ] 10 API tests: valid token, expired token, used token, invalid token, password validation, user creation, dual-write, institution linking, role assignment, edge cases

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md` for full mapping.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/auth/InvitationAccept.tsx` | `apps/web/src/app/(auth)/invite/accept/page.tsx` | Convert from React Router to Next.js App Router; replace inline styles with Tailwind design tokens; extract password confirmation form into organism; reuse auth-brand-panel from STORY-U-5/U-8; token read from URL search params |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/auth/invitation.types.ts` |
| Service | apps/server | `src/services/auth/invitation.service.ts` |
| Controller | apps/server | `src/controllers/auth/invitation.controller.ts` |
| Routes | apps/server | `src/routes/invitation.routes.ts` |
| View | apps/web | `src/app/(auth)/invite/accept/page.tsx` |
| Component | apps/web | `src/components/auth/invitation-accept-form.tsx` |
| Tests | apps/server | `src/controllers/auth/__tests__/invitation.controller.test.ts`, `src/services/auth/__tests__/invitation.service.test.ts` |

## Database Schema

**Supabase:**
```sql
-- invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'institutional_admin', 'faculty', 'student', 'advisor')),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    token TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
```

**Neo4j:**
```cypher
// Person node created via DualWrite (same as registration)
MERGE (p:Person {id: $userId})
SET p.email = $email, p.full_name = $fullName, p.role = $role
MERGE (p)-[:BELONGS_TO]->(i:Institution {id: $institutionId})
```

## API Endpoints

### GET /api/v1/invitations/validate?token=xxx
**Auth:** Public
**Success Response (200):**
```json
{
  "data": {
    "email": "admin@med.edu",
    "role": "institutional_admin",
    "institution_name": "Morehouse School of Medicine",
    "expires_at": "2026-02-23T12:00:00Z"
  },
  "error": null
}
```

### POST /api/v1/invitations/accept
**Auth:** Public
**Request:**
```json
{
  "token": "secure-invitation-token",
  "password": "SecurePass123!",
  "full_name": "Dr. Admin Name"
}
```
**Success Response (201):**
```json
{
  "data": {
    "id": "uuid-new-user",
    "email": "admin@med.edu",
    "role": "institutional_admin",
    "institution_id": "uuid-inst",
    "redirect": "/onboarding"
  },
  "error": null
}
```
**Error Responses:**
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Weak password, missing fields |
| 404 | `INVITATION_NOT_FOUND` | Invalid token |
| 410 | `INVITATION_EXPIRED` | Token past 72h expiry |
| 409 | `INVITATION_CONSUMED` | Token already used |

## Dependencies
- **Blocked by:** STORY-U-1 (Supabase Auth Setup), STORY-U-3 (Express Auth Middleware), STORY-SA-3 (Application Review Queue -- invitation sent during approval)
- **Blocks:** STORY-U-13 (Persona Onboarding)
- **Cross-lane:** STORY-SA-3 (SuperAdmin approval workflow dispatches the invitation email)

## Testing Requirements
- 10 API tests:
  1. Valid token returns invitation details
  2. Expired token returns 410
  3. Used token returns 409
  4. Invalid/nonexistent token returns 404
  5. Password strength validation
  6. Successful acceptance creates auth user
  7. DualWrite creates profile + Neo4j Person
  8. User linked to correct institution
  9. Role assigned from invitation (not user-selectable)
  10. Token marked consumed after acceptance
- 0 E2E tests

## Implementation Notes
- Token should be a cryptographically random opaque token stored in Supabase invitations table.
- Pre-assigned role comes from the invitation record (set by SuperAdmin during approval).
- Do not allow role changes during acceptance; role is fixed by the inviter.
- Constructor DI for InvitationService receiving AuthService and DualWriteService.
- Reuse the auth-brand-panel organism from STORY-U-5/U-8 for consistent split-panel layout.
- The invitation acceptance page reads the token from URL search params (`useSearchParams`).
- Replace all inline styles with Tailwind + design tokens.
