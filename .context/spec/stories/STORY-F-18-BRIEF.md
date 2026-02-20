# STORY-F-18 Brief: Supabase Storage Integration

## 0. Lane & Priority

```yaml
story_id: STORY-F-18
old_id: S-F-10-2
lane: faculty
lane_priority: 3
within_lane_order: 18
sprint: 4
size: M
depends_on:
  - STORY-F-9 (faculty) — Upload Dropzone UI (file selection and upload trigger)
blocks:
  - STORY-F-24 (faculty) — Content Record Creation (reads storage path from uploads table)
personas_served: [faculty, faculty_course_director]
epic: E-10 (Upload & Storage)
feature: F-05 (Content Upload & Storage)
```

## 1. Summary

Build a **StorageService** that manages file uploads to Supabase Storage with WORM (Write Once, Read Many) semantics, presigned URL generation, and SHA-256 integrity verification. Files are stored in the `content-originals` bucket with a hierarchical key structure: `{institution_id}/{course_id}/{file_id}/{original_filename}`.

This is the core storage layer for all content ingestion. The Upload Dropzone (F-9) provides the UI; this story provides the server-side file handling, storage bucket management, metadata persistence to the `uploads` table, and presigned URL generation for secure client-side reads.

Key constraints:
- WORM policy: files cannot be overwritten or deleted via API; only soft-delete of the `uploads` record
- SHA-256 checksum computed server-side for integrity verification
- Presigned URLs with 1-hour expiry for read access
- Malware scan: `IMalwareScanService` interface defined and stubbed (actual implementation deferred)
- File metadata (size, MIME type, checksum) stored in `uploads` table
- Maximum file size: 50MB (enforced server-side)
- Supported MIME types: PDF, DOCX, XLSX, CSV, TXT, XML, ZIP

## 2. Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define `Upload`, `StorageConfig`, `IMalwareScanService` types | `packages/types/src/storage/storage.types.ts` | 30m |
| 2 | Create barrel export for storage types | `packages/types/src/storage/index.ts` | 5m |
| 3 | Update root barrel export | `packages/types/src/index.ts` | 5m |
| 4 | Migration: create `uploads` table | Supabase MCP | 15m |
| 5 | Create storage error classes | `apps/server/src/errors/storage.error.ts` | 15m |
| 6 | Export new errors | `apps/server/src/errors/index.ts` | 5m |
| 7 | Implement `StorageService` | `apps/server/src/services/storage/storage.service.ts` | 90m |
| 8 | Implement `MalwareScanStub` | `apps/server/src/services/storage/malware-scan.stub.ts` | 15m |
| 9 | Implement `StorageController` | `apps/server/src/controllers/storage/storage.controller.ts` | 60m |
| 10 | Register routes in Express app | `apps/server/src/index.ts` | 10m |
| 11 | Write API tests (16 tests) | `apps/server/src/__tests__/storage.controller.test.ts` | 90m |
| 12 | Write StorageService unit tests (8 tests) | `apps/server/src/services/storage/__tests__/storage.service.test.ts` | 60m |

**Total estimate:** ~8 hours (Size M)

## 3. Data Model (inline, complete)

### `packages/types/src/storage/storage.types.ts`

