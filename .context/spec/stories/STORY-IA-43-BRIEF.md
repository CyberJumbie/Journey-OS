# STORY-IA-43 Brief: PDF Export

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-IA-43
old_id: S-IA-31-2
epic: E-31 (LCME Report Export)
feature: F-14 (LCME Compliance & Reporting)
sprint: 39
lane: institutional_admin
lane_priority: 2
within_lane_order: 43
size: M
depends_on:
  - STORY-IA-39 (institutional_admin) — Snapshot data for PDF content
blocks: []
personas_served: [institutional_admin]
```

---

## Section 1: Summary

**What to build:** A server-side PDF generation service that renders a formatted LCME compliance report from a snapshot. The report includes a cover page, executive summary, standard-by-standard breakdown with compliance badges, and an evidence appendix. Institutional admins can trigger PDF export from the snapshot list, and the file downloads as `LCME_Compliance_Report_{institution}_{date}.pdf`.

**Parent epic:** E-31 (LCME Report Export) under F-14 (LCME Compliance & Reporting). This story converts the snapshot data (STORY-IA-39) into a downloadable PDF for LCME site visit documentation.

**User story:** As an institutional admin, I need to export a formatted compliance report as PDF so that I can share it with LCME reviewers during site visits and accreditation reviews.

**Key constraints:**
- Server-side PDF generation using `@react-pdf/renderer` (React-based templates)
- Report structure: cover page, executive summary, standard-by-standard, evidence appendix
- Color-coded compliance badges in PDF (met=green, partial=yellow, unmet=red)
- File size < 10MB for typical institution
- Async generation for large reports (10-30 seconds) with progress notification
- Cached in Supabase Storage for repeated downloads

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Export types | `packages/types/src/compliance/export.types.ts` | 45m |
| 2 | Types barrel export | `packages/types/src/compliance/index.ts` | 10m |
| 3 | PDF report template | `apps/server/src/modules/compliance/services/pdf-templates/report-template.ts` | 3h |
| 4 | PdfExportService | `apps/server/src/modules/compliance/services/pdf-export.service.ts` | 2.5h |
| 5 | Extend SnapshotController | `apps/server/src/modules/compliance/controllers/snapshot.controller.ts` | 1h |
| 6 | Extend snapshot routes | `apps/server/src/modules/compliance/routes/snapshot.routes.ts` | 15m |
| 7 | ExportPdfButton component | `apps/web/src/components/compliance/export-pdf-button.tsx` | 1h |
| 8 | Supabase Storage bucket setup | Supabase MCP | 15m |
| 9 | PdfExportService tests | `apps/server/src/modules/compliance/__tests__/pdf-export.service.test.ts` | 2h |
| 10 | Report template tests | `apps/server/src/modules/compliance/__tests__/report-template.test.ts` | 1.5h |

**Total estimate:** ~12.5h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/compliance/export.types.ts

/** PDF export request (no body, snapshot ID in URL) */
export interface PdfExportParams {
  readonly snapshotId: string;
}

/** PDF export job status */
export type PdfExportStatus = "pending" | "generating" | "complete" | "failed";

/** PDF export job record */
export interface PdfExportJob {
  readonly id: string;
  readonly snapshot_id: string;
  readonly institution_id: string;
  readonly status: PdfExportStatus;
  readonly file_url: string | null;
  readonly file_size_bytes: number | null;
  readonly error_message: string | null;
  readonly created_at: string;
  readonly completed_at: string | null;
}

/** Report template data (derived from snapshot) */
export interface ReportTemplateData {
  readonly institution_name: string;
  readonly report_date: string;
  readonly overall_score: number;
  readonly overall_status: string;
  readonly strengths: readonly string[];
  readonly improvements: readonly string[];
  readonly standards: readonly StandardReportSection[];
}

/** Per-standard section in the PDF */
export interface StandardReportSection {
  readonly standard_number: number;
  readonly standard_name: string;
  readonly aggregate_score: number;
  readonly elements: readonly ElementReportRow[];
}

/** Per-element row in the PDF table */
export interface ElementReportRow {
  readonly element_number: string;
  readonly element_description: string;
  readonly compliance_score: number;
  readonly status: string;
  readonly evidence_count: number;
  readonly total_expected: number;
  readonly evidence_summary: string;
}
```

---

## Section 4: Database Schema (inline, complete)

```sql
-- Migration: create_pdf_export_jobs_table
CREATE TABLE pdf_export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id UUID NOT NULL REFERENCES compliance_snapshots(id),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'complete', 'failed')),
    file_url TEXT,
    file_size_bytes INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_pdf_export_jobs_snapshot_id ON pdf_export_jobs(snapshot_id);
CREATE INDEX idx_pdf_export_jobs_institution_id ON pdf_export_jobs(institution_id);

-- RLS
ALTER TABLE pdf_export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institutional admin reads own institution exports" ON pdf_export_jobs
    FOR SELECT USING (
        institution_id = (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
        AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('institutional_admin', 'superadmin')
    );

CREATE POLICY "Institutional admin creates exports" ON pdf_export_jobs
    FOR INSERT WITH CHECK (
        institution_id = (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
        AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'institutional_admin'
    );

CREATE POLICY "SuperAdmin full access" ON pdf_export_jobs
    FOR ALL USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'superadmin'
    );
```

