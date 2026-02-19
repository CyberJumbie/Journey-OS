# STORY-U-6 Brief: RBAC Middleware

## 0. Lane & Priority

```yaml
story_id: STORY-U-6
old_id: S-U-01-3
epic: E-01 (Auth Infrastructure)
feature: F-01 (Platform Authentication & Authorization)
sprint: 3
lane: universal
lane_priority: 0
within_lane_order: 6
size: M
depends_on:
  - STORY-U-3 (universal) — Express Auth Middleware [DONE]
blocks:
  - STORY-SA-1 — Waitlist Application Form
  - STORY-SA-2 — Global User Directory
  - STORY-SA-3 — Application Review Queue
  - STORY-IA-1 — User List & Invitation
  - STORY-IA-5 — Admin Dashboard Page
  - STORY-IA-6 — Framework List Page
  - STORY-F-1 — Course Model
  - STORY-F-2 — Notification Model
  - STORY-F-5 — Profile Page
  - STORY-F-6 — Activity Feed
  - STORY-F-7 — KPI Strip
  - STORY-F-12 — Course Cards
  - STORY-F-21 — Dashboard Variants
  - STORY-F-33 — LangGraph Pipeline
  - STORY-ST-1 — FastAPI Scaffold
  - STORY-ST-2 — Student Dashboard
personas_served: [superadmin, institutional_admin, faculty, advisor, student]
```

## 1. Summary

**What to build:** Role-based access control middleware and service for the Express API layer. This adds authorization on top of the existing authentication middleware (STORY-U-3). The RBAC system provides composable route-level role guards, a declarative permission matrix, institution scoping, and SuperAdmin bypass.

**Parent epic:** E-01 (Auth Infrastructure) — this is the third and final auth story in E-01.

**User flows satisfied:**
- UF-05 (User Role Management) — role-gated API access enforcement
- UF-01 (Platform Onboarding) — SuperAdmin-only waitlist endpoints
- All persona-specific API flows — every route behind `rbac.require()`

**Personas:** All five personas. SuperAdmin has universal access. All others are institution-scoped.

**Why this story matters:** STORY-U-6 is the single most-blocking story in the entire system — 16 stories across 4 lanes (SA, IA, F, ST) depend on it directly. No persona-specific API endpoint can be properly secured without it.

## 2. Task Breakdown

| # | Task | File(s) | Action |
|---|------|---------|--------|
| 1 | Define RBAC type interfaces | `packages/types/src/auth/rbac.types.ts` | CREATE |
| 2 | Define permission matrix types | `packages/types/src/auth/permissions.types.ts` | CREATE |
| 3 | Export new types from auth barrel | `packages/types/src/auth/index.ts` | UPDATE |
| 4 | Create ForbiddenError with role context | `apps/server/src/errors/forbidden.error.ts` | CREATE |
| 5 | Export ForbiddenError from errors barrel | `apps/server/src/errors/index.ts` | UPDATE |
| 6 | Implement RbacService with permission matrix | `apps/server/src/services/auth/rbac.service.ts` | CREATE |
| 7 | Implement RbacMiddleware with role + institution guards | `apps/server/src/middleware/rbac.middleware.ts` | CREATE |
| 8 | Write RbacService unit tests | `apps/server/src/services/auth/__tests__/rbac.service.test.ts` | CREATE |
| 9 | Write RbacMiddleware integration tests | `apps/server/src/middleware/__tests__/rbac.middleware.test.ts` | CREATE |

## 3. Data Model (inline, complete)

### `packages/types/src/auth/rbac.types.ts`

