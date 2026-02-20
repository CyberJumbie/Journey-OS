# STORY-F-6 Brief: Activity Feed Component

## 0. Lane & Priority

```yaml
story_id: STORY-F-6
old_id: S-F-32-1
lane: faculty
lane_priority: 3
within_lane_order: 6
sprint: 8
size: M
depends_on:
  - STORY-U-6 (universal) — RBAC Middleware ✅ DONE
blocks: []
personas_served: [faculty, faculty_course_director]
epic: E-32 (Faculty Dashboard)
feature: F-15 (Faculty Dashboard)
user_flow: UF-15 (Faculty Dashboard Overview)
```

## 1. Summary

Build an **activity feed component** for the faculty dashboard that displays a chronological list of recent generation, review, and approval events. The feed supports infinite scroll pagination via IntersectionObserver, multi-select event type filtering, and 30-second polling for near-real-time updates (Socket.io upgrade deferred to E-35).

This is a read-only service. Events are written by other services (generation pipeline, review workflow, coverage analysis). The ActivityFeedService only reads from the `activity_events` Supabase table.

Key constraints:
- **Authenticated faculty/admin only** — RBAC enforced
- New `activity_events` table in Supabase (migration needed)
- Offset-based pagination (20 items per request, infinite scroll)
- 6 event types: `question_generated`, `question_reviewed`, `question_approved`, `question_rejected`, `coverage_gap_detected`, `bulk_generation_complete`
- Relative timestamps via `date-fns/formatDistanceToNow`
- Icons from Lucide (shadcn/ui)
- Empty state: "No recent activity"

## 2. Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define `ActivityEvent`, `ActivityEventType`, `ActivityFeedQuery`, `ActivityFeedResponse` types | `packages/types/src/dashboard/activity.types.ts` | 30m |
| 2 | Create barrel export for dashboard types | `packages/types/src/dashboard/index.ts` | 5m |
| 3 | Create `activity_events` table migration via Supabase MCP | Supabase migration | 15m |
| 4 | Create custom error class `ActivityEventNotFoundError` | `apps/server/src/errors/activity.error.ts` | 10m |
| 5 | Implement `ActivityFeedRepository` with Supabase queries | `apps/server/src/repositories/activity.repository.ts` | 45m |
| 6 | Implement `ActivityFeedService` with list + filter logic | `apps/server/src/services/activity/activity-feed.service.ts` | 45m |
| 7 | Implement `ActivityFeedController` with `handleList()` | `apps/server/src/controllers/activity.controller.ts` | 30m |
| 8 | Register route `GET /api/v1/activity` in server index | `apps/server/src/index.ts` | 10m |
| 9 | Build `ActivityIcon` atom | `packages/ui/src/atoms/activity-icon.tsx` | 20m |
| 10 | Build `RelativeTime` atom | `packages/ui/src/atoms/relative-time.tsx` | 15m |
| 11 | Build `ActivityEventRow` molecule | `packages/ui/src/molecules/activity-event-row.tsx` | 30m |
| 12 | Build `ActivityFeed` organism with infinite scroll + filter | `apps/web/src/components/dashboard/activity-feed.tsx` | 90m |
| 13 | Build `useActivityFeed` hook with polling | `apps/web/src/hooks/use-activity-feed.ts` | 45m |
| 14 | Write API tests (14 tests) | `apps/server/src/__tests__/activity-feed.controller.test.ts` | 90m |

**Total estimate:** ~8 hours (Size M)

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/dashboard/activity.types.ts

/** Supported activity event types */
export type ActivityEventType =
  | "question_generated"
  | "question_reviewed"
  | "question_approved"
  | "question_rejected"
  | "coverage_gap_detected"
  | "bulk_generation_complete";

/** Single activity event record */
export interface ActivityEvent {
  readonly id: string;
  readonly user_id: string;
  readonly institution_id: string;
  readonly event_type: ActivityEventType;
  readonly entity_id: string;
  readonly entity_type: string;
  readonly metadata: ActivityEventMetadata;
  readonly created_at: string;
}

/** Metadata JSONB structure for activity events */
export interface ActivityEventMetadata {
  /** Human-readable event description */
  readonly description: string;
  /** Course name associated with this event */
  readonly course_name: string | null;
  /** Display name of the actor who triggered the event */
  readonly actor_name: string;
  /** Number of items (for bulk events) */
  readonly count?: number;
  /** Additional context per event type */
  readonly [key: string]: unknown;
}

