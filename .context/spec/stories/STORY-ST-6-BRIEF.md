# STORY-ST-6 Brief: Mastery Breakdown Component

## 0. Lane & Priority

```yaml
story_id: STORY-ST-6
old_id: S-ST-42-2
lane: student
lane_priority: 4
within_lane_order: 6
sprint: 27
size: M
depends_on:
  - STORY-ST-2 (student) — Student Dashboard Page
blocks: []
personas_served: [student]
epic: E-42 (Student Dashboard)
feature: F-20 (Student Dashboard & Analytics)
user_flow: UF-30 (Student Dashboard Review)
```

## 1. Summary

Build a **concept-level mastery breakdown component** for the student dashboard that shows progress bars per concept, grouped by USMLE system. Each system is an expandable section revealing its child concepts with individual mastery percentages. Students can quickly identify which specific topics need more study time.

Key constraints:
- **Student-scoped** -- mastery data is per-student, filtered by `student_id`
- **Color-coded** -- mastered (green > 80%), in-progress (yellow 50-80%), weak (red < 50%)
- **Sortable concepts** -- weakest-first (default) or alphabetical
- **Concept count badges** -- e.g., "12/45 mastered" per system
- **Mock data** -- Sprint 27 uses mock mastery data (BKT/IRT not ready until Sprint 31)
- **Accessible** -- proper ARIA labels on all progress bars
- **Smooth animations** -- expand/collapse transitions

## 2. Task Breakdown

1. **Types** -- Create `ConceptMastery`, `SystemMasteryGroup`, `MasteryBreakdownQuery`, `MasteryBreakdownResponse` in `packages/types/src/student/mastery.types.ts`
2. **Service** -- `MasteryBreakdownService` in `apps/server/src/services/student/mastery-breakdown.service.ts`
3. **Mock data service** -- `MockMasteryDataService` in `apps/server/src/services/student/mock-mastery-data.service.ts` providing realistic concept mastery data
4. **Controller** -- `MasteryBreakdownController` in `apps/server/src/controllers/student/mastery-breakdown.controller.ts`
5. **Routes** -- Protected route `GET /api/v1/student/mastery` with student auth
6. **Frontend organism** -- `MasteryBreakdownSection` composing system groups
7. **Frontend molecules** -- `SystemMasteryGroup`, `ConceptProgressRow`, `MasteryCountBadge`
8. **Frontend atoms** -- `MasteryProgressBar`, `SortToggle`
9. **API tests** -- 14 tests covering list, sorting, auth, grouping
10. **Wire up** -- Register route in `apps/server/src/index.ts`

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/student/mastery.types.ts

/**
 * Sort options for concepts within a system group.
 */
export type ConceptSortMode = "weakest_first" | "alphabetical";

/**
 * Query parameters for GET /api/v1/student/mastery.
 */
export interface MasteryBreakdownQuery {
  readonly sort?: ConceptSortMode;  // Default: "weakest_first"
}

/**
 * Single concept mastery record.
 */
export interface ConceptMastery {
  readonly concept_id: string;
  readonly concept_name: string;
  readonly p_mastered: number;       // 0.0 to 1.0 (probability of mastery)
  readonly mastery_percent: number;  // 0 to 100 (for display)
  readonly mastery_level: "mastered" | "in_progress" | "weak";
  readonly last_practiced_at: string | null;   // ISO timestamp
  readonly attempt_count: number;
}

/**
 * Mastery data grouped by USMLE system.
 */
export interface SystemMasteryGroup {
  readonly system_id: string;
  readonly system_name: string;
  readonly system_code: string;          // e.g., "CVS", "RESP"
  readonly concepts: ConceptMastery[];
  readonly total_concepts: number;
  readonly mastered_count: number;       // concepts with mastery_percent > 80
  readonly in_progress_count: number;    // concepts with mastery_percent 50-80
  readonly weak_count: number;           // concepts with mastery_percent < 50
  readonly average_mastery: number;      // system-level average (0-100)
}

/**
 * Response for GET /api/v1/student/mastery.
 */