```typescript
import { AuthRole } from "./roles.types";

/**
 * A resource in the permission matrix.
 * Each resource maps to a top-level API domain (e.g., "institutions", "courses").
 */
export type Resource =
  | "waitlist"
  | "institutions"
  | "users"
  | "courses"
  | "frameworks"
  | "content"
  | "generation"
  | "notifications"
  | "students"
  | "advisors"
  | "analytics"
  | "settings";

/**
 * CRUD + custom actions on a resource.
 */
export type ResourceAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "list"
  | "approve"
  | "bulk_generate"
  | "manage";

/**
 * A single permission entry: resource + action + allowed roles.
 * If `requireCourseDirector` is true, Faculty must also have `is_course_director`.
 */
export interface Permission {
  readonly resource: Resource;
  readonly action: ResourceAction;
  readonly roles: readonly AuthRole[];
  readonly requireCourseDirector?: boolean;
}

/**
 * Result of a permission check.
 */
export interface PermissionCheckResult {
  readonly allowed: boolean;
  readonly reason?: string;
}

/**
 * Options for the require() middleware factory.
 */
export interface RequireRoleOptions {
  /** Roles that can access this route. SuperAdmin always included implicitly. */
  readonly roles: readonly AuthRole[];
  /** If true, also verify req.user.institution_id matches req.params.institutionId. */
  readonly institutionScoped?: boolean;
  /** If true, require is_course_director flag on Faculty role. */
  readonly requireCourseDirector?: boolean;
}
```

### `packages/types/src/auth/permissions.types.ts`

```typescript
import { AuthRole } from "./roles.types";
import { Resource, ResourceAction } from "./rbac.types";

/**
 * The full permission matrix type.
 * Keyed by resource, then by action, yielding the allowed roles.
 */
export type PermissionMatrix = {
  readonly [R in Resource]?: {
    readonly [A in ResourceAction]?: {
      readonly roles: readonly AuthRole[];
      readonly requireCourseDirector?: boolean;
    };
  };
};
```

## 4. Database Schema (inline, complete)

**No new database schema required for STORY-U-6.**

RBAC is enforced at the Express middleware layer, not at the database level. The permission matrix is defined in code as a declarative data structure. The existing `user_profiles` table already stores `role` and `is_course_director`:

```sql
-- Already exists (from SUPABASE_DDL v1):
-- user_profiles.role TEXT NOT NULL CHECK (role IN ('superadmin','institutional_admin','faculty','advisor','student'))
-- user_profiles.is_course_director BOOLEAN DEFAULT false
-- user_profiles.institution_id UUID NOT NULL REFERENCES institutions(id)
```

Supabase RLS policies provide a second defense layer but are separate from Express RBAC middleware.

## 5. API Contract (complete request/response)

RBAC middleware does not define its own endpoints. It decorates existing routes. The middleware produces the following responses when authorization fails:

### 403 Forbidden — Role Not Allowed

```
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "data": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied: role 'student' is not authorized for this resource. Required: ['superadmin', 'institutional_admin']"
  }
}
```

### 403 Forbidden — Institution Scope Violation

```
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "data": null,
  "error": {
    "code": "INSTITUTION_SCOPE_VIOLATION",
    "message": "Access denied: you cannot access resources outside your institution"
  }
}
```

### 403 Forbidden — Course Director Required

```
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "data": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied: this action requires course director privileges"
  }
}
```

### 401 Unauthorized — No User on Request (auth middleware not run or failed)

```
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### Usage Pattern on Routes

```typescript
// SuperAdmin only
router.get("/waitlist", authMiddleware.handle, rbac.require("superadmin"), controller.list);

// Multi-role
router.get("/users", authMiddleware.handle, rbac.require("superadmin", "institutional_admin"), controller.list);

// Institution-scoped
router.get("/institutions/:institutionId/courses",
  authMiddleware.handle,
  rbac.requireScoped("faculty", "institutional_admin"),
  controller.list
);

