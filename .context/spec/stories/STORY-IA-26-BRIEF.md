# STORY-IA-26 Brief: Sync Status Monitor

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-26
old_id: S-IA-36-4
lane: institutional_admin
lane_priority: 2
within_lane_order: 26
sprint: 9
size: M
depends_on:
  - STORY-IA-5 (institutional_admin) — Admin Dashboard Page
blocks: []
personas_served: [institutional_admin]
epic: E-36 (Admin Dashboard & KPIs)
feature: F-17 (Platform Quality & Admin)
user_flow: UF-25 (Admin Dashboard Monitoring)
```

---

## 1. Summary

Build a **Sync Status Monitor** page that displays dual-write health across all entity types for an institution. The monitor shows per-entity-type sync health (synced, pending, failed counts), color-coded health percentages, expandable failure lists with retry functionality, a 7-day sync health trend chart, and auto-refresh polling every 30 seconds.

The page surfaces data consistency issues between Supabase and Neo4j. Admins can view failed records, see failure reasons, and trigger manual retries (individual or bulk). The sync history chart uses Recharts consistent with other admin analytics.

Key constraints:
- **DualWriteService integration** for retry mechanism
- **sync_status column** exists on all dual-written tables (institutions, users, courses, programs, slos, ilos, concepts, questions)
- **Auto-refresh** via `useInterval` with 30s polling, paused on tab hidden
- **Recharts** for sync health trend line chart
- **SSE** for real-time sync status updates (optional enhancement)

---

## 2. Task Breakdown

Implementation order follows: **Types -> Service -> Controller -> Route -> Hook -> Components -> Page -> Tests**

### Task 1: Create sync monitor types
- **File:** `packages/types/src/admin/sync-monitor.types.ts`
- **Action:** Export `SyncEntityStatus`, `SyncFailureRecord`, `SyncHealthSnapshot`, `SyncMonitorResponse`, `SyncFailuresResponse`

### Task 2: Export types from admin barrel
- **File:** `packages/types/src/admin/index.ts`
- **Action:** Edit to re-export from `sync-monitor.types.ts`

### Task 3: Build SyncMonitorService
- **File:** `apps/server/src/services/admin/sync-monitor.service.ts`
- **Action:** Class with `#supabase` private field. Methods: `getSyncStatus(institutionId)`, `getFailures(institutionId, entityType)`, `retrySync(entityType, entityId)`, `retryAllFailures(institutionId)`, `getSyncHistory(institutionId, days)`.

### Task 4: Build SyncMonitorController
- **File:** `apps/server/src/controllers/admin/sync-monitor.controller.ts`
- **Action:** Handlers for GET /sync/status, GET /sync/failures, POST /sync/retry/:entityType/:entityId, POST /sync/retry-all.

### Task 5: Register sync monitor routes
- **File:** `apps/server/src/routes/admin/sync-monitor.routes.ts`
- **Action:** Wire controller endpoints with RBAC middleware (institutional_admin).

### Task 6: Build useSyncMonitor hook
- **File:** `apps/web/src/hooks/use-sync-monitor.ts`
- **Action:** Named export `useSyncMonitor()`. Fetches sync status, manages auto-refresh with 30s interval (paused on `document.hidden`), returns `{ status, failures, history, isLoading, retry, retryAll }`.

### Task 7: Build SyncStatusTable component
- **File:** `apps/web/src/components/admin/sync-status-table.tsx`
- **Action:** Named export `SyncStatusTable`. Table of entity types with sync health. Color-coded: green (>99%), yellow (95-99%), red (<95%). Expandable rows for failure list.

### Task 8: Build SyncFailureList component
- **File:** `apps/web/src/components/admin/sync-failure-list.tsx`
- **Action:** Named export `SyncFailureList`. Renders individual failed records with failure reason and retry button per record.

### Task 9: Build SyncHistoryChart component
- **File:** `apps/web/src/components/admin/sync-history-chart.tsx`
- **Action:** Named export `SyncHistoryChart`. Recharts line chart showing sync health trend over last 7 days per entity type.

### Task 10: Build Sync Monitor page
- **File:** `apps/web/src/app/(institutional-admin)/admin/sync-monitor/page.tsx`
- **Action:** Default export page. Renders SyncStatusTable, SyncHistoryChart, bulk retry button.

