# STORY-F-5 Brief: Profile Page

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-5
old_id: S-F-38-1
epic: E-38 (Profile & Preferences)
feature: F-18 (User Settings & Profile)
sprint: 19
lane: faculty
lane_priority: 3
within_lane_order: 5
size: M
depends_on:
  - STORY-U-6 (universal) — RBAC Middleware ✅ DONE
  - STORY-U-8 (universal) — Registration Wizard ✅ DONE
blocks:
  - STORY-F-16 — Notification Preferences
  - STORY-F-17 — Theme & Accessibility Settings
personas_served: [faculty, institutional_admin, student, advisor]
```

---

## Section 1: Summary

**What to build:** A profile settings page at `/settings/profile` where authenticated users can view and edit their display name, bio, department, title, and avatar. Profile changes are dual-written to both Supabase (`user_profiles` table) and Neo4j (User node). Avatar upload goes to Supabase Storage `avatars` bucket with size/type validation. Email is displayed read-only (changes require verification via separate flow).

**Parent epic:** E-38 (Profile & Preferences) under F-18 (User Settings & Profile). This page is the first piece of the settings area and enables users to personalize their accounts after registration.

**User story:** As a faculty member, I need a profile page to update my display name, avatar, and professional details so that my identity is visible to colleagues and students across the platform.

**User flows affected:** UF-30 (Profile Management), UF-31 (Avatar Upload).

**Personas:** All authenticated users (faculty, institutional_admin, student, advisor) use this page.

**Key constraints:**
- Avatar: max 2MB, JPEG/PNG/WebP only, resized to 256x256 on client before upload
- DualWriteService: Supabase user_profiles first, Neo4j User node second
- Email shown read-only; email change is a separate verification flow (out of scope)
- Bio max 500 characters
- React Hook Form + Zod for validation
- Form uses optimistic UI with error rollback

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Profile update types and DTOs | `packages/types/src/user/profile.types.ts` | 45m |
| 2 | Update user types barrel | `packages/types/src/user/index.ts` | 5m |
| 3 | Supabase migration: avatars storage bucket | Supabase MCP | 20m |
| 4 | Profile error classes | `apps/server/src/errors/profile.error.ts` | 15m |
| 5 | Update errors barrel | `apps/server/src/errors/index.ts` | 5m |
| 6 | ProfileRepository | `apps/server/src/repositories/profile.repository.ts` | 1.5h |
| 7 | ProfileNeo4jRepository | `apps/server/src/repositories/profile-neo4j.repository.ts` | 1h |
| 8 | ProfileService (DualWrite) | `apps/server/src/services/profile/profile.service.ts` | 2h |
| 9 | ProfileController | `apps/server/src/controllers/profile/profile.controller.ts` | 1.5h |
| 10 | Register routes in index.ts | `apps/server/src/index.ts` | 15m |
| 11 | ProfileForm component | `apps/web/src/components/settings/profile-form.tsx` | 2h |
| 12 | AvatarUploader component | `apps/web/src/components/settings/avatar-uploader.tsx` | 1.5h |
| 13 | Profile settings page | `apps/web/src/app/(dashboard)/settings/profile/page.tsx` | 1h |
| 14 | Settings layout (left nav) | `apps/web/src/app/(dashboard)/settings/layout.tsx` | 45m |
| 15 | API tests: ProfileService | `apps/server/src/services/profile/__tests__/profile.service.test.ts` | 2h |
| 16 | API tests: ProfileController | `apps/server/src/controllers/profile/__tests__/profile.controller.test.ts` | 1.5h |

**Total estimate:** ~15h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/user/profile.types.ts

/** Profile update request DTO (from form) */
export interface UpdateProfileRequest {
  readonly display_name?: string;
  readonly bio?: string;
  readonly department?: string;
  readonly title?: string;
}

/** Avatar upload response */
export interface AvatarUploadResponse {
  readonly avatar_url: string;
  readonly updated_at: string;
}

/** Profile response for API (extends UserProfile with computed fields) */
export interface ProfileResponse {
  readonly id: string;
  readonly email: string;
  readonly display_name: string | null;
  readonly bio: string | null;
  readonly title: string | null;
  readonly department: string | null;
  readonly avatar_url: string | null;
  readonly role: string;
  readonly institution_id: string;
  readonly institution_name: string;
  readonly is_course_director: boolean;
  readonly onboarding_complete: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Allowed avatar MIME types */
export type AvatarMimeType = "image/jpeg" | "image/png" | "image/webp";

/** Avatar validation constants */
export const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
export const AVATAR_ALLOWED_TYPES: readonly AvatarMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const AVATAR_MAX_DIMENSION = 256;

/** Profile validation constants */
export const PROFILE_DISPLAY_NAME_MIN = 2;
export const PROFILE_DISPLAY_NAME_MAX = 100;
export const PROFILE_BIO_MAX = 500;
export const PROFILE_TITLE_MAX = 100;
export const PROFILE_DEPARTMENT_MAX = 100;
```