// Course director only
router.post("/generate/bulk",
  authMiddleware.handle,
  rbac.requireCourseDirector(),
  controller.bulkGenerate
);
```

## 6. Frontend Spec

**Not applicable.** This story is backend-only middleware. Frontend route guards will be implemented in separate stories.

## 7. Files to Create (exact paths, implementation order)

| # | Layer | Path | Action | Description |
|---|-------|------|--------|-------------|
| 1 | Types | `packages/types/src/auth/rbac.types.ts` | CREATE | Resource, ResourceAction, Permission, RequireRoleOptions |
| 2 | Types | `packages/types/src/auth/permissions.types.ts` | CREATE | PermissionMatrix type |
| 3 | Types | `packages/types/src/auth/index.ts` | UPDATE | Add exports for rbac.types and permissions.types |
| 4 | Errors | `apps/server/src/errors/forbidden.error.ts` | CREATE | ForbiddenError with role context |
| 5 | Errors | `apps/server/src/errors/index.ts` | UPDATE | Add ForbiddenError export |
| 6 | Service | `apps/server/src/services/auth/rbac.service.ts` | CREATE | RbacService with permission matrix + check methods |
| 7 | Middleware | `apps/server/src/middleware/rbac.middleware.ts` | CREATE | RbacMiddleware with require(), requireScoped(), requireCourseDirector() |
| 8 | Tests | `apps/server/src/services/auth/__tests__/rbac.service.test.ts` | CREATE | RbacService unit tests |
| 9 | Tests | `apps/server/src/middleware/__tests__/rbac.middleware.test.ts` | CREATE | RbacMiddleware integration tests |

## 8. Dependencies

### Story Dependencies

| Story | Lane | Status | What It Provides |
|-------|------|--------|------------------|
| STORY-U-1 | universal | DONE | Supabase auth setup, monorepo scaffold |
| STORY-U-3 | universal | DONE | AuthMiddleware, AuthService, req.user typing, AuthenticationError |

### NPM Packages (all already installed)

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.x | Request/Response/NextFunction types |
| vitest | ^3.x | Test runner |
| @journey-os/types | workspace:* | AuthRole, AuthTokenPayload, ROLE_HIERARCHY |

### Existing Files Required

| File | What It Provides |
|------|------------------|
| `packages/types/src/auth/roles.types.ts` | `AuthRole` enum, `ROLE_HIERARCHY`, `isValidRole()` |
| `packages/types/src/auth/auth.types.ts` | `AuthTokenPayload`, `ApiResponse`, `ApiError` |
| `packages/types/src/auth/auth-request.types.ts` | `isAuthenticated()` type guard |
| `apps/server/src/errors/base.errors.ts` | `JourneyOSError`, `DomainError` base classes |
| `apps/server/src/errors/auth.errors.ts` | `AuthenticationError` (for 401 when no user) |
| `apps/server/src/middleware/auth.middleware.ts` | `AuthMiddleware` class pattern reference |
| `apps/server/src/types/express.d.ts` | `req.user?: AuthTokenPayload` augmentation |

## 9. Test Fixtures (inline)

### Valid User Payloads

```typescript
import { AuthRole, AuthTokenPayload } from "@journey-os/types";

const INSTITUTION_A_ID = "inst-aaaa-bbbb-cccc-000000000001";
const INSTITUTION_B_ID = "inst-aaaa-bbbb-cccc-000000000002";

export const SUPERADMIN_USER: AuthTokenPayload = {
  sub: "user-0000-0000-0000-000000000001",
  email: "admin@journey-os.com",
  role: AuthRole.SUPERADMIN,
  institution_id: INSTITUTION_A_ID,
  is_course_director: false,
  aud: "authenticated",
  exp: 1999999999,
  iat: 1739996400,
};

export const INST_ADMIN_USER: AuthTokenPayload = {
  sub: "user-0000-0000-0000-000000000002",
  email: "dean@msm.edu",
  role: AuthRole.INSTITUTIONAL_ADMIN,
  institution_id: INSTITUTION_A_ID,
  is_course_director: false,
  aud: "authenticated",
  exp: 1999999999,
  iat: 1739996400,
};

export const FACULTY_USER: AuthTokenPayload = {
  sub: "user-0000-0000-0000-000000000003",
  email: "dr.osei@msm.edu",
  role: AuthRole.FACULTY,
  institution_id: INSTITUTION_A_ID,
  is_course_director: false,
  aud: "authenticated",
  exp: 1999999999,
  iat: 1739996400,
};

export const COURSE_DIRECTOR_USER: AuthTokenPayload = {
  sub: "user-0000-0000-0000-000000000004",
  email: "dr.williams@msm.edu",
  role: AuthRole.FACULTY,
  institution_id: INSTITUTION_A_ID,
  is_course_director: true,
  aud: "authenticated",
  exp: 1999999999,
  iat: 1739996400,
};

