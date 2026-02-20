# Plan: STORY-IA-6 — Framework List Page

## Tasks (from brief, with refinements)

| # | Task | File(s) | Action |
|---|------|---------|--------|
| 1 | Define FrameworkSummary + FrameworkListResponse types | `packages/types/src/frameworks/framework-summary.types.ts` | CREATE |
| 2 | Update frameworks barrel export | `packages/types/src/frameworks/index.ts` | UPDATE |
| 3 | Rebuild types package | `tsc -b packages/types/tsconfig.json` | SHELL |
| 4 | Implement FrameworkService (Neo4j queries) | `apps/server/src/services/framework/framework.service.ts` | CREATE |
| 5 | Implement FrameworkController | `apps/server/src/controllers/framework/framework.controller.ts` | CREATE |
| 6 | Register GET /api/v1/institution/frameworks route | `apps/server/src/index.ts` | UPDATE |
| 7 | Create FrameworkCard component | `apps/web/src/components/framework/framework-card.tsx` | CREATE |
| 8 | Create FrameworkList component (fetch + grid + states) | `apps/web/src/components/framework/framework-list.tsx` | CREATE |
| 9 | Create frameworks page (server component) | `apps/web/src/app/(protected)/institution/frameworks/page.tsx` | CREATE |
| 10 | Write FrameworkService tests (~10 tests) | `apps/server/src/services/framework/__tests__/framework.service.test.ts` | CREATE |
| 11 | Write FrameworkController tests (~5 tests) | `apps/server/src/controllers/framework/__tests__/framework.controller.test.ts` | CREATE |

## Implementation Order

Types → Barrel + Rebuild → Service → Controller → Route → Frontend (Card → List → Page) → API Tests

## Patterns to Follow

- **Neo4j access:** `Neo4jClientConfig.getInstance().driver` singleton, injected via constructor DI
- **Service pattern:** JS `#private` fields, constructor DI for `Driver`, `try/finally { session.close() }`
- **Controller pattern:** Wrap service in try/catch, return `ApiResponse<T>` envelope `{ data, error }`
- **Route registration:** After auth middleware, with `rbac.require(AuthRole.INSTITUTIONAL_ADMIN, AuthRole.SUPERADMIN)`
- **Frontend page:** Server component (default export), client components wrapped in `<Suspense>`
- **Path alias:** `@web/*` for web app imports
- **After editing barrel exports:** Re-read file to verify PostToolUse hook didn't strip new exports
- **After adding types files:** Rebuild with `tsc -b packages/types/tsconfig.json`

## Key Design Decisions

1. **Neo4j conditional registration:** Route only registers if Neo4j config is available (follows lazy-service pattern from CLAUDE.md)
2. **Framework registry hardcoded in service:** 8 entries with key, name, description, Neo4j label, icon, relationship type
3. **Sequential queries per framework:** 2 Neo4j queries per framework (count + depth) — 16 total per request. Acceptable for admin-only page with 8 frameworks
4. **Sorting:** Server-side sort by `node_count` descending before returning response

## Testing Strategy

### API tests (~15 total):

**Service (10 tests):**
- Returns array of 8 FrameworkSummary objects
- Queries Neo4j for node count per framework label
- Queries Neo4j for hierarchy depth per framework label
- Sorts frameworks by node_count descending
- Returns hierarchy_depth 1 for frameworks with no relationships
- Returns node_count 0 for frameworks with no nodes seeded
- Includes name, description, and icon from registry
- Closes Neo4j session after query completes
- Closes Neo4j session even when query fails
- Throws when Neo4j driver is unavailable

**Controller (5 tests):**
- Returns 200 with FrameworkListResponse shape
- Response body matches ApiResponse envelope
- Frameworks array sorted by node_count descending
- Returns 500 INTERNAL_ERROR when service throws
- Passes correct data through to response

### E2E: No — read-only display page, deferred to IA-21

## Figma Make

- [ ] Prototype first
- [x] Code directly — straightforward card grid layout

## Risks / Edge Cases

1. **Neo4j unavailable at startup:** Route conditionally registered only when Neo4j config exists
2. **Neo4j session leak:** Must use `try/finally` to ensure `session.close()` even on error
3. **Framework with 0 nodes:** Skip depth query, return `hierarchy_depth: 1`
4. **PostToolUse hook stripping barrel exports:** Re-read after editing `index.ts` files
5. **Neo4j integer type:** Use `.toNumber()` on Neo4j integer results (they return `Integer` objects, not JS numbers)

## Acceptance Criteria (verbatim from brief)

- AC-1: Framework list page exists at `/institution/frameworks`
- AC-2: All 8 framework cards displayed in a responsive grid
- AC-3: Each card shows name, description, node count, hierarchy depth, icon
- AC-4: Cards sorted by node count descending
- AC-5: Clicking a card navigates to `/institution/frameworks/:frameworkKey`
- AC-6: Loading skeleton shown during initial fetch
- AC-7: Empty state shown when no frameworks are seeded
- AC-8: Error state with retry button on fetch failure
- AC-9: RBAC: only InstitutionalAdmin and SuperAdmin can access
- AC-10: `GET /api/v1/institution/frameworks` returns correct ApiResponse envelope
- AC-11: Neo4j session is properly closed after each request
- AC-12: JS `#private` fields used (not TS `private`)
- AC-13: Constructor DI: Neo4j driver injected into FrameworkService
- AC-14: Custom error classes only (no raw throw new Error())
- AC-15: 10+ API tests pass
