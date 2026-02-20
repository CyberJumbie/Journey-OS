# STORY-F-67 Brief: Export Service

## 0. Lane & Priority

```yaml
story_id: STORY-F-67
old_id: S-F-25-3
lane: faculty
lane_priority: 3
within_lane_order: 67
sprint: 18
size: M
depends_on:
  - STORY-F-64 (faculty) — Item Bank Browser Page (selection source)
blocks: []
personas_served: [faculty]
epic: E-25 (Item Bank Browser & Export)
feature: F-11
user_flow: UF-17 (Item Bank Management)
```

## 1. Summary

Build an **export service** that allows faculty to export selected questions from the item bank in multiple formats: ExamSoft (tab-delimited with specific column structure), QTI 2.1 (XML for LMS compatibility), and CSV (flat format with all metadata). Export accepts either an array of question IDs or current filter criteria. Batch export handles up to 500 items synchronously; larger batches (>100 items) use an async job via Inngest with completion notification. Export files are stored in Supabase Storage temp bucket with 24h TTL. The service uses a strategy pattern with an `ExportFormatter` interface and concrete implementations per format.

Key constraints:
- Three formats: ExamSoft (tab-delimited), QTI 2.1 (XML), CSV (flat)
- Batch limit: 500 items per export
- Async for >100 items via Inngest
- Files stored in Supabase Storage temp bucket (24h TTL)
- Strategy pattern: `ExportFormatter` interface with concrete formatters
- Custom error classes: `ExportError`, `ExportFormatError`
- Named exports only, TypeScript strict, JS `#private` fields

## 2. Task Breakdown

1. **Types** -- Create `ExportFormat`, `ExportRequest`, `ExportResponse`, `ExportJob` in `packages/types/src/item-bank/`
2. **Error classes** -- `ExportError`, `ExportFormatError` in `apps/server/src/errors/export.errors.ts`
3. **Formatter interface** -- `ExportFormatter` with `format()` method
4. **ExamSoft formatter** -- Tab-delimited with ExamSoft-specific column order and encoding
5. **QTI formatter** -- QTI 2.1 XML with schema validation
6. **CSV formatter** -- Flat CSV with all metadata fields
7. **Service** -- `ExportService` with `exportSync()`, `exportAsync()`, format selection
8. **Controller** -- `ExportController` with POST export, GET download endpoints
9. **Routes** -- Register under `/api/v1/item-bank/export`
10. **API tests** -- 10 tests covering each format, batch sizes, async job, download
11. **Exports** -- Register types and error classes in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/item-bank/export.types.ts

/** Supported export formats */
export type ExportFormat = "examsoft" | "qti" | "csv";

/** Export request */
export interface ExportRequest {
  readonly question_ids?: string[];
  readonly filters?: import("./browser.types").ItemBankFilters;
  readonly format: ExportFormat;
}

/** Export response (synchronous) */
export interface ExportResponse {
  readonly export_id: string;
  readonly format: ExportFormat;
  readonly item_count: number;
  readonly download_url: string;
  readonly filename: string;
  readonly expires_at: string;
}

/** Export job (async for large batches) */
export interface ExportJob {
  readonly id: string;
  readonly format: ExportFormat;
  readonly item_count: number;
  readonly status: "pending" | "processing" | "completed" | "failed";
  readonly download_url: string | null;
  readonly filename: string | null;
  readonly error_message: string | null;
  readonly created_at: string;
  readonly completed_at: string | null;
  readonly expires_at: string | null;
}

/** Async export start response */
export interface ExportJobStartResponse {
  readonly job_id: string;
  readonly status: "pending";
  readonly estimated_time_seconds: number;
}

/** Export file metadata stored in DB */
export interface ExportFileRecord {
  readonly id: string;
  readonly user_id: string;
  readonly format: ExportFormat;
  readonly item_count: number;
  readonly storage_path: string;
  readonly filename: string;
  readonly file_size_bytes: number;
  readonly expires_at: string;
  readonly created_at: string;
}

