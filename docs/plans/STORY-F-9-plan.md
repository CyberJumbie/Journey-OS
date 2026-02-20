# Plan: STORY-F-9 — Upload Dropzone Component

## Pre-Implementation Findings

1. **No `uploads` table exists** — must create via Supabase MCP migration
2. **Brief references `user_profiles`** in RLS policy but actual table is `profiles` — fix in migration DDL
3. **`FileSizeLimitError` already exists** in `apps/server/src/errors/import.errors.ts` — create upload-specific version under `upload.error.ts` (different error hierarchy: `UploadError` base vs `ImportError` base)
4. **multer already installed** — used for avatar upload at line 74/484 of `index.ts`. No new npm install needed
5. **`packages/types/src/content/` does not exist** — create new directory + barrel
6. **`courses` table confirmed** — FK target exists with UUID `id` column

## Tasks (implementation order)

| # | Task | File | Notes |
|---|------|------|-------|
| 1 | Define upload types (`DocumentType`, `AcceptedMimeType`, `UploadConfig`, `UploadFileState`, `UploadedFileRecord`, `UploadResponse`, `UploadFileError`) | `packages/types/src/content/upload.types.ts` | Use `Uint8Array` not `Buffer` in shared types |
| 2 | Create content barrel export | `packages/types/src/content/index.ts` | |
| 3 | Add `content` export to root barrel | `packages/types/src/index.ts` | Re-read after edit (PostToolUse hook risk) |
| 4 | Rebuild types package | `tsc -b packages/types/tsconfig.json` | |
| 5 | Apply `uploads` table migration via Supabase MCP | Supabase migration | Fix RLS: `user_profiles` → `profiles` |
| 6 | Create upload error classes (`UploadError`, `InvalidFileTypeError`, `FileSizeLimitError`, `BatchLimitError`) | `apps/server/src/errors/upload.error.ts` | Extends `JourneyOSError`, not `ImportError` |
| 7 | Implement multer upload validation middleware | `apps/server/src/middleware/upload.validation.ts` | `limits: { fileSize: 50*1024*1024, files: 10 }`, MIME filter |
| 8 | Implement `UploadRepository` | `apps/server/src/repositories/upload.repository.ts` | `.insert().select().single()` pattern |
| 9 | Implement `UploadService` with file processing + DB record creation | `apps/server/src/services/upload/upload.service.ts` | JS `#private` fields, constructor DI |
| 10 | Implement `UploadController` with `handleUpload()` | `apps/server/src/controllers/upload.controller.ts` | Narrow `req.params.courseId` with `typeof` |
| 11 | Register route `POST /api/v1/courses/:courseId/upload` | `apps/server/src/index.ts` | Add import + route in single Edit call |
| 12 | Build `DropArea` atom | `packages/ui/src/atoms/drop-area.tsx` | Design tokens only, drag states |
| 13 | Build `FileIcon` atom | `packages/ui/src/atoms/file-icon.tsx` | Lucide icons by extension |
| 14 | Build `UploadProgressItem` molecule | `packages/ui/src/molecules/upload-progress-item.tsx` | Progress bar + status badge |
| 15 | Build `UploadDropzone` organism | `apps/web/src/components/organisms/upload-dropzone.tsx` | Client component, XHR progress |
| 16 | Build upload client service | `apps/web/src/services/upload.client.ts` | XHR (not fetch) for progress events |
| 17 | Write API tests (~22 tests) | `apps/server/src/__tests__/upload.controller.test.ts` | `vi.hoisted()` for mocks, separate mock chains |

## Implementation Order

Types (1-4) → Migration (5) → Errors (6) → Middleware (7) → Repository (8) → Service (9) → Controller (10) → Route (11) → UI Atoms (12-13) → Molecule (14) → Organism (15-16) → API Tests (17)

## Patterns to Follow

- **Repository Pattern** — `docs/solutions/repository-pattern.md` (DI, `.select().single()` on writes)
- **Supabase Mock Factory** — `docs/solutions/supabase-mock-factory.md` (separate chains per operation)
- **RBAC Middleware** — `docs/solutions/rbac-middleware-pattern.md` (`rbac.require(AuthRole.FACULTY)`)
- **Existing multer usage** — `index.ts:484-486` avatar upload pattern (memoryStorage + limits)

## Testing Strategy

- **API tests (22 tests):**
  - UploadController: single file, batch, auth (401/403), no files (400), invalid MIME, oversized, batch limit, partial success, DB record validation, storage path format, 404 course
  - Upload validation middleware: MIME acceptance/rejection, size limit enforcement
  - UploadService: record creation, MIME-to-doctype mapping, error throwing
- **E2E:** Not required — deferred to full Upload & Storage flow (F-9 → F-18 → F-24)

## Figma Make

- [ ] Code directly (no prototype needed — standard upload dropzone pattern)

## Risks / Edge Cases

1. **Name collision:** `FileSizeLimitError` exists in `import.errors.ts` — upload version is in a separate hierarchy (`UploadError` base). Both export from different barrels. Verify no barrel re-export conflict in `errors/index.ts`
2. **`courses` table has no `institution_id` column** — the `uploads` table needs `institution_id` from `profiles` (via `uploaded_by` → join), OR we add it as a denormalized column. Brief specifies it as a direct column on `uploads` with FK to `institutions` — follow brief
3. **Partial success handling:** When some files pass and others fail, return 200 with both arrays. Only return 400 when ALL fail or request is malformed
4. **Local file storage:** Files stored at `/tmp/uploads/...` in this story. STORY-F-18 migrates to Supabase Storage
5. **PostToolUse hook risk:** After editing barrel files (`index.ts`), immediately re-read and verify exports intact

## Acceptance Criteria (verbatim from brief)

1. DropArea accepts drag-and-drop and click-to-browse file selection
2. Only PDF (.pdf), PowerPoint (.pptx), and Word (.docx) files are accepted
3. Files exceeding 50MB are rejected with clear error message
4. Maximum 10 files per batch upload
5. MIME type validated on client-side before upload (defense-in-depth)
6. MIME type validated on server-side via multer middleware
7. Per-file progress bar shows upload progress (0-100%)
8. Error states clearly show: wrong file type, file too large, upload failure
9. Upload creates record in `uploads` table with `parse_status=pending`
10. Storage path follows pattern: `uploads/{institution_id}/{course_id}/{upload_id}.{ext}`
11. Partial success: valid files upload, invalid files return in errors array
12. Unauthenticated requests receive 401, student role receives 403
13. Custom error classes extend `JourneyOSError`: `InvalidFileTypeError`, `FileSizeLimitError`, `BatchLimitError`
14. All ~22 API tests pass
