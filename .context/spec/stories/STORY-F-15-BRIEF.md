# STORY-F-15 Brief: Field Mapping UI

> **This brief is fully self-contained.** Implement with ZERO external lookups.

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-15
old_id: S-F-24-2
epic: E-24 (Legacy Import Pipeline)
feature: F-11 (Item Bank & Repository)
sprint: 17
lane: faculty
lane_priority: 3
within_lane_order: 15
size: M
depends_on:
  - STORY-F-3 (faculty) — Import Parser ✅ DONE
blocks:
  - STORY-F-57 (faculty) — Import Pipeline
personas_served: [faculty, faculty_course_director]
```

---

## Section 1: Summary

Faculty members need a multi-step wizard to upload legacy question bank files, preview parsed data, map source columns to Journey OS fields, and confirm before importing. This story delivers the **Field Mapping UI** -- a 5-step wizard (Upload -> Preview -> Map -> Confirm -> Import) with drag-and-drop file upload, format auto-detection (using parsers from STORY-F-3), a preview table showing the first 5 rows, dropdown selectors for source-to-target field mapping with Levenshtein-based auto-mapping, mapping presets (save/load), and an import confirmation summary.

The backend adds endpoints for file upload to Supabase Storage (temp bucket with 24h TTL), preview generation (parse first 5 rows), mapping preset CRUD, and import initiation. The actual import pipeline execution is deferred to STORY-F-57; this story's import step queues the job and shows a "processing" state.

**User Story:** As a Faculty member, I need a field mapping interface to assign columns from my legacy file to Journey OS fields so that the import correctly interprets my data format.

Key constraints:
- File upload to Supabase Storage temp bucket (24h TTL auto-cleanup)
- Format auto-detection via `ParserFactory` from STORY-F-3
- Auto-mapping heuristic uses Levenshtein distance on column headers
- Mapping presets stored per-user in `import_presets` Supabase table
- Import confirmation shows row count and mapped field summary
- Actual import execution is a placeholder (queues job for STORY-F-57)

---

## Section 2: Task Breakdown

Implementation order: Types -> Migration -> Errors -> Service -> Controller -> Views -> Tests.

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define mapping types: `FieldMapping`, `MappingPreset`, `ImportPreview`, `ImportConfirmation` | `packages/types/src/import/mapping.types.ts` | 30m |
| 2 | Update barrel export for import types | `packages/types/src/import/index.ts` | 5m |
| 3 | Create `import_presets` table migration | Supabase MCP | 15m |
| 4 | Create custom error classes | `apps/server/src/errors/import-mapping.errors.ts` | 15m |
| 5 | Implement `ImportUploadService` (file upload, preview, auto-map) | `apps/server/src/services/import/import-upload.service.ts` | 90m |
| 6 | Implement `MappingPresetService` (preset CRUD) | `apps/server/src/services/import/mapping-preset.service.ts` | 45m |
| 7 | Implement `ImportUploadController` (endpoints) | `apps/server/src/controllers/import/import-upload.controller.ts` | 60m |
| 8 | Register import routes | `apps/server/src/api/import.routes.ts` | 15m |
| 9 | Build `FileUploadZone` molecule (drag-and-drop + click to upload) | `apps/web/src/components/import/FileUploadZone.tsx` | 45m |
| 10 | Build `DataPreview` molecule (table showing first 5 rows) | `apps/web/src/components/import/DataPreview.tsx` | 30m |
| 11 | Build `FieldMapper` organism (dropdown selectors for mapping) | `apps/web/src/components/import/FieldMapper.tsx` | 60m |
| 12 | Build `ImportSummary` molecule (confirmation view) | `apps/web/src/components/import/ImportSummary.tsx` | 20m |
| 13 | Build `ImportWizard` organism (stepper + step orchestration) | `apps/web/src/components/import/ImportWizard.tsx` | 45m |
| 14 | Create import page | `apps/web/src/app/(dashboard)/faculty/import/page.tsx` | 20m |
| 15 | Implement Levenshtein auto-mapping utility | `apps/server/src/utils/levenshtein.ts` | 20m |
| 16 | Write controller tests (10 tests) | `apps/server/src/tests/import/import-upload.controller.test.ts` | 60m |
| 17 | Wire up routes in API index | `apps/server/src/api/index.ts` | 10m |

**Total estimate:** ~9.5 hours (Size M)

---

## Section 3: Data Model (inline, complete)

### `packages/types/src/import/mapping.types.ts`

```typescript
/**
 * Types for field mapping UI and import wizard.
 * Extends the parser types from STORY-F-3.
 */

/** Target fields that source columns can be mapped to */
export const IMPORT_TARGET_FIELDS = [
  'stem',
  'vignette',
  'answer_choice_a',
  'answer_choice_b',
  'answer_choice_c',
  'answer_choice_d',
  'answer_choice_e',
  'correct_answer',
  'rationale',
  'difficulty',
  'tags',
  'course',
  'bloom_level',
  'topic',
] as const;