```typescript
/**
 * Supported document types for upload categorization.
 */
export type DocumentType =
  | "exam_export"
  | "syllabus"
  | "lecture_notes"
  | "reference_material"
  | "curriculum_map"
  | "other";

/**
 * Upload parse status for content processing pipeline.
 */
export type ParseStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Allowed MIME types for upload.
 */
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "application/xml",
  "text/xml",
  "application/zip",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Maximum file size in bytes (50MB).
 */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Presigned URL expiry in seconds (1 hour).
 */
export const PRESIGNED_URL_EXPIRY_SECONDS = 3600;

/**
 * Upload record from the uploads table.
 */
export interface Upload {
  readonly id: string;
  readonly institution_id: string;
  readonly uploaded_by: string;
  readonly course_id: string | null;
  readonly filename: string;
  readonly content_type: AllowedMimeType;
  readonly size_bytes: number;
  readonly storage_path: string;
  readonly document_type: DocumentType;
  readonly parse_status: ParseStatus;
  readonly checksum_sha256: string;
  readonly metadata: UploadMetadata;
  readonly deleted_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * Upload metadata JSONB structure.
 */
export interface UploadMetadata {
  readonly original_filename: string;
  readonly upload_source: "dropzone" | "api";
  readonly malware_scan_status: "passed" | "skipped" | "failed";
  readonly malware_scan_at: string | null;
  /** Additional metadata from the upload client */
  readonly [key: string]: unknown;
}

/**
 * Request DTO for initiating a file upload.
 */
export interface UploadRequest {
  readonly filename: string;
  readonly content_type: AllowedMimeType;
  readonly document_type: DocumentType;
  readonly course_id?: string;
}

/**
 * Response after successful upload.
 */
export interface UploadResponse {
  readonly id: string;
  readonly filename: string;
  readonly storage_path: string;
  readonly size_bytes: number;
  readonly content_type: AllowedMimeType;
  readonly checksum_sha256: string;
  readonly document_type: DocumentType;
  readonly parse_status: ParseStatus;
  readonly created_at: string;
}

/**
 * Response for presigned URL request.
 */
export interface PresignedUrlResponse {
  readonly url: string;
  readonly expires_at: string;
}

/**
 * Storage key builder: {institution_id}/{course_id}/{file_id}/{original_filename}
 */
export interface StorageKeyParts {
  readonly institutionId: string;
  readonly courseId: string;
  readonly fileId: string;
  readonly filename: string;
}

/**
 * Malware scan service interface.
 * Stubbed for now; real implementation in future story.
 */
export interface IMalwareScanService {
  /**
   * Scan a file buffer for malware.
   * Returns true if file is clean, false if malware detected.
   * Throws on scan infrastructure failure.
   */
  scan(buffer: Buffer, filename: string): Promise<MalwareScanResult>;
}

/**
 * Malware scan result.
 */
export interface MalwareScanResult {
  readonly clean: boolean;
  readonly scanDurationMs: number;
  readonly engine: string;
  readonly threat: string | null;
}

/**
 * Storage configuration.
 */
export interface StorageConfig {
  readonly bucketName: string;
  readonly maxFileSizeBytes: number;
  readonly allowedMimeTypes: readonly string[];
  readonly presignedUrlExpirySeconds: number;
}
```

### `packages/types/src/storage/index.ts`

```typescript
export type {
  DocumentType,
  ParseStatus,
  AllowedMimeType,
  Upload,
  UploadMetadata,
  UploadRequest,
  UploadResponse,
  PresignedUrlResponse,
  StorageKeyParts,
  IMalwareScanService,
  MalwareScanResult,
  StorageConfig,
} from "./storage.types";

export {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  PRESIGNED_URL_EXPIRY_SECONDS,
} from "./storage.types";
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_uploads_table
CREATE TABLE uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    course_id UUID REFERENCES courses(id),
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    storage_path TEXT NOT NULL UNIQUE,
    document_type TEXT NOT NULL DEFAULT 'other'
        CHECK (document_type IN ('exam_export', 'syllabus', 'lecture_notes', 'reference_material', 'curriculum_map', 'other')),
    parse_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (parse_status IN ('pending', 'processing', 'completed', 'failed')),
    checksum_sha256 TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_uploads_institution_id ON uploads(institution_id);
CREATE INDEX idx_uploads_uploaded_by ON uploads(uploaded_by);
CREATE INDEX idx_uploads_course_id ON uploads(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX idx_uploads_parse_status ON uploads(parse_status);
CREATE INDEX idx_uploads_document_type ON uploads(document_type);
CREATE INDEX idx_uploads_not_deleted ON uploads(id) WHERE deleted_at IS NULL;

-- RLS: Faculty can upload to their institution, read their own uploads
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty insert uploads for own institution" ON uploads
    FOR INSERT WITH CHECK (
        institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Faculty read uploads for own institution" ON uploads
    FOR SELECT USING (
        institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Faculty soft-delete own uploads" ON uploads
    FOR UPDATE USING (
        uploaded_by = auth.uid()
        AND institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        uploaded_by = auth.uid()
    );

-- SuperAdmin reads all uploads
CREATE POLICY "SuperAdmin reads all uploads" ON uploads
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
    );
```

