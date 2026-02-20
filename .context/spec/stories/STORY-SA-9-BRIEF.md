# STORY-SA-9 Brief: Institution Detail View

## 0. Lane & Priority

```yaml
story_id: STORY-SA-9
old_id: S-SA-05-2
lane: superadmin
lane_priority: 1
within_lane_order: 9
sprint: 9
size: M
depends_on:
  - STORY-SA-7 (superadmin) — Institution List Dashboard (navigation source)
blocks: []
personas_served: [superadmin]
epic: E-05 (Institution Monitoring)
feature: F-02 (Institution Management)
user_flow: UF-05 (Institution Monitoring)
```

## 1. Summary

Build an **institution detail view** at `/admin/institutions/[id]` showing comprehensive usage metrics, user breakdown by role, activity timeline, storage usage, and trend charts. SuperAdmin navigates here by clicking a row in the institution list (SA-7). The page provides a holistic health assessment of each institution including monthly active users (line chart) and questions generated per month (bar chart) using Recharts.

This is the third step in the E-05 Institution Monitoring pipeline: SA-7 (list) → SA-8 (suspend/reactivate) → **SA-9 (detail view)**.

Key constraints:
- **SuperAdmin only** — RBAC enforced
- Dynamic route: `/admin/institutions/[id]` with UUID segment
- Charts: Recharts for monthly trends (lightweight, React-native)
- Metrics aggregated from multiple tables (profiles, courses, activity_events, uploaded_documents)
- Some tables may not exist yet — gracefully return 0/null for missing data
- Back navigation to institution list

## 2. Task Breakdown

1. **Types** — Create `InstitutionDetail`, `InstitutionMetrics`, `UserBreakdown`, `ActivityEvent`, `MonthlyTrend` in `packages/types/src/admin/institution-detail.types.ts`
2. **Service** — Extend `InstitutionMonitoringService` with `getDetail()` method
3. **Controller** — Update `InstitutionController` with `handleGetDetail()` method
4. **Routes** — Protected route `GET /api/v1/admin/institutions/:id/detail`
5. **Molecules** — `MetricCard`, `UsageChart` in packages/ui
6. **Organisms** — `InstitutionDetailHeader`, `InstitutionMetricsGrid`, `UserBreakdownTable`, `InstitutionActivityTimeline`
7. **Page** — `/admin/institutions/[id]` dynamic page
8. **Hook** — `useInstitutionDetail()` for data fetching
9. **Wire up** — Register route in `apps/server/src/index.ts`
10. **API tests** — 10 tests covering detail, metrics, auth

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/admin/institution-detail.types.ts

/** Full institution detail (returned by GET /:id/detail) */
export interface InstitutionDetail {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly institution_type: string | null;
  readonly accreditation_body: string | null;
  readonly status: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly metrics: InstitutionMetrics;
  readonly user_breakdown: readonly UserBreakdownEntry[];
  readonly activity_timeline: readonly ActivityTimelineEntry[];
  readonly monthly_active_users: readonly MonthlyTrend[];
  readonly monthly_questions: readonly MonthlyTrend[];
  readonly storage: StorageUsage;
}

/** Aggregated usage metrics */
export interface InstitutionMetrics {
  readonly total_users: number;
  readonly active_users_30d: number;
  readonly total_courses: number;
  readonly total_questions_generated: number;
  readonly total_questions_approved: number;
}

/** User count per role */
export interface UserBreakdownEntry {
  readonly role: string;
  readonly count: number;
}

/** Activity timeline entry */
export interface ActivityTimelineEntry {
  readonly id: string;
  readonly action: string;
  readonly actor_name: string;
  readonly actor_email: string;
  readonly description: string;
  readonly created_at: string;
}

/** Monthly trend data point for charts */
export interface MonthlyTrend {
  readonly month: string;  // "2026-01", "2026-02"
  readonly value: number;
}

