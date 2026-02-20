# Plan: STORY-F-5 — Profile Page

## Tasks (from brief, with refinements)

| # | Task | File | Notes |
|---|------|------|-------|
| 1 | Profile types & DTOs | `packages/types/src/user/profile.types.ts` | `UpdateProfileRequest`, `AvatarUploadResponse`, `ProfileResponse`, avatar constants |
| 2 | Update user types barrel | `packages/types/src/user/index.ts` | Add profile type exports |
| 3 | Rebuild types package | `tsc -b packages/types/tsconfig.json` | Emit `.d.ts` for server/web |
| 4 | Supabase migration: bio column + avatars bucket + RLS | Supabase MCP `apply_migration` | `bio TEXT`, avatars bucket, storage RLS policies |
| 5 | Profile error classes | `apps/server/src/errors/profile.error.ts` | `ProfileNotFoundError`, `InvalidAvatarError`, `ProfileValidationError` |
| 6 | Update errors barrel | `apps/server/src/errors/index.ts` | Add profile error exports |
| 7 | ProfileRepository (Supabase) | `apps/server/src/repositories/profile.repository.ts` | `findByUserId`, `update`, `updateAvatarUrl` — joins institutions for `institution_name`, joins `auth.users` for `email` |
| 8 | ProfileService (DualWrite) | `apps/server/src/services/profile/profile.service.ts` | `getProfile`, `updateProfile`, `uploadAvatar`, `removeAvatar`. Supabase first → Neo4j User node second. Avatar validation (size, mime). Uses Supabase Storage for upload/delete. |
| 9 | Install multer + @types/multer | `apps/server/package.json` | Needed for `multipart/form-data` avatar upload on server |
| 10 | ProfileController | `apps/server/src/controllers/profile/profile.controller.ts` | `handleGetProfile`, `handleUpdateProfile`, `handleUploadAvatar`, `handleRemoveAvatar`. Multer middleware for avatar route. |
| 11 | Register routes in index.ts | `apps/server/src/index.ts` | `GET/PATCH /api/v1/profile`, `POST/DELETE /api/v1/profile/avatar`. All authenticated (no RBAC — all roles use profile). |
| 12 | Settings layout | `apps/web/src/app/(dashboard)/settings/layout.tsx` | Two-column: left nav (240px) + right content. Nav items: Profile (active), Notifications (disabled), Appearance (disabled). |
| 13 | Profile page | `apps/web/src/app/(dashboard)/settings/profile/page.tsx` | Server component that fetches profile, passes to `ProfileForm`. |
| 14 | ProfileForm component | `apps/web/src/components/settings/profile-form.tsx` | React Hook Form + Zod. Edits display_name, bio, department, title. Email read-only. Save button with dirty state. |
| 15 | AvatarUploader component | `apps/web/src/components/settings/avatar-uploader.tsx` | 64px circle preview. Upload button (POST to server), Remove button (DELETE). Loading state during upload. |
| 16 | Profile form Zod schema | `apps/web/src/lib/validations/profile.validation.ts` | Client-side Zod schema matching server validation |
| 17 | API tests: ProfileService | `apps/server/src/services/profile/__tests__/profile.service.test.ts` | ~27 tests per brief Section 10 |
| 18 | API tests: ProfileController | `apps/server/src/controllers/profile/__tests__/profile.controller.test.ts` | ~12 tests per brief Section 10 |

## Implementation Order

Types (1-3) → Migration (4) → Errors (5-6) → Repository (7) → Service (8) → Install multer (9) → Controller (10) → Routes (11) → View (12-16) → API Tests (17-18)

## Patterns to Follow

- **Repository:** `docs/solutions/repository-pattern.md` — `readonly #supabaseClient`, `.select("*").single()` on writes, `.maybeSingle()` for reads, dedicated `updateAvatarUrl()` method
- **DualWrite:** Supabase first → Neo4j `#tryNeo4jUpdate()` best-effort → `sync_status` update. Pattern from `course.service.ts`
- **Controller:** `ApiResponse<T>` envelope, private `#handleError()`, narrow `req.params` with `typeof`
- **Errors:** `JourneyOSError(message, "SCREAMING_CODE")` — unique codes per error class
- **Mock factory:** `docs/solutions/supabase-mock-factory.md` — separate chain objects per operation, never `mockReturnThis()` on write chains
- **Barrel exports:** Re-read after edit (ESLint PostToolUse hook strips unused exports)
- **Route order:** Static routes before parameterized in `index.ts`

## Testing Strategy

- **API tests (39 total):**
  - ProfileService (27): getProfile (4), updateProfile (13), uploadAvatar (8), removeAvatar (3)
  - ProfileController (12): GET (3), PATCH (3), POST avatar (4), DELETE avatar (2)
- **E2E:** No — profile editing is not one of the 5 critical user journeys

## Figma Make

- [ ] Prototype first (brief recommends it for settings layout + avatar uploader)
- [x] Code directly — settings layout is straightforward two-column, avatar uploader is well-specified

**Decision:** Code directly. The brief provides detailed component hierarchy and design tokens. Prototyping would delay without adding clarity.

## Risks / Edge Cases

1. **`auth.users` join for email** — `user_profiles` doesn't have `email`. Need to either: (a) join `auth.users` via Supabase admin API, or (b) use `supabase.auth.admin.getUserById()`. The admin API approach is cleaner than a raw SQL join on `auth.users`.
2. **Multer + Express 5** — Multer may have compatibility issues with Express 5. Verify during install; fallback is `busboy` or raw stream parsing.
3. **Neo4j User node may not exist** — If user was created before Neo4j integration, `#tryNeo4jUpdate` must handle missing nodes gracefully (MERGE instead of MATCH).
4. **Storage RLS policies** — The migration creates RLS policies on `storage.objects`. If policies already exist (from another migration), `CREATE POLICY` will fail. Use `DO $$ ... $$` guard or accept `ON CONFLICT` behavior.
5. **Barrel export stripping** — ESLint PostToolUse hook may strip new exports from `errors/index.ts` and `user/index.ts`. Must re-read and verify after every barrel edit.
6. **Avatar overwrite** — Using fixed path `{user_id}/avatar.{ext}` means changing image format (jpg→png) leaves orphaned files. Should use a single filename like `avatar` without extension, or delete old file first.

## Acceptance Criteria (verbatim from brief)

1. GET /api/v1/profile returns full profile with email, institution_name
2. PATCH /api/v1/profile updates display_name, bio, department, title
3. Profile updates dual-written to Supabase and Neo4j User node
4. Avatar upload accepts JPEG/PNG/WebP up to 2MB
5. Avatar stored at avatars/{user_id}/avatar.{ext} in Supabase Storage
6. Avatar URL saved to user_profiles.avatar_url
7. DELETE /api/v1/profile/avatar removes file and sets avatar_url=null
8. display_name required (min 2, max 100 chars)
9. bio max 500 characters
10. Email displayed as read-only on frontend form
11. Settings page uses two-column layout (240px left nav, content right)
12. ProfileForm uses React Hook Form + Zod validation
13. Design tokens used for all colors, fonts, spacing (no hardcoded values)
14. Avatar preview shown at 64px circle
15. Save button disabled when form is clean (no changes)
16. All 39 API tests pass
