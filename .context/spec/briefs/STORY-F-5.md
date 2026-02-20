# STORY-F-5: Profile Page

**Epic:** E-38 (Profile & Preferences)
**Feature:** F-18
**Sprint:** 19
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-38-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a profile page to edit my name, email, and avatar so that my identity is accurately represented across the platform.

## Acceptance Criteria
- [ ] Profile form: display name, email (read-only if SSO), bio, department, title
- [ ] Avatar upload: image picker with crop/resize, upload to Supabase Storage
- [ ] Avatar constraints: max 2MB, JPEG/PNG/WebP, 256x256 output
- [ ] Save changes: updates Supabase auth metadata + profiles table
- [ ] DualWriteService: profile changes sync to Neo4j `User` node
- [ ] Email change: triggers verification email flow (Supabase Auth)
- [ ] Form validation: display name required, bio max 500 chars
- [ ] Success/error toast notifications on save
- [ ] Custom error classes: `ProfileUpdateError`, `AvatarUploadError`
- [ ] 8-12 API tests: profile read, update, avatar upload, validation, dual-write sync
- [ ] TypeScript strict, named exports only (EXCEPTION: page.tsx uses `export default`)

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/profile/Profile.tsx` | `apps/web/src/app/(protected)/settings/profile/page.tsx` | Convert from React Router to Next.js App Router. Replace inline styles with Tailwind + design tokens. Extract form into `ProfileForm` molecule. Use react-hook-form + zod for validation. Split avatar upload into `AvatarUploader` molecule. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/user/profile.types.ts` |
| Service | apps/server | `src/services/profile/profile.service.ts` |
| Controller | apps/server | `src/controllers/user/profile.controller.ts` |
| Repository | apps/server | `src/repositories/profile.repository.ts` |
| View | apps/web | `src/app/(protected)/settings/profile/page.tsx` |
| Components | apps/web | `src/components/settings/profile-form.tsx`, `src/components/settings/avatar-uploader.tsx` |
| Hooks | apps/web | `src/hooks/use-profile.ts` |
| Errors | apps/server | `src/errors/profile.errors.ts` |
| Tests | apps/server | `src/services/profile/__tests__/profile.service.test.ts` |

## Database Schema

### Supabase -- `profiles` table (extends existing)
Verify column names via `list_tables`. Expected:
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, FK -> auth.users |
| `full_name` | varchar(255) | NOT NULL |
| `bio` | text | NULL, max 500 chars |
| `department` | varchar(100) | NULL |
| `title` | varchar(100) | NULL |
| `avatar_url` | text | NULL |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() |

### Neo4j -- User node (update properties)
```
(User { id, full_name, avatar_url, department, title })
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/users/me/profile` | Authenticated | Get current user profile |
| PATCH | `/api/v1/users/me/profile` | Authenticated | Update profile fields |
| POST | `/api/v1/users/me/avatar` | Authenticated | Upload avatar image |
| DELETE | `/api/v1/users/me/avatar` | Authenticated | Remove avatar |

## Dependencies
- **Blocks:** STORY-F-16 (Notification Preferences), STORY-F-17 (Generation Settings)
- **Blocked by:** STORY-U-1 (auth), STORY-U-2 (user profiles exist)
- **Cross-lane:** STORY-U-1 (Sprint 1 auth), STORY-U-2 (Sprint 2 user profiles)

## Testing Requirements
### API Tests (8-12)
1. GET profile returns current user data
2. PATCH profile updates display name
3. PATCH profile with empty display name returns 422
4. PATCH profile with bio exceeding 500 chars returns 422
5. POST avatar with valid JPEG uploads successfully
6. POST avatar with oversized file (>2MB) returns 413
7. POST avatar with invalid MIME type returns 422
8. DualWriteService syncs profile changes to Neo4j
9. Email change triggers verification flow
10. Profile read-only fields (email for SSO) cannot be updated

## Implementation Notes
- Avatar stored in Supabase Storage `avatars` bucket: `avatars/{userId}/profile.{ext}`.
- Image processing: client-side crop with `react-image-crop`, resize on upload.
- DualWriteService updates Neo4j `User` node properties (name, avatar_url).
- Email change only available for non-SSO users (SSO email managed by provider).
- Profile page URL: `/settings/profile` -- shared route for all roles.
- Form managed with React Hook Form + Zod validation schema. See `docs/solutions/react-hook-form-zod-pattern.md`.
- Zod schema: use plain `.string().max()` validators, provide defaults via RHF's `defaultValues`. Do not use `.optional().default("")`.
- See `docs/solutions/profile-settings-page-pattern.md` for the settings page pattern.
- Before writing migration DDL, run `list_tables` to verify `profiles` vs `user_profiles` and actual column names.