Additionally, the `user_profiles` table needs a `bio` column added:

```typescript
// This column is not in the existing DDL, so a migration is needed
// bio TEXT DEFAULT NULL — max 500 chars enforced at application level
```

---

## Section 4: Database Schema (inline, complete)

```sql
-- Migration: add_profile_bio_and_avatars_bucket

-- Add bio column to user_profiles (not in original DDL)
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL;

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    2097152,  -- 2MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload their own avatar
CREATE POLICY "Users upload own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Storage RLS: users can update their own avatar
CREATE POLICY "Users update own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Storage RLS: avatars are publicly readable
CREATE POLICY "Avatars are publicly readable" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- Storage RLS: users can delete their own avatar
CREATE POLICY "Users delete own avatar" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Index on user_profiles for profile lookups (likely already exists, safe with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_user_profiles_institution_id
    ON user_profiles(institution_id);
```

---

## Section 5: API Contract (complete request/response)

### GET /api/v1/profile (Auth: any authenticated user)

Returns the authenticated user's full profile.

**Success Response (200):**
```json
{
  "data": {
    "id": "user-uuid-001",
    "email": "faculty@med.edu",
    "display_name": "Dr. Jane Smith",
    "bio": "Professor of Pharmacology with 15 years of experience",
    "title": "Professor",
    "department": "Pharmacology",
    "avatar_url": "https://project.supabase.co/storage/v1/object/public/avatars/user-uuid-001/avatar.jpg",
    "role": "faculty",
    "institution_id": "inst-uuid-001",
    "institution_name": "Morehouse School of Medicine",
    "is_course_director": true,
    "onboarding_complete": true,
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-02-19T12:00:00Z"
  },
  "error": null
}
```

### PATCH /api/v1/profile (Auth: any authenticated user)

**Request:**
```json
{
  "display_name": "Dr. Jane A. Smith",
  "bio": "Professor of Pharmacology with 15 years of clinical and academic experience",
  "department": "Pharmacology & Therapeutics",
  "title": "Associate Professor"
}
```

**Success Response (200):**
```json
{
  "data": {
    "id": "user-uuid-001",
    "email": "faculty@med.edu",
    "display_name": "Dr. Jane A. Smith",
    "bio": "Professor of Pharmacology with 15 years of clinical and academic experience",
    "title": "Associate Professor",
    "department": "Pharmacology & Therapeutics",
    "avatar_url": "https://project.supabase.co/storage/v1/object/public/avatars/user-uuid-001/avatar.jpg",
    "role": "faculty",
    "institution_id": "inst-uuid-001",
    "institution_name": "Morehouse School of Medicine",
    "is_course_director": true,
    "onboarding_complete": true,
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-02-19T14:00:00Z"
  },
  "error": null
}
```

### POST /api/v1/profile/avatar (Auth: any authenticated user)

**Request:** `multipart/form-data` with `avatar` file field.

**Success Response (200):**
```json
{
  "data": {
    "avatar_url": "https://project.supabase.co/storage/v1/object/public/avatars/user-uuid-001/avatar.jpg",
    "updated_at": "2026-02-19T14:30:00Z"
  },
  "error": null
}
```

### DELETE /api/v1/profile/avatar (Auth: any authenticated user)

**Success Response (200):**
```json
{
  "data": {
    "avatar_url": null,
    "updated_at": "2026-02-19T15:00:00Z"
  },
  "error": null
}
```

**Error Responses (all endpoints):**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | display_name too short/long, bio too long |
| 400 | `INVALID_AVATAR` | File too large (>2MB), wrong MIME type, or corrupt image |
| 401 | `UNAUTHORIZED` | No valid JWT |
| 404 | `PROFILE_NOT_FOUND` | User profile record does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 500 | `SYNC_FAILED` | Supabase succeeded but Neo4j write failed |

---

## Section 6: Frontend Spec

### Page: `/settings/profile` (authenticated, dashboard layout)

**Route:** `apps/web/src/app/(dashboard)/settings/profile/page.tsx`