export const ADVISOR_USER: AuthTokenPayload = {
  sub: "user-0000-0000-0000-000000000005",
  email: "advisor.jones@msm.edu",
  role: AuthRole.ADVISOR,
  institution_id: INSTITUTION_A_ID,
  is_course_director: false,
  aud: "authenticated",
  exp: 1999999999,
  iat: 1739996400,
};

export const STUDENT_USER: AuthTokenPayload = {
  sub: "user-0000-0000-0000-000000000006",
  email: "student.kim@msm.edu",
  role: AuthRole.STUDENT,
  institution_id: INSTITUTION_A_ID,
  is_course_director: false,
  aud: "authenticated",
  exp: 1999999999,
  iat: 1739996400,
};

/** Same role as INST_ADMIN_USER but different institution — for cross-institution tests */
export const INST_ADMIN_OTHER_INSTITUTION: AuthTokenPayload = {
  sub: "user-0000-0000-0000-000000000007",
  email: "dean@howard.edu",
  role: AuthRole.INSTITUTIONAL_ADMIN,
  institution_id: INSTITUTION_B_ID,
  is_course_director: false,
  aud: "authenticated",
  exp: 1999999999,
  iat: 1739996400,
};
```

### Mock Express Objects Helper

```typescript
import { Request, Response, NextFunction } from "express";
import { AuthTokenPayload } from "@journey-os/types";

