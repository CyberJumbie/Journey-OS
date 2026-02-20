---
name: registration-wizard-pattern
tags: [registration, wizard, multi-step-form, react, supabase-auth]
story: STORY-U-8
date: 2026-02-19
---
# Registration Wizard Pattern

## Problem
Multi-step registration forms need to preserve state across steps, validate per-step, and submit everything atomically. Back navigation must not lose user input.

## Solution

### Architecture: Parent-owns-state wizard

All form state lives in the parent `RegistrationWizard` component. Step components are stateless renderers with callback props. Step index tracked via `useState(0)`.

```typescript
// Parent holds ALL form state
const [role, setRole] = useState<SelfRegisterableRole | null>(null);
const [displayName, setDisplayName] = useState("");
const [email, setEmail] = useState("");
// ... all other fields

// Steps are pure presentational components
{step === "role" && (
  <RoleStep selectedRole={role} onSelect={setRole} onNext={goNext} />
)}
{step === "profile" && (
  <ProfileStep
    displayName={displayName}
    onDisplayNameChange={setDisplayName}
    onNext={goNext}
    onBack={goBack}
  />
)}
```

### Supabase Duplicate Email Detection

Supabase `auth.signUp()` returns a fake user (not an error) for existing emails to prevent enumeration. Detect via empty identities array:

```typescript
const { data } = await supabaseClient.auth.signUp({ email, password });

if (data.user?.identities?.length === 0) {
  throw new DuplicateEmailError();
}
```

### Server-Side Registration Flow

1. Validate role is self-registerable (not superadmin/institutional_admin)
2. Validate password strength (8+ chars, uppercase, number)
3. Verify institution exists and is `approved`
4. `auth.signUp()` with `app_metadata: { role, institution_id }`
5. Upsert `profiles` row with FERPA consent fields
6. Return `{ user_id, email, requires_verification: true }`

### Rate Limiting

Registration endpoint uses IP-based rate limiting (5 req/15min per IP), not email-based like forgot-password. Users haven't registered yet, so email isn't a reliable key.

```typescript
export function createRegistrationRateLimiter() {
  const limiter = new RateLimiterMiddleware(
    { maxRequests: 5, windowMs: 15 * 60 * 1000 },
    (req) => req.ip ?? "unknown",
  );
  return (req, res, next) => limiter.handle(req, res, next);
}
```

## When to Use
- Any multi-step form where back navigation must preserve state
- Registration flows with conditional steps or role-dependent fields
- Forms that submit atomically (all-or-nothing)

## When Not to Use
- Single-page forms (no wizard needed)
- Forms with server-side step persistence (use session storage instead)
- Flows where each step creates a separate resource

## Source Reference
- [ARCHITECTURE_v10 SS 4.2] — Role stored in app_metadata
- [API_CONTRACT_v1 SS Auth & Users] — POST /api/v1/auth/register
