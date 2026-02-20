# STORY-F-69 Brief: Retired Exam Import

## 0. Lane & Priority

```yaml
story_id: STORY-F-69
old_id: S-F-27-3
lane: faculty
lane_priority: 3
within_lane_order: 69
sprint: 30
size: M
depends_on:
  - STORY-F-65 (faculty) — Blueprint Definition Model (blueprint/item model exists)
blocks: []
personas_served: [faculty]
epic: E-27 (Exam Assignment & Export)
feature: F-12 (Exam Assembly & Delivery)
user_flow: UF-20 (Exam Assembly & Assignment)
cross_epic_note: "STORY-ST-40-2 depends on this — IRT calibration needs historical response data"
```

## 1. Summary

Build a **retired exam import** feature that allows faculty to upload historical/retired exams with anonymized response data so the IRT calibration engine has sufficient data for item parameter estimation. Faculty upload files in CSV, QTI, or JSON format; the system validates, parses, previews parsed items, maps them to USMLE systems/disciplines, imports them as 'retired' status (read-only), and stores anonymized response data for IRT calibration. The import supports up to 1000 items per file with rollback capability.

This story is on the critical path from Faculty to Student: **F-69 (retired import)** -> ST-40-2 (IRT calibration needs historical response data).

Key constraints:
- **Strategy pattern** — format-specific importers (CSV, QTI, JSON) with common interface
- File validation before import: format, required columns, data types
- Preview step before confirmation
- Items tagged as 'retired' — read-only after import
- Anonymized response data: item_id, response (A-E), correct (bool), response_time_ms
- Bulk import in database transaction for atomicity with rollback on error
- File size limit: 50MB per upload
- Max 1000 items per file

## 2. Task Breakdown

1. **Types** — Create `RetiredExamImportRequest`, `ImportPreview`, `ImportResult`, `ImportedItem`, `AnonymizedResponse`, `ImportFormat` in `packages/types/src/exam/import.types.ts`
2. **Migration** — Create `retired_exam_imports` and `anonymized_responses` tables in Supabase via MCP
3. **Error classes** — `ImportValidationError`, `ImportParseError`, `ImportRollbackError` in `apps/server/src/modules/exam/errors/import.errors.ts`
4. **CSV Importer** — `CsvImporter` implementing `ExamImporter` interface with format-specific parsing
5. **QTI Importer** — `QtiImporter` implementing `ExamImporter` interface for IMS QTI 2.1 XML
6. **Service** — `RetiredExamImportService` with `validate()`, `preview()`, `import()`, `rollback()` methods
7. **Controller** — `RetiredExamImportController` with `handleUpload()`, `handlePreview()`, `handleConfirmImport()` methods
8. **Routes** — Protected routes `POST /api/v1/exams/import/retired` with RBAC
9. **Frontend page** — Import wizard component with upload, preview, confirm steps
10. **API tests** — 12 tests covering CSV parsing, QTI parsing, validation, preview, import, rollback

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/exam/import.types.ts

/** Supported import file formats */
export type ImportFormat = "csv" | "qti" | "json";

/** Import status */
export type ImportStatus = "validating" | "previewing" | "importing" | "completed" | "failed" | "rolled_back";

/** Single parsed item from import file */
export interface ParsedImportItem {
  readonly external_id: string;
  readonly stem: string;
  readonly options: readonly ImportOption[];
  readonly correct_answer: string;           // A-E
  readonly usmle_system?: string;
  readonly discipline?: string;
  readonly bloom_level?: string;
  readonly difficulty?: string;
  readonly rationale?: string;
}

/** Option for imported item */
export interface ImportOption {
  readonly label: string;                    // A, B, C, D, E
  readonly text: string;
}

/** Anonymized student response record */
export interface AnonymizedResponse {
  readonly item_external_id: string;
  readonly response: string;                 // A-E
  readonly correct: boolean;
  readonly response_time_ms: number;
}

/** Preview result before confirming import */
export interface ImportPreview {
  readonly format: ImportFormat;
  readonly total_items: number;
  readonly valid_items: number;
  readonly skipped_items: number;            // duplicates
  readonly errors: readonly ImportPreviewError[];
  readonly sample_items: readonly ParsedImportItem[];  // first 10 items
  readonly response_count: number;
  readonly unmapped_systems: readonly string[];
  readonly unmapped_disciplines: readonly string[];
}

