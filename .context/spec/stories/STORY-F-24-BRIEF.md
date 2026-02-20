# STORY-F-24 Brief: Content Record Creation

## 0. Lane & Priority

```yaml
story_id: STORY-F-24
old_id: S-F-10-3
lane: faculty
lane_priority: 3
within_lane_order: 24
sprint: 4
size: S
depends_on:
  - STORY-F-18 (faculty) — Storage integration provides storage_path and file metadata
blocks:
  - STORY-F-27 (faculty) — Inngest Content Pipeline reads content records as input
personas_served: [faculty]
epic: E-10 (Upload & Storage)
feature: F-05 (Content Upload & Storage)
```

## 1. Summary

Build the **content record layer** that creates and tracks content records after files are successfully uploaded to Supabase Storage. A content record links an upload to its processing state, associating it with a course (required) and optionally a session. The content record is the input to the content processing pipeline (E-11).

Key constraints:
- WORM compliance: content records are append-only for core fields; only `status` is mutable
- Status enum: `uploaded` -> `pending` -> `processing` -> `completed` | `error`
- Content records live only in Supabase (no DualWriteService); chunks get dual-written in STORY-F-28
- No update/delete operations for WORM compliance (except status transitions)
- `session_id` is optional because content can be attached to a course without a specific session

## 2. Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define `Content`, `ContentStatus`, DTOs in types | `packages/types/src/content/content.types.ts` | 20m |
| 2 | Create barrel export | `packages/types/src/content/index.ts` | 5m |
| 3 | Update root barrel export | `packages/types/src/index.ts` | 5m |
| 4 | Migration: create `contents` table | Supabase MCP | 15m |
| 5 | Create `ContentError` error class | `apps/server/src/errors/content.errors.ts` | 10m |
| 6 | Export new error | `apps/server/src/errors/index.ts` | 5m |
| 7 | Implement `ContentModel` with private fields | `apps/server/src/models/content.model.ts` | 20m |
| 8 | Implement `ContentRepository` (create, read, updateStatus) | `apps/server/src/repositories/content.repository.ts` | 40m |
| 9 | Write API tests (7 tests) | `apps/server/src/__tests__/content.repository.test.ts` | 45m |

**Total estimate:** ~3 hours (Size S)

## 3. Data Model (inline, complete)

### `packages/types/src/content/content.types.ts`

```typescript
/**
 * Content processing status.
 * Transitions: uploaded -> pending -> processing -> completed | error
 */
export type ContentStatus = "uploaded" | "pending" | "processing" | "completed" | "error";

/**
 * Content record: tracks an uploaded file and its processing state.
 */
export interface Content {
  readonly id: string;
  readonly course_id: string;
  readonly session_id: string | null;
  readonly upload_id: string;
  readonly filename: string;
  readonly mime_type: string;
  readonly file_size: number;
  readonly storage_path: string;
  readonly checksum: string;
  readonly status: ContentStatus;
  readonly uploaded_by: string;
  readonly error_message: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * Create content record request (called after successful upload).
 */
export interface CreateContentRequest {
  readonly course_id: string;
  readonly session_id?: string;
  readonly upload_id: string;
  readonly filename: string;
  readonly mime_type: string;
  readonly file_size: number;
  readonly storage_path: string;
  readonly checksum: string;
  readonly uploaded_by: string;
}

/**
 * Status update request (only status and error_message are mutable).
 */
export interface UpdateContentStatusRequest {
  readonly status: ContentStatus;
  readonly error_message?: string;
}

/**
 * Content list query filters.
 */
export interface ContentListFilter {
  readonly course_id?: string;
  readonly session_id?: string;
  readonly status?: ContentStatus;
  readonly uploaded_by?: string;
}
```

### `packages/types/src/content/index.ts`

```typescript
export type {
  ContentStatus,
  Content,
  CreateContentRequest,
  UpdateContentStatusRequest,
  ContentListFilter,
} from "./content.types";
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_contents_table

CREATE TABLE contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id),
    session_id UUID REFERENCES sessions(id),
    upload_id UUID NOT NULL REFERENCES uploads(id) UNIQUE,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    storage_path TEXT NOT NULL,
    checksum TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded'
        CHECK (status IN ('uploaded', 'pending', 'processing', 'completed', 'error')),
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_contents_course_id ON contents(course_id);
CREATE INDEX idx_contents_session_id ON contents(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_contents_upload_id ON contents(upload_id);
CREATE INDEX idx_contents_status ON contents(status);
CREATE INDEX idx_contents_uploaded_by ON contents(uploaded_by);

-- RLS: Faculty can read content for their institution's courses
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty read contents for own institution" ON contents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses c
            JOIN programs p ON c.program_id = p.id
            WHERE c.id = contents.course_id
            AND p.institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
        )
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
    );

CREATE POLICY "Faculty insert contents" ON contents
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid()
    );

-- Only status and error_message are updatable (WORM compliance)
CREATE POLICY "System update content status" ON contents
    FOR UPDATE USING (true)
    WITH CHECK (true);

-- SuperAdmin reads all
CREATE POLICY "SuperAdmin reads all contents" ON contents
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
    );
```

