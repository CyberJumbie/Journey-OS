---
name: password-reset-flow-pattern
tags: [auth, password-reset, supabase, validation, ui]
story: STORY-U-11
date: 2026-02-19
---
# Password Reset Flow Pattern

## Problem
Complete the forgot-password → reset-password flow with proper session handling, password validation, and UX.

## Solution
The flow is: forgot-password email → Supabase magic link with code → `/auth/callback?code=X&next=/reset-password` → reset-password page.

### Session handling
1. Auth callback exchanges PKCE code for session
2. Reset form checks session on mount via `getUser()`
3. No session → "expired link" state with link to `/forgot-password`
4. After password update → sign out + redirect to `/login` after 3s

### Password validation (pure function)
```typescript
function validatePassword(password: string): PasswordValidationResult {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
  const passedCount = Object.values(checks).filter(Boolean).length;
  const strength = passedCount <= 2 ? "weak" : passedCount === 3 ? "fair" : passedCount === 4 ? "good" : "strong";
  return { isValid: passedCount === 5, strength, checks };
}
```

### Sign out after reset
Security best practice: force re-login with new password. `signOut()` before redirect ensures no stale session.

## When to use
- Any Supabase password reset flow
- Reuse `validatePassword()` for registration password validation too

## When NOT to use
- Magic link login (no password involved)
