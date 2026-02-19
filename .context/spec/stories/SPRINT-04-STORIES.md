# Sprint 4 — Stories

**Stories:** 14
**Epics:** E-08, E-09, E-10, E-11

## Execution Order (by lane priority)

| # | Story | Title | Lane | Size |
|---|-------|-------|------|------|
| 1 | S-IA-09-1 | SLO-to-ILO Linking | institutional_admin | M |
| 2 | S-IA-09-2 | Weekly Schedule View | institutional_admin | M |
| 3 | S-IA-09-3 | Course Oversight Dashboard | institutional_admin | M |
| 4 | S-F-08-1 | Course Model & Repository | faculty | M |
| 5 | S-F-08-2 | Course Hierarchy | faculty | M |
| 6 | S-F-08-3 | Course Creation Wizard | faculty | L |
| 7 | S-F-08-4 | Course List & Detail Views | faculty | M |
| 8 | S-F-10-1 | Upload Dropzone Component | faculty | M |
| 9 | S-F-10-2 | Supabase Storage Integration | faculty | M |
| 10 | S-F-10-3 | Content Record Creation | faculty | S |
| 11 | S-F-11-1 | Inngest Content Pipeline | faculty | L |
| 12 | S-F-11-2 | Voyage AI Embedding Integration | faculty | M |
| 13 | S-F-11-3 | Processing Progress UI | faculty | M |
| 14 | S-F-11-4 | Dual-Write Chunks | faculty | M |

## Sprint Goals
- Build course CRUD with hierarchy support and a creation wizard for faculty
- Enable content upload to Supabase Storage with an async Inngest processing pipeline that chunks, embeds (Voyage AI), and dual-writes
- Provide institutional admins with SLO-to-ILO linking and course oversight capabilities

## Entry Criteria
- Sprint 3 exit criteria complete (auth, RBAC, user management operational)
- Supabase Storage buckets configured; Inngest dev server running

## Exit Criteria
- Faculty can create courses, upload content, and track processing status
- Content pipeline produces 1024-dim embeddings and dual-writes chunks to Supabase and Neo4j
- Institutional admins can link SLOs to ILOs and view course oversight dashboard