**Supabase Storage:**
```
Bucket: compliance-reports
Path: {institution_id}/{snapshot_id}/LCME_Compliance_Report_{institution}_{date}.pdf
Access: Private (signed URLs for download)
```

---

## Section 5: API Contract (complete request/response)

### POST /api/v1/compliance/snapshots/:snapshotId/export/pdf (Auth: institutional_admin)

Triggers async PDF generation. Returns immediately with job ID.

**Success Response (202):**
```json
{
  "data": {
    "job_id": "job-uuid-1",
    "status": "pending",
    "estimated_seconds": 15
  },
  "error": null
}
```

### GET /api/v1/compliance/exports/:jobId (Auth: institutional_admin)

Polls export job status.

**Success Response (200) -- In Progress:**
```json
{
  "data": {
    "id": "job-uuid-1",
    "snapshot_id": "snap-uuid-1",
    "status": "generating",
    "file_url": null,
    "created_at": "2026-02-19T14:30:00Z",
    "completed_at": null
  },
  "error": null
}
```

**Success Response (200) -- Complete:**
```json
{
  "data": {
    "id": "job-uuid-1",
    "snapshot_id": "snap-uuid-1",
    "status": "complete",
    "file_url": "https://project.supabase.co/storage/v1/object/sign/compliance-reports/...",
    "file_size_bytes": 2456789,
    "created_at": "2026-02-19T14:30:00Z",
    "completed_at": "2026-02-19T14:30:18Z"
  },
  "error": null
}
```

### GET /api/v1/compliance/snapshots/:snapshotId/export/pdf (Auth: institutional_admin)

Returns cached PDF if already generated, or 404 if not yet exported.

**Success Response (200):** Binary PDF download with headers:
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="LCME_Compliance_Report_Morehouse_2026-02-19.pdf"`

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-institutional_admin role |
| 404 | `SNAPSHOT_NOT_FOUND` | Snapshot ID does not exist |
| 404 | `EXPORT_NOT_FOUND` | Export job ID does not exist |
| 500 | `PDF_GENERATION_FAILED` | PDF rendering failed |

---

## Section 6: Frontend Spec

### ExportPdfButton (molecule)

**Location:** `apps/web/src/components/compliance/export-pdf-button.tsx`

```
ExportPdfButton
  +-- Button ("Export PDF" with FileDown icon)
  +-- States:
  |     +-- idle: Button enabled
  |     +-- generating: Button disabled, spinner + "Generating..."
  |     +-- complete: Auto-download triggered, button resets
  |     +-- error: Error toast, button re-enabled with retry
  +-- Polling: After POST, poll GET /exports/:jobId every 2 seconds until complete/failed
  +-- On complete: trigger browser download of file_url
```

**Props:**
```typescript
interface ExportPdfButtonProps {
  readonly snapshotId: string;
  readonly snapshotLabel: string;
}
```

**Design tokens:**
- Button: Navy Deep `#002c76` primary variant
- Generating state: Spinner + muted text
- Icons: Lucide `FileDown`

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/compliance/export.types.ts` | Types | Create |
| 2 | `packages/types/src/compliance/index.ts` | Types | Edit (add export types) |
| 3 | Supabase migration via MCP (pdf_export_jobs table) | Database | Apply |
| 4 | Supabase Storage bucket via MCP (compliance-reports) | Storage | Create |
| 5 | `apps/server/src/modules/compliance/services/pdf-templates/report-template.ts` | Template | Create |
| 6 | `apps/server/src/modules/compliance/services/pdf-export.service.ts` | Service | Create |
| 7 | `apps/server/src/modules/compliance/controllers/snapshot.controller.ts` | Controller | Edit (add export endpoints) |
| 8 | `apps/server/src/modules/compliance/routes/snapshot.routes.ts` | Routes | Edit (add export routes) |
| 9 | `apps/web/src/components/compliance/export-pdf-button.tsx` | Component | Create |
| 10 | `apps/server/src/modules/compliance/__tests__/pdf-export.service.test.ts` | Tests | Create |
| 11 | `apps/server/src/modules/compliance/__tests__/report-template.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-39 | institutional_admin | **NOT YET** | Snapshot data that the PDF is generated from |

