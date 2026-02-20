# STORY-IA-7 Brief: Weekly Schedule View

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-7
old_id: S-IA-09-2
epic: E-09 (Course SLO Linking & Scheduling)
feature: F-04 (Course Management)
sprint: 4
lane: institutional_admin
lane_priority: 2
within_lane_order: 7
size: M
depends_on:
  - STORY-F-11 (faculty) — Session model and hierarchy
blocks: []
personas_served: [institutional_admin, faculty]
```

## 1. Summary

**What to build:** A weekly schedule view component for courses at `GET /api/v1/courses/:id/schedule?week=N`. The view shows sessions organized by day of week with time slots, section assignments, and material upload status indicators. A week selector allows navigation between weeks. The `ScheduleService` queries Supabase for session data filtered by course and week number. The frontend renders a responsive calendar-like grid grouped by day. This is a read-only view — session creation is handled by STORY-F-11.

**Parent epic:** E-09 (Course SLO Linking & Scheduling) under F-04 (Course Management). This story provides the scheduling visualization.

**User flows satisfied:**
- UF-08 (Course Oversight) — view course schedule by week

**Personas:** Institutional Admin (primary — course oversight), Faculty (secondary — view their sessions).

**Why this story matters:** The weekly schedule view is the primary way admins and faculty see how sessions are distributed across a course. It depends on STORY-F-11 for the session data model but blocks nothing, making it a safe leaf node to implement when session data is available.

## 2. Task Breakdown

| # | Task | File(s) | Action |
|---|------|---------|--------|
| 1 | Define schedule types | `packages/types/src/course/schedule.types.ts` | CREATE |
| 2 | Create course types barrel export | `packages/types/src/course/index.ts` | CREATE |
| 3 | Export course module from types root | `packages/types/src/index.ts` | UPDATE |
| 4 | Implement ScheduleService | `apps/server/src/services/course/schedule.service.ts` | CREATE |
| 5 | Implement ScheduleController | `apps/server/src/controllers/course/schedule.controller.ts` | CREATE |
| 6 | Register schedule route with RBAC | `apps/server/src/index.ts` | UPDATE |
| 7 | Create WeekSelector component | `apps/web/src/components/course/week-selector.tsx` | CREATE |
| 8 | Create SessionCard component | `apps/web/src/components/course/session-card.tsx` | CREATE |
| 9 | Create WeeklySchedule component | `apps/web/src/components/course/weekly-schedule.tsx` | CREATE |
| 10 | Write ScheduleService tests | `apps/server/src/services/course/__tests__/schedule.service.test.ts` | CREATE |
| 11 | Write ScheduleController tests | `apps/server/src/controllers/course/__tests__/schedule.controller.test.ts` | CREATE |

## 3. Data Model (inline, complete)

### `packages/types/src/course/schedule.types.ts`

```typescript
/**
 * Material upload status for a session slot.
 * - empty: no materials uploaded
 * - pending: materials uploaded but not yet processed
 * - processed: materials uploaded and processed by AI pipeline
 */
export type MaterialStatus = "empty" | "pending" | "processed";

/**
 * A single session in the weekly schedule.
 */
export interface ScheduleSession {
  readonly id: string;
  readonly title: string;
  readonly day_of_week: number; // 0 = Sunday, 6 = Saturday
  readonly start_time: string;  // HH:mm format (24h)
  readonly end_time: string;    // HH:mm format (24h)
  readonly section_name: string;
  readonly material_count: number;
  readonly material_status: MaterialStatus;
}

/**
 * Response shape for GET /api/v1/courses/:id/schedule?week=N.
 */