export type ImportTargetField = typeof IMPORT_TARGET_FIELDS[number];

/** Required target fields that must be mapped for import to proceed */
export const REQUIRED_TARGET_FIELDS: readonly ImportTargetField[] = [
  'stem',
  'answer_choice_a',
  'answer_choice_b',
  'answer_choice_c',
  'answer_choice_d',
  'correct_answer',
] as const;

/** A single column-to-field mapping */
export interface FieldMapping {
  /** Column name/index from the source file */
  readonly source_column: string;
  /** Target field in Journey OS schema */
  readonly target_field: ImportTargetField;
  /** Confidence score from auto-mapping (0.0-1.0), null if manually set */
  readonly confidence: number | null;
}

/** Complete mapping configuration for an import */
export interface ImportMappingConfig {
  /** All field mappings */
  readonly mappings: readonly FieldMapping[];
  /** Source columns that are not mapped (go to rawMetadata) */
  readonly unmapped_columns: readonly string[];
  /** Whether all required fields are mapped */
  readonly is_complete: boolean;
  /** Validation errors for incomplete mappings */
  readonly validation_errors: readonly string[];
}

/** Saved mapping preset for reuse */
export interface MappingPreset {
  readonly id: string;
  readonly user_id: string;
  readonly name: string;
  readonly description: string;
  readonly mappings: readonly FieldMapping[];
  readonly source_format: 'csv' | 'qti' | 'text';
  readonly created_at: string;
  readonly updated_at: string;
}

/** Input for creating a mapping preset */
export interface MappingPresetCreateInput {
  readonly name: string;
  readonly description?: string;
  readonly mappings: readonly FieldMapping[];
  readonly source_format: 'csv' | 'qti' | 'text';
}

/** Preview of parsed file data (first N rows) */
export interface ImportPreview {
  /** Detected file format */
  readonly format: 'csv' | 'qti' | 'text';
  /** Column headers from the source file */
  readonly columns: readonly string[];
  /** First N rows of data as arrays of strings */
  readonly preview_rows: readonly (readonly string[])[];
  /** Total row count in the file */
  readonly total_rows: number;
  /** Auto-suggested field mappings based on column headers */
  readonly suggested_mappings: readonly FieldMapping[];
  /** File metadata */
  readonly file_info: {
    readonly filename: string;
    readonly size_bytes: number;
    readonly upload_id: string;
  };
}

/** Import confirmation summary before execution */
export interface ImportConfirmation {
  readonly upload_id: string;
  readonly filename: string;
  readonly format: 'csv' | 'qti' | 'text';
  readonly total_rows: number;
  readonly mapped_fields: readonly FieldMapping[];
  readonly unmapped_columns: readonly string[];
  readonly validation_warnings: readonly string[];
  readonly estimated_duration_seconds: number;
}

/** Import job status (placeholder for STORY-F-57) */
export interface ImportJobStatus {
  readonly job_id: string;
  readonly status: 'queued' | 'processing' | 'completed' | 'failed';
  readonly progress_percent: number;
  readonly rows_processed: number;
  readonly rows_total: number;
  readonly errors: readonly string[];
  readonly created_at: string;
}

/** File upload response */
export interface FileUploadResponse {
  readonly upload_id: string;
  readonly filename: string;
  readonly size_bytes: number;
  readonly storage_path: string;
}
```

### Updated barrel export

```typescript
// packages/types/src/import/index.ts (UPDATE -- add mapping exports)

export type {
  ParsedQuestion,
  ParsedQuestionOption,
} from './parsed-question.types';

export type {
  ImportFormat,
  ParseErrorDetail,
  ParserOptions,
  CsvColumnMapping,
  ParseResult,
  IParser,
} from './parser.types';

export type {
  ImportTargetField,
  FieldMapping,
  ImportMappingConfig,
  MappingPreset,
  MappingPresetCreateInput,
  ImportPreview,
  ImportConfirmation,
  ImportJobStatus,
  FileUploadResponse,
} from './mapping.types';

export {
  IMPORT_TARGET_FIELDS,
  REQUIRED_TARGET_FIELDS,
} from './mapping.types';
```

---

## Section 4: Database Schema

### New table: `import_presets`

```sql
-- Migration: create_import_presets_table

