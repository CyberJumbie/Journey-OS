# STORY-ST-7 Brief: Step 1 Readiness Tracker

## 0. Lane & Priority

```yaml
story_id: STORY-ST-7
old_id: S-ST-42-3
lane: student
lane_priority: 4
within_lane_order: 7
sprint: 27
size: M
depends_on:
  - STORY-ST-2 (student) — Student Dashboard Page
blocks: []
personas_served: [student]
epic: E-42 (Student Dashboard)
feature: F-20 (Student Progress & Analytics)
user_flow: UF-32 (Student Dashboard & Progress Tracking)
```

## 1. Summary

Build a **Step 1 Readiness Tracker** widget for the student dashboard that computes and displays a readiness score (0-100) as a gauge/circular progress indicator. The score is a weighted average of the student's mastery across USMLE systems, weighted by the official USMLE Step 1 blueprint proportions. A benchmark line shows the historical passing threshold, a confidence interval communicates pass probability, and a 4-week trend mini-chart shows trajectory. Cohort comparison is opt-in and anonymized.

Key constraints:
- **Student only** — RBAC enforced, student sees only their own data
- Readiness = weighted average of system mastery scores against USMLE blueprint weights
- Historical benchmarks hardcoded initially (later driven by IRT calibration)
- Gauge component must be reusable (`ReadinessGauge`)
- Minimum 2 practice sessions required before readiness is computed (empty state otherwise)
- Cohort comparison requires opt-in and minimum cohort size of 10

## 2. Task Breakdown

1. **Types** — Create `ReadinessScore`, `ReadinessResponse`, `ReadinessBenchmark`, `ReadinessTrendPoint`, `CohortComparison` types in `packages/types/src/student/readiness.types.ts`
2. **Benchmark seed data** — Create `apps/server/src/data/usmle-benchmarks.ts` with USMLE blueprint weights and historical passing thresholds
3. **Error class** — Create `ReadinessError` in `apps/server/src/errors/readiness.error.ts`
4. **Service** — Create `ReadinessService` in `apps/server/src/services/student/readiness.service.ts` with `getReadiness(studentId)` computing weighted mastery
5. **Controller** — Create `ReadinessController` in `apps/server/src/controllers/student/readiness.controller.ts` with `handleGetReadiness(req, res)`
6. **Routes** — Register `GET /api/v1/student/readiness` in `apps/server/src/index.ts` with auth + RBAC
7. **Gauge atom** — Create `ReadinessGauge` in `packages/ui/src/components/atoms/readiness-gauge.tsx`
8. **Trend mini-chart** — Create `ReadinessTrendChart` in `apps/web/src/components/student/readiness-trend-chart.tsx`
9. **Widget organism** — Create `ReadinessTracker` in `apps/web/src/components/student/readiness-tracker.tsx`
10. **Dashboard integration** — Import `ReadinessTracker` into student dashboard page
11. **API tests** — 12 tests covering readiness computation, auth, edge cases
12. **Loading/empty states** — Skeleton for loading, empty state for < 2 sessions

## 3. Data Model

```typescript
// packages/types/src/student/readiness.types.ts

/** USMLE blueprint weight for a single organ system */
export interface BlueprintWeight {
  readonly system_code: string;
  readonly system_name: string;
  readonly weight: number; // 0.0 - 1.0, all weights sum to 1.0
}

/** A single system's mastery contribution to readiness */
export interface SystemReadiness {
  readonly system_code: string;
  readonly system_name: string;
  readonly mastery: number;           // 0.0 - 1.0
  readonly blueprint_weight: number;  // 0.0 - 1.0
  readonly weighted_score: number;    // mastery * blueprint_weight
}

/** Historical benchmark data for a passing threshold */
export interface ReadinessBenchmark {
  readonly year: number;
  readonly passing_score: number;     // 0-100 scale
  readonly mean_score: number;        // Historical mean
  readonly std_dev: number;           // Standard deviation
  readonly source: string;            // e.g., "USMLE Performance Data 2024"
}

/** A single point in the readiness trend */
export interface ReadinessTrendPoint {
  readonly date: string;              // ISO 8601 date
  readonly score: number;             // 0-100
  readonly session_count: number;     // Sessions in that period
}

/** Anonymized cohort comparison data */
export interface CohortComparison {
  readonly cohort_mean: number;       // 0-100
  readonly cohort_median: number;     // 0-100
  readonly student_percentile: number; // 0-100 (e.g., 72 = 72nd percentile)
  readonly cohort_size: number;
}

/** Full readiness response from the API */
export interface ReadinessResponse {
  readonly score: number;                         // 0-100 overall readiness
  readonly confidence_interval: {
    readonly lower: number;                       // 0-100
    readonly upper: number;                       // 0-100
    readonly pass_probability: number;            // 0.0 - 1.0 (e.g., 0.75 = 75%)
  };
  readonly systems: readonly SystemReadiness[];   // Per-system breakdown
  readonly benchmark: ReadinessBenchmark;         // Current passing benchmark
  readonly trend: readonly ReadinessTrendPoint[]; // Last 4 weeks
  readonly cohort: CohortComparison | null;       // null if not opted in or cohort < 10
  readonly session_count: number;                 // Total sessions completed
  readonly last_updated: string;                  // ISO 8601
}

/** Query params for readiness endpoint */
export interface ReadinessQuery {
  readonly include_cohort?: boolean;  // default false
}
```