export interface WeeklySchedule {
  readonly course_id: string;
  readonly week_number: number;
  readonly total_weeks: number;
  readonly sessions: readonly ScheduleSession[];
}
```

### Supabase Tables Used

This story reads from tables created by STORY-F-11:

- `sessions` — session records with course_id, week_number, day_of_week, start_time, end_time, title, section_id
- `sections` — section name lookup by section_id
- `session_materials` — material records linked to session_id with status column

## 4. Database Schema (inline, complete)

**No new database schema required for STORY-IA-7.**

This story only reads from existing tables created by STORY-F-11 (Session model). The required table structure is:

```sql
-- Created by STORY-F-11 (dependency)
-- sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id),
  title TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  section_id UUID REFERENCES sections(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- session_materials table
CREATE TABLE session_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'empty' CHECK (status IN ('empty', 'pending', 'processed')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

If these tables do not yet exist when this story is implemented, the service should return empty results gracefully.

## 5. API Contract (complete request/response)

### GET /api/v1/courses/:id/schedule

**Auth:** Bearer token required. RBAC: `AuthRole.INSTITUTIONAL_ADMIN`, `AuthRole.FACULTY`, or `AuthRole.SUPERADMIN`.

**Query Parameters:**
- `week` (optional, integer) — week number to display. Defaults to 1.

**Request:**
```
GET /api/v1/courses/c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6/schedule?week=3
Authorization: Bearer <jwt>
```

**200 Success:**
```json
{
  "data": {
    "course_id": "c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6",
    "week_number": 3,
    "total_weeks": 16,
    "sessions": [
      {
        "id": "s1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6",
        "title": "Cardiovascular Physiology I",
        "day_of_week": 1,
        "start_time": "09:00",
        "end_time": "10:30",
        "section_name": "Section A",
        "material_count": 3,
        "material_status": "processed"
      },
      {
        "id": "s2a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6",
        "title": "Anatomy Lab: Thorax",
        "day_of_week": 2,
        "start_time": "13:00",
        "end_time": "16:00",
        "section_name": "Section B",
        "material_count": 1,
        "material_status": "pending"
      },
      {
        "id": "s3a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6",
        "title": "Clinical Skills: History Taking",
        "day_of_week": 4,
        "start_time": "10:00",
        "end_time": "12:00",
        "section_name": "All Sections",
        "material_count": 0,
        "material_status": "empty"
      }
    ]
  },
  "error": null
}
```

**400 Validation Error (invalid week or course ID):**
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Week number must be a positive integer"
  }
}
```

**401 Unauthorized:**
```json
{
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden:**
```json
{
  "data": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

**404 Not Found (course does not exist):**
```json
{
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Course not found"
  }
}
```

**500 Internal Error:**
```json
{
  "data": null,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred. Please try again."
  }
}
```

## 6. Frontend Spec

### Component Usage

The weekly schedule is a reusable component, not a standalone page. It will be embedded within the course detail page (built in a separate story). For now, the component is built standalone and exported for integration.

### Component Hierarchy
```
WeeklySchedule (Client Component — "use client")
  ├── WeekSelector
  │   ├── Previous Week button
  │   ├── "Week N of M" label
  │   └── Next Week button
  ├── Day Columns (Mon-Fri, optionally Sat-Sun)
  │   └── SessionCard (one per session in that day)
  │       ├── Title
  │       ├── Time range
  │       ├── Section name
  │       └── Material Status Indicator
  ├── Loading Skeleton
  └── Empty State ("No sessions scheduled for this week")
