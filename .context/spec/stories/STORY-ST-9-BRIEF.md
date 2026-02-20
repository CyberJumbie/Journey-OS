# STORY-ST-9 Brief: Comparative Percentile Analytics

## 0. Lane & Priority

```yaml
story_id: STORY-ST-9
old_id: S-ST-43-3
lane: student
lane_priority: 4
within_lane_order: 9
sprint: 28
size: M
depends_on:
  - STORY-ST-2 (student) — Student Dashboard Page
blocks: []
personas_served: [student]
epic: E-43 (Student Progress Analytics)
feature: F-20 (Student Progress & Analytics)
user_flow: UF-32 (Student Dashboard & Progress Tracking)
```

## 1. Summary

Build **comparative percentile analytics** that allow a student to see how their performance compares to their anonymized cohort. The feature is strictly opt-in (default: off) with a privacy notice before activation. When enabled, the student sees their percentile rank per USMLE system and overall, plus a bell curve visualization showing their position in the cohort distribution. Privacy is enforced: minimum cohort size of 10 before any percentiles are shown, and only aggregate statistics are exposed (no individual data).

Key constraints:
- **Opt-in only** — preference stored in `profiles.comparative_analytics_opt_in` (Supabase)
- **Minimum cohort size 10** — prevents de-anonymization in small cohorts
- **Student only** — RBAC enforced, student sees only their own percentile
- Percentile computed via Supabase SQL `PERCENT_RANK()` window function
- Bell curve rendered as a normal distribution SVG with student marker
- Privacy notice required before first opt-in (acknowledgment stored)

## 2. Task Breakdown

1. **Types** — Create `PercentileData`, `CohortDistribution`, `PercentileResponse`, `OptInRequest` types in `packages/types/src/student/percentile.types.ts`
2. **Error class** — Create `PercentileError` in `apps/server/src/errors/percentile.error.ts`
3. **Service** — Create `PercentileService` in `apps/server/src/services/student/percentile.service.ts` with `getPercentiles(studentId)` and `updateOptIn(studentId, optIn)`
4. **Controller** — Create `PercentileController` in `apps/server/src/controllers/student/percentile.controller.ts` with `handleGetPercentiles()` and `handleUpdateOptIn()`
5. **Routes** — Register `GET /api/v1/student/percentiles` and `PUT /api/v1/student/percentiles/opt-in` in `apps/server/src/index.ts`
6. **Bell curve component** — Create `BellCurve` in `packages/ui/src/components/atoms/bell-curve.tsx` (reusable SVG)
7. **Percentile bar** — Create `PercentileBar` in `apps/web/src/components/student/percentile-bar.tsx`
8. **Opt-in card** — Create `ComparativeOptIn` in `apps/web/src/components/student/comparative-opt-in.tsx`
9. **Percentile dashboard** — Create `ComparativeAnalytics` in `apps/web/src/components/student/comparative-analytics.tsx`
10. **Analytics page integration** — Add `ComparativeAnalytics` to `/dashboard/student/analytics` page
11. **API tests** — 16 tests covering percentiles, opt-in, privacy, auth, edge cases
12. **Loading/empty/privacy states** — Skeleton, not-opted-in state, cohort-too-small state

## 3. Data Model

