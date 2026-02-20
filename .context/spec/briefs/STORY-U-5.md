# STORY-U-5: Forgot Password Flow

**Epic:** E-03 (Account Recovery)
**Feature:** F-01 (Authentication & Onboarding)
**Sprint:** 21
**Lane:** universal (P0)
**Size:** S
**Old ID:** S-U-03-1

---

## User Story
As a **user who forgot their password**, I need to request a password reset email so that I can regain access to my account without contacting support.

## Acceptance Criteria
- [ ] Forgot password page with email input field and submit button
- [ ] Email validation (format check) before submission
- [ ] Calls Supabase `resetPasswordForEmail()` on submit
- [ ] Success message displayed regardless of email existence (prevent enumeration)
- [ ] Rate limiting: max 3 reset requests per email per hour
- [ ] Loading state during request submission
- [ ] Link to forgot password page from login form
- [ ] Error handling for network failures with retry option

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md` for full mapping.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/auth/ForgotPassword.tsx` | `apps/web/src/app/(auth)/forgot-password/page.tsx` | Convert from React Router to Next.js App Router; replace inline styles with Tailwind design tokens; extract WovenField and AscSquares to `packages/ui` atoms; replace hardcoded hex with CSS custom properties; split BrandPanel into reusable organism |
| `components/shared/woven-field.tsx` | `packages/ui/src/atoms/woven-field.tsx` | Already a shared component; ensure named export, design token colors |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/auth/password-reset.types.ts` |
| Service | apps/server | `src/services/auth/password-reset.service.ts` |
| Controller | apps/server | `src/controllers/auth/password-reset.controller.ts` |
| Route | apps/server | `src/routes/auth/password-reset.routes.ts` |
| View | apps/web | `src/app/(auth)/forgot-password/page.tsx` |
| Component | apps/web | `src/components/auth/forgot-password-form.tsx` |
| Atom | packages/ui | `src/atoms/woven-field.tsx`, `src/atoms/ascending-squares.tsx` |
| Organism | apps/web | `src/components/auth/auth-brand-panel.tsx` |
| API Tests | apps/server | `src/services/auth/__tests__/password-reset.service.test.ts` |

## Database Schema
No new tables. Uses Supabase Auth's built-in password reset token management.

Rate limiting state stored in-memory (production: Redis):
```typescript
// In-memory rate limit map: email -> { count, resetAt }
Map<string, { count: number; resetAt: Date }>
```

## API Endpoints

### POST /api/v1/auth/forgot-password
**Auth:** Public (no JWT required)
**Request:**
```json
{ "email": "user@med.edu" }
```
**Success Response (200):**
```json
{ "data": { "message": "If an account exists, a reset email has been sent." }, "error": null }
```
**Error Responses:**
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid email format |
| 429 | `RATE_LIMITED` | More than 3 requests per email per hour |

## Dependencies
- **Blocked by:** STORY-U-1 (Supabase Auth Setup)
- **Blocks:** STORY-U-11 (Password Reset Page)
- **Cross-lane:** none

## Testing Requirements
- 6 API tests: valid email sends reset, invalid email format rejected, rate limiting enforced after 3 attempts, success response even for non-existent email (no enumeration), network failure handling, controller response structure
- 0 E2E tests

## Implementation Notes
- Supabase handles email delivery and token generation internally.
- Success message must not reveal whether the email exists in the system (security).
- Rate limiting should be applied at the controller layer via middleware.
- The prototype `ForgotPassword.tsx` uses a split-panel layout (Template C): white brand panel on left, cream form panel on right. Preserve this layout.
- Replace all inline `style={{}}` with Tailwind classes using design tokens.
- Extract the BrandPanel (logo + woven field + ascending squares) into a reusable auth layout organism since it is shared across Login, Registration, Forgot Password, and Reset Password pages.
- Use `useSyncExternalStore` for mounted state instead of `useState` + `useEffect` (React 19 pattern).