export function mockRequest(user?: AuthTokenPayload, params?: Record<string, string>): Partial<Request> {
  return {
    user,
    params: params ?? {},
    method: "GET",
    headers: {},
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

export function mockNext(): NextFunction & { called: boolean } {
  const fn = (() => { fn.called = true; }) as NextFunction & { called: boolean };
  fn.called = false;
  return fn;
}
```

## 10. API Test Spec (vitest — PRIMARY)

### `apps/server/src/services/auth/__tests__/rbac.service.test.ts`

```
describe("RbacService")
  describe("checkRole")
    it("allows superadmin on any route regardless of required roles")
    it("allows institutional_admin when role is in allowed list")
    it("denies student when role is not in allowed list")
    it("denies faculty when only superadmin is required")

  describe("checkInstitutionScope")
    it("allows when user institution_id matches resource institution_id")
    it("denies when user institution_id differs from resource institution_id")
    it("allows superadmin regardless of institution mismatch")

  describe("checkCourseDirector")
    it("allows faculty with is_course_director=true")
    it("denies faculty with is_course_director=false")
    it("allows superadmin without is_course_director flag")
    it("allows institutional_admin without is_course_director flag")

  describe("getPermission")
    it("returns permission entry for a valid resource+action pair")
    it("returns undefined for an unknown resource+action pair")
```

### `apps/server/src/middleware/__tests__/rbac.middleware.test.ts`

```
describe("RbacMiddleware")
  describe("require()")
    it("calls next() when user role is in allowed list")
    it("returns 403 when user role is not in allowed list")
    it("returns 401 when req.user is undefined (unauthenticated)")
    it("superadmin always passes regardless of required roles")
    it("multi-role route allows any listed role")
    it("error response body matches ApiResponse<null> shape with FORBIDDEN code")
    it("error message includes user role and required roles for debugging")

  describe("requireScoped()")
    it("calls next() when role matches AND institution_id matches params")
    it("returns 403 with INSTITUTION_SCOPE_VIOLATION when institution_id mismatches")
    it("superadmin bypasses institution scope check")
    it("returns 401 when req.user is undefined")

  describe("requireCourseDirector()")
    it("allows faculty with is_course_director=true")
    it("denies faculty with is_course_director=false")
    it("allows superadmin without course director flag")
    it("allows institutional_admin without course director flag")
    it("denies student even with is_course_director=true (impossible but defensive)")
```

**Total: ~21 test cases** (exceeds the 12 minimum in acceptance criteria).

## 11. E2E Test Spec (Playwright — CONDITIONAL)

**Not applicable for this story.** RBAC middleware is an internal Express layer. E2E tests for authorization will be covered in the persona-specific API stories (SA-1, IA-1, F-1, etc.) that consume the middleware on actual routes.

## 12. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | `RbacMiddleware` accepts allowed roles as constructor parameter | Unit test: middleware instantiation with role array |
| AC-2 | Returns 403 Forbidden when user role not in allowed list | Test: student accessing superadmin-only route → 403 |
| AC-3 | Custom `ForbiddenError` class with role context in error payload | Test: error response includes user role + required roles |
| AC-4 | `RbacService` defines declarative permission matrix (data, not code) | Code review: matrix is a `PermissionMatrix` object literal |
| AC-5 | SuperAdmin has access to all routes | Test: superadmin passes any `require()` call |
| AC-6 | Institutional Admin scoped to own institution's resources | Test: `requireScoped()` checks `req.user.institution_id` vs `req.params.institutionId` |
| AC-7 | Faculty scoped to assigned courses within institution | Test: faculty with wrong institution_id → 403 |
| AC-8 | Student scoped to enrolled courses | Test: student accessing non-enrolled resource → 403 |
| AC-9 | Advisor scoped to assigned students | Test: advisor accessing non-assigned student → 403 |
| AC-10 | Composable: `rbac.require('superadmin', 'institutional_admin')` pattern works | Test: multi-role route allows both roles, denies others |
| AC-11 | Institution scoping verifies `req.user.institution_id` matches resource | Test: cross-institution access → 403 INSTITUTION_SCOPE_VIOLATION |
| AC-12 | Course director flag enforced: `rbac.requireCourseDirector()` | Test: faculty without flag → 403, faculty with flag → pass |
| AC-13 | 401 returned when `req.user` is undefined (auth middleware not run) | Test: unauthenticated request → 401 |
| AC-14 | All error responses follow `ApiResponse<null>` envelope | Test: assert `{ data: null, error: { code, message } }` shape |
| AC-15 | 12+ API tests pass | Test suite: ≥12 tests in vitest |
| AC-16 | JS `#private` fields used (not TS `private`) | Code review: `#rbacService`, `#permissionMatrix` |
| AC-17 | Constructor DI: `RbacService` injected into `RbacMiddleware` | Code review: constructor signature |

## 13. Source References

| Claim | Source | Section |
|-------|--------|---------|
| Five roles: superadmin, institutional_admin, faculty, advisor, student | ARCHITECTURE_v10.md | SS 4.1 |
| JWT app_metadata contains role, institution_id, is_course_director | ARCHITECTURE_v10.md | SS 4.2 |
| is_course_director is a boolean flag, not a sixth role | WORKBENCH_SPEC_v2.md | SS 21 |
| Course director privileges: bulk gen, review queue, SLO→ILO approval | WORKBENCH_SPEC_v2.md | SS 6.3 |
| SuperAdmin-gated platform access (waitlist → approve → invite) | ARCHITECTURE_v10.md | SS 4.2 |
| Institution scoping via institution_id FK | SUPABASE_DDL_v1.md | SS Auth & Institutional Tables |
| RLS policies as second defense layer | SUPABASE_DDL_v1.md | SS RLS Policies |
| API endpoint role requirements | API_CONTRACT_v1.md | SS Endpoints |
| user_profiles table schema | SUPABASE_DDL_v1.md | SS Auth & Institutional Tables |
| Custom error classes only (no raw Error) | CLAUDE.md | Architecture Rules |
| JS #private fields, constructor DI | CLAUDE.md | Architecture Rules (OOP) |
| Named exports only | CLAUDE.md | Architecture Rules |
| MVC: no skipping layers | CLAUDE.md | Architecture Rules |

## 14. Environment Prerequisites

### Services Required

| Service | Purpose | Required |
|---------|---------|----------|
| None | RBAC is pure logic — no external services needed for implementation or testing | — |

### Environment Variables

No new environment variables. RBAC reads from `req.user` which is populated by the auth middleware (STORY-U-3).

### Dev Setup

```bash
# From monorepo root — already set up from STORY-U-3
pnpm install
pnpm --filter @journey-os/types build   # build types first (project references)
pnpm --filter apps-server test           # run server tests
```

## 15. Figma Make Prototype

**Not applicable.** Backend-only middleware — no UI components.

---

## Implementation Notes

### ForbiddenError Design

```typescript
// apps/server/src/errors/forbidden.error.ts
import { JourneyOSError } from "./base.errors";
import { AuthRole } from "@journey-os/types";

export class ForbiddenError extends JourneyOSError {
  readonly #userRole: AuthRole | undefined;
  readonly #requiredRoles: readonly AuthRole[];

  constructor(
    message: string,
    userRole?: AuthRole,
    requiredRoles: readonly AuthRole[] = [],
  ) {
    super(message, "FORBIDDEN");
    this.#userRole = userRole;
    this.#requiredRoles = requiredRoles;
  }

  get userRole(): AuthRole | undefined {
    return this.#userRole;
  }

  get requiredRoles(): readonly AuthRole[] {
    return this.#requiredRoles;
  }
}

export class InstitutionScopeError extends JourneyOSError {
  constructor(message: string = "Access denied: you cannot access resources outside your institution") {
    super(message, "INSTITUTION_SCOPE_VIOLATION");
  }
}
```

### RbacService Design

```typescript
// apps/server/src/services/auth/rbac.service.ts
import { AuthRole, AuthTokenPayload, ROLE_HIERARCHY } from "@journey-os/types";
import type { PermissionMatrix } from "@journey-os/types";
import type { PermissionCheckResult, Resource, ResourceAction } from "@journey-os/types";

/** Declarative permission matrix — data, not code. */
const PERMISSION_MATRIX: PermissionMatrix = {
  waitlist: {
    list: { roles: [AuthRole.SUPERADMIN] },
    approve: { roles: [AuthRole.SUPERADMIN] },
  },
  institutions: {
    list: { roles: [AuthRole.SUPERADMIN] },
    read: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN] },
    create: { roles: [AuthRole.SUPERADMIN] },
    update: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN] },
  },
  users: {
    list: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN] },
    read: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN] },
    update: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN] },
    create: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN] },
  },
  courses: {
    list: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN, AuthRole.FACULTY] },
    read: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN, AuthRole.FACULTY, AuthRole.STUDENT] },
    create: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN], requireCourseDirector: true },
    update: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN, AuthRole.FACULTY] },
  },
  generation: {
    create: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN, AuthRole.FACULTY] },
    bulk_generate: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN], requireCourseDirector: true },
  },
  frameworks: {
    list: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN, AuthRole.FACULTY] },
    read: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN, AuthRole.FACULTY] },
  },
  notifications: {
    list: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN, AuthRole.FACULTY, AuthRole.ADVISOR, AuthRole.STUDENT] },
    read: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN, AuthRole.FACULTY, AuthRole.ADVISOR, AuthRole.STUDENT] },
  },
  analytics: {
    read: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN, AuthRole.FACULTY, AuthRole.ADVISOR] },
  },
  students: {
    list: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN, AuthRole.FACULTY, AuthRole.ADVISOR] },
    read: { roles: [AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN, AuthRole.FACULTY, AuthRole.ADVISOR] },
  },
};

export class RbacService {
  readonly #matrix: PermissionMatrix;

  constructor(matrix: PermissionMatrix = PERMISSION_MATRIX) {
    this.#matrix = matrix;
  }

  /** Check if a role is in the allowed list. SuperAdmin always passes. */
  checkRole(userRole: AuthRole, allowedRoles: readonly AuthRole[]): PermissionCheckResult {
    if (userRole === AuthRole.SUPERADMIN) {
      return { allowed: true };
    }
    if (allowedRoles.includes(userRole)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Access denied: role '${userRole}' is not authorized for this resource. Required: [${allowedRoles.map(r => `'${r}'`).join(", ")}]`,
    };
  }

  /** Check institution scope. SuperAdmin bypasses. */
  checkInstitutionScope(user: AuthTokenPayload, resourceInstitutionId: string): PermissionCheckResult {
    if (user.role === AuthRole.SUPERADMIN) {
      return { allowed: true };
    }
    if (user.institution_id === resourceInstitutionId) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: "Access denied: you cannot access resources outside your institution",
    };
  }

  /** Check course director privilege. SuperAdmin and InstitutionalAdmin bypass. */
  checkCourseDirector(user: AuthTokenPayload): PermissionCheckResult {
    if (user.role === AuthRole.SUPERADMIN || user.role === AuthRole.INSTITUTIONAL_ADMIN) {
      return { allowed: true };
    }
    if (user.role === AuthRole.FACULTY && user.is_course_director) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: "Access denied: this action requires course director privileges",
    };
  }

  /** Lookup a permission from the matrix. */
  getPermission(resource: Resource, action: ResourceAction) {
    return this.#matrix[resource]?.[action];
  }
}
```

### RbacMiddleware Design

```typescript
// apps/server/src/middleware/rbac.middleware.ts
import { Request, Response, NextFunction } from "express";
import { AuthRole, ApiResponse } from "@journey-os/types";
import { isAuthenticated } from "@journey-os/types";
import { RbacService } from "../services/auth/rbac.service";
import { ForbiddenError, InstitutionScopeError } from "../errors/forbidden.error";