```typescript
// packages/types/src/student/percentile.types.ts

/** Percentile data for a single USMLE system */
export interface SystemPercentile {
  readonly system_code: string;
  readonly system_name: string;
  readonly student_mastery: number;   // 0.0 - 1.0
  readonly percentile_rank: number;   // 0-100 (e.g., 72 = 72nd percentile)
  readonly cohort_mean: number;       // 0.0 - 1.0
  readonly cohort_median: number;     // 0.0 - 1.0
  readonly cohort_std_dev: number;    // Standard deviation of cohort
}

/** Distribution data for bell curve rendering */
export interface CohortDistribution {
  readonly mean: number;              // 0.0 - 1.0
  readonly std_dev: number;
  readonly student_value: number;     // 0.0 - 1.0
  readonly student_percentile: number; // 0-100
  readonly cohort_size: number;
  readonly histogram: readonly HistogramBucket[];
}

/** A single bucket in the distribution histogram */
export interface HistogramBucket {
  readonly range_start: number;       // 0.0 - 1.0
  readonly range_end: number;         // 0.0 - 1.0
  readonly count: number;             // Number of students in bucket
  readonly is_student_bucket: boolean; // Whether student falls in this bucket
}

/** Full percentile response from the API */
export interface PercentileResponse {
  readonly opted_in: boolean;
  readonly overall: {
    readonly percentile_rank: number;     // 0-100
    readonly student_mastery: number;     // 0.0 - 1.0
    readonly cohort_mean: number;         // 0.0 - 1.0
    readonly cohort_median: number;       // 0.0 - 1.0
  } | null;                               // null if not opted in or cohort < 10
  readonly systems: readonly SystemPercentile[] | null; // null if not opted in
  readonly distribution: CohortDistribution | null;     // null if not opted in
  readonly cohort_size: number;
  readonly minimum_cohort_size: number;   // Always 10
  readonly privacy_acknowledged: boolean;
}

/** Opt-in request body */
export interface OptInRequest {
  readonly opt_in: boolean;
  readonly privacy_acknowledged: boolean; // Must be true when opting in
}

/** Opt-in response */
export interface OptInResponse {
  readonly opted_in: boolean;
  readonly updated_at: string;
}

/** Query params for percentile endpoint */
export interface PercentileQuery {
  readonly system_code?: string;      // Optional: get percentile for specific system only
}
```

## 4. Database Schema

### Supabase

```sql
-- Migration: add_comparative_percentile_support

-- Ensure opt-in column exists (may already exist from STORY-ST-7)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS comparative_analytics_opt_in BOOLEAN DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS privacy_notice_acknowledged_at TIMESTAMPTZ DEFAULT NULL;

-- Index for cohort queries (institution-scoped percentile computation)
CREATE INDEX IF NOT EXISTS idx_mastery_estimates_subconcept
  ON mastery_estimates(subconcept_id);

CREATE INDEX IF NOT EXISTS idx_profiles_institution_opt_in
  ON profiles(institution_id, comparative_analytics_opt_in)
  WHERE comparative_analytics_opt_in = true;

-- Percentile computation uses PERCENT_RANK() window function:
-- Example query pattern (executed by PercentileService):
--
-- WITH student_system_mastery AS (
--   SELECT
--     me.student_id,
--     $system_code AS system_code,
--     AVG(me.p_mastered) AS avg_mastery
--   FROM mastery_estimates me
--   JOIN profiles p ON me.student_id = p.id
--   WHERE p.institution_id = $institution_id
--     AND p.comparative_analytics_opt_in = true
--     AND me.subconcept_id = ANY($subconcept_ids_for_system)
--   GROUP BY me.student_id
-- )
-- SELECT
--   student_id,
--   avg_mastery,
--   PERCENT_RANK() OVER (ORDER BY avg_mastery) * 100 AS percentile_rank,
--   AVG(avg_mastery) OVER () AS cohort_mean,
--   PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY avg_mastery) OVER () AS cohort_median,
--   STDDEV(avg_mastery) OVER () AS cohort_std_dev,
--   COUNT(*) OVER () AS cohort_size
-- FROM student_system_mastery
-- WHERE student_id = $student_id;
```

### Neo4j (read-only, existing nodes)

```cypher
// Same system-to-subconcept mapping as STORY-ST-7/ST-8
MATCH (sys:USMLE_System)-[:HAS_TOPIC]->(t:USMLE_Topic)<-[:BELONGS_TO]-(sc:SubConcept)
RETURN sys.code AS system_code, sys.name AS system_name, COLLECT(sc.id) AS subconcept_ids
```

## 5. API Contract

### GET /api/v1/student/percentiles (Auth: Student only, own data)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `system_code` | string | all | Optional: filter to a specific USMLE system |

