# Plan: STORY-F-15 — Field Mapping UI

## Tasks (from brief, with refinements)

1. **Types** → `packages/types/src/import/mapping.types.ts` — Define `FieldMapping`, `MappingPreset`, `ImportPreview`, `ImportConfirmation`, `ImportJobStatus`, `FileUploadResponse`, `ImportTargetField`, `IMPORT_TARGET_FIELDS`, `REQUIRED_TARGET_FIELDS`, `ImportMappingConfig`, `MappingPresetCreateInput`. Verbatim from brief Section 3.
2. **Types barrel update** → `packages/types/src/import/index.ts` — Add type/value exports for new mapping types. **Watch for PostToolUse hook stripping exports — re-read and verify after edit.**
3. **Rebuild types** → `tsc -b packages/types/tsconfig.json`
4. **Migration** → Supabase MCP: `create_import_presets_table` — `import_presets` table with RLS (user owns their presets). DDL from brief Section 4. **Must run `list_tables` first to verify no table name conflicts.**
5. **Error classes** → `apps/server/src/errors/import-mapping.errors.ts` — `UploadNotFoundError`, `MappingIncompleteError`, `FileTypeForbiddenError`. All extend `JourneyOSError(message, code)`. **Note:** `FileSizeLimitError` already exists in `import.errors.ts` — reuse, don't duplicate.
6. **Levenshtein utility** → `apps/server/src/utils/levenshtein.ts` — `levenshteinDistance()`, `stringSimilarity()`, `FIELD_ALIASES` map. Verbatim from brief Section 6.
7. **ImportUploadService** → `apps/server/src/services/import/import-upload.service.ts` — OOP with `#supabase`, `#parserFactory` via constructor DI. Methods: `upload()` (store to Supabase Storage `import-temp` bucket), `preview()` (download file, parse with `ParserFactory`, auto-map via Levenshtein), `confirm()` (validate all required fields mapped, return summary), `execute()` (placeholder: return mock queued job status for STORY-F-57). **multer limits must be set at middleware level (10MB) per CLAUDE.md rule.**
8. **MappingPresetService** → `apps/server/src/services/import/mapping-preset.service.ts` — OOP with `#supabase`. CRUD: `list()`, `create()`, `delete()`. All queries scoped to `user_id`. Use `.select().single()` on writes per CLAUDE.md rule.
9. **Import multer middleware** → `apps/server/src/middleware/import-upload.validation.ts` — Separate multer instance for import (single file, import-specific MIME types: `text/csv`, `text/plain`, `application/xml`, `text/xml`). Reuse pattern from existing `upload.validation.ts` but with `uploadMiddleware.single("file")`.
10. **ImportUploadController** → `apps/server/src/controllers/import/import-upload.controller.ts` — OOP with `#uploadService`, `#presetService`. Zod validation schemas inline (from brief Section 15). 7 handler methods: `uploadFile`, `preview`, `listPresets`, `createPreset`, `deletePreset`, `confirm`, `execute`. **Narrow `req.params` with `typeof === "string"` before passing to service.**
11. **Route registration** → `apps/server/src/index.ts` — Wire services → controller, register routes with `rbac.require(AuthRole.FACULTY)`. Pattern: inline in `index.ts` (no separate route file — matches existing codebase pattern). **Import multer middleware for the upload endpoint.**
12. **Web API client** → `apps/web/src/lib/api/import.ts` — Module-level `API_URL` + typed `fetch()` wrappers for all 7 endpoints. Cast `res.json()` with `as { data?: T; error?: {...} }` per CLAUDE.md rule.
13. **FileUploadZone** → `apps/web/src/components/import/FileUploadZone.tsx` — Drag-and-drop + click-to-upload molecule. Client-side 10MB check. Calls upload API. Shows progress, filename, detected format on success. Design tokens only.
14. **DataPreview** → `apps/web/src/components/import/DataPreview.tsx` — Calls preview API, shows format badge, shadcn Table with first 5 rows, row count info.
15. **FieldMapper** → `apps/web/src/components/import/FieldMapper.tsx` — Organism. One `MappingRow` per source column with target field `Select`. Pre-populated from `suggested_mappings`. Confidence badges. Required field indicators. Each target field selectable only once. Preset load/save via `PresetSelector` sub-molecule.
16. **ImportSummary** → `apps/web/src/components/import/ImportSummary.tsx` — Confirmation view. Calls confirm API. Shows file info, mapped fields, unmapped columns, warnings, estimated time, "Start Import" button.
17. **ImportWizard** → `apps/web/src/components/import/ImportWizard.tsx` — Organism. 5-step stepper (Upload → Preview → Map → Confirm → Import). State machine per brief Section 6. Step validation gates navigation. Back always enabled (except step 1).
18. **Import page** → `apps/web/src/app/(dashboard)/faculty/import/page.tsx` — `export default` (Next.js exception). Renders `ImportWizard`.
19. **Controller tests** → `apps/server/src/tests/import/import-upload.controller.test.ts` — 12 tests covering upload (201, 413, 400), preview (200, auto-map, 404), presets (list 200, create 201, validation 400), confirm (200, 400 incomplete), execute (202). Use `vi.hoisted()` for mocks. Use `vi.mock()` for Supabase and ParserFactory. Mock factory pattern per `docs/solutions/supabase-mock-factory.md`.

## Implementation Order

