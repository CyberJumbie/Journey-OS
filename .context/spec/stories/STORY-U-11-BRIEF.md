# STORY-U-11 Brief: Password Reset Page

## 0. Lane & Priority

```yaml
story_id: STORY-U-11
old_id: S-U-03-2
lane: universal
lane_priority: 0
within_lane_order: 11
epic: E-03 (Account Recovery)
feature: F-01
sprint: 21
size: S
depends_on:
  - STORY-U-5 (universal) — Forgot Password Flow ✅ DONE
blocks: []
personas_served: [superadmin, institutional_admin, faculty, student, advisor]
```

## 1. Summary

Build the password reset page where users set a new password after clicking the reset link from their email. This completes the account recovery flow started in STORY-U-5 (Forgot Password).

**Flow:** User clicks email link → Supabase redirects to `/auth/callback?code=...&next=/reset-password` → auth callback exchanges code for session → user lands on `/reset-password` with active session → enters new password → `supabase.auth.updateUser({ password })` → success → redirect to `/login`.

**User Flows Satisfied:**
- UF-04: Password reset email link → new password entry → login

**Key Dependency:** This story requires the auth callback route handler from STORY-U-10. If U-10 is not implemented first, the auth callback route must be created as part of this story.

## 2. Task Breakdown

1. Add `UpdatePasswordRequest` validation types (extend `packages/types/src/auth/password-reset.types.ts`)
2. Create password strength indicator component (`apps/web/src/components/auth/password-strength-indicator.tsx`)
3. Create reset password form component (`apps/web/src/components/auth/reset-password-form.tsx`)
4. Create reset password page (`apps/web/src/app/(auth)/reset-password/page.tsx`)
5. Ensure auth callback route exists (from U-10, or create if not present)
6. Write unit tests for password strength indicator
7. Write unit tests for password validation logic

## 3. Data Model (inline, complete)

No new data models. Uses existing types:

```typescript
// packages/types/src/auth/auth.types.ts (EXISTS)
interface UpdatePasswordRequest {
  readonly password: string;
}

// packages/types/src/auth/password-reset.types.ts (EXISTS)
interface ForgotPasswordRequest {
  readonly email: string;
}

interface ForgotPasswordResponse {
  readonly message: string;
}
```

### New Types to Add

```typescript
// packages/types/src/auth/password-reset.types.ts (EXTEND)

/**
 * Password strength levels for the visual indicator.
 */
export type PasswordStrength = "weak" | "fair" | "good" | "strong";

/**
 * Result of password validation.
 */
export interface PasswordValidationResult {
  readonly isValid: boolean;
  readonly strength: PasswordStrength;
  readonly checks: {
    readonly minLength: boolean;      // >= 8 chars
    readonly hasUppercase: boolean;    // at least 1 uppercase
    readonly hasLowercase: boolean;    // at least 1 lowercase
    readonly hasNumber: boolean;       // at least 1 digit
    readonly hasSpecial: boolean;      // at least 1 special char
  };
}
```

## 4. Database Schema (inline, complete)

No new tables or migrations. Password update is handled entirely by Supabase Auth (`supabase.auth.updateUser({ password })`).

## 5. API Contract (complete request/response)

### No new Express API endpoints

Password reset uses the **Supabase client directly** from the browser:

```typescript
// Step 1: Auth callback exchanges code for session (handled by route handler)
// User arrives at /reset-password with an active Supabase session

// Step 2: Update password using Supabase client
const { error } = await supabase.auth.updateUser({ password: newPassword });

// Success: error is null
// Failure: error.message contains reason (e.g., "Password should be at least 6 characters")
```

### Auth Callback (shared with U-10)

```
GET /auth/callback?code=<auth_code>&next=/reset-password
→ Exchanges code for session via supabase.auth.exchangeCodeForSession(code)
→ 302 redirect to /reset-password
```

## 6. Frontend Spec

### Password Strength Indicator Component