## 4. Database Schema

### Supabase (no new tables, uses existing)

```sql
-- Existing tables used:
-- mastery_estimates (student_id UUID, subconcept_id UUID, p_mastered FLOAT, updated_at TIMESTAMPTZ)
-- practice_sessions (id UUID, student_id UUID, config JSONB, started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, score FLOAT)

-- Migration: add_readiness_tracker_support
-- Indexes for readiness aggregation queries

CREATE INDEX IF NOT EXISTS idx_mastery_estimates_student_id
  ON mastery_estimates(student_id);

CREATE INDEX IF NOT EXISTS idx_mastery_estimates_updated_at
  ON mastery_estimates(student_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_student_completed
  ON practice_sessions(student_id, completed_at DESC);

-- View for aggregating mastery by USMLE system (uses subconcept -> topic -> system chain)
-- Note: This join relies on a subconcept_id -> parent_system mapping maintained in Neo4j.
-- For MVP, the service layer queries Neo4j for the system mapping, then aggregates in Supabase.

-- User preferences table extension for cohort opt-in
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS comparative_analytics_opt_in BOOLEAN DEFAULT false;
```

### Neo4j (read-only, existing nodes)

```cypher
// Existing relationships used for system-level aggregation:
// (USMLE_System)-[:HAS_TOPIC]->(USMLE_Topic)
// (Student)-[:HAS_MASTERY]->(ConceptMastery)-[:FOR_CONCEPT]->(SubConcept)

// Query pattern: get student's mastery grouped by USMLE system
MATCH (s:Student {id: $studentId})-[:HAS_MASTERY]->(cm:ConceptMastery)-[:FOR_CONCEPT]->(sc:SubConcept)
MATCH (sys:USMLE_System)-[:HAS_TOPIC]->(t:USMLE_Topic)<-[:BELONGS_TO]-(sc)
RETURN sys.code AS system_code, sys.name AS system_name,
       AVG(cm.p_mastered) AS avg_mastery, COUNT(sc) AS concept_count
ORDER BY sys.code
```

## 5. API Contract

### GET /api/v1/student/readiness (Auth: Student only, own data)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `include_cohort` | boolean | `false` | Include anonymized cohort comparison |

**Success Response (200):**
```json
{
  "data": {
    "score": 68,
    "confidence_interval": {
      "lower": 62,
      "upper": 74,
      "pass_probability": 0.75
    },
    "systems": [
      {
        "system_code": "CVS",
        "system_name": "Cardiovascular",
        "mastery": 0.72,
        "blueprint_weight": 0.11,
        "weighted_score": 7.92
      },
      {
        "system_code": "RESP",
        "system_name": "Respiratory",
        "mastery": 0.65,
        "blueprint_weight": 0.09,
        "weighted_score": 5.85
      }
    ],
    "benchmark": {
      "year": 2024,
      "passing_score": 60,
      "mean_score": 234,
      "std_dev": 20,
      "source": "USMLE Performance Data 2024"
    },
    "trend": [
      { "date": "2026-01-27", "score": 55, "session_count": 3 },
      { "date": "2026-02-03", "score": 60, "session_count": 5 },
      { "date": "2026-02-10", "score": 64, "session_count": 4 },
      { "date": "2026-02-17", "score": 68, "session_count": 6 }
    ],
    "cohort": null,
    "session_count": 42,
    "last_updated": "2026-02-19T10:30:00Z"
  },
  "error": null
}
```