CREATE TABLE IF NOT EXISTS import_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    mappings JSONB NOT NULL DEFAULT '[]',
    source_format TEXT NOT NULL CHECK (source_format IN ('csv', 'qti', 'text')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_import_presets_user ON import_presets(user_id);

-- RLS: Users can only see and manage their own presets
ALTER TABLE import_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own presets" ON import_presets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users create own presets" ON import_presets
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own presets" ON import_presets
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users delete own presets" ON import_presets
    FOR DELETE USING (user_id = auth.uid());
```

### Supabase Storage bucket (manual setup)

```
Bucket: import-temp
Public: false
File size limit: 10MB
Allowed MIME types: text/csv, text/plain, application/xml, text/xml
Auto-delete policy: 24 hours TTL (configured via Supabase Storage lifecycle rules)
```

---

## Section 5: API Contract

Base URL: `/api/v1`
Auth: Bearer JWT (Supabase Auth) in `Authorization` header
All responses: `{ data, error, meta }` envelope

### 5.1 POST /api/v1/import/upload

**Auth:** faculty (AuthRole.FACULTY)
**Description:** Upload a legacy file to temp storage. Returns upload ID and detected format.

**Request:** `multipart/form-data`
```
file: <binary file data> (max 10MB)
```

**Response (201):**
```json
{
  "data": {
    "upload_id": "upload-uuid-here",
    "filename": "exam_questions.csv",
    "size_bytes": 45320,
    "storage_path": "import-temp/user-uuid/upload-uuid/exam_questions.csv"
  },
  "error": null
}
```

**Error Responses:**
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | No file attached, invalid MIME type |
| 413 | `FILE_SIZE_LIMIT` | File exceeds 10MB |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role not authorized |

### 5.2 POST /api/v1/import/preview

**Auth:** faculty
**Description:** Parse the uploaded file and return a preview with auto-mapped fields.

**Request:**
```json
{
  "upload_id": "upload-uuid-here",
  "preview_rows": 5
}
```

**Response (200):**
```json
{
  "data": {
    "format": "csv",
    "columns": ["Question Text", "Choice A", "Choice B", "Choice C", "Choice D", "Answer", "Topic"],
    "preview_rows": [
      ["A 45-year-old patient...", "Acute MI", "PE", "Pneumothorax", "Costochondritis", "A", "Cardiovascular"],
      ["Which enzyme...", "AST", "ALT", "Troponin I", "LDH", "C", "Cardiovascular"]
    ],
    "total_rows": 150,
    "suggested_mappings": [
      { "source_column": "Question Text", "target_field": "stem", "confidence": 0.85 },
      { "source_column": "Choice A", "target_field": "answer_choice_a", "confidence": 0.92 },
      { "source_column": "Choice B", "target_field": "answer_choice_b", "confidence": 0.92 },
      { "source_column": "Choice C", "target_field": "answer_choice_c", "confidence": 0.92 },
      { "source_column": "Choice D", "target_field": "answer_choice_d", "confidence": 0.92 },
      { "source_column": "Answer", "target_field": "correct_answer", "confidence": 0.88 },
      { "source_column": "Topic", "target_field": "topic", "confidence": 0.95 }
    ],
    "file_info": {
      "filename": "exam_questions.csv",
      "size_bytes": 45320,
      "upload_id": "upload-uuid-here"
    }
  },
  "error": null
}
```

**Error Responses:**
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Missing upload_id |
| 404 | `UPLOAD_NOT_FOUND` | Upload ID not found or expired |
| 422 | `PARSE_ERROR` | File could not be parsed |

### 5.3 GET /api/v1/import/presets

**Auth:** faculty
**Description:** List the user's saved mapping presets.

**Response (200):**
```json
{
  "data": [
    {
      "id": "preset-uuid",
      "user_id": "user-uuid",
      "name": "ExamSoft CSV Format",
      "description": "Column mapping for ExamSoft CSV exports",
      "mappings": [
        { "source_column": "Item Stem", "target_field": "stem", "confidence": null },
        { "source_column": "Option A", "target_field": "answer_choice_a", "confidence": null }
      ],
      "source_format": "csv",
      "created_at": "2026-02-01T10:00:00Z",
      "updated_at": "2026-02-01T10:00:00Z"
    }
  ],
  "error": null
}
```

### 5.4 POST /api/v1/import/presets

**Auth:** faculty
**Description:** Save a new mapping preset.

**Request:**
```json
{
  "name": "ExamSoft CSV Format",
  "description": "Column mapping for ExamSoft CSV exports",
  "mappings": [
    { "source_column": "Item Stem", "target_field": "stem", "confidence": null },
    { "source_column": "Option A", "target_field": "answer_choice_a", "confidence": null }
  ],
  "source_format": "csv"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "preset-uuid",
    "user_id": "user-uuid",
    "name": "ExamSoft CSV Format",
    "description": "Column mapping for ExamSoft CSV exports",
    "mappings": [...],
    "source_format": "csv",
    "created_at": "2026-02-15T12:00:00Z",
    "updated_at": "2026-02-15T12:00:00Z"
  },
  "error": null
}
```

### 5.5 DELETE /api/v1/import/presets/:id

**Auth:** faculty (owner only)
**Response (204):** No content

### 5.6 POST /api/v1/import/confirm

**Auth:** faculty
**Description:** Validate the mapping config and return an import confirmation summary.

**Request:**
```json
{
  "upload_id": "upload-uuid",
  "mappings": [
    { "source_column": "Question Text", "target_field": "stem", "confidence": null },
    { "source_column": "Choice A", "target_field": "answer_choice_a", "confidence": null },
    { "source_column": "Choice B", "target_field": "answer_choice_b", "confidence": null },
    { "source_column": "Choice C", "target_field": "answer_choice_c", "confidence": null },
    { "source_column": "Choice D", "target_field": "answer_choice_d", "confidence": null },
    { "source_column": "Answer", "target_field": "correct_answer", "confidence": null }
  ]
}
```

**Response (200):**
```json
{
  "data": {
    "upload_id": "upload-uuid",
    "filename": "exam_questions.csv",
    "format": "csv",
    "total_rows": 150,
    "mapped_fields": [...],
    "unmapped_columns": ["Topic"],
    "validation_warnings": ["Optional field 'rationale' is not mapped"],
    "estimated_duration_seconds": 12
  },
  "error": null
}
```

**Error Responses:**
| Status | Code | When |
|--------|------|------|
| 400 | `MAPPING_INCOMPLETE` | Required target fields not mapped |
| 404 | `UPLOAD_NOT_FOUND` | Upload expired or not found |

### 5.7 POST /api/v1/import/execute

**Auth:** faculty
**Description:** Start the import job (placeholder -- queues for STORY-F-57).

**Request:**
```json
{
  "upload_id": "upload-uuid",
  "mappings": [...],
  "course_id": "course-uuid"
}
```

**Response (202):**
```json
{
  "data": {
    "job_id": "job-uuid",
    "status": "queued",
    "progress_percent": 0,
    "rows_processed": 0,
    "rows_total": 150,
    "errors": [],
    "created_at": "2026-02-15T12:05:00Z"
  },
  "error": null
}
```

---

## Section 6: Frontend Spec

### Page: `/faculty/import`

**Route:** `apps/web/src/app/(dashboard)/faculty/import/page.tsx`

**Component hierarchy (Atomic Design):**
```
ImportPage (page.tsx -- default export)
  └── ImportWizard (Organism)
        ├── WizardStepper (Molecule -- shadcn/ui Steps)
        │     ├── Step 1: Upload
        │     ├── Step 2: Preview
        │     ├── Step 3: Map Fields
        │     ├── Step 4: Confirm
        │     └── Step 5: Import
        │
        ├── Step 1: FileUploadZone (Molecule)
        │     ├── DragDropArea (Atom -- dashed border, icon)
        │     ├── FileTypeHint (Atom -- "CSV, XML (QTI), or TXT")
        │     ├── FileSizeHint (Atom -- "Max 10MB")
        │     └── SelectedFileInfo (Atom -- name, size, detected format)
        │
        ├── Step 2: DataPreview (Molecule)
        │     ├── FormatBadge (Atom -- detected format)
        │     ├── PreviewTable (shadcn/ui Table -- first 5 rows)
        │     ├── RowCountInfo (Atom -- "150 rows detected")
        │     └── ColumnList (Atom -- list of detected column names)
        │
        ├── Step 3: FieldMapper (Organism)
        │     ├── MappingRow[] (Molecule)
        │     │     ├── SourceColumnLabel (Atom)
        │     │     ├── ArrowIcon (Atom)
        │     │     ├── TargetFieldSelect (shadcn/ui Select)
        │     │     ├── ConfidenceBadge (Atom -- auto-map confidence)
        │     │     └── RequiredIndicator (Atom -- asterisk for required fields)
        │     ├── UnmappedColumnsInfo (Atom)
        │     ├── ValidationErrors (Atom -- missing required mappings)
        │     └── PresetSelector (Molecule)
        │           ├── LoadPresetSelect (shadcn/ui Select)
        │           ├── SavePresetButton (shadcn/ui Button)
        │           └── SavePresetDialog (shadcn/ui Dialog)
        │
        ├── Step 4: ImportSummary (Molecule)
        │     ├── FileInfoCard (Atom -- filename, format, row count)
        │     ├── MappingSummaryTable (Atom -- mapped fields list)
        │     ├── UnmappedWarnings (Atom -- unmapped optional fields)
        │     ├── EstimatedTime (Atom -- "~12 seconds")
        │     └── ImportButton (shadcn/ui Button -- primary, prominent)
        │
        └── Step 5: ImportProgress (Molecule)
              ├── ProgressBar (shadcn/ui Progress)
              ├── StatusLabel (Atom -- "Processing... 45/150 rows")
              ├── ErrorList (Atom -- row-level errors if any)
              └── CompletionMessage (Atom -- success or partial success)