```typescript
// apps/web/src/components/auth/password-strength-indicator.tsx
interface PasswordStrengthIndicatorProps {
  password: string;
}

// Visual: 4-segment bar that fills based on strength
// Colors:
//   weak (1/4):   #dc2626 (red-600)
//   fair (2/4):   #f59e0b (amber-500)
//   good (3/4):   #2b71b9 (primary blue)
//   strong (4/4): #69a338 (success green)
//
// Below the bar: checklist of requirements with ✓/✗ indicators
//   ✓ At least 8 characters
//   ✓ One uppercase letter
//   ✓ One lowercase letter
//   ✓ One number
//   ✗ One special character (!@#$%^&*)
```

### Reset Password Form Component

```typescript
// apps/web/src/components/auth/reset-password-form.tsx
interface ResetPasswordFormProps {}

// States: "idle" | "loading" | "success" | "error" | "invalid_session"
// Fields:
//   - password (string) — new password
//   - confirmPassword (string) — must match password
//
// On mount:
//   - Check supabase.auth.getUser() to verify session exists
//   - If no session → show "invalid_session" state with link to /forgot-password
//
// Validation:
//   - Password meets all strength requirements (isValid === true)
//   - Confirm password matches password
//
// Submit:
//   - Call supabase.auth.updateUser({ password })
//   - On success → show success message, redirect to /login after 3s
//   - On error → show error banner
//
// Links:
//   - "Request a new reset link" → /forgot-password (shown on invalid_session and error)
//   - "Back to Login" → /login
```

**Design Tokens (matching existing auth page patterns from forgot-password-form):**
- Primary blue: `#2b71b9` (submit button, focus rings)
- Success green: `#69a338` (success message, strong indicator)
- Error red: `text-red-600` (error messages)
- Heading font: `"Source Sans 3", sans-serif`
- Label font: `"DM Mono", monospace`
- Card layout: inherited from `(auth)/layout.tsx` — centered, max-w-md, shadow-md

### Reset Password Page

```typescript
// apps/web/src/app/(auth)/reset-password/page.tsx
// Metadata: { title: "Reset Password — Journey OS" }
// Renders: <ResetPasswordForm />
// Uses (auth) layout for consistent styling
```

## 7. Files to Create (exact paths, implementation order)

```
1. packages/types/src/auth/password-reset.types.ts    — EXTEND with PasswordStrength types
2. apps/web/src/lib/auth/password-validation.ts       — validatePassword() pure function
3. apps/web/src/components/auth/password-strength-indicator.tsx — Visual strength bar
4. apps/web/src/components/auth/reset-password-form.tsx — Main form component
5. apps/web/src/app/(auth)/reset-password/page.tsx     — Page route
```

**Files to Modify:**
```
6. packages/types/src/auth/password-reset.types.ts    — Add PasswordStrength, PasswordValidationResult
```

**Shared Dependency (from U-10):**
```
apps/web/src/app/auth/callback/route.ts              — Must exist for PKCE code exchange
```

## 8. Dependencies

### Stories
- STORY-U-5 (Forgot Password Flow) ✅ DONE — provides `PasswordResetService`, forgot-password form, email sending
- STORY-U-10 (Dashboard Routing) — provides auth callback route handler (if implemented first)

### NPM Packages (all already installed)
- `@supabase/ssr` ^0.8.0 — browser client for `updateUser`
- `@supabase/supabase-js` ^2.97.0 — auth methods
- `next` 16.1.6 — App Router
- `react` 19.2.3

### Existing Files Needed
- `apps/web/src/lib/supabase.ts` — `createBrowserClient()` for client-side auth calls
- `apps/web/src/app/(auth)/layout.tsx` — shared centered card layout
- `apps/web/src/components/auth/forgot-password-form.tsx` — reference for styling patterns
- `packages/types/src/auth/password-reset.types.ts` — extend with new types

## 9. Test Fixtures (inline)