/** Preview error for a specific row/item */
export interface ImportPreviewError {
  readonly row: number;
  readonly field: string;
  readonly message: string;
}

/** Result after confirmed import */
export interface ImportResult {
  readonly import_id: string;
  readonly items_imported: number;
  readonly items_skipped: number;
  readonly responses_imported: number;
  readonly errors: readonly ImportPreviewError[];
  readonly completed_at: string;
}

/** Import batch record */
export interface RetiredExamImport {
  readonly id: string;
  readonly uploaded_by: string;
  readonly file_name: string;
  readonly format: ImportFormat;
  readonly status: ImportStatus;
  readonly items_count: number;
  readonly responses_count: number;
  readonly error_message: string | null;
  readonly created_at: string;
  readonly completed_at: string | null;
}

/** Importer strategy interface */
export interface ExamImporter {
  readonly format: ImportFormat;
  parse(buffer: Buffer): Promise<{
    readonly items: readonly ParsedImportItem[];
    readonly responses: readonly AnonymizedResponse[];
  }>;
  validate(buffer: Buffer): Promise<readonly ImportPreviewError[]>;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_retired_exam_import_tables

-- Batch import tracking
CREATE TABLE IF NOT EXISTS retired_exam_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  file_name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('csv', 'qti', 'json')),
  status TEXT NOT NULL DEFAULT 'validating'
    CHECK (status IN ('validating', 'previewing', 'importing', 'completed', 'failed', 'rolled_back')),
  items_count INTEGER NOT NULL DEFAULT 0,
  responses_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  institution_id UUID NOT NULL REFERENCES institutions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_retired_imports_uploaded_by
  ON retired_exam_imports(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_retired_imports_institution
  ON retired_exam_imports(institution_id);

-- Anonymized response data for IRT calibration
CREATE TABLE IF NOT EXISTS anonymized_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES retired_exam_imports(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,               -- references items/questions table
  response TEXT NOT NULL CHECK (response IN ('A', 'B', 'C', 'D', 'E')),
  correct BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anon_responses_import
  ON anonymized_responses(import_id);

CREATE INDEX IF NOT EXISTS idx_anon_responses_item
  ON anonymized_responses(item_id);

-- RLS
ALTER TABLE retired_exam_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymized_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can read own imports"
  ON retired_exam_imports FOR SELECT
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Faculty can insert imports"
  ON retired_exam_imports FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);
```

## 5. API Contract (complete request/response)

### POST /api/v1/exams/import/retired/upload (Auth: Faculty)

**Request:** multipart/form-data
| Field | Type | Description |
|-------|------|-------------|
| `file` | File | CSV, QTI (.xml), or JSON file (max 50MB) |
| `format` | string | `csv`, `qti`, or `json` |

**Success Response (200) — Preview:**
```json
{
  "data": {
    "import_id": "import-uuid-1",
    "format": "csv",
    "total_items": 150,
    "valid_items": 147,
    "skipped_items": 3,
    "errors": [
      { "row": 42, "field": "correct_answer", "message": "Invalid answer: F (expected A-E)" }
    ],
    "sample_items": [
      {
        "external_id": "Q001",
        "stem": "A 65-year-old man presents with...",
        "options": [
          { "label": "A", "text": "Aortic stenosis" },
          { "label": "B", "text": "Mitral regurgitation" }
        ],
        "correct_answer": "A",
        "usmle_system": "Cardiovascular",
        "discipline": "Pathology",
        "bloom_level": "Apply"
      }
    ],
    "response_count": 4500,
    "unmapped_systems": ["Integumentary"],
    "unmapped_disciplines": []
  },
  "error": null
}
```

### POST /api/v1/exams/import/retired/:importId/confirm (Auth: Faculty)

**Success Response (200):**
```json
{
  "data": {
    "import_id": "import-uuid-1",
    "items_imported": 147,
    "items_skipped": 3,
    "responses_imported": 4500,
    "errors": [],
    "completed_at": "2026-02-19T14:30:00Z"
  },
  "error": null
}
```

### DELETE /api/v1/exams/import/retired/:importId (Auth: Faculty — rollback)

**Success Response (200):**
```json
{
  "data": {
    "import_id": "import-uuid-1",
    "items_deleted": 147,
    "responses_deleted": 4500,
    "status": "rolled_back"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role |
| 400 | `IMPORT_VALIDATION_ERROR` | File format invalid, missing required columns |
| 400 | `VALIDATION_ERROR` | Unsupported format, file too large |
| 404 | `NOT_FOUND` | Import ID does not exist |
| 413 | `FILE_TOO_LARGE` | File exceeds 50MB limit |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Component: Retired Exam Import Wizard

**Route:** Accessible from exam management page (modal or dedicated page)

**Component hierarchy:**
```
RetiredExamImportWizard (client component)
  ├── Step 1: FileUpload
  │     ├── FormatSelector (radio: CSV, QTI, JSON)
  │     ├── FileDropzone (drag-and-drop area, 50MB limit)
  │     └── FormatGuide (collapsible — shows expected CSV columns, QTI structure)
  ├── Step 2: Preview
  │     ├── ImportSummaryCard (total, valid, skipped, response count)
  │     ├── ErrorList (validation errors with row numbers)
  │     ├── UnmappedWarnings (unmapped USMLE systems/disciplines)
  │     ├── ImportPreviewTable (first 10 items with stem, answer, system)
  │     └── ConfirmButton / CancelButton
  └── Step 3: Result
        ├── ImportResultSummary (items imported, responses imported)
        ├── ErrorList (import errors, if any)
        └── RollbackButton (delete entire batch)
```

**States:**
1. **Upload** — File dropzone, format selector, upload button
2. **Validating** — Progress spinner during file parse/validation
3. **Preview** — Parsed items preview table, error list, confirm/cancel
4. **Importing** — Progress bar during bulk import
5. **Success** — Import summary with item/response counts
6. **Error** — Error details with retry or rollback option

**Design tokens:**
- File dropzone: dashed border, Navy Deep `#002c76` on hover
- Error rows: `error-red` highlight
- Success summary: Green `#69a338` badge
- Surface: White `#ffffff` cards on Cream `#f5f3ef`

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/exam/import.types.ts` | Types | Create |
| 2 | `packages/types/src/exam/index.ts` | Types | Edit (add import export) |
| 3 | Supabase migration via MCP (retired_exam_imports + anonymized_responses) | Database | Apply |
| 4 | `apps/server/src/modules/exam/errors/import.errors.ts` | Errors | Create |
| 5 | `apps/server/src/modules/exam/services/importers/exam-importer.interface.ts` | Interface | Create |
| 6 | `apps/server/src/modules/exam/services/importers/csv-importer.ts` | Service | Create |
| 7 | `apps/server/src/modules/exam/services/importers/qti-importer.ts` | Service | Create |
| 8 | `apps/server/src/modules/exam/services/importers/json-importer.ts` | Service | Create |
| 9 | `apps/server/src/modules/exam/services/retired-exam-import.service.ts` | Service | Create |
| 10 | `apps/server/src/modules/exam/controllers/retired-exam-import.controller.ts` | Controller | Create |
| 11 | `apps/server/src/modules/exam/routes/retired-exam-import.routes.ts` | Routes | Create |
| 12 | `apps/web/src/components/exam/retired-exam-import-wizard.tsx` | Component | Create |
| 13 | `apps/web/src/components/exam/import-preview-table.tsx` | Component | Create |
| 14 | `apps/server/src/modules/exam/__tests__/retired-exam-import.service.test.ts` | Tests | Create |
| 15 | `apps/server/src/modules/exam/__tests__/csv-importer.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-65 | faculty | pending | Blueprint Definition Model — blueprint/item model must exist for item mapping |

### NPM Packages
- `multer` — File upload middleware — **NEW, must install**
- `csv-parse` — CSV parsing — **NEW, must install**
- `fast-xml-parser` — QTI XML parsing — **NEW, must install**
- `@supabase/supabase-js` — Supabase client (installed)
- `express` — Server framework (installed)
- `vitest` — Testing (installed)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.FACULTY)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`
- Blueprint and item models from F-65

## 9. Test Fixtures (inline)

```typescript
// Mock Faculty user
export const FACULTY_USER = {
  sub: "faculty-uuid-1",
  email: "faculty@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: true,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Valid CSV content
export const VALID_CSV = `external_id,stem,option_a,option_b,option_c,option_d,option_e,correct_answer,usmle_system,discipline,bloom_level
Q001,"A 65-year-old man presents with chest pain",Aortic stenosis,Mitral regurgitation,Pericarditis,Myocardial infarction,Pulmonary embolism,D,Cardiovascular,Pathology,Apply
Q002,"A 30-year-old woman with fatigue",Iron deficiency anemia,B12 deficiency,Folate deficiency,Thalassemia,Sickle cell,A,Hematology,Pathology,Analyze`;

// Invalid CSV (missing required column)
export const INVALID_CSV = `external_id,stem,option_a
Q001,"Missing columns",Only one option`;

// Valid anonymized response CSV
export const VALID_RESPONSES_CSV = `item_external_id,response,correct,response_time_ms
Q001,D,true,45000
Q001,A,false,38000
Q002,A,true,52000`;

// Mock parsed items
export const MOCK_PARSED_ITEMS = [
  {
    external_id: "Q001",
    stem: "A 65-year-old man presents with chest pain",
    options: [
      { label: "A", text: "Aortic stenosis" },
      { label: "B", text: "Mitral regurgitation" },
      { label: "C", text: "Pericarditis" },
      { label: "D", text: "Myocardial infarction" },
      { label: "E", text: "Pulmonary embolism" },
    ],
    correct_answer: "D",
    usmle_system: "Cardiovascular",
    discipline: "Pathology",
    bloom_level: "Apply",
  },
];

// Mock import record
export const MOCK_IMPORT = {
  id: "import-uuid-1",
  uploaded_by: "faculty-uuid-1",
  file_name: "retired-exam-2025.csv",
  format: "csv" as const,
  status: "completed" as const,
  items_count: 150,
  responses_count: 4500,
  error_message: null,
  institution_id: "inst-uuid-1",
  created_at: "2026-02-19T14:00:00Z",
  completed_at: "2026-02-19T14:30:00Z",
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/modules/exam/__tests__/csv-importer.test.ts`

```
describe("CsvImporter")
  describe("validate")
    - returns empty errors for valid CSV with all required columns
    - returns errors for CSV missing required columns
    - returns errors for invalid correct_answer values (not A-E)
    - returns errors for rows with missing stem
  describe("parse")
    - parses items from valid CSV
    - parses anonymized responses from valid CSV
    - skips rows with validation errors
```

**File:** `apps/server/src/modules/exam/__tests__/retired-exam-import.service.test.ts`

```
describe("RetiredExamImportService")
  describe("preview")
    - returns preview with total, valid, skipped counts
    - identifies duplicate items (skipped)
    - identifies unmapped USMLE systems
    - returns first 10 items as sample
  describe("confirmImport")
    - imports valid items as 'retired' status
    - imports anonymized responses linked to items
    - creates import batch record with completed status
    - uses database transaction for atomicity
    - returns correct items_imported and responses_imported counts
  describe("rollback")
    - deletes all items from import batch
    - deletes all responses from import batch
    - updates import status to 'rolled_back'
    - throws NotFoundError for non-existent import ID
```

**Total: ~18 tests** (7 CSV importer + 11 service)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Retired exam import is not part of the 5 critical user journeys.

## 12. Acceptance Criteria

1. Faculty can upload retired exam files in CSV, QTI, and JSON formats
2. File validation checks format, required columns, and data types
3. Preview shows parsed items before import confirmation
4. Items are mapped to existing USMLE systems and disciplines
5. Anonymized response data is imported for IRT calibration
6. Items tagged as 'retired' status (read-only, not available for new exams)
7. Import summary shows items imported, skipped, and errors
8. Bulk import supports up to 1000 items per file
9. Rollback deletes entire import batch on error or user request
10. File size limited to 50MB
11. All ~18 API tests pass
12. TypeScript strict, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| Upload historical/retired exams | S-F-27-3 § User Story |
| CSV, QTI, JSON formats | S-F-27-3 § Acceptance Criteria |
| Anonymized response data format | S-F-27-3 § Notes: "item_id, response (A-E), correct (bool), response_time_ms" |
| Strategy pattern for importers | S-F-27-3 § Notes: "Importer pattern mirrors exporter" |
| 1000 items per file limit | S-F-27-3 § Acceptance Criteria |
| 50MB file size limit | S-F-27-3 § Notes |
| Retired items read-only | S-F-27-3 § Notes: "no edits allowed after import" |
| IRT calibration dependency | S-F-27-3 § Dependencies: "S-ST-40-2 depends on this" |

## 14. Environment Prerequisites

- **Supabase:** Project running, item/question tables exist (from F-65), `retired_exam_imports` and `anonymized_responses` tables created by migration
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story

## 15. Figma / Make Prototype

No Figma designs available. Build wizard from component hierarchy above using shadcn/ui primitives (Card, Table, Button, Progress, Alert). File dropzone pattern from existing upload components if available.
