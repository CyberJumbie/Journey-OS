# STORY-F-69: Retired Exam Import

**Epic:** E-27 (Exam Assignment & Export)
**Feature:** F-12
**Sprint:** 30
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-27-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need to upload historical/retired exams with response data so that the IRT calibration engine has sufficient data for item parameter estimation in the student lane.

## Acceptance Criteria
- [ ] Upload page for retired exam files (CSV, QTI, JSON formats)
- [ ] File validation: check format, required columns/fields, data types before processing
- [ ] Preview of parsed items before import confirmation (table with extracted stems + auto-tags)
- [ ] Import maps items to existing USMLE systems and disciplines via tag matching
- [ ] Response data import: anonymized student responses (item_id, response, correct, response_time_ms) for IRT calibration
- [ ] Items tagged with status `'retired'` (not available for new exams but visible in item bank)
- [ ] Import summary: items imported, items skipped (duplicates via similarity check), errors
- [ ] Bulk import: support up to 1000 items per file
- [ ] Rollback capability: delete entire import batch on error (transactional via RPC)
- [ ] File size limit: 50MB enforced at multer level (`limits.fileSize`)
- [ ] Custom error class: `ImportError`, `ImportFormatError`
- [ ] 10-14 API tests: each format parsing, validation failures, duplicate detection, response data import, rollback, file size limit

## Reference Screens
> Refactor the prototype for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/exams/RetiredExamUpload.tsx` | `apps/web/src/app/(protected)/exams/import/page.tsx` | Replace `DashboardLayout` with App Router `(protected)/layout.tsx`; extract upload dropzone into `FileUploadZone` atom; extract review table into `ImportPreviewTable` organism; replace hardcoded `Badge` classes with design token variants; convert radio buttons to shadcn/ui `RadioGroup`; use `@web/*` path alias; add progress indicator for processing stage |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/exam/import.types.ts` |
| Service | apps/server | `src/services/exam/retired-exam-import.service.ts` |
| Importers | apps/server | `src/services/exam/importers/csv-importer.ts`, `src/services/exam/importers/qti-importer.ts`, `src/services/exam/importers/json-importer.ts` |
| Controller | apps/server | `src/controllers/exam/retired-exam-import.controller.ts` |
| Routes | apps/server | `src/routes/exam/retired-exam-import.routes.ts` |
| Errors | apps/server | `src/errors/import.errors.ts` |
| View | apps/web | `src/app/(protected)/exams/import/page.tsx` |
| Components | apps/web | `src/components/exam/file-upload-zone.tsx`, `src/components/exam/import-preview-table.tsx`, `src/components/exam/import-summary.tsx` |
| Tests | apps/server | `src/services/exam/__tests__/retired-exam-import.service.test.ts`, `src/services/exam/__tests__/csv-importer.test.ts` |

## Database Schema
Uses existing `assessment_items` table with status = `'retired'`. New table for response data:

```sql
-- retired_exam_responses: anonymized student responses for IRT calibration
CREATE TABLE retired_exam_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES assessment_items(id),
  import_batch_id uuid NOT NULL,
  response text NOT NULL,
  correct boolean NOT NULL,
  response_time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_retired_responses_question ON retired_exam_responses(question_id);
CREATE INDEX idx_retired_responses_batch ON retired_exam_responses(import_batch_id);

-- import_batches: track import operations for rollback
CREATE TABLE import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  source_name text NOT NULL,
  source_format text NOT NULL CHECK (source_format IN ('csv', 'qti', 'json')),
  exam_type text,
  usage_rights text,
  total_items integer NOT NULL DEFAULT 0,
  imported_items integer NOT NULL DEFAULT 0,
  skipped_items integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed', 'rolled_back')),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Note: `assessment_items.status` already includes `'retired'` in its CHECK constraint.

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/exams/import/retired` | Upload and parse retired exam file (multipart) |
| GET | `/api/exams/import/:batchId/preview` | Get parsed preview before confirmation |
| POST | `/api/exams/import/:batchId/confirm` | Confirm import (insert items) |
| DELETE | `/api/exams/import/:batchId` | Rollback entire import batch |
| GET | `/api/exams/import/:batchId/summary` | Get import summary |

## Dependencies
- **Blocks:** none (but feeds IRT calibration in student lane: S-ST-40-2)
- **Blocked by:** STORY-F-65 (blueprint/item model exists)
- **Cross-lane:** Student lane IRT calibration (S-ST-40-2) depends on this for historical response data

## Testing Requirements
- 10-14 API tests: CSV parsing with valid file, QTI XML parsing, JSON format parsing, missing required columns (expect `ImportFormatError`), duplicate item detection via similarity, response data row validation, batch import of 100+ items, rollback deletes all items in batch, file size >50MB rejected, import summary accuracy, preview returns parsed items without persisting, confirm transitions batch status to `completed`
- 0 E2E tests

## Implementation Notes
- Strategy pattern mirrors the export service: `IExamImporter` interface with `CsvImporter`, `QtiImporter`, `JsonImporter` implementations. Each implements `parse(buffer: Buffer): ParsedItem[]`.
- Multer config: `memoryStorage()` with `limits: { fileSize: 50 * 1024 * 1024 }` (50MB). ALWAYS set fileSize limit on multer (CLAUDE.md rule).
- Anonymized response data format: `item_id, response (A-E), correct (bool), response_time_ms`.
- Bulk import uses transactional RPC function for atomicity. Use `supabase.rpc('import_retired_exam', { ... })` pattern. See `docs/solutions/supabase-transactional-rpc-pattern.md`.
- Retired items have status `'retired'` and are read-only after import (no edits allowed).
- Duplicate detection: compute embedding of imported stem, check pgvector similarity against existing items. Flag items with similarity > 0.85 as potential duplicates in preview.
- Existing `import_presets` table can store column mapping presets per user for repeat imports.
