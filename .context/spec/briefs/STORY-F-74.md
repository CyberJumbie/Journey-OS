# STORY-F-74: Exam Export

**Epic:** E-27 (Exam Assignment & Export)
**Feature:** F-12
**Sprint:** 30
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-27-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need to export an exam in platform-compatible formats so that I can deliver it through external assessment systems (e.g., ExamSoft, Canvas).

## Acceptance Criteria
- [ ] Export formats: QTI 2.1 (IMS standard), CSV, JSON
- [ ] QTI export includes item metadata, correct answers, distractors, and rationale
- [ ] CSV export with columns: question, option A-E, correct answer, system, discipline, Bloom level
- [ ] JSON export matches internal data model for re-import
- [ ] Export includes exam metadata: title, time limit, passing score, blueprint reference
- [ ] Download as ZIP file containing all items and a metadata manifest
- [ ] Export audit log entry (who exported, when, format) via `audit_log` table
- [ ] Only exams in `'ready'`, `'active'`, or `'closed'` status can be exported
- [ ] Progress indicator for large exam exports (>100 items)
- [ ] Custom error class: `ExamExportError`
- [ ] 8-12 API tests: each format output, status validation, audit log creation, ZIP structure

## Reference Screens
No dedicated screen. Export triggered as a download action from the exam detail page.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | `apps/web/src/components/exam/export-dialog.tsx` | Modal dialog with format radio buttons (QTI, CSV, JSON) and download button; shadcn/ui `Dialog`, `RadioGroup`, `Button`; progress bar for large exports |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/exam/export.types.ts` |
| Service | apps/server | `src/services/exam/exam-export.service.ts` |
| Exporters | apps/server | `src/services/exam/exporters/qti-exporter.ts`, `src/services/exam/exporters/csv-exporter.ts`, `src/services/exam/exporters/json-exporter.ts` |
| Controller | apps/server | `src/controllers/exam/exam-export.controller.ts` |
| Routes | apps/server | `src/routes/exam/exam-export.routes.ts` |
| Errors | apps/server | `src/errors/exam-export.errors.ts` |
| View | apps/web | `src/components/exam/export-dialog.tsx` |
| Tests | apps/server | `src/services/exam/__tests__/exam-export.service.test.ts`, `src/services/exam/__tests__/qti-exporter.test.ts` |

## Database Schema
No new tables. Reads from:
- `exams` -- exam metadata (title, time_limit_minutes, status, blueprint_id)
- `exam_items` -- item sequence (position, points)
- `assessment_items` -- question content (stem, vignette, lead_in, options, explanation, difficulty, bloom_level, tags)
- `blueprints` -- blueprint reference metadata

Export files stored in Supabase Storage `exports` bucket with signed URL (24h TTL).

Audit log entry via existing `audit_log` table:
```json
{
  "action": "exam_exported",
  "entity_type": "exam",
  "entity_id": "<exam_id>",
  "metadata": { "format": "qti", "item_count": 50 }
}
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/exams/:id/export` | Export exam (query: `?format=qti\|csv\|json`) |
| GET | `/api/exams/:id/export/status` | Check export status for async large exports |

## Dependencies
- **Blocks:** none
- **Blocked by:** STORY-F-73 (exam must be assigned/ready to export)
- **Cross-lane:** none

## Testing Requirements
- 8-12 API tests: QTI 2.1 XML structure validity, CSV column mapping, JSON matches internal schema, exam in `draft` status returns 409, export creates audit log entry, ZIP contains metadata manifest + items file, signed URL generation, large export (100+ items) returns async job ID, empty exam returns error, export includes all item fields
- 0 E2E tests

## Implementation Notes
- Strategy pattern mirrors the item bank export (STORY-F-67): `IExamExporter` interface with `QtiExporter`, `CsvExporter`, `JsonExporter`.
- QTI 2.1 is the IMS Global standard for assessment interoperability. Use `xmlbuilder2` for XML construction.
- ZIP generation uses `archiver` npm package. ZIP structure:
  ```
  exam-export.zip
  ├── manifest.json       (exam metadata, blueprint ref, item count)
  ├── items.qti.xml       (or items.csv / items.json)
  └── answer-key.csv      (item_id, correct_answer, points)
  ```
- Export file stored in Supabase Storage `exports` bucket. Generate signed URL with `createSignedUrl()`.
- Status validation: only `'ready'`, `'active'`, or `'closed'` exams can be exported. Draft/building exams return 409 Conflict.
- For large exports (>100 items): streaming response or async generation. Use SSE for progress updates.
- Audit log: insert into `audit_log` on successful export.
- Constructor DI with `#private` fields for storage client, exporter registry.