```

### Wizard State Machine

```
UPLOAD -> (file selected) -> PREVIEW
PREVIEW -> (back) -> UPLOAD
PREVIEW -> (next) -> MAP
MAP -> (back) -> PREVIEW
MAP -> (all required mapped) -> CONFIRM
CONFIRM -> (back) -> MAP
CONFIRM -> (import clicked) -> IMPORTING
IMPORTING -> (complete) -> DONE
IMPORTING -> (error) -> ERROR
ERROR -> (retry) -> IMPORTING
```

### FileUploadZone Behavior
- Drag-and-drop area with dashed border
- Click to open file picker
- Accepted formats: `.csv`, `.xml`, `.txt`
- Max file size: 10MB (client-side check before upload)
- On file select: upload to `POST /api/v1/import/upload`
- Show progress bar during upload
- On success: display filename, size, detected format; enable Next

### DataPreview Behavior
- Calls `POST /api/v1/import/preview` with upload_id
- Shows format badge (CSV / QTI / TXT)
- Table with column headers and first 5 rows
- Highlights cells that might have issues (empty required fields)
- Shows total row count: "150 rows detected"

### FieldMapper Behavior
- One row per source column, with dropdown to select target field
- Pre-populated with `suggested_mappings` from preview response
- Auto-mapped fields show confidence badge (green > 0.8, yellow 0.5-0.8, red < 0.5)
- Required fields marked with red asterisk
- Validation: all `REQUIRED_TARGET_FIELDS` must be mapped before proceeding
- Each target field can only be assigned once (remove from other dropdowns when selected)
- "Skip" option in dropdown for columns to ignore
- Preset selector: dropdown to load saved presets, button to save current mapping

### Auto-Mapping Heuristic (Levenshtein)

```typescript
// apps/server/src/utils/levenshtein.ts