**With cohort comparison (include_cohort=true, opt-in enabled, cohort >= 10):**
```json
{
  "data": {
    "...": "...",
    "cohort": {
      "cohort_mean": 62,
      "cohort_median": 64,
      "student_percentile": 72,
      "cohort_size": 48
    }
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-student role |
| 404 | `INSUFFICIENT_DATA` | Student has < 2 practice sessions |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Widget: ReadinessTracker (student dashboard)

**Route context:** Embedded in `/dashboard/student` page

**Component hierarchy:**
```
ReadinessTracker (organism — client component)
  ├── ReadinessGauge (atom — reusable circular progress)
  │     ├── CircularProgress (SVG arc, 0-100)
  │     ├── ScoreLabel (large centered number)
  │     ├── BenchmarkLine (dashed arc at passing threshold)
  │     └── PassProbability (text below: "75% chance of passing")
  ├── ReadinessTrendChart (molecule — Recharts mini line chart)
  │     ├── LineChart (4 weekly points)
  │     └── ReferenceLine (benchmark threshold)
  ├── SystemBreakdown (molecule — mini bar list)
  │     └── SystemBar (per system: name + horizontal bar)
  ├── CohortToggle (atom — opt-in switch + privacy notice)
  │     ├── Switch (shadcn/ui)
  │     └── PrivacyNotice (tooltip or inline text)
  └── ReadinessTooltip (atom — calculation explanation)
```

**Props:**
```typescript
interface ReadinessTrackerProps {
  readonly studentId: string;
}

interface ReadinessGaugeProps {
  readonly score: number;            // 0-100
  readonly benchmark: number;        // passing threshold
  readonly passProbability: number;   // 0.0-1.0
  readonly size?: number;            // px, default 200
}

interface ReadinessTrendChartProps {
  readonly data: readonly ReadinessTrendPoint[];
  readonly benchmark: number;
}
```

**States:**
1. **Loading** — Skeleton gauge + skeleton bars
2. **Empty** — "Complete at least 2 practice sessions to see your readiness score" with CTA
3. **Data** — Full gauge with trend, systems, optional cohort
4. **Error** — Error message with retry button
5. **Cohort unavailable** — "Not enough peers in your cohort yet" (cohort < 10)

**Design tokens:**
- Gauge fill: gradient from `#2b71b9` (Blue Mid) to `#69a338` (Green) based on score
- Benchmark line: dashed `#002c76` (Navy Deep)
- Background: White card on Cream surface
- Score text: 48px DM Mono bold, Navy Deep
- Confidence text: 14px Source Sans 3, muted gray
- Trend chart: `#2b71b9` line, `#69a338` benchmark reference
- System bars: `#2b71b9` fill, `#f5f3ef` (Cream) track
- Spacing: 24px card padding, 16px internal gaps

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/student/readiness.types.ts` | Types | Create |
| 2 | `packages/types/src/student/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add student export) |
| 4 | `apps/server/src/data/usmle-benchmarks.ts` | Data | Create |
| 5 | `apps/server/src/errors/readiness.error.ts` | Errors | Create |
| 6 | Supabase migration via MCP (indexes + profile column) | Database | Apply |
| 7 | `apps/server/src/services/student/readiness.service.ts` | Service | Create |
| 8 | `apps/server/src/controllers/student/readiness.controller.ts` | Controller | Create |
| 9 | `apps/server/src/index.ts` | Routes | Edit (add student readiness route) |
| 10 | `packages/ui/src/components/atoms/readiness-gauge.tsx` | Atom | Create |
| 11 | `apps/web/src/components/student/readiness-trend-chart.tsx` | Molecule | Create |
| 12 | `apps/web/src/components/student/readiness-tracker.tsx` | Organism | Create |
| 13 | `apps/web/src/app/(protected)/dashboard/student/page.tsx` | Page | Edit (add ReadinessTracker) |
| 14 | `apps/server/src/__tests__/readiness.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-ST-2 | student | **REQUIRED** | Student Dashboard Page (mount point for widget) |
| STORY-U-6 | universal | **DONE** | RBAC middleware for student-only enforcement |
| STORY-U-7 | universal | **DONE** | USMLE seed data (system codes/names for blueprint weights) |

### NPM Packages (already installed or to add)
- `@supabase/supabase-js` — Supabase client
- `recharts` — Trend mini-chart
- `lucide-react` — Icons (Info tooltip icon)
- `neo4j-driver` — Neo4j queries for system-level aggregation

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` — `Neo4jClientConfig`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.STUDENT)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`, `AuthTokenPayload`
- `packages/types/src/auth/roles.types.ts` — `AuthRole`
- `packages/types/src/frameworks/usmle.types.ts` — `USMLESystem` (system codes)

## 9. Test Fixtures

```typescript
// USMLE Blueprint weights (subset for testing)
export const MOCK_BLUEPRINT_WEIGHTS = [
  { system_code: "CVS", system_name: "Cardiovascular", weight: 0.11 },
  { system_code: "RESP", system_name: "Respiratory", weight: 0.09 },
  { system_code: "RENAL", system_name: "Renal/Urinary", weight: 0.08 },
  { system_code: "GI", system_name: "Gastrointestinal", weight: 0.09 },
  { system_code: "ENDO", system_name: "Endocrine", weight: 0.08 },
  { system_code: "REPRO", system_name: "Reproductive", weight: 0.07 },
  { system_code: "MSK", system_name: "Musculoskeletal", weight: 0.06 },
  { system_code: "HEME", system_name: "Hematologic/Lymphoreticular", weight: 0.08 },
  { system_code: "NEURO", system_name: "Nervous System/Special Senses", weight: 0.10 },
  { system_code: "SKIN", system_name: "Skin/Subcutaneous", weight: 0.04 },
  { system_code: "BEHAV", system_name: "Behavioral/Emotional", weight: 0.07 },
  { system_code: "IMMUNE", system_name: "Immune", weight: 0.06 },
  { system_code: "BIO", system_name: "Biostatistics/Epi", weight: 0.04 },
  { system_code: "MULTI", system_name: "Multisystem", weight: 0.03 },
];

