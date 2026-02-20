# STORY-F-64: Item Bank Browser Page

**Epic:** E-25 (Item Bank Browser & Export)
**Feature:** F-11
**Sprint:** 18
**Lane:** faculty (P3)
**Size:** L
**Old ID:** S-F-25-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a searchable item bank browser with advanced filtering so that I can find, review, and manage approved questions across my courses.

## Acceptance Criteria
- [ ] Paginated table/card view toggle for browsing approved questions
- [ ] Advanced search: full-text search on stem, vignette, rationale via Supabase `tsvector`
- [ ] Semantic search: pgvector cosine similarity on `assessment_items` embeddings (1024-dim Voyage AI)
- [ ] Filters: course, question type, Bloom level, difficulty, USMLE system, discipline, tags, date range, status
- [ ] Sort by: date created, difficulty, Bloom level, quality_score, course
- [ ] Bulk selection for batch operations (export, tag, archive)
- [ ] Quick preview: shadcn/ui Sheet (side panel) with full question display
- [ ] Bookmark/favorite functionality stored in `user_bookmarks` table
- [ ] Result count and active filter chips with clear-all
- [ ] Filter state persisted in URL query params via `useSearchParams` for shareable views
- [ ] Custom error class: `ItemBankQueryError`
- [ ] 12-18 API tests: text search, semantic search, all filter dimensions, sorting, pagination, bulk select, bookmark CRUD
- [ ] 1-2 E2E tests: search flow, filter + export flow

## Reference Screens
> Refactor these prototype files for production. Replace inline styles with Tailwind design tokens; convert default exports to named exports; use `@web/*` path alias.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/repository/Repository.tsx` | `apps/web/src/app/(protected)/repository/page.tsx` | Extract KPI stat cards into `StatisticsKPICards` molecule; replace inline `style={{}}` with Tailwind arbitrary values and design tokens; replace `C.*` color constants with `--color-*` CSS custom properties; remove embedded sidebar (use shared layout); convert grid/list toggle to `@web/components/repository/view-toggle.tsx` atom |
| `pages/repository/ItemBankBrowser.tsx` | `apps/web/src/components/repository/item-bank-table.tsx` | Extract table into organism; replace hardcoded filter options with API-driven facets; convert `DashboardLayout` wrapper to App Router `(protected)/layout.tsx`; use shadcn/ui `Select`, `Badge`, `Checkbox`, `Button`; convert pagination to `@web/components/ui/pagination.tsx` molecule |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/item-bank/browser.types.ts`, `src/item-bank/search.types.ts` |
| Repository | apps/server | `src/repositories/item-bank/item-bank.repository.ts` |
| Service | apps/server | `src/services/item-bank/item-bank-browser.service.ts`, `src/services/item-bank/item-search.service.ts` |
| Controller | apps/server | `src/controllers/item-bank/item-bank.controller.ts` |
| Errors | apps/server | `src/errors/item-bank.errors.ts` |
| View | apps/web | `src/app/(protected)/repository/page.tsx` |
| Components | apps/web | `src/components/repository/item-bank-table.tsx`, `src/components/repository/item-bank-card-grid.tsx`, `src/components/repository/item-bank-filters.tsx`, `src/components/repository/item-preview-sheet.tsx`, `src/components/repository/semantic-search-input.tsx`, `src/components/repository/view-toggle.tsx` |
| Tests | apps/server | `src/services/item-bank/__tests__/item-bank-browser.service.test.ts`, `src/services/item-bank/__tests__/item-search.service.test.ts` |

## Database Schema
Uses existing `assessment_items` table. New tables needed:

```sql
-- user_bookmarks: track favorited items per user
CREATE TABLE user_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  question_id uuid NOT NULL REFERENCES assessment_items(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- Full-text search index on assessment_items
CREATE INDEX idx_assessment_items_fts
  ON assessment_items
  USING gin (to_tsvector('english', coalesce(stem, '') || ' ' || coalesce(vignette, '') || ' ' || coalesce(explanation, '')));
```

No new columns on `assessment_items` -- filter on existing: `status`, `difficulty`, `bloom_level`, `tags`, `course_id`, `quality_score`, `created_at`.

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/item-bank` | Paginated browse with filters, sort, search |
| GET | `/api/item-bank/search/semantic` | Semantic similarity search (query text -> embedding -> pgvector) |
| POST | `/api/item-bank/bulk` | Bulk operations (tag, archive, export IDs) |
| POST | `/api/item-bank/bookmarks` | Add bookmark |
| DELETE | `/api/item-bank/bookmarks/:questionId` | Remove bookmark |
| GET | `/api/item-bank/bookmarks` | List user bookmarks |

## Dependencies
- **Blocks:** STORY-F-66 (item detail), STORY-F-67 (export), STORY-F-68 (statistics)
- **Blocked by:** Approved items must exist in `assessment_items`; tags must exist
- **Cross-lane:** none

## Testing Requirements
- 12-18 API tests: full-text search match, full-text search no-match, semantic search with mock embedding, each filter dimension (course, difficulty, bloom, status, tags, date range), sort by each field, pagination (page 1/2/last), bulk selection validation, bookmark add/remove/list, combined filters, empty result set
- 1-2 E2E tests: search for a known question stem and verify result; apply difficulty + system filters and verify filtered count

## Implementation Notes
- Full-text search uses `to_tsvector('english', ...)` on stem + vignette + explanation columns. Build a GIN index.
- Semantic search: accept query text, call `VoyageEmbedService` to embed, then `pgvector` cosine similarity `<=>` operator on `assessment_items` embedding column. Return top-K with similarity score.
- Table/card toggle: table view for dense scanning (shows stem truncation, difficulty badge, system, quality score), card view for visual browsing with stem preview.
- Quick preview uses shadcn/ui `Sheet` (side panel) -- click a row to open without page navigation.
- Bookmark stored in `user_bookmarks` join table.
- Filter state persisted in URL search params: `?status=approved&difficulty=Hard&sort=quality_score&page=2`.
- Consider `react-virtual` (TanStack Virtual) for large result sets in table view.
- Apply all `.eq()` filters BEFORE `.order()` and `.range()` on Supabase queries (CLAUDE.md rule).
- Escape `%`, `_`, `,`, `.` in user search input for PostgREST `.or()` filters.