Types → Rebuild types → Migration → Error classes → Levenshtein utility → ImportUploadService → MappingPresetService → Import multer middleware → ImportUploadController → Route registration in index.ts → Web API client → FileUploadZone → DataPreview → FieldMapper → ImportSummary → ImportWizard → Import page → Controller tests

## Patterns to Follow

- `docs/solutions/format-parser-factory-pattern.md` — `ParserFactory.parse()` with `columnMapping` option
- `docs/solutions/batch-upload-partial-success-pattern.md` — multer middleware setup, Supabase Storage upload pattern
- `docs/solutions/supabase-mock-factory.md` — Test mocking for Supabase chain queries
- `docs/solutions/react-hook-form-zod-pattern.md` — If preset save dialog uses forms
- Existing `upload.validation.ts` — Multer middleware pattern (memoryStorage + limits + fileFilter)
- OOP: `#private` fields, public getters, constructor DI
- MVC: Controller → Service → Supabase (no repository layer needed — `import_presets` is simple CRUD, and file operations go through Supabase Storage SDK)

## Key Refinements from Brief

1. **No separate route file** — The codebase registers routes inline in `index.ts`, not in separate `*.routes.ts` files. Brief says `apps/server/src/api/import.routes.ts` but that directory doesn't exist. Wire routes directly in `index.ts`.
2. **No composition-root.ts** — Wiring happens inline in `index.ts`.
3. **Reuse existing `FileSizeLimitError`** from `import.errors.ts` — Don't create a duplicate.
4. **Existing `CsvColumnMapping` type** in `parser.types.ts` differs from the new `FieldMapping` type. `FieldMapping` is the UI-layer mapping; `CsvColumnMapping` is what `ParserFactory.parse()` accepts. The service must translate between them at import time (STORY-F-57 concern, but the confirm step validates using `FieldMapping`).
5. **Web API pattern** — No shared API client lib exists. Use module-level `API_URL` + raw `fetch()` per codebase convention. But centralizing import API calls in `lib/api/import.ts` is reasonable to avoid duplication across 5 wizard components.
6. **Supabase Storage bucket `import-temp`** — Must be created manually or via Supabase dashboard before this works. Add to pre-implementation checklist.

## Testing Strategy

- **API tests (12):** Controller-level tests mocking Supabase + ParserFactory. Cover all 7 endpoints including validation errors, auth, and edge cases (expired upload, incomplete mapping, oversized file).
- **E2E:** Not required — import wizard is not one of the 5 critical journeys (per brief Section 11).
- **Manual testing:** Upload CSV → Preview → Auto-map → Save preset → Load preset → Confirm → Execute (verify queued status).

## Figma Make

- [ ] ~~Prototype first~~
- [x] Code directly — no Figma Make prototype; shadcn/ui components + design tokens

## Risks / Edge Cases

1. **Supabase Storage bucket** must exist before upload works. If not created, uploads will 500. Include bucket creation in migration or document as manual prerequisite.
2. **Large file preview** — Parsing entire file just to show 5 rows is wasteful. `ParserFactory.parse()` may not support row limits natively. May need to read only first N lines of CSV (for CSV) or first N items (for QTI/text). Check if `ParserOptions` has a limit option.
3. **Auto-mapping confidence thresholds** — Levenshtein on short strings (e.g., "A" → "answer_choice_a") may produce poor results. The `FIELD_ALIASES` map in the brief handles this, but single-letter column names like "A", "B", "C" won't match well.
4. **File expiry race condition** — User uploads file, leaves for 24h, returns to continue wizard → Storage file is deleted. The preview/confirm/execute endpoints must handle `UploadNotFoundError` gracefully and tell user to re-upload.
5. **Import execute is a placeholder** — Returns mock `queued` status. No actual `import_jobs` table exists yet (deferred to STORY-F-57). The execute endpoint returns a static response with a generated UUID.
6. **multer v2 API differences** — `multer` v2.0.2 is installed. Verify `multer.single("file")` API hasn't changed from v1. The existing codebase uses `multer.array()` successfully, so the API should be stable.
7. **PostToolUse hook** — Will strip "unused" exports from barrel files. Must re-read and verify after every barrel edit.

## Acceptance Criteria (verbatim from brief)

- [ ] Import wizard accessible at `/faculty/import` with 5 steps: Upload, Preview, Map, Confirm, Import
- [ ] Upload step: drag-and-drop file upload with format auto-detection (.csv, .xml, .txt)
- [ ] Upload step: file size limit of 10MB enforced client-side and server-side
- [ ] Upload step: file stored in Supabase Storage temp bucket with 24h TTL
- [ ] Preview step: first 5 rows displayed in a table with column headers
- [ ] Preview step: total row count and detected format shown
- [ ] Map step: dropdown selectors for each source column to target field
- [ ] Map step: auto-mapping via Levenshtein distance with confidence scores
- [ ] Map step: required fields marked (stem, answer_choice_a-d, correct_answer)
- [ ] Map step: validation prevents proceeding with unmapped required fields
- [ ] Map step: mapping presets can be saved and loaded from Supabase
- [ ] Confirm step: summary shows row count, mapped fields, unmapped columns, warnings
- [ ] Import step: queues import job (placeholder for STORY-F-57)
- [ ] Import step: shows progress state (queued/processing/completed/failed)
- [ ] 12 API tests pass covering upload, preview, presets, confirm, execute
- [ ] TypeScript strict, named exports only (except page.tsx default export)
- [ ] Design tokens only, no hardcoded styling values
- [ ] Custom error classes: `UploadNotFoundError`, `MappingIncompleteError`