**Success Response — opted in, cohort >= 10 (200):**
```json
{
  "data": {
    "opted_in": true,
    "overall": {
      "percentile_rank": 72,
      "student_mastery": 0.65,
      "cohort_mean": 0.58,
      "cohort_median": 0.60
    },
    "systems": [
      {
        "system_code": "CVS",
        "system_name": "Cardiovascular",
        "student_mastery": 0.72,
        "percentile_rank": 78,
        "cohort_mean": 0.62,
        "cohort_median": 0.64,
        "cohort_std_dev": 0.12
      },
      {
        "system_code": "RESP",
        "system_name": "Respiratory",
        "student_mastery": 0.60,
        "percentile_rank": 55,
        "cohort_mean": 0.58,
        "cohort_median": 0.57,
        "cohort_std_dev": 0.15
      }
    ],
    "distribution": {
      "mean": 0.58,
      "std_dev": 0.14,
      "student_value": 0.65,
      "student_percentile": 72,
      "cohort_size": 48,
      "histogram": [
        { "range_start": 0.0, "range_end": 0.1, "count": 0, "is_student_bucket": false },
        { "range_start": 0.1, "range_end": 0.2, "count": 1, "is_student_bucket": false },
        { "range_start": 0.2, "range_end": 0.3, "count": 3, "is_student_bucket": false },
        { "range_start": 0.3, "range_end": 0.4, "count": 5, "is_student_bucket": false },
        { "range_start": 0.4, "range_end": 0.5, "count": 8, "is_student_bucket": false },
        { "range_start": 0.5, "range_end": 0.6, "count": 12, "is_student_bucket": false },
        { "range_start": 0.6, "range_end": 0.7, "count": 10, "is_student_bucket": true },
        { "range_start": 0.7, "range_end": 0.8, "count": 6, "is_student_bucket": false },
        { "range_start": 0.8, "range_end": 0.9, "count": 2, "is_student_bucket": false },
        { "range_start": 0.9, "range_end": 1.0, "count": 1, "is_student_bucket": false }
      ]
    },
    "cohort_size": 48,
    "minimum_cohort_size": 10,
    "privacy_acknowledged": true
  },
  "error": null
}
```

**Success Response — not opted in (200):**
```json
{
  "data": {
    "opted_in": false,
    "overall": null,
    "systems": null,
    "distribution": null,
    "cohort_size": 48,
    "minimum_cohort_size": 10,
    "privacy_acknowledged": false
  },
  "error": null
}
```

**Success Response — opted in but cohort < 10 (200):**
```json
{
  "data": {
    "opted_in": true,
    "overall": null,
    "systems": null,
    "distribution": null,
    "cohort_size": 7,
    "minimum_cohort_size": 10,
    "privacy_acknowledged": true
  },
  "error": null
}
```

### PUT /api/v1/student/percentiles/opt-in (Auth: Student only)

**Request Body:**
```json
{
  "opt_in": true,
  "privacy_acknowledged": true
}
```

**Success Response (200):**
```json
{
  "data": {
    "opted_in": true,
    "updated_at": "2026-02-19T10:30:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-student role |
| 400 | `VALIDATION_ERROR` | opt_in=true but privacy_acknowledged=false |
| 400 | `VALIDATION_ERROR` | Invalid system_code |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Widget: ComparativeAnalytics (embedded in analytics page)

**Route context:** Section within `/dashboard/student/analytics` page

**Component hierarchy:**
```
ComparativeAnalytics (organism — client component)
  ├── ComparativeOptIn (molecule — shown when not opted in)
  │     ├── PrivacyNotice (atom — card explaining data usage)
  │     │     ├── ShieldCheck icon (Lucide)
  │     │     └── Privacy text (what data is shared, anonymization)
  │     ├── Checkbox (privacy acknowledgment)
  │     └── Button (Enable Comparative Analytics)
  ├── CohortTooSmall (molecule — shown when cohort < 10)
  │     └── InfoCard ("Not enough peers yet. Need 10+ students.")
  ├── OverallPercentile (molecule — large percentile display)
  │     ├── PercentileRank (large number: "72nd percentile")
  │     └── ComparisonText ("Above cohort average of 58%")
  ├── BellCurve (atom — reusable SVG normal distribution)
  │     ├── CurvePath (SVG path for distribution)
  │     ├── StudentMarker (vertical line + dot at student position)
  │     ├── MeanMarker (dashed vertical line)
  │     └── AxisLabels (0% to 100%)
  ├── SystemPercentileList (molecule — per-system breakdown)
  │     └── PercentileBar (atom — per system)
  │           ├── SystemName (text)
  │           ├── ProgressBar (filled to percentile rank)
  │           └── PercentileLabel (e.g., "78th")
  └── OptOutButton (atom — "Disable comparative analytics")
```

**Props:**
```typescript
interface ComparativeAnalyticsProps {
  readonly studentId: string;
}

interface BellCurveProps {
  readonly mean: number;              // 0.0 - 1.0
  readonly stdDev: number;
  readonly studentValue: number;      // 0.0 - 1.0
  readonly studentPercentile: number; // 0-100
  readonly histogram: readonly HistogramBucket[];
  readonly width?: number;            // px, default 400
  readonly height?: number;           // px, default 200
}