### Task 11: Write API tests
- **File:** `apps/server/src/tests/admin/sync-monitor.test.ts`
- **Action:** 8-10 tests for service and controller.

### Task 12: Write component tests
- **File:** `apps/web/src/__tests__/components/sync-status-table.test.tsx`
- **Action:** 5-7 tests for rendering, color coding, expansion, retry.

---

## 3. Data Model

```typescript
// packages/types/src/admin/sync-monitor.types.ts

/** Sync health status for a single entity type */
export interface SyncEntityStatus {
  readonly entity_type: string;         // e.g., "institutions", "users", "courses"
  readonly total_records: number;
  readonly synced_count: number;
  readonly pending_count: number;
  readonly failed_count: number;
  readonly health_percentage: number;    // 0-100
}

/** A single failed sync record */
export interface SyncFailureRecord {
  readonly id: string;                   // record primary key
  readonly entity_type: string;
  readonly entity_id: string;
  readonly failure_reason: string;
  readonly failed_at: string;            // ISO timestamp
  readonly retry_count: number;
}

/** Daily sync health snapshot for trend chart */
export interface SyncHealthSnapshot {
  readonly date: string;                 // YYYY-MM-DD
  readonly entity_type: string;
  readonly health_percentage: number;
}

/** Response for GET /sync/status */
export interface SyncMonitorResponse {
  readonly entities: readonly SyncEntityStatus[];
  readonly overall_health: number;       // weighted average across all entity types
  readonly last_checked: string;         // ISO timestamp
}

/** Response for GET /sync/failures */
export interface SyncFailuresResponse {
  readonly failures: readonly SyncFailureRecord[];
  readonly total_count: number;
}
```

---

## 4. Database Schema

### New table: `sync_health_snapshots`

```sql
CREATE TABLE sync_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  entity_type TEXT NOT NULL,
  health_percentage NUMERIC(5,2) NOT NULL,
  synced_count INTEGER NOT NULL DEFAULT 0,
  pending_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(institution_id, entity_type, snapshot_date)
);

CREATE INDEX idx_sync_snapshots_institution ON sync_health_snapshots(institution_id, snapshot_date);

-- RLS
ALTER TABLE sync_health_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view own institution sync snapshots"
  ON sync_health_snapshots FOR SELECT
  USING (institution_id = auth.jwt() ->> 'institution_id');
```

**Existing columns used:** All dual-written tables have a `sync_status` column with values: `synced`, `pending`, `failed`, `retrying`.

**Health query per entity type:**
```sql
SELECT
  sync_status,
  COUNT(*)
FROM {table_name}
WHERE institution_id = $institutionId
GROUP BY sync_status;
```

---

## 5. API Contract

### GET /api/v1/admin/sync/status (Auth: InstitutionalAdmin)

**Success Response (200):**
```json
{
  "data": {
    "entities": [
      {
        "entity_type": "courses",
        "total_records": 38,
        "synced_count": 37,
        "pending_count": 0,
        "failed_count": 1,
        "health_percentage": 97.37
      },
      {
        "entity_type": "questions",
        "total_records": 5200,
        "synced_count": 5195,
        "pending_count": 3,
        "failed_count": 2,
        "health_percentage": 99.9
      }
    ],
    "overall_health": 98.5,
    "last_checked": "2026-02-19T12:00:00Z"
  },
  "error": null
}
```

### GET /api/v1/admin/sync/failures?entity_type=courses (Auth: InstitutionalAdmin)

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `entity_type` | string | Filter failures by entity type |

**Success Response (200):**
```json
{
  "data": {
    "failures": [
      {
        "id": "fail-uuid-1",
        "entity_type": "courses",
        "entity_id": "course-uuid-5",
        "failure_reason": "Neo4j connection timeout",
        "failed_at": "2026-02-19T08:30:00Z",
        "retry_count": 2
      }
    ],
    "total_count": 1
  },
  "error": null
}
```

### POST /api/v1/admin/sync/retry/:entityType/:entityId (Auth: InstitutionalAdmin)

**Success Response (200):**
```json
{
  "data": { "status": "retrying", "entity_id": "course-uuid-5" },
  "error": null
}
```

### POST /api/v1/admin/sync/retry-all (Auth: InstitutionalAdmin)

