# SOL-021: API Client Auth Token Pattern

## Trigger
When frontend hooks need to call backend API with JWT auth token from Supabase session.
Story it emerged from: P1-025

## Pattern

### What it solves
Bridging Supabase browser auth (cookie-based) with Express backend (Bearer token).
The frontend Supabase client has the session; the backend validates the JWT.

### Implementation
```typescript
// frontend/src/lib/api-client.ts
import { createClient } from '@/lib/supabase';

async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

// In the apiClient.get/post/patch/delete methods:
const token = await getAuthToken();
const headers: Record<string, string> = { 'Content-Type': 'application/json' };
if (token) headers['Authorization'] = `Bearer ${token}`;
```

### Gotchas
- `getSession()` reads from cookie, no network call — safe to call on every request
- Backend auth middleware validates via `supabase.auth.getUser(token)` (NOT `getSession`)
- If token is expired, Supabase middleware in Next.js refreshes it automatically
- Never store token in localStorage — read from Supabase session each time

## Provenance
First created: P1-025
Also applies to: All frontend hooks calling backend API
