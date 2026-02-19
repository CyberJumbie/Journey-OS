---
name: rbac-middleware-pattern
tags: [rbac, authorization, middleware, express, roles, institution-scoping]
story: STORY-U-6
date: 2026-02-19
---
# RBAC Middleware Pattern

## Problem
Every persona-specific API route needs role-based authorization with institution scoping and SuperAdmin bypass. Without a standard pattern, each route would implement ad-hoc role checks.

## Solution
Three composable middleware methods on `RbacMiddleware`, backed by `RbacService` with a declarative `PERMISSION_MATRIX`.

### Setup
```typescript
import { createRbacMiddleware } from "../middleware/rbac.middleware";

const rbac = createRbacMiddleware();
```

### Usage: Role-Only Guard
```typescript
// SuperAdmin only
router.get("/waitlist", authMiddleware.handle, rbac.require("superadmin"), controller.list);

// Multi-role
router.get("/users", authMiddleware.handle, rbac.require("superadmin", "institutional_admin"), controller.list);
```

### Usage: Institution-Scoped Guard
```typescript
// Checks role AND req.params.institutionId matches req.user.institution_id
router.get("/institutions/:institutionId/courses",
  authMiddleware.handle,
  rbac.requireScoped("faculty", "institutional_admin"),
  controller.list
);
```

### Usage: Course Director Guard
```typescript
// Allows SuperAdmin, InstAdmin, Faculty with is_course_director=true
router.post("/generate/bulk",
  authMiddleware.handle,
  rbac.requireCourseDirector(),
  controller.bulkGenerate
);
```

### Error Response Shape
All RBAC errors follow `ApiResponse<null>`:
```json
{
  "data": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied: role 'student' is not authorized for this resource. Required: ['superadmin', 'institutional_admin']"
  }
}
```

Error codes: `FORBIDDEN` (role denied), `INSTITUTION_SCOPE_VIOLATION` (cross-institution), `UNAUTHORIZED` (no req.user).

### Key Behaviors
- **SuperAdmin always passes** — every `checkRole`, `checkInstitutionScope`, and `checkCourseDirector` call
- **Auth middleware must run first** — RBAC reads from `req.user` populated by `AuthMiddleware`
- **Institution param convention** — always use `:institutionId` in route params for scoped routes
- **Course director is Faculty-only** — students/advisors with `is_course_director=true` are still denied

### Files
| File | Purpose |
|------|---------|
| `packages/types/src/auth/rbac.types.ts` | Resource, ResourceAction, Permission, PermissionCheckResult, RequireRoleOptions |
| `packages/types/src/auth/permissions.types.ts` | PermissionMatrix mapped type |
| `apps/server/src/errors/forbidden.error.ts` | ForbiddenError (#userRole, #requiredRoles), InstitutionScopeError |
| `apps/server/src/services/auth/rbac.service.ts` | RbacService + PERMISSION_MATRIX const |
| `apps/server/src/middleware/rbac.middleware.ts` | RbacMiddleware + createRbacMiddleware() factory |

### When to Use
- Every Express route that needs authorization (all persona-specific endpoints)
- Use `require()` for simple role gates
- Use `requireScoped()` when the route has `:institutionId` param
- Use `requireCourseDirector()` for bulk generation, SLO approval, etc.

### When NOT to Use
- Public routes (health check, login, register)
- Routes that only need authentication (use `authMiddleware.handle` alone)