export interface MasteryBreakdownResponse {
  readonly systems: SystemMasteryGroup[];
  readonly overall_mastery: number;      // global average across all concepts (0-100)
  readonly total_concepts: number;
  readonly total_mastered: number;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_mastery_estimates_table
-- Concept-level mastery estimates per student

CREATE TABLE mastery_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL,
  concept_name TEXT NOT NULL,             -- denormalized for read performance
  usmle_system_id UUID NOT NULL,
  usmle_system_name TEXT NOT NULL,        -- denormalized
  usmle_system_code TEXT NOT NULL,        -- denormalized
  p_mastered FLOAT NOT NULL DEFAULT 0
    CHECK (p_mastered >= 0 AND p_mastered <= 1),
  last_practiced_at TIMESTAMPTZ,
  attempt_count INT NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'synced', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One mastery estimate per student per concept
CREATE UNIQUE INDEX idx_mastery_student_concept
  ON mastery_estimates(student_id, concept_id);

-- Student-scoped queries
CREATE INDEX idx_mastery_student ON mastery_estimates(student_id);

-- System grouping
CREATE INDEX idx_mastery_student_system
  ON mastery_estimates(student_id, usmle_system_id);

-- Weak concept lookups
CREATE INDEX idx_mastery_student_pmastered
  ON mastery_estimates(student_id, p_mastered);

-- RLS policies
ALTER TABLE mastery_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own mastery"
  ON mastery_estimates
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Service role full access on mastery_estimates"
  ON mastery_estimates
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

```cypher
// Neo4j schema for mastery (dual-write target, Layer 5)

// ConceptMastery node
CREATE CONSTRAINT concept_mastery_id IF NOT EXISTS
  FOR (cm:ConceptMastery) REQUIRE cm.id IS UNIQUE;

// Relationships:
// (Student)-[:HAS_MASTERY]->(ConceptMastery)
// (ConceptMastery)-[:FOR_CONCEPT]->(SubConcept)
// ConceptMastery properties: { p_mastered, attempt_count, last_practiced_at }
```

## 5. API Contract (complete request/response)

### GET /api/v1/student/mastery (Auth: student role)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sort` | string | `weakest_first` | `weakest_first` or `alphabetical` |

**Success Response (200):**
```json
{
  "data": {
    "systems": [
      {
        "system_id": "sys-uuid-1",
        "system_name": "Cardiovascular System",
        "system_code": "CVS",
        "concepts": [
          {
            "concept_id": "concept-uuid-1",
            "concept_name": "Heart Failure Pathophysiology",
            "p_mastered": 0.35,
            "mastery_percent": 35,
            "mastery_level": "weak",
            "last_practiced_at": "2026-02-18T10:00:00Z",
            "attempt_count": 12
          },
          {
            "concept_id": "concept-uuid-2",
            "concept_name": "Cardiac Output Regulation",
            "p_mastered": 0.72,
            "mastery_percent": 72,
            "mastery_level": "in_progress",
            "last_practiced_at": "2026-02-19T14:00:00Z",
            "attempt_count": 28
          },
          {
            "concept_id": "concept-uuid-3",
            "concept_name": "Valvular Heart Disease",
            "p_mastered": 0.91,
            "mastery_percent": 91,
            "mastery_level": "mastered",
            "last_practiced_at": "2026-02-17T09:00:00Z",
            "attempt_count": 45
          }
        ],
        "total_concepts": 12,
        "mastered_count": 4,
        "in_progress_count": 5,
        "weak_count": 3,
        "average_mastery": 64.2
      }
    ],
    "overall_mastery": 58.7,
    "total_concepts": 145,
    "total_mastered": 42
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-student role |
| 400 | `VALIDATION_ERROR` | Invalid sort parameter |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Component: Mastery Breakdown (within Student Dashboard)

**Route:** Part of `apps/web/src/app/(protected)/dashboard/student/page.tsx`

**Component hierarchy:**
```
StudentDashboardPage (page.tsx -- default export)
  └── MasteryBreakdownSection (organism)
        ├── SectionHeader ("Concept Mastery" + overall mastery badge)
        ├── OverallMasteryBar (molecule: full-width summary bar)
        ├── SortToggle (atom: "Weakest First" | "A-Z" toggle)
        ├── SystemMasteryGroup[] (organism, one per USMLE system)
        │     ├── SystemHeader (molecule: clickable expand/collapse)
        │     │     ├── SystemName (atom: text)
        │     │     ├── MasteryCountBadge (atom: "12/45 mastered")
        │     │     ├── SystemAveragePill (atom: "64%" with color)
        │     │     └── ChevronIcon (atom: rotates on expand)
        │     └── ConceptList (molecule: animated expand/collapse)
        │           └── ConceptProgressRow[] (molecule)
        │                 ├── ConceptName (atom: text)
        │                 ├── MasteryProgressBar (atom: colored bar + % label)
        │                 └── AttemptCount (atom: muted text "45 attempts")
        ├── EmptyState (atom: "No mastery data yet" illustration)
        └── LoadingSkeleton (molecule: animated system group placeholders)
```

**States:**
1. **Loading** -- Skeleton with 4 system group placeholders, shimmer animation
2. **Empty** -- "Start practicing to see your mastery breakdown." with CTA button
3. **Data** -- System groups, all collapsed by default
4. **Expanded** -- One or more system groups open, showing concept progress bars
5. **Error** -- "Could not load mastery data" with retry button

**Design tokens:**
- Surface: White card on Cream background (`#f5f3ef` bg, `#ffffff` card)
- Mastered bar: `#69a338` (Green) -- mastery_percent > 80
- In-progress bar: `#d4a017` (Yellow) -- mastery_percent 50-80
- Weak bar: `#c4463a` (Red) -- mastery_percent < 50
- Progress bar track: `#e8e6e1` (light gray)
- Progress bar height: 8px, border-radius: 9999px (rounded-full)
- Percentage label: positioned right of bar, same color as bar
- Badge: pill shape, `bg-opacity-10` of the count color, text in matching color
- Expanded section bg: `#faf9f6` (Parchment nested surface)
- System header hover: `#faf9f6`
- Typography: DM Sans semibold for system names, Source Sans 3 regular for concept names
- Spacing: 16px between system groups, 8px between concept rows, 12px padding inside expanded section
- Animation: `transition-all duration-200 ease-in-out` for expand/collapse, `max-height` based
- Chevron rotation: `transform rotate-180 transition-transform duration-200`

**Accessibility:**
```html
<!-- Progress bar ARIA pattern -->
<div
  role="progressbar"
  aria-valuenow={72}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label="Cardiac Output Regulation mastery: 72%"
>
  <div style="width: 72%" />
</div>

<!-- System group ARIA pattern -->
<div role="region" aria-labelledby="system-cvs-header">
  <button
    id="system-cvs-header"
    aria-expanded={isExpanded}
    aria-controls="system-cvs-content"
  >
    Cardiovascular System
  </button>
  <div id="system-cvs-content" role="group">
    <!-- concept rows -->
  </div>
</div>
```

**Props:**
```typescript
// MasteryBreakdownSection
interface MasteryBreakdownSectionProps {
  readonly studentId: string;
}

// SystemMasteryGroup
interface SystemMasteryGroupProps {
  readonly system: SystemMasteryGroup;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
  readonly conceptSort: ConceptSortMode;
}

// ConceptProgressRow
interface ConceptProgressRowProps {
  readonly concept: ConceptMastery;
}

// MasteryProgressBar
interface MasteryProgressBarProps {
  readonly percent: number;             // 0-100
  readonly level: "mastered" | "in_progress" | "weak";
  readonly label: string;               // accessible label
}

// MasteryCountBadge
interface MasteryCountBadgeProps {
  readonly mastered: number;
  readonly total: number;
}

// SortToggle
interface SortToggleProps {
  readonly value: ConceptSortMode;
  readonly onChange: (mode: ConceptSortMode) => void;
}
```

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/student/mastery.types.ts` | Types | Create |
| 2 | `packages/types/src/student/index.ts` | Types | Edit (add mastery export) |
| 3 | `packages/types/src/index.ts` | Types | Edit (add student export if not done) |
| 4 | Supabase migration via MCP (mastery_estimates table) | Database | Apply |
| 5 | `apps/server/src/services/student/mastery-breakdown.service.ts` | Service | Create |
| 6 | `apps/server/src/services/student/mock-mastery-data.service.ts` | Service | Create |
| 7 | `apps/server/src/controllers/student/mastery-breakdown.controller.ts` | Controller | Create |
| 8 | `apps/server/src/index.ts` | Routes | Edit (add mastery route) |
| 9 | `apps/web/src/components/student/mastery-breakdown-section.tsx` | Organism | Create |
| 10 | `apps/web/src/components/student/system-mastery-group.tsx` | Organism | Create |
| 11 | `apps/web/src/components/student/concept-progress-row.tsx` | Molecule | Create |
| 12 | `apps/web/src/components/student/mastery-progress-bar.tsx` | Atom | Create |
| 13 | `apps/web/src/components/student/mastery-count-badge.tsx` | Atom | Create |
| 14 | `apps/web/src/components/student/sort-toggle.tsx` | Atom | Create |
| 15 | `apps/web/src/hooks/use-mastery-breakdown.ts` | Hook | Create |
| 16 | `apps/server/src/services/student/__tests__/mastery-breakdown.service.test.ts` | Tests | Create |
| 17 | `apps/server/src/controllers/student/__tests__/mastery-breakdown.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-ST-2 | student | NOT STARTED | Student Dashboard Page -- provides the dashboard shell and layout |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `express` -- Server framework
- `vitest` -- Testing
- `lucide-react` -- Icons (ChevronDown, ChevronUp, BarChart3)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` -- `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` -- `rbac.require(AuthRole.STUDENT)`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>`
- `packages/types/src/frameworks/usmle.types.ts` -- `USMLESystem` (for system metadata)

## 9. Test Fixtures (inline)

```typescript
// apps/server/src/services/student/__tests__/fixtures/mastery.fixtures.ts

export const STUDENT_USER = {
  sub: "student-uuid-1",
  email: "marcus@msm.edu",
  role: "student" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

export const FACULTY_USER = {
  ...STUDENT_USER,
  sub: "faculty-uuid-1",
  email: "faculty@msm.edu",
  role: "faculty" as const,
};

export const MOCK_MASTERY_ROWS = [
  {
    id: "mastery-1",
    student_id: "student-uuid-1",
    concept_id: "concept-1",
    concept_name: "Heart Failure Pathophysiology",
    usmle_system_id: "sys-1",
    usmle_system_name: "Cardiovascular System",
    usmle_system_code: "CVS",
    p_mastered: 0.35,
    last_practiced_at: "2026-02-18T10:00:00Z",
    attempt_count: 12,
  },
  {
    id: "mastery-2",
    student_id: "student-uuid-1",
    concept_id: "concept-2",
    concept_name: "Cardiac Output Regulation",
    usmle_system_id: "sys-1",
    usmle_system_name: "Cardiovascular System",
    usmle_system_code: "CVS",
    p_mastered: 0.72,
    last_practiced_at: "2026-02-19T14:00:00Z",
    attempt_count: 28,
  },
  {
    id: "mastery-3",
    student_id: "student-uuid-1",
    concept_id: "concept-3",
    concept_name: "Valvular Heart Disease",
    usmle_system_id: "sys-1",
    usmle_system_name: "Cardiovascular System",
    usmle_system_code: "CVS",
    p_mastered: 0.91,
    last_practiced_at: "2026-02-17T09:00:00Z",
    attempt_count: 45,
  },
  {
    id: "mastery-4",
    student_id: "student-uuid-1",
    concept_id: "concept-4",
    concept_name: "Gas Exchange Physiology",
    usmle_system_id: "sys-2",
    usmle_system_name: "Respiratory System",
    usmle_system_code: "RESP",
    p_mastered: 0.55,
    last_practiced_at: "2026-02-16T11:00:00Z",
    attempt_count: 18,
  },
  {
    id: "mastery-5",
    student_id: "student-uuid-1",
    concept_id: "concept-5",
    concept_name: "Obstructive Lung Disease",
    usmle_system_id: "sys-2",
    usmle_system_name: "Respiratory System",
    usmle_system_code: "RESP",
    p_mastered: 0.88,
    last_practiced_at: "2026-02-15T09:00:00Z",
    attempt_count: 32,
  },
];

// Expected grouped output for MOCK_MASTERY_ROWS
export const EXPECTED_CVS_GROUP = {
  system_id: "sys-1",
  system_name: "Cardiovascular System",
  system_code: "CVS",
  total_concepts: 3,
  mastered_count: 1,     // Valvular (91%)
  in_progress_count: 1,  // Cardiac Output (72%)
  weak_count: 1,         // Heart Failure (35%)
  average_mastery: 66.0, // (35 + 72 + 91) / 3
};

export const EXPECTED_RESP_GROUP = {
  system_id: "sys-2",
  system_name: "Respiratory System",
  system_code: "RESP",
  total_concepts: 2,
  mastered_count: 1,     // Obstructive (88%)
  in_progress_count: 1,  // Gas Exchange (55%)
  weak_count: 0,
  average_mastery: 71.5, // (55 + 88) / 2
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/controllers/student/__tests__/mastery-breakdown.controller.test.ts`

```
describe("MasteryBreakdownController")
  describe("handleGetMastery")
    - returns mastery data grouped by USMLE system for authenticated student (200)
    - returns correct system-level aggregates (mastered_count, weak_count, average)
    - returns overall_mastery and total counts in response
    - sorts concepts weakest-first by default
    - sorts concepts alphabetically when sort=alphabetical
    - rejects unauthenticated request (401)
    - rejects non-student roles (403 FORBIDDEN)
    - rejects invalid sort parameter (400 VALIDATION_ERROR)
    - returns empty systems array when student has no mastery data
    - returns only mastery data belonging to authenticated student
```

**File:** `apps/server/src/services/student/__tests__/mastery-breakdown.service.test.ts`

```
describe("MasteryBreakdownService")
  describe("getMastery")
    - queries mastery_estimates filtered by student_id
    - groups concepts by usmle_system_id correctly
    - calculates mastery_level: "mastered" for p_mastered > 0.8
    - calculates mastery_level: "in_progress" for p_mastered 0.5-0.8
    - calculates mastery_level: "weak" for p_mastered < 0.5
    - computes mastered_count, in_progress_count, weak_count per system
    - computes average_mastery per system correctly
    - computes overall_mastery across all concepts
    - sorts concepts weakest-first when requested
    - sorts concepts alphabetically when requested
    - returns mastery_percent as integer (p_mastered * 100, rounded)
```

**Total: ~21 tests** (10 controller + 11 service)

## 11. E2E Test Spec (Playwright)

Not required for this story alone. The mastery breakdown is part of the broader "Student reviews dashboard" journey. The E2E test covering this will be authored as part of the dashboard integration in ST-2.

## 12. Acceptance Criteria

1. Expandable section per USMLE system shows child concepts with progress bars
2. Progress bar per concept displays percentage label
3. Color coding: mastered green (> 80%), in-progress yellow (50-80%), weak red (< 50%)
4. Default sort: weakest concepts first
5. Toggle sort between weakest-first and alphabetical
6. Concept count badge per system shows "N/M mastered" (e.g., "12/45 mastered")
7. Mock data service provides realistic concept-level mastery for Sprint 27
8. Smooth expand/collapse animation on system sections
9. ARIA labels on all progress bars (`role="progressbar"`, `aria-valuenow`, `aria-label`)
10. Students can only view their own mastery data
11. Non-student roles receive 403 Forbidden
12. All 21 tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Concept-level progress bars | S-ST-42-2 SS Acceptance Criteria |
| Mastery color thresholds (80/50) | ARCHITECTURE_v10 SS 10.3 — Mastery Classification |
| mastery_estimates table | SUPABASE_DDL_v1 SS Student Performance Tables |
| ConceptMastery node (Neo4j Layer 5) | NODE_REGISTRY_v1 SS Layer 5 — ConceptMastery |
| HAS_MASTERY, FOR_CONCEPT relationships | NODE_REGISTRY_v1 SS Layer 5 — Relationships |
| Student dashboard Template E | DESIGN_SPEC SS Template E — Student Dashboard |
| Surface system (Cream/White/Parchment) | DESIGN_SPEC SS Group D — Color Tokens |
| Mock mastery data for Sprint 27 | ROADMAP_v2_3 SS Sprint 27 — "mock mastery" |
| USMLE systems (16 nodes) | NODE_REGISTRY_v1 SS Layer 2 — USMLE_System |
| Marcus Williams persona | PRODUCT_BRIEF SS Marcus Williams — "identify weak topics" |
| ARIA progressbar pattern | WAI-ARIA Authoring Practices 1.2 SS Range Widgets |

## 14. Environment Prerequisites

- **Supabase:** Project running, `mastery_estimates` table created
- **Express:** Server running on port 3001 with auth middleware active
- **Next.js:** Web app running on port 3000
- **Student dashboard shell** from STORY-ST-2 must exist
- **USMLE seed data** from STORY-U-7 must exist (system names/codes referenced)
- **No Neo4j needed** for initial read path (sync_status column supports future dual-write)

## 15. Figma Make Prototype

**Optional.** The expand/collapse accordion and progress bar components are standard patterns. The color-coded mastery bars with percentage labels could benefit from a quick Figma prototype to validate the visual density when 15+ concepts are shown under a single system, but this can be coded directly from the design token spec above.