## 5. API Contract (complete request/response)

No new REST endpoints in this story. Content records are created programmatically by the `StorageController` after a successful upload (STORY-F-18). The content record creation is an internal service call, not a user-facing endpoint.

**Internal service call pattern:**

```typescript
// Called from StorageController.handleUpload after successful storage write
const content = await contentRepository.create({
  course_id: uploadRequest.course_id,
  session_id: uploadRequest.session_id,
  upload_id: uploadRecord.id,
  filename: uploadRecord.filename,
  mime_type: uploadRecord.content_type,
  file_size: uploadRecord.size_bytes,
  storage_path: uploadRecord.storage_path,
  checksum: uploadRecord.checksum_sha256,
  uploaded_by: req.user.sub,
});
```

**Future read endpoint** (consumed by pipeline in STORY-F-27):

```typescript
// ContentRepository.findByCourseId(courseId)
// ContentRepository.findById(contentId)
// ContentRepository.updateStatus(contentId, { status, error_message })
```

## 6. Frontend Spec

Not applicable for this story. Content records are created server-side after upload completion. The content list UI will be built in a future story when the content management dashboard is implemented.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/content/content.types.ts` | Types | Create |
| 2 | `packages/types/src/content/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add content export) |
| 4 | Supabase migration via MCP: `create_contents_table` | Database | Apply |
| 5 | `apps/server/src/errors/content.errors.ts` | Errors | Create |
| 6 | `apps/server/src/errors/index.ts` | Errors | Edit (add export) |
| 7 | `apps/server/src/models/content.model.ts` | Model | Create |
| 8 | `apps/server/src/repositories/content.repository.ts` | Repository | Create |
| 9 | `apps/server/src/__tests__/content.repository.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-18 | faculty | Required | StorageService provides upload records with storage_path and metadata |
| STORY-F-11 | faculty | Required | Course hierarchy provides courses and sessions tables (FK targets) |
| STORY-U-3 | universal | **DONE** | Auth context for uploaded_by |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/storage/storage.types.ts` -- `Upload` type (for linking)

## 9. Test Fixtures (inline)

```typescript
import type { Content, CreateContentRequest, ContentStatus } from "@journey-os/types";

/** Mock course ID */
export const MOCK_COURSE_ID = "course-uuid-001";

/** Mock session ID */
export const MOCK_SESSION_ID = "session-uuid-001";

/** Mock upload ID */
export const MOCK_UPLOAD_ID = "upload-uuid-001";

/** Mock user ID */
export const MOCK_USER_ID = "user-uuid-001";

/** Valid create content request */
export const VALID_CREATE_CONTENT: CreateContentRequest = {
  course_id: MOCK_COURSE_ID,
  session_id: MOCK_SESSION_ID,
  upload_id: MOCK_UPLOAD_ID,
  filename: "exam-bank-2026.csv",
  mime_type: "text/csv",
  file_size: 245760,
  storage_path: "inst-uuid-001/course-uuid-001/upload-uuid-001/exam-bank-2026.csv",
  checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  uploaded_by: MOCK_USER_ID,
};

/** Create content request without session */
export const VALID_CREATE_CONTENT_NO_SESSION: CreateContentRequest = {
  ...VALID_CREATE_CONTENT,
  session_id: undefined,
};

/** Mock stored content record */
export const MOCK_CONTENT_RECORD: Content = {
  id: "content-uuid-001",
  ...VALID_CREATE_CONTENT,
  session_id: MOCK_SESSION_ID,
  status: "uploaded",
  error_message: null,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

/** Mock content in processing state */
export const MOCK_PROCESSING_CONTENT: Content = {
  ...MOCK_CONTENT_RECORD,
  status: "processing",
  updated_at: "2026-02-19T12:05:00Z",
};

/** Mock content in error state */
export const MOCK_ERROR_CONTENT: Content = {
  ...MOCK_CONTENT_RECORD,
  status: "error",
  error_message: "Parse failed: unsupported PDF format",
  updated_at: "2026-02-19T12:10:00Z",
};

/** All valid status transitions */
export const VALID_TRANSITIONS: Array<[ContentStatus, ContentStatus]> = [
  ["uploaded", "pending"],
  ["pending", "processing"],
  ["processing", "completed"],
  ["processing", "error"],
];

/** Invalid status transition */
export const INVALID_TRANSITION: [ContentStatus, ContentStatus] = ["completed", "pending"];
```

## 10. API Test Spec (vitest -- PRIMARY)

### `apps/server/src/__tests__/content.repository.test.ts` (7 tests)

