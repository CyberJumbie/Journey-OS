# STORY-IA-15 Brief: Nightly Coverage Job

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-15
old_id: S-IA-28-4
lane: institutional_admin
lane_priority: 2
within_lane_order: 15
sprint: 8
size: S
depends_on:
  - STORY-IA-3 (institutional_admin) — Coverage Computation Service
blocks:
  - STORY-IA-29 — Coverage Alert Service
personas_served: [institutional_admin]
epic: E-28 (Coverage Computation & Heatmap)
feature: F-13 (USMLE Coverage Analytics)
user_flow: UF-22 (Institutional Coverage Analysis)
```

---

## 1. Summary

Build a **nightly Inngest cron job** (`coverage/nightly-recompute`) that recomputes the USMLE coverage matrix for all active institutions at 2:00 AM UTC daily. The job iterates over each institution, calls `CoverageComputationService.computeForInstitution()` (from STORY-IA-3), compares the new snapshot to the previous one to detect new gaps and resolved gaps, stores results in the `coverage_snapshots` table, and emits a `coverage.gaps.detected` event when new gaps are found. Includes retry logic (3 retries with exponential backoff) and telemetry logging.

Key constraints:
- **Inngest cron:** `"0 2 * * *"` for daily 2 AM UTC
- **Reuses** `CoverageComputationService.computeForInstitution()` from IA-3
- **Gap detection:** Compare matrix cells between old and new snapshots
- **Event emission:** `coverage.gaps.detected` for downstream alert service
- **Retention:** Keep last 30 snapshots per institution, prune older ones
- **Retry:** 3 retries with exponential backoff on transient Neo4j failures

---

## 2. Task Breakdown

Implementation order follows: **Types -> Config -> Job -> Tests**

### Task 1: Create coverage job types
- **File:** `packages/types/src/coverage/jobs.types.ts`
- **Action:** Export `NightlyCoverageJobPayload`, `CoverageGapEvent`, `CoverageJobTelemetry`, `GapDelta`

### Task 2: Update coverage barrel export
- **File:** `packages/types/src/coverage/index.ts`
- **Action:** Re-export from `jobs.types.ts`

### Task 3: Update Inngest config
- **File:** `apps/server/src/config/inngest.config.ts`
- **Action:** Register the `coverage/nightly-recompute` function with cron schedule

### Task 4: Build nightly coverage job
- **File:** `apps/server/src/services/coverage/nightly-coverage.job.ts`
- **Action:** Inngest function that iterates institutions, computes snapshots, detects gaps, emits events, prunes old snapshots

### Task 5: Write job tests
- **File:** `apps/server/src/tests/coverage/nightly-coverage.job.test.ts`
- **Action:** 5-8 tests covering scheduled execution, snapshot creation, gap detection, retry on failure, event emission

---

## 3. Data Model

```typescript
// packages/types/src/coverage/jobs.types.ts

/** Payload for the nightly coverage job */
export interface NightlyCoverageJobPayload {
  readonly triggered_at: string;
  readonly trigger_type: "cron" | "manual";
}

/** A single gap delta between snapshots */
export interface GapDelta {
  readonly system: string;
  readonly discipline: string;
  readonly previous_gap_count: number;
  readonly new_gap_count: number;
  readonly delta: number;           // positive = new gaps, negative = resolved
}

/** Event emitted when new gaps are detected */
export interface CoverageGapEvent {
  readonly institution_id: string;
  readonly new_gaps: readonly GapDelta[];
  readonly resolved_gaps: readonly GapDelta[];
  readonly snapshot_id: string;
  readonly timestamp: string;
}

/** Telemetry for job execution */
export interface CoverageJobTelemetry {
  readonly job_id: string;
  readonly started_at: string;
  readonly completed_at: string;
  readonly duration_ms: number;
  readonly institutions_processed: number;
  readonly institutions_failed: number;
  readonly total_gaps_detected: number;
  readonly total_gaps_resolved: number;
  readonly errors: readonly string[];
}
```

---

## 4. Database Schema

Uses existing `coverage_snapshots` table (from STORY-IA-3). No new tables.

```sql
-- Migration: add_coverage_snapshot_pruning_index
-- Supports efficient pruning of old snapshots

