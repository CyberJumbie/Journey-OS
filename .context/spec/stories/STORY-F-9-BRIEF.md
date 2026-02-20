# STORY-F-9 Brief: Upload Dropzone Component

## 0. Lane & Priority

```yaml
story_id: STORY-F-9
old_id: S-F-10-1
lane: faculty
lane_priority: 3
within_lane_order: 9
sprint: 4
size: M
depends_on:
  - STORY-F-1 (faculty) — Course Model & Repository
blocks:
  - STORY-F-18 — Supabase Storage Integration
personas_served: [faculty, faculty_course_director]
epic: E-10 (Upload & Storage)
feature: F-05 (Content Upload)
user_flow: UF-09 (Upload Course Materials)
```

## 1. Summary

Build a **drag-and-drop upload component** with file validation that allows faculty to upload course materials (PDF, PowerPoint, Word) with per-file progress tracking. The component includes client-side MIME type and size validation (defense-in-depth), server-side validation via multer middleware, and custom error classes for invalid file types and size limit violations.

This is the entry point for the E-10 Upload & Storage pipeline. Files are uploaded via multipart/form-data to an Express endpoint, validated, and stored temporarily on the server. The actual Supabase Storage integration (moving files to cloud storage) is deferred to STORY-F-18.

Key constraints:
- **Accepted types:** PDF (.pdf), PowerPoint (.pptx), Word (.docx)
- **Max file size:** 50MB per file
- **Max batch:** 10 files per upload
- **Client-side + server-side MIME validation** (defense-in-depth)
- **Per-file progress bar** using XMLHttpRequest upload events
- **Custom error classes:** `InvalidFileTypeError`, `FileSizeLimitError`
- **Atomic Design:** DropArea (Atom) -> UploadProgressItem (Molecule) -> UploadDropzone (Organism)

## 2. Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define `UploadFile`, `UploadProgress`, `UploadResponse`, `UploadConfig` types | `packages/types/src/content/upload.types.ts` | 30m |
| 2 | Create barrel export for content types | `packages/types/src/content/index.ts` | 5m |
| 3 | Create `uploads` table migration via Supabase MCP | Supabase migration | 15m |
| 4 | Create custom error classes `InvalidFileTypeError`, `FileSizeLimitError`, `BatchLimitError` | `apps/server/src/errors/upload.error.ts` | 15m |
| 5 | Implement multer middleware with file type + size validation | `apps/server/src/middleware/upload.validation.ts` | 45m |
| 6 | Implement `UploadService` with file processing + DB record creation | `apps/server/src/services/upload/upload.service.ts` | 60m |
| 7 | Implement `UploadController` with `handleUpload()` | `apps/server/src/controllers/upload.controller.ts` | 30m |
| 8 | Register route `POST /api/v1/courses/:courseId/upload` in server index | `apps/server/src/index.ts` | 10m |
| 9 | Build `DropArea` atom (drag-and-drop zone with visual feedback) | `packages/ui/src/atoms/drop-area.tsx` | 30m |
| 10 | Build `FileIcon` atom (icon by file type) | `packages/ui/src/atoms/file-icon.tsx` | 15m |
| 11 | Build `UploadProgressItem` molecule (file name + progress bar + status) | `packages/ui/src/molecules/upload-progress-item.tsx` | 30m |
| 12 | Build `UploadDropzone` organism (full upload experience) | `apps/web/src/components/organisms/upload-dropzone.tsx` | 60m |
| 13 | Build upload client service with XHR progress tracking | `apps/web/src/services/upload.client.ts` | 45m |
| 14 | Write API tests (16 tests) | `apps/server/src/__tests__/upload.controller.test.ts` | 90m |

**Total estimate:** ~8 hours (Size M)

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/content/upload.types.ts

/** Supported upload document types */
export type DocumentType = "pdf" | "pptx" | "docx";

/** MIME types accepted for upload */
export type AcceptedMimeType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Parse status of an uploaded document */
export type ParseStatus = "pending" | "processing" | "completed" | "failed";

