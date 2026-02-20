# Plan: STORY-F-18 — Supabase Storage Integration

## Critical Findings (Brief vs Codebase)

The brief assumes a greenfield implementation, but significant infrastructure already exists:

| Brief Assumes | Actually Exists | Reconciliation |
|---|---|---|
| New `packages/types/src/storage/` directory | `packages/types/src/content/upload.types.ts` already has `DocumentType`, `ParseStatus`, `AcceptedMimeType`, `UPLOAD_MAX_FILE_SIZE_BYTES`, `ACCEPTED_MIME_TYPES` | Add **only** net-new types (`Upload` DB record, `StorageKeyParts`, `IMalwareScanService`, `PresignedUrlResponse`, `StorageConfig`) to a new `storage.types.ts`. Do NOT duplicate existing content types. |
| Install multer | `multer@2.0.2` + `@types/multer@2.0.0` already in `apps/server/package.json` | Skip install |
| New multer middleware | `upload.validation.ts` already configures multer with memory storage + file size limit | Reuse existing `uploadMiddleware` for single file; add a `uploadSingleFile` export for the `"file"` field |
| New `StorageController` + routes at `/api/v1/uploads` | Existing `UploadController` + routes at `/api/v1/courses/:courseId/upload` | Create a **new** `StorageController` at `/api/v1/uploads` as the brief specifies. This controller handles single-file storage operations (upload to bucket, presigned URLs, soft-delete). The existing `UploadController` handles batch metadata-only uploads for the import flow — different concern. |
| `IMalwareScanService` with `Buffer` param in `packages/types` | `packages/types` has no `@types/node` — `Buffer` is unavailable | Put `IMalwareScanService` interface in `apps/server/src/services/storage/` (server-only), using `Uint8Array` for the buffer param. Export only the result type (`MalwareScanResult`) from shared types. |

## Tasks (refined from brief)

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 1 | Define storage-specific types (`Upload` record, `UploadResponse`, `PresignedUrlResponse`, `StorageKeyParts`, `StorageConfig`, `MalwareScanResult`) | `packages/types/src/storage/storage.types.ts` | Reuse `DocumentType`, `ParseStatus`, `AllowedMimeType` from `content/upload.types.ts` via re-import. Do NOT redefine constants. |
| 2 | Create storage barrel + update root barrel | `packages/types/src/storage/index.ts`, `packages/types/src/index.ts` | Add `export * from "./storage"` to root |
| 3 | Rebuild types package | `packages/types/tsconfig.json` | `pnpm --filter types exec tsc -b tsconfig.json` |
| 4 | Migration: create `uploads` table | Supabase MCP | Verify table names (`institutions`, `courses`, `profiles`) via `list_tables` first. Check RLS policy column names against actual `profiles` schema. |
| 5 | Create storage error classes | `apps/server/src/errors/storage.error.ts` | `StorageError`, `FileTooLargeError`, `UnsupportedFileTypeError`, `MalwareDetectedError`, `ChecksumMismatchError`. Check that names don't collide with existing `upload.error.ts` classes (`UploadFileSizeLimitError`, `InvalidFileTypeError`). Use distinct names. |
| 6 | Export new errors from barrel | `apps/server/src/errors/index.ts` | Single edit with import + re-export |
| 7 | Add `uploadSingleFile` to upload middleware | `apps/server/src/middleware/upload.validation.ts` | Export `uploadSingleFile = uploadMiddleware.single("file")` alongside existing `uploadFiles` |
| 8 | Implement `MalwareScanStub` | `apps/server/src/services/storage/malware-scan.stub.ts` | `IMalwareScanService` interface defined here (server-only, uses `Uint8Array`) |
| 9 | Implement `StorageService` | `apps/server/src/services/storage/storage.service.ts` | Constructor DI: `SupabaseClient`, `IMalwareScanService`. Methods: `upload()`, `getPresignedUrl()`, `softDelete()`, `listUploads()`, `buildStorageKey()`, `computeChecksum()`, `validateFile()`. Follow `import-upload.service.ts` pattern for `supabase.storage.from().upload()`. |
| 10 | Implement `StorageController` | `apps/server/src/controllers/storage/storage.controller.ts` | 4 handlers: `handleUpload`, `getPresignedUrl`, `listUploads`, `softDelete`. Zod validation for query params. `#handleError()` method per zod-controller pattern. |
| 11 | Register routes in Express app | `apps/server/src/index.ts` | **Single edit** with imports + route registration (barrel-stripping protection). Routes: `POST /api/v1/uploads`, `GET /api/v1/uploads`, `GET /api/v1/uploads/:uploadId/url`, `DELETE /api/v1/uploads/:uploadId`. All behind `rbac.require(AuthRole.FACULTY)`. |
| 12 | Write `StorageService` unit tests (8 tests) | `apps/server/src/services/storage/__tests__/storage.service.test.ts` | Use `vi.hoisted()` for Supabase mock. Test `buildStorageKey`, `computeChecksum`, `validateFile`, `upload`. |
| 13 | Write `StorageController` API tests (16 tests) | `apps/server/src/controllers/storage/__tests__/storage.controller.test.ts` | Place in controller subdirectory (matches existing pattern better). Mock `StorageService` entirely. Test all error branches. |