/** Storage usage statistics */
export interface StorageUsage {
  readonly document_count: number;
  readonly total_size_bytes: number;
}
```

## 4. Database Schema (inline, complete)

No new tables needed. Reads from existing tables with aggregation queries.

```sql
-- Existing tables used for aggregation:

-- institutions (primary record)
-- institutions.id UUID PK
-- institutions.name TEXT
-- institutions.domain TEXT
-- institutions.institution_type TEXT
-- institutions.accreditation_body TEXT
-- institutions.status TEXT
-- institutions.created_at TIMESTAMPTZ

-- profiles (user metrics)
-- profiles.institution_id UUID FK -> institutions(id)
-- profiles.role TEXT

-- User breakdown query:
-- SELECT role, COUNT(*) as count
-- FROM profiles
-- WHERE institution_id = $id
-- GROUP BY role

-- Active users (last 30 days):
-- SELECT COUNT(DISTINCT p.id)
-- FROM profiles p
-- JOIN activity_events ae ON ae.user_id = p.id
-- WHERE p.institution_id = $id
--   AND ae.created_at > NOW() - INTERVAL '30 days'

-- courses (course count — may not exist yet)
-- courses.institution_id UUID FK -> institutions(id)

-- questions (question metrics — may not exist yet)
-- questions.institution_id UUID FK
-- questions.status TEXT ('generated', 'approved', etc.)

-- activity_events (timeline — may not exist yet)
-- activity_events.institution_id UUID FK
-- activity_events.action TEXT
-- activity_events.user_id UUID FK
-- activity_events.created_at TIMESTAMPTZ

-- uploaded_documents (storage — may not exist yet)
-- uploaded_documents.institution_id UUID FK
-- uploaded_documents.file_size BIGINT