export class RbacMiddleware {
  readonly #rbacService: RbacService;

  constructor(rbacService: RbacService) {
    this.#rbacService = rbacService;
  }

  /**
   * Returns middleware that checks user role against allowed roles.
   * SuperAdmin always passes.
   * Usage: rbac.require("superadmin", "institutional_admin")
   */
  require(...roles: AuthRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!isAuthenticated(req)) {
        this.#sendUnauthorized(res);
        return;
      }

      const result = this.#rbacService.checkRole(req.user.role, roles);
      if (!result.allowed) {
        this.#sendForbidden(res, new ForbiddenError(
          result.reason!,
          req.user.role,
          roles,
        ));
        return;
      }

      next();
    };
  }

  /**
   * Returns middleware that checks role AND institution scope.
   * Reads institution_id from req.params.institutionId.
   * SuperAdmin bypasses institution check.
   * Usage: rbac.requireScoped("institutional_admin", "faculty")
   */
  requireScoped(...roles: AuthRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!isAuthenticated(req)) {
        this.#sendUnauthorized(res);
        return;
      }

      const roleResult = this.#rbacService.checkRole(req.user.role, roles);
      if (!roleResult.allowed) {
        this.#sendForbidden(res, new ForbiddenError(
          roleResult.reason!,
          req.user.role,
          roles,
        ));
        return;
      }

      const resourceInstitutionId = req.params.institutionId;
      if (resourceInstitutionId) {
        const scopeResult = this.#rbacService.checkInstitutionScope(req.user, resourceInstitutionId);
        if (!scopeResult.allowed) {
          this.#sendForbidden(res, new InstitutionScopeError(scopeResult.reason));
          return;
        }
      }

      next();
    };
  }

  /**
   * Returns middleware that requires course director privileges.
   * Allows: SuperAdmin, InstitutionalAdmin, Faculty with is_course_director=true.
   * Usage: rbac.requireCourseDirector()
   */
  requireCourseDirector() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!isAuthenticated(req)) {
        this.#sendUnauthorized(res);
        return;
      }

      const result = this.#rbacService.checkCourseDirector(req.user);
      if (!result.allowed) {
        this.#sendForbidden(res, new ForbiddenError(result.reason!, req.user.role, []));
        return;
      }

      next();
    };
  }

  #sendUnauthorized(res: Response): void {
    const body: ApiResponse<null> = {
      data: null,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
    res.status(401).json(body);
  }

  #sendForbidden(res: Response, error: ForbiddenError | InstitutionScopeError): void {
    const body: ApiResponse<null> = {
      data: null,
      error: { code: error.code, message: error.message },
    };
    res.status(403).json(body);
  }
}
```

### Factory Function

```typescript
// At end of rbac.middleware.ts
export function createRbacMiddleware(): RbacMiddleware {
  const rbacService = new RbacService();
  return new RbacMiddleware(rbacService);
}
```
