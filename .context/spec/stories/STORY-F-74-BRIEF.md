# STORY-F-74 Brief: Exam Export

## 0. Lane & Priority

```yaml
story_id: STORY-F-74
old_id: S-F-27-2
lane: faculty
lane_priority: 3
within_lane_order: 74
sprint: 30
size: M
depends_on:
  - STORY-F-73 (faculty) — Cohort Assignment (exam must be assigned)
blocks: []
personas_served: [faculty]
epic: E-27 (Exam Assignment & Export)
feature: F-12 (Exam Assembly & Delivery)
user_flow: UF-20 (Exam Assembly & Assignment)
```

## 1. Summary

Build an **exam export** feature that allows faculty to download an assembled exam in platform-compatible formats: QTI 2.1 (IMS Global standard), CSV, and JSON. Each format includes items with metadata, correct answers, and distractors. The export generates a ZIP file containing all items and metadata, logs an audit entry, and supports streaming for large exams. Only exams in 'assigned' or 'completed' status can be exported.

This is the second story in E-27: F-73 (assignment) -> **F-74 (export)** / F-75 (lifecycle).

Key constraints:
- **Strategy pattern** — format-specific exporters (QTI, CSV, JSON) with common interface
- QTI 2.1 is the IMS Global standard for assessment interoperability
- ZIP generation uses `archiver` npm package
- Large exports (500+ items) use streaming response
- Export audit log entry (who, when, format)
- Only 'assigned' or 'completed' exams can be exported

## 2. Task Breakdown

1. **Types** — Create `ExportFormat`, `ExportRequest`, `ExportResult`, `ExamExporter` interface in `packages/types/src/exam/export.types.ts`
2. **Error classes** — `ExportError`, `InvalidExportStatusError` in `apps/server/src/modules/exam/errors/export.errors.ts`
3. **QTI Exporter** — `QtiExporter` implementing `ExamExporter` interface for IMS QTI 2.1 XML
4. **CSV Exporter** — `CsvExporter` implementing `ExamExporter` interface
5. **JSON Exporter** — `JsonExporter` implementing `ExamExporter` interface
6. **Service** — `ExamExportService` with `export()` method orchestrating format selection + ZIP generation
7. **Controller** — `ExamExportController` with `handleExport()` method
8. **Routes** — Protected route `GET /api/v1/exams/:examId/export` with RBAC
9. **Frontend component** — `ExportDialog` with format selector and download button
10. **API tests** — 12 tests covering QTI/CSV/JSON export, status validation, audit

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/exam/export.types.ts

/** Supported export formats */
export type ExportFormat = "qti" | "csv" | "json";

/** Export request query parameters */
export interface ExportRequest {
  readonly format: ExportFormat;
}

/** Export result metadata (for audit) */
export interface ExportResult {
  readonly exam_id: string;
  readonly exam_title: string;
  readonly format: ExportFormat;
  readonly item_count: number;
  readonly file_name: string;
  readonly file_size_bytes: number;
  readonly exported_by: string;
  readonly exported_at: string;
}

/** Exam data prepared for export */
export interface ExamExportData {
  readonly exam_id: string;
  readonly title: string;
  readonly description: string;
  readonly time_limit_minutes: number;
  readonly passing_score: number;
  readonly blueprint_name: string;
  readonly item_count: number;
  readonly items: readonly ExportItem[];
}

/** Single item in export format */
export interface ExportItem {
  readonly position: number;
  readonly stem: string;
  readonly vignette?: string;
  readonly options: readonly ExportOption[];
  readonly correct_answer: string;          // A-E
  readonly rationale?: string;
  readonly usmle_system: string;
  readonly discipline: string;
  readonly bloom_level: string;
  readonly difficulty: string;
}

/** Option in export format */
export interface ExportOption {
  readonly label: string;                   // A, B, C, D, E
  readonly text: string;
}

/** Exporter strategy interface */
export interface ExamExporter {
  readonly format: ExportFormat;
  export(data: ExamExportData): Promise<Buffer>;
  getContentType(): string;
  getFileExtension(): string;
}

/** Export audit log entry */
export interface ExportAuditEntry {
  readonly action: "exam_exported";
  readonly exam_id: string;
  readonly format: ExportFormat;
  readonly item_count: number;
  readonly exported_by: string;
  readonly timestamp: string;
}
```

## 4. Database Schema (inline, complete)

No new tables needed. Uses existing tables:

```sql
-- Existing tables used:

-- exams (from F-71) — read exam metadata, check status
-- exam_items (from F-71) — read item sequence
-- items/questions (from item bank, F-64) — read full item data

