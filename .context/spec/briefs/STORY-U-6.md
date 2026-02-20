# STORY-U-6: RBAC Middleware

**Epic:** E-01 (Auth Infrastructure)
**Feature:** F-01 (Authentication & Onboarding)
**Sprint:** 3
**Lane:** universal (P0)
**Size:** M
**Old ID:** S-U-01-3

---

## User Story
As a **platform engineer**, I need role-based access control middleware so that API endpoints are protected based on the authenticated user's role and only authorized personas can access their designated resources.

## Acceptance Criteria
- [ ] RbacMiddleware accepts allowed roles as constructor parameter
- [ ] Returns 403 Forbidden when user role not in allowed list
- [ ] Custom ForbiddenError class with role context in error payload
- [ ] RbacService defines permission matrix: role -> allowed resource actions
- [ ] SuperAdmin has access to all routes
- [ ] Institutional Admin scoped to own institution's resources
- [ ] Faculty scoped to assigned courses within institution
- [ ] Student scoped to enrolled courses
- [ ] Advisor scoped to assigned students
- [ ] Composable: `rbac.require(AuthRole.SUPERADMIN, AuthRole.INSTITUTIONAL_ADMIN)` pattern
- [ ] Institution scoping: middleware verifies `req.user.institution_id` matches resource
- [ ] 12 API tests: per-role access, denied access, multi-role routes, institution scoping, missing role, superadmin override, nested permission check, edge cases

## Reference Screens
> **None** -- backend-only story (Express middleware).

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/auth/rbac.types.ts`, `src/auth/permissions.types.ts` |
| Middleware | apps/server | `src/middleware/rbac.middleware.ts` |
| Service | apps/server | `src/services/auth/rbac.service.ts` |
| Errors | apps/server | `src/errors/forbidden.error.ts` |
| Tests | apps/server | `src/middleware/__tests__/rbac.middleware.test.ts`, `src/services/auth/__tests__/rbac.service.test.ts` |

## Database Schema
No new tables. RBAC reads role from `req.user.role` (populated by AuthMiddleware from JWT `app_metadata.role`).

Permission matrix defined declaratively as data:
```typescript
// Permission matrix structure
type PermissionMatrix = Record<AuthRole, Set<string>>;
// e.g., { superadmin: Set(['*']), institutional_admin: Set(['institution.read', 'institution.update', ...]) }
```

## API Endpoints
No new endpoints. RBAC middleware is applied to existing and future routes:
```typescript
router.get('/institutions', authMiddleware.handle, rbac.require(AuthRole.SUPERADMIN), controller.list)
```

## Dependencies
- **Blocked by:** STORY-U-3 (Express Auth Middleware)
- **Blocks:** STORY-SA-1 (Waitlist Application), STORY-SA-7 (Institution List), STORY-IA-1 (User List & Invitation), STORY-IA-6 (Framework List)
- **Cross-lane:** All persona-specific API stories depend on RBAC

## Testing Requirements
- 12 API tests:
  1. SuperAdmin can access all routes
  2. Institutional Admin can access own institution routes
  3. Institutional Admin denied access to other institution's routes
  4. Faculty can access assigned course routes
  5. Student can access enrolled course routes
  6. Advisor can access assigned student routes
  7. Missing role returns 403
  8. Multi-role route (e.g., `require(AuthRole.FACULTY, AuthRole.INSTITUTIONAL_ADMIN)`)
  9. Institution scoping enforcement
  10. SuperAdmin override on institution-scoped routes
  11. Composable middleware chaining
  12. ForbiddenError includes role context
- 0 E2E tests

## Implementation Notes
- Always use the `AuthRole` enum (e.g., `AuthRole.SUPERADMIN`), never string literals like `"superadmin"`.
- Permission matrix should be defined declaratively (data, not code) for easy auditing.
- Institution scoping is critical: an institutional_admin must never access another institution's data.
- Custom error classes only per architecture rules.
- Constructor DI for RbacService into RbacMiddleware.
- OOP with private `#fields` (JS private syntax).
- Named exports only.
- Middleware order: AuthMiddleware -> EmailVerificationMiddleware -> RbacMiddleware.
