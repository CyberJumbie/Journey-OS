# PSUPP-005: Settings (/settings)
**Group:** Auth & User Management
**Component:** `Settings` | `pages/settings/Settings.tsx`
**Priority:** P2
**Depends:** PSUPP-004 (profile)
**Specialist:** @frontend-specialist

**As any** authenticated user
**I want** a unified settings page for app preferences
**So that** I can control notification preferences, display preferences, and API access

## Acceptance Criteria
- Route: `/settings` (also `/faculty/settings`) — same component, all roles
- Tabs:
  1. **Notifications** — toggle per event type (batch:completed, exam:assigned, review:needed, etc.), toggle email vs in-app per type
  2. **Display** — theme (light/dark/system), default page on login, items-per-page preference
  3. **Generation Defaults** (faculty/course_director only) — default Bloom target, default USMLE system filter, default critic threshold for auto-approve
  4. **API Access** (admin only) — view/rotate API keys for institution LMS integrations
- `GET /api/v1/users/me/settings` — returns settings JSONB
- `PATCH /api/v1/users/me/settings` — partial update of settings object
- Settings stored in `user_profiles.preferences JSONB`

## Files to Create
- `frontend/src/app/settings/page.tsx`
- `frontend/src/hooks/useSettings.ts`

## Files to Modify
- `backend/src/routes/profile.routes.ts` — add GET/PATCH /users/me/settings

## Smoke Test
```bash
curl -X PATCH "localhost:3001/api/v1/users/me/settings" \
  -H "Authorization: Bearer $JWT" \
  -d '{"notifications":{"batch_completed":true,"exam_assigned":true},"display":{"theme":"dark"}}'
# Expected: 200, settings merged and returned
```