-- Export audit goes into existing audit_log table:
-- audit_log.action = 'exam_exported'
-- audit_log.entity_type = 'exam'
-- audit_log.entity_id = exam_id
-- audit_log.metadata = { format, item_count }
```

## 5. API Contract (complete request/response)

### GET /api/v1/exams/:examId/export (Auth: Faculty)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `examId` | string (UUID) | The exam to export |

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | string | Yes | Export format: `qti`, `csv`, `json` |

**Success Response (200) — Binary download:**
- **Content-Type:** `application/zip`
- **Content-Disposition:** `attachment; filename="USMLE-Step-1-Practice-Exam_qti.zip"`
- **Body:** ZIP file containing exported items

**ZIP contents by format:**

**QTI 2.1:**
```
exam-export/
  imsmanifest.xml
  items/
    item_001.xml
    item_002.xml
    ...
  metadata.json
```

**CSV:**
```
exam-export/
  items.csv           # question,option_a,option_b,...,correct_answer,system,discipline,bloom
  metadata.json
```

**JSON:**
```
exam-export/
  exam.json           # full exam data matching internal model
  metadata.json
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role or not exam owner |
| 400 | `INVALID_EXPORT_STATUS` | Exam not in 'assigned' or 'completed' status |
| 400 | `VALIDATION_ERROR` | Missing or invalid format parameter |
| 404 | `NOT_FOUND` | Exam not found |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Component: Export Dialog (in Exam Management)

**Trigger:** "Export" button on exam card or detail page (visible for assigned/completed exams)

**Component hierarchy:**
```
ExportDialog (organism — client component)
  ├── ExamSummaryLine (title, item count, status)
  ├── FormatSelector (radio group)
  │     ├── QTI 2.1 option (with description: "IMS Global standard, compatible with ExamSoft, Canvas")
  │     ├── CSV option (with description: "Spreadsheet format, compatible with Excel, Google Sheets")
  │     └── JSON option (with description: "Internal format, for re-import into Journey OS")
  ├── ExportButton ("Download ZIP" — primary)
  ├── ProgressIndicator (for large exports)
  └── CancelButton
```

**States:**
1. **Idle** — Dialog open, format selector visible
2. **Exporting** — Progress indicator active, button disabled
3. **Downloaded** — Success toast, download initiated
4. **Error** — Error message with retry button

**Design tokens:**
- Format selector: White `#ffffff` cards with Navy Deep `#002c76` border on selection
- Export button: Green `#69a338` primary
- Progress: Navy Deep `#002c76` progress bar
- Surface: White `#ffffff` dialog

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/exam/export.types.ts` | Types | Create |
| 2 | `packages/types/src/exam/index.ts` | Types | Edit (add export types) |
| 3 | `apps/server/src/modules/exam/errors/export.errors.ts` | Errors | Create |
| 4 | `apps/server/src/modules/exam/services/exporters/exam-exporter.interface.ts` | Interface | Create |
| 5 | `apps/server/src/modules/exam/services/exporters/qti-exporter.ts` | Service | Create |
| 6 | `apps/server/src/modules/exam/services/exporters/csv-exporter.ts` | Service | Create |
| 7 | `apps/server/src/modules/exam/services/exporters/json-exporter.ts` | Service | Create |
| 8 | `apps/server/src/modules/exam/services/exam-export.service.ts` | Service | Create |
| 9 | `apps/server/src/modules/exam/controllers/exam-export.controller.ts` | Controller | Create |
| 10 | `apps/server/src/modules/exam/routes/exam-export.routes.ts` | Routes | Create |
| 11 | `apps/web/src/components/exam/export-dialog.tsx` | Component | Create |
| 12 | `apps/server/src/modules/exam/__tests__/exam-export.service.test.ts` | Tests | Create |
| 13 | `apps/server/src/modules/exam/__tests__/qti-exporter.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-73 | faculty | pending | Cohort Assignment — exam must be assigned before export |

