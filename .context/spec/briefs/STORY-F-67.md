# STORY-F-67: Export Service

**Epic:** E-25 (Item Bank Browser & Export)
**Feature:** F-11
**Sprint:** 18
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-25-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need to export selected questions in ExamSoft, QTI, and CSV formats so that I can import them into our institution's exam delivery platform.

## Acceptance Criteria
- [ ] Export accepts array of question IDs or current filter criteria
- [ ] ExamSoft format: tab-delimited file with specific column structure and encoding
- [ ] QTI 2.1 export: IMS standard XML format for LMS compatibility
- [ ] CSV export: flat format with all metadata fields (stem, vignette, options, correct answer, rationale, tags, difficulty, Bloom level)
- [ ] Export includes: stem, vignette, answer choices, correct answer, rationale, tags, difficulty, Bloom level
- [ ] Batch export: handles up to 500 items per export
- [ ] Download as file: generates file in Supabase Storage temp bucket with 24h TTL, returns download URL
- [ ] Large export (>100 items): async job with completion notification
- [ ] Custom error classes: `ExportError`, `ExportFormatError`
- [ ] 8-12 API tests: each format output, field mapping correctness, batch size limit, large export async path, download URL generation

## Reference Screens
No dedicated UI screen. Export triggered from Item Bank Browser (STORY-F-64) bulk actions.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | Export button lives in `item-bank-table.tsx` bulk action bar |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/item-bank/export.types.ts` |
| Service | apps/server | `src/services/item-bank/export.service.ts` |
| Formatters | apps/server | `src/services/item-bank/formatters/examsoft-formatter.ts`, `src/services/item-bank/formatters/qti-formatter.ts`, `src/services/item-bank/formatters/csv-formatter.ts` |
| Controller | apps/server | `src/controllers/item-bank/export.controller.ts` |
| Errors | apps/server | `src/errors/export.errors.ts` |
| Tests | apps/server | `src/services/item-bank/__tests__/export.service.test.ts`, `src/services/item-bank/__tests__/formatters.test.ts` |

## Database Schema
No new tables. Reads from existing `assessment_items`. Export files stored in Supabase Storage `exports` bucket with 24h TTL policy.

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/item-bank/export` | Initiate export (body: `{ questionIds, format, filterCriteria }`) |
| GET | `/api/item-bank/export/:exportId/status` | Check async export status |
| GET | `/api/item-bank/export/:exportId/download` | Download export file (redirect to signed URL) |

## Dependencies
- **Blocks:** none
- **Blocked by:** STORY-F-64 (item bank browser exists for item selection)
- **Cross-lane:** none

## Testing Requirements
- 8-12 API tests: ExamSoft format column structure, QTI 2.1 XML validity, CSV field mapping, batch of 500 items, export with filter criteria (no IDs), async job creation for >100 items, download URL generation, empty selection error, invalid format error, file stored in Storage bucket
- 0 E2E tests

## Implementation Notes
- Strategy pattern: `IExportFormatter` interface with concrete implementations (`ExamSoftFormatter`, `QtiFormatter`, `CsvFormatter`). Each implements `format(items: AssessmentItem[]): Buffer`.
- ExamSoft specifics: tab-delimited, UTF-8 BOM, specific column order (Question Text, Option A-E, Correct Answer, Explanation, Category, Subcategory).
- QTI 2.1: use an XML builder library (e.g., `xmlbuilder2`). Validate output against QTI 2.1 schema.
- Export file stored in Supabase Storage `exports` bucket. Generate signed download URL with 24h expiry.
- For large exports (>100 items): create an async job. Store job status in a `export_jobs` ephemeral record or use the existing `audit_log` to track. Send notification via existing notification service on completion.
- Constructor DI pattern with `#private` fields for Storage client, formatter registry.
- Multer not needed -- this is server-generated output, not upload.
