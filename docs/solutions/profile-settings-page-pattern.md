---
name: profile-settings-page-pattern
tags: [profile, settings, avatar, multer, storage, dual-write, self-service]
story: STORY-F-5
date: 2026-02-20
---
# Profile Settings Page Pattern

## Problem
Authenticated users need a self-service page to update their profile (text fields + avatar upload). This requires: server-side validation, file upload handling, Supabase Storage for avatars, DualWrite to Neo4j, and a client-side form with real-time validation.

## Solution

### Server Stack
1. **Types** (`packages/types/src/user/profile.types.ts`):
   - `UpdateProfileRequest` — partial DTO for text fields
   - `AvatarUploadResponse` — `{ avatar_url, updated_at }`
   - `ProfileResponse` — full profile shape
   - Validation constants (min/max lengths, file size, MIME types)

2. **Repository** (`profile.repository.ts`):
   - `findByUserId()` — `.select("*, institutions(name)")` join, `.maybeSingle()`
   - `update()` — maps API field names to DB column names (e.g., `display_name` → `full_name`)
   - `updateAvatarUrl()` — dedicated method with `.select("id").single()`

3. **Service** (`profile.service.ts`):
   - Validates input before repository calls
   - Uploads to Supabase Storage `avatars` bucket at path `{userId}/avatar.{ext}`
   - Uses `upsert: true` to overwrite existing avatars
   - DualWrite: `MERGE (u:User {id: $userId})` (not MATCH — handles missing nodes)
   - Neo4j failure is best-effort (warn + continue)

4. **Controller** (`profile.controller.ts`):
   - No RBAC — all authenticated users access their own profile
   - Auth check: `(req as unknown as Record<string, unknown>).user?.id`
   - File check: `(req as unknown as Record<string, unknown>).file`

5. **Route Registration** (`index.ts`):
   ```typescript
   const avatarUpload = multer({ storage: multer.memoryStorage() });
   app.post("/api/v1/profile/avatar", avatarUpload.single("avatar"), handler);
   ```

### Client Stack
1. **Hook** (`use-profile.ts`):
   - Fetches via `GET /api/v1/profile` with Bearer token
   - Returns `{ profile, status, error, refetch, setProfile }`

2. **ProfileForm** — vanilla React state (no react-hook-form needed):
   - `isDirty` computed from current vs initial values
   - Client-side validation mirroring server constants
   - `PATCH /api/v1/profile` with JSON body

3. **AvatarUploader** — `POST /api/v1/profile/avatar` with `FormData`:
   - Client-side MIME + size validation before upload
   - Hidden file input behind styled label
   - Circle preview with initials fallback

### Supabase Storage Setup (migration)
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, '{"image/jpeg","image/png","image/webp"}');

-- RLS policies: upload own, update own, read public, delete own
```

## When to Use
- Any self-service profile/settings page
- File upload to Supabase Storage with per-user paths
- DualWrite profile sync to Neo4j

## When NOT to Use
- Admin-managed profiles (use the admin CRUD pattern instead)
- Large file uploads > 10MB (use resumable uploads)
- Multi-file uploads (this pattern is single-file)

## Key Gotchas
- DB column may differ from API field name — always verify with `list_tables`
- `multer` must be installed via `pnpm --filter server add multer @types/multer`
- Avatar path uses `upsert: true` to avoid orphaned files
- `MERGE` not `MATCH` for Neo4j — handles users created before graph integration