CREATE INDEX IF NOT EXISTS idx_coverage_snapshots_institution_created
  ON coverage_snapshots(institution_id, created_at DESC);

-- Add job telemetry table
CREATE TABLE coverage_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  institutions_processed INTEGER DEFAULT 0,
  institutions_failed INTEGER DEFAULT 0,
  total_gaps_detected INTEGER DEFAULT 0,
  total_gaps_resolved INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coverage_job_runs_created
  ON coverage_job_runs(created_at DESC);
```

**Existing table used (from IA-3):**
```
coverage_snapshots (
  id UUID PK,
  institution_id UUID FK -> institutions(id),
  matrix JSONB NOT NULL,          -- 16x7 coverage matrix
  total_score NUMERIC,
  computed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```

**Pruning query:**
```sql
-- Keep last 30 snapshots per institution, delete older
DELETE FROM coverage_snapshots
WHERE id NOT IN (
  SELECT id FROM coverage_snapshots
  WHERE institution_id = $institution_id
  ORDER BY created_at DESC
  LIMIT 30
);
```

---

## 5. API Contract

No new API endpoints. The nightly job is triggered by Inngest cron. An optional manual trigger endpoint is available:

### POST /api/v1/admin/coverage/recompute (Auth: SuperAdmin only)

**Request Body:**
```json
{ "institution_id": "inst-uuid-1" }
```

**Success Response (202):**
```json
{
  "data": { "job_id": "job-uuid-1", "status": "queued" },
  "error": null
}
```

This endpoint triggers the same job logic for a single institution on-demand.

---

## 6. Frontend Spec

No frontend components in this story. The nightly job is a background service.

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/coverage/jobs.types.ts` | Types | Create |
| 2 | `packages/types/src/coverage/index.ts` | Types | Edit (add jobs export) |
| 3 | Supabase migration via MCP (job_runs table + index) | Database | Apply |
| 4 | `apps/server/src/config/inngest.config.ts` | Config | Edit (register cron function) |
| 5 | `apps/server/src/services/coverage/nightly-coverage.job.ts` | Service | Create |
| 6 | `apps/server/src/tests/coverage/nightly-coverage.job.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-3 | institutional_admin | **PENDING** | CoverageComputationService.computeForInstitution() is the core compute function |

### NPM Packages
- `inngest` -- Job scheduling and execution
- `@supabase/supabase-js` -- Supabase client
- `neo4j-driver` -- Neo4j driver (used by CoverageComputationService)
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/services/coverage/coverage-computation.service.ts` -- `CoverageComputationService` (from IA-3)
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/config/inngest.config.ts` -- Inngest client instance

---

## 9. Test Fixtures

```typescript
import { CoverageGapEvent, CoverageJobTelemetry, GapDelta } from "@journey-os/types";

// Mock institutions list
export const MOCK_ACTIVE_INSTITUTIONS = [
  { id: "inst-uuid-1", name: "Morehouse School of Medicine", status: "active" },
  { id: "inst-uuid-2", name: "Howard University COM", status: "active" },
];

// Mock previous snapshot matrix (simplified -- one cell shown)
export const MOCK_PREVIOUS_MATRIX = {
  "Cardiovascular": { "Anatomy": { assessed_count: 8, total_count: 10, gap_count: 2 } },
  "Respiratory": { "Anatomy": { assessed_count: 5, total_count: 10, gap_count: 5 } },
};

// Mock new snapshot matrix (gaps changed)
export const MOCK_NEW_MATRIX = {
  "Cardiovascular": { "Anatomy": { assessed_count: 10, total_count: 10, gap_count: 0 } },
  "Respiratory": { "Anatomy": { assessed_count: 4, total_count: 10, gap_count: 6 } },
};

// Expected gap deltas
export const EXPECTED_RESOLVED_GAP: GapDelta = {
  system: "Cardiovascular",
  discipline: "Anatomy",
  previous_gap_count: 2,
  new_gap_count: 0,
  delta: -2,
};

export const EXPECTED_NEW_GAP: GapDelta = {
  system: "Respiratory",
  discipline: "Anatomy",
  previous_gap_count: 5,
  new_gap_count: 6,
  delta: 1,
};

// Mock successful telemetry
export const MOCK_JOB_TELEMETRY: CoverageJobTelemetry = {
  job_id: "job-uuid-1",
  started_at: "2026-02-19T02:00:00Z",
  completed_at: "2026-02-19T02:01:30Z",
  duration_ms: 90000,
  institutions_processed: 2,
  institutions_failed: 0,
  total_gaps_detected: 1,
  total_gaps_resolved: 1,
  errors: [],
};

// Mock coverage snapshot row
export const MOCK_COVERAGE_SNAPSHOT = {
  id: "snap-uuid-1",
  institution_id: "inst-uuid-1",
  matrix: MOCK_NEW_MATRIX,
  total_score: 0.85,
  computed_at: "2026-02-19T02:00:30Z",
  created_at: "2026-02-19T02:00:30Z",
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/tests/coverage/nightly-coverage.job.test.ts`

```
describe("NightlyCoverageJob")
  describe("execute")
    it("iterates over all active institutions and computes coverage for each")
    it("stores new coverage snapshot in Supabase for each institution")
    it("detects new gaps by comparing previous and new snapshot matrices")
    it("detects resolved gaps by comparing previous and new snapshot matrices")
    it("emits coverage.gaps.detected event when new gaps are found")
    it("does NOT emit event when no new gaps are detected")
    it("records job telemetry with duration and institution counts")
    it("retries up to 3 times on transient Neo4j failure with exponential backoff")
    it("prunes snapshots older than the 30th for each institution")
    it("continues processing remaining institutions when one fails")
```

**Total: ~10 tests**

---

## 11. E2E Test Spec

Not required for this story. Background jobs are tested via API tests.

---

## 12. Acceptance Criteria

1. Inngest cron job `coverage/nightly-recompute` is registered with schedule `"0 2 * * *"`
2. Job iterates all active institutions and computes fresh coverage snapshots
3. New snapshots are stored in `coverage_snapshots` table
4. Gap detection compares new vs previous snapshot cell-by-cell
5. `coverage.gaps.detected` event emitted when new gaps found
6. Retry logic: 3 retries with exponential backoff on transient failures
7. Job telemetry recorded: duration, institutions processed, errors
8. Old snapshots pruned (keep last 30 per institution)
9. Job continues processing other institutions when one fails
10. All 10 API tests pass

---

## 13. Source References

| Claim | Source |
|-------|--------|
| Inngest cron syntax | S-IA-28-4 Notes |
| 2 AM UTC schedule | S-IA-28-4 Acceptance Criteria |
| Gap detection logic | S-IA-28-4 Notes: compare gap_count per cell |
| Event payload format | S-IA-28-4 Notes |
| 30-snapshot retention | S-IA-28-4 Notes |
| CoverageComputationService reuse | S-IA-28-4 Notes |

---

## 14. Environment Prerequisites

- **Supabase:** Project running, `coverage_snapshots` and `institutions` tables exist
- **Neo4j:** Instance running with concept graph and TEACHES relationships
- **Inngest:** Dev server running for local testing
- **STORY-IA-3 must be complete** -- CoverageComputationService must exist

---

## 15. Implementation Notes

- **Inngest function pattern:** Use `inngest.createFunction({ id: "coverage/nightly-recompute", ... }, { cron: "0 2 * * *" }, handler)`. The handler receives Inngest step tools for retries.
- **Gap detection algorithm:** For each cell in the 16x7 matrix, compare `previous.matrix[system][discipline].gap_count` vs `new.matrix[system][discipline].gap_count`. A positive delta means new gaps; negative means resolved.
- **Error isolation:** Wrap each institution computation in try/catch. Log the error, increment `institutions_failed`, and continue to the next institution. Never let one institution failure abort the entire job.
- **Exponential backoff:** On Neo4j connection errors, retry after 1s, 2s, 4s. Use Inngest's built-in retry with `retries: 3` and `backoff: "exponential"`.
- **Pruning strategy:** After inserting the new snapshot, delete any snapshots for that institution where `created_at` is older than the 30th most recent. Use a subquery with `ORDER BY created_at DESC OFFSET 30`.
- **Manual trigger:** The optional `/api/v1/admin/coverage/recompute` endpoint sends an Inngest event that triggers the same function for a single institution. Useful for debugging.
- **Private fields pattern:** The job handler is a standalone Inngest function, not a class. It receives `CoverageComputationService` via the Inngest function context or imports it directly.