/** Upload configuration constants */
export interface UploadConfig {
  readonly maxFileSizeBytes: number;     // 50 * 1024 * 1024 (50MB)
  readonly maxFilesPerBatch: number;     // 10
  readonly acceptedMimeTypes: readonly AcceptedMimeType[];
  readonly acceptedExtensions: readonly string[];
}

/** Client-side file state during upload */
export interface UploadFileState {
  readonly id: string;               // Client-generated UUID
  readonly file: File;
  readonly name: string;
  readonly size: number;
  readonly type: string;
  readonly progress: number;         // 0-100
  readonly status: "pending" | "uploading" | "success" | "error";
  readonly error: string | null;
}

/** Server response for a single uploaded file */
export interface UploadedFileRecord {
  readonly id: string;
  readonly filename: string;
  readonly content_type: string;
  readonly size_bytes: number;
  readonly storage_path: string;
  readonly document_type: DocumentType;
  readonly parse_status: ParseStatus;
  readonly created_at: string;
}

/** Response envelope for upload endpoint */
export interface UploadResponse {
  readonly files: readonly UploadedFileRecord[];
  readonly errors: readonly UploadFileError[];
}

/** Per-file error in upload response */
export interface UploadFileError {
  readonly filename: string;
  readonly code: "INVALID_FILE_TYPE" | "FILE_SIZE_LIMIT" | "UPLOAD_FAILED";
  readonly message: string;
}
```

## 4. Database Schema (inline, complete)

```sql
-- New table: uploads (if not already created by prior migrations)
-- Note: This may already exist from SUPABASE_DDL_v1; apply as idempotent migration
CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  course_id UUID NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 52428800),
  storage_path TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('pdf', 'pptx', 'docx')),
  parse_status TEXT NOT NULL DEFAULT 'pending' CHECK (parse_status IN ('pending', 'processing', 'completed', 'failed')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_uploads_course_id ON uploads(course_id);
CREATE INDEX IF NOT EXISTS idx_uploads_uploaded_by ON uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_uploads_institution_id ON uploads(institution_id);
CREATE INDEX IF NOT EXISTS idx_uploads_parse_status ON uploads(parse_status);

-- RLS policies
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can view own uploads"
  ON uploads FOR SELECT
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Faculty can insert uploads"
  ON uploads FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Institution admins can view all institution uploads"
  ON uploads FOR SELECT
  USING (institution_id IN (
    SELECT institution_id FROM user_profiles WHERE id = auth.uid()
      AND (role = 'institutional_admin' OR is_course_director = true)
  ));
```

## 5. API Contract (complete request/response)

### POST /api/v1/courses/:courseId/upload (Auth: Faculty, Course Director)

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `files` (array of files)
- Max files: 10
- Max file size: 50MB each

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer JWT |
| `Content-Type` | Yes | `multipart/form-data; boundary=...` |

**Success Response (200):**
```json
{
  "data": {
    "files": [
      {
        "id": "upload-uuid-1",
        "filename": "cardiology-lecture-notes.pdf",
        "content_type": "application/pdf",
        "size_bytes": 2456789,
        "storage_path": "uploads/inst-uuid-1/course-uuid-1/upload-uuid-1.pdf",
        "document_type": "pdf",
        "parse_status": "pending",
        "created_at": "2026-02-19T15:00:00Z"
      }
    ],
    "errors": []
  },
  "error": null
}
```

**Partial Success Response (200 with errors):**
```json
{
  "data": {
    "files": [
      {
        "id": "upload-uuid-1",
        "filename": "valid-document.pdf",
        "content_type": "application/pdf",
        "size_bytes": 1234567,
        "storage_path": "uploads/inst-uuid-1/course-uuid-1/upload-uuid-1.pdf",
        "document_type": "pdf",
        "parse_status": "pending",
        "created_at": "2026-02-19T15:00:00Z"
      }
    ],
    "errors": [
      {
        "filename": "image.png",
        "code": "INVALID_FILE_TYPE",
        "message": "File type image/png is not supported. Accepted types: PDF, PPTX, DOCX"
      }
    ]
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | User not authorized for this course |
| 400 | `VALIDATION_ERROR` | No files provided |
| 400 | `BATCH_LIMIT` | More than 10 files in one request |
| 400 | `INVALID_FILE_TYPE` | All files have invalid types |
| 400 | `FILE_SIZE_LIMIT` | File exceeds 50MB |
| 404 | `NOT_FOUND` | Course ID does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Component Hierarchy (Atomic Design)

```
CourseMaterialsPage (page.tsx — default export)
  └── UploadDropzone (Organism — client component)
        ├── DropArea (Atom — drag-and-drop zone)
        │     ├── UploadCloud icon (Lucide)
        │     ├── "Drag & drop files here" text
        │     ├── "or click to browse" link
        │     └── "PDF, PPTX, DOCX up to 50MB" subtext
        ├── UploadProgressItem x N (Molecule — per selected file)
        │     ├── FileIcon (Atom — PDF/PPTX/DOCX icon by extension)
        │     ├── FileName (text — filename + size)
        │     ├── ProgressBar (Atom — 0-100%)
        │     ├── StatusBadge (Atom — uploading/success/error)
        │     └── RemoveButton (Atom — X icon to remove from queue)
        └── UploadButton (Atom — "Upload N files" submit)
```

**DropArea States:**
1. **Idle** — Dashed border, upload icon, instruction text
2. **Drag Over** — Solid border, blue highlight, "Drop files here" text
3. **Invalid Drag** — Red border when dragging unsupported files (if detectable)
4. **Disabled** — Grayed out when upload is in progress

**UploadProgressItem States:**
1. **Queued** — File added, awaiting upload start
2. **Uploading** — Progress bar animating (0-100%)
3. **Success** — Green checkmark, "Uploaded" badge
4. **Error** — Red X, error message text, retry button

**Design tokens:**
- DropArea border: `--color-border-dashed` (idle), `--color-accent-blue` (drag over), `--color-error-red` (invalid)
- DropArea background: `--color-surface-white` (idle), `--color-surface-blue-tint` (drag over)
- Progress bar: `--color-accent-blue` (fill), `--color-border-light` (track)
- Success: `--color-success-green`
- Error: `--color-error-red`
- Typography: Source Sans 3, 14px filename, 12px file size, 12px status
- Spacing: 16px padding, 8px between progress items

**Responsive:**
- Desktop (>=1024px): Full width in content area
- Tablet (640-1023px): Full width
- Mobile (<640px): Full width, compact layout, smaller drop area

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/content/upload.types.ts` | Types | Create |
| 2 | `packages/types/src/content/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add content export) |
| 4 | Supabase migration via MCP (uploads table) | Database | Apply |
| 5 | `apps/server/src/errors/upload.error.ts` | Errors | Create |
| 6 | `apps/server/src/middleware/upload.validation.ts` | Middleware | Create |
| 7 | `apps/server/src/services/upload/upload.service.ts` | Service | Create |
| 8 | `apps/server/src/controllers/upload.controller.ts` | Controller | Create |
| 9 | `apps/server/src/index.ts` | Routes | Edit (add upload route) |
| 10 | `packages/ui/src/atoms/drop-area.tsx` | Atom | Create |
| 11 | `packages/ui/src/atoms/file-icon.tsx` | Atom | Create |
| 12 | `packages/ui/src/molecules/upload-progress-item.tsx` | Molecule | Create |
| 13 | `apps/web/src/components/organisms/upload-dropzone.tsx` | Organism | Create |
| 14 | `apps/web/src/services/upload.client.ts` | Client Service | Create |
| 15 | `apps/server/src/__tests__/upload.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-1 | faculty | **Pending** | Course Model — uploads are attached to courses via `course_id` FK |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty/admin enforcement |

### NPM Packages (new — install in apps/server)
| Package | Version | Purpose |
|---------|---------|---------|
| `multer` | ^1.4.x | Multipart/form-data parsing middleware |
| `@types/multer` | ^1.4.x | TypeScript types for multer (dev) |

### NPM Packages (existing, already in monorepo)
- `@supabase/supabase-js` — Supabase client
- `express` — Server framework
- `vitest` — Testing
- `lucide-react` — Icons (UploadCloud, File, FileText, Presentation)
- `uuid` — Client-side file ID generation

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `createRbacMiddleware()`, `rbac.require(AuthRole.FACULTY)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`, `AuthRole`

## 9. Test Fixtures (inline)

```typescript
// Mock faculty user
export const FACULTY_USER = {
  sub: "faculty-uuid-1",
  email: "jsmith@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock student user (should be denied)
export const STUDENT_USER = {
  ...FACULTY_USER,
  sub: "student-uuid-1",
  email: "student@msm.edu",
  role: "student" as const,
};

// Valid PDF buffer (minimal PDF header)
export const VALID_PDF_BUFFER = Buffer.from(
  "%PDF-1.4 fake pdf content for testing",
  "utf-8"
);

// Valid PPTX buffer (minimal ZIP header for Office Open XML)
export const VALID_PPTX_BUFFER = Buffer.from(
  "PK\x03\x04fake pptx content for testing",
  "utf-8"
);

// Invalid file buffer (PNG)
export const INVALID_PNG_BUFFER = Buffer.from(
  "\x89PNG\r\n\x1a\n fake png content",
  "utf-8"
);

// Oversized buffer (51MB)
export const OVERSIZED_BUFFER = Buffer.alloc(51 * 1024 * 1024, "x");

// Mock multer file objects
export const MOCK_PDF_FILE = {
  fieldname: "files",
  originalname: "cardiology-notes.pdf",
  encoding: "7bit",
  mimetype: "application/pdf",
  size: 2456789,
  buffer: VALID_PDF_BUFFER,
  destination: "",
  filename: "",
  path: "",
  stream: null as unknown,
};

export const MOCK_PPTX_FILE = {
  fieldname: "files",
  originalname: "lecture-slides.pptx",
  encoding: "7bit",
  mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  size: 5678901,
  buffer: VALID_PPTX_BUFFER,
  destination: "",
  filename: "",
  path: "",
  stream: null as unknown,
};

export const MOCK_INVALID_FILE = {
  fieldname: "files",
  originalname: "photo.png",
  encoding: "7bit",
  mimetype: "image/png",
  size: 123456,
  buffer: INVALID_PNG_BUFFER,
  destination: "",
  filename: "",
  path: "",
  stream: null as unknown,
};

// Mock upload response
export const MOCK_UPLOAD_RECORD = {
  id: "upload-uuid-1",
  institution_id: "inst-uuid-1",
  course_id: "course-uuid-1",
  uploaded_by: "faculty-uuid-1",
  filename: "cardiology-notes.pdf",
  content_type: "application/pdf",
  size_bytes: 2456789,
  storage_path: "uploads/inst-uuid-1/course-uuid-1/upload-uuid-1.pdf",
  document_type: "pdf",
  parse_status: "pending",
  metadata: {},
  created_at: "2026-02-19T15:00:00Z",
  updated_at: "2026-02-19T15:00:00Z",
};
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/__tests__/upload.controller.test.ts`

```
describe("UploadController")
  describe("handleUpload")
    ✓ uploads single valid PDF and returns upload record (200)
    ✓ uploads multiple valid files (PDF + PPTX + DOCX) in one batch (200)
    ✓ rejects unauthenticated request (401)
    ✓ rejects student role (403 FORBIDDEN)
    ✓ rejects request with no files (400 VALIDATION_ERROR)
    ✓ rejects file with invalid MIME type (400 INVALID_FILE_TYPE)
    ✓ rejects file exceeding 50MB size limit (400 FILE_SIZE_LIMIT)
    ✓ rejects batch exceeding 10 files (400 BATCH_LIMIT)
    ✓ returns partial success: valid files uploaded, invalid files in errors array
    ✓ creates upload record in Supabase with correct fields
    ✓ generates correct storage_path format: uploads/{institution_id}/{course_id}/{upload_id}.{ext}
    ✓ returns 404 for non-existent course ID

describe("Upload Validation Middleware")
  describe("multer configuration")
    ✓ accepts application/pdf MIME type
    ✓ accepts application/vnd.openxmlformats-officedocument.presentationml.presentation
    ✓ accepts application/vnd.openxmlformats-officedocument.wordprocessingml.document
    ✓ rejects image/png MIME type
    ✓ rejects application/zip MIME type
    ✓ enforces 50MB file size limit in multer config

describe("UploadService")
  describe("processUpload")
    ✓ creates upload record in Supabase with parse_status=pending
    ✓ determines document_type from MIME type
    ✓ throws InvalidFileTypeError for unsupported MIME type
    ✓ throws FileSizeLimitError when file exceeds max size
```

**Total: ~22 tests** (12 controller + 6 middleware + 4 service)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. E2E coverage will be added when the full Upload & Storage flow (F-9 -> F-18 -> F-24) is complete, as part of the Content Upload critical journey.

## 12. Acceptance Criteria

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

## 13. Source References

| Claim | Source |
|-------|--------|
| Upload endpoint: POST /api/v1/courses/:courseId/upload | API_CONTRACT_v1 Section Content Upload |
| Accepted types: PDF, PPTX, DOCX | S-F-10-1 Acceptance Criteria |
| 50MB file size limit | S-F-10-1 Acceptance Criteria |
| Multer middleware for multipart | S-F-10-1 Notes |
| Custom error classes: InvalidFileTypeError, FileSizeLimitError | S-F-10-1 Notes |
| Atomic Design: DropArea (Atom), FileIcon (Atom), UploadProgressItem (Molecule), UploadDropzone (Organism) | S-F-10-1 Notes |
| uploads table with document_type and parse_status | SUPABASE_DDL_v1 Section File Storage Tables |
| File storage via Supabase Storage | ARCHITECTURE_v10 Section 3.1 |
| Blocks F-18 (Supabase Storage Integration) | S-F-10-1 Dependencies |

## 14. Environment Prerequisites

- **Supabase:** Project running, `institutions` table exists (for FK), `uploads` table migration
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **STORY-F-1 (Course Model):** Must be complete before this story can be implemented (course_id FK)
- **No Neo4j needed** for this story
- **No Supabase Storage bucket** needed yet (deferred to F-18)

## 15. Implementation Notes

- **Multer configuration:** Use `multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 10 }, fileFilter })`. The `fileFilter` function checks MIME type against the accepted list and calls `cb(new InvalidFileTypeError(...))` for rejections.
- **Client-side validation:** The `UploadDropzone` organism validates files before adding them to the queue. Use the `accept` attribute on the hidden `<input type="file">` and also check `file.type` against the accepted MIME types list. This is defense-in-depth; the server is the source of truth.
- **XHR for progress tracking:** The `upload.client.ts` service uses `XMLHttpRequest` instead of `fetch` because `fetch` does not support upload progress events. Listen to `xhr.upload.onprogress` for per-file progress updates. Wrap in a Promise for async/await compatibility.
- **Storage path:** Files are stored at `uploads/{institution_id}/{course_id}/{upload_id}.{ext}`. In this story, files are stored in the local filesystem (e.g., `/tmp/uploads/...`). STORY-F-18 migrates to Supabase Storage buckets.
- **Partial success pattern:** When uploading a batch, each file is processed independently. If some files fail validation and others succeed, return 200 with both `files` (successful) and `errors` (failed) arrays. Only return 400 when ALL files fail or the request itself is malformed (no files, batch limit).
- **Error class hierarchy:**
  ```
  JourneyOSError
    └── UploadError (code: 'UPLOAD_ERROR')
          ├── InvalidFileTypeError (code: 'INVALID_FILE_TYPE')
          │     Properties: filename, mimeType, acceptedTypes
          ├── FileSizeLimitError (code: 'FILE_SIZE_LIMIT')
          │     Properties: filename, fileSize, maxSize
          └── BatchLimitError (code: 'BATCH_LIMIT')
                Properties: fileCount, maxFiles
  ```
- **JS #private fields** in UploadService for Supabase client and config references.
- **vi.hoisted()** for mock variables in vitest tests. Mock multer with a factory function. Supabase mock should use separate mock objects per chain stage.
- **MIME type to document_type mapping:**
  ```
  "application/pdf" -> "pdf"
  "application/vnd.openxmlformats-officedocument.presentationml.presentation" -> "pptx"
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> "docx"
  ```
- **req.params.courseId** is `string | string[]` in strict mode. Narrow with `typeof courseId === "string"` before using.