/**
 * Compute Levenshtein distance between two strings.
 * Used for auto-mapping source column headers to target fields.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  const aLen = a.length;
  const bLen = b.length;

  for (let i = 0; i <= aLen; i++) matrix[i] = [i];
  for (let j = 0; j <= bLen; j++) matrix[0]![j] = j;

  for (let i = 1; i <= aLen; i++) {
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }
  return matrix[aLen]![bLen]!;
}

/**
 * Calculate similarity score (0.0-1.0) between two strings.
 * 1.0 = exact match, 0.0 = completely different.
 */
export function stringSimilarity(a: string, b: string): number {
  const normalizedA = a.toLowerCase().replace(/[_\s-]/g, '');
  const normalizedB = b.toLowerCase().replace(/[_\s-]/g, '');
  const maxLen = Math.max(normalizedA.length, normalizedB.length);
  if (maxLen === 0) return 1.0;
  return 1.0 - levenshteinDistance(normalizedA, normalizedB) / maxLen;
}

/** Known aliases for target fields to improve auto-mapping accuracy */
export const FIELD_ALIASES: Record<string, readonly string[]> = {
  stem: ['question', 'question text', 'item stem', 'prompt', 'q', 'item'],
  vignette: ['lead in', 'clinical scenario', 'scenario', 'case', 'lead-in'],
  answer_choice_a: ['option a', 'choice a', 'a', 'answer a', 'optiona'],
  answer_choice_b: ['option b', 'choice b', 'b', 'answer b', 'optionb'],
  answer_choice_c: ['option c', 'choice c', 'c', 'answer c', 'optionc'],
  answer_choice_d: ['option d', 'choice d', 'd', 'answer d', 'optiond'],
  answer_choice_e: ['option e', 'choice e', 'e', 'answer e', 'optione'],
  correct_answer: ['answer', 'correct', 'key', 'answer key', 'correctanswer'],
  rationale: ['explanation', 'feedback', 'rationale', 'reasoning'],
  difficulty: ['difficulty', 'difficulty level', 'diff'],
  tags: ['tag', 'tags', 'category', 'categories', 'keywords'],
  course: ['course', 'course name', 'course id', 'subject'],
  bloom_level: ['bloom', 'bloom level', 'cognitive level', 'blooms'],
  topic: ['topic', 'subject', 'domain', 'area'],
};
```

### ImportSummary Behavior
- Calls `POST /api/v1/import/confirm` with upload_id and final mappings
- Shows file info, mapped field count, unmapped columns, warnings
- Prominent "Start Import" button
- Estimated import duration

### Design Tokens
- Surface: White sheet for wizard container
- Step indicator: Navy Deep for active, Gray for inactive, Green for complete
- Upload zone: dashed border with `--border-dashed`, `--color-neutral-300`
- Drop active: border color changes to Navy Deep
- Required field indicator: `--color-red-500` asterisk
- Confidence badges: Green (`--color-green-500` > 0.8), Yellow (`--color-amber-500` 0.5-0.8), Gray (`--color-neutral-400` < 0.5)
- Typography: Lora for page heading, Source Sans 3 for labels/text
- Spacing: `--space-6` between wizard steps, `--space-4` within steps

---

## Section 7: Files to Create

```
# 1. Types (packages/types)
packages/types/src/import/mapping.types.ts

# 2. Types barrel update
packages/types/src/import/index.ts              -- UPDATE

# 3. Database migration
Supabase MCP: create_import_presets_table

# 4. Error classes (apps/server)
apps/server/src/errors/import-mapping.errors.ts

# 5. Utility (apps/server)
apps/server/src/utils/levenshtein.ts