interface PercentileBarProps {
  readonly systemName: string;
  readonly percentileRank: number;    // 0-100
  readonly studentMastery: number;    // 0.0 - 1.0
  readonly cohortMean: number;        // 0.0 - 1.0
}

interface ComparativeOptInProps {
  readonly onOptIn: (acknowledged: boolean) => void;
  readonly isLoading: boolean;
}
```

**States:**
1. **Loading** — Skeleton bell curve + skeleton bars
2. **Not opted in** — Privacy notice card with opt-in CTA (default state)
3. **Opted in, cohort too small** — Info message "Need 10+ students in your cohort"
4. **Opted in, data available** — Full bell curve + percentile bars + overall rank
5. **Error** — Error message with retry button
6. **Opting in/out** — Button loading spinner during preference update

**Design tokens:**
- Bell curve fill: `#2b71b9` (Blue Mid) at 20% opacity
- Bell curve stroke: `#2b71b9` (Blue Mid)
- Student marker: `#69a338` (Green) vertical line + dot
- Mean marker: `#002c76` (Navy Deep) dashed line
- Percentile bar fill: gradient `#2b71b9` to `#69a338`
- Percentile bar track: `#f5f3ef` (Cream)
- Privacy notice bg: `#faf9f6` (Parchment) with `#002c76` border-left
- Overall percentile: 56px DM Mono bold, Navy Deep
- System percentile labels: 14px Source Sans 3
- Surface: White card on Cream background
- Spacing: 24px card padding, 16px between percentile bars, 32px section gap

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/student/percentile.types.ts` | Types | Create |
| 2 | `packages/types/src/student/index.ts` | Types | Edit (add percentile export) |
| 3 | `apps/server/src/errors/percentile.error.ts` | Errors | Create |
| 4 | Supabase migration via MCP (indexes + profile columns) | Database | Apply |
| 5 | `apps/server/src/services/student/percentile.service.ts` | Service | Create |
| 6 | `apps/server/src/controllers/student/percentile.controller.ts` | Controller | Create |
| 7 | `apps/server/src/index.ts` | Routes | Edit (add percentile routes) |
| 8 | `packages/ui/src/components/atoms/bell-curve.tsx` | Atom | Create |
| 9 | `apps/web/src/components/student/percentile-bar.tsx` | Atom | Create |
| 10 | `apps/web/src/components/student/comparative-opt-in.tsx` | Molecule | Create |
| 11 | `apps/web/src/components/student/comparative-analytics.tsx` | Organism | Create |
| 12 | `apps/web/src/app/(protected)/dashboard/student/analytics/page.tsx` | Page | Edit (add ComparativeAnalytics section) |
| 13 | `apps/server/src/__tests__/percentile.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-ST-2 | student | **REQUIRED** | Student Dashboard Page (analytics sub-page) |
| STORY-U-6 | universal | **DONE** | RBAC middleware for student-only enforcement |
| STORY-U-7 | universal | **DONE** | USMLE seed data (system codes for per-system percentiles) |
| STORY-ST-7 | student | **OPTIONAL** | May add `comparative_analytics_opt_in` column first |

### NPM Packages
- `@supabase/supabase-js` — Supabase client (PERCENT_RANK window function queries)
- `neo4j-driver` — Subconcept-to-system mapping
- `lucide-react` — Icons (ShieldCheck for privacy notice)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` — `Neo4jClientConfig`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.STUDENT)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`, `AuthTokenPayload`
- `packages/types/src/auth/roles.types.ts` — `AuthRole`

## 9. Test Fixtures