/** Query parameters for the activity feed endpoint */
export interface ActivityFeedQuery {
  readonly user_id: string;
  readonly limit?: number;           // Default: 20, max: 50
  readonly offset?: number;          // Default: 0
  readonly event_types?: readonly ActivityEventType[];  // Filter by type (multi-select)
}

/** Response envelope for the activity feed */
export interface ActivityFeedResponse {
  readonly events: readonly ActivityEvent[];
  readonly meta: {
    readonly limit: number;
    readonly offset: number;
    readonly total: number;
    readonly has_more: boolean;
  };
}
```

## 4. Database Schema (inline, complete)

```sql
-- New table: activity_events
CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'question_generated',
    'question_reviewed',
    'question_approved',
    'question_rejected',
    'coverage_gap_detected',
    'bulk_generation_complete'
  )),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX idx_activity_events_user_id ON activity_events(user_id);
CREATE INDEX idx_activity_events_institution_id ON activity_events(institution_id);
CREATE INDEX idx_activity_events_event_type ON activity_events(event_type);
CREATE INDEX idx_activity_events_created_at ON activity_events(created_at DESC);
CREATE INDEX idx_activity_events_user_created ON activity_events(user_id, created_at DESC);

-- RLS policies
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity events"
  ON activity_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view institution activity events"
  ON activity_events FOR SELECT
  USING (institution_id IN (
    SELECT institution_id FROM user_profiles WHERE id = auth.uid()
  ));
