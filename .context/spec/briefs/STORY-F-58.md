# STORY-F-58: Review Queue List Page

**Epic:** E-23 (Faculty Review UI)
**Feature:** F-10 (Quality Review Pipeline)
**Sprint:** 13
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-23-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a review queue page with filterable table and status indicators so that I can efficiently triage and prioritize questions awaiting review.

## Acceptance Criteria
- [ ] Paginated table displaying questions routed to review
- [ ] Columns: title/stem preview, question type, course, priority, status, critic composite score, assigned reviewer, date
- [ ] Filter by: status (pending/in_review/revised), course, priority level, question type, date range
- [ ] Sort by: priority (default), date, composite score, course
- [ ] Status indicators: color-coded badges for pending (yellow), in_review (blue), revised (green)
- [ ] Bulk select for batch status changes
- [ ] Claim/unclaim functionality for self-assignment
- [ ] Empty state with helpful messaging when queue is clear
- [ ] 8-12 API tests: list endpoint, filtering, sorting, pagination, claim/unclaim
- [ ] TypeScript strict, named exports only

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md` for full mapping.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/questions/QuestionReviewList.tsx` | `apps/web/src/app/(protected)/review/page.tsx` | Replace card-based list with shadcn/ui DataTable; convert inline `style={{}}` to Tailwind design tokens; replace filter chips with proper filter controls (Select, DatePicker); replace mock data with API-driven list; convert `Link`/`useParams` from react-router to Next.js; extract filter components; add pagination controls; convert `export default` to page default export |
| `pages/questions/FacultyReviewQueue.tsx` | `apps/web/src/app/(protected)/review/page.tsx` | Merge sidebar + stats + filter + question list patterns; replace ALL inline `style={{}}` props (this file is 100% inline styles) with Tailwind classes using design tokens; replace `C.navyDeep`, `C.green`, `C.red` color constants with CSS custom properties; replace custom sidebar with shared layout sidebar; extract stats cards, filter bar, and question cards into atomic components; convert `export default` to page default export |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/review/queue.types.ts` |
| Controller | apps/server | `src/controllers/review/review-queue.controller.ts` |
| Service | apps/server | `src/services/review/review-queue.service.ts` |
| Repository | apps/server | `src/repositories/review-queue.repository.ts` (extend from STORY-F-56) |
| View | apps/web | `src/app/(protected)/review/page.tsx`, `src/components/review/review-queue-table.tsx`, `src/components/review/queue-filters.tsx`, `src/components/review/queue-stats.tsx` |
| Hooks | apps/web | `src/hooks/use-review-queue.ts` |
| Tests | apps/server | `src/controllers/review/__tests__/review-queue.controller.test.ts` |

## Database Schema
No new tables. Reads from `review_queue` table (created in STORY-F-56) joined with `questions` and `profiles`.

```sql
-- Query pattern:
SELECT rq.*, q.stem, q.question_type, c.name as course_name, p.full_name as reviewer_name
FROM review_queue rq
JOIN questions q ON rq.question_id = q.id
LEFT JOIN courses c ON q.course_id = c.id
LEFT JOIN profiles p ON rq.assigned_reviewer_id = p.user_id
WHERE ...
ORDER BY rq.priority ASC, rq.created_at DESC
LIMIT :limit OFFSET :offset
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/review/queue` | Faculty+ | List review queue items (paginated, filterable) |
| POST | `/api/v1/review/queue/:id/claim` | Faculty+ | Claim a queue item for self-assignment |
| POST | `/api/v1/review/queue/:id/unclaim` | Faculty+ | Release a claimed queue item |
| PATCH | `/api/v1/review/queue/batch` | Faculty+ | Batch status update on selected items |

## Dependencies
- **Blocks:** STORY-F-63 (Detail view navigated from queue), STORY-F-61 (Actions on queue items), STORY-F-62 (Self-review filter)
- **Blocked by:** STORY-F-56 (Review router populates the queue)
- **Cross-epic:** STORY-F-56 (Sprint 13 router)

## Testing Requirements
### API Tests (8-12)
1. GET /review/queue returns paginated list with correct columns
2. Filter by status=pending returns only pending items
3. Filter by course returns items for that course only
4. Filter by priority level returns correct subset
5. Sort by priority ascending (default)
6. Sort by composite score descending
7. Pagination: page 2 returns offset results
8. Claim sets assigned_reviewer_id to requesting user
9. Unclaim clears assigned_reviewer_id
10. Claim fails if already claimed by another user
11. Batch status update changes multiple items
12. Empty queue returns empty array with 200

## Implementation Notes
- Queue scoped by faculty assignment: faculty see items for their courses + unassigned items in their department.
- Priority badge: P1 (red), P2 (orange), P3 (yellow), P4 (blue), P5 (gray) -- use design tokens for all colors.
- Real-time queue updates via SSE (new items appearing) -- not Socket.io (Socket.io is for presence only).
- Table built with shadcn/ui DataTable pattern using `@tanstack/react-table`.
- Consider keyboard shortcuts for power users: j/k navigate, c claim, Enter open detail.
- Status indicators use design token badge variants: pending = `--color-warning`, in_review = `--color-info`, revised = `--color-success`.
- Apply all `.eq()` filters BEFORE `.order()` and `.range()` in Supabase query builder.
- Use `@web/*` path alias for all web app imports.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