// Mock benchmark
export const MOCK_BENCHMARK: ReadinessBenchmark = {
  year: 2024,
  passing_score: 60,
  mean_score: 234,
  std_dev: 20,
  source: "USMLE Performance Data 2024",
};

// Mock student auth token
export const STUDENT_USER = {
  sub: "student-uuid-1",
  email: "alice@msm.edu",
  role: "student" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock faculty user (should be denied)
export const FACULTY_USER = {
  ...STUDENT_USER,
  sub: "faculty-uuid-1",
  email: "prof@msm.edu",
  role: "faculty" as const,
};

// Mock mastery data per system (from Neo4j aggregation)
export const MOCK_SYSTEM_MASTERY = [
  { system_code: "CVS", system_name: "Cardiovascular", avg_mastery: 0.72, concept_count: 18 },
  { system_code: "RESP", system_name: "Respiratory", avg_mastery: 0.65, concept_count: 14 },
  { system_code: "RENAL", system_name: "Renal/Urinary", avg_mastery: 0.58, concept_count: 12 },
  { system_code: "GI", system_name: "Gastrointestinal", avg_mastery: 0.70, concept_count: 15 },
  { system_code: "ENDO", system_name: "Endocrine", avg_mastery: 0.55, concept_count: 10 },
  { system_code: "REPRO", system_name: "Reproductive", avg_mastery: 0.62, concept_count: 8 },
  { system_code: "MSK", system_name: "Musculoskeletal", avg_mastery: 0.68, concept_count: 11 },
  { system_code: "HEME", system_name: "Hematologic/Lymphoreticular", avg_mastery: 0.60, concept_count: 13 },
  { system_code: "NEURO", system_name: "Nervous System/Special Senses", avg_mastery: 0.75, concept_count: 20 },
  { system_code: "SKIN", system_name: "Skin/Subcutaneous", avg_mastery: 0.80, concept_count: 6 },
  { system_code: "BEHAV", system_name: "Behavioral/Emotional", avg_mastery: 0.50, concept_count: 9 },
  { system_code: "IMMUNE", system_name: "Immune", avg_mastery: 0.63, concept_count: 10 },
  { system_code: "BIO", system_name: "Biostatistics/Epi", avg_mastery: 0.45, concept_count: 5 },
  { system_code: "MULTI", system_name: "Multisystem", avg_mastery: 0.55, concept_count: 4 },
];

// Mock trend data (4 weekly points)
export const MOCK_TREND = [
  { date: "2026-01-27", score: 55, session_count: 3 },
  { date: "2026-02-03", score: 60, session_count: 5 },
  { date: "2026-02-10", score: 64, session_count: 4 },
  { date: "2026-02-17", score: 68, session_count: 6 },
];

// Mock practice sessions (for session count check)
export const MOCK_SESSIONS = [
  { id: "sess-1", student_id: "student-uuid-1", completed_at: "2026-02-10T10:00:00Z", score: 0.72 },
  { id: "sess-2", student_id: "student-uuid-1", completed_at: "2026-02-17T14:00:00Z", score: 0.78 },
];

// Mock cohort comparison
export const MOCK_COHORT: CohortComparison = {
  cohort_mean: 62,
  cohort_median: 64,
  student_percentile: 72,
  cohort_size: 48,
};
```

## 10. API Test Spec (vitest)

**File:** `apps/server/src/__tests__/readiness.controller.test.ts`

```
describe("ReadinessController")
  describe("handleGetReadiness")
    it returns readiness score for authenticated student (200)
    it computes weighted score correctly from system mastery and blueprint weights
    it returns confidence interval with pass probability
    it returns 4-week trend data sorted by date ascending
    it returns benchmark data with passing threshold
    it rejects unauthenticated request (401)
    it rejects non-student roles (403 FORBIDDEN)
    it returns 404 INSUFFICIENT_DATA when student has < 2 sessions
    it returns null cohort when include_cohort is false
    it returns null cohort when student has not opted in
    it returns null cohort when cohort size < 10

describe("ReadinessService")
  describe("getReadiness")
    it aggregates mastery from Neo4j grouped by USMLE system
    it applies blueprint weights correctly (sum of weighted scores = total score)
    it computes confidence interval from score and std_dev
    it queries Supabase for weekly trend aggregation
    it includes cohort comparison when opted in and cohort >= 10
    it throws InsufficientDataError when session count < 2
```

**Total: ~17 tests** (11 controller + 6 service)

## 11. E2E Test Spec (Playwright)

Not required for this story. The readiness tracker is not part of the 5 critical user journeys. Visual gauge rendering will be verified manually.

## 12. Acceptance Criteria

1. Readiness score (0-100) displays as a circular gauge on the student dashboard
2. Benchmark line shows historical passing threshold on the gauge
3. Confidence interval visualization shows pass probability (e.g., "75% chance of passing")
4. Cohort comparison is opt-in (default: off) and only shown when cohort >= 10
5. Trend mini-chart shows readiness over last 4 weeks
6. Tooltip explains readiness calculation methodology
7. Historical benchmark data is seeded from USMLE pass-rate statistics
8. Service layer computes readiness from aggregate mastery weighted by blueprint
9. Loading state shows skeleton gauge and bars
10. Empty state shown when student has < 2 practice sessions
11. Non-student roles receive 403 Forbidden
12. All 17 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Student dashboard readiness widget | ARCHITECTURE_v10 SS 13.1: Student Dashboard |
| USMLE blueprint weights for readiness | ARCHITECTURE_v10 SS 10.3: Adaptive Practice |
| Student, ConceptMastery nodes | NODE_REGISTRY_v1 SS Layer 5 |
| Readiness gauge component | DESIGN_SPEC SS Group D: StudentProgress |
| mastery_estimates table | SUPABASE_DDL_v1 SS Student Tables |
| practice_sessions table | SUPABASE_DDL_v1 SS Student Tables |
| Sprint 27 placement | ROADMAP_v2_3 SS Sprint 27 |
| Readiness = weighted mastery average | S-ST-42-3 SS Acceptance Criteria |
| UF-32 Student Dashboard flow | UF-32 SS Progress Tracking |

## 14. Environment Prerequisites

- **Supabase:** Project running, `mastery_estimates` and `practice_sessions` tables exist, `profiles.comparative_analytics_opt_in` column added
- **Neo4j:** Running with USMLE seed data (227 nodes from STORY-U-7), Student/ConceptMastery nodes from STORY-ST-2
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000 with student dashboard page from STORY-ST-2
- **Recharts:** Installed in apps/web (used for trend mini-chart)

## 15. Figma / Make Prototype

**Gauge layout (ASCII wireframe):**
```
+-------------------------------------------+
|  Step 1 Readiness            [i] tooltip   |
|                                            |
|         ____------____                     |
|       /       68       \    benchmark: 60  |
|      |    --------      |   .............. |
|       \  75% chance   /                    |
|         ----______----                     |
|                                            |
|  Trend (4 weeks)                           |
|    68 ___..........___                     |
|    55 /               \                    |
|       W1  W2  W3  W4                       |
|                                            |
|  System Breakdown                          |
|  CVS     ████████████░░░░  72%             |
|  NEURO   █████████████░░░  75%             |
|  RESP    ████████░░░░░░░░  65%             |
|  ...                                       |
|                                            |
|  [ ] Compare with cohort (opt-in)          |
+-------------------------------------------+
```