# 6. Services (apps/server)
apps/server/src/services/import/import-upload.service.ts
apps/server/src/services/import/mapping-preset.service.ts

# 7. Controller (apps/server)
apps/server/src/controllers/import/import-upload.controller.ts

# 8. Routes (apps/server)
apps/server/src/api/import.routes.ts

# 9. Frontend components (apps/web)
apps/web/src/components/import/FileUploadZone.tsx
apps/web/src/components/import/DataPreview.tsx
apps/web/src/components/import/FieldMapper.tsx
apps/web/src/components/import/ImportSummary.tsx
apps/web/src/components/import/ImportWizard.tsx

# 10. Page (apps/web)
apps/web/src/app/(dashboard)/faculty/import/page.tsx

# 11. API client (apps/web)
apps/web/src/lib/api/import.ts

# 12. Tests (apps/server)
apps/server/src/tests/import/import-upload.controller.test.ts
```

**Files to modify (wire-up):**
```
apps/server/src/api/index.ts                -- Register import routes
apps/server/src/composition-root.ts         -- Wire ImportUploadService -> ImportUploadController
packages/types/src/index.ts                 -- Re-export import mapping types
packages/types/src/import/index.ts          -- Add mapping type exports
```

**Total files:** 15 new + 4 modified

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-3 | faculty | **DONE** | Import parsers (CsvParser, QtiParser, TextParser, ParserFactory) |

### NPM Packages (already in monorepo)
- `express` -- Route handling
- `zod` -- Input validation
- `@supabase/supabase-js` -- Supabase client (DB + Storage)
- `vitest` -- Testing
- `multer` -- Multipart file upload middleware
- `papaparse` -- CSV parsing (from STORY-F-3)
- `fast-xml-parser` -- QTI parsing (from STORY-F-3)

### NPM Packages (may need installation)
| Package | Purpose |
|---------|---------|
| `@types/multer` | TypeScript types for multer (dev dependency) |

### Existing Files Needed
- `apps/server/src/services/import/parsers/csv-parser.ts` -- CsvParser (from STORY-F-3)
- `apps/server/src/services/import/parsers/qti-parser.ts` -- QtiParser (from STORY-F-3)
- `apps/server/src/services/import/parsers/text-parser.ts` -- TextParser (from STORY-F-3)
- `apps/server/src/services/import/parser-factory.service.ts` -- ParserFactory (from STORY-F-3)
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`, `AuthRole`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/import/parser.types.ts` -- Parser types (from STORY-F-3)
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>`, `AuthUser`

---

## Section 9: Test Fixtures (inline)

### Faculty User

```typescript
export const IMPORT_FACULTY_USER = {
  id: "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
  email: "dr.carter@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-0001-0001-0001-000000000001",
  is_course_director: true,
  display_name: "Dr. Sarah Carter",
};
```

### File Upload Fixtures

```typescript
export const CSV_FILE_BUFFER = Buffer.from(
  'stem,optionA,optionB,optionC,optionD,correctAnswer,topic\n' +
  '"A 45-year-old patient presents with chest pain. Most likely diagnosis?","Acute MI","PE","Pneumothorax","Costochondritis","A","Cardiovascular"\n' +
  '"Which enzyme is most specific for myocardial damage?","AST","ALT","Troponin I","LDH","C","Cardiovascular"\n' +
  '"First-line medication for type 2 diabetes?","Metformin","Insulin","Glipizide","Sitagliptin","A","Endocrine"\n'
);

export const UPLOAD_RESPONSE = {
  upload_id: "upload-0001-0001-0001-000000000001",
  filename: "exam_questions.csv",
  size_bytes: 450,
  storage_path: "import-temp/aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa/upload-0001/exam_questions.csv",
};

export const PREVIEW_RESPONSE = {
  format: "csv" as const,
  columns: ["stem", "optionA", "optionB", "optionC", "optionD", "correctAnswer", "topic"],
  preview_rows: [
    ["A 45-year-old patient...", "Acute MI", "PE", "Pneumothorax", "Costochondritis", "A", "Cardiovascular"],
    ["Which enzyme...", "AST", "ALT", "Troponin I", "LDH", "C", "Cardiovascular"],
  ],
  total_rows: 3,
  suggested_mappings: [
    { source_column: "stem", target_field: "stem" as const, confidence: 1.0 },
    { source_column: "optionA", target_field: "answer_choice_a" as const, confidence: 0.85 },
    { source_column: "optionB", target_field: "answer_choice_b" as const, confidence: 0.85 },
    { source_column: "optionC", target_field: "answer_choice_c" as const, confidence: 0.85 },
    { source_column: "optionD", target_field: "answer_choice_d" as const, confidence: 0.85 },
    { source_column: "correctAnswer", target_field: "correct_answer" as const, confidence: 0.88 },
    { source_column: "topic", target_field: "topic" as const, confidence: 0.95 },
  ],
  file_info: {
    filename: "exam_questions.csv",
    size_bytes: 450,
    upload_id: "upload-0001-0001-0001-000000000001",
  },
};
```

