# Journey OS — Claude Code System Prompt

## Project
AI-powered educational OS for medical schools.
Monorepo: apps/web (Next.js 15), apps/server (Express + LangGraph.js),
packages/types, packages/ui (shadcn/ui), packages/python-api (Tier 2+).

## Context Protocol
1. Read story brief as PRIMARY input. It's self-contained.
2. Check docs/solutions/ for reusable patterns before writing new code.
3. Never load .context/source/ docs directly — use RLM or /design-query.
4. Read .context/doc-manifest.yaml for document locations and priority.
5. The brief contains lane, priority, dependencies, and blockers.

## Persona Lanes (development priority order)
1. universal (P0) — Infrastructure, auth, RBAC, shared services, seeding
2. superadmin (P1) — Platform management, multi-institution
3. institutional_admin (P2) — Institution config, programs, faculty, analytics
4. faculty (P3) — Content creation, generation workbench, curriculum mapping
5. student (P4) — Learning path, assessments, adaptive practice, progress
6. advisor (P5) — Student monitoring, interventions, alerts

## Architecture Rules
- OOP: Private fields (`#field` JS private, not TS `private`), public getters, constructor DI.
- MVC: View → Controller → Service → Repository → Database. No skipping.
- Atomic Design: Atoms → Molecules → Organisms → Templates → Pages.
- Named exports only. No default exports. EXCEPTION: Next.js App Router requires `export default` for page.tsx, layout.tsx, loading.tsx, error.tsx, not-found.tsx, and middleware.ts.
- Custom error classes only. No raw throw new Error().
- Design tokens only. No hardcoded hex/font/spacing values.
- TypeScript strict. No `any` without JSDoc justification.
- SCREAMING_SNAKE_CASE for Neo4j labels with acronym prefix (USMLE_System).
- PascalCase for all other Neo4j labels (SubConcept, ProficiencyVariable).
- Typed relationships with direction (Course)-[:OFFERS]->(SLO).
- ILO and SLO are separate node types. Never combine them.
- All embeddings are 1024-dim (Voyage AI voyage-3-large).
- SSE for streaming generation pipeline events. Socket.io for presence only.

## Database Rules
- All Supabase operations through Supabase MCP. Never raw psql.
- All Neo4j operations through Neo4j MCP. Never raw cypher-shell.
- DualWriteService: Supabase first → Neo4j second → sync_status = 'synced'.

## Testing Rules
- API tests (70%): vitest for CRUD, auth, validation, data integrity, dual-write.
- E2E tests (30%): Playwright for 5 critical journeys only.
- Demo accounts for E2E: see .context/spec/personas/ for credentials.

## Implementation Order
Types → Model → Repository → Service → Controller → View → API Tests → E2E

## Spec Pipeline Rules
- Parallel subagents must ONLY write artifact files (stories, specs, briefs). Shared tracking files (coverage.yaml, FEATURE-EPIC-MAP.md, MEMORY.md) must ONLY be updated by the main orchestrator after all subagents complete.

## Monorepo Conventions
- Server imports types via `@journey-os/types` path alias + TypeScript project references (`composite: true` in types tsconfig).
- Vitest cross-workspace imports need aliases in `vitest.config.ts`, not relative `../../../../` paths.
- Express app variable needs explicit `Express` type annotation to avoid TS2742.
- Web app path alias is `@web/*` (not `@/*`). Use `@web/components/...`, `@web/lib/...` for imports in `apps/web`.
- Express `req.params` values are `string | string[]` in strict mode. Narrow with `typeof x === "string"` before passing to functions expecting `string`.
- Vitest `.toThrow(ErrorClass)` checks `instanceof`. `.toThrow("string")` checks the message text. Use the class form for custom errors.
- Vitest `vi.mock()` hoists before variable declarations. Use `vi.hoisted()` to declare mock variables that `vi.mock()` closures reference.
- Lazy/optional services (Neo4j, Redis) should validate env vars at class instantiation, not in the global zod env schema (zod validates at import time).
- After adding/editing files in `packages/types`, rebuild with `tsc -b packages/types/tsconfig.json` before type-checking downstream packages. The composite project emits `.d.ts` files that server/web resolve — stale `.d.ts` = invisible types.

## Things Claude Gets Wrong
(Updated by /compound — the error-to-rule pipeline)
- Parallel subagents each updated coverage.yaml with partial totals, causing data loss. See spec pipeline rule above.
- Applied "no default exports" rule to Next.js page/layout files, breaking App Router. See exception in Architecture Rules.
- Used TS `private` keyword instead of JS `#private` syntax, making fields accessible at runtime via bracket notation.
- Used `.toThrow("ErrorClassName")` in vitest which matches error message, not class name. Use `.toThrow(ErrorClass)` instead.
- Used relative `../../../../` paths for cross-workspace imports in vitest. Use vitest aliases instead.
- Server `rootDir: "src"` breaks when path aliases resolve to files outside src. Use TypeScript project references with `composite: true`.
- Used `@/` path alias in web app imports when the actual alias is `@web/*`. Always check tsconfig paths before importing.
- Express `req.params` values are `string | string[]`. Always narrow with `typeof === "string"` before passing to typed functions.
- Made Neo4j env vars required in global zod schema, but zod runs at import time. Use optional in zod, validate at `Neo4jClientConfig` instantiation.
- `vi.mock()` closures can't reference variables declared after the mock. Use `vi.hoisted()` to hoist mock declarations.
- Don't use `SeedResult["errors"]` as a mutable accumulator type — it resolves to `readonly SeedNodeError[]`. Import `SeedNodeError` directly and type as `SeedNodeError[]`.
- When modifying shared infrastructure (middleware, utils, config), read existing tests for that file BEFORE changing behavior — string assertions and mock expectations will break silently.
- Used string literal `"superadmin"` instead of `AuthRole.SUPERADMIN` enum when calling `rbac.require()`. Always use the `AuthRole` enum — the method signature requires it.
- Accessed `.mock.calls[0][0]` in vitest without non-null assertion. TypeScript strict mode requires `.mock.calls[0]![0]` since array index access returns `T | undefined`.
- Supabase mock with `mockReturnThis()` across insert/select chains caused `single is not a function`. Create separate mock objects per chain stage. See `docs/solutions/supabase-mock-factory.md`.
- Defined `SortDirection` type in a new file when it already existed in `user/global-user.types.ts`. Barrel re-exported both, causing TS2308 duplicate export. Always grep `packages/types/src` for existing type names before creating new ones.
- Never mix `next/headers` (server-only) with client-component code in the same file. Split into `supabase.ts` (browser client) and `supabase-server.ts` (server client) to respect the App Router boundary.
- When seeding auth.users via raw SQL, Supabase GoTrue expects empty strings (`''`) not NULL for varchar token columns (`confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`, `email_change_token_current`, `phone_change`, `phone_change_token`, `reauthentication_token`). NULL causes 500: "converting NULL to string is unsupported".
- Added new type files to `packages/types` but forgot to rebuild the composite project. Server `tsc --noEmit` couldn't find the new exports. Always run `tsc -b packages/types/tsconfig.json` after modifying the types package.