## Implementation Order

```
Types (1-2) → Rebuild (3) → Migration (4) → Errors (5-6) → Middleware (7) →
Service layer (8-9) → Controller (10) → Routes (11) → Service Tests (12) → Controller Tests (13)
```

## Patterns to Follow

- `docs/solutions/zod-controller-error-routing-pattern.md` — Zod schemas + `#handleError()` in controller
- `docs/solutions/batch-upload-partial-success-pattern.md` — Existing multer config reference
- `docs/solutions/supabase-mock-factory.md` — Supabase mock patterns for tests
- `apps/server/src/services/import/import-upload.service.ts` — Reference for `supabase.storage.from().upload()` calls
- `apps/server/src/services/profile/profile.service.ts` — Reference for avatar storage bucket usage

## Testing Strategy

### API Tests (16 tests — StorageController)
- Upload: valid CSV (201), valid PDF (201), file too large (400), unsupported MIME (400), no file (400), missing document_type (400), correct storage key, SHA-256 checksum, parse_status=pending, unauthenticated (401), unauthorized role (403)
- Presigned URL: success (200), not found (404), soft-deleted (404), wrong institution (403)
- Soft-delete: success (200), already deleted (404), not owner (403)

### Unit Tests (8 tests — StorageService)
- `buildStorageKey`: correct path, "uncategorized" when no course_id
- `computeChecksum`: SHA-256 digest, consistency
- `validateFile`: accepts allowed MIME, rejects disallowed, rejects oversized
- `upload`: calls storage.upload with correct args, creates DB record

### E2E Tests
- None for this story (backend only; full flow tested with F-9 + F-18 + F-24)

## Figma Make

- [ ] Not applicable (no frontend in this story)
- [x] Code directly

## Risks / Edge Cases

1. **Type name collisions**: Brief defines `UploadResponse` — but `packages/types/src/content/upload.types.ts` already exports `UploadResponse`. Rename the storage one to `StorageUploadResponse` or namespace differently.
2. **Error class collisions**: Brief's `FileTooLargeError` vs existing `UploadFileSizeLimitError`, and `UnsupportedFileTypeError` vs existing `InvalidFileTypeError`. Keep the new names from the brief since they serve a different domain (storage vs batch upload validation).
3. **`Buffer` in shared types**: `packages/types` has no Node types. `IMalwareScanService` must live in server, not shared types. Only `MalwareScanResult` (plain interface) goes to shared types.
4. **Barrel-stripping by ESLint hook**: When editing `index.ts` for route registration, imports + usage MUST be in the same edit. Re-read file after edit to verify.
5. **Migration DDL**: Brief references `institutions(id)` and `courses(id)` for FKs — must verify actual table names via `list_tables` before applying.
6. **RLS policies reference `profiles.institution_id`**: Must verify this column exists on the actual `profiles` table.
7. **`content-originals` bucket**: Must be created in Supabase Storage before upload works. May need to be done via dashboard or storage API call.
8. **Test fixture UUIDs**: Must use valid v4 format (`4` in 3rd group, `8/9/a/b` in 4th group) per CLAUDE.md rule.

## Acceptance Criteria (verbatim from brief)

1. POST `/api/v1/uploads` accepts multipart file upload and stores in Supabase Storage `content-originals` bucket
2. Storage key follows pattern: `{institution_id}/{course_id}/{file_id}/{original_filename}`
3. SHA-256 checksum is computed server-side and stored in `uploads.checksum_sha256`
4. GET `/api/v1/uploads/:uploadId/url` returns a presigned URL with 1-hour expiry via `createSignedUrl(3600)`
5. File size limit enforced at 50MB; returns 400 `FILE_TOO_LARGE` for larger files
6. MIME type validation: only PDF, DOCX, XLSX, CSV, TXT, XML, ZIP accepted
7. WORM policy: no file overwrite or deletion API; DELETE endpoint only soft-deletes the `uploads` record
8. `IMalwareScanService` interface defined; `MalwareScanStub` always returns `{ clean: true }`
9. Uploads table record includes all metadata: filename, content_type, size_bytes, storage_path, checksum, document_type, parse_status
10. Presigned URL returns 404 for soft-deleted uploads
11. Institution scoping: faculty can only upload to and read from their own institution
12. All 24 API/unit tests pass
13. Routes protected by AuthMiddleware + RbacMiddleware requiring `AuthRole.FACULTY` or higher