```

### WeeklySchedule Props

```typescript
interface WeeklyScheduleProps {
  readonly courseId: string;
}
```

### WeekSelector Props

```typescript
interface WeekSelectorProps {
  readonly currentWeek: number;
  readonly totalWeeks: number;
  readonly onWeekChange: (week: number) => void;
}
```

### SessionCard Props

```typescript
interface SessionCardProps {
  readonly title: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly sectionName: string;
  readonly materialCount: number;
  readonly materialStatus: MaterialStatus;
}
```

### Material Status Indicators
- **empty** (grey): `bg-gray-200` circle — no materials uploaded
- **pending** (yellow): `bg-yellow-400` circle — materials awaiting processing
- **processed** (green): `bg-[#69a338]` circle — materials ready

### States
1. **Loading:** Skeleton grid with 5 day columns and placeholder cards
2. **Loaded:** Full schedule with session cards grouped by day_of_week
3. **Empty:** "No sessions scheduled for this week." centered message
4. **Error:** Error banner with retry button

### Design Tokens
- Day column header: text-sm font-medium text-gray-500 uppercase
- Session card: white bg, rounded-md, border border-gray-200, p-3, shadow-sm
- Time range: text-xs text-gray-500 font-mono (DM Mono)
- Title: text-sm font-medium text-gray-900
- Section: text-xs text-gray-600
- Status dot: w-2 h-2 rounded-full inline-block
- Grid: grid-cols-5 (Mon-Fri) or grid-cols-7 (full week) gap-4

### Responsive Layout
- Desktop (lg+): 5-column grid (Mon-Fri)
- Tablet (md): 3-column grid with horizontal scroll
- Mobile (sm): single column, days stacked vertically with day headers

## 7. Files to Create (exact paths, implementation order)

| # | Layer | Path | Action | Description |
|---|-------|------|--------|-------------|
| 1 | Types | `packages/types/src/course/schedule.types.ts` | CREATE | MaterialStatus, ScheduleSession, WeeklySchedule |
| 2 | Types | `packages/types/src/course/index.ts` | CREATE | Barrel export for course types |
| 3 | Types | `packages/types/src/index.ts` | UPDATE | Add course module export |
| 4 | Service | `apps/server/src/services/course/schedule.service.ts` | CREATE | ScheduleService querying Supabase |
| 5 | Controller | `apps/server/src/controllers/course/schedule.controller.ts` | CREATE | ScheduleController with param validation |
| 6 | App | `apps/server/src/index.ts` | UPDATE | Register GET /api/v1/courses/:id/schedule |
| 7 | Atom | `apps/web/src/components/course/week-selector.tsx` | CREATE | WeekSelector with prev/next buttons |
| 8 | Molecule | `apps/web/src/components/course/session-card.tsx` | CREATE | SessionCard with material indicator |
| 9 | Organism | `apps/web/src/components/course/weekly-schedule.tsx` | CREATE | WeeklySchedule with day grid |
| 10 | Tests | `apps/server/src/services/course/__tests__/schedule.service.test.ts` | CREATE | Service unit tests |
| 11 | Tests | `apps/server/src/controllers/course/__tests__/schedule.controller.test.ts` | CREATE | Controller unit tests |

## 8. Dependencies

### Story Dependencies

| Story | Lane | Status | What It Provides |
|-------|------|--------|------------------|
| STORY-F-11 | faculty | PENDING | Session model, sessions table, session_materials table, sections table |

### NPM Packages (all already installed)

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | ^2.97.0 | Supabase queries for session data |
| `express` | ^5.2.1 | Request/Response types |
| `vitest` | ^4.0.18 | Test runner |
| `react` | 19.2.3 | UI |
| `@journey-os/types` | workspace:* | Shared type definitions |

### Existing Files Required

| File | What It Provides |
|------|------------------|
| `packages/types/src/auth/auth.types.ts` | `ApiResponse` envelope type |
| `apps/server/src/middleware/rbac.middleware.ts` | `RbacMiddleware` with `require()` |
| `apps/server/src/middleware/auth.middleware.ts` | `AuthMiddleware` for JWT verification |
| `apps/server/src/config/supabase.config.ts` | `getSupabaseClient()` singleton |
| `apps/server/src/errors/base.errors.ts` | `JourneyOSError` base class |
| `apps/server/src/errors/not-found.error.ts` | `NotFoundError` for missing courses |
| `apps/server/src/errors/validation.error.ts` | `ValidationError` for invalid params |
| `apps/server/src/index.ts` | Express app |

## 9. Test Fixtures (inline)

### Mock Schedule Data

```typescript
import type { ScheduleSession, WeeklySchedule } from "@journey-os/types";

export const MOCK_SESSIONS: readonly ScheduleSession[] = [
  {
    id: "session-1",
    title: "Cardiovascular Physiology I",
    day_of_week: 1,
    start_time: "09:00",
    end_time: "10:30",
    section_name: "Section A",
    material_count: 3,
    material_status: "processed",
  },
  {
    id: "session-2",
    title: "Anatomy Lab: Thorax",
    day_of_week: 2,
    start_time: "13:00",
    end_time: "16:00",
    section_name: "Section B",
    material_count: 1,
    material_status: "pending",
  },
  {
    id: "session-3",
    title: "Clinical Skills: History Taking",
    day_of_week: 4,
    start_time: "10:00",
    end_time: "12:00",
    section_name: "All Sections",
    material_count: 0,
    material_status: "empty",
  },
];

export const MOCK_WEEKLY_SCHEDULE: WeeklySchedule = {
  course_id: "course-1",
  week_number: 3,
  total_weeks: 16,
  sessions: MOCK_SESSIONS,
};

export const MOCK_EMPTY_SCHEDULE: WeeklySchedule = {
  course_id: "course-1",
  week_number: 10,
  total_weeks: 16,
  sessions: [],
};
```

### Mock Supabase Query Result

```typescript
export function mockSupabaseSessionQuery(sessions: ScheduleSession[]) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: sessions.map((s) => ({
              id: s.id,
              title: s.title,
              day_of_week: s.day_of_week,
              start_time: s.start_time,
              end_time: s.end_time,
              section: { name: s.section_name },
              session_materials: Array.from({ length: s.material_count }, (_, i) => ({
                id: `mat-${i}`,
                status: s.material_status,
              })),
            })),
            error: null,
          }),
        }),
      }),
    }),
  };
}
```

### Mock Express Objects

```typescript
import { Request, Response } from "express";

export function mockRequest(
  params?: Record<string, string>,
  query?: Record<string, string>,
): Partial<Request> {
  return {
    method: "GET",
    headers: { authorization: "Bearer mock-jwt" },
    params: params ?? {},
    query: query ?? {},
    user: { id: "user-1", role: "institutional_admin", institution_id: "inst-1" },
  };
}

export function mockResponse(): Partial<Response> & { statusCode: number; body: unknown } {
  const res: Partial<Response> & { statusCode: number; body: unknown } = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res as Response;
    },
    json(data: unknown) {
      res.body = data;
      return res as Response;
    },
  };
  return res;
}
```

## 10. API Test Spec (vitest — PRIMARY)

### `apps/server/src/services/course/__tests__/schedule.service.test.ts`

```
describe("ScheduleService")
  describe("getWeeklySchedule")
    it("returns WeeklySchedule with sessions for the given course and week")
    it("queries sessions table filtering by course_id and week_number")
    it("joins sections table to get section_name")
    it("counts session_materials and determines aggregate material_status")
    it("sets material_status to 'empty' when material_count is 0")
    it("sets material_status to 'pending' when any material is pending")
    it("sets material_status to 'processed' when all materials are processed")
    it("returns empty sessions array when no sessions exist for the week")
    it("calculates total_weeks from max week_number in course")
    it("throws NotFoundError when course_id does not exist")
    it("throws InternalError when Supabase query fails")
```

### `apps/server/src/controllers/course/__tests__/schedule.controller.test.ts`

```
describe("ScheduleController")
  describe("getSchedule")
    it("returns 200 with WeeklySchedule for valid course_id and week")
    it("defaults week to 1 when query param not provided")
    it("returns 400 VALIDATION_ERROR for non-numeric week param")
    it("returns 400 VALIDATION_ERROR for week < 1")
    it("returns 400 VALIDATION_ERROR for non-UUID course_id")
    it("returns 404 NOT_FOUND when course does not exist")
    it("returns 500 INTERNAL_ERROR when service throws unexpected error")
    it("response body matches ApiResponse<WeeklySchedule> shape")
    it("narrows req.params.id with typeof check before passing to service")
```

**Total: ~20 test cases** (exceeds minimum).

## 11. E2E Test Spec (Playwright — CONDITIONAL)

**Not applicable for this story.** The weekly schedule is a component embedded in the course detail page. E2E testing will be deferred to the course management journey when the full page (course detail + schedule + SLO linking) is assembled.

## 12. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | `GET /api/v1/courses/:id/schedule?week=N` returns WeeklySchedule | Test: assert response shape |
| AC-2 | Sessions grouped by day_of_week (0-6) | Test: verify grouping logic |
| AC-3 | Week selector navigates between weeks 1 through total_weeks | Manual: click prev/next |
| AC-4 | Week defaults to 1 when query param omitted | Test: assert default |
| AC-5 | Session cards show title, time range, section name, material indicator | Manual: visual check |
| AC-6 | Material status indicator: grey (empty), yellow (pending), green (processed) | Manual: visual check |
| AC-7 | Empty state shown when no sessions exist for selected week | Manual: select empty week |
| AC-8 | Loading skeleton during fetch | Manual: throttle network |
| AC-9 | RBAC: InstitutionalAdmin, Faculty, SuperAdmin can access | Test: other roles get 403 |
| AC-10 | 404 returned for non-existent course_id | Test: assert 404 |
| AC-11 | Responsive layout: 5-col desktop, 3-col tablet, 1-col mobile | Manual: resize viewport |
| AC-12 | JS `#private` fields used (not TS `private`) | Code review |
| AC-13 | Constructor DI: Supabase client injected into ScheduleService | Code review |
| AC-14 | Custom error classes only (no raw throw new Error()) | Code review |
| AC-15 | `req.params.id` narrowed with `typeof === "string"` before use | Code review |
| AC-16 | 10+ API tests pass | Test suite: >=20 tests in vitest |

## 13. Source References

| Claim | Source | Section |
|-------|--------|---------|
| Session model with day_of_week, start_time, end_time | STORY-F-11 (dependency) | Session data model |
| Weekly schedule view for courses | S-IA-09-2 story file | Acceptance criteria |
| Material status indicators: empty, pending, processed | ARCHITECTURE_v10.md | Content pipeline states |
| RBAC with AuthRole enum | STORY-U-6 implementation | RbacMiddleware.require() |
| ApiResponse envelope: { data, error, meta? } | API_CONTRACT_v1.md | Conventions |
| Express req.params values are string or string[] | CLAUDE.md | Monorepo Conventions |
| Custom error classes only | CLAUDE.md | Architecture Rules |
| JS #private fields, constructor DI | CLAUDE.md | Architecture Rules (OOP) |
| Named exports only | CLAUDE.md | Architecture Rules |

## 14. Environment Prerequisites

### Services Required

| Service | Purpose | Required |
|---------|---------|----------|
| Supabase | Query sessions, sections, session_materials tables | For manual testing only (mocked in tests) |

### Environment Variables

No new environment variables. The existing Supabase config provides everything:

**Server (`apps/server/.env`):**
- `SUPABASE_URL` — already configured
- `SUPABASE_SERVICE_ROLE_KEY` — already configured

### Dev Setup

```bash
# From monorepo root
pnpm install
pnpm --filter @journey-os/types build   # build types first
pnpm --filter @journey-os/server test   # run server tests
```

## 15. Implementation Notes

### ScheduleService Design

```typescript
// apps/server/src/services/course/schedule.service.ts
import { SupabaseClient } from "@supabase/supabase-js";
import type { WeeklySchedule, ScheduleSession, MaterialStatus } from "@journey-os/types";
import { NotFoundError } from "../../errors/not-found.error";

export class ScheduleService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async getWeeklySchedule(courseId: string, weekNumber: number): Promise<WeeklySchedule> {
    // Verify course exists
    const { data: course, error: courseError } = await this.#supabaseClient
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      throw new NotFoundError("Course not found");
    }

    // Get total weeks for this course
    const { data: weekData } = await this.#supabaseClient
      .from("sessions")
      .select("week_number")
      .eq("course_id", courseId)
      .order("week_number", { ascending: false })
      .limit(1)
      .single();

    const totalWeeks = weekData?.week_number ?? 1;

    // Get sessions for the requested week with section and materials
    const { data: sessions, error: sessionError } = await this.#supabaseClient
      .from("sessions")
      .select(`
        id,
        title,
        day_of_week,
        start_time,
        end_time,
        section:sections(name),
        session_materials(id, status)
      `)
      .eq("course_id", courseId)
      .eq("week_number", weekNumber)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (sessionError) {
      throw new NotFoundError("Failed to fetch sessions");
    }

    const scheduleSessions: ScheduleSession[] = (sessions ?? []).map((s) => {
      const materials = s.session_materials ?? [];
      const materialCount = materials.length;
      const materialStatus = this.#aggregateMaterialStatus(materials);

      return {
        id: s.id,
        title: s.title,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        section_name: s.section?.name ?? "Unassigned",
        material_count: materialCount,
        material_status: materialStatus,
      };
    });

    return {
      course_id: courseId,
      week_number: weekNumber,
      total_weeks: totalWeeks,
      sessions: scheduleSessions,
    };
  }

  #aggregateMaterialStatus(
    materials: readonly { id: string; status: string }[],
  ): MaterialStatus {
    if (materials.length === 0) return "empty";
    const hasPending = materials.some((m) => m.status === "pending");
    if (hasPending) return "pending";
    const allProcessed = materials.every((m) => m.status === "processed");
    if (allProcessed) return "processed";
    return "empty";
  }
}
```

### ScheduleController Design

```typescript
// apps/server/src/controllers/course/schedule.controller.ts
import { Request, Response } from "express";
import type { ApiResponse, WeeklySchedule } from "@journey-os/types";
import { ScheduleService } from "../../services/course/schedule.service";
import { NotFoundError } from "../../errors/not-found.error";
import { ValidationError } from "../../errors/validation.error";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ScheduleController {
  readonly #scheduleService: ScheduleService;

  constructor(scheduleService: ScheduleService) {
    this.#scheduleService = scheduleService;
  }

  async getSchedule(req: Request, res: Response): Promise<void> {
    try {
      const courseId = req.params.id;

      if (typeof courseId !== "string" || !UUID_REGEX.test(courseId)) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Invalid course ID format" },
        };
        res.status(400).json(body);
        return;
      }

      const weekParam = req.query.week;
      let weekNumber = 1;

      if (weekParam !== undefined) {
        const parsed = Number(weekParam);
        if (!Number.isInteger(parsed) || parsed < 1) {
          const body: ApiResponse<null> = {
            data: null,
            error: { code: "VALIDATION_ERROR", message: "Week number must be a positive integer" },
          };
          res.status(400).json(body);
          return;
        }
        weekNumber = parsed;
      }

      const data = await this.#scheduleService.getWeeklySchedule(courseId, weekNumber);

      const body: ApiResponse<WeeklySchedule> = {
        data,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "NOT_FOUND", message: error.message },
        };
        res.status(404).json(body);
        return;
      }

      if (error instanceof ValidationError) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "VALIDATION_ERROR", message: error.message },
        };
        res.status(400).json(body);
        return;
      }

      const body: ApiResponse<null> = {
        data: null,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred. Please try again." },
      };
      res.status(500).json(body);
    }
  }
}
```

### Route Registration (in index.ts)

```typescript
// Add AFTER auth middleware in apps/server/src/index.ts:
import { ScheduleController } from "./controllers/course/schedule.controller";
import { ScheduleService } from "./services/course/schedule.service";

const scheduleService = new ScheduleService(getSupabaseClient());
const scheduleController = new ScheduleController(scheduleService);

app.get(
  "/api/v1/courses/:id/schedule",
  authMiddleware.handle,
  rbacMiddleware.require(AuthRole.INSTITUTIONAL_ADMIN, AuthRole.FACULTY, AuthRole.SUPERADMIN),
  (req, res) => scheduleController.getSchedule(req, res),
);
```

### WeekSelector Component Design

```typescript
// apps/web/src/components/course/week-selector.tsx
"use client";

interface WeekSelectorProps {
  readonly currentWeek: number;
  readonly totalWeeks: number;
  readonly onWeekChange: (week: number) => void;
}

export function WeekSelector({ currentWeek, totalWeeks, onWeekChange }: WeekSelectorProps) {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => onWeekChange(currentWeek - 1)}
        disabled={currentWeek <= 1}
        className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
        aria-label="Previous week"
      >
        Previous
      </button>
      <span className="text-sm font-medium text-gray-700">
        Week {currentWeek} of {totalWeeks}
      </span>
      <button
        onClick={() => onWeekChange(currentWeek + 1)}
        disabled={currentWeek >= totalWeeks}
        className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
        aria-label="Next week"
      >
        Next
      </button>
    </div>
  );
}
```

### SessionCard Component Design

```typescript
// apps/web/src/components/course/session-card.tsx
"use client";

import type { MaterialStatus } from "@journey-os/types";

interface SessionCardProps {
  readonly title: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly sectionName: string;
  readonly materialCount: number;
  readonly materialStatus: MaterialStatus;
}

const STATUS_COLORS: Record<MaterialStatus, string> = {
  empty: "bg-gray-200",
  pending: "bg-yellow-400",
  processed: "bg-[#69a338]",
};

export function SessionCard({
  title,
  startTime,
  endTime,
  sectionName,
  materialCount,
  materialStatus,
}: SessionCardProps) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="mt-1 font-mono text-xs text-gray-500">
        {startTime} - {endTime}
      </p>
      <p className="mt-1 text-xs text-gray-600">{sectionName}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[materialStatus]}`} />
        <span className="text-xs text-gray-500">
          {materialCount} material{materialCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
```
