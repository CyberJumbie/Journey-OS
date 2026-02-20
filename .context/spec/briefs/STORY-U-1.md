# STORY-U-1: Supabase Auth Setup

**Epic:** E-01 (Auth Infrastructure)
**Feature:** F-01 (Authentication & Onboarding)
**Sprint:** 3
**Lane:** universal (P0)
**Size:** S
**Old ID:** S-U-01-1

---

## User Story
As a **platform engineer**, I need Supabase Auth configured with email/password provider, JWT secret, and email templates so that all user authentication flows have a secure foundation.

## Acceptance Criteria
- [ ] Supabase project configured with email/password auth provider
- [ ] JWT secret stored in environment variables (never hardcoded)
- [ ] Custom email templates for: verification, invitation, password reset
- [ ] Auth-related TypeScript types defined (AuthUser, AuthSession, AuthRole enum)
- [ ] AuthRole enum includes: superadmin, institutional_admin, faculty, student, advisor
- [ ] Supabase client singleton configured in apps/server
- [ ] Supabase client configured in apps/web with public anon key
- [ ] Session persistence across page refresh via Supabase auth helpers
- [ ] Environment variable validation on server startup (fail-fast if missing)

## Reference Screens
> **None** -- backend-only story. `Login.tsx` is the canonical reference for the login page UI built later in STORY-U-8/U-10.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/auth/auth.types.ts`, `src/auth/roles.types.ts`, `src/auth/index.ts` |
| Config | apps/server | `src/config/supabase.config.ts`, `src/config/env.config.ts` |
| Config | apps/web | `src/lib/supabase.ts`, `src/lib/supabase-server.ts` |

## Database Schema

**Supabase Auth (managed by GoTrue):**
- `auth.users` -- Supabase-managed user table
- `app_metadata.role` -- stores AuthRole enum value (superadmin, institutional_admin, faculty, student, advisor)
- `user_metadata` -- stores display_name, avatar_url (user-editable)

**Custom table (profiles):**
```sql
-- profiles table (already exists or will be created)
-- Links auth.users to application-specific profile data
-- The role in app_metadata is the authoritative source; profiles.role is denormalized for convenience
```

**No Neo4j schema in this story.**

## API Endpoints
No new API endpoints. This story establishes the auth infrastructure that other stories consume.

## Dependencies
- **Blocked by:** none (first story in universal lane)
- **Blocks:** STORY-U-3 (Express Auth Middleware), STORY-U-5 (Forgot Password), STORY-U-6 (RBAC Middleware), STORY-U-8 (Registration Wizard), STORY-U-9 (Invitation Acceptance), STORY-U-10 (Dashboard Routing), STORY-U-11 (Password Reset), STORY-U-14 (Email Verification)
- **Cross-lane:** All authenticated stories across all lanes depend on this

## Testing Requirements
- 5 API tests: env var validation (missing SUPABASE_URL, missing SUPABASE_ANON_KEY, missing JWT_SECRET), Supabase client singleton pattern, AuthRole enum completeness
- 0 E2E tests

## Implementation Notes
- Use `app_metadata.role` (not `user_metadata`) so users cannot self-modify their role via Supabase client.
- Email templates should be branded with Journey OS logo and styling.
- All Supabase operations through Supabase MCP per architecture rules.
- Never mix `next/headers` (server-only) with client-component code. Split into `supabase.ts` (browser client) and `supabase-server.ts` (server client).
- Lazy/optional services (Neo4j, Redis) should validate env vars at class instantiation, not in the global zod env schema.
- Supabase custom claims store the user role in JWT metadata for middleware extraction.
- Environment variable validation uses zod with fail-fast on server startup.
