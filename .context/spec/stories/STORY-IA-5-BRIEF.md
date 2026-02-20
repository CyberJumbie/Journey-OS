# STORY-IA-5 Brief: Admin Dashboard Page

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-5
old_id: S-IA-36-1
epic: E-36 (Admin Dashboard & KPIs)
feature: F-17 (Admin Dashboard)
sprint: 9
lane: institutional_admin
lane_priority: 2
within_lane_order: 5
size: M
depends_on:
  - STORY-U-6 (universal) — RBAC Middleware ✅ DONE
  - STORY-SA-5 (superadmin) — Approval Workflow (institution must exist)
blocks:
  - STORY-IA-12 — KaizenML Lint Rule Engine
  - STORY-IA-25 — Institution Overview Table
  - STORY-IA-26 — Sync Status Monitor
personas_served: [institutional_admin]
```

## 1. Summary

**What to build:** An institutional admin dashboard page at `/institution/dashboard` displaying KPI cards (Total Users, Active Courses, Questions Generated, Sync Health %), a system health section (API response time p95, error rate 24h, storage usage), and quick action links. The dashboard auto-refreshes every 60 seconds, pausing when the browser tab is hidden. An `AdminDashboardService` on the server aggregates metrics from Supabase. The endpoint is protected by RBAC requiring `InstitutionalAdmin` or `SuperAdmin` roles.

**Parent epic:** E-36 (Admin Dashboard & KPIs) under F-17 (Admin Dashboard). This is the foundational story for the institutional admin's home page.

**User flows satisfied:**
- UF-27 (Admin Dashboard & Data Integrity) — primary dashboard view

**Personas:** Institutional Admin (primary), SuperAdmin (secondary — platform-wide visibility).

**Why this story matters:** STORY-IA-5 is the institutional admin's landing page and blocks three downstream stories (IA-12, IA-25, IA-26) that add drill-down capabilities to the dashboard. Without it, institutional admins have no aggregated view of their institution's health.

## 2. Task Breakdown

| # | Task | File(s) | Action |
|---|------|---------|--------|
| 1 | Define admin dashboard types | `packages/types/src/admin/dashboard.types.ts` | CREATE |
| 2 | Create admin types barrel export | `packages/types/src/admin/index.ts` | CREATE |
| 3 | Export admin module from types root | `packages/types/src/index.ts` | UPDATE |
| 4 | Implement AdminDashboardService | `apps/server/src/services/admin/admin-dashboard.service.ts` | CREATE |
| 5 | Implement DashboardController | `apps/server/src/controllers/admin/dashboard.controller.ts` | CREATE |
| 6 | Register dashboard route with RBAC | `apps/server/src/index.ts` | UPDATE |
| 7 | Create useAdminDashboard hook | `apps/web/src/hooks/use-admin-dashboard.ts` | CREATE |
| 8 | Create SparklineSVG atom | `apps/web/src/components/admin/sparkline-svg.tsx` | CREATE |
| 9 | Create KPICard molecule | `apps/web/src/components/admin/kpi-card.tsx` | CREATE |
| 10 | Create QuickActionCard molecule | `apps/web/src/components/admin/quick-action-card.tsx` | CREATE |
| 11 | Create AdminDashboard organism | `apps/web/src/components/admin/admin-dashboard.tsx` | CREATE |
| 12 | Create dashboard page | `apps/web/src/app/(protected)/institution/dashboard/page.tsx` | CREATE |
| 13 | Write AdminDashboardService tests | `apps/server/src/services/admin/__tests__/admin-dashboard.service.test.ts` | CREATE |
| 14 | Write DashboardController tests | `apps/server/src/controllers/admin/__tests__/dashboard.controller.test.ts` | CREATE |

## 3. Data Model (inline, complete)

### `packages/types/src/admin/dashboard.types.ts`

```typescript
/**
 * A single KPI metric with trend and sparkline data.
 */
export interface AdminKPI {
  readonly label: string;
  readonly value: number;
  readonly previous_value: number;
  readonly trend: "up" | "down" | "flat";
  readonly sparkline: readonly number[];
}

