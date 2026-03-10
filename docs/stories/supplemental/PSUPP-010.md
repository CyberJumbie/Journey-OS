# PSUPP-010: Weekly Materials Upload (/courses/:courseId/week/:weekId/upload-materials)
**Group:** Course Depth
**Component:** `WeekMaterialsUpload` | `pages/courses/WeekMaterialsUpload.tsx`
**Priority:** P2
**Depends:** PSUPP-006 (WeekView), P3-002 (PptxParser)
**Specialist:** @ingestion-specialist

**As a** faculty member
**I want** to upload supplementary lecture materials for a specific course week
**So that** the AI can extract additional SubConcepts from the lecture rather than just the syllabus

## Acceptance Criteria
- Route: `/courses/:courseId/week/:weekId/upload-materials`
- Accepts: PPTX, PDF, DOCX
- Associates uploaded file with a specific week (stored as `week_number` on uploads row)
- On upload: fires same Inngest 7-stage pipeline as P3-001 but with `week_number` metadata
- New SubConcepts extracted are linked to the course AND tagged with the week number
- Shows processing progress inline (same pattern as `/courses/:courseId/processing`)
- On complete: "View Week" CTA → `/courses/:courseId/week/:weekId`
- `POST /api/v1/courses/:courseId/weeks/:weekId/materials` — multipart

## Files to Create
- `frontend/src/app/(faculty)/courses/[courseId]/week/[weekId]/upload-materials/page.tsx`

## Files to Modify
- `backend/src/inngest/ingest.function.ts` — pass `week_number` metadata through pipeline stages
- `backend/src/database/supabase/schema.ts` — add `week_number INTEGER` to uploads table