-- Monthly active users trend:
-- SELECT DATE_TRUNC('month', ae.created_at) as month, COUNT(DISTINCT ae.user_id) as value
-- FROM activity_events ae
-- JOIN profiles p ON p.id = ae.user_id
-- WHERE p.institution_id = $id
--   AND ae.created_at > NOW() - INTERVAL '12 months'
-- GROUP BY month
-- ORDER BY month
```

## 5. API Contract (complete request/response)

### GET /api/v1/admin/institutions/:id/detail (Auth: SuperAdmin only)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | The institution ID |

**Success Response (200):**
```json
{
  "data": {
    "id": "inst-uuid-1",
    "name": "Morehouse School of Medicine",
    "domain": "msm.edu",
    "institution_type": "md",
    "accreditation_body": "LCME",
    "status": "approved",
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-02-19T10:00:00Z",
    "metrics": {
      "total_users": 450,
      "active_users_30d": 320,
      "total_courses": 12,
      "total_questions_generated": 1500,
      "total_questions_approved": 1200
    },
    "user_breakdown": [
      { "role": "institutional_admin", "count": 3 },
      { "role": "faculty", "count": 47 },
      { "role": "student", "count": 390 },
      { "role": "advisor", "count": 10 }
    ],
    "activity_timeline": [
      {
        "id": "event-1",
        "action": "course_created",
        "actor_name": "Dr. Jane Smith",
        "actor_email": "jsmith@msm.edu",
        "description": "Created course: Clinical Medicine II",
        "created_at": "2026-02-19T14:30:00Z"
      }
    ],
    "monthly_active_users": [
      { "month": "2025-09", "value": 150 },
      { "month": "2025-10", "value": 200 },
      { "month": "2025-11", "value": 280 },
      { "month": "2025-12", "value": 250 },
      { "month": "2026-01", "value": 300 },
      { "month": "2026-02", "value": 320 }
    ],
    "monthly_questions": [
      { "month": "2025-09", "value": 100 },
      { "month": "2025-10", "value": 200 },
      { "month": "2025-11", "value": 350 },
      { "month": "2025-12", "value": 280 },
      { "month": "2026-01", "value": 400 },
      { "month": "2026-02", "value": 170 }
    ],
    "storage": {
      "document_count": 85,
      "total_size_bytes": 524288000
    }
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-SuperAdmin role |
| 404 | `NOT_FOUND` | Institution ID does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Page: `/admin/institutions/[id]` (SuperAdmin layout)

**Route:** `apps/web/src/app/(protected)/admin/institutions/[id]/page.tsx`

**Component hierarchy:**
```
InstitutionDetailPage (page.tsx — default export)
  └── InstitutionDetailDashboard (client component)
        ├── BackButton ("← Back to Institutions" → /admin/institutions)
        ├── InstitutionDetailHeader (organism)
        │     ├── InstitutionName (Lora heading)
        │     ├── StatusIndicator (atom — reuse from SA-7)
        │     ├── Domain
        │     ├── Type & Accreditation
        │     └── CreatedDate
        ├── InstitutionMetricsGrid (organism — 2x3 grid)
        │     ├── MetricCard ("Total Users" — 450)
        │     ├── MetricCard ("Active Users (30d)" — 320)
        │     ├── MetricCard ("Total Courses" — 12)
        │     ├── MetricCard ("Questions Generated" — 1,500)
        │     ├── MetricCard ("Questions Approved" — 1,200)
        │     └── MetricCard ("Storage Used" — "500 MB")
        ├── ChartsSection
        │     ├── UsageChart ("Monthly Active Users" — line chart)
        │     └── UsageChart ("Questions Generated" — bar chart)
        ├── UserBreakdownTable (organism)
        │     └── Row per role: role name, count, percentage bar
        └── InstitutionActivityTimeline (organism)
              └── Last 10 events with actor, action, timestamp
```

**States:**
1. **Loading** — Skeleton cards and charts while fetching
2. **Data** — Full detail view with metrics, charts, tables
3. **Error** — Error message with retry button
4. **Not Found** — 404 page for invalid institution ID

**Design tokens:**
- Surface: White `#ffffff` cards on Parchment `#faf9f6` background
- Metric cards: Parchment `#faf9f6` background, Navy Deep `#002c76` value text
- Charts: Green `#69a338` primary line/bar, Navy Deep `#002c76` secondary
- Typography: Lora for institution name, Source Sans 3 for metrics and data
- Spacing: 24px grid gap, 16px card padding
- Timeline: left-aligned vertical line with event dots

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/admin/institution-detail.types.ts` | Types | Create |
| 2 | `packages/types/src/admin/index.ts` | Types | Edit (add detail export) |
| 3 | `apps/server/src/services/admin/institution-monitoring.service.ts` | Service | Edit (add getDetail method) |
| 4 | `apps/server/src/controllers/admin/institution.controller.ts` | Controller | Edit (add handleGetDetail) |
| 5 | `apps/server/src/index.ts` | Routes | Edit (add detail route) |
| 6 | `packages/ui/src/molecules/metric-card.tsx` | Molecule | Create |
| 7 | `packages/ui/src/molecules/usage-chart.tsx` | Molecule | Create |
| 8 | `apps/web/src/hooks/use-institution-detail.ts` | Hook | Create |
| 9 | `apps/web/src/components/admin/institution-detail-header.tsx` | Organism | Create |
| 10 | `apps/web/src/components/admin/institution-metrics-grid.tsx` | Organism | Create |
| 11 | `apps/web/src/components/admin/user-breakdown-table.tsx` | Organism | Create |
| 12 | `apps/web/src/components/admin/institution-activity-timeline.tsx` | Organism | Create |
| 13 | `apps/web/src/app/(protected)/admin/institutions/[id]/page.tsx` | View | Create |
| 14 | `apps/server/src/__tests__/institution-detail.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-SA-7 | superadmin | **PENDING** | Institution list dashboard — navigation source for detail view |
| STORY-SA-5 | superadmin | **PENDING** | Approval workflow creates institutions (upstream) |
| STORY-U-6 | universal | **DONE** | RBAC middleware for SuperAdmin-only enforcement |

### NPM Packages
- `@supabase/supabase-js` — Supabase client (already installed)
- `express` — Server framework (already installed)
- `vitest` — Testing (already installed)
- `recharts` — Charts library (install if not present)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.SUPERADMIN)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`
- `apps/server/src/services/admin/institution-monitoring.service.ts` — Extend with `getDetail()` (from SA-7)
- `apps/server/src/controllers/admin/institution.controller.ts` — Extend with `handleGetDetail()` (from SA-7)
- `packages/ui/src/atoms/status-indicator.tsx` — Reuse from SA-7

## 9. Test Fixtures (inline)

```typescript
// Mock SuperAdmin user
export const SUPERADMIN_USER = {
  sub: "sa-uuid-1",
  email: "admin@journeyos.com",
  role: "superadmin" as const,
  institution_id: "",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock institution record
export const MOCK_INSTITUTION = {
  id: "inst-1",
  name: "Morehouse School of Medicine",
  domain: "msm.edu",
  institution_type: "md",
  accreditation_body: "LCME",
  status: "approved",
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-02-19T10:00:00Z",
};

// Mock metrics
export const MOCK_METRICS = {
  total_users: 450,
  active_users_30d: 320,
  total_courses: 12,
  total_questions_generated: 1500,
  total_questions_approved: 1200,
};

// Mock user breakdown
export const MOCK_USER_BREAKDOWN = [
  { role: "institutional_admin", count: 3 },
  { role: "faculty", count: 47 },
  { role: "student", count: 390 },
  { role: "advisor", count: 10 },
];

// Mock activity timeline
export const MOCK_ACTIVITY_TIMELINE = [
  {
    id: "event-1",
    action: "course_created",
    actor_name: "Dr. Jane Smith",
    actor_email: "jsmith@msm.edu",
    description: "Created course: Clinical Medicine II",
    created_at: "2026-02-19T14:30:00Z",
  },
  {
    id: "event-2",
    action: "user_invited",
    actor_name: "Dr. Jane Smith",
    actor_email: "jsmith@msm.edu",
    description: "Invited faculty member: Dr. Brian Wilson",
    created_at: "2026-02-19T12:00:00Z",
  },
];

// Mock monthly trends
export const MOCK_MONTHLY_ACTIVE_USERS = [
  { month: "2025-09", value: 150 },
  { month: "2025-10", value: 200 },
  { month: "2025-11", value: 280 },
  { month: "2025-12", value: 250 },
  { month: "2026-01", value: 300 },
  { month: "2026-02", value: 320 },
];

// Mock storage
export const MOCK_STORAGE = {
  document_count: 85,
  total_size_bytes: 524288000,
};

// Full mock detail response
export const MOCK_INSTITUTION_DETAIL = {
  ...MOCK_INSTITUTION,
  metrics: MOCK_METRICS,
  user_breakdown: MOCK_USER_BREAKDOWN,
  activity_timeline: MOCK_ACTIVITY_TIMELINE,
  monthly_active_users: MOCK_MONTHLY_ACTIVE_USERS,
  monthly_questions: [
    { month: "2025-09", value: 100 },
    { month: "2025-10", value: 200 },
    { month: "2025-11", value: 350 },
    { month: "2025-12", value: 280 },
    { month: "2026-01", value: 400 },
    { month: "2026-02", value: 170 },
  ],
  storage: MOCK_STORAGE,
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/institution-detail.test.ts`

```
describe("InstitutionDetailController")
  describe("handleGetDetail")
    ✓ returns full institution detail for valid ID (200)
    ✓ includes metrics, user_breakdown, activity_timeline, charts, storage
    ✓ rejects unauthenticated request (401)
    ✓ rejects non-SuperAdmin roles (403 FORBIDDEN)
    ✓ returns 404 for non-existent institution ID

describe("InstitutionMonitoringService")
  describe("getDetail")
    ✓ returns institution record with all fields
    ✓ aggregates total_users from profiles table
    ✓ returns user_breakdown grouped by role
    ✓ returns active_users_30d count (users with recent activity)
    ✓ returns 0 for total_courses when courses table missing
    ✓ returns 0 for questions when questions table missing
    ✓ returns empty array for activity_timeline when no events
    ✓ returns empty array for monthly trends when no data
    ✓ returns storage with document_count=0 when no documents
    ✓ limits activity_timeline to last 10 events
    ✓ returns monthly trends for last 12 months
```

**Total: ~16 tests** (5 controller + 11 service)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this individual story. E2E will be part of the Institution Monitoring critical journey when SA-7 + SA-8 + SA-9 are all complete.

## 12. Acceptance Criteria

1. SuperAdmin can view institution detail at `/admin/institutions/[id]`
2. Header shows institution name, status badge, domain, type, accreditation, creation date
3. Metrics section: total users, active users (30d), total courses, questions generated, questions approved
4. User breakdown table shows role distribution with counts
5. Activity timeline shows last 10 significant events
6. Storage usage: document count and total size
7. Monthly active users line chart (Recharts)
8. Questions generated per month bar chart (Recharts)
9. Back navigation to institution list
10. Non-SuperAdmin roles receive 403 Forbidden
11. Non-existent institution returns 404
12. Gracefully handles missing tables (courses, activity_events, etc.) with 0/null/empty
13. All ~16 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Institution detail view | S-SA-05-2 § User Story |
| Usage metrics section | S-SA-05-2 § Acceptance Criteria |
| User breakdown table | S-SA-05-2 § Acceptance Criteria |
| Activity timeline | S-SA-05-2 § Acceptance Criteria |
| Storage usage | S-SA-05-2 § Acceptance Criteria |
| Charts with Recharts | S-SA-05-2 § Notes: "recharts library" |
| User breakdown query | S-SA-05-2 § Notes: "SELECT role, COUNT(*) GROUP BY role" |
| Active users definition | S-SA-05-2 § Notes: "at least one activity_events entry in last 30 days" |
| Storage query | S-SA-05-2 § Notes: "SELECT COUNT(*), SUM(file_size)" |
| Dynamic route | S-SA-05-2 § Notes: "/institutions/[id]" |

## 14. Environment Prerequisites

- **Supabase:** Project `hifqdotmnirepgscankl` running, `institutions` and `profiles` tables exist
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **Recharts:** Install if not present (`pnpm add recharts -F @journey-os/web`)
- **No Neo4j needed** for this story
- **Note:** `courses`, `activity_events`, and `uploaded_documents` tables may not exist yet — service must handle gracefully

## 15. Implementation Notes

- **Protected route pattern:** Register AFTER auth middleware. Use `rbac.require(AuthRole.SUPERADMIN)`.
- **Express params:** `req.params.id` is `string | string[]` — narrow with `typeof === "string"`.
- **Extends SA-7 service:** Add `getDetail(institutionId: string)` to existing `InstitutionMonitoringService` from SA-7. The method runs multiple parallel Supabase queries.
- **Missing tables guard:** Wrap each aggregation query in try/catch. If the table doesn't exist (Supabase returns error), return 0/null/empty array. This allows the detail view to work even before downstream stories create those tables.
- **Recharts components:** Create `UsageChart` molecule in `packages/ui` that accepts `data: MonthlyTrend[]`, `type: 'line' | 'bar'`, `title: string`. Uses Recharts `<LineChart>` or `<BarChart>` with responsive container.
- **MetricCard molecule:** Accepts `label: string`, `value: number | string`, `icon?: string`. Formats numbers with locale (e.g., 1,500). For storage, format bytes to human-readable (MB/GB).
- **Activity timeline:** Limit to 10 most recent events. Each event shows: icon for action type, actor name, description, relative timestamp.
- **Monthly trends:** Query last 12 months. Fill in missing months with `value: 0` for continuous chart data.
- **Parallel queries:** Use `Promise.all()` for independent aggregation queries to minimize latency.