/**
 * Complete dashboard data returned by GET /api/v1/institution/dashboard.
 */
export interface AdminDashboardData {
  readonly kpis: {
    readonly total_users: AdminKPI;
    readonly active_courses: AdminKPI;
    readonly questions_generated: AdminKPI;
    readonly sync_health: AdminKPI;
  };
  readonly system_health: {
    readonly api_response_p95_ms: number;
    readonly error_rate_24h: number;
    readonly storage_used_mb: number;
    readonly storage_limit_mb: number;
  };
}

/**
 * Quick action link displayed on the dashboard.
 */
export interface QuickAction {
  readonly label: string;
  readonly href: string;
  readonly icon: string;
  readonly description: string;
}
```

**Note:** `AdminKPI.sparkline` contains the last 7 data points (one per day) for the mini-chart. `trend` is derived by comparing `value` to `previous_value`.

## 4. Database Schema (inline, complete)

**No new database schema required for STORY-IA-5.**

The dashboard aggregates existing data from Supabase tables:
- `profiles` table — count users by institution
- `courses` table — count active courses
- `generated_questions` table — count questions (if exists, otherwise return 0)
- `sync_status` column on relevant tables — calculate sync health %

System health metrics are computed at query time:
- API response p95: from a `request_logs` table or hardcoded placeholder until logging is implemented
- Error rate 24h: count from `error_logs` or placeholder
- Storage: from Supabase storage API or placeholder

For MVP, metrics that depend on tables not yet created will return sensible defaults (0 or placeholder values). The service should gracefully handle missing tables.

## 5. API Contract (complete request/response)

### GET /api/v1/institution/dashboard

**Auth:** Bearer token required. RBAC: `AuthRole.INSTITUTIONAL_ADMIN` or `AuthRole.SUPERADMIN`.

**Request:**
```
GET /api/v1/institution/dashboard
Authorization: Bearer <jwt>
```

**200 Success:**
```json
{
  "data": {
    "kpis": {
      "total_users": {
        "label": "Total Users",
        "value": 142,
        "previous_value": 128,
        "trend": "up",
        "sparkline": [98, 105, 112, 118, 125, 128, 142]
      },
      "active_courses": {
        "label": "Active Courses",
        "value": 12,
        "previous_value": 12,
        "trend": "flat",
        "sparkline": [10, 10, 11, 11, 12, 12, 12]
      },
      "questions_generated": {
        "label": "Questions Generated",
        "value": 1847,
        "previous_value": 1623,
        "trend": "up",
        "sparkline": [1200, 1350, 1420, 1510, 1580, 1623, 1847]
      },
      "sync_health": {
        "label": "Sync Health",
        "value": 98.5,
        "previous_value": 97.2,
        "trend": "up",
        "sparkline": [95.0, 96.1, 96.8, 97.0, 97.2, 97.5, 98.5]
      }
    },
    "system_health": {
      "api_response_p95_ms": 245,
      "error_rate_24h": 0.02,
      "storage_used_mb": 1240,
      "storage_limit_mb": 8192
    }
  },
  "error": null
}
```

**401 Unauthorized (no token):**
```json
{
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden (wrong role):**
```json
{
  "data": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
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

### Route: `/institution/dashboard`

**Layout:** `(protected)` group layout — sidebar navigation, top bar with user info.

### Component Hierarchy
```
app/(protected)/institution/dashboard/page.tsx (Server Component — metadata only)
  └── AdminDashboard (Client Component — "use client")
        ├── KPI Cards Row
        │   ├── KPICard (Total Users)
        │   │   └── SparklineSVG
        │   ├── KPICard (Active Courses)
        │   │   └── SparklineSVG
        │   ├── KPICard (Questions Generated)
        │   │   └── SparklineSVG
        │   └── KPICard (Sync Health)
        │       └── SparklineSVG
        ├── System Health Section
        │   ├── API Response Time (p95)
        │   ├── Error Rate (24h)
        │   └── Storage Usage (progress bar)
        └── Quick Actions Row
            ├── QuickActionCard (Manage Users)
            ├── QuickActionCard (View Coverage)
            ├── QuickActionCard (View Sync Status)
            └── QuickActionCard (Browse Knowledge Graph)
```

### KPICard Props

```typescript
interface KPICardProps {
  readonly label: string;
  readonly value: number;
  readonly previousValue: number;
  readonly trend: "up" | "down" | "flat";
  readonly sparkline: readonly number[];
  readonly unit?: string; // e.g., "%" for sync health
}
```

### QuickActionCard Props

```typescript
interface QuickActionCardProps {
  readonly label: string;
  readonly href: string;
  readonly icon: string;
  readonly description: string;
}
```

### SparklineSVG Props

```typescript
interface SparklineSVGProps {
  readonly data: readonly number[];
  readonly width?: number;  // default 80
  readonly height?: number; // default 32
  readonly color?: string;  // default "#2b71b9"
}
```

### Auto-Refresh Behavior
- `useAdminDashboard` hook fetches data on mount and every 60 seconds.
- Uses `document.visibilityState` to pause refresh when tab is hidden.
- Returns `{ data, isLoading, error, refetch }`.

### States
1. **Loading:** Skeleton cards (4 KPI skeletons + system health skeleton)
2. **Loaded:** Full dashboard with live data
3. **Error:** Error banner with retry button, stale data shown if available
4. **Refreshing:** Subtle loading indicator (not full skeleton), existing data stays visible

### Design Tokens
- KPI Card: white bg, rounded-lg, shadow-sm, p-6
- Trend up: text-[#69a338] with up arrow icon
- Trend down: text-red-600 with down arrow icon
- Trend flat: text-gray-500 with dash icon
- Sparkline: stroke-[#2b71b9], fill none, stroke-width 2
- Quick action: border-[#2b71b9]/20, hover:border-[#2b71b9], rounded-lg, p-4

## 7. Files to Create (exact paths, implementation order)

| # | Layer | Path | Action | Description |
|---|-------|------|--------|-------------|
| 1 | Types | `packages/types/src/admin/dashboard.types.ts` | CREATE | AdminKPI, AdminDashboardData, QuickAction |
| 2 | Types | `packages/types/src/admin/index.ts` | CREATE | Barrel export for admin types |
| 3 | Types | `packages/types/src/index.ts` | UPDATE | Add admin module export |
| 4 | Service | `apps/server/src/services/admin/admin-dashboard.service.ts` | CREATE | AdminDashboardService aggregating metrics |
| 5 | Controller | `apps/server/src/controllers/admin/dashboard.controller.ts` | CREATE | DashboardController wrapping service |
| 6 | App | `apps/server/src/index.ts` | UPDATE | Register GET /api/v1/institution/dashboard with RBAC |
| 7 | Hook | `apps/web/src/hooks/use-admin-dashboard.ts` | CREATE | useAdminDashboard with auto-refresh |
| 8 | Atom | `apps/web/src/components/admin/sparkline-svg.tsx` | CREATE | SparklineSVG component |
| 9 | Molecule | `apps/web/src/components/admin/kpi-card.tsx` | CREATE | KPICard with trend + sparkline |
| 10 | Molecule | `apps/web/src/components/admin/quick-action-card.tsx` | CREATE | QuickActionCard with icon + link |
| 11 | Organism | `apps/web/src/components/admin/admin-dashboard.tsx` | CREATE | Full dashboard layout |
| 12 | View | `apps/web/src/app/(protected)/institution/dashboard/page.tsx` | CREATE | Server component with metadata |
| 13 | Tests | `apps/server/src/services/admin/__tests__/admin-dashboard.service.test.ts` | CREATE | Service unit tests |
| 14 | Tests | `apps/server/src/controllers/admin/__tests__/dashboard.controller.test.ts` | CREATE | Controller unit tests |

## 8. Dependencies

### Story Dependencies

| Story | Lane | Status | What It Provides |
|-------|------|--------|------------------|
| STORY-U-6 | universal | DONE | RbacMiddleware, AuthRole enum, require() and requireScoped() |
| STORY-SA-5 | superadmin | PENDING | Approval workflow — institution must exist before admin can view dashboard |

### NPM Packages (all already installed)

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | ^2.97.0 | Supabase queries for metrics aggregation |
| `express` | ^5.2.1 | Request/Response/NextFunction types |
| `vitest` | ^4.0.18 | Test runner |
| `next` | 16.1.6 | App Router, Server/Client Components |
| `react` | 19.2.3 | UI |
| `@journey-os/types` | workspace:* | Shared type definitions |

### Existing Files Required

| File | What It Provides |
|------|------------------|
| `packages/types/src/auth/auth.types.ts` | `ApiResponse`, `ApiError` envelope types |
| `apps/server/src/middleware/rbac.middleware.ts` | `RbacMiddleware` with `require()` for role checks |
| `apps/server/src/middleware/auth.middleware.ts` | `AuthMiddleware` for JWT verification |
| `apps/server/src/config/supabase.config.ts` | `getSupabaseClient()` singleton |
| `apps/server/src/errors/base.errors.ts` | `JourneyOSError` base class |
| `apps/server/src/index.ts` | Express app — where protected route is registered |

## 9. Test Fixtures (inline)

### Mock Dashboard Data

```typescript
export const MOCK_DASHBOARD_DATA: AdminDashboardData = {
  kpis: {
    total_users: {
      label: "Total Users",
      value: 142,
      previous_value: 128,
      trend: "up",
      sparkline: [98, 105, 112, 118, 125, 128, 142],
    },
    active_courses: {
      label: "Active Courses",
      value: 12,
      previous_value: 12,
      trend: "flat",
      sparkline: [10, 10, 11, 11, 12, 12, 12],
    },
    questions_generated: {
      label: "Questions Generated",
      value: 1847,
      previous_value: 1623,
      trend: "up",
      sparkline: [1200, 1350, 1420, 1510, 1580, 1623, 1847],
    },
    sync_health: {
      label: "Sync Health",
      value: 98.5,
      previous_value: 97.2,
      trend: "up",
      sparkline: [95.0, 96.1, 96.8, 97.0, 97.2, 97.5, 98.5],
    },
  },
  system_health: {
    api_response_p95_ms: 245,
    error_rate_24h: 0.02,
    storage_used_mb: 1240,
    storage_limit_mb: 8192,
  },
};
```

### Mock Express Objects

```typescript
import { Request, Response } from "express";

export function mockRequest(overrides?: Partial<Request>): Partial<Request> {
  return {
    method: "GET",
    headers: { authorization: "Bearer mock-jwt" },
    user: { id: "user-1", role: "institutional_admin", institution_id: "inst-1" },
    ...overrides,
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

### Mock Supabase Queries

```typescript
export function mockSupabaseCount(tableName: string, count: number) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count, error: null }),
      }),
    }),
  };
}
```

## 10. API Test Spec (vitest — PRIMARY)

### `apps/server/src/services/admin/__tests__/admin-dashboard.service.test.ts`

```
describe("AdminDashboardService")
  describe("getDashboardData")
    it("returns AdminDashboardData with all four KPI fields populated")
    it("queries profiles table for total_users count by institution_id")
    it("queries courses table for active_courses count by institution_id")
    it("queries generated_questions table for questions_generated count")
    it("calculates sync_health percentage from sync_status column")
    it("computes trend as 'up' when value > previous_value")
    it("computes trend as 'down' when value < previous_value")
    it("computes trend as 'flat' when value === previous_value")
    it("returns 7-element sparkline arrays for each KPI")
    it("returns system_health with api_response_p95_ms, error_rate_24h, storage fields")
    it("handles missing tables gracefully by returning 0 values")
    it("throws InternalError when Supabase query fails")
```

### `apps/server/src/controllers/admin/__tests__/dashboard.controller.test.ts`

```
describe("DashboardController")
  describe("getDashboard")
    it("returns 200 with AdminDashboardData for institutional_admin user")
    it("returns 200 with AdminDashboardData for superadmin user")
    it("response body matches ApiResponse<AdminDashboardData> shape")
    it("returns 500 INTERNAL_ERROR when service throws")
    it("passes institution_id from req.user to service")
```

**Total: ~17 test cases** (exceeds minimum).

## 11. E2E Test Spec (Playwright — CONDITIONAL)

**Not applicable for this story.** The admin dashboard is a read-only data display page. E2E testing will be deferred until downstream stories (IA-25, IA-26) add interactive drill-down capabilities, at which point the full admin dashboard journey can be tested end-to-end.

## 12. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | Dashboard page exists at `/institution/dashboard` | Manual: navigate to page |
| AC-2 | Four KPI cards displayed: Total Users, Active Courses, Questions Generated, Sync Health | Manual: visual check |
| AC-3 | Each KPI card shows value, trend indicator, and sparkline mini-chart | Manual: visual check |
| AC-4 | System health section shows API p95, error rate, storage usage | Manual: visual check |
| AC-5 | Quick action links: Manage Users, View Coverage, View Sync Status, Browse Knowledge Graph | Manual: click each link |
| AC-6 | Auto-refresh every 60 seconds | Manual: observe network tab |
| AC-7 | Auto-refresh pauses when tab is hidden | Manual: switch tab, observe no requests |
| AC-8 | RBAC: only InstitutionalAdmin and SuperAdmin can access | Test: other roles get 403 |
| AC-9 | Loading skeleton shown during initial fetch | Manual: throttle network, observe |
| AC-10 | Error state with retry button on fetch failure | Manual: disconnect network, observe |
| AC-11 | `GET /api/v1/institution/dashboard` returns correct ApiResponse envelope | Test: assert shape |
| AC-12 | JS `#private` fields used (not TS `private`) | Code review |
| AC-13 | Constructor DI: Supabase client injected into AdminDashboardService | Code review |
| AC-14 | Custom error classes only (no raw throw new Error()) | Code review |
| AC-15 | 10+ API tests pass | Test suite: >=17 tests in vitest |

## 13. Source References

| Claim | Source | Section |
|-------|--------|---------|
| RBAC with AuthRole enum | STORY-U-6 implementation | RbacMiddleware.require() |
| KPI cards with sparkline, trend, auto-refresh | S-IA-36-1 story file | Acceptance criteria |
| Admin dashboard route /institution/dashboard | ARCHITECTURE_v10.md | Frontend route structure |
| ApiResponse envelope: { data, error, meta? } | API_CONTRACT_v1.md | Conventions |
| Custom error classes only | CLAUDE.md | Architecture Rules |
| JS #private fields, constructor DI | CLAUDE.md | Architecture Rules (OOP) |
| Named exports only | CLAUDE.md | Architecture Rules |
| Web path alias @web/* | CLAUDE.md | Monorepo Conventions |
| DualWrite: Supabase first, Neo4j second | CLAUDE.md | Architecture Rules |

## 14. Environment Prerequisites

### Services Required

| Service | Purpose | Required |
|---------|---------|----------|
| Supabase | Metrics queries against profiles, courses tables | For manual testing only (mocked in tests) |

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

### AdminDashboardService Design

```typescript
// apps/server/src/services/admin/admin-dashboard.service.ts
import { SupabaseClient } from "@supabase/supabase-js";
import type { AdminDashboardData, AdminKPI } from "@journey-os/types";

export class AdminDashboardService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async getDashboardData(institutionId: string): Promise<AdminDashboardData> {
    const [totalUsers, activeCourses, questionsGenerated, syncHealth] =
      await Promise.all([
        this.#getTotalUsers(institutionId),
        this.#getActiveCourses(institutionId),
        this.#getQuestionsGenerated(institutionId),
        this.#getSyncHealth(institutionId),
      ]);

    const systemHealth = await this.#getSystemHealth();

    return {
      kpis: {
        total_users: totalUsers,
        active_courses: activeCourses,
        questions_generated: questionsGenerated,
        sync_health: syncHealth,
      },
      system_health: systemHealth,
    };
  }

  #computeTrend(value: number, previousValue: number): "up" | "down" | "flat" {
    if (value > previousValue) return "up";
    if (value < previousValue) return "down";
    return "flat";
  }

  async #getTotalUsers(institutionId: string): Promise<AdminKPI> {
    const { count, error } = await this.#supabaseClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("institution_id", institutionId);

    const value = error ? 0 : (count ?? 0);
    const previousValue = 0; // TODO: historical data in future story
    return {
      label: "Total Users",
      value,
      previous_value: previousValue,
      trend: this.#computeTrend(value, previousValue),
      sparkline: [0, 0, 0, 0, 0, 0, value],
    };
  }

  async #getActiveCourses(institutionId: string): Promise<AdminKPI> {
    const { count, error } = await this.#supabaseClient
      .from("courses")
      .select("*", { count: "exact", head: true })
      .eq("institution_id", institutionId)
      .eq("status", "active");

    const value = error ? 0 : (count ?? 0);
    const previousValue = 0;
    return {
      label: "Active Courses",
      value,
      previous_value: previousValue,
      trend: this.#computeTrend(value, previousValue),
      sparkline: [0, 0, 0, 0, 0, 0, value],
    };
  }

  async #getQuestionsGenerated(institutionId: string): Promise<AdminKPI> {
    const { count, error } = await this.#supabaseClient
      .from("generated_questions")
      .select("*", { count: "exact", head: true })
      .eq("institution_id", institutionId);

    const value = error ? 0 : (count ?? 0);
    const previousValue = 0;
    return {
      label: "Questions Generated",
      value,
      previous_value: previousValue,
      trend: this.#computeTrend(value, previousValue),
      sparkline: [0, 0, 0, 0, 0, 0, value],
    };
  }

  async #getSyncHealth(_institutionId: string): Promise<AdminKPI> {
    // TODO: calculate from sync_status columns once DualWriteService is active
    const value = 100;
    const previousValue = 100;
    return {
      label: "Sync Health",
      value,
      previous_value: previousValue,
      trend: this.#computeTrend(value, previousValue),
      sparkline: [100, 100, 100, 100, 100, 100, 100],
    };
  }

  async #getSystemHealth(): Promise<AdminDashboardData["system_health"]> {
    // TODO: pull from request_logs / error_logs when those tables exist
    return {
      api_response_p95_ms: 0,
      error_rate_24h: 0,
      storage_used_mb: 0,
      storage_limit_mb: 8192,
    };
  }
}
```

### DashboardController Design

```typescript
// apps/server/src/controllers/admin/dashboard.controller.ts
import { Request, Response } from "express";
import type { ApiResponse, AdminDashboardData } from "@journey-os/types";
import { AdminDashboardService } from "../../services/admin/admin-dashboard.service";

export class DashboardController {
  readonly #dashboardService: AdminDashboardService;

  constructor(dashboardService: AdminDashboardService) {
    this.#dashboardService = dashboardService;
  }

  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const institutionId = req.user?.institution_id;

      if (!institutionId || typeof institutionId !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Institution ID required" },
        };
        res.status(400).json(body);
        return;
      }

      const data = await this.#dashboardService.getDashboardData(institutionId);

      const body: ApiResponse<AdminDashboardData> = {
        data,
        error: null,
      };
      res.status(200).json(body);
    } catch {
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
import { DashboardController } from "./controllers/admin/dashboard.controller";
import { AdminDashboardService } from "./services/admin/admin-dashboard.service";

const adminDashboardService = new AdminDashboardService(getSupabaseClient());
const dashboardController = new DashboardController(adminDashboardService);

app.get(
  "/api/v1/institution/dashboard",
  authMiddleware.handle,
  rbacMiddleware.require(AuthRole.INSTITUTIONAL_ADMIN, AuthRole.SUPERADMIN),
  (req, res) => dashboardController.getDashboard(req, res),
);
```

### useAdminDashboard Hook Design

```typescript
// apps/web/src/hooks/use-admin-dashboard.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AdminDashboardData } from "@journey-os/types";

const REFRESH_INTERVAL_MS = 60_000;

export function useAdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/institution/dashboard");
      const json = await res.json();
      if (json.error) {
        setError(json.error.message);
      } else {
        setData(json.data);
        setError(null);
      }
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const startInterval = () => {
      intervalRef.current = setInterval(fetchData, REFRESH_INTERVAL_MS);
    };

    const stopInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchData();
        startInterval();
      } else {
        stopInterval();
      }
    };

    startInterval();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
```