### NPM Packages
- `archiver` — ZIP file generation — **NEW, must install**
- `fast-xml-parser` — QTI XML generation (may already be installed from F-69) — verify
- `csv-stringify` — CSV generation — **NEW, must install**
- `@supabase/supabase-js` — Supabase client (installed)
- `express` — Server framework (installed)
- `vitest` — Testing (installed)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.FACULTY)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`
- Exam and exam_items tables from F-71
- Item bank data from F-64

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

// Mock assigned exam (exportable)
export const MOCK_ASSIGNED_EXAM = {
  id: "exam-uuid-1",
  blueprint_id: "bp-uuid-1",
  created_by: "faculty-uuid-1",
  title: "USMLE Step 1 Practice Exam",
  description: "Spring 2026 practice exam",
  time_limit_minutes: 180,
  passing_score: 70,
  status: "assigned" as const,
  item_count: 3,
  institution_id: "inst-uuid-1",
};

// Mock draft exam (NOT exportable)
export const MOCK_DRAFT_EXAM = {
  ...MOCK_ASSIGNED_EXAM,
  id: "exam-uuid-2",
  status: "draft" as const,
};

// Mock export items
export const MOCK_EXPORT_ITEMS = [
  {
    position: 1,
    stem: "A 65-year-old man presents with chest pain and dyspnea on exertion. Physical examination reveals a systolic ejection murmur.",
    options: [
      { label: "A", text: "Aortic stenosis" },
      { label: "B", text: "Mitral regurgitation" },
      { label: "C", text: "Pericarditis" },
      { label: "D", text: "Myocardial infarction" },
      { label: "E", text: "Pulmonary embolism" },
    ],
    correct_answer: "A",
    rationale: "The systolic ejection murmur is characteristic of aortic stenosis.",
    usmle_system: "Cardiovascular",
    discipline: "Pathology",
    bloom_level: "Apply",
    difficulty: "medium",
  },
  {
    position: 2,
    stem: "A 30-year-old woman presents with fatigue and pallor.",
    options: [
      { label: "A", text: "Iron deficiency anemia" },
      { label: "B", text: "B12 deficiency" },
      { label: "C", text: "Folate deficiency" },
      { label: "D", text: "Thalassemia" },
      { label: "E", text: "Sickle cell disease" },
    ],
    correct_answer: "A",
    usmle_system: "Hematology",
    discipline: "Pathology",
    bloom_level: "Analyze",
    difficulty: "easy",
  },
];

// Mock exam export data
export const MOCK_EXPORT_DATA = {
  exam_id: "exam-uuid-1",
  title: "USMLE Step 1 Practice Exam",
  description: "Spring 2026 practice exam",
  time_limit_minutes: 180,
  passing_score: 70,
  blueprint_name: "USMLE Step 1",
  item_count: 2,
  items: MOCK_EXPORT_ITEMS,
};

// Expected CSV output
export const EXPECTED_CSV_HEADER = "position,stem,option_a,option_b,option_c,option_d,option_e,correct_answer,usmle_system,discipline,bloom_level,difficulty";
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/modules/exam/__tests__/exam-export.service.test.ts`

```
describe("ExamExportService")
  describe("export")
    - exports exam as QTI 2.1 ZIP
    - exports exam as CSV ZIP
    - exports exam as JSON ZIP
    - creates audit log entry with format and item count
    - rejects export of draft exam (InvalidExportStatusError)
    - rejects export of non-existent exam (NotFoundError)
    - includes metadata.json in ZIP for all formats
    - handles large exams (500+ items) with streaming
```

**File:** `apps/server/src/modules/exam/__tests__/qti-exporter.test.ts`

```
describe("QtiExporter")
  describe("export")
    - generates valid QTI 2.1 XML per item
    - includes imsmanifest.xml with item references
    - includes correct answer and distractors
    - includes item metadata (system, discipline, bloom)
  describe("getContentType")
    - returns application/zip
  describe("getFileExtension")
    - returns .zip
```

**Total: ~14 tests** (8 service + 6 QTI exporter)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Export E2E will be covered when the full exam lifecycle flow is testable.

## 12. Acceptance Criteria

1. Faculty can export exams in QTI 2.1, CSV, and JSON formats
2. QTI export includes item metadata, correct answers, and distractors
3. CSV export with columns: question, options A-E, correct answer, system, discipline, bloom
4. JSON export matches internal data model for re-import
5. Export includes exam metadata: title, time limit, passing score, blueprint reference
6. Download as ZIP file containing all items and metadata
7. Export audit log entry records who exported, when, and format
8. Only exams in 'assigned' or 'completed' status can be exported
9. Progress indicator for large exam exports
10. All ~14 API tests pass
11. TypeScript strict, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| Export in QTI, CSV, JSON | S-F-27-2 § Acceptance Criteria |
| QTI 2.1 IMS standard | S-F-27-2 § Notes: "IMS Global standard for assessment interoperability" |
| Strategy pattern for exporters | S-F-27-2 § Notes: "strategy pattern with common interface" |
| ZIP with archiver | S-F-27-2 § Notes: "archiver npm package" |
| Streaming for large exports | S-F-27-2 § Notes: "500+ items should use streaming response" |
| Export audit log | S-F-27-2 § Acceptance Criteria |
| Status restriction: assigned or completed | S-F-27-2 § Acceptance Criteria |

## 14. Environment Prerequisites

- **Supabase:** Project running, `exams` and `exam_items` tables (from F-71), item bank tables (from F-64), `audit_log` table
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story

## 15. Figma / Make Prototype

No Figma designs available. Build export dialog from component hierarchy above using shadcn/ui Dialog, RadioGroup, Button, Progress components. Simple format selection + download pattern.
