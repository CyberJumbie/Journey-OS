# STORY-U-3: Express Auth Middleware

**Epic:** E-01 (Auth Infrastructure)
**Feature:** F-01 (Authentication & Onboarding)
**Sprint:** 3
**Lane:** universal (P0)
**Size:** M
**Old ID:** S-U-01-2

---

## User Story
As a **platform engineer**, I need Express middleware that verifies JWT tokens, extracts the user role, and populates `req.user` so that downstream controllers can identify the authenticated user.

## Acceptance Criteria
- [ ] AuthMiddleware class verifies Supabase JWT on every protected request
- [ ] Invalid/expired tokens return 401 Unauthorized with structured error
- [ ] Missing Authorization header returns 401 with clear message
- [ ] `req.user` populated with: id, email, role, institution_id, metadata
- [ ] Role extracted from `app_metadata.role` in JWT claims
- [ ] TypeScript augmentation for Express Request type to include `user` property
- [ ] AuthService wraps Supabase auth operations (verify, decode, refresh)
- [ ] Custom UnauthorizedError class (not raw Error)
- [ ] 10 API tests: valid token, expired token, malformed token, missing header, role extraction, institution scoping, token refresh edge case, invalid signature, empty bearer, OPTIONS passthrough

## Reference Screens
> **None** -- backend-only story (Express middleware).

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/auth/auth-request.types.ts` |
| Middleware | apps/server | `src/middleware/auth.middleware.ts` |
| Service | apps/server | `src/services/auth/auth.service.ts` |
| Errors | apps/server | `src/errors/unauthorized.error.ts` |
| Tests | apps/server | `src/middleware/__tests__/auth.middleware.test.ts` |

## Database Schema
No new database schema. Reads from Supabase `auth.users` via JWT verification.

## API Endpoints
No new endpoints. This middleware is applied to all protected routes via Express middleware chain:
```
router.use(authMiddleware.handle)
```

## Dependencies
- **Blocked by:** STORY-U-1 (Supabase Auth Setup)
- **Blocks:** STORY-U-6 (RBAC Middleware), STORY-U-8 (Registration Wizard), STORY-U-9 (Invitation Acceptance), STORY-U-10 (Dashboard Routing), STORY-U-14 (Email Verification)
- **Cross-lane:** All Sprint 3+ API stories depend on this middleware

## Testing Requirements
- 10 API tests:
  1. Valid token populates req.user correctly
  2. Expired token returns 401
  3. Malformed token returns 401
  4. Missing Authorization header returns 401
  5. Role extraction from app_metadata.role
  6. Institution scoping from JWT claims
  7. Token refresh edge case handling
  8. Invalid signature returns 401
  9. Empty bearer string returns 401
  10. OPTIONS passthrough for CORS preflight
- 0 E2E tests

## Implementation Notes
- Constructor DI: AuthMiddleware receives AuthService via constructor injection.
- Named export only: `export { AuthMiddleware }`.
- Middleware pattern: `(req, res, next) => authMiddleware.handle(req, res, next)`.
- Do not skip MVC layers; the middleware delegates to AuthService for token verification.
- OPTIONS requests should pass through without auth for CORS preflight.
- OOP with private `#fields` (JS private, not TS `private`).
- Express `req` augmentation via TypeScript declaration merging in `auth-request.types.ts`.
- Express 5 strict mode: use double-cast `(req as unknown as Record<string, unknown>).user` if needed.