**Component hierarchy:**
```
SettingsLayout (layout.tsx — default export)
  ├── SettingsNav (left nav, 240px)
  │     ├── NavItem: "Profile" (active)
  │     ├── NavItem: "Notifications" (future F-16)
  │     └── NavItem: "Appearance" (future F-17)
  └── ProfilePage (page.tsx — default export)
        └── ProfileForm (client component)
              ├── AvatarUploader
              │     ├── Avatar preview (64px circle)
              │     ├── Upload button
              │     └── Remove button (if avatar exists)
              ├── DisplayNameInput (required, 2-100 chars)
              ├── EmailInput (read-only, disabled)
              ├── BioTextarea (optional, max 500 chars, char counter)
              ├── DepartmentInput (optional, max 100 chars)
              ├── TitleInput (optional, max 100 chars)
              └── SaveButton ("Save Changes", loading state)
```

**ProfileForm props:**
```typescript
export interface ProfileFormProps {
  readonly initialProfile: ProfileResponse;
}
```

**AvatarUploader props:**
```typescript
export interface AvatarUploaderProps {
  readonly currentAvatarUrl: string | null;
  readonly userId: string;
  readonly onUploadComplete: (url: string) => void;
  readonly onRemove: () => void;
}
```

**States:**
1. **Loading** — Skeleton placeholder while profile fetches
2. **Idle** — Form populated with current profile, save button disabled (no changes)
3. **Dirty** — User has modified fields, save button enabled
4. **Saving** — Loading spinner on save button, form inputs disabled
5. **Success** — Toast: "Profile updated successfully", form resets dirty state
6. **Error** — Inline error messages under fields, toast for server errors
7. **Uploading avatar** — Progress indicator on avatar, form remains interactive

**Form validation (React Hook Form + Zod):**
```typescript
import { z } from "zod";

export const profileFormSchema = z.object({
  display_name: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(100, "Display name must be at most 100 characters"),
  bio: z
    .string()
    .max(500, "Bio must be at most 500 characters")
    .optional()
    .or(z.literal("")),
  department: z
    .string()
    .max(100, "Department must be at most 100 characters")
    .optional()
    .or(z.literal("")),
  title: z
    .string()
    .max(100, "Title must be at most 100 characters")
    .optional()
    .or(z.literal("")),
});
```

**Design tokens:**
- Page background: `var(--surface-cream)` (Three Sheet: cream page bg)
- Card background: `var(--surface-white)` (Three Sheet: white cards)
- Avatar size: 64px circle with `var(--radius-full)` border-radius
- Typography: `var(--font-serif)` for page heading, `var(--font-sans)` for labels/inputs
- Input borders: `var(--border-default)`, focus: `var(--color-primary)`
- Save button: `var(--color-primary)` background (Navy Deep)
- Success toast: `var(--color-success)` (Evergreen)
- Spacing: `var(--space-4)` between form groups, `var(--space-6)` section gaps
- Settings nav width: 240px with `var(--surface-parchment)` background
- Two-column layout: left nav 240px, right content flex-1

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/user/profile.types.ts` | Types | Create |
| 2 | `packages/types/src/user/index.ts` | Types | Edit (add profile exports) |
| 3 | Supabase migration via MCP (bio column + avatars bucket) | Database | Apply |
| 4 | `apps/server/src/errors/profile.error.ts` | Errors | Create |
| 5 | `apps/server/src/errors/index.ts` | Errors | Edit (add profile errors) |
| 6 | `apps/server/src/repositories/profile.repository.ts` | Repository | Create |
| 7 | `apps/server/src/repositories/profile-neo4j.repository.ts` | Repository | Create |
| 8 | `apps/server/src/services/profile/profile.service.ts` | Service | Create |
| 9 | `apps/server/src/controllers/profile/profile.controller.ts` | Controller | Create |
| 10 | `apps/server/src/index.ts` | Routes | Edit (add profile routes) |
| 11 | `apps/web/src/app/(dashboard)/settings/layout.tsx` | View | Create |
| 12 | `apps/web/src/app/(dashboard)/settings/profile/page.tsx` | View | Create |
| 13 | `apps/web/src/components/settings/profile-form.tsx` | Component | Create |
| 14 | `apps/web/src/components/settings/avatar-uploader.tsx` | Component | Create |
| 15 | `apps/web/src/lib/validations/profile.validation.ts` | Validation | Create |
| 16 | `apps/server/src/services/profile/__tests__/profile.service.test.ts` | Tests | Create |
| 17 | `apps/server/src/controllers/profile/__tests__/profile.controller.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-U-6 | universal | **DONE** | RBAC middleware for authenticated access |
| STORY-U-8 | universal | **DONE** | Registration wizard creates initial user_profiles row |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client + Storage
- `neo4j-driver` — Neo4j driver for User node updates
- `express` — Server framework
- `multer` — Multipart file upload handling (may need install)
- `zod` — Request validation (server + client)
- `react-hook-form` — Form state management
- `@hookform/resolvers` — Zod resolver for react-hook-form
- `vitest` — Testing