/** ExamSoft column mapping */
export interface ExamSoftRow {
  readonly QuestionTitle: string;
  readonly QuestionStem: string;
  readonly AnswerA: string;
  readonly AnswerB: string;
  readonly AnswerC: string;
  readonly AnswerD: string;
  readonly AnswerE: string;
  readonly CorrectAnswer: string;
  readonly Rationale: string;
  readonly Topic: string;
  readonly Difficulty: string;
  readonly BloomLevel: string;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_export_files_table

-- Track export files for history and download management
CREATE TABLE IF NOT EXISTS export_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  format TEXT NOT NULL CHECK (format IN ('examsoft', 'qti', 'csv')),
  item_count INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_export_files_user ON export_files(user_id, created_at DESC);
CREATE INDEX idx_export_files_expires ON export_files(expires_at) WHERE status = 'completed';

-- RLS
ALTER TABLE export_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own exports"
  ON export_files FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own exports"
  ON export_files FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

## 5. API Contract (complete request/response)

### POST /api/v1/item-bank/export (Auth: faculty)

**Request Body (by IDs):**
```json
{
  "question_ids": ["q-uuid-1", "q-uuid-2", "q-uuid-3"],
  "format": "examsoft"
}
```

**Request Body (by filters):**
```json
{
  "filters": {
    "course_id": "course-uuid-1",
    "bloom_level": "Apply",
    "status": "approved"
  },
  "format": "csv"
}
```

**Success Response -- synchronous (200, <=100 items):**
```json
{
  "data": {
    "export_id": "export-uuid-1",
    "format": "examsoft",
    "item_count": 25,
    "download_url": "/api/v1/item-bank/export/export-uuid-1/download",
    "filename": "item-bank-export-2026-02-19-examsoft.txt",
    "expires_at": "2026-02-20T14:30:00Z"
  },
  "error": null
}
```

**Success Response -- async (202, >100 items):**
```json
{
  "data": {
    "job_id": "export-job-uuid-1",
    "status": "pending",
    "estimated_time_seconds": 45
  },
  "error": null
}
```

### GET /api/v1/item-bank/export/:exportId/download (Auth: faculty)

Returns binary file with appropriate Content-Type header:
- ExamSoft: `text/tab-separated-values`
- QTI: `application/xml`
- CSV: `text/csv`

### GET /api/v1/item-bank/export/:jobId/status (Auth: faculty)

**Success Response (200):**
```json
{
  "data": {
    "id": "export-job-uuid-1",
    "format": "csv",
    "item_count": 350,
    "status": "completed",
    "download_url": "/api/v1/item-bank/export/export-job-uuid-1/download",
    "filename": "item-bank-export-2026-02-19-csv.csv",
    "error_message": null,
    "created_at": "2026-02-19T14:30:00Z",
    "completed_at": "2026-02-19T14:31:15Z",
    "expires_at": "2026-02-20T14:31:15Z"
  },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 200/202 | - | Success |
| 400 | `VALIDATION_ERROR` | Neither question_ids nor filters provided, or batch > 500 |
| 400 | `EXPORT_FORMAT_ERROR` | Unsupported format |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role |
| 404 | `NOT_FOUND` | Export file not found or expired |
| 500 | `EXPORT_ERROR` | Export generation failure |

## 6. Frontend Spec

Frontend export UI is triggered from the Item Bank Browser page (STORY-F-64) via the bulk action bar. No standalone page needed.

### Export Dialog (triggered from BulkActionBar)

```
ExportDialog (molecule, shadcn/ui Dialog)
  ├── Title: "Export Questions"
  ├── FormatSelector (molecule)
  │   ├── RadioCard: "ExamSoft" — "Tab-delimited format for ExamSoft import"
  │   ├── RadioCard: "QTI 2.1" — "XML format for LMS compatibility"
  │   └── RadioCard: "CSV" — "Flat CSV with all metadata fields"
  ├── ItemCount: "Exporting 25 questions"
  ├── ExportButton (atom) — "Export"
  └── AsyncProgress (molecule, conditional) — progress bar for >100 items
```

**Design tokens:**
- Dialog background: `--color-surface-white` (#ffffff)
- Selected format border: `--color-primary-navy` (#002c76)
- Export button: `--color-primary-navy` background, white text
- Progress bar: `--color-success` (green #69a338)

**States:**
1. **Format selection** -- Choose format, see item count
2. **Exporting** -- Button spinner for sync exports
3. **Async pending** -- Progress bar with estimated time
4. **Complete** -- Download link appears
5. **Error** -- Error message with retry

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/item-bank/export.types.ts` | Types | Create |
| 2 | `packages/types/src/item-bank/index.ts` | Types | Edit (add export types) |
| 3 | `apps/server/src/errors/export.errors.ts` | Errors | Create |
| 4 | `apps/server/src/errors/index.ts` | Errors | Edit (add export errors) |
| 5 | Supabase migration via MCP (export_files table) | Database | Apply |
| 6 | `apps/server/src/services/item-bank/formatters/export-formatter.interface.ts` | Interface | Create |
| 7 | `apps/server/src/services/item-bank/formatters/examsoft-formatter.ts` | Formatter | Create |
| 8 | `apps/server/src/services/item-bank/formatters/qti-formatter.ts` | Formatter | Create |
| 9 | `apps/server/src/services/item-bank/formatters/csv-formatter.ts` | Formatter | Create |
| 10 | `apps/server/src/services/item-bank/export.service.ts` | Service | Create |
| 11 | `apps/server/src/controllers/item-bank/export.controller.ts` | Controller | Create |
| 12 | `apps/server/src/routes/item-bank.routes.ts` | Routes | Edit (add export routes) |
| 13 | `apps/web/src/components/item-bank/ExportDialog.tsx` | Molecule | Create |
| 14 | `apps/server/src/__tests__/item-bank/export.test.ts` | Tests | Create |
| 15 | `apps/server/src/__tests__/item-bank/formatters.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-64 | faculty | Pending | Item bank browser provides selection source |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty role check |

### NPM Packages
- `fast-xml-parser` or `xmlbuilder2` -- QTI 2.1 XML generation
- `papaparse` -- CSV generation
- `inngest` -- Async job processing for large exports (if not already installed)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- Supabase client for Storage bucket
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `apps/server/src/repositories/item-bank.repository.ts` -- Fetch questions for export

## 9. Test Fixtures (inline)

```typescript
// Mock questions for export
export const EXPORT_QUESTIONS = [
  {
    id: "q-uuid-1",
    stem: "Which of the following is the most appropriate initial diagnostic test?",
    vignette: "A 55-year-old male with a history of hypertension...",
    answer_choices: [
      { index: 0, text: "Chest X-ray", is_correct: false },
      { index: 1, text: "12-lead ECG", is_correct: true },
      { index: 2, text: "CT pulmonary angiography", is_correct: false },
      { index: 3, text: "Troponin I level", is_correct: false },
      { index: 4, text: "D-dimer assay", is_correct: false },
    ],
    correct_answer_index: 1,
    rationale: "A 12-lead ECG is the most appropriate initial test...",
    question_type: "single_best_answer",
    difficulty: 0.65,
    bloom_level: "Apply",
    usmle_system: "Cardiovascular",
    usmle_discipline: "Medicine",
    tags: ["acute_coronary_syndrome"],
  },
  {
    id: "q-uuid-2",
    stem: "What is the mechanism of action of metformin?",
    vignette: "A 45-year-old female newly diagnosed with T2DM...",
    answer_choices: [
      { index: 0, text: "Inhibits hepatic gluconeogenesis", is_correct: true },
      { index: 1, text: "Stimulates insulin secretion", is_correct: false },
      { index: 2, text: "Inhibits alpha-glucosidase", is_correct: false },
      { index: 3, text: "Activates PPAR-gamma", is_correct: false },
      { index: 4, text: "Inhibits DPP-4", is_correct: false },
    ],
    correct_answer_index: 0,
    rationale: "Metformin primarily works by inhibiting hepatic gluconeogenesis...",
    question_type: "single_best_answer",
    difficulty: 0.45,
    bloom_level: "Understand",
    usmle_system: "Endocrine",
    usmle_discipline: "Pharmacology",
    tags: ["diabetes", "pharmacology"],
  },
];

// Mock ExamSoft formatted row
export const EXAMSOFT_ROW = {
  QuestionTitle: "Chest Pain Differential",
  QuestionStem: "A 55-year-old male...\nWhich of the following is the most appropriate initial diagnostic test?",
  AnswerA: "Chest X-ray",
  AnswerB: "12-lead ECG",
  AnswerC: "CT pulmonary angiography",
  AnswerD: "Troponin I level",
  AnswerE: "D-dimer assay",
  CorrectAnswer: "B",
  Rationale: "A 12-lead ECG is the most appropriate initial test...",
  Topic: "Cardiovascular",
  Difficulty: "0.65",
  BloomLevel: "Apply",
};

// Mock export response
export const SYNC_EXPORT_RESPONSE = {
  export_id: "export-uuid-1",
  format: "examsoft" as const,
  item_count: 25,
  download_url: "/api/v1/item-bank/export/export-uuid-1/download",
  filename: "item-bank-export-2026-02-19-examsoft.txt",
  expires_at: "2026-02-20T14:30:00Z",
};

// Mock async job response
export const ASYNC_EXPORT_RESPONSE = {
  job_id: "export-job-uuid-1",
  status: "pending" as const,
  estimated_time_seconds: 45,
};

// Faculty user
export const FACULTY_USER = {
  id: "faculty-uuid-1",
  email: "drjones@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/item-bank/export.test.ts`

```
describe("ExportController")
  describe("POST /api/v1/item-bank/export")
    > exports questions in ExamSoft format by IDs
    > exports questions in CSV format by filters
    > exports questions in QTI 2.1 format
    > returns 202 with job_id for >100 items (async)
    > returns 400 when neither question_ids nor filters provided
    > returns 400 when batch exceeds 500 items
    > returns 400 for unsupported format

  describe("GET /api/v1/item-bank/export/:exportId/download")
    > returns file with correct Content-Type for ExamSoft
    > returns 404 for expired export
```

**File:** `apps/server/src/__tests__/item-bank/formatters.test.ts`

```
describe("ExportFormatters")
  describe("ExamSoftFormatter")
    > formats question into tab-delimited ExamSoft row
    > maps correct_answer_index to letter (A-E)
    > combines vignette and stem into QuestionStem field

  describe("QtiFormatter")
    > generates valid QTI 2.1 XML structure
    > includes all answer choices with correct flagged

  describe("CsvFormatter")
    > generates CSV with all metadata columns
    > handles special characters in question text
```

**Total: ~15 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required as standalone. Export flow is tested as part of the Item Bank Browser E2E (STORY-F-64, test 2: "filter + export flow").

## 12. Acceptance Criteria

1. Export accepts array of question IDs or current filter criteria
2. ExamSoft format generates tab-delimited file with correct column structure
3. QTI 2.1 export generates valid XML for LMS compatibility
4. CSV export includes all metadata fields in flat format
5. Export includes stem, vignette, answer choices, correct answer, rationale, tags, difficulty, Bloom level
6. Batch export handles up to 500 items
7. Async job for >100 items with progress notification
8. Download returns file with appropriate Content-Type header
9. Export files stored in Supabase Storage temp bucket with 24h TTL
10. Custom error classes: `ExportError`, `ExportFormatError`
11. All 15 API tests pass
12. TypeScript strict, named exports only, JS `#private` fields

## 13. Source References

| Claim | Source |
|-------|--------|
| ExamSoft tab-delimited | S-F-25-3 SS Notes: "ExamSoft format specifics: tab-delimited with specific column order and encoding requirements" |
| QTI 2.1 XML | S-F-25-3 SS Notes: "QTI 2.1 XML: use XML builder library, validate against QTI schema" |
| Supabase Storage temp bucket | S-F-25-3 SS Notes: "Export file stored in Supabase Storage temp bucket with 24h TTL" |
| Async via Inngest | S-F-25-3 SS Notes: "Large export (>100 items): Inngest async function with completion notification" |
| Strategy pattern | S-F-25-3 SS Notes: "Formatter pattern: strategy pattern with ExportFormatter interface, concrete implementations" |
| Batch limit 500 | S-F-25-3 SS Acceptance Criteria: "Batch export: handles up to 500 items per export" |
| Blocked by item bank | S-F-25-3 SS Dependencies: "Blocked by: S-F-25-1" |

## 14. Environment Prerequisites

- **Supabase:** Project running, `questions` table exists, Supabase Storage configured with temp bucket
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **STORY-F-64 (Item Bank Browser):** Must be complete (selection source)
- **Inngest:** Configured for async job processing (or can be mocked for MVP)
- **No Neo4j needed** for this story

## 15. Figma Make Prototype

```
Frame: Export Dialog (480x360, centered modal)
  ├── Title: "Export Questions" (20px, bold, navy deep)
  ├── Format Radio Cards (vertical, gap-8)
  │   ├── ExamSoft Card (white, border, radio)
  │   │   └── "ExamSoft — Tab-delimited for ExamSoft import"
  │   ├── QTI Card (white, border, radio)
  │   │   └── "QTI 2.1 — XML for LMS compatibility"
  │   └── CSV Card (white, border, selected = navy border)
  │       └── "CSV — Flat format with all metadata"
  ├── Item Count: "Exporting 25 questions" (muted)
  ├── Buttons Row (flex, justify-end)
  │   ├── CancelButton: "Cancel" (outline)
  │   └── ExportButton: "Export" (navy deep, solid)
  └── AsyncProgress (conditional, for >100 items)
      ├── ProgressBar (green fill)
      └── "Processing... estimated 45 seconds"
```