```

## 5. API Contract (complete request/response)

### GET /api/v1/activity (Auth: Faculty, Course Director, Admin)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `user_id` | string (UUID) | required | User whose events to fetch |
| `limit` | number | 20 | Items per request (max 50) |
| `offset` | number | 0 | Pagination offset |
| `event_types` | string (comma-separated) | all | Filter: comma-separated event types |

**Success Response (200):**
```json
{
  "data": {
    "events": [
      {
        "id": "evt-uuid-1",
        "user_id": "user-uuid-1",
        "institution_id": "inst-uuid-1",
        "event_type": "question_generated",
        "entity_id": "question-uuid-1",
        "entity_type": "assessment_item",
        "metadata": {
          "description": "Generated a new cardiology question",
          "course_name": "Cardiovascular Medicine",
          "actor_name": "Dr. Jane Smith",
          "count": 1
        },
        "created_at": "2026-02-19T14:30:00Z"
      }
    ],
    "meta": {
      "limit": 20,
      "offset": 0,
      "total": 45,
      "has_more": true
    }
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | User cannot access requested user_id's events |
| 400 | `VALIDATION_ERROR` | Invalid query params (bad UUID, invalid event type) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Component Hierarchy (Atomic Design)

```
FacultyDashboard (Template — from E-32 layout)
  └── ActivityFeed (Organism — client component)
        ├── EventTypeFilter (Molecule — multi-select dropdown)
        ├── ActivityEventRow (Molecule — per event)
        │     ├── ActivityIcon (Atom — Lucide icon mapped by event_type)
        │     ├── EventDescription (Atom — metadata.description text)
        │     ├── CourseBadge (Atom — metadata.course_name)
        │     └── RelativeTime (Atom — "2h ago" via date-fns)
        ├── InfiniteScrollSentinel (Atom — IntersectionObserver target)
        └── EmptyState (Atom — "No recent activity")
```

**Event Type to Icon Mapping:**
| Event Type | Lucide Icon | Color Token |
|------------|-------------|-------------|
| `question_generated` | `Sparkles` | `--color-accent-blue` |
| `question_reviewed` | `Eye` | `--color-accent-navy` |
| `question_approved` | `CheckCircle` | `--color-success-green` |
| `question_rejected` | `XCircle` | `--color-error-red` |
| `coverage_gap_detected` | `AlertTriangle` | `--color-warning-yellow` |
| `bulk_generation_complete` | `Package` | `--color-accent-teal` |

**States:**
1. **Loading** — Skeleton rows (3 placeholder rows with pulse animation)
2. **Empty** — "No recent activity" with subtext "Start generating questions to see activity here"
3. **Data** — Chronological list of ActivityEventRow components
4. **Loading More** — Spinner at bottom while fetching next page
5. **Error** — Error message with retry button
6. **All Loaded** — "You're all caught up" message at bottom

**Design tokens:**
- Surface: White card on Cream background (Three Sheet Hierarchy)
- Typography: Source Sans 3, 14px body, 12px timestamp
- Spacing: 12px row padding, 16px section gap
- Border: 1px `--color-border-light` between rows
- Hover: `--color-surface-parchment` background

**Responsive:**
- Desktop (>=1024px): Right column of main grid (360px wide)
- Tablet (640-1023px): Full width below main content
- Mobile (<640px): Full width, compact row layout

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/dashboard/activity.types.ts` | Types | Create |
| 2 | `packages/types/src/dashboard/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add dashboard export) |
| 4 | Supabase migration via MCP (activity_events table) | Database | Apply |
| 5 | `apps/server/src/errors/activity.error.ts` | Errors | Create |
| 6 | `apps/server/src/repositories/activity.repository.ts` | Repository | Create |
| 7 | `apps/server/src/services/activity/activity-feed.service.ts` | Service | Create |
| 8 | `apps/server/src/controllers/activity.controller.ts` | Controller | Create |
| 9 | `apps/server/src/index.ts` | Routes | Edit (add activity route) |
| 10 | `packages/ui/src/atoms/activity-icon.tsx` | Atom | Create |
| 11 | `packages/ui/src/atoms/relative-time.tsx` | Atom | Create |
| 12 | `packages/ui/src/molecules/activity-event-row.tsx` | Molecule | Create |
| 13 | `apps/web/src/components/dashboard/activity-feed.tsx` | Organism | Create |
| 14 | `apps/web/src/hooks/use-activity-feed.ts` | Hook | Create |
| 15 | `apps/server/src/__tests__/activity-feed.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-U-6 | universal | **DONE** | RBAC middleware for role-based access enforcement |

### NPM Packages (new — install in apps/web)
| Package | Version | Purpose |
|---------|---------|---------|
| `date-fns` | ^3.x | `formatDistanceToNow` for relative timestamps |

### NPM Packages (existing, already in monorepo)
- `@supabase/supabase-js` — Supabase client
- `express` — Server framework
- `vitest` — Testing
- `lucide-react` — Icons (via shadcn/ui)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `createRbacMiddleware()`, `rbac.require(AuthRole.FACULTY)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`, `AuthRole`

## 9. Test Fixtures (inline)

```typescript
// Mock faculty user
export const FACULTY_USER = {
  sub: "faculty-uuid-1",
  email: "jsmith@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock course director user
export const COURSE_DIRECTOR_USER = {
  ...FACULTY_USER,
  sub: "cd-uuid-1",
  email: "bwilson@msm.edu",
  is_course_director: true,
};

// Mock unauthenticated user (no token)
export const UNAUTHENTICATED_USER = null;

// Mock activity events
export const MOCK_ACTIVITY_EVENTS = [
  {
    id: "evt-1",
    user_id: "faculty-uuid-1",
    institution_id: "inst-uuid-1",
    event_type: "question_generated" as const,
    entity_id: "q-uuid-1",
    entity_type: "assessment_item",
    metadata: {
      description: "Generated a new cardiology question",
      course_name: "Cardiovascular Medicine",
      actor_name: "Dr. Jane Smith",
      count: 1,
    },
    created_at: "2026-02-19T14:30:00Z",
  },
  {
    id: "evt-2",
    user_id: "faculty-uuid-1",
    institution_id: "inst-uuid-1",
    event_type: "question_approved" as const,
    entity_id: "q-uuid-2",
    entity_type: "assessment_item",
    metadata: {
      description: "Approved renal physiology question",
      course_name: "Renal Systems",
      actor_name: "Dr. Brian Wilson",
      count: 1,
    },
    created_at: "2026-02-19T13:00:00Z",
  },
  {
    id: "evt-3",
    user_id: "faculty-uuid-1",
    institution_id: "inst-uuid-1",
    event_type: "bulk_generation_complete" as const,
    entity_id: "session-uuid-1",
    entity_type: "generation_session",
    metadata: {
      description: "Bulk generation completed: 25 questions",
      course_name: "Pathology",
      actor_name: "System",
      count: 25,
    },
    created_at: "2026-02-19T10:00:00Z",
  },
  {
    id: "evt-4",
    user_id: "faculty-uuid-1",
    institution_id: "inst-uuid-1",
    event_type: "coverage_gap_detected" as const,
    entity_id: "gap-uuid-1",
    entity_type: "coverage_gap",
    metadata: {
      description: "Coverage gap detected in Endocrine System",
      course_name: "Endocrinology",
      actor_name: "System",
    },
    created_at: "2026-02-18T16:00:00Z",
  },
];
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/__tests__/activity-feed.controller.test.ts`

```
describe("ActivityFeedController")
  describe("handleList")
    ✓ returns paginated activity events for authenticated faculty (200)
    ✓ returns correct pagination meta (limit, offset, total, has_more)
    ✓ defaults to limit=20, offset=0, no event_type filter
    ✓ rejects unauthenticated request (401)
    ✓ rejects access to another user's events (403 FORBIDDEN)
    ✓ filters by single event_type (question_generated)
    ✓ filters by multiple event_types (comma-separated)
    ✓ returns empty list with meta when no events match filter
    ✓ caps limit at 50 when higher value requested
    ✓ rejects invalid event_type value (400 VALIDATION_ERROR)
    ✓ rejects invalid user_id format (400 VALIDATION_ERROR)
    ✓ returns has_more=false when offset + limit >= total

describe("ActivityFeedService")
  describe("list")
    ✓ builds correct Supabase query with event_type filter applied
    ✓ calculates has_more correctly based on total vs offset+limit
    ✓ applies ordering by created_at DESC
    ✓ returns empty events array when no rows match

describe("ActivityFeedRepository")
  describe("findByUser")
    ✓ constructs Supabase select with correct columns
    ✓ applies .in() filter when event_types provided
```

**Total: ~18 tests** (12 controller + 4 service + 2 repository)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. E2E coverage will be added when the full Faculty Dashboard (E-32) is assembled with STORY-F-21 (Role-Based Dashboard Variants).

## 12. Acceptance Criteria

1. ActivityFeed organism renders a chronological list of recent events
2. All 6 event types render with correct Lucide icon and color token
3. Each event row shows: icon, description, course name, relative timestamp, actor name
4. Events fetched from `GET /api/v1/activity?user_id=X&limit=20&offset=0`
5. Infinite scroll loads next page when sentinel element enters viewport
6. Multi-select event type filter correctly narrows results
7. Empty state displays "No recent activity" when no events exist
8. Polling fetches new events every 30 seconds and prepends to feed
9. Unauthenticated requests receive 401
10. Users cannot access another user's activity events (403)
11. Limit capped at 50 items per request
12. All ~18 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Activity feed in Faculty Dashboard | ARCHITECTURE_v10 Section 6.2: "Dashboard shows recent activity feed" |
| Event types from generation/review pipeline | S-F-32-1 Acceptance Criteria |
| Polling 30s, Socket.io upgrade in E-35 | S-F-32-1 Notes |
| IntersectionObserver for infinite scroll | S-F-32-1 Notes |
| date-fns for relative time | S-F-32-1 Notes |
| Lucide icons from shadcn/ui | S-F-32-1 Notes |
| activity_events table schema | S-F-32-1 Notes |
| Dashboard layout: right column 360px | Design Spec Template A |
| Three Sheet Hierarchy | Design Spec Template A |

## 14. Environment Prerequisites

- **Supabase:** Project running, `institutions` table exists (for FK), migration to create `activity_events` table
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story

## 15. Implementation Notes

- **ActivityFeedService is read-only.** It never writes events. Other services (generation pipeline, review workflow, coverage analysis) write to `activity_events`. This story only reads.
- **Polling pattern:** The `useActivityFeed` hook uses `setInterval` with 30s delay. Each tick fetches events with `offset=0` and `limit=N` where N is the current feed length. New events (IDs not in current state) are prepended. Use `useRef` to track the interval and clean up on unmount.
- **IntersectionObserver:** Place a sentinel `<div>` at the bottom of the feed. When it enters the viewport, call `loadMore()` which increments offset by limit and appends results. Disable when `has_more === false`.
- **Event type filter:** Multi-select sends as comma-separated string in query param. Server splits on comma and validates each against the enum.
- **Protected route pattern:** Register AFTER auth middleware in `index.ts`. Use `rbac.require(AuthRole.FACULTY)` — this allows faculty, course directors, institutional admins, and superadmins.
- **vi.hoisted()** for mock variables in vitest tests. Supabase mock should use separate mock objects per chain stage (see `docs/solutions/supabase-mock-factory.md`).
- **JS #private fields** in ActivityFeedService and ActivityFeedRepository for Supabase client references.