### NPM Packages (may need to install)
- `multer` + `@types/multer` — If not already installed for file upload middleware
- `sharp` — Server-side image resize to 256x256 (optional; can do client-side)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()` with Storage access
- `apps/server/src/config/neo4j.config.ts` — `Neo4jClientConfig`
- `apps/server/src/middleware/auth.middleware.ts` — `AuthMiddleware`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError` base class
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`, `UserProfile`

### Does NOT Depend On
- Any other faculty stories (standalone profile page)
- DualWriteService as shared utility (implements dual-write inline)
- Any student/advisor stories

---

## Section 9: Test Fixtures (inline)

```typescript
// Valid profile update
export const VALID_PROFILE_UPDATE = {
  display_name: "Dr. Jane A. Smith",
  bio: "Professor of Pharmacology with 15 years of experience in clinical education",
  department: "Pharmacology & Therapeutics",
  title: "Associate Professor",
};

// Partial update (only display_name)
export const PARTIAL_PROFILE_UPDATE = {
  display_name: "Dr. Jane Smith-Williams",
};

// Stored profile (from DB)
export const STORED_PROFILE = {
  id: "user-uuid-001",
  institution_id: "inst-uuid-001",
  role: "faculty" as const,
  is_course_director: true,
  display_name: "Dr. Jane Smith",
  bio: "Professor of Pharmacology",
  title: "Professor",
  department: "Pharmacology",
  avatar_url: null,
  onboarding_complete: true,
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

// Profile with avatar
export const PROFILE_WITH_AVATAR = {
  ...STORED_PROFILE,
  avatar_url: "https://project.supabase.co/storage/v1/object/public/avatars/user-uuid-001/avatar.jpg",
};

// Invalid updates
export const SHORT_DISPLAY_NAME = { display_name: "A" }; // min 2 chars
export const LONG_DISPLAY_NAME = { display_name: "A".repeat(101) }; // max 100 chars
export const LONG_BIO = { bio: "A".repeat(501) }; // max 500 chars
export const LONG_DEPARTMENT = { department: "A".repeat(101) }; // max 100 chars
export const LONG_TITLE = { title: "A".repeat(101) }; // max 100 chars

// Avatar fixtures
export const VALID_AVATAR_FILE = {
  fieldname: "avatar",
  originalname: "profile.jpg",
  mimetype: "image/jpeg",
  size: 500_000, // 500KB
  buffer: Buffer.alloc(100), // mock buffer
};

export const OVERSIZED_AVATAR = {
  ...VALID_AVATAR_FILE,
  size: 3_000_000, // 3MB, exceeds 2MB limit
};

export const INVALID_MIME_AVATAR = {
  ...VALID_AVATAR_FILE,
  mimetype: "image/gif",
  originalname: "profile.gif",
};

// Auth context
export const PROFILE_OWNER = {
  id: "user-uuid-001",
  email: "faculty@med.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-001",
  is_course_director: true,
};
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/services/profile/__tests__/profile.service.test.ts`

```
describe("ProfileService")
  describe("getProfile")
    ✓ returns full profile for authenticated user
    ✓ includes institution_name from joined institutions table
    ✓ includes email from auth.users
    ✓ throws PROFILE_NOT_FOUND if user_profiles row missing

  describe("updateProfile")
    ✓ updates display_name in Supabase
    ✓ updates bio in Supabase
    ✓ updates department and title in Supabase
    ✓ syncs display_name to Neo4j User node
    ✓ syncs department and title to Neo4j User node
    ✓ sets sync_status to 'failed' if Neo4j write fails
    ✓ accepts partial update (only one field)
    ✓ rejects display_name shorter than 2 chars (VALIDATION_ERROR)
    ✓ rejects display_name longer than 100 chars (VALIDATION_ERROR)
    ✓ rejects bio longer than 500 chars (VALIDATION_ERROR)
    ✓ rejects department longer than 100 chars (VALIDATION_ERROR)
    ✓ rejects title longer than 100 chars (VALIDATION_ERROR)
    ✓ trims whitespace from all string fields

  describe("uploadAvatar")
    ✓ uploads file to Supabase Storage avatars bucket
    ✓ stores file at path {user_id}/avatar.{ext}
    ✓ updates avatar_url in user_profiles
    ✓ returns public URL for the avatar
    ✓ overwrites existing avatar (same path)
    ✓ rejects file larger than 2MB (INVALID_AVATAR)
    ✓ rejects non-image MIME type (INVALID_AVATAR)
    ✓ rejects GIF MIME type (INVALID_AVATAR)

  describe("removeAvatar")
    ✓ deletes file from Supabase Storage
    ✓ sets avatar_url to null in user_profiles
    ✓ succeeds even if no avatar exists (idempotent)
```

**File:** `apps/server/src/controllers/profile/__tests__/profile.controller.test.ts`

```
describe("ProfileController")
  describe("GET /api/v1/profile")
    ✓ returns 200 with profile data
    ✓ returns 401 without auth token
    ✓ returns 404 if profile missing

  describe("PATCH /api/v1/profile")
    ✓ returns 200 with updated profile
    ✓ returns 400 for invalid display_name
    ✓ returns 400 for bio exceeding 500 chars

  describe("POST /api/v1/profile/avatar")
    ✓ returns 200 with avatar_url
    ✓ returns 400 for oversized file
    ✓ returns 400 for invalid MIME type
    ✓ returns 400 when no file attached

  describe("DELETE /api/v1/profile/avatar")
    ✓ returns 200 with null avatar_url
    ✓ succeeds when no avatar exists
```

**Total: ~39 tests** (27 service + 12 controller)

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not applicable as a standalone story. Profile editing is not one of the 5 critical user journeys. If profile management is later added to a critical journey (e.g., onboarding flow), E2E coverage will be added at that time.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | GET /api/v1/profile returns full profile with email, institution_name | API test |
| 2 | PATCH /api/v1/profile updates display_name, bio, department, title | API test |
| 3 | Profile updates dual-written to Supabase and Neo4j User node | API test |
| 4 | Avatar upload accepts JPEG/PNG/WebP up to 2MB | API test |
| 5 | Avatar stored at avatars/{user_id}/avatar.{ext} in Supabase Storage | API test |
| 6 | Avatar URL saved to user_profiles.avatar_url | API test |
| 7 | DELETE /api/v1/profile/avatar removes file and sets avatar_url=null | API test |
| 8 | display_name required (min 2, max 100 chars) | API test |
| 9 | bio max 500 characters | API test |
| 10 | Email displayed as read-only on frontend form | Manual/code review |
| 11 | Settings page uses two-column layout (240px left nav, content right) | Manual/code review |
| 12 | ProfileForm uses React Hook Form + Zod validation | Code review |
| 13 | Design tokens used for all colors, fonts, spacing (no hardcoded values) | Code review |
| 14 | Avatar preview shown at 64px circle | Manual/code review |
| 15 | Save button disabled when form is clean (no changes) | Manual/code review |
| 16 | All 39 API tests pass | CI |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| Profile endpoints | API_CONTRACT_v1 SS Profile: GET/PATCH /profile, POST/DELETE /profile/avatar |
| Profile fields | S-F-38-1 SS Acceptance Criteria |
| Avatar 2MB, JPEG/PNG/WebP, 256x256 | S-F-38-1 SS Non-Functional: "Avatar constraints" |
| DualWrite for profile | ARCHITECTURE_v10 SS 3.2: "User profile changes sync to Neo4j User node" |
| Two-column settings layout | DESIGN_SPEC SS Settings: "Left nav 240px, right content" |
| Three Sheet hierarchy | DESIGN_SPEC SS Surfaces: "Cream page bg, White cards, Parchment nested" |
| React Hook Form + Zod | S-F-38-1 SS Technical: "Form validation approach" |
| user_profiles table DDL | SUPABASE_DDL_v1 SS user_profiles |
| avatars bucket | S-F-38-1 SS Storage: "Supabase Storage avatars bucket" |
| Bio max 500 chars | S-F-38-1 SS Validation: "bio max 500 characters" |

---

## Section 14: Environment Prerequisites

- **Supabase:** Project running, `user_profiles` table exists, `bio` column migration applied, `avatars` storage bucket created
- **Neo4j:** Running with User nodes (created during registration)
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Section 15: Figma Make Prototype

Prototype recommended. The profile page has specific layout requirements (two-column settings, avatar uploader, form fields) that benefit from a visual prototype before coding. Create a low-fidelity prototype covering:
1. Settings layout with left nav (240px) showing Profile/Notifications/Appearance
2. Profile form with avatar (64px circle), display name, email (read-only), bio textarea with char counter, department, title
3. States: idle, dirty (save enabled), saving (spinner), success toast
4. Avatar states: no avatar (placeholder), with avatar (preview + remove), uploading (progress)