### NPM Packages (new install required)
- `@react-pdf/renderer` -- React-based server-side PDF generation
- Already installed: `@supabase/supabase-js`, `express`, `vitest`

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`
- `apps/server/src/modules/compliance/repositories/snapshot.repository.ts` -- snapshot data retrieval
- `packages/types/src/compliance/snapshot.types.ts` -- snapshot type definitions

---

## Section 9: Test Fixtures (inline)

```typescript
// Mock Institutional Admin
export const INST_ADMIN_USER = {
  sub: "admin-uuid-1",
  email: "admin@med.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock snapshot for PDF generation
export const MOCK_SNAPSHOT_FOR_PDF = {
  id: "snap-uuid-1",
  institution_id: "inst-uuid-1",
  label: "Pre-site visit",
  overall_score: 78.5,
  compliance_data: {
    overall_score: 78.5,
    standards: [
      {
        standard_id: "std-1",
        standard_name: "Mission, Planning, and Integration",
        standard_number: 1,
        aggregate_score: 92.0,
        elements: [
          {
            element_id: "elem-1-1",
            element_number: "1.1",
            element_description: "Strategic Planning",
            compliance_score: 100,
            status: "met",
            evidence_count: 5,
            total_expected: 5,
            evidence_chain_summary: "5/5 complete",
          },
        ],
      },
    ],
    computed_at: "2026-02-19T14:29:55Z",
  },
  created_by: "admin-uuid-1",
  created_at: "2026-02-19T14:30:00Z",
};

// Mock institution data for cover page
export const MOCK_INSTITUTION = {
  id: "inst-uuid-1",
  name: "Morehouse School of Medicine",
};

// Mock export job
export const MOCK_EXPORT_JOB_PENDING = {
  id: "job-uuid-1",
  snapshot_id: "snap-uuid-1",
  institution_id: "inst-uuid-1",
  status: "pending" as const,
  file_url: null,
  file_size_bytes: null,
  error_message: null,
  created_at: "2026-02-19T14:30:00Z",
  completed_at: null,
};

export const MOCK_EXPORT_JOB_COMPLETE = {
  ...MOCK_EXPORT_JOB_PENDING,
  status: "complete" as const,
  file_url: "https://project.supabase.co/storage/v1/object/sign/compliance-reports/inst-uuid-1/snap-uuid-1/report.pdf",
  file_size_bytes: 2456789,
  completed_at: "2026-02-19T14:30:18Z",
};
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/modules/compliance/__tests__/pdf-export.service.test.ts`

```
describe("PdfExportService")
  describe("triggerExport")
    + creates export job with status 'pending'
    + retrieves snapshot data for the given snapshot_id
    + returns 404 if snapshot does not exist
    + rejects if snapshot belongs to different institution

  describe("generatePdf")
    + renders PDF from snapshot data using report template
    + uploads PDF to Supabase Storage in correct path
    + updates job status to 'complete' with file_url and file_size
    + sets job status to 'failed' with error_message on rendering error
    + generates filename: LCME_Compliance_Report_{institution}_{date}.pdf

  describe("getExportJob")
    + returns job by ID
    + returns 404 for non-existent job

  describe("getCachedPdf")
    + returns signed URL if PDF already exists in storage
    + returns null if no cached PDF exists
```

**File:** `apps/server/src/modules/compliance/__tests__/report-template.test.ts`

```
describe("ReportTemplate")
  describe("buildTemplateData")
    + extracts institution name from institution record
    + computes strengths (standards with score >= 90)
    + computes improvements (standards with score < 50)
    + maps all standards with their elements
    + handles empty standards list gracefully

  describe("renderTemplate")
    + renders cover page with institution name and date
    + renders executive summary with overall score
    + renders per-standard section with element table
    + renders evidence appendix
    + uses design token colors for compliance badges
```

**Total: ~18 tests**

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. E2E coverage will validate the snapshot -> export -> download flow when the full pipeline is integrated.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | POST triggers async PDF generation from snapshot data | API test |
| 2 | PDF contains cover page, executive summary, standard breakdown, evidence appendix | Manual |
| 3 | Cover page shows institution name, date, overall score | Manual / template test |
| 4 | Color-coded badges: met=green, partial=yellow, unmet=red | Manual |
| 5 | PDF uploaded to Supabase Storage at correct path | API test |
| 6 | File downloads as LCME_Compliance_Report_{institution}_{date}.pdf | API test |
| 7 | File size < 10MB for typical institution | Manual |
| 8 | Export job polling returns correct status progression | API test |
| 9 | Cached PDFs served without re-generation | API test |
| 10 | Non-institutional_admin roles receive 403 | API test |
| 11 | All ~18 API tests pass | CI |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| PDF export from snapshot data | S-IA-31-2 SS User Story |
| Report structure: cover, summary, standards, appendix | S-IA-31-2 SS Acceptance Criteria |
| Color-coded compliance badges in PDF | S-IA-31-2 SS Acceptance Criteria |
| @react-pdf/renderer for server-side generation | S-IA-31-2 SS Notes |
| File size < 10MB | S-IA-31-2 SS Acceptance Criteria |
| Filename format | S-IA-31-2 SS Acceptance Criteria |
| Async generation with progress notification | S-IA-31-2 SS Notes |
| Caching in Supabase Storage | S-IA-31-2 SS Notes |

---

## Section 14: Environment Prerequisites

- **Supabase:** Project running, `compliance_snapshots` table exists (from STORY-IA-39), `compliance-reports` storage bucket created
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **NPM:** `@react-pdf/renderer` installed in `apps/server`
- **No Neo4j needed** for this story

---

## Section 15: Figma Make Prototype

Recommended: Design the PDF template layout in Figma first, especially the cover page and standard-by-standard tables. The PDF needs to look professional for LCME reviewers. Use institutional branding patterns with design token colors.
