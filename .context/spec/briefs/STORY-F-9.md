# STORY-F-9: Upload Dropzone Component

**Epic:** E-10 (Upload & Storage)
**Feature:** F-05
**Sprint:** 4
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-10-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a drag-and-drop upload component with file validation so that I can easily upload course materials in supported formats.

## Acceptance Criteria
- [ ] Dropzone component accepts drag-and-drop and click-to-browse
- [ ] Accepted file types: PDF (.pdf), PowerPoint (.pptx), Word (.docx)
- [ ] File size validation: max 50MB per file
- [ ] MIME type validation on client side before upload
- [ ] Upload progress bar per file
- [ ] Multiple file upload support (up to 10 files per batch)
- [ ] Error states: wrong file type, file too large, upload failure
- [ ] Upload service client that calls server API with multipart/form-data
- [ ] Server-side multer middleware with `limits.fileSize` set to domain constant
- [ ] Custom error classes: `InvalidFileTypeError`, `FileSizeLimitError`
- [ ] 8-10 API tests for upload endpoint validation, file type rejection, size limit
- [ ] Named exports only, TypeScript strict, design tokens only

## Reference Screens
> Refactor these prototype files for production. Multiple upload screens converge to one reusable component.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/courses/LectureUpload.tsx` | `apps/web/src/components/upload/upload-dropzone.tsx` | Extract dropzone into reusable organism. All upload pages share this component. |
| `.context/source/05-reference/app/app/pages/courses/UploadSyllabus.tsx` | (reference for usage context) | Shows dropzone used for syllabus upload flow. |
| `.context/source/05-reference/app/app/pages/courses/SyllabusEditor.tsx` | (reference for post-upload flow) | Shows what happens after upload completes. |
| `.context/source/05-reference/app/app/pages/courses/WeekMaterialsUpload.tsx` | (reference for usage context) | Shows dropzone used for weekly materials upload. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/content/upload.types.ts` |
| Atoms | packages/ui | `src/atoms/drop-area.tsx`, `src/atoms/file-icon.tsx` |
| Molecules | apps/web | `src/components/upload/upload-progress-item.tsx` |
| Organisms | apps/web | `src/components/upload/upload-dropzone.tsx` |
| Service (client) | apps/web | `src/services/upload.client.ts` |
| Controller | apps/server | `src/controllers/upload/upload.controller.ts` |
| Route | apps/server | `src/routes/upload.routes.ts` |
| Validation | apps/server | `src/middleware/upload.validation.ts` |
| Errors | apps/server | `src/errors/upload.errors.ts` |
| Tests | apps/server | `src/controllers/upload/__tests__/upload.controller.test.ts` |

## Database Schema
No database schema changes. Upload records are created by STORY-F-24 (Content Record Creation).

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/uploads` | Faculty+ | Upload file(s) via multipart/form-data |

## Dependencies
- **Blocks:** STORY-F-18 (Supabase Storage Integration)
- **Blocked by:** STORY-F-1 (content is attached to courses)
- **Cross-lane:** STORY-U-3 (RBAC for upload permission)

## Testing Requirements
### API Tests (8-10)
1. Upload valid PDF returns 201
2. Upload valid PPTX returns 201
3. Upload valid DOCX returns 201
4. Upload unsupported file type (e.g., .exe) returns 415
5. Upload file exceeding 50MB returns 413
6. Upload more than 10 files returns 422
7. Upload with no file returns 400
8. MIME type mismatch (renamed .exe to .pdf) returns 415
9. Multipart parsing via multer with memoryStorage and fileSize limit
10. Upload progress tracking returns incremental updates

## Implementation Notes
- UploadDropzone is an Organism with DropArea (Atom) and UploadProgressItem (Molecule).
- Client-side MIME check is defense-in-depth; server also validates.
- Server uses multer middleware with `limits: { fileSize: MAX_UPLOAD_SIZE }` -- always set to reject oversized payloads at the stream level.
- Dropzone shows file type icons (FileIcon atom) based on extension.
- Use design tokens for dropzone border, hover states, progress bar colors.
- Never use inline `style={{ }}` for static values -- use Tailwind arbitrary values.
- The dropzone is reused across syllabus upload, lecture upload, and materials upload pages.
- See existing `apps/server/src/middleware/upload.validation.ts` for current validation middleware.