### Mapping Preset Fixture

```typescript
export const PRESET_FIXTURE = {
  id: "preset-0001-0001-0001-000000000001",
  user_id: "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
  name: "ExamSoft CSV Format",
  description: "Column mapping for ExamSoft CSV exports",
  mappings: [
    { source_column: "Item Stem", target_field: "stem" as const, confidence: null },
    { source_column: "Option A", target_field: "answer_choice_a" as const, confidence: null },
    { source_column: "Option B", target_field: "answer_choice_b" as const, confidence: null },
    { source_column: "Option C", target_field: "answer_choice_c" as const, confidence: null },
    { source_column: "Option D", target_field: "answer_choice_d" as const, confidence: null },
    { source_column: "Correct Answer", target_field: "correct_answer" as const, confidence: null },
  ],
  source_format: "csv" as const,
  created_at: "2026-02-01T10:00:00Z",
  updated_at: "2026-02-01T10:00:00Z",
};
```

---

## Section 10: API Test Spec (vitest)

**File:** `apps/server/src/tests/import/import-upload.controller.test.ts`
**Total tests:** 12

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// vi.hoisted() for mocks referenced by vi.mock() closures
const { mockSupabase, mockParserFactory } = vi.hoisted(() => ({
  mockSupabase: { storage: { from: vi.fn() }, from: vi.fn() },
  mockParserFactory: { parse: vi.fn(), detectFormat: vi.fn() },
}));

describe('ImportUploadController', () => {
  describe('POST /api/v1/import/upload', () => {
    it('uploads file to Supabase Storage and returns upload_id (201)', async () => {
      // Assert: file stored in import-temp bucket
      // Assert: response includes upload_id, filename, size_bytes, storage_path
    });

    it('rejects file larger than 10MB (413 FILE_SIZE_LIMIT)', async () => {
      // Assert: 413 status
      // Assert: error.code = 'FILE_SIZE_LIMIT'
    });

    it('rejects unsupported file type (400 VALIDATION_ERROR)', async () => {
      // Upload a .pdf file
      // Assert: 400 status
      // Assert: error.code = 'VALIDATION_ERROR'
    });
  });

  describe('POST /api/v1/import/preview', () => {
    it('returns preview with detected format, columns, and first 5 rows (200)', async () => {
      // Assert: format matches detected type
      // Assert: columns array populated
      // Assert: preview_rows.length <= 5
      // Assert: total_rows reflects actual count
    });

    it('returns suggested_mappings using Levenshtein auto-mapping (200)', async () => {
      // Assert: suggested_mappings array populated
      // Assert: each mapping has confidence score
      // Assert: "stem" column mapped to "stem" target with high confidence
    });

    it('returns 404 UPLOAD_NOT_FOUND for expired upload (404)', async () => {
      // Assert: 404 status
      // Assert: error.code = 'UPLOAD_NOT_FOUND'
    });
  });

  describe('GET /api/v1/import/presets', () => {
    it('returns user presets (200)', async () => {
      // Assert: data is array of MappingPreset
      // Assert: all presets belong to requesting user
    });
  });

  describe('POST /api/v1/import/presets', () => {
    it('creates mapping preset (201)', async () => {
      // Assert: preset created with name, mappings, source_format
      // Assert: user_id set from req.user
    });

    it('rejects preset with empty name (400 VALIDATION_ERROR)', async () => {
      // Assert: 400 status
    });
  });

  describe('POST /api/v1/import/confirm', () => {
    it('returns confirmation summary with row count (200)', async () => {
      // Assert: total_rows, mapped_fields, unmapped_columns populated
      // Assert: estimated_duration_seconds > 0
    });

    it('rejects incomplete mapping (400 MAPPING_INCOMPLETE)', async () => {
      // Submit mappings without required "stem" field
      // Assert: 400 status
      // Assert: error.code = 'MAPPING_INCOMPLETE'
    });
  });

  describe('POST /api/v1/import/execute', () => {
    it('queues import job and returns job status (202)', async () => {
      // Assert: 202 status
      // Assert: job_id returned
      // Assert: status = 'queued'
      // Assert: rows_total matches file row count
    });
  });
});
```

---

## Section 11: E2E Test Spec (Playwright)

Not required for this story. The import wizard is not one of the 5 critical user journeys. E2E coverage will be added when the full Import Pipeline (E-24) is complete, covering the end-to-end flow from upload to imported items appearing in the item bank.

---

## Section 12: Acceptance Criteria

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

---

## Section 13: Source References

All data in this brief was extracted from the following source documents. Do NOT read these during implementation -- everything needed is inlined above.

| Document | What Was Extracted |
|----------|-------------------|
| `.context/spec/stories/S-F-24-2.md` | Original story with acceptance criteria, implementation layers, dependencies |
| `.context/spec/stories/STORY-F-3-BRIEF.md` | Parser types (ParsedQuestion, IParser, ParserFactory), parser service file paths |
| `.context/source/03-schema/API_CONTRACT_v1.md` | API conventions, envelope format, error codes |
| `.context/source/03-schema/SUPABASE_DDL_v1.md` | Table conventions, RLS patterns, Storage bucket patterns |
| `.context/source/04-process/CODE_STANDARDS.md` | MVC layer rules, Atomic Design hierarchy, OOP standards, testing standards |
| `.context/source/02-architecture/ARCHITECTURE_v10.md` | Pipeline C import flow, Supabase Storage patterns, monorepo structure |

---

## Section 14: Environment Prerequisites

### Required Services
- **Supabase:** PostgreSQL with `import_presets` table migrated + Storage `import-temp` bucket created
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story (graph writes happen in STORY-F-57)

### Required Environment Variables
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Pre-implementation Checks
1. Verify STORY-F-3 parsers exist at `apps/server/src/services/import/parsers/`
2. Verify `papaparse` and `fast-xml-parser` are installed in `apps/server`
3. Create Supabase Storage bucket `import-temp` with 10MB file size limit
4. Verify `multer` is installed in `apps/server` for multipart uploads
5. Run the `create_import_presets_table` migration

---

## Section 15: Implementation Notes

- **File upload with multer:** Use multer's memory storage (no disk writes) since files are immediately uploaded to Supabase Storage.

```typescript
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['text/csv', 'text/plain', 'application/xml', 'text/xml'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new FileSizeLimitError(file.size, 10 * 1024 * 1024));
    }
  },
});
```

- **Supabase Storage upload:** Store files at path `import-temp/{user_id}/{upload_id}/{filename}`. The temp bucket has a 24h lifecycle policy.

```typescript
const storagePath = `${userId}/${uploadId}/${filename}`;
const { error } = await supabase.storage
  .from('import-temp')
  .upload(storagePath, buffer, {
    contentType: mimeType,
    upsert: false,
  });