**Success Response (200):**
```json
{
  "data": { "retried_count": 3, "max_per_batch": 100 },
  "error": null
}
```

**Error Responses (all endpoints):**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role not institutional_admin |
| 404 | `NOT_FOUND` | Entity not found (retry endpoints) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 6. Frontend Spec

### Page: `/admin/sync-monitor` (InstitutionalAdmin layout)

**Component hierarchy:**
```
SyncMonitorPage (page.tsx -- default export)
  ├── PageHeader ("Sync Status Monitor")
  ├── OverallHealthBadge (large % indicator)
  ├── BulkRetryButton (retry all failures)
  ├── SyncStatusTable (Organism)
  │     ├── EntityRow × N (per entity type)
  │     │     ├── HealthBar (colored percentage bar)
  │     │     └── (expanded) SyncFailureList
  │     │           └── FailureRow × N
  │     │                 ├── Failure reason text
  │     │                 └── RetryButton
  └── SyncHistoryChart (Recharts line chart)
        └── 7-day trend lines per entity type
```

**States:**
1. **Loading** -- Skeleton table and chart placeholder
2. **Healthy** -- All entity types >99% green
3. **Warning** -- Some entity types 95-99% yellow
4. **Critical** -- Any entity type <95% red
5. **Retrying** -- Spinner on retry button, optimistic status update
6. **Error** -- Error message with retry

