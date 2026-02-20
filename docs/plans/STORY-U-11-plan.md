# Implementation Plan: STORY-U-11 — Password Reset Page

## Overview

Build the password reset page where users enter a new password after clicking the email reset link. Completes the account recovery flow from STORY-U-5.

**Size:** S | **Sprint:** 21 | **Lane:** Universal (P0)

## Implementation Order

Types → Validation Utility → Components → Page → Tests

---

## Phase 1: Types

### Task 1.1: Extend password-reset types

**File:** `packages/types/src/auth/password-reset.types.ts` (MODIFY)

Add:
```typescript
export type PasswordStrength = "weak" | "fair" | "good" | "strong";

export interface PasswordValidationResult {
  readonly isValid: boolean;
  readonly strength: PasswordStrength;
  readonly checks: {
    readonly minLength: boolean;
    readonly hasUppercase: boolean;
    readonly hasLowercase: boolean;
    readonly hasNumber: boolean;
    readonly hasSpecial: boolean;
  };
}
```

Export from the types package index if one exists.

---

## Phase 2: Validation Utility

### Task 2.1: Create password validation function

**File:** `apps/web/src/lib/auth/password-validation.ts`

Named export: `validatePassword(password: string): PasswordValidationResult`

**Logic:**
- `minLength`: `password.length >= 8`
- `hasUppercase`: `/[A-Z]/.test(password)`
- `hasLowercase`: `/[a-z]/.test(password)`
- `hasNumber`: `/\d/.test(password)`
- `hasSpecial`: `/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)`
- Count passing checks:
  - 0-1 → "weak"
  - 2-3 → "fair"
  - 4 → "good"
  - 5 → "strong"
- `isValid`: all 5 checks pass

**Note:** This is a pure function with zero dependencies — easy to test.

---

## Phase 3: Components

### Task 3.1: Password strength indicator

**File:** `apps/web/src/components/auth/password-strength-indicator.tsx`

`"use client"` component.

**Props:** `{ password: string }`

**Renders:**
1. **Strength bar** — 4 equal segments, filled based on strength level:
   - `weak`: 1/4 filled, red (`#dc2626`)
   - `fair`: 2/4 filled, amber (`#f59e0b`)
   - `good`: 3/4 filled, blue (`#2b71b9`)
   - `strong`: 4/4 filled, green (`#69a338`)
   - Empty/no password: all gray (`bg-gray-200`)

2. **Requirements checklist** — 5 items, each with ✓ (green) or ✗ (gray):
   - At least 8 characters
   - One uppercase letter
   - One lowercase letter
   - One number
   - One special character

**Styling:** Use Tailwind for layout. Hardcoded hex only for the 4 strength colors (matches existing design token pattern from forgot-password-form).

### Task 3.2: Reset password form

**File:** `apps/web/src/components/auth/reset-password-form.tsx`

`"use client"` component.

**State Machine:**
```
idle → loading → success
                → error
invalid_session (set on mount if no user)
```

**On Mount:**
1. Call `createBrowserClient()` → `supabase.auth.getUser()`
2. If no user → set state to `invalid_session`
3. If user exists → set state to `idle`

**Form Fields:**
- `password` — new password input (type="password")
- `confirmPassword` — confirm password input (type="password")

**Validation (on submit):**
1. `validatePassword(password)` must return `isValid: true`
2. `password === confirmPassword`
3. Both fields non-empty

**Submit Handler:**
1. Set state to `loading`
2. Call `supabase.auth.updateUser({ password })`
3. On success: set state to `success`, call `supabase.auth.signOut()`, then `setTimeout(() => router.push("/login"), 3000)`
4. On error: set state to `error`, display `error.message`

**Renders by State:**
- `invalid_session`: Error card — "Invalid or Expired Link" heading, message, link to `/forgot-password`
- `idle`: Form with password + confirm + strength indicator + submit button
- `loading`: Form with disabled inputs and spinner on submit button
- `success`: Success card — "Password Updated" heading, auto-redirect countdown, link to `/login`
- `error`: Form with error banner at top, fields editable

**Design Tokens:** Match `forgot-password-form.tsx` exactly:
- Submit button: `background: #2b71b9`, white text
- Success heading: `color: #69a338`
- Font families: `"Source Sans 3"` for headings, `"DM Mono"` for labels
- Card: inherited from `(auth)/layout.tsx`

---

## Phase 4: Page

### Task 4.1: Reset password page

**File:** `apps/web/src/app/(auth)/reset-password/page.tsx`

```typescript
import type { Metadata } from "next";
import { ResetPasswordForm } from "@web/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password — Journey OS",
  description: "Set a new password for your Journey OS account.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
```

---

## Phase 5: Tests

### Task 5.1: Password validation unit tests

**File:** `apps/web/src/__tests__/lib/auth/password-validation.test.ts`

Test `validatePassword()` thoroughly:
- Each individual check (5 tests)
- isValid true/false (3 tests)
- Strength levels (4 tests)
- Edge cases: empty, unicode, very long, whitespace (4 tests)

~15 test cases total.

---

## Shared Dependency: Auth Callback Route

The password reset flow requires `/auth/callback` to exchange the PKCE code for a session. This route is defined in STORY-U-10.

**If U-10 is implemented first:** No action needed.
**If U-11 is implemented first:** Create the auth callback route as part of this story (same implementation as in U-10 plan).

---

## Risk Checklist

- [ ] Verify `supabase.auth.updateUser({ password })` works when user has an active session from code exchange
- [ ] Verify that after code exchange, the user session persists when navigating to `/reset-password`
- [ ] Ensure `signOut()` after password update clears cookies properly before redirect
- [ ] Test that the middleware (from U-10) doesn't redirect `/reset-password` to login (it's in the auth route group, should be public)
- [ ] Confirm password reset email redirect URL matches: `/auth/callback?code=...&next=/reset-password`