```

- **Preview generation:** Download the file from Storage, pass it to `ParserFactory.parse()` from STORY-F-3 with a row limit, then extract columns and first N rows.

- **Auto-mapping algorithm:**
  1. Normalize both source column name and target field names (lowercase, remove underscores/spaces/hyphens)
  2. For each source column, compute similarity against all target field names AND their aliases
  3. Take the best match above 0.5 threshold
  4. Assign confidence = similarity score
  5. Resolve conflicts: if two source columns map to the same target, keep the one with higher confidence

- **Import execution placeholder:** The `POST /api/v1/import/execute` endpoint creates an `import_jobs` record (or simply returns a mock job status) and returns 202. The actual processing pipeline is built in STORY-F-57.

- **Error classes:**

```typescript
// apps/server/src/errors/import-mapping.errors.ts
import { JourneyOSError } from './base.errors';

export class UploadNotFoundError extends JourneyOSError {
  constructor(uploadId: string) {
    super(`Upload '${uploadId}' not found or expired`, 'UPLOAD_NOT_FOUND');
  }
}

export class MappingIncompleteError extends JourneyOSError {
  constructor(missingFields: readonly string[]) {
    super(
      `Required fields not mapped: ${missingFields.join(', ')}`,
      'MAPPING_INCOMPLETE',
    );
  }
}

export class FileTypeForbiddenError extends JourneyOSError {
  constructor(mimeType: string) {
    super(
      `File type '${mimeType}' is not supported. Allowed: CSV, XML (QTI), TXT`,
      'FILE_TYPE_FORBIDDEN',
    );
  }
}
```

- **Narrow `req.params`:** Express `req.params.id` is `string | string[]` in strict mode. Narrow with `typeof req.params.id === 'string'` before passing to service.

- **Wizard step validation:** Each step validates before allowing navigation to the next step. The wizard component manages step state and only enables the Next button when the current step's validation passes. Back button always enabled (except on step 1).

### Zod Validation Schemas

```typescript
import { z } from 'zod';
import { IMPORT_TARGET_FIELDS } from '@journey-os/types';

export const PreviewRequestSchema = z.object({
  upload_id: z.string().uuid(),
  preview_rows: z.coerce.number().int().min(1).max(20).default(5),
});

export const FieldMappingSchema = z.object({
  source_column: z.string().min(1),
  target_field: z.enum(IMPORT_TARGET_FIELDS as unknown as [string, ...string[]]),
  confidence: z.number().min(0).max(1).nullable(),
});

export const ConfirmRequestSchema = z.object({
  upload_id: z.string().uuid(),
  mappings: z.array(FieldMappingSchema).min(1),
});

export const ExecuteRequestSchema = z.object({
  upload_id: z.string().uuid(),
  mappings: z.array(FieldMappingSchema).min(1),
  course_id: z.string().uuid(),
});

export const PresetCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  mappings: z.array(FieldMappingSchema).min(1),
  source_format: z.enum(['csv', 'qti', 'text']),
});
```
