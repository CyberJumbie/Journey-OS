# Plan: STORY-U-1 — Supabase Auth Setup

## Status: AWAITING APPROVAL

## Codebase State
Greenfield — no source code exists yet. This plan bootstraps the monorepo structure alongside the auth infrastructure.

---

## Tasks (implementation order)

### Phase 0: Monorepo Scaffolding (prerequisite)
> These directories/files don't exist yet and must be created first.

| # | Task | File Path |
|---|------|-----------|
| 0a | Init `packages/types` workspace | `packages/types/package.json`, `packages/types/tsconfig.json` |
| 0b | Init `apps/server` workspace | `apps/server/package.json`, `apps/server/tsconfig.json` |
| 0c | Init `apps/web` workspace | `apps/web/package.json`, `apps/web/tsconfig.json` |
| 0d | Root pnpm workspace config | `pnpm-workspace.yaml`, root `package.json`, root `tsconfig.json` |
| 0e | Install shared deps | `typescript`, `vitest` at root; `zod` in server; `@supabase/supabase-js` in server+types; `@supabase/ssr` in web |

### Phase 1: Types (packages/types)
| # | Task | File Path |
|---|------|-----------|
| 1 | AuthRole enum, ROLE_HIERARCHY, isValidRole() | `packages/types/src/auth/roles.types.ts` |
| 2 | AuthUser, AuthSession, AuthTokenPayload, DTOs, ApiResponse envelope | `packages/types/src/auth/auth.types.ts` |
| 3 | Barrel export | `packages/types/src/auth/index.ts` |
| 4 | Root barrel (re-export auth) | `packages/types/src/index.ts` |

### Phase 2: Error Classes (apps/server)
| # | Task | File Path |
|---|------|-----------|
| 5 | JourneyOSError + DomainError base classes | `apps/server/src/errors/base.errors.ts` |
| 6 | AuthenticationError, AuthorizationError, MissingEnvironmentError | `apps/server/src/errors/auth.errors.ts` |
| 7 | Errors barrel | `apps/server/src/errors/index.ts` |

### Phase 3: Server Config (apps/server)
| # | Task | File Path |
|---|------|-----------|
| 8 | Zod env validation, fail-fast on import | `apps/server/src/config/env.config.ts` |
| 9 | SupabaseClientConfig singleton class | `apps/server/src/config/supabase.config.ts` |

### Phase 4: Web Config (apps/web)
| # | Task | File Path |
|---|------|-----------|
| 10 | createBrowserClient + createServerClient (@supabase/ssr) | `apps/web/src/lib/supabase.ts` |

### Phase 5: Supabase Project Config (manual/MCP)
| # | Task | Action |
|---|------|--------|
| 11 | Enable email/password provider | Supabase Dashboard or MCP |
| 12 | Set JWT expiry, refresh rotation | Supabase Dashboard or MCP |
| 13 | Configure 3 email templates (verification, invitation, reset) | Supabase Dashboard or MCP |
| 14 | Create `.env.example` files | `apps/server/.env.example`, `apps/web/.env.example` |

### Phase 6: Tests
| # | Task | File Path |
|---|------|-----------|
| 15 | AuthRole enum + isValidRole + ROLE_HIERARCHY tests | `packages/types/src/auth/__tests__/auth.types.test.ts` |
| 16 | Env validation tests (fail-fast, missing vars) | `apps/server/src/config/__tests__/env.config.test.ts` |
| 17 | Supabase singleton tests | `apps/server/src/config/__tests__/supabase.config.test.ts` |

---

## Implementation Order
Types → Errors → Config → Web Client → Supabase Project → Tests

## Patterns to Follow
- OOP singleton: private constructor, static getInstance(), public getter (brief Section "Implementation Notes")
- Zod env validation with fail-fast (brief Section "Implementation Notes")
- @supabase/ssr cookie pattern for Next.js 15 (brief Section 6)
- No solution docs exist yet — this is the first implementation story

## Testing Strategy
- **API tests (vitest):** 3 test suites
  - `auth.types.test.ts` — enum values, type guard, hierarchy ordering
  - `env.config.test.ts` — valid parse, missing var throws, URL validation, frozen object
  - `supabase.config.test.ts` — singleton, correct key, getter pattern
- **E2E:** None (infrastructure story, no UI)

## Figma Make
- [x] Code directly (no UI)

## Risks / Edge Cases
- **Supabase project must exist first** — need URL + keys before env config works. Create project before Phase 3.
- **Monorepo scaffolding** — Phase 0 is extra work not in the brief. Must decide: minimal scaffolding (just enough for these files) vs full Next.js/Express setup. Recommend minimal — just package.json + tsconfig for each workspace.
- **@supabase/ssr version** — Next.js 15 uses async `cookies()`. The brief accounts for this with `await cookies()`.
- **pnpm workspace references** — `packages/types` must be consumable by both `apps/server` and `apps/web` via workspace protocol.

## Acceptance Criteria (verbatim from brief)
- AC-1: Supabase project has email/password auth provider enabled
- AC-2: JWT secret in env var, never in committed source
- AC-3: Three custom email templates exist (verification, invitation, reset)
- AC-4: AuthUser interface with all specified fields
- AC-5: AuthSession interface with all specified fields
- AC-6: AuthRole enum with exactly 5 roles matching DB CHECK constraint
- AC-7: Supabase client singleton with OOP pattern (private fields, public getter)
- AC-8: Web client exports createBrowserClient + createServerClient with cookie persistence
- AC-9: Missing env var → immediate MissingEnvironmentError exit
- AC-10: All exports are named (no default exports)
- AC-11: All error classes extend JourneyOSError
- AC-12: Role in app_metadata.role, not user_metadata
