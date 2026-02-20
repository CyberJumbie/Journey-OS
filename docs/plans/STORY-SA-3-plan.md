# Plan: STORY-SA-3 — Application Review Queue

## Tasks (implementation order)

| # | Task | File | Action |
|---|------|------|--------|
| 1 | Review types | `packages/types/src/institution/review.types.ts` | CREATE — `ApplicationReviewQuery`, `ApplicationReviewItem`, `ApplicationDetail`, `ApplicationReviewResponse`, sort types |
| 2 | Barrel export | `packages/types/src/institution/index.ts` | EDIT — add review type exports |
| 3 | DB index migration | Supabase MCP | APPLY — `idx_waitlist_applications_created_at` for sort perf |
| 4 | Error class | `apps/server/src/errors/application.error.ts` | EDIT — add `ApplicationNotFoundError` extending `JourneyOSError` |
| 5 | Service | `apps/server/src/services/institution/application-review.service.ts` | CREATE — `ApplicationReviewService` with `list()` and `getById()` |
| 6 | Controller | `apps/server/src/controllers/institution/application-review.controller.ts` | CREATE — `ApplicationReviewController` with `handleList()` and `handleGetById()` |
| 7 | Routes | `apps/server/src/index.ts` | EDIT — wire `GET /api/v1/admin/applications` and `GET /api/v1/admin/applications/:id` with RBAC |
| 8 | Page | `apps/web/src/app/(protected)/admin/applications/page.tsx` | CREATE — server component, delegates to organism |
| 9 | Review queue organism | `apps/web/src/components/admin/application-review-queue.tsx` | CREATE — client component with table, filters, sort, pagination |
| 10 | Detail modal | `apps/web/src/components/admin/application-detail-modal.tsx` | CREATE — client component for full application view |
| 11 | Service tests | `apps/server/src/services/institution/__tests__/application-review.service.test.ts` | CREATE — 4 tests |
| 12 | Controller tests | `apps/server/src/controllers/institution/__tests__/application-review.controller.test.ts` | CREATE — 16 tests |

## Implementation Order

Types → DB Migration → Error → Service → Controller → Routes → View → Tests

## Patterns to Follow

- **SA-2 GlobalUserService pattern:** Dual parallel queries (`Promise.all`) for data + count. Conditional `.eq()` filter chaining. Explicit row mapping. See `apps/server/src/services/user/global-user.service.ts`.
- **SA-2 GlobalUserController pattern:** Inline try/catch, `ApiResponse<T>` envelope, no `next()`. Query param parsing with `parseInt()` and `typeof` narrowing. See `apps/server/src/controllers/user/global-user.controller.ts`.
- **RBAC pattern:** `rbac.require(AuthRole.SUPERADMIN)` per-route, registered after auth middleware. See `docs/solutions/rbac-middleware-pattern.md`.
- **Supabase mock pattern:** Separate chain objects per operation (data vs count). See `docs/solutions/supabase-mock-factory.md`.
- **Web page pattern:** Server component with `export default`, `export const metadata`, delegates to `"use client"` organism. See `apps/web/src/app/(protected)/admin/users/page.tsx`.
- **Web organism pattern:** `Status` union type (`"loading" | "data" | "empty" | "error"`), `useCallback` + `useEffect` for fetching, `URLSearchParams` builder, `SortableHeader` inline helper. See `apps/web/src/components/admin/global-user-directory.tsx`.

## Key Design Decisions

1. **Service path:** `services/institution/` (not `services/admin/`) — this is institution-domain logic even though only superadmin accesses it.
2. **Route path:** `/api/v1/admin/applications` — matches SA-2's `/api/v1/admin/users` namespace.
3. **Approve/Reject buttons:** Rendered but disabled with "Coming soon" tooltip. Actual logic deferred to SA-5/SA-6.
4. **Status filter "all":** When `status === "all"` or omitted, skip `.eq("status", ...)` on both data and count queries.
5. **Detail modal:** Opens on row click or "View Details" button. Shows all fields from `ApplicationDetail`.
6. **Pagination:** Offset-based, 20 items/page default, max 100. Same pattern as SA-2.

## Testing Strategy

### API Tests (20 total — vitest)
**Service (4 tests):**
- Builds correct Supabase query with status filter
- Calculates `total_pages` correctly
- Returns full record by ID
- Throws `ApplicationNotFoundError` for missing ID

**Controller (16 tests):**
- List: 200 paginated, correct meta, defaults, 401, 403, filter by each status, sort by name, invalid sort 400, limit cap, empty list
- Detail: 200, 404, 403

### E2E Tests
None for this story. Deferred to full lifecycle (SA-1 + SA-3 + SA-5/SA-6).

## Figma Make

- [ ] Prototype first
- [x] Code directly — follows existing admin table pattern from SA-2

## Risks / Edge Cases

1. **`contact_phone` and `website_url` may be empty strings** — not null. UI should handle gracefully (show "—" or hide field).
2. **`submitted_ip` is INET type** — Supabase returns it as a string, but verify in service mapping.
3. **Parallel query race condition** — If a row is inserted between data and count queries, total might be off by 1. Acceptable for admin-only read view.
4. **Large result sets** — Index on `created_at DESC` ensures default sort is fast. `institution_name` sort relies on existing index from SA-1.

## Acceptance Criteria (verbatim from brief)

1. SuperAdmin can access `/admin/applications` and see all waitlist applications
2. Non-SuperAdmin roles receive 403 Forbidden
3. Table displays: institution name, type, contact name, contact email, status badge, submitted date
4. Applications are sortable by submitted date and institution name
5. Applications are filterable by status (pending, approved, rejected, all)
6. Pagination works correctly with 20 items per page
7. Clicking "View Details" opens a modal with full application data
8. Empty state shown when no applications match the filter
9. Limit is capped at 100 items per page
10. GET /:id returns 404 for non-existent application
11. All ~20 API tests pass
