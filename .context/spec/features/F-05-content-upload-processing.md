# F-05: Content Upload & Processing

## Description
Faculty upload syllabi, lectures, and course materials (PDF, PPTX, DOCX) which are processed through an Inngest-powered pipeline: parse → clean → chunk (800 tokens, 100-token overlap) → embed (Voyage AI voyage-large-2, 1024-dim). Original files are preserved in a WORM (Write Once Read Many) store. This pipeline feeds concept extraction (F-06) and provides the content base for question generation (F-09).

## Personas
- **Faculty**: Uploads syllabi and lectures for own courses.
- **Faculty (Course Director)**: Uploads for any section within managed course.
- **Institutional Admin**: Can upload on behalf of any course.

## Screens
- `UploadSyllabus.tsx` — Template A, drag-and-drop zone, file type validation
- `SyllabusProcessing.tsx` — Template A, real-time progress bar (parse → chunk → embed stages)
- `WeekMaterialsUpload.tsx` — Template A, bulk material upload per week
- `LectureUpload.tsx` — Template A, individual lecture upload with metadata
- `LectureProcessing.tsx` — Template A, processing pipeline progress

## Data Domains
- **Supabase Storage**: `raw-uploads` bucket (WORM — immutable originals)
- **Supabase**: `uploads` (id, institution_id, course_id, user_id, filename, mime_type, storage_path, status, created_at), `content_chunks` (id, upload_id, text, metadata JSONB, graph_node_id, sync_status)
- **pgvector**: `content_chunk_embeddings` (chunk_id FK, embedding vector(1024), model_version)
- **Neo4j**: `(:ContentChunk)` skinny nodes with `[:EXTRACTED_FROM]->(:Lecture|:Syllabus)`
- **Inngest**: `journey/content.uploaded` event → fan-out pipeline (Stage 1–4)
- **API**: `POST /api/v1/courses/:id/upload`, `GET /api/v1/uploads/:id/status`

## Dependencies
- **F-04**: Course Management (upload targets a course)
- **F-08**: Framework Management (frameworks must be seeded before concept extraction can tag)

## Source References
- ARCHITECTURE_v10.md § 2.1 (embedding pipeline: Upload → Parse → Chunk → Embed)
- ARCHITECTURE_v10.md § 2 (Skinny Node Principle — ContentChunk dual storage)
- ROADMAP_v2_3.md § Sprint 4 (upload pipeline deliverables)
- WORKBENCH_SPEC_v2.md § 14 (Inngest events: journey/content.uploaded)
- SUPABASE_DDL_v1.md § uploads, content_chunks, content_chunk_embeddings tables
- NODE_REGISTRY_v1.md § ContentChunk, Lecture, Syllabus nodes
- PRODUCT_BRIEF.md § Dr. Amara Osei ("Faculty can upload syllabus and see extracted concepts")