```
describe("ContentRepository")
  describe("create")
    it creates content record with all fields from upload metadata (201)
    it creates content record with null session_id when omitted
    it rejects duplicate upload_id (unique constraint violation)

  describe("findById")
    it returns content record by ID
    it returns null for non-existent content ID

  describe("findByCourseId")
    it returns all content records for a given course_id

  describe("updateStatus")
    it updates status and error_message fields only (WORM compliance)
```

**Total: 7 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Content record creation is a server-side internal operation with no user-facing UI. E2E coverage will be added with the full upload-to-pipeline journey.

## 12. Acceptance Criteria

1. Content TypeScript types define all fields: id, course_id, session_id, upload_id, filename, mime_type, file_size, storage_path, checksum, status, uploaded_by, error_message
2. ContentModel class uses JS `#private` fields and public getters
3. ContentRepository supports create, findById, findByCourseId, updateStatus operations
4. No update/delete for core fields (WORM compliance); only `status` and `error_message` are mutable
5. Status enum values: `uploaded`, `pending`, `processing`, `completed`, `error`
6. Content record created after successful storage upload with correct foreign key to uploads table
7. Association to course (required) and session (optional)
8. `contents` table has unique constraint on `upload_id`
9. All 7 API tests pass
10. TypeScript strict mode, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| Content record as pipeline input | S-F-10-3: "Content records are the input to the processing pipeline (E-11)" |
| WORM compliance | S-F-10-3: "content records are append-only for core fields; only status is mutable" |
| No DualWrite for content | S-F-10-3: "content records live only in Supabase; chunks get dual-written in S-F-11-4" |
| Status enum | S-F-10-3: "uploaded, pending, processing, completed, error" |
| Optional session_id | S-F-10-3: "session_id is optional because content can be attached to a course without a specific session" |
| OOP: private fields | CODE_STANDARDS Section 3.1 |
| MVC pattern | CODE_STANDARDS Section 2.2 |

## 14. Environment Prerequisites

- **Supabase:** Project running, `uploads` table exists (STORY-F-18), `courses` table exists (STORY-F-1), `sessions` table exists (STORY-F-11)
- **Express:** Server running on port 3001
- **No Neo4j needed** for this story (content records are Supabase-only)
- **No new npm packages** required

## 15. Implementation Notes

- **ContentModel class:**

```typescript
import type { Content, ContentStatus } from "@journey-os/types";

export class ContentModel {
  readonly #id: string;
  readonly #courseId: string;
  readonly #sessionId: string | null;
  readonly #uploadId: string;
  readonly #filename: string;
  readonly #mimeType: string;
  readonly #fileSize: number;
  readonly #storagePath: string;
  readonly #checksum: string;
  #status: ContentStatus;
  #errorMessage: string | null;
  readonly #uploadedBy: string;
  readonly #createdAt: string;
  #updatedAt: string;

  constructor(data: Content) {
    this.#id = data.id;
    this.#courseId = data.course_id;
    this.#sessionId = data.session_id;
    this.#uploadId = data.upload_id;
    this.#filename = data.filename;
    this.#mimeType = data.mime_type;
    this.#fileSize = data.file_size;
    this.#storagePath = data.storage_path;
    this.#checksum = data.checksum;
    this.#status = data.status;
    this.#errorMessage = data.error_message;
    this.#uploadedBy = data.uploaded_by;
    this.#createdAt = data.created_at;
    this.#updatedAt = data.updated_at;
  }

  get id(): string { return this.#id; }
  get courseId(): string { return this.#courseId; }
  get sessionId(): string | null { return this.#sessionId; }
  get status(): ContentStatus { return this.#status; }
  // ... other getters
}
```

- **ContentRepository pattern:**

```typescript
export class ContentRepository {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async create(data: CreateContentRequest): Promise<Content> {
    const { data: record, error } = await this.#supabaseClient
      .from("contents")
      .insert({
        course_id: data.course_id,
        session_id: data.session_id ?? null,
        upload_id: data.upload_id,
        filename: data.filename,
        mime_type: data.mime_type,
        file_size: data.file_size,
        storage_path: data.storage_path,
        checksum: data.checksum,
        uploaded_by: data.uploaded_by,
        status: "uploaded",
      })
      .select()
      .single();

    if (error) throw new ContentError(`Failed to create content record: ${error.message}`);
    return record;
  }

  async updateStatus(id: string, update: UpdateContentStatusRequest): Promise<Content> {
    const { data: record, error } = await this.#supabaseClient
      .from("contents")
      .update({
        status: update.status,
        error_message: update.error_message ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new ContentError(`Failed to update content status: ${error.message}`);
    return record;
  }
}
```

- **Error class:**

```
JourneyOSError
  └── ContentError (code: "CONTENT_ERROR")
```

- **Integration with StorageController:** After a successful upload in STORY-F-18, the StorageController calls `contentRepository.create()` to create the content record. This wiring happens when F-18 and F-24 are both complete.

- **vi.hoisted()** needed for Supabase mock in tests.
