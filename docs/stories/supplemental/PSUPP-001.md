# PSUPP-001: Invitation Accept (/invite/accept)
**Group:** Auth & User Management
**Component:** `InvitationAccept` | `pages/auth/InvitationAccept.tsx`
**Priority:** P0 — blocks all admin-invite onboarding flow
**Depends:** P4-011 (admin user invite endpoint exists)
**Specialist:** @frontend-specialist

**As a** newly invited faculty, student, or admin
**I want** to click my magic-link invite email and land on a clear accept screen
**So that** I can set my password and complete registration without needing IT support

## What this screen does
When admin calls `POST /admin/users/invite`, Supabase sends a magic link to the invitee.
Clicking the link lands on `/invite/accept?token=XXX`. This screen:
1. Validates the token with Supabase (`supabase.auth.verifyOtp`)
2. Shows the invitee's pre-set name and role (from invite metadata)
3. Collects password (+ confirm) to finalize the account
4. Redirects to the appropriate onboarding for their role

## Acceptance Criteria
- Route: `/invite/accept` — reads `?token=` and `?type=invite` query params
- On mount: `supabase.auth.verifyOtp({ token_hash, type: 'invite' })` — if invalid/expired, show error state with "Request a new invite" link
- Shows: invited email, pre-set role badge, institution name
- Form: password (min 8 chars, 1 number, 1 uppercase) + confirm password
- Submit → `supabase.auth.updateUser({ password })` → then redirect:
  - role = faculty → `/onboarding`
  - role = admin / institution_admin → `/onboarding/admin`
  - role = student → `/onboarding/student`
- Expired token state: clear error message + "Contact your administrator" guidance
- Already-accepted token: redirect straight to `/login` with "Account already active" toast

## Files to Create
- `frontend/src/app/invite/accept/page.tsx`
- `frontend/src/hooks/useInviteAccept.ts`

## Smoke Test
```bash
# 1. Admin invites a new faculty member
curl -X POST "localhost:3001/api/v1/admin/users/invite" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -d '{"email":"new@msm.edu","role":"faculty","institutionId":"msm-uuid"}'

# 2. User clicks magic link → /invite/accept?token=XXX&type=invite
# 3. Fills in password, submits → redirected to /onboarding
# 4. Verify: auth.users row has confirmed email + hashed password
```
