# UF-09: Content Upload & Processing

**Feature:** F-05 (Content Upload & Processing)
**Persona:** Faculty — Dr. Amara Osei
**Goal:** Upload a syllabus or lecture material and watch it process through the parsing, chunking, and embedding pipeline

## Preconditions
- Faculty is logged in, assigned to a course
- Course exists with week structure (F-04)
- Frameworks seeded (F-08) — required for concept tagging during extraction

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/courses/:id` (CourseDashboard) | Click "Upload Syllabus" button or navigate to a week | Navigate to upload screen |
| 2 | `/courses/:id/upload` (UploadSyllabus) | See drag-and-drop zone with accepted formats (PDF, PPTX, DOCX) | Upload zone active |
| 3 | `/courses/:id/upload` | Drag and drop a PDF file (or click to browse) | File validation: type check, size check (max 50MB) |
| 4 | `/courses/:id/upload` | File accepted, click "Upload" | File uploaded to Supabase Storage (`raw-uploads` bucket), `uploads` record created |
| 5 | `/courses/:id/upload/processing` (SyllabusProcessing) | See real-time progress bar with pipeline stages | SSE connection established |
| 6 | `/courses/:id/upload/processing` | Stage 1: Parse — extracting text from document | Progress: 25%, "Parsing document..." |
| 7 | `/courses/:id/upload/processing` | Stage 2: Clean — removing headers, footers, noise | Progress: 50%, "Cleaning text..." |
| 8 | `/courses/:id/upload/processing` | Stage 3: Chunk — splitting into 800-token chunks (100 overlap) | Progress: 75%, "Creating chunks..." |
| 9 | `/courses/:id/upload/processing` | Stage 4: Embed — generating 1024-dim Voyage AI embeddings | Progress: 100%, "Generating embeddings..." |
| 10 | `/courses/:id/upload/processing` | Pipeline complete | Success screen: "Processed [X] chunks from [filename]", link to course dashboard |
| 11 | `/courses/:id` (CourseDashboard) | Return to course dashboard | KPI "Concepts Extracted" updated, content visible in week view |

### Alternative: Week-level upload
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| A1 | `/courses/:id/weeks/:weekNum` (WeekView) | Click "Upload Materials" for a specific week | Navigate to week upload |
| A2 | `/courses/:id/weeks/:weekNum/upload` (WeekMaterialsUpload) | Drag-and-drop multiple files for the week | Files queued for upload |
| A3 | `/courses/:id/weeks/:weekNum/upload` | Click "Upload All" | All files uploaded, Inngest events triggered per file |
| A4 | `/courses/:id/weeks/:weekNum/upload` | See per-file progress indicators | Each file processes independently |

## Error Paths
- **Unsupported file type**: Step 3 — "Unsupported format. Please upload PDF, PPTX, or DOCX files."
- **File too large**: Step 3 — "File exceeds 50MB limit. Please reduce file size."
- **Upload network failure**: Step 4 — "Upload failed. Please try again." with retry button
- **Parse failure (corrupted file)**: Step 6 — "Unable to parse this file. It may be corrupted or password-protected."
- **Embedding service unavailable**: Step 9 — "Embedding service temporarily unavailable. Your file will be processed when service resumes." (Inngest retry)
- **Duplicate file**: Step 4 — "A file with this name was already uploaded. Upload anyway?" (WORM allows duplicates with different IDs)

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| POST | `/api/v1/courses/:id/upload` | Step 4 — upload file (multipart/form-data) |
| GET | `/api/v1/uploads/:id/status` | Steps 5-10 — SSE stream for pipeline progress |
| GET | `/api/v1/courses/:id` | Step 11 — refresh course dashboard KPIs |

## Test Scenario (Playwright outline)
Login as: Faculty
Steps:
1. Navigate to course dashboard
2. Click "Upload Syllabus"
3. Upload test PDF (small, ~2 pages)
4. Watch processing pipeline complete
5. Verify return to dashboard with updated KPIs
Assertions:
- `uploads` record created with `status: completed`
- `content_chunks` records created (count > 0)
- `content_chunk_embeddings` records exist for each chunk
- File exists in Supabase Storage `raw-uploads` bucket

## Source References
- ARCHITECTURE_v10.md § 2.1 (embedding pipeline stages)
- ARCHITECTURE_v10.md § 2 (Skinny Node Principle)
- WORKBENCH_SPEC_v2.md § 14 (Inngest events)
- ROADMAP_v2_3.md § Sprint 4 (upload pipeline)
- SUPABASE_DDL_v1.md § uploads, content_chunks tables
- PRODUCT_BRIEF.md § Dr. Amara Osei ("upload syllabus and see extracted concepts")
