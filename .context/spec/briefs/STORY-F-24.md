# STORY-F-24: Content Record Creation

**Epic:** E-10 (Upload & Storage)
**Feature:** F-05
**Sprint:** 4
**Lane:** faculty (P3)
**Size:** S
**Old ID:** S-F-10-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need content records created automatically after upload so that file metadata and processing status are tracked in the system.

## Acceptance Criteria
- [ ] Content TypeScript types: id, course_id, session_id (optional), filename, mime_type, file_size, storage_path, checksum, status, uploaded_by, uploaded_at
- [ ] Content model class with private `#fields`, public getters
- [ ] ContentRepository with create and read operations (no update/delete for WORM compliance)
- [ ] Status enum: `uploaded`, `pending`, `processing`, `completed`, `error`
- [ ] Content record created after successful storage upload
- [ ] Association to course (required) and session (optional)
- [ ] 5-8 API tests for record creation, status transitions, read by course
- [ ] TypeScript strict, named exports only

## Reference Screens
> **None** -- backend-only story. Upload UI is built in STORY-F-9.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/content/content.types.ts` |
| Model | apps/server | `src/models/content.model.ts` |
| Repository | apps/server | `src/repositories/content.repository.ts` |
| Service | apps/server | `src/services/upload/content.service.ts` |
| Tests | apps/server | `src/repositories/__tests__/content.repository.test.ts` |

## Database Schema

### Supabase -- `content` table (or `uploads`)
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `course_id` | uuid | NOT NULL, FK -> courses |
| `session_id` | uuid | NULL, FK -> sessions |
| `filename` | varchar(500) | NOT NULL |
| `mime_type` | varchar(100) | NOT NULL |
| `file_size` | bigint | NOT NULL |
| `storage_path` | text | NOT NULL |
| `checksum` | varchar(64) | NOT NULL |
| `status` | varchar(20) | NOT NULL, DEFAULT 'uploaded' |
| `uploaded_by` | uuid | NOT NULL, FK -> auth.users |
| `uploaded_at` | timestamptz | NOT NULL, DEFAULT now() |

INDEX on (course_id, status).

### No Neo4j schema -- content records live only in Supabase. Chunks get dual-written in later stories.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/courses/:courseId/content` | Faculty+ | List content records for a course |
| GET | `/api/v1/content/:id` | Faculty+ | Get single content record |

## Dependencies
- **Blocks:** Processing pipeline stories (E-11)
- **Blocked by:** STORY-F-18 (storage integration provides path and metadata)
- **Cross-lane:** None

## Testing Requirements
### API Tests (5-8)
1. Create content record with valid data returns record
2. Content record includes storage_path and checksum from upload
3. Status defaults to 'uploaded' on creation
4. Read by course returns all content for that course
5. Read by ID returns single content record
6. Content with session_id association works correctly
7. Content without session_id (course-level) works correctly
8. Status update from 'uploaded' to 'pending' succeeds

## Implementation Notes
- Content records are the input to the processing pipeline (E-11).
- Status is updated by the pipeline: uploaded -> pending -> processing -> completed | error.
- No DualWriteService here: content records live only in Supabase; chunks get dual-written in later stories.
- WORM compliance: content records are append-only for core fields; only `status` is mutable.
- session_id is optional because content can be attached to a course without a specific session.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names (may be `uploads` not `content`).
- Use `.select().single()` on ALL Supabase write operations.
