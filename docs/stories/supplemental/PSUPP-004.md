# PSUPP-004: User Profile (/profile)
**Group:** Auth & User Management
**Component:** `Profile` | `pages/profile/Profile.tsx`
**Priority:** P1
**Depends:** P1-024 (auth)
**Specialist:** @frontend-specialist

**As any** authenticated user
**I want** to view and edit my profile information
**So that** my name, title, department, and avatar are correct across the platform

## Acceptance Criteria
- Route: `/profile` — all roles
- Sections:
  1. **Identity**: display name, email (read-only — Supabase manages), title, department
  2. **Avatar**: upload image (Supabase Storage `avatars` bucket, 2MB limit, JPEG/PNG), or generate initials-based avatar
  3. **Account**: change password form (current + new + confirm), "Connected since" date
  4. **Preferences**: timezone selector, email notifications toggle per notification type
- `GET /api/v1/users/me` — returns full user_profiles row
- `PATCH /api/v1/users/me` — updates display_name, title, department, preferences JSONB
- `POST /api/v1/users/me/avatar` — multipart upload → Supabase Storage → update avatar_url
- Password change: `supabase.auth.updateUser({ password: newPassword })` (requires current password verification via re-auth)
- Show role badge (read-only — cannot self-change role)

## Files to Create
- `frontend/src/app/profile/page.tsx`
- `frontend/src/hooks/useProfile.ts`
- `backend/src/controllers/profile.controller.ts`
- `backend/src/routes/profile.routes.ts`

## Smoke Test
```bash
curl "localhost:3001/api/v1/users/me" -H "Authorization: Bearer $JWT"
# Expected: { id, email, display_name, role, department, avatar_url, preferences }

curl -X PATCH "localhost:3001/api/v1/users/me" \
  -H "Authorization: Bearer $JWT" \
  -d '{"display_name":"Dr. Jane Smith","title":"Associate Professor","department":"Cardiology"}'
# Expected: 200, updated fields returned
```