## 5. API Contract (complete request/response)

### POST /api/v1/uploads (Auth: faculty+, multipart/form-data)

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `file` (binary): The file to upload
  - `document_type` (string): One of the DocumentType values
  - `course_id` (string, optional): Associated course UUID

**Success Response (201):**
```json
{
  "data": {
    "id": "upload-uuid-001",
    "filename": "exam-bank-2026.csv",
    "storage_path": "inst-uuid/course-uuid/upload-uuid-001/exam-bank-2026.csv",
    "size_bytes": 245760,
    "content_type": "text/csv",
    "checksum_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "document_type": "exam_export",
    "parse_status": "pending",
    "created_at": "2026-02-19T12:00:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Missing file, missing document_type |
| 400 | `FILE_TOO_LARGE` | File exceeds 50MB |
| 400 | `UNSUPPORTED_FILE_TYPE` | MIME type not in allowed list |
| 400 | `MALWARE_DETECTED` | Malware scan failed (future) |
| 401 | `AUTHENTICATION_ERROR` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role below faculty |
| 409 | `CHECKSUM_MISMATCH` | File integrity check failed (if client provides expected checksum) |
| 500 | `STORAGE_ERROR` | Supabase Storage upload failed |

### GET /api/v1/uploads/:uploadId/url (Auth: faculty+)

**Response (200):**
```json
{
  "data": {
    "url": "https://project.supabase.co/storage/v1/object/sign/content-originals/inst/.../file.csv?token=...",
    "expires_at": "2026-02-19T13:00:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `AUTHENTICATION_ERROR` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role below faculty, or upload belongs to different institution |
| 404 | `NOT_FOUND` | Upload ID not found or soft-deleted |
| 500 | `STORAGE_ERROR` | Presigned URL generation failed |

### GET /api/v1/uploads (Auth: faculty+)

**Query params:** `?course_id=uuid&document_type=exam_export&parse_status=pending&page=1&limit=25`

**Response (200):**
```json
{
  "data": [
    {
      "id": "upload-uuid-001",
      "filename": "exam-bank-2026.csv",
      "content_type": "text/csv",
      "size_bytes": 245760,
      "document_type": "exam_export",
      "parse_status": "pending",
      "created_at": "2026-02-19T12:00:00Z"
    }
  ],
  "error": null,
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 1,
    "total_pages": 1
  }
}
```

### DELETE /api/v1/uploads/:uploadId (Auth: faculty+, owner only)

Soft-delete: sets `deleted_at` to current timestamp. Does NOT remove the file from Supabase Storage (WORM policy).

**Response (200):**
```json
{
  "data": { "id": "upload-uuid-001", "deleted_at": "2026-02-19T14:00:00Z" },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 401 | `AUTHENTICATION_ERROR` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Not the upload owner |
| 404 | `NOT_FOUND` | Upload not found or already soft-deleted |

## 6. Frontend Spec

**Not applicable for this story.** The Upload Dropzone UI is built in STORY-F-9. This story provides the server-side storage service and API endpoints that F-9 calls. The frontend integration (calling POST /api/v1/uploads from the dropzone) is wired in F-9.

For reference, the dropzone will:
1. Select file via drag-and-drop or file picker
2. POST multipart/form-data to `/api/v1/uploads`
3. Display upload progress, filename, size, and status
4. On success, show the upload record with a "View" link that fetches a presigned URL

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/storage/storage.types.ts` | Types | Create |
| 2 | `packages/types/src/storage/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add `export * from "./storage"`) |
| 4 | Supabase migration via MCP: `create_uploads_table` | Database | Apply |
| 5 | `apps/server/src/errors/storage.error.ts` | Errors | Create |
| 6 | `apps/server/src/errors/index.ts` | Errors | Edit (add exports) |
| 7 | `apps/server/src/services/storage/storage.service.ts` | Service | Create |
| 8 | `apps/server/src/services/storage/malware-scan.stub.ts` | Service | Create |
| 9 | `apps/server/src/controllers/storage/storage.controller.ts` | Controller | Create |
| 10 | `apps/server/src/index.ts` | Routes | Edit (add upload routes) |
| 11 | `apps/server/src/__tests__/storage.controller.test.ts` | Tests | Create |
| 12 | `apps/server/src/services/storage/__tests__/storage.service.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-9 | faculty | Required | Upload Dropzone provides the file upload UI |

### NPM Packages (new)
| Package | Version | Purpose | Size |
|---------|---------|---------|------|
| `multer` | ^1.4.x | Multipart form-data parsing for Express | ~40KB |
| `@types/multer` | ^1.4.x | TypeScript types for multer | dev only |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client (includes Storage API)
- `express` -- Server framework
- `vitest` -- Testing
- `crypto` -- Node.js built-in for SHA-256

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()` (Supabase client includes `.storage` API)
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `apps/server/src/errors/validation.error.ts` -- `ValidationError`
- `packages/types/src/auth/roles.types.ts` -- `AuthRole` enum
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>`, `PaginationMeta`

## 9. Test Fixtures (inline)

```typescript
import type { Upload, UploadRequest, UploadResponse, AllowedMimeType } from "@journey-os/types";

/** Mock institution ID */
export const MOCK_INSTITUTION_ID = "inst-uuid-001";

/** Mock user ID */
export const MOCK_USER_ID = "user-uuid-001";

/** Mock course ID */
export const MOCK_COURSE_ID = "course-uuid-001";

/** Valid CSV file buffer */
export const VALID_CSV_BUFFER = Buffer.from(
  "stem,optionA,optionB,optionC,optionD,correctAnswer\n" +
  '"Test question?","A","B","C","D","A"\n',
);

/** Valid PDF file buffer (minimal PDF header) */
export const VALID_PDF_BUFFER = Buffer.from("%PDF-1.4\n1 0 obj\n<< >>\nendobj");

/** Oversized file buffer (51MB) */
export const OVERSIZED_BUFFER = Buffer.alloc(51 * 1024 * 1024, "x");

/** Valid upload request */
export const VALID_UPLOAD_REQUEST: UploadRequest = {
  filename: "exam-bank-2026.csv",
  content_type: "text/csv",
  document_type: "exam_export",
  course_id: MOCK_COURSE_ID,
};

/** Upload request with unsupported MIME type */
export const INVALID_MIME_REQUEST: UploadRequest = {
  filename: "image.png",
  content_type: "image/png" as AllowedMimeType,
  document_type: "other",
};

/** Mock upload record from database */
export const MOCK_UPLOAD_RECORD: Upload = {
  id: "upload-uuid-001",
  institution_id: MOCK_INSTITUTION_ID,
  uploaded_by: MOCK_USER_ID,
  course_id: MOCK_COURSE_ID,
  filename: "exam-bank-2026.csv",
  content_type: "text/csv",
  size_bytes: 245760,
  storage_path: `${MOCK_INSTITUTION_ID}/${MOCK_COURSE_ID}/upload-uuid-001/exam-bank-2026.csv`,
  document_type: "exam_export",
  parse_status: "pending",
  checksum_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  metadata: {
    original_filename: "exam-bank-2026.csv",
    upload_source: "dropzone",
    malware_scan_status: "skipped",
    malware_scan_at: null,
  },
  deleted_at: null,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

/** Mock soft-deleted upload */
export const MOCK_DELETED_UPLOAD: Upload = {
  ...MOCK_UPLOAD_RECORD,
  deleted_at: "2026-02-19T14:00:00Z",
};

/** Expected storage key for mock upload */
export const EXPECTED_STORAGE_KEY =
  `${MOCK_INSTITUTION_ID}/${MOCK_COURSE_ID}/upload-uuid-001/exam-bank-2026.csv`;

/** Mock presigned URL */
export const MOCK_PRESIGNED_URL =
  "https://project.supabase.co/storage/v1/object/sign/content-originals/inst-uuid-001/course-uuid-001/upload-uuid-001/exam-bank-2026.csv?token=abc123";

/** Known SHA-256 for VALID_CSV_BUFFER */
export const EXPECTED_CSV_CHECKSUM =
  "a1b2c3d4e5f6..."; // Computed at test runtime via crypto.createHash('sha256')
```

## 10. API Test Spec (vitest -- PRIMARY)

### `apps/server/src/__tests__/storage.controller.test.ts` (16 tests)

```
describe("StorageController")
  describe("handleUpload (POST /api/v1/uploads)")
    it uploads valid CSV file and returns upload record (201)
    it uploads valid PDF file and returns upload record (201)
    it rejects file exceeding 50MB size limit (400 FILE_TOO_LARGE)
    it rejects unsupported MIME type (400 UNSUPPORTED_FILE_TYPE)
    it rejects request with no file attached (400 VALIDATION_ERROR)
    it rejects request with missing document_type (400 VALIDATION_ERROR)
    it stores file at correct storage key path
    it computes SHA-256 checksum correctly
    it sets parse_status to "pending" for new uploads
    it returns 401 when not authenticated
    it returns 403 when role is below faculty

  describe("getPresignedUrl (GET /api/v1/uploads/:uploadId/url)")
    it returns presigned URL with 1-hour expiry (200)
    it returns 404 for non-existent upload ID
    it returns 404 for soft-deleted upload
    it returns 403 for upload from different institution

  describe("softDelete (DELETE /api/v1/uploads/:uploadId)")
    it soft-deletes upload by setting deleted_at (200)
    it returns 404 for already soft-deleted upload
    it returns 403 when user is not the upload owner
```

### `apps/server/src/services/storage/__tests__/storage.service.test.ts` (8 tests)

```
describe("StorageService")
  describe("buildStorageKey")
    it builds correct path: {inst}/{course}/{file}/{filename}
    it uses "uncategorized" when course_id is null

  describe("computeChecksum")
    it computes SHA-256 hex digest for buffer
    it returns consistent checksum for same content

  describe("validateFile")
    it accepts allowed MIME types
    it rejects disallowed MIME types
    it rejects files exceeding size limit

  describe("upload")
    it calls Supabase storage.upload with correct bucket and key
    it creates uploads table record with metadata
```

**Total: ~24 tests** (16 controller + 8 service unit tests)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. The upload flow E2E will be covered when the full content upload journey is tested (dropzone + storage + content record creation spanning F-9, F-18, F-24). This story provides the backend; E2E requires the full UI.

## 12. Acceptance Criteria

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

## 13. Source References

| Claim | Source |
|-------|--------|
| Supabase Storage for file storage | ARCHITECTURE_v10 Section 3.1, Row: File Storage |
| WORM storage policy | S-F-10-2: "WORM storage with presigned URLs" |
| Storage key pattern | S-F-10-2: "{institution_id}/{course_id}/{file_id}/{original_filename}" |
| Presigned URLs 1-hour expiry | S-F-10-2: "createSignedUrl(3600)" |
| SHA-256 checksum | S-F-10-2: "SHA-256 checksum for integrity" |
| IMalwareScanService interface | S-F-10-2: "IMalwareScanService interface, stubbed" |
| No deletion (WORM) | S-F-10-2: "only soft-delete of content record" |
| uploads table schema | SUPABASE_DDL_v1 Section File Storage Tables |
| Upload endpoint | API_CONTRACT_v1: "POST /api/v1/courses/:courseId/upload" |
| document_type enum | SUPABASE_DDL_v1: exam_export, syllabus, lecture_notes, etc. |
| MVC pattern | CODE_STANDARDS Section 2.2 |
| OOP: private fields, constructor DI | CODE_STANDARDS Section 3.1 |
| Custom error classes | CODE_STANDARDS Section 3.4 |

## 14. Environment Prerequisites

- **Supabase:** Project running, `uploads` table created via migration
- **Supabase Storage:** `content-originals` bucket created (public: false)
- **Express:** Server running on port 3001
- **Node.js:** >= 18.x (for `crypto.createHash` and `Buffer` APIs)
- **No Neo4j needed** for this story
- **multer:** Must be installed for multipart parsing (`pnpm --filter @journey-os/server add multer && pnpm --filter @journey-os/server add -D @types/multer`)

**Supabase Storage bucket setup (manual or via dashboard):**
```
Bucket name: content-originals
Public: false
File size limit: 52428800 (50MB)
Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv, text/plain, application/xml, text/xml, application/zip
```

## 15. Implementation Notes

- **StorageService class pattern:**

```typescript
import { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import type {
  IMalwareScanService,
  StorageConfig,
  Upload,
  UploadResponse,
  PresignedUrlResponse,
  AllowedMimeType,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  PRESIGNED_URL_EXPIRY_SECONDS,
} from "@journey-os/types";

export class StorageService {
  readonly #supabaseClient: SupabaseClient;
  readonly #malwareScanner: IMalwareScanService;
  readonly #config: StorageConfig;

  constructor(
    supabaseClient: SupabaseClient,
    malwareScanner: IMalwareScanService,
    config?: Partial<StorageConfig>,
  ) {
    this.#supabaseClient = supabaseClient;
    this.#malwareScanner = malwareScanner;
    this.#config = {
      bucketName: config?.bucketName ?? "content-originals",
      maxFileSizeBytes: config?.maxFileSizeBytes ?? MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: config?.allowedMimeTypes ?? [...ALLOWED_MIME_TYPES],
      presignedUrlExpirySeconds: config?.presignedUrlExpirySeconds ?? PRESIGNED_URL_EXPIRY_SECONDS,
    };
  }
}
```

- **SHA-256 computation:**

```typescript
computeChecksum(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
```

- **Storage key builder:**

```typescript
buildStorageKey(parts: StorageKeyParts): string {
  const courseSegment = parts.courseId || "uncategorized";
  return `${parts.institutionId}/${courseSegment}/${parts.fileId}/${parts.filename}`;
}
```

- **Presigned URL generation:**

```typescript
async getPresignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await this.#supabaseClient.storage
    .from(this.#config.bucketName)
    .createSignedUrl(storagePath, this.#config.presignedUrlExpirySeconds);

  if (error) throw new StorageError(`Failed to create presigned URL: ${error.message}`);
  return data.signedUrl;
}
```

- **Multer configuration for Express:**

```typescript
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

// Route: POST /api/v1/uploads
router.post("/uploads", upload.single("file"), storageController.handleUpload);
```

- **WORM enforcement:** The Supabase Storage bucket policy prevents overwrites. The API does not expose a PUT or physical DELETE endpoint. The DELETE endpoint only sets `deleted_at` on the `uploads` record.

- **MalwareScanStub:**

```typescript
export class MalwareScanStub implements IMalwareScanService {
  async scan(_buffer: Buffer, _filename: string): Promise<MalwareScanResult> {
    return {
      clean: true,
      scanDurationMs: 0,
      engine: "stub",
      threat: null,
    };
  }
}
```

- **Error class hierarchy:**

```
JourneyOSError
  ├── StorageError (code: "STORAGE_ERROR") — general storage failures
  ├── FileTooLargeError (code: "FILE_TOO_LARGE") — exceeds size limit
  ├── UnsupportedFileTypeError (code: "UNSUPPORTED_FILE_TYPE") — MIME not allowed
  ├── MalwareDetectedError (code: "MALWARE_DETECTED") — scan failed (future)
  └── ChecksumMismatchError (code: "CHECKSUM_MISMATCH") — integrity check failed
```

- **vi.hoisted()** needed for Supabase mock in tests (vi.mock hoisting issue).
- **req.params narrowing:** For `:uploadId` param, narrow with `typeof uploadId === "string"` before passing to service methods.
- **Institution scoping:** The controller reads `req.user.institution_id` from the authenticated user and passes it to the service. The service validates that the upload belongs to the same institution before returning presigned URLs or allowing soft-delete.