```typescript
// Mock student auth (opted in)
export const STUDENT_OPTED_IN = {
  sub: "student-uuid-1",
  email: "alice@msm.edu",
  role: "student" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock student auth (not opted in)
export const STUDENT_NOT_OPTED_IN = {
  ...STUDENT_OPTED_IN,
  sub: "student-uuid-2",
  email: "bob@msm.edu",
};

// Mock faculty user (should be denied)
export const FACULTY_USER = {
  ...STUDENT_OPTED_IN,
  sub: "faculty-uuid-1",
  email: "prof@msm.edu",
  role: "faculty" as const,
};

// Mock profile with opt-in
export const MOCK_PROFILE_OPTED_IN = {
  id: "student-uuid-1",
  institution_id: "inst-uuid-1",
  comparative_analytics_opt_in: true,
  privacy_notice_acknowledged_at: "2026-02-15T10:00:00Z",
};

// Mock profile without opt-in
export const MOCK_PROFILE_NOT_OPTED_IN = {
  id: "student-uuid-2",
  institution_id: "inst-uuid-1",
  comparative_analytics_opt_in: false,
  privacy_notice_acknowledged_at: null,
};

// Mock system percentiles (cohort of 48)
export const MOCK_SYSTEM_PERCENTILES: SystemPercentile[] = [
  {
    system_code: "CVS",
    system_name: "Cardiovascular",
    student_mastery: 0.72,
    percentile_rank: 78,
    cohort_mean: 0.62,
    cohort_median: 0.64,
    cohort_std_dev: 0.12,
  },
  {
    system_code: "RESP",
    system_name: "Respiratory",
    student_mastery: 0.60,
    percentile_rank: 55,
    cohort_mean: 0.58,
    cohort_median: 0.57,
    cohort_std_dev: 0.15,
  },
  {
    system_code: "RENAL",
    system_name: "Renal/Urinary",
    student_mastery: 0.58,
    percentile_rank: 48,
    cohort_mean: 0.60,
    cohort_median: 0.59,
    cohort_std_dev: 0.13,
  },
];

// Mock distribution for bell curve
export const MOCK_DISTRIBUTION: CohortDistribution = {
  mean: 0.58,
  std_dev: 0.14,
  student_value: 0.65,
  student_percentile: 72,
  cohort_size: 48,
  histogram: [
    { range_start: 0.0, range_end: 0.1, count: 0, is_student_bucket: false },
    { range_start: 0.1, range_end: 0.2, count: 1, is_student_bucket: false },
    { range_start: 0.2, range_end: 0.3, count: 3, is_student_bucket: false },
    { range_start: 0.3, range_end: 0.4, count: 5, is_student_bucket: false },
    { range_start: 0.4, range_end: 0.5, count: 8, is_student_bucket: false },
    { range_start: 0.5, range_end: 0.6, count: 12, is_student_bucket: false },
    { range_start: 0.6, range_end: 0.7, count: 10, is_student_bucket: true },
    { range_start: 0.7, range_end: 0.8, count: 6, is_student_bucket: false },
    { range_start: 0.8, range_end: 0.9, count: 2, is_student_bucket: false },
    { range_start: 0.9, range_end: 1.0, count: 1, is_student_bucket: false },
  ],
};

// Mock small cohort (below minimum)
export const MOCK_SMALL_COHORT_SIZE = 7;

// Mock opt-in request
export const MOCK_OPT_IN_REQUEST: OptInRequest = {
  opt_in: true,
  privacy_acknowledged: true,
};

// Mock opt-in without privacy ack (should fail)
export const MOCK_OPT_IN_NO_PRIVACY: OptInRequest = {
  opt_in: true,
  privacy_acknowledged: false,
};
```

## 10. API Test Spec (vitest)

**File:** `apps/server/src/__tests__/percentile.controller.test.ts`

```
describe("PercentileController")
  describe("handleGetPercentiles")
    it returns percentile data for opted-in student with cohort >= 10 (200)
    it returns per-system percentile ranks with cohort stats
    it returns bell curve distribution with histogram buckets
    it returns null data when student has not opted in
    it returns null data when cohort size < minimum (10)
    it returns cohort_size even when data is null
    it filters by system_code query param when provided
    it rejects unauthenticated request (401)
    it rejects non-student roles (403 FORBIDDEN)
    it returns 400 for invalid system_code

  describe("handleUpdateOptIn")
    it enables opt-in when privacy_acknowledged is true (200)
    it disables opt-in (200)
    it rejects opt-in when privacy_acknowledged is false (400)
    it rejects unauthenticated request (401)
    it rejects non-student roles (403 FORBIDDEN)
    it stores privacy_notice_acknowledged_at timestamp on first opt-in

describe("PercentileService")
  describe("getPercentiles")
    it computes PERCENT_RANK correctly from cohort mastery data
    it returns null when student not opted in
    it returns null when cohort size below minimum
    it builds histogram with 10 buckets from 0.0 to 1.0
    it correctly identifies student bucket in histogram
  describe("updateOptIn")
    it updates profiles.comparative_analytics_opt_in in Supabase
    it sets privacy_notice_acknowledged_at on first opt-in
```