```typescript
// Password validation test cases
const VALID_PASSWORDS = [
  "MyP@ssw0rd",         // all checks pass
  "Str0ng!Pass",        // all checks pass
  "C0mplex#Password1",  // all checks pass
];

const INVALID_PASSWORDS = [
  { value: "short1!", reason: "too short (< 8 chars)" },
  { value: "alllowercase1!", reason: "no uppercase" },
  { value: "ALLUPPERCASE1!", reason: "no lowercase" },
  { value: "NoNumbers!Here", reason: "no digit" },
  { value: "NoSpecial1Here", reason: "no special char" },
  { value: "", reason: "empty string" },
];

// Strength levels
const STRENGTH_CASES = [
  { password: "abc", expected: "weak" },           // 1 check passes
  { password: "abcdefgh", expected: "fair" },       // 2 checks pass (length + lowercase)
  { password: "Abcdefg1", expected: "good" },       // 4 checks pass (length + upper + lower + number)
  { password: "Abcdefg1!", expected: "strong" },    // all 5 checks pass
];
```

## 10. API Test Spec (vitest — PRIMARY)

### File: `apps/web/src/__tests__/lib/auth/password-validation.test.ts`

```
describe("validatePassword")
  describe("individual checks")
    ✓ minLength: passes for 8+ chars, fails for < 8
    ✓ hasUppercase: passes for "A", fails for "abc"
    ✓ hasLowercase: passes for "a", fails for "ABC"
    ✓ hasNumber: passes for "1", fails for "abc"
    ✓ hasSpecial: passes for "!", fails for "abc"

  describe("isValid")
    ✓ returns true when all 5 checks pass
    ✓ returns false when any check fails
    ✓ returns false for empty string

  describe("strength")
    ✓ returns "weak" when 0-1 checks pass
    ✓ returns "fair" when 2-3 checks pass
    ✓ returns "good" when 4 checks pass
    ✓ returns "strong" when all 5 checks pass

  describe("edge cases")
    ✓ handles unicode characters
    ✓ handles very long passwords (256+ chars)
    ✓ handles whitespace-only passwords
```

**Total: ~15 unit tests**

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Password reset is part of a critical user journey. E2E test should be added in a future story once the full auth flow is testable end-to-end. Not included here because:
- Requires email delivery (Supabase Inbucket or similar)
- Requires the auth callback flow to work end-to-end

## 12. Acceptance Criteria

1. Password reset page accessible at `/reset-password` within the `(auth)` layout
2. Token/session validation on page load via `supabase.auth.getUser()`
3. No session → shows error state with "Request a new reset link" link to `/forgot-password`
4. New password input with confirmation field (both required)
5. Password strength validation: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
6. Visual password strength indicator with 4-segment colored bar
7. Checklist below bar showing which requirements are met (✓) or not (✗)
8. Confirm password must match new password (inline error if mismatch)
9. Calls `supabase.auth.updateUser({ password })` on submit
10. Success state shows confirmation message and auto-redirects to `/login` after 3 seconds
11. Expired/invalid session shows clear error with link to request new reset
12. Submit button disabled while loading or when validation fails
13. All password validation logic has 100% unit test coverage

## 13. Source References

- [ARCHITECTURE v10 SS 4.2] — JWT token structure
- [API_CONTRACT v1 SS Auth & Users] — Password reset flow
- [Supabase Auth Docs] — `auth.updateUser()`, `auth.exchangeCodeForSession()`
- STORY-U-5 Brief — Forgot password flow, email redirect URL configuration
- `apps/server/src/services/auth/password-reset.service.ts` — `redirectTo: ${siteUrl}/auth/callback?next=/reset-password`

## 14. Environment Prerequisites

- **Supabase project** with auth configured and email templates set up
- **Password reset email template** configured with redirect URL to `/auth/callback?next=/reset-password`
  (Already configured in STORY-U-5: `redirectTo: ${siteUrl}/auth/callback?next=/reset-password`)
- **Environment variables** in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Auth callback route** must exist at `apps/web/src/app/auth/callback/route.ts` (from U-10 or created here)

## 15. Figma Make Prototype (Optional)

Not needed. Follows existing auth page patterns exactly (forgot-password-form styling). Password strength indicator is a new atom component but straightforward enough to code directly.