**Design tokens:**
- Health green: `#69a338` (>99%)
- Health yellow: `#eab308` (95-99%)
- Health red: `#dc2626` (<95%)
- Surface: `--color-surface-primary` (#ffffff)
- Chart: Recharts with design token colors, 7 data points
- Auto-refresh indicator: subtle pulse animation on "Last checked" timestamp

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/admin/sync-monitor.types.ts` | Types | Create |
| 2 | `packages/types/src/admin/index.ts` | Types | Edit (add export) |
| 3 | `apps/server/src/services/admin/sync-monitor.service.ts` | Service | Create |
| 4 | `apps/server/src/controllers/admin/sync-monitor.controller.ts` | Controller | Create |
| 5 | `apps/server/src/routes/admin/sync-monitor.routes.ts` | Route | Create |
| 6 | `apps/web/src/hooks/use-sync-monitor.ts` | Hook | Create |
| 7 | `apps/web/src/components/admin/sync-status-table.tsx` | Component | Create |
| 8 | `apps/web/src/components/admin/sync-failure-list.tsx` | Component | Create |
| 9 | `apps/web/src/components/admin/sync-history-chart.tsx` | Component | Create |
| 10 | `apps/web/src/app/(institutional-admin)/admin/sync-monitor/page.tsx` | Page | Create |
| 11 | `apps/server/src/tests/admin/sync-monitor.test.ts` | Tests | Create |
| 12 | `apps/web/src/__tests__/components/sync-status-table.test.tsx` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-5 | institutional_admin | **PENDING** | Admin Dashboard Page provides the navigation and layout |

### NPM Packages
- `recharts` -- already installed for admin charts
- No new packages expected

### Existing Files Needed
- `apps/server/src/services/dual-write.service.ts` -- DualWriteService for retry mechanism
- `apps/web/src/lib/api-client.ts` -- authenticated fetch wrapper
- `apps/web/src/components/ui/table.tsx` -- shadcn/ui Table
- `apps/web/src/components/ui/button.tsx` -- shadcn/ui Button
- `apps/web/src/components/ui/badge.tsx` -- shadcn/ui Badge

---

## 9. Test Fixtures

```typescript
export const MOCK_SYNC_ENTITIES: SyncEntityStatus[] = [
  {
    entity_type: "institutions",
    total_records: 1,
    synced_count: 1,
    pending_count: 0,
    failed_count: 0,
    health_percentage: 100,
  },
  {
    entity_type: "courses",
    total_records: 38,
    synced_count: 37,
    pending_count: 0,
    failed_count: 1,
    health_percentage: 97.37,
  },
  {
    entity_type: "questions",
    total_records: 5200,
    synced_count: 5195,
    pending_count: 3,
    failed_count: 2,
    health_percentage: 99.9,
  },
  {
    entity_type: "users",
    total_records: 350,
    synced_count: 310,
    pending_count: 5,
    failed_count: 35,
    health_percentage: 88.57,
  },
];

export const MOCK_FAILURES: SyncFailureRecord[] = [
  {
    id: "fail-uuid-1",
    entity_type: "courses",
    entity_id: "course-uuid-5",
    failure_reason: "Neo4j connection timeout",
    failed_at: "2026-02-19T08:30:00Z",
    retry_count: 2,
  },
  {
    id: "fail-uuid-2",
    entity_type: "questions",
    entity_id: "q-uuid-101",
    failure_reason: "Constraint violation: duplicate node",
    failed_at: "2026-02-19T07:15:00Z",
    retry_count: 1,
  },
];

export const MOCK_HISTORY: SyncHealthSnapshot[] = [
  { date: "2026-02-13", entity_type: "courses", health_percentage: 95.0 },
  { date: "2026-02-14", entity_type: "courses", health_percentage: 96.5 },
  { date: "2026-02-15", entity_type: "courses", health_percentage: 97.0 },
  { date: "2026-02-16", entity_type: "courses", health_percentage: 97.0 },
  { date: "2026-02-17", entity_type: "courses", health_percentage: 97.37 },
  { date: "2026-02-18", entity_type: "courses", health_percentage: 97.37 },
  { date: "2026-02-19", entity_type: "courses", health_percentage: 97.37 },
];

export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/tests/admin/sync-monitor.test.ts`

```
describe("SyncMonitorService")
  describe("getSyncStatus")
    it("returns sync status for all dual-written entity types")
    it("calculates health_percentage correctly per entity type")
    it("computes overall_health as weighted average")
    it("scopes query to given institution_id")
  describe("getFailures")
    it("returns failed records filtered by entity_type")
    it("returns empty array when no failures exist")
  describe("retrySync")
    it("calls DualWriteService.retrySync for the given entity")
    it("throws NotFoundError for non-existent entity")
  describe("retryAllFailures")
    it("processes up to 100 failed records per call")
    it("returns count of retried records")

describe("SyncMonitorController")
  it("GET /sync/status returns 200 with sync data for institutional_admin")
  it("POST /sync/retry-all returns 200 with retry count")
  it("returns 401 for unauthenticated requests")
  it("returns 403 for non-institutional_admin roles")
```

**Total: ~12 API tests**

---

## 11. E2E Test Spec (Playwright)

No E2E tests for this story. The sync monitor is an internal admin tool. Coverage via API tests is sufficient.

---

## 12. Acceptance Criteria

1. SyncMonitorPage renders a table of all dual-written entity types with sync health per type
2. Columns display: entity type, total records, synced count, pending count, failed count, sync health (%)
3. Health color-coded: green (>99%), yellow (95-99%), red (<95%)
4. Failed records expandable to show individual records with failure reason and retry button
5. Manual retry triggers re-sync for individual failed records
6. Bulk retry processes up to 100 failed records per call
7. Sync history chart shows 7-day trend line per entity type
8. Auto-refresh every 30 seconds, paused when tab is hidden
9. Data fetched from GET /api/v1/admin/sync/status and GET /api/v1/admin/sync/failures
10. All ~12 API tests pass
11. All 5-7 component tests pass
12. Named exports only, TypeScript strict, design tokens only

---

## 13. Source References

| Claim | Source |
|-------|--------|
| Sync monitor concept | S-IA-36-4 User Story |
| Dual-written tables list | S-IA-36-4 Notes |
| sync_status column values | S-IA-36-4 Notes |
| Health thresholds (99/95) | S-IA-36-4 Acceptance Criteria |
| Retry mechanism via DualWriteService | S-IA-36-4 Notes |
| 30s auto-refresh | S-IA-36-4 Notes |
| sync_health_snapshots table | S-IA-36-4 Notes |
| Recharts for trend chart | S-IA-36-4 Notes |

---

## 14. Environment Prerequisites

- **Next.js:** Web app running on port 3000
- **Express:** Server running with admin routes
- **Supabase:** Dual-written tables with `sync_status` column populated
- **Neo4j:** Running for DualWriteService retry operations
- **Auth:** InstitutionalAdmin JWT with `institution_id` claim

---

## 15. Figma Make Prototype

No Figma prototype for this story. Follow existing admin dashboard patterns. Use color-coded health bars similar to CI/CD pipeline status monitors.