**Total: ~18 tests** (16 controller + 7 service, some grouped = 18 distinct)

## 11. E2E Test Spec (Playwright)

Not required for this story. Comparative percentiles are not part of the 5 critical user journeys. The opt-in flow and bell curve will be verified through visual QA and API tests.

## 12. Acceptance Criteria

1. Opt-in toggle for comparative analytics defaults to off
2. Privacy notice displayed before opt-in with explanation of anonymization
3. Opt-in preference stored in `profiles.comparative_analytics_opt_in` (Supabase)
4. Percentile rank shown per USMLE system (e.g., "72nd percentile")
5. Bell curve visualization shows student position in cohort distribution
6. Overall percentile rank displayed across all systems
7. Only aggregate statistics exposed (no individual student data)
8. Minimum cohort size of 10 enforced before any percentiles shown
9. Cohort-too-small state shown when fewer than 10 opted-in peers
10. Service computes percentiles via Supabase `PERCENT_RANK()` window function
11. Loading state shows skeleton bell curve and bars
12. Non-student roles receive 403 Forbidden
13. Opting in without privacy acknowledgment returns 400 validation error
14. All 18 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Comparative percentile analytics | ARCHITECTURE_v10 SS 13.1: Student Dashboard |
| PERCENT_RANK() for percentile computation | S-ST-43-3 SS Notes |
| Minimum cohort size 10 for privacy | S-ST-43-3 SS Acceptance Criteria |
| Opt-in preference in user profile | S-ST-43-3 SS Notes: "user_preferences table" |
| Bell curve visualization | DESIGN_SPEC SS Group D: StudentAnalytics |
| mastery_estimates table | SUPABASE_DDL_v1 SS Student Tables |
| USMLE system codes | NODE_REGISTRY_v1 SS Layer 2 |
| Sprint 28 placement | ROADMAP_v2_3 SS Sprint 28 |
| Anonymized cohort comparison | S-ST-43-3 SS Acceptance Criteria |
| UF-32 Student Dashboard flow | UF-32 SS Progress Tracking |

## 14. Environment Prerequisites

- **Supabase:** Project running, `mastery_estimates` table exists, `profiles` table has `comparative_analytics_opt_in` and `privacy_notice_acknowledged_at` columns
- **Neo4j:** Running with USMLE seed data (227 nodes from STORY-U-7) for system-to-subconcept mapping
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000 with student analytics page (from STORY-ST-8 or created here)
- **Minimum test data:** At least 10 student profiles with mastery_estimates for PERCENT_RANK to produce meaningful results

## 15. Figma / Make Prototype

**Comparative analytics layout (ASCII wireframe):**

**State: Not opted in (default)**
```
+-------------------------------------------+
|  Comparative Analytics                     |
|                                            |
|  +--------------------------------------+  |
|  |  [ShieldCheck]                       |  |
|  |  Compare with your cohort            |  |
|  |                                      |  |
|  |  See how your performance compares   |  |
|  |  to other students in your program.  |  |
|  |  All data is anonymized — only       |  |
|  |  aggregate statistics are shown.     |  |
|  |  Minimum 10 students required.       |  |
|  |                                      |  |
|  |  [x] I understand my data will be    |  |
|  |      included in anonymized stats    |  |
|  |                                      |  |
|  |  [Enable Comparative Analytics]      |  |
|  +--------------------------------------+  |
+-------------------------------------------+
```

**State: Opted in, data available**
```
+-------------------------------------------+
|  Comparative Analytics        [Disable]    |
|                                            |
|  Overall: 72nd percentile                  |
|  Your mastery: 65%  |  Cohort avg: 58%    |
|                                            |
|  Cohort Distribution (48 students)         |
|           ___                              |
|         /     \          * You (72nd)      |
|        /   |   \   |                       |
|       /    |    \  |                       |
|      /     |     \ |                       |
|     /      |      \|                       |
|  __/       |mean   \__                     |
|  0%   25%   50%   75%   100%              |
|                                            |
|  By System                                 |
|  CVS   ████████████████████░░  78th        |
|  RESP  █████████████░░░░░░░░░  55th        |
|  RENAL ████████████░░░░░░░░░░  48th        |
|  GI    ███████████████░░░░░░░  65th        |
|  ...                                       |
+-------------------------------------------+
```
