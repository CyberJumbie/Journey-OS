# STORY-F-18: Supabase Storage Integration

**Epic:** E-10 (Upload & Storage)
**Feature:** F-05
**Sprint:** 4
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-10-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need uploaded files stored securely in WORM storage with presigned URLs so that originals are immutable and downloadable when needed.

## Acceptance Criteria
- [ ] Supabase Storage bucket `content-originals` configured with WORM (write-once-read-many) policy
- [ ] StorageService uploads files to bucket with structured key: `{institution_id}/{course_id}/{file_id}/{original_filename}`
- [ ] Presigned URL generation for secure, time-limited download access (1-hour expiry)
- [ ] Upload returns storage path and file metadata (size, MIME type, checksum)
- [ ] SHA-256 checksum computed and stored for integrity verification
- [ ] Malware scan placeholder: interface defined, implementation deferred
- [ ] Storage cleanup: no deletion allowed (WORM), only soft-delete of content record
- [ ] 8-10 API tests for upload-to-storage, presigned URL generation, checksum verification, WORM enforcement
- [ ] TypeScript strict, named exports only

## Reference Screens
> **None** -- backend-only story. Upload UI is built in STORY-F-9.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/content/storage.types.ts` |
| Service | apps/server | `src/services/upload/storage.service.ts` |
| Repository | apps/server | `src/repositories/upload.repository.ts` |
| Tests | apps/server | `src/services/upload/__tests__/storage.service.test.ts` |

## Database Schema
No new tables. Storage metadata is stored in the content record (STORY-F-24).

### Supabase Storage -- `content-originals` bucket
- WORM policy: write-once, no overwrite, no delete
- Structured key: `{institution_id}/{course_id}/{file_id}/{original_filename}`
- RLS: authenticated users with course access can read

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/content/:id/download` | Faculty+ | Get presigned download URL |

## Dependencies
- **Blocks:** STORY-F-24 (Content Record Creation)
- **Blocked by:** STORY-F-9 (upload controller passes files to storage)
- **Cross-lane:** None

## Testing Requirements
### API Tests (8-10)
1. Upload file to storage returns storage path
2. Upload computes SHA-256 checksum
3. Presigned URL generation returns valid URL with 1-hour expiry
4. Presigned URL allows file download
5. WORM enforcement: cannot overwrite existing file
6. WORM enforcement: cannot delete stored file
7. Storage key follows structured convention
8. File metadata (size, MIME type) returned on upload
9. Malware scan interface defined (stub passes through)
10. Storage path includes institution_id and course_id

## Implementation Notes
- WORM policy means no overwrite, no delete at the storage level.
- Presigned URLs use Supabase `createSignedUrl` with 3600s expiry.
- Checksum stored in content record for later integrity checks.
- Malware scan interface: `IMalwareScanService.scan(fileBuffer): Promise<ScanResult>` -- stubbed with pass-through for now.
- Storage path convention ensures files are organized by institution and course.
- All Supabase operations through Supabase client, never raw SQL for storage.
- See existing `apps/server/src/repositories/upload.repository.ts`.
